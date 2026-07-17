import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function page(title: string, bodyHtml: string) {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${title}</title>
</head>
<body style="margin:0;background:#0d1117;color:#e6edf3;font-family:-apple-system,Segoe UI,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;">
  <div style="max-width:480px;width:100%;background:#161b22;border:1px solid #30363d;border-radius:16px;padding:32px;">
    ${bodyHtml}
  </div>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

const RED_FLAGS = `
  <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.8;color:#c9d1d9;">
    <li>Urgency or pressure to act immediately ("overdue," "before my flight," "within 24 hours")</li>
    <li>A request to click a link to "verify," "review," or "approve" something unexpected</li>
    <li>Sender name and email address that don't quite match, or an unfamiliar domain</li>
    <li>Generic greetings, or requests that bypass your team's normal process</li>
  </ul>`

const REVEAL_BODY = `
  <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(250,178,25,0.12);border:1px solid rgba(250,178,25,0.3);color:#fab219;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:600;">
    ⚠ This was a simulated phishing test
  </div>
  <h1 style="margin:16px 0 8px;font-size:20px;color:#fff;">You clicked a SentinelEye phishing simulation</h1>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#9198a1;">
    This email was sent by your organization's security-awareness program, not a real attacker.
    No credentials, passwords, or personal data were requested or collected — only the fact that
    this link was opened was recorded, for your team's phishing-awareness reporting.
  </p>
  <h2 style="margin:20px 0 8px;font-size:14px;color:#fff;">Red flags to look for next time</h2>
  ${RED_FLAGS}
  <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#9198a1;">
    If this had been a real email, the safest move is to not click, and report it to your
    security team instead.
  </p>`

const INVALID_BODY = `
  <h1 style="margin:0 0 8px;font-size:20px;color:#fff;">Link not recognized</h1>
  <p style="margin:0;font-size:14px;line-height:1.6;color:#9198a1;">
    This link is invalid or has expired. If you believe this is a mistake, contact your security team.
  </p>`

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) return page('Link not recognized — SentinelEye', INVALID_BODY)

  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: event } = await serviceClient
    .from('phishing_events')
    .select('id, clicked')
    .eq('tracking_token', token)
    .maybeSingle()

  if (!event) return page('Link not recognized — SentinelEye', INVALID_BODY)

  // Only fires while clicked is still false — a human reopening the link,
  // or a mail-gateway link scanner, can't stomp the real first-click time.
  // Known limitation: corporate mail gateways / Outlook Safe Links often
  // pre-click every link in an email to scan it, marking this "clicked"
  // before a human ever sees it. Every real phishing-sim product has this
  // same limitation; solving it needs user-agent/timing heuristics, out
  // of scope here.
  if (!event.clicked) {
    await serviceClient
      .from('phishing_events')
      .update({ clicked: true, opened: true, occurred_at: new Date().toISOString() })
      .eq('id', event.id)
      .eq('clicked', false)
  }

  return page('Phishing simulation — SentinelEye', REVEAL_BODY)
})
