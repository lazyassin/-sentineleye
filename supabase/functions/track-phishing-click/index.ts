import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Supabase Edge Functions rewrite any GET response with a text/html
// Content-Type to text/plain — HTML is explicitly unsupported for GET:
// https://supabase.com/docs/guides/functions ("HTML content is not
// supported. GET requests that return text/html will be rewritten to
// text/plain."). So this function only records the click and redirects;
// the actual reveal page is static HTML hosted in a public Supabase
// Storage bucket (GitHub Pages isn't available — this repo is private,
// and Pages requires a public repo or a paid plan).
const REVEAL_URL = `${SUPABASE_URL}/storage/v1/object/public/phishing-pages/phishing-caught.html`
const INVALID_URL = `${SUPABASE_URL}/storage/v1/object/public/phishing-pages/phishing-invalid.html`

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
    .select('id, clicked')
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
  }

  return redirect(REVEAL_URL)
})
