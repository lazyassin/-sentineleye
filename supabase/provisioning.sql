-- SentinelEye — Admin-provisioned employee accounts
-- Run after roles.sql. Supports supabase/functions/provision-employee.

alter table profiles
  add column if not exists must_change_password boolean not null default false;

drop function if exists clear_must_change_password();

-- No parameters, hardcodes `where id = auth.uid()` — same posture as
-- is_admin()/current_employee_id(): profiles has no update policy for
-- `authenticated` at all, so this SECURITY DEFINER function is the only
-- way (besides handle_new_user()) anything gets written to it. A general
-- update RLS policy would reopen self-service writes to every column,
-- including role.
create function clear_must_change_password()
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set must_change_password = false where id = auth.uid();
$$;

grant execute on function clear_must_change_password() to authenticated;

-- This project auto-grants execute to anon/authenticated on new functions
-- via `alter default privileges` — revoke explicitly, same lesson learned
-- on is_admin()/current_employee_id() (Postgres's own PUBLIC default grant
-- alone isn't enough to lock these down here).
revoke execute on function clear_must_change_password() from public, anon;
