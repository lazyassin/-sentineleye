-- SentinelEye — Phishing simulation click tracking
-- Run after phishing.sql. Adds a per-event token used in the tracked link
-- (instead of the raw event id) so a link can't be enumerated to falsify
-- other employees' click data. No RLS changes needed: the click-tracking
-- edge function reads/writes this via the service-role client, using the
-- token itself as the access boundary, not RLS.

alter table phishing_events
  add column if not exists tracking_token uuid not null default gen_random_uuid();

alter table phishing_events
  drop constraint if exists phishing_events_tracking_token_key;
alter table phishing_events
  add constraint phishing_events_tracking_token_key unique (tracking_token);
