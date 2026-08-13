# SentinelEye

A self-hosted security awareness platform that runs simulated phishing and the
training that follows from it as one system, under one employee identity and one
risk score you can actually read.

Built as a BSc (Hons) Ethical Hacking & Cybersecurity final-year project
(ST6047CEM, Softwarica College / Coventry University).

---

## Why it exists

The tooling in this space splits into two camps, and each leaves something out.

Commercial platforms run the full simulate-then-train loop, but they're closed,
priced per seat for enterprises, and they don't disclose how their risk scores
are calculated. Open-source simulators send a convincing lure and record who
clicked, then stop — no training, no per-employee history, nothing connecting a
demonstrated weakness to the learning that addresses it.

So there's a gap: no accessible system where the phishing signal and the
training signal share one identity, one data model, and one risk calculation
that can be inspected, audited, and explained to the person it describes.

That's what this is.

## What it does

- Sends phishing simulations to one employee, a department, or everyone, from
  three templates each built around a named influence principle
- Records clicks idempotently, so a mail-gateway scanner pre-fetching links
  can't corrupt a genuine first-click timestamp
- Serves an immediate debrief that names the technique the message used, rather
  than a generic pass/fail notice
- Assigns the remediation module matching the lure that was clicked, recording
  why it was assigned and which event caused it
- Rewards reporting: a click that gets reported counts for half of one that
  doesn't
- Computes a per-employee risk score live from both signals, aggregated to
  department and organisation

## The risk score

Published in full, because a score nobody can inspect isn't a control — it's a
claim asking for trust.

```
risk = 100 × (0.4 × (1 − training_rate) + 0.6 × click_rate)

training_rate = modules_completed / modules_total
click_rate    = (unreported_clicks + 0.5 × reported_clicks) / sent
```

It's computed on demand from the underlying rows, never stored. That's
deliberate: a cached score can drift from the records it describes, and during
development one did — three parts of the dashboard derived the same number three
different ways and disagreed on screen.

The two weights are reasoned, not fitted. Clicking a live lure seemed a better
indicator of real exposure than an unfinished module, and reporting after the
fact is better than silence but worse than not clicking. Both are defensible;
neither is derived from data. Publishing them at least makes them arguable.

## Architecture

React SPA → Supabase (PostgreSQL + Auth) → three Deno edge functions → Resend.
Deployed on Vercel. Everything runs on free tiers, which is part of the argument.

**Authorisation is enforced by the database, not the application.** Eleven
row-level-security policies and twelve `SECURITY DEFINER` functions decide who
sees what, so a bug in the React code can't become a data breach — the query
behind the page simply returns nothing.

```sql
create policy "Read own phishing events, admins read all"
  on phishing_events for select to authenticated
  using (is_admin() or employee_id = current_employee_id());
```

The three edge functions exist so the service-role key never reaches a browser:

| Function | Purpose | JWT |
|---|---|---|
| `provision-employee` | Creates accounts with temporary passwords | required |
| `send-phishing-email` | Issues simulations via Resend | required |
| `track-phishing-click` | Records the click, assigns training, redirects | **not** required |

`track-phishing-click` is the one deliberate exception — an email recipient has
no session, so the unguessable tracking token in the link is the access boundary
instead.

## Running it

Requires a Supabase project and Node 18+.

```bash
npm install
cp .env.example .env   # then fill in the two values below
npm run dev
```

`.env` needs:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon key>
```

The anon key is meant to be public — row-level security is what protects the
data, not secrecy of that key.

Apply the SQL in `supabase/` in this order: `schema.sql`, `roles.sql`,
`provisioning.sql`, `training_content.sql`, `phishing.sql`,
`phishing_tracking.sql`.

Edge functions need these secrets set in the Supabase dashboard:
`RESEND_API_KEY`, and optionally `RESEND_FROM`. `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

Without a verified sending domain, Resend will only deliver to the address on
your own account. The send response returns each tracking link regardless, so
the click flow is fully testable without an inbox.

## Ethics

This is a deception-based instrument, and the constraints below are design
requirements rather than a policy appended at the end.

- **No credential capture is possible.** The debrief page has no form element.
  There is nowhere to type a password even if someone wanted to. That's a
  structural guarantee, not a promise to discard what's collected.
- **The system never acts on a score by itself.** No branch anywhere is
  conditioned on a risk value outside display logic. Any consequence is a human
  decision taken outside the platform.
- **Pretexts are constrained.** The three templates use operational scenarios —
  an overdue invoice, a storage warning, a wire approval. Compensation,
  bonuses, redundancy and disciplinary matters are excluded by decision, after
  reading what happened when Tribune Publishing and West Midlands Trains ran
  fake-bonus simulations against their own staff.
- **Data collection is minimal:** a boolean for clicked, a boolean for
  reported, and a timestamp.

That last constraint is a commitment the author made, not something the software
enforces. Nothing here would stop an administrator writing the fake bonus email.
Making that structural — approval before sending, a recorded justification — is
the change that would matter most before this were used on real people.

## Status

Academic prototype. All employee records are synthetic; no real person's
behaviour has been recorded at any point. It has not been evaluated with human
participants, so nothing here demonstrates that it changes behaviour — only that
it does what it says it does.

## Licence

No licence yet. Available to read; ask before reusing.
