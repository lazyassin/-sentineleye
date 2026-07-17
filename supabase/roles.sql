-- SentinelEye — Roles, RLS hardening, training portal
-- Run after schema.sql and phishing.sql, once, in the Supabase SQL editor.
-- Wrapped in a transaction so a mid-script failure can't leave the admin
-- account locked out or RLS half-migrated.

begin;

-- ── Clean up unused leftover scaffold ──────────────────────────────────
-- profiles/training_modules/training_assignments/alerts were pre-created by
-- an earlier, unrelated session before this app was built against this
-- project. All empty, nothing in the codebase references them — confirmed
-- with the user as safe to drop rather than adapt around.
drop table if exists training_assignments cascade;
drop table if exists alerts cascade;

-- ── profiles ────────────────────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
drop function if exists check_employee_email(text);
drop function if exists is_admin();
drop function if exists current_employee_id();
drop table if exists profiles cascade;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  employee_id uuid references employees(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One auth account per roster employee.
create unique index profiles_employee_id_unique
  on profiles (employee_id) where employee_id is not null;

alter table profiles enable row level security;

-- ── Non-recursive helpers ──────────────────────────────────────────────
-- SECURITY DEFINER + owned by the migration role => bypasses profiles' own
-- RLS internally, so calling these from policies on profiles (or any other
-- table) never re-enters policy evaluation. Do NOT `force row level
-- security` on profiles, or this bypass stops working and these become
-- recursive again.
create function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create function current_employee_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select employee_id from profiles where id = auth.uid();
$$;

grant execute on function is_admin() to authenticated;
grant execute on function current_employee_id() to authenticated;

-- Postgres grants EXECUTE to PUBLIC by default on new functions, and this
-- Supabase project additionally has `alter default privileges` auto-granting
-- anon/authenticated on every new function — so an explicit grant above
-- isn't enough by itself. Revoke from the actual roles directly or these
-- stay anon-callable regardless of the grant above.
revoke execute on function is_admin() from public, anon;
revoke execute on function current_employee_id() from public, anon;

-- ── profiles policies ───────────────────────────────────────────────────
-- No insert/update policy for `authenticated` at all: the only writer is
-- the SECURITY DEFINER trigger below. This is what prevents a user from
-- self-assigning role = 'admin'.
create policy "Users can read own profile, admins read all"
  on profiles for select to authenticated
  using (id = auth.uid() or is_admin());

-- ── Seed: promote the existing pre-roles admin account ─────────────────
-- fromsoft@company.com signed up before roles existed; give it role=admin
-- with no employee_id (admins are not roster employees).
insert into profiles (id, role, employee_id)
select id, 'admin', null
from auth.users
where lower(email) = lower('fromsoft@company.com')
on conflict (id) do update set role = 'admin', employee_id = null;

-- ── Roster pre-check RPC (callable pre-auth, from the sign-up form) ────
-- Narrow on purpose: returns a boolean, not roster contents, to limit
-- enumeration exposure from the anon key.
create function check_employee_email(p_email text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from employees where lower(email) = lower(p_email)
  );
$$;

grant execute on function check_employee_email(text) to anon, authenticated;

-- ── auth.users trigger: link or reject on sign-up ───────────────────────
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_employee_id uuid;
begin
  select id into matched_employee_id
  from employees
  where lower(email) = lower(new.email);

  if matched_employee_id is null then
    raise exception 'SENTINELEYE_NOT_ON_ROSTER: % is not on the employee roster', new.email;
  end if;

  insert into profiles (id, role, employee_id)
  values (new.id, 'employee', matched_employee_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Trigger firing doesn't need EXECUTE privilege on the function, so this is
-- safe to revoke: nobody should be able to invoke it directly via RPC.
revoke execute on function handle_new_user() from public, anon, authenticated;

-- ── Replace permissive policies on existing tables with role-aware ones ─
drop policy if exists "Authenticated users can read employees" on employees;
drop policy if exists "Authenticated users can read risk history" on risk_score_history;
drop policy if exists "Authenticated users can read security metrics" on security_metrics;
drop policy if exists "Authenticated users can read phishing campaigns" on phishing_campaigns;
drop policy if exists "Authenticated users can read phishing events" on phishing_events;

-- employees: admin sees all; employee sees only their own row.
create policy "Read own employee row, admins read all"
  on employees for select to authenticated
  using (is_admin() or id = current_employee_id());

-- Roster-gated sign-up removes self-service admin creation, so admins now
-- need an in-app way to add roster rows (the "Add employee" UI).
create policy "Admins can add employees"
  on employees for insert to authenticated
  with check (is_admin());

-- risk_score_history: employee_id null = org aggregate, which employees
-- must NOT see; a non-null row only matches an employee's own id.
create policy "Read own risk history, admins read all"
  on risk_score_history for select to authenticated
  using (is_admin() or employee_id = current_employee_id());

-- security_metrics: purely org-wide (no employee_id column at all) —
-- admin-only. This intentionally keeps training_completion_rate etc. out
-- of employee reach, per the "org aggregates" restriction.
create policy "Admins read security metrics"
  on security_metrics for select to authenticated
  using (is_admin());

-- phishing_events: admin sees all; employee sees only their own events.
create policy "Read own phishing events, admins read all"
  on phishing_events for select to authenticated
  using (is_admin() or employee_id = current_employee_id());

-- phishing_campaigns: has no employee_id (shared metadata). An employee
-- may read a campaign only if they have at least one event under it —
-- this evaluates phishing_events under ITS OWN policy (already scoped
-- above), not a bypass, so it stays consistent with "own events only".
create policy "Read campaigns for own events, admins read all"
  on phishing_campaigns for select to authenticated
  using (
    is_admin()
    or exists (
      select 1 from phishing_events pe
      where pe.campaign_id = phishing_campaigns.id
        and pe.employee_id = current_employee_id()
    )
  );

-- ── Training portal ──────────────────────────────────────────────────────
drop table if exists training_completions cascade;
drop table if exists training_modules cascade;

create table training_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'General',
  duration_minutes smallint not null default 10,
  created_at timestamptz not null default now()
);

create table training_completions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  module_id uuid not null references training_modules(id) on delete cascade,
  completed_at timestamptz not null default now(),
  -- Actual quiz score from the single (no-retry) attempt. Nullable so a
  -- module completed before quizzes existed simply has no score.
  score smallint,
  total smallint,
  unique (employee_id, module_id)
);

alter table training_modules enable row level security;
alter table training_completions enable row level security;

-- Catalog is shared reference data, not employee-specific — same posture
-- as the old blanket policy is fine here.
create policy "Authenticated users can read training modules"
  on training_modules for select to authenticated using (true);

create policy "Read own completions, admins read all"
  on training_completions for select to authenticated
  using (is_admin() or employee_id = current_employee_id());

create policy "Employees can mark their own modules complete"
  on training_completions for insert to authenticated
  with check (is_admin() or employee_id = current_employee_id());

-- ── Seed data ───────────────────────────────────────────────────────────
insert into training_modules (title, description, category, duration_minutes) values
  ('Phishing Fundamentals', 'Recognize the most common phishing lures.', 'Phishing', 12),
  ('Password Hygiene', 'Passphrases, managers, and why reuse is the enemy.', 'Credentials', 8),
  ('Data Handling & Privacy', 'Classifying and sharing sensitive data safely.', 'Privacy', 15),
  ('Social Engineering Awareness', 'Pretexting, vishing, and tailgating basics.', 'Social Engineering', 10),
  ('Incident Reporting 101', 'What to do in the first five minutes.', 'Incident Response', 6);

insert into training_completions (employee_id, module_id, completed_at)
select e.id, m.id, now() - interval '3 days'
from employees e, training_modules m
where e.email = 'priya.nair@sentineleye.io' and m.title = 'Phishing Fundamentals';

insert into training_completions (employee_id, module_id, completed_at)
select e.id, m.id, now() - interval '1 day'
from employees e, training_modules m
where e.email = 'jordan.lee@sentineleye.io' and m.title = 'Password Hygiene';

commit;
