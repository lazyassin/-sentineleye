import { ShieldAlert } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

// Generic fallback, used when the tracking function couldn't determine which
// template was sent (or when the page is opened directly).
const GENERIC_FLAGS = [
  'Urgency or pressure to act immediately ("overdue," "before my flight," "within 24 hours")',
  'A request to click a link to "verify," "review," or "approve" something unexpected',
  "Sender name and email address that don't quite match, or an unfamiliar domain",
  "Generic greetings, or requests that bypass your team's normal process",
]

// Per-template debrief content. Protection Motivation Theory (Rogers, 1975)
// predicts that raising threat awareness without supplying coping information
// doesn't change behaviour, so each entry names the influence principle the
// message actually used and gives the indicators specific to that lure —
// rather than a generic list that could describe any phishing email.
// Keys match phishing_campaigns.template exactly.
const TEMPLATES = {
  'Fake invoice': {
    principle: 'Authority and urgency',
    mechanism:
      'The message presented itself as your billing team (authority) and attached a deadline and a financial penalty to inaction — 12 days overdue, a late fee, a hold on the account (urgency). Together those are designed to get you to act before you check.',
    flags: [
      'An invoice number and amount you don\'t recognise, for something you didn\'t order',
      'A late fee or account hold used to create time pressure',
      'A "Review Invoice" button rather than an attached invoice or a link you\'d normally use',
      'Billing correspondence arriving outside your organisation\'s usual finance process',
    ],
  },
  'Credential harvest': {
    principle: 'Scarcity and urgency',
    mechanism:
      'The message claimed a resource you depend on was about to run out — a mailbox at 97% of its limit, with mail bouncing within 24 hours. Scarcity plus a countdown is one of the most reliable ways to get someone to click before thinking, because the cost of delay feels concrete and immediate.',
    flags: [
      'A storage, quota or licence warning that arrives by email rather than from the system itself',
      'A specific-sounding figure ("97% full") that you have no way to verify from the message',
      'A deadline measured in hours',
      'A "Verify Account" link, when account settings are somewhere you already know how to reach',
    ],
  },
  'Business email compromise': {
    principle: 'Authority, urgency and social pressure',
    mechanism:
      'The message impersonated a senior colleague (authority), gave you a closing window in which to act — boarding in 20 minutes (urgency) — and framed the request as a personal favour that would bypass the normal approval process (social pressure). This is the pattern behind most real wire-transfer fraud, and it works because refusing feels like obstructing your own manager.',
    flags: [
      'A senior person asking you directly for something that normally goes through a process',
      'A reason the request can\'t wait, and a reason they can\'t be reached to confirm it',
      'Payment or approval requested by email alone, with no second channel',
      'A reply-to address that differs from the sender, or "Sent from my iPhone" excusing brevity',
    ],
  },
}

export default function PhishingCaught() {
  const [params] = useSearchParams()
  const detail = TEMPLATES[params.get('t')] ?? null

  // ?v=a serves the control condition for the H2 usability evaluation: a
  // generic pass/fail notice of the kind commercial platforms send, carrying
  // threat information and no coping information. Identical card, spacing and
  // typography to the treatment condition, so the only variable is content.
  // Variant letters rather than names, so a participant reading the address
  // bar cannot tell which version is the one under test.
  if (params.get('v') === 'a') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-raised p-8">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ color: '#d03b3b', backgroundColor: 'rgba(208,59,59,0.12)', border: '1px solid rgba(208,59,59,0.3)' }}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Failed
          </div>

          <h1 className="mt-4 text-xl font-semibold text-white">
            You failed this phishing test
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-400">
            You clicked a link in a simulated phishing email. This result has been recorded and
            reported to your security team, and your security awareness score has been updated
            accordingly.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-gray-400">
            Employees are expected to identify and avoid phishing messages. Please take more care
            with future emails.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-raised p-8">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ color: '#fab219', backgroundColor: 'rgba(250,178,25,0.12)', border: '1px solid rgba(250,178,25,0.3)' }}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          This was a simulated phishing test
        </div>

        <h1 className="mt-4 text-xl font-semibold text-white">
          You clicked a SentinelEye phishing simulation
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">
          This email was sent by your organization's security-awareness program, not a real
          attacker. No credentials, passwords, or personal data were requested or collected —
          only the fact that this link was opened was recorded, for your team's
          phishing-awareness reporting.
        </p>

        {detail && (
          <>
            <h2 className="mt-6 text-sm font-semibold text-white">
              What this message used on you: {detail.principle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{detail.mechanism}</p>
          </>
        )}

        <h2 className="mt-6 text-sm font-semibold text-white">
          {detail ? 'Red flags in this specific message' : 'Red flags to look for next time'}
        </h2>
        <ul className="mt-2 space-y-2 text-sm text-gray-300">
          {(detail?.flags ?? GENERIC_FLAGS).map((flag) => (
            <li key={flag} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-500" />
              {flag}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-xs leading-relaxed text-gray-500">
          If this had been a real email, the safest move is to not click, and report it to your
          security team instead.
        </p>
      </div>
    </div>
  )
}
