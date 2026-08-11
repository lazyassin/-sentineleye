import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Each template carries its own sender identity rather than sharing one
// global "from" — a wire-transfer favor asked by "Security" is an
// internal contradiction that gives the simulation away for free. The
// address stays onboarding@resend.dev (the only address Resend allows
// sending from before a domain is verified); only the display name
// varies, since that's the part a recipient actually reads.
const TEMPLATES: Record<string, { subject: string; from: string; html: (name: string, link: string) => string }> = {
  'Fake invoice': {
    subject: 'Invoice #INV-88213 – Payment overdue',
    from: 'Billing Team <onboarding@resend.dev>',
    html: (name, link) => `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <p>Hi ${name},</p>
        <p>Our records show invoice <strong>#INV-88213</strong> ($4,285.00) is 12 days overdue.
        Please review and confirm payment today to avoid a late fee and a hold on your account.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${link}" style="background:#1d9e75;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Review Invoice</a>
        </p>
        <p>Thanks,<br/>Billing Team</p>
      </div>`,
  },
  'Credential harvest': {
    subject: 'Action required: your mailbox storage is almost full',
    from: 'IT Support <onboarding@resend.dev>',
    html: (name, link) => `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <p>Hi ${name},</p>
        <p>Your mailbox is at 97% of its storage limit and new mail will start bouncing within 24
        hours. Verify your account now to keep it active.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${link}" style="background:#1d9e75;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Verify Account</a>
        </p>
        <p>IT Support</p>
      </div>`,
  },
  'Business email compromise': {
    subject: 'Wire authorization – need your sign-off before I land',
    from: 'Michael Grant <onboarding@resend.dev>',
    html: (name, link) => `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <p>${name},</p>
        <p>I'm boarding in 20 minutes and need you to review and approve a wire authorization
        for <strong>$48,750.00</strong> to our new vendor, Halcyon Logistics, before I land.
        Legal already signed off on their end — I just need your final approval to release it
        today. Can you open this now? It's time-sensitive.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${link}" style="background:#c9302c;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Review &amp; Approve</a>
        </p>
        <p>Thanks,<br/>Michael<br/><span style="color:#767676;font-size:12px;">Sent from my iPhone</span></p>
      </div>`,
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  // Optional global override — set this once a real sending domain is
  // verified in Resend. Unset, each template uses its own sender
  // identity (defined below) instead of one shared address.
  const RESEND_FROM_OVERRIDE = Deno.env.get('RESEND_FROM')

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

  // Built with the CALLER's forwarded JWT (not the anon key alone), so
  // auth.uid() and is_admin() resolve to the real caller below.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Invalid or expired session' }, 401)
  }

  const { data: isAdmin, error: adminCheckError } = await callerClient.rpc('is_admin')
  if (adminCheckError || !isAdmin) {
    return json({ error: 'Admin access required' }, 403)
  }

  let body: { employee_id?: string; employee_ids?: string[]; template?: string; label?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const template = (body.template ?? '').trim()
  const label = (body.label ?? '').trim()

  // employee_id (singular) is still accepted so the one-off send path keeps
  // working unchanged; everything below treats it as a one-element batch.
  const requestedIds = Array.isArray(body.employee_ids)
    ? body.employee_ids.map((id) => String(id).trim()).filter(Boolean)
    : body.employee_id
      ? [String(body.employee_id).trim()]
      : []

  if (requestedIds.length === 0 || !template) {
    return json({ error: 'template and at least one employee are required' }, 400)
  }
  // A guard rather than a real limit: this loops one Resend call per
  // recipient, so an unbounded list would risk the function timing out
  // partway and leaving a campaign half-sent.
  if (requestedIds.length > 100) {
    return json({ error: 'Too many recipients in one send (limit 100).' }, 400)
  }
  if (!TEMPLATES[template]) {
    return json({ error: `Unknown template "${template}". Choose one of: ${Object.keys(TEMPLATES).join(', ')}` }, 400)
  }
  if (!RESEND_API_KEY) {
    return json({ error: 'RESEND_API_KEY is not configured on this project. Set it under Edge Functions → Secrets before sending.' }, 500)
  }

  // Privileged from here — service role bypasses RLS entirely.
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: employees, error: employeeError } = await serviceClient
    .from('employees')
    .select('id, full_name, email')
    .in('id', requestedIds)

  if (employeeError) return json({ error: `Could not load employees: ${employeeError.message}` }, 500)
  if (!employees || employees.length === 0) return json({ error: 'No matching employees found' }, 404)

  const today = new Date().toISOString().slice(0, 10)
  // target_count === 1 is what the dashboard uses to file a send under
  // "Manual sends" rather than the main campaign list, so a single-recipient
  // send keeps its original naming and grouping.
  const campaignName = employees.length === 1
    ? `Manual: ${employees[0].full_name} — ${today}`
    : `${label || 'Campaign'}: ${employees.length} recipients — ${today}`

  const { data: campaign, error: campaignError } = await serviceClient
    .from('phishing_campaigns')
    .insert({ name: campaignName, template, target_count: employees.length })
    .select()
    .single()

  if (campaignError) return json({ error: `Could not create campaign: ${campaignError.message}` }, 500)

  const tpl = TEMPLATES[template]
  const results: unknown[] = []
  let sentCount = 0
  let sandboxBlocked = false

  // Sequential on purpose. Firing every send at once would risk tripping
  // Resend's rate limit, and a partial failure would then be much harder to
  // attribute to a specific recipient than it is here.
  for (const employee of employees) {
    const { data: event, error: eventError } = await serviceClient
      .from('phishing_events')
      .insert({ campaign_id: campaign.id, employee_id: employee.id })
      .select('id, tracking_token')
      .single()

    if (eventError || !event) {
      results.push({
        employee_id: employee.id,
        full_name: employee.full_name,
        email: employee.email,
        email_sent: false,
        error: `Could not record event: ${eventError?.message ?? 'unknown error'}`,
      })
      continue
    }

    const trackingLink = `${SUPABASE_URL}/functions/v1/track-phishing-click?token=${event.tracking_token}`
    let emailSent = false
    let error: string | null = null

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: RESEND_FROM_OVERRIDE || tpl.from,
          to: [employee.email],
          subject: tpl.subject,
          html: tpl.html(employee.full_name, trackingLink),
        }),
      })

      const resendBody = await resendRes.json().catch(() => null)

      if (resendRes.ok) {
        emailSent = true
        sentCount++
      } else {
        error = resendBody?.message || `Resend responded with HTTP ${resendRes.status}`
        if (/own email|verify a domain|testing emails|not verified/i.test(error)) sandboxBlocked = true
      }
    } catch (err) {
      error = `Could not reach Resend: ${err instanceof Error ? err.message : 'unknown error'}`
    }

    // The tracking link is returned whether or not delivery succeeded, so the
    // click flow stays testable while the sending domain is unverified.
    results.push({
      employee_id: employee.id,
      full_name: employee.full_name,
      email: employee.email,
      tracking_link: trackingLink,
      email_sent: emailSent,
      error,
    })
  }

  const warning = sandboxBlocked
    ? "Some recipients could not be delivered to. This project's employee addresses are fictional (@sentineleye.io), and Resend's unverified mode only delivers to the address on your own Resend account. Every simulation was still recorded — use the tracking links below to exercise the click flow, or verify a sending domain to reach real addresses."
    : null

  // Never log RESEND_API_KEY or any recipient credentials — only what's
  // already returned to the caller.
  return json({
    campaign,
    results,
    sent_count: sentCount,
    failed_count: results.length - sentCount,
    // Retained so existing single-send callers keep working unchanged.
    tracking_link: (results[0] as { tracking_link?: string })?.tracking_link ?? null,
    email_sent: sentCount > 0,
    warning,
  })
})
