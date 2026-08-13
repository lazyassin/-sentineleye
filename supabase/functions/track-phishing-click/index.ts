import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Supabase Edge Functions rewrite any GET response with a text/html
// Content-Type to text/plain, and Supabase Storage does the same for
// stored HTML objects "for security" — both confirmed directly, not
// assumed. So this function only records the click and redirects; the
// actual reveal pages are public routes in the React app itself
// (src/pages/PhishingCaught.jsx, PhishingInvalid.jsx), deployed to Vercel.
const APP_URL = 'https://sentineleye-wheat.vercel.app'
const REVEAL_URL = `${APP_URL}/phishing-caught`
const INVALID_URL = `${APP_URL}/phishing-invalid`

function redirect(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } })
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) return redirect(INVALID_URL)

  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data: event } = await serviceClient
    .from('phishing_events')
    .select('id, clicked, employee_id, phishing_campaigns(template)')
    .eq('tracking_token', token)
    .maybeSingle()

  if (!event) return redirect(INVALID_URL)

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

    // Close the measurement-to-remediation loop: a click doesn't just move
    // the risk score, it puts the module covering that specific lure on the
    // recipient's training list, with the reason recorded. Assigning here
    // rather than on every request means a re-open or a scanner pre-fetch
    // doesn't re-trigger it; the unique constraint is the second guard.
    await assignRemediation(serviceClient, event)
  }

  // The debrief names the influence principle the message actually used, so
  // the template travels with the redirect. PMT (Rogers, 1975) predicts a
  // debrief that raises threat without supplying coping information won't
  // change behaviour — a generic red-flag list is exactly that. Falls back to
  // the generic page if the join came back empty.
  const template = (event.phishing_campaigns as { template?: string } | null)?.template
  return redirect(template ? `${REVEAL_URL}?t=${encodeURIComponent(template)}` : REVEAL_URL)
})

// Deliberately never throws: the recipient still needs their reveal page
// even if the assignment fails, so a problem here degrades the remediation
// rather than breaking the debrief that the ethics of this depend on.
async function assignRemediation(client: ReturnType<typeof createClient>, event: {
  id: string
  employee_id: string
  phishing_campaigns?: { template?: string } | null
}) {
  try {
    const template = event.phishing_campaigns?.template
    if (!template) return

    const { data: module } = await client
      .from('training_modules')
      .select('id')
      .eq('remediates_template', template)
      .maybeSingle()

    if (!module) return

    await client.from('training_assignments').upsert(
      {
        employee_id: event.employee_id,
        module_id: module.id,
        reason: `Assigned automatically after clicking a ${template} simulation.`,
        source_event_id: event.id,
      },
      { onConflict: 'employee_id,module_id', ignoreDuplicates: true },
    )
  } catch {
    // Swallowed by design — see the note above.
  }
}
