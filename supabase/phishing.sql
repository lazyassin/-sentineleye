-- SentinelEye — Phishing simulations schema
-- Run after schema.sql, once, in the Supabase SQL editor.

drop table if exists phishing_events cascade;
drop table if exists phishing_campaigns cascade;

-- One simulated phishing send.
create table phishing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template text not null,
  sent_at timestamptz not null default now(),
  target_count int not null default 0
);

-- One row per employee targeted by a campaign. `clicked` implies the
-- employee also opened the email; `reported` is independent — an employee
-- can report with or without opening/clicking.
create table phishing_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references phishing_campaigns(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  opened boolean not null default false,
  clicked boolean not null default false,
  reported boolean not null default false,
  occurred_at timestamptz not null default now()
);

alter table phishing_campaigns enable row level security;
alter table phishing_events enable row level security;

create policy "Authenticated users can read phishing campaigns"
  on phishing_campaigns for select to authenticated using (true);
create policy "Authenticated users can read phishing events"
  on phishing_events for select to authenticated using (true);

-- ── Seed data ───────────────────────────────────────────────────────────
-- Three campaigns over the last 45 days, showing an improving trend
-- (click rate down, report rate up) that lines up with the org risk score
-- trend already seeded in schema.sql.
insert into phishing_campaigns (id, name, template, sent_at, target_count) values
  ('11111111-1111-1111-1111-111111111111', 'Q2 Invoice Scam', 'Fake invoice', now() - interval '45 days', 10),
  ('22222222-2222-2222-2222-222222222222', 'CEO Urgent Request', 'Business email compromise', now() - interval '20 days', 10),
  ('33333333-3333-3333-3333-333333333333', 'IT Password Reset', 'Credential harvest', now() - interval '5 days', 10);

insert into phishing_events (campaign_id, employee_id, opened, clicked, reported, occurred_at)
select '11111111-1111-1111-1111-111111111111', e.id, v.opened, v.clicked, v.reported, now() - interval '45 days'
from (values
  ('priya.nair@sentineleye.io', true, false, true),
  ('marcus.webb@sentineleye.io', true, true, false),
  ('elena.torres@sentineleye.io', true, true, false),
  ('jordan.lee@sentineleye.io', true, false, true),
  ('aisha.rahman@sentineleye.io', true, false, false),
  ('tom.becker@sentineleye.io', true, true, false),
  ('sofia.marino@sentineleye.io', true, true, false),
  ('daniel.kim@sentineleye.io', false, false, true),
  ('grace.owusu@sentineleye.io', true, false, false),
  ('liam.oconnor@sentineleye.io', true, true, false)
) as v(email, opened, clicked, reported)
join employees e on e.email = v.email;

insert into phishing_events (campaign_id, employee_id, opened, clicked, reported, occurred_at)
select '22222222-2222-2222-2222-222222222222', e.id, v.opened, v.clicked, v.reported, now() - interval '20 days'
from (values
  ('priya.nair@sentineleye.io', true, false, true),
  ('marcus.webb@sentineleye.io', true, true, false),
  ('elena.torres@sentineleye.io', true, true, false),
  ('jordan.lee@sentineleye.io', true, false, true),
  ('aisha.rahman@sentineleye.io', true, false, true),
  ('tom.becker@sentineleye.io', true, false, false),
  ('sofia.marino@sentineleye.io', true, true, false),
  ('daniel.kim@sentineleye.io', true, false, true),
  ('grace.owusu@sentineleye.io', true, false, false),
  ('liam.oconnor@sentineleye.io', true, true, false)
) as v(email, opened, clicked, reported)
join employees e on e.email = v.email;

insert into phishing_events (campaign_id, employee_id, opened, clicked, reported, occurred_at)
select '33333333-3333-3333-3333-333333333333', e.id, v.opened, v.clicked, v.reported, now() - interval '5 days'
from (values
  ('priya.nair@sentineleye.io', true, false, true),
  ('marcus.webb@sentineleye.io', true, true, false),
  ('elena.torres@sentineleye.io', true, false, true),
  ('jordan.lee@sentineleye.io', true, false, true),
  ('aisha.rahman@sentineleye.io', true, false, true),
  ('tom.becker@sentineleye.io', true, false, true),
  ('sofia.marino@sentineleye.io', true, true, false),
  ('daniel.kim@sentineleye.io', false, false, true),
  ('grace.owusu@sentineleye.io', true, false, true),
  ('liam.oconnor@sentineleye.io', true, true, false)
) as v(email, opened, clicked, reported)
join employees e on e.email = v.email;
