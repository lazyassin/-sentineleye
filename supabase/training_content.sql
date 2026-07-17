-- SentinelEye — Training module content (markdown, scenario, quiz)
-- Run after roles.sql. Adds authored content columns to the existing
-- training_modules rows. No new tables, no new functions, no new RLS
-- policies: shared reference content, already covered by "Authenticated
-- users can read training modules" (select, using true).
--
-- KNOWN LIMITATION (accepted, not a bug): quiz.correct_id is selectable by
-- any authenticated employee via the normal training_modules row, so a
-- devtools-savvy employee can read the correct answer before answering.
-- Grading happens client-side in QuizCard.jsx. Acceptable for a 5-module
-- internal awareness tool with no certification stakes; would need a
-- SECURITY DEFINER grading RPC (answers in, pass/fail out, no correct_id
-- ever sent to the client) if this becomes a compliance-tracked feature.

begin;

alter table training_modules
  add column if not exists content_md text not null default '',
  add column if not exists scenario jsonb not null default '{}'::jsonb,
  add column if not exists quiz jsonb not null default '[]'::jsonb;

alter table training_modules
  add constraint training_modules_quiz_is_array check (jsonb_typeof(quiz) = 'array');
alter table training_modules
  add constraint training_modules_scenario_is_object check (jsonb_typeof(scenario) = 'object');

-- ── Phishing Fundamentals ──────────────────────────────────────────────
update training_modules set
  content_md = $md$# Phishing Fundamentals

Phishing is the single most common way attackers get into an organization: not by breaking encryption, but by asking an employee to click something.

## What phishing looks like

Most phishing emails share a few tells.

- **Urgency or fear** — "Your account will be suspended in 24 hours," "Unusual sign-in detected."
- **A mismatched sender** — the display name says "IT Support" but the address is a personal Gmail or a domain that's almost-but-not-quite your company's.
- **A link that doesn't match its text** — hover before you click. If the visible text says "sentineleye.io" but the underlying link goes somewhere else, that's a red flag.
- **Requests for credentials or payment** — legitimate IT teams almost never ask you to "confirm your password" by clicking a link.
- **Generic greetings** on emails that claim to be personal or urgent.

## Spear phishing and whaling

Not all phishing is a mass blast. **Spear phishing** targets a specific person using details gathered from LinkedIn, your company website, or a previous breach. **Whaling** is spear phishing aimed at executives, often impersonating a CEO asking finance to wire money urgently ("CEO fraud").

## What to do

1. Don't click links or open attachments from unexpected or suspicious senders.
2. Hover over links to check the real destination before clicking.
3. Verify unusual requests through a second channel — call the person, don't reply to the email.
4. Report anything suspicious using your organization's reporting process rather than just deleting it.
$md$,
  scenario = '{
    "prompt": "You get an email that looks like it is from your IT department: \"We have detected unusual sign-in activity on your account. Click here within 24 hours to verify your identity or your account will be locked.\" The sender address is it-support@sentine1eye-security.com. What do you do?",
    "choices": [
      {"id": "a", "text": "Click the link immediately and enter your credentials to avoid losing access.", "correct": false, "explanation": "The urgency and the lookalike domain (a \"1\" instead of an \"l\", plus an extra word) are classic phishing tells. Entering your credentials here hands them to an attacker."},
      {"id": "b", "text": "Do not click the link. Report the email and, if worried it might be real, contact IT directly through a known channel.", "correct": true, "explanation": "Correct. Verify through a channel you already trust, not one supplied by the suspicious email itself, and report it so others do not fall for the same message."},
      {"id": "c", "text": "Forward it to a coworker to ask if they got the same one.", "correct": false, "explanation": "Sharing it with a coworker does not resolve the risk and can spread the link further. Report it through official channels instead."},
      {"id": "d", "text": "Reply to the email asking them to confirm they are really IT.", "correct": false, "explanation": "Replying confirms your address is active to an attacker, and you are still trusting a channel you have no reason to trust."}
    ]
  }'::jsonb,
  quiz = '[
    {"id": "q1", "question": "Which of these is the strongest indicator that an email might be phishing?", "options": [{"id":"a","text":"It was sent during business hours"},{"id":"b","text":"The link text does not match where it actually points"},{"id":"c","text":"It has a company logo in the header"},{"id":"d","text":"It is addressed to your team distribution list"}], "correct_id": "b", "explanation": "Attackers routinely fake logos and send during business hours; a mismatched link destination is a much stronger signal — always hover before clicking."},
    {"id": "q2", "question": "What is \"whaling\"?", "options": [{"id":"a","text":"Mass phishing sent to thousands of random addresses"},{"id":"b","text":"Phishing that specifically targets executives, often impersonating a CEO"},{"id":"c","text":"Phishing sent from a compromised personal account"},{"id":"d","text":"An automated tool that finds phishing emails"}], "correct_id": "b", "explanation": "Whaling is spear phishing aimed at senior leaders, frequently used for wire-transfer fraud (\"CEO fraud\")."},
    {"id": "q3", "question": "You suspect an email is phishing but are not fully sure. What is the best first step?", "options": [{"id":"a","text":"Click the link carefully, just do not enter any information"},{"id":"b","text":"Ignore it and delete it"},{"id":"c","text":"Report it through the official reporting process"},{"id":"d","text":"Reply and ask the sender to prove who they are"}], "correct_id": "c", "explanation": "Reporting — rather than silently deleting or engaging — lets your security team investigate and warn others who may have received the same message."}
  ]'::jsonb
where title = 'Phishing Fundamentals';

-- ── Password Hygiene ────────────────────────────────────────────────────
update training_modules set
  content_md = $md$# Password Hygiene

Weak or reused passwords are one of the easiest ways into an account — attackers rarely guess character by character, they use lists of passwords leaked from other breaches.

## Why length beats complexity

A long passphrase like `correct-horse-battery-staple` is harder to crack than a short "complex" password like `P@ss1!`, because cracking time grows with length far faster than with symbol substitution. Aim for at least 12-16 characters, ideally a memorable phrase.

## The single biggest risk: reuse

If you reuse a password across a work account and a shopping site, and the shopping site is breached, attackers try that exact password against your work account within hours — **credential stuffing**, automated at massive scale. One reused password can undo every other precaution.

## Use a password manager

A password manager generates and stores a unique, random password per account, so reuse stops being an option. You only need to remember one strong master password.

## Multi-factor authentication (MFA)

Even a strong password can be phished or leaked. MFA means a stolen password alone is not enough to get in. Enable it everywhere it is offered, especially email.

## What to do

1. Use a unique password for every account — a password manager makes this painless.
2. Prefer long passphrases over short "complex" passwords.
3. Turn on MFA wherever it is available.
4. Never share your password with anyone, including IT — legitimate staff never need it.
$md$,
  scenario = '{
    "prompt": "You are setting up a new vendor portal account and you are in a hurry. Your instinct is to reuse your email password since it is already complex and you will remember it. What should you do instead?",
    "choices": [
      {"id": "a", "text": "Reuse your email password — it is already strong, and remembering fewer passwords is safer.", "correct": false, "explanation": "Reuse is the risk, not the strength of any single password. If the vendor portal is ever breached, attackers will try that exact password against your email and other accounts."},
      {"id": "b", "text": "Generate a unique password with a password manager and save it there.", "correct": true, "explanation": "Correct. A unique, generated password per account means one breach elsewhere never puts your other accounts at risk."},
      {"id": "c", "text": "Use a slightly modified version of your email password, like adding a 2 at the end.", "correct": false, "explanation": "Attackers routinely try common variations when testing leaked passwords, so this offers little real protection."},
      {"id": "d", "text": "Pick a short, easy password now and change it to something stronger later.", "correct": false, "explanation": "Later rarely happens, and the account is exposed from day one."}
    ]
  }'::jsonb,
  quiz = '[
    {"id": "q1", "question": "Why is a long passphrase generally stronger than a short password with symbols swapped in?", "options": [{"id":"a","text":"It is easier to type"},{"id":"b","text":"Cracking time increases much faster with length than with symbol substitution"},{"id":"c","text":"Passphrases are immune to phishing"},{"id":"d","text":"It is required by law"}], "correct_id": "b", "explanation": "Length is the dominant factor in resisting brute-force and dictionary attacks; symbol swaps add relatively little."},
    {"id": "q2", "question": "What is \"credential stuffing\"?", "options": [{"id":"a","text":"Guessing passwords one character at a time"},{"id":"b","text":"Automatically trying passwords leaked from one breach against other accounts"},{"id":"c","text":"Storing too many passwords in a manager"},{"id":"d","text":"A type of phishing email"}], "correct_id": "b", "explanation": "Attackers take leaked username/password pairs from one breach and try them at scale against other services, betting on reuse."},
    {"id": "q3", "question": "Someone claiming to be from IT asks you to read your password over the phone to verify your account. What should you do?", "options": [{"id":"a","text":"Read it to them since they said they are from IT"},{"id":"b","text":"Refuse — legitimate IT staff never need your actual password"},{"id":"c","text":"Give them a slightly wrong password to test them"},{"id":"d","text":"Change your password after telling them, just in case"}], "correct_id": "b", "explanation": "This is a common pretexting tactic. No legitimate IT process requires your password in plain text over the phone."}
  ]'::jsonb
where title = 'Password Hygiene';

-- ── Data Handling & Privacy ─────────────────────────────────────────────
update training_modules set
  content_md = $md$# Data Handling & Privacy

Not all data is equally sensitive, and how you store, share, and dispose of it should match its sensitivity.

## Classifying data

- **Public** — fine for anyone to see.
- **Internal** — not secret, but not for outside distribution.
- **Confidential** — sensitive business information (contracts, financials, source code).
- **Restricted** — highly sensitive personal or regulated data (customer PII, health records, payment card data, credentials).

When in doubt, treat data as more sensitive rather than less.

## Sharing data safely

- Use approved company tools for sharing, not personal email or personal cloud storage.
- Set the narrowest sharing permission that still gets the job done.
- Double-check the recipient list before sending — autocomplete makes it easy to send sensitive data to the wrong person.
- Encrypt or password-protect exports of restricted data when a tool does not do it automatically.

## Minimizing what you collect and keep

Only collect the personal data you actually need, and do not keep it longer than necessary.

## Disposal

Delete data you no longer need. "Deleted" from a shared drive's trash is not necessarily gone — follow your organization's retention policy.

## What to do

1. Classify data before sharing it, and match the sharing method to the classification.
2. Use company-approved tools for work data.
3. Double-check recipients before sending anything confidential or restricted.
4. Do not keep sensitive data longer than you need it.
$md$,
  scenario = '{
    "prompt": "A colleague on another team asks you to quickly email them a spreadsheet of customer contact details and order history so they can look at it before a meeting in ten minutes. What do you do?",
    "choices": [
      {"id": "a", "text": "Email it right away from your personal Gmail since work email is loading slowly.", "correct": false, "explanation": "Personal email is outside company controls entirely, and this is customer PII — sending it through an unmanaged channel is exactly what classification exists to prevent."},
      {"id": "b", "text": "Share it through the approved company file-sharing tool, access limited to that colleague.", "correct": true, "explanation": "Correct. The approved, access-controlled tool keeps restricted data within company controls and limits exposure, even under time pressure."},
      {"id": "c", "text": "Post it in a public team channel so anyone who needs it can grab it later too.", "correct": false, "explanation": "Broad, unnecessary access to restricted customer data increases risk with no benefit."},
      {"id": "d", "text": "Attach it to a calendar invite for the meeting so it is easy to find.", "correct": false, "explanation": "Calendar invites are often broadly visible or forwarded and are not an access-controlled sharing method."}
    ]
  }'::jsonb,
  quiz = '[
    {"id": "q1", "question": "Which of these would typically be classified as Restricted data?", "options": [{"id":"a","text":"A published blog post"},{"id":"b","text":"Internal meeting notes"},{"id":"c","text":"Customer payment card details"},{"id":"d","text":"A public company pricing page"}], "correct_id": "c", "explanation": "Payment card data, along with other regulated personal data, sits in the highest sensitivity tier and needs the strictest handling."},
    {"id": "q2", "question": "What is the safest default when you are unsure how sensitive data is?", "options": [{"id":"a","text":"Treat it as public since you are not sure"},{"id":"b","text":"Treat it as more sensitive than you think, until you know otherwise"},{"id":"c","text":"Ask a coworker informally over chat"},{"id":"d","text":"Ignore classification for small files"}], "correct_id": "b", "explanation": "Defaulting to a higher sensitivity tier when unsure avoids accidental exposure."},
    {"id": "q3", "question": "Why is \"anyone with the link\" sharing risky for confidential documents?", "options": [{"id":"a","text":"It makes the file load slower"},{"id":"b","text":"It removes control over who can access the data, including if forwarded"},{"id":"c","text":"It is against copyright law"},{"id":"d","text":"It only works for PDFs"}], "correct_id": "b", "explanation": "Link-based sharing without access restriction means anyone who obtains the link can view the data."}
  ]'::jsonb
where title = 'Data Handling & Privacy';

-- ── Social Engineering Awareness ────────────────────────────────────────
update training_modules set
  content_md = $md$# Social Engineering Awareness

Social engineering is manipulating people, not systems, into giving up access or information. It exploits normal, helpful human behavior — trust, urgency, and the desire to be polite.

## Common tactics

- **Pretexting** — inventing a believable scenario (a fake vendor, a fake new hire) to justify an unusual request.
- **Vishing** — phishing over the phone, often impersonating IT or an executive, using urgency or authority.
- **Tailgating** — following an authorized employee through a secure door without badging in.
- **Baiting** — leaving an infected USB drive somewhere it will be found and plugged in.
- **Impersonation** — pretending to be a coworker, executive, or trusted vendor.

## Why it works

Social engineering combines a plausible pretext with pressure: urgency, authority, or social pressure (not wanting to seem rude to a stranger holding the door).

## What to do

1. It is okay to verify. Confirming identity or checking a request through a second channel is professional, not rude.
2. Do not let urgency override your process.
3. Badge in for yourself, every time.
4. Report anything that felt like a social engineering attempt, even if you did not fall for it.
$md$,
  scenario = '{
    "prompt": "You are walking into the office and someone you do not recognize, carrying a box of catering supplies, asks you to hold the secure door open because their hands are full and their badge is in their bag. What do you do?",
    "choices": [
      {"id": "a", "text": "Hold the door — they are clearly a delivery person and it would be rude to make them fumble for a badge.", "correct": false, "explanation": "This is a classic tailgating pretext. Secure doors exist so everyone who enters is verified, regardless of how plausible the story looks."},
      {"id": "b", "text": "Hold the door but ask them to sign in with reception once inside.", "correct": false, "explanation": "By the time they are inside, the secure door has already been bypassed. Verification needs to happen before entry."},
      {"id": "c", "text": "Politely decline, and direct them to reception to be signed in properly.", "correct": true, "explanation": "Correct. This is the expected process — any legitimate visitor or delivery will be used to it — and keeps the secure area secure regardless of the pretext."},
      {"id": "d", "text": "Ignore them and walk away without saying anything.", "correct": false, "explanation": "You do not need to hold the door, but a polite redirect to reception is more helpful than ignoring the person."}
    ]
  }'::jsonb,
  quiz = '[
    {"id": "q1", "question": "What is \"vishing\"?", "options": [{"id":"a","text":"Phishing conducted over voice or phone calls"},{"id":"b","text":"A virus spread through video files"},{"id":"c","text":"Tailgating into a secure area"},{"id":"d","text":"Leaving an infected USB drive to be found"}], "correct_id": "a", "explanation": "Vishing is voice phishing — using phone calls, often with urgency or impersonated authority, to extract information or access."},
    {"id": "q2", "question": "Why does urgency show up so often in social engineering attempts?", "options": [{"id":"a","text":"It is a coincidence"},{"id":"b","text":"It pressures the target to act before thinking or verifying"},{"id":"c","text":"It is required by phone company regulations"},{"id":"d","text":"It makes the caller sound more professional"}], "correct_id": "b", "explanation": "Urgency is deliberate: it discourages the target from pausing to verify through a separate, trusted channel."},
    {"id": "q3", "question": "A caller claims to be your IT director and demands a one-time passcode immediately because \"security is down.\" What is the right response?", "options": [{"id":"a","text":"Read it out immediately since they said it is urgent"},{"id":"b","text":"Hang up and verify their identity through a known internal channel first"},{"id":"c","text":"Ask them to email you first, then read it out"},{"id":"d","text":"Give them half the code as a compromise"}], "correct_id": "b", "explanation": "Authority plus urgency is a classic pretext. Verifying independently is correct even under pressure."}
  ]'::jsonb
where title = 'Social Engineering Awareness';

-- ── Incident Reporting 101 ───────────────────────────────────────────────
update training_modules set
  content_md = $md$# Incident Reporting 101

How fast an incident gets reported often matters more than almost anything else — attackers count on delay.

## What counts as an incident

- Clicking a phishing link or entering credentials on a suspicious site.
- A lost or stolen work device.
- Unfamiliar activity on your account.
- A suspicious call, tailgating attempt, or pretexting email, even if you did not fall for it.
- Accidentally sending sensitive data to the wrong person.
- Finding an unattended USB drive or device you do not recognize.

If you are not sure whether something qualifies, report it anyway.

## What to do in the first five minutes

1. **Do not try to fix it yourself first.** Disconnecting, deleting, or changing a password can destroy evidence or fail to stop something in progress.
2. **Report immediately** through your organization's official channel.
3. **Preserve evidence.** Do not delete the email, do not wipe the device.
4. **Note what you remember**: what you clicked, what you entered, roughly when.

## Why speed matters more than certainty

Security teams would always rather investigate ten false alarms than miss one real incident because someone waited to be certain.

## What to do

1. Report immediately, even if you are unsure.
2. Do not try to remediate it yourself before reporting.
3. Preserve evidence — do not delete or reset anything.
4. Give the security team what you remember.
$md$,
  scenario = '{
    "prompt": "You realize you clicked a link in a suspicious email ten minutes ago and entered your work password before thinking better of it. It has been quiet and nothing obviously bad has happened. What is the right next step?",
    "choices": [
      {"id": "a", "text": "Change your password yourself and do not mention it, since nothing bad has happened.", "correct": false, "explanation": "Changing your password alone does not tell security an account may be compromised or let them check for further activity."},
      {"id": "b", "text": "Wait a day to see if anything strange happens before deciding whether to report it.", "correct": false, "explanation": "Delay is exactly what attackers benefit from. Report immediately rather than waiting to see how it plays out."},
      {"id": "c", "text": "Report it immediately through your incident channel, including roughly when it happened and what you entered.", "correct": true, "explanation": "Correct. Immediate reporting lets the security team investigate and check for further activity — speed matters more than certainty here."},
      {"id": "d", "text": "Delete the email so no one else clicks it, then get back to work.", "correct": false, "explanation": "Deleting the email destroys evidence the security team needs — report it, do not delete it."}
    ]
  }'::jsonb,
  quiz = '[
    {"id": "q1", "question": "Why avoid trying to fix a suspected incident yourself before reporting it?", "options": [{"id":"a","text":"It is against policy to ever touch your own device"},{"id":"b","text":"You might destroy evidence or fail to stop something already in progress"},{"id":"c","text":"IT charges a fee for self-remediation"},{"id":"d","text":"There is no real reason, it is a formality"}], "correct_id": "b", "explanation": "Self-remediation can erase evidence and miss broader compromise that only the security team can properly investigate."},
    {"id": "q2", "question": "You are not fully sure what you saw was malicious. Should you still report it?", "options": [{"id":"a","text":"No, only report confirmed incidents"},{"id":"b","text":"Yes — false alarms are far cheaper than a missed real incident"},{"id":"c","text":"Only report it if a coworker saw it too"},{"id":"d","text":"Wait until you are certain"}], "correct_id": "b", "explanation": "Security teams prefer investigating uncertain reports over missing a real incident."},
    {"id": "q3", "question": "What should you do with a suspicious email after deciding to report it?", "options": [{"id":"a","text":"Delete it immediately so it cannot cause more harm"},{"id":"b","text":"Forward it to as many coworkers as possible yourself"},{"id":"c","text":"Leave it in place and report it so security can review it"},{"id":"d","text":"Reply to the sender asking them to stop"}], "correct_id": "c", "explanation": "Preserving the email intact lets the security team analyze it; deleting or engaging with the sender can lose evidence or tip off the attacker."}
  ]'::jsonb
where title = 'Incident Reporting 101';

-- Cleanup: these rows are superseded by the live computation in
-- fetchOverview() (see dashboard.js) and are now fully unused — leaving
-- them risks someone mistaking them for a live source later.
delete from security_metrics where metric_key = 'training_completion_rate';

commit;

-- ── Follow-up: sharpen weak explanations ───────────────────────────────
-- A handful of explanations just restated the rule instead of giving a
-- concrete reason (caught during review after shipping). Uses
-- jsonb_set + to_jsonb($$...$$::text) rather than a plain '...'::jsonb
-- literal specifically to avoid the apostrophe-breaks-the-string-literal
-- bug hit earlier in this file — to_jsonb() handles the JSON-string
-- encoding, so the dollar-quoted text can contain apostrophes freely.
begin;

update training_modules
set scenario = jsonb_set(
  scenario,
  '{choices,2,explanation}',
  to_jsonb($md$Once it's in a public channel, anyone in the company can see or forward customer PII, whether they needed it or not — and there's no way to know afterward who actually looked at it.$md$::text)
)
where title = 'Data Handling & Privacy';

update training_modules
set quiz = jsonb_set(
  quiz,
  '{0,explanation}',
  to_jsonb($md$Payment card data is both legally regulated and directly usable for fraud if it leaks — that combination is what pushes it to the top tier, above things like internal notes or public content.$md$::text)
)
where title = 'Data Handling & Privacy';

update training_modules
set quiz = jsonb_set(
  quiz,
  '{1,explanation}',
  to_jsonb($md$If you guess too low and it turns out to be sensitive, it could end up somewhere insecure with no way to undo that. If you guess too high, the only cost is an extra step to share it properly — that asymmetry is why the safer default always wins.$md$::text)
)
where title = 'Data Handling & Privacy';

update training_modules
set scenario = jsonb_set(
  scenario,
  '{choices,1,explanation}',
  to_jsonb($md$If your credentials were actually captured, an attacker could already be using them — every hour you wait and watch is an hour they get unsupervised access.$md$::text)
)
where title = 'Incident Reporting 101';

update training_modules
set quiz = jsonb_set(
  quiz,
  '{1,explanation}',
  to_jsonb($md$A false alarm costs the security team a few minutes to rule out. A missed real incident can cost far more — that lopsided trade-off is why they would always rather you report it.$md$::text)
)
where title = 'Incident Reporting 101';

commit;

-- ── Follow-up: bring every quiz explanation to a consistent depth ───────
-- The remaining terse one-line explanations were uneven next to the ones
-- above; this levels all 15 quiz explanations to the same ~2-sentence,
-- concrete-reason standard so feedback quality is even across every miss.
begin;

update training_modules set quiz = jsonb_set(quiz, '{0,explanation}',
  to_jsonb($md$A logo or a business-hours timestamp is trivial for an attacker to fake, so neither tells you much. Where a link actually points — which you can see by hovering before you click — is far harder to disguise, and is the signal worth checking every time.$md$::text))
where title = 'Phishing Fundamentals';
update training_modules set quiz = jsonb_set(quiz, '{1,explanation}',
  to_jsonb($md$Whaling is spear phishing aimed at senior leaders, exploiting their authority to approve things. It's the tactic behind "CEO fraud," where a spoofed executive email pressures finance into an urgent wire transfer.$md$::text))
where title = 'Phishing Fundamentals';
update training_modules set quiz = jsonb_set(quiz, '{2,explanation}',
  to_jsonb($md$Clicking "carefully" still exposes you, and replying confirms to the attacker that your address is live and monitored. Reporting it instead lets the security team investigate and warn everyone else who got the same message.$md$::text))
where title = 'Phishing Fundamentals';

update training_modules set quiz = jsonb_set(quiz, '{0,explanation}',
  to_jsonb($md$Each extra character multiplies the number of guesses an attacker must try, so length adds far more resistance than swapping a few letters for symbols. A short "complex" password like P@ss1! is cracked far faster than a long, plain passphrase.$md$::text))
where title = 'Password Hygiene';
update training_modules set quiz = jsonb_set(quiz, '{1,explanation}',
  to_jsonb($md$Attackers take username/password pairs leaked from one breached site and automatically try them against many other services, betting that people reuse passwords. It's why one reused password can compromise accounts that were never breached themselves.$md$::text))
where title = 'Password Hygiene';
update training_modules set quiz = jsonb_set(quiz, '{2,explanation}',
  to_jsonb($md$No legitimate IT process ever needs your actual password read aloud — they can reset or verify your account without it. A request framed as "just to verify" is a classic pretext to get you to hand it over willingly.$md$::text))
where title = 'Password Hygiene';

update training_modules set quiz = jsonb_set(quiz, '{2,explanation}',
  to_jsonb($md$"Anyone with the link" means the file travels wherever that link is forwarded, with no record of who opened it and no way to revoke access later. For confidential data, that loss of control is the whole risk — share with named people instead.$md$::text))
where title = 'Data Handling & Privacy';

update training_modules set quiz = jsonb_set(quiz, '{0,explanation}',
  to_jsonb($md$Disconnecting, wiping, or resetting a password yourself can erase the traces the security team needs, and may not actually stop an intrusion that's already underway. Reporting first lets them see the full scope before anything is disturbed.$md$::text))
where title = 'Incident Reporting 101';
update training_modules set quiz = jsonb_set(quiz, '{2,explanation}',
  to_jsonb($md$Deleting the email destroys evidence, and replying tips off the attacker that the address is live and monitored. Leaving it in place and reporting it lets security analyze the real message.$md$::text))
where title = 'Incident Reporting 101';

update training_modules set quiz = jsonb_set(quiz, '{0,explanation}',
  to_jsonb($md$Vishing is voice phishing — the same manipulation as a phishing email, but over a phone call, often using urgency or claimed authority. A confident voice makes many people drop the caution they'd apply to a suspicious email.$md$::text))
where title = 'Social Engineering Awareness';
update training_modules set quiz = jsonb_set(quiz, '{1,explanation}',
  to_jsonb($md$Urgency is engineered on purpose: it pushes you to act before you stop to verify through a separate, trusted channel. Slowing down to check is exactly what the attacker is trying to prevent.$md$::text))
where title = 'Social Engineering Awareness';
update training_modules set quiz = jsonb_set(quiz, '{2,explanation}',
  to_jsonb($md$Authority ("I'm the IT director") combined with urgency ("security is down") is a textbook pretext designed to override your normal process. Hanging up and confirming through a known internal contact costs a minute and defeats it.$md$::text))
where title = 'Social Engineering Awareness';

commit;

-- ── Follow-up: expand each quiz from 3 to 5 questions ──────────────────
-- Appended with || so the existing 3 keep their positions. Dollar-quoted
-- JSON so apostrophes in the text can't break the SQL literal. QuizCard
-- renders any array length and requires all-correct, so no app changes.
begin;

update training_modules set quiz = quiz || $md$[
  {"id":"q4","question":"Why is it risky to open an unexpected email attachment, even if the message looks legitimate?","options":[{"id":"a","text":"Attachments make your inbox load more slowly"},{"id":"b","text":"An attachment can run malicious code the moment it's opened, often before anything looks wrong"},{"id":"c","text":"Attachments are always safe if the sender has a company logo"},{"id":"d","text":"It uses up too much storage space"}],"correct_id":"b","explanation":"An attachment can execute malicious code the instant it's opened, frequently before anything looks wrong on screen. A convincing filename or a familiar-looking sender is easy to fake, so 'it looks legitimate' is not enough reason to open something you were not expecting."},
  {"id":"q5","question":"An email from your 'CEO' urgently asks you to buy gift cards and send the codes. What is the best response?","options":[{"id":"a","text":"Buy them right away since a senior leader asked"},{"id":"b","text":"Reply to the email to ask them to confirm the request"},{"id":"c","text":"Verify the request through a channel you already trust before doing anything"},{"id":"d","text":"Forward it to a coworker to handle"}],"correct_id":"c","explanation":"A sudden, urgent money request from a senior figure — especially gift cards, which are hard to trace and reverse — is a hallmark of business email compromise. Confirming through a channel you already trust, rather than replying to the email itself, costs a minute and stops the fraud."}
]$md$::jsonb
where title = 'Phishing Fundamentals';

update training_modules set quiz = quiz || $md$[
  {"id":"q4","question":"Why does multi-factor authentication (MFA) protect you even if your password is stolen?","options":[{"id":"a","text":"It automatically makes your password longer"},{"id":"b","text":"A stolen password alone is not enough — the attacker also needs your second factor"},{"id":"c","text":"It hides your password from websites"},{"id":"d","text":"It changes your password every day"}],"correct_id":"b","explanation":"MFA requires a second factor, like a code from your phone, that an attacker holding only your password does not have. So even a fully leaked password cannot get them in by itself, which is why it is worth enabling everywhere, especially on email."},
  {"id":"q5","question":"What is the main security benefit of using a password manager?","options":[{"id":"a","text":"It lets you safely use one strong password everywhere"},{"id":"b","text":"It types your passwords faster"},{"id":"c","text":"It generates and stores a unique password for every account, so you never reuse one"},{"id":"d","text":"It encrypts all of your emails"}],"correct_id":"c","explanation":"A password manager generates and stores a different random password for every account, so a breach on one site never exposes the others. You only have to remember the single master password, which removes the temptation to reuse."}
]$md$::jsonb
where title = 'Password Hygiene';

update training_modules set quiz = quiz || $md$[
  {"id":"q4","question":"Why should you avoid keeping sensitive data longer than you actually need it?","options":[{"id":"a","text":"Old data slows down your computer"},{"id":"b","text":"The more sensitive data you hold, the more there is to expose if you are ever breached"},{"id":"c","text":"It is illegal to keep any data at all"},{"id":"d","text":"Storage is too expensive to justify"}],"correct_id":"b","explanation":"Data you no longer hold cannot be stolen — every extra copy of sensitive information is one more thing exposed if you are ever breached. Deleting what you no longer need shrinks that risk at essentially no cost."},
  {"id":"q5","question":"Autocomplete fills in a recipient as you type an email. Before sending a file with confidential data, you should:","options":[{"id":"a","text":"Trust autocomplete, it is usually right"},{"id":"b","text":"Double-check the recipient is exactly the person you intend"},{"id":"c","text":"Send it and recall the message if it goes to the wrong person"},{"id":"d","text":"CC yourself as a backup"}],"correct_id":"b","explanation":"Email autocomplete regularly fills in the wrong person with a similar name, and once a message with confidential data is sent you usually cannot take it back. A two-second check of the recipient prevents a leak that has no undo."}
]$md$::jsonb
where title = 'Data Handling & Privacy';

update training_modules set quiz = quiz || $md$[
  {"id":"q4","question":"Someone without a badge follows you toward a secure door, saying they are a new employee who forgot theirs. The best response is to:","options":[{"id":"a","text":"Hold the door — everyone forgets their badge sometimes"},{"id":"b","text":"Politely direct them to reception or security to be verified"},{"id":"c","text":"Ask their name and let them in if it sounds right"},{"id":"d","text":"Ignore them and keep walking"}],"correct_id":"b","explanation":"A forgotten badge is exactly the sympathetic story used to slip past a secure door — the door only protects the space if everyone entering is verified. Directing them to reception is not rude; it is the normal process any real new hire will already expect."},
  {"id":"q5","question":"You find an unlabeled USB drive in the office parking lot. What should you do?","options":[{"id":"a","text":"Plug it into your work laptop to find out who owns it"},{"id":"b","text":"Plug it into a personal device to be safer"},{"id":"c","text":"Hand it to security without plugging it in anywhere"},{"id":"d","text":"Keep it for your own use"}],"correct_id":"c","explanation":"Dropped USB drives are a deliberate trap — plugging one in can run malware or hand over access the instant it connects. Handing it to security without connecting it lets them examine it safely."}
]$md$::jsonb
where title = 'Social Engineering Awareness';

update training_modules set quiz = quiz || $md$[
  {"id":"q4","question":"Your work laptop is stolen from your car. What should you do first?","options":[{"id":"a","text":"Wait a few days to see if it turns up"},{"id":"b","text":"Report it immediately so its access can be revoked and it can be wiped"},{"id":"c","text":"Just buy a replacement and move on"},{"id":"d","text":"Nothing — it is password protected, so it is fine"}],"correct_id":"b","explanation":"Reporting a lost or stolen device immediately lets the security team revoke its access and remotely wipe it before anyone can get in. A lock screen buys time but is not a guarantee, so speed matters more than assuming it is safe."},
  {"id":"q5","question":"When reporting an incident, why is it useful to note roughly when it happened and what you did?","options":[{"id":"a","text":"It is required paperwork and nothing more"},{"id":"b","text":"It proves the incident was not your fault"},{"id":"c","text":"It helps the security team scope what may be affected and respond faster"},{"id":"d","text":"It is not actually useful"}],"correct_id":"c","explanation":"Knowing roughly when it happened and what you clicked or entered lets the security team work out what might be affected and respond faster. It is not about blame — those details are what turn a vague report into something they can act on."}
]$md$::jsonb
where title = 'Incident Reporting 101';

commit;
