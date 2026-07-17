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

const TEMPLATES: Record<string, { subject: string; html: (name: string, link: string) => string }> = {
  'Fake invoice': {
    subject: 'Invoice #INV-88213 – Payment overdue',
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
    subject: 'quick favor before my flight',
    html: (name, link) => `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;">
        <p>${name},</p>
        <p>I'm boarding in 20 minutes and need you to review and approve a wire authorization
        before I land. Can you open this now? It's time-sensitive.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${link}" style="background:#1d9e75;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Review Document</a>
        </p>
        <p>Sent from my iPhone</p>
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
  const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'SentinelEye Security <onboarding@resend.dev>'

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

  let body: { employee_id?: string; template?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const employee_id = (body.employee_id ?? '').trim()
  const template = (body.template ?? '').trim()

  if (!employee_id || !template) return json({ error: 'employee_id and template are required' }, 400)
  if (!TEMPLATES[template]) {
    return json({ error: `Unknown template "${template}". Choose one of: ${Object.keys(TEMPLATES).join(', ')}` }, 400)
  }
  if (!RESEND_API_KEY) {
    return json({ error: 'RESEND_API_KEY is not configured on this project. Set it under Edge Functions → Secrets before sending.' }, 500)
  }

  // Privileged from here — service role bypasses RLS entirely.
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: employee, error: employeeError } = await serviceClient
    .from('employees')
    .select('id, full_name, email')
    .eq('id', employee_id)
    .single()

  if (employeeError || !employee) return json({ error: 'Employee not found' }, 404)

  const { data: campaign, error: campaignError } = await serviceClient
    .from('phishing_campaigns')
    .insert({
      name: `Manual: ${employee.full_name} — ${new Date().toISOString().slice(0, 10)}`,
      template,
      target_count: 1,
    })
    .select()
    .single()

  if (campaignError) return json({ error: `Could not create campaign: ${campaignError.message}` }, 500)

  const { data: event, error: eventError } = await serviceClient
    .from('phishing_events')
    .insert({ campaign_id: campaign.id, employee_id: employee.id })
    .select('id, tracking_token')
    .single()

  if (eventError) return json({ error: `Could not create event: ${eventError.message}` }, 500)

  const trackingLink = `${SUPABASE_URL}/functions/v1/track-phishing-click?token=${event.tracking_token}`
  const tpl = TEMPLATES[template]

  let emailSent = false
  let warning: string | null = null

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [employee.email],
        subject: tpl.subject,
        html: tpl.html(employee.full_name, trackingLink),
      }),
    })

    const resendBody = await resendRes.json().catch(() => null)

    if (resendRes.ok) {
      emailSent = true
    } else {
      const raw = resendBody?.message || `Resend responded with HTTP ${resendRes.status}`
      const sandboxLimit = /own email|verify a domain|testing emails|not verified/i.test(raw)
      warning = sandboxLimit
        ? `Resend could not deliver to ${employee.email}: ${raw} This project's employee emails are fictional (@sentineleye.io), and Resend's unverified/sandbox mode only delivers to the address on your Resend account. The simulation was still recorded — use the tracking link below to test the click flow directly, or verify a sending domain in Resend to reach real addresses.`
        : `Resend could not deliver the email: ${raw}`
    }
  } catch (err) {
    warning = `Could not reach Resend: ${err instanceof Error ? err.message : 'unknown error'}`
  }

  // Never log RESEND_API_KEY or any recipient credentials — only what's
  // already returned to the caller.
  return json({
    campaign,
    event: { id: event.id },
    tracking_link: trackingLink,
    email_sent: emailSent,
    warning,
  })
})
