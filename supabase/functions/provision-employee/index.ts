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

// Ambiguous characters (0/O, 1/l/I) excluded — this password is read off a
// screen by an admin, relayed out of band, and typed once by the employee.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SPECIAL = '!@#$%^&*-_=+?'
const ALL = UPPER + LOWER + DIGITS + SPECIAL

function randomChar(charset: string): string {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return charset[buf[0] % charset.length]
}

// Satisfies src/lib/password.js's PASSWORD_RULES (8+ chars, upper, digit,
// special) BY CONSTRUCTION: one char is drawn from each required class up
// front, so validity never depends on random luck — only the shuffle does.
function generateTempPassword(length = 14): string {
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SPECIAL)]
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => randomChar(ALL))
  const chars = [...required, ...rest]

  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1)
    crypto.getRandomValues(buf)
    const j = buf[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401)

  // Built with the CALLER's forwarded JWT (not the anon key alone), so
  // auth.uid() and is_admin() resolve to the real caller below — this
  // client can never see or do more than the caller legitimately can.
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData?.user) {
    return json({ error: 'Invalid or expired session' }, 401)
  }

  // Reuses the same hardened helper the DB policies use — one definition
  // of "admin," not a second copy of the logic living in this function.
  const { data: isAdmin, error: adminCheckError } = await callerClient.rpc('is_admin')
  if (adminCheckError || !isAdmin) {
    return json({ error: 'Admin access required' }, 403)
  }

  let body: { full_name?: string; email?: string; department?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const full_name = (body.full_name ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const department = (body.department ?? '').trim() || 'Unassigned'

  if (!full_name || !email) {
    return json({ error: 'full_name and email are required' }, 400)
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email address' }, 400)
  }

  // Privileged from here — service role bypasses RLS entirely, so every
  // write below is gated only by the admin check already performed above.
  const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 1. Roster row first. handle_new_user() looks employees up by email
  //    when auth.users gets the new row in step 2, so it must exist first.
  const { data: employee, error: employeeError } = await serviceClient
    .from('employees')
    .insert({ full_name, email, department })
    .select()
    .single()

  if (employeeError) {
    if (employeeError.code === '23505') {
      return json({ error: 'An employee with this email already exists.' }, 409)
    }
    return json({ error: `Could not create roster entry: ${employeeError.message}` }, 500)
  }

  const tempPassword = generateTempPassword()

  // 2. Real auth account. handle_new_user() fires inside GoTrue's own
  //    insert transaction and creates the profiles row itself — if it
  //    raises (no roster match, or profiles_employee_id_unique trips),
  //    the whole auth.users insert rolls back and createUser errors here,
  //    same "no orphaned users" guarantee the self-serve path had.
  const { data: created, error: createUserError } = await serviceClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })

  if (createUserError || !created?.user) {
    // Roll back the roster row so the email isn't stuck blocking a retry
    // on employees.email's unique constraint. Best-effort: if this also
    // fails, surface both errors so an admin can clean up by hand.
    const { error: cleanupError } = await serviceClient.from('employees').delete().eq('id', employee.id)
    if (cleanupError) {
      console.error('provision-employee: cleanup failed after createUser error', {
        employeeId: employee.id,
        email,
        createUserError: createUserError?.message,
        cleanupError: cleanupError.message,
      })
      return json(
        {
          error: `Account creation failed (${createUserError?.message ?? 'unknown error'}), and the roster row could not be cleaned up automatically. Remove ${email} from the roster manually before retrying.`,
        },
        500,
      )
    }
    return json({ error: `Could not create account: ${createUserError?.message ?? 'unknown error'}` }, 500)
  }

  // 3. Force a password change on first login. The account is already
  //    fully functional (auth user + profiles row exist) even if this
  //    fails — retry once, then respond 200 with a warning instead of
  //    failing the request. See plan notes: failing loud here would tempt
  //    a retry of the whole form, which collides on employees.email's
  //    unique constraint even though the account already exists.
  let warning: string | null = null
  let flagSet = false
  for (let attempt = 0; attempt < 2 && !flagSet; attempt++) {
    const { error: flagError } = await serviceClient
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', created.user.id)
    if (!flagError) {
      flagSet = true
    } else if (attempt === 1) {
      console.error('provision-employee: could not set must_change_password', {
        userId: created.user.id,
        email,
        error: flagError.message,
      })
      warning =
        'Account created, but the forced password-change flag could not be set. The employee will not be prompted to change their temporary password on first login.'
    }
  }

  // Never log tempPassword — it must exist only in this response body.
  return json({ employee, temp_password: tempPassword, warning })
})
