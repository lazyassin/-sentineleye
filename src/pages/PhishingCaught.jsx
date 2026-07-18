import { ShieldAlert } from 'lucide-react'

const RED_FLAGS = [
  'Urgency or pressure to act immediately ("overdue," "before my flight," "within 24 hours")',
  'A request to click a link to "verify," "review," or "approve" something unexpected',
  "Sender name and email address that don't quite match, or an unfamiliar domain",
  "Generic greetings, or requests that bypass your team's normal process",
]

export default function PhishingCaught() {
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

        <h2 className="mt-6 text-sm font-semibold text-white">Red flags to look for next time</h2>
        <ul className="mt-2 space-y-2 text-sm text-gray-300">
          {RED_FLAGS.map((flag) => (
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
