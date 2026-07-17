-- SentinelEye — Overview schema
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).

-- Drop first so re-running this script always yields the schema below,
-- even if an earlier partial run left tables in an inconsistent state
-- (e.g. missing constraints). Safe pre-launch — only seed data exists.
drop table if exists risk_score_history cascade;
drop table if exists security_metrics cascade;
drop table if exists employees cascade;

-- Employees tracked by the awareness program.
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  department text not null default 'Unassigned',
  risk_score smallint not null default 50 check (risk_score between 0 and 100),
  created_at timestamptz not null default now()
);

-- Risk score time series. employee_id null = org-wide aggregate (what the
-- Overview trend chart reads); a non-null employee_id is reserved for a
-- future per-employee history view.
create table if not exists risk_score_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  recorded_at date not null default current_date
);

-- Generic stat-tile metrics, one row per metric per day. metric_key is
-- freeform so future sections (phishing, training) can add new keys without
-- a migration.
create table if not exists security_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_key text not null,
  metric_value numeric not null,
  recorded_at date not null default current_date
);

alter table employees enable row level security;
alter table risk_score_history enable row level security;
alter table security_metrics enable row level security;

create policy "Authenticated users can read employees"
  on employees for select to authenticated using (true);
create policy "Authenticated users can read risk history"
  on risk_score_history for select to authenticated using (true);
create policy "Authenticated users can read security metrics"
  on security_metrics for select to authenticated using (true);

-- ── Seed data ───────────────────────────────────────────────────────────
-- Org-wide risk score for the last 30 days, trending down (improving),
-- score = 100 - security posture, i.e. higher is riskier.
insert into risk_score_history (employee_id, score, recorded_at)
select
  null,
  least(100, greatest(0, round(62 - (29 - g) * 0.7 + (random() * 6 - 3))))::smallint,
  current_date - g
from generate_series(0, 29) as g;

insert into employees (full_name, email, department, risk_score) values
  ('Priya Nair', 'priya.nair@sentineleye.io', 'Engineering', 18),
  ('Marcus Webb', 'marcus.webb@sentineleye.io', 'Sales', 82),
  ('Elena Torres', 'elena.torres@sentineleye.io', 'Finance', 91),
  ('Jordan Lee', 'jordan.lee@sentineleye.io', 'Engineering', 24),
  ('Aisha Rahman', 'aisha.rahman@sentineleye.io', 'HR', 45),
  ('Tom Becker', 'tom.becker@sentineleye.io', 'Marketing', 68),
  ('Sofia Marino', 'sofia.marino@sentineleye.io', 'Sales', 77),
  ('Daniel Kim', 'daniel.kim@sentineleye.io', 'Engineering', 12),
  ('Grace Owusu', 'grace.owusu@sentineleye.io', 'Finance', 55),
  ('Liam O''Connor', 'liam.oconnor@sentineleye.io', 'Support', 88)
on conflict (email) do nothing;

insert into security_metrics (metric_key, metric_value, recorded_at) values
  ('phishing_click_rate', 24, current_date - 1),
  ('phishing_click_rate', 18, current_date),
  ('training_completion_rate', 68, current_date - 1),
  ('training_completion_rate', 76, current_date),
  ('open_incidents', 5, current_date - 1),
  ('open_incidents', 3, current_date),
  ('simulations_sent', 95, current_date - 1),
  ('simulations_sent', 120, current_date);
