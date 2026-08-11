import { useState } from 'react'
import { ShieldCheck, Mail, Lock, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('signin') // 'signin' | 'forgot'
  const [resetSent, setResetSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const handleForgot = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // redirectTo is the current origin, so the link returns to whatever
    // host the app is actually running on (localhost in dev, the deployed
    // domain in production) instead of a hard-coded URL. This origin must
    // also be listed under Authentication → URL Configuration in Supabase.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  const backToSignIn = () => {
    setMode('signin')
    setError(null)
    setResetSent(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <ShieldCheck className="h-6 w-6 text-accent" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">SentinelEye</h1>
            <p className="text-sm text-gray-400">Security awareness dashboard</p>
          </div>
        </div>

        {mode === 'signin' ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border-subtle bg-surface-raised p-6 shadow-xl"
          >
            <h2 className="mb-4 text-sm font-semibold text-white">Sign in to your account</h2>

            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="mb-2">
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="mb-5 text-right">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot')
                  setError(null)
                }}
                className="text-xs text-gray-500 transition-colors hover:text-accent"
              >
                Forgot password?
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleForgot}
            className="rounded-2xl border border-border-subtle bg-surface-raised p-6 shadow-xl"
          >
            <h2 className="mb-1 text-sm font-semibold text-white">Reset your password</h2>
            <p className="mb-4 text-xs text-gray-500">
              Enter your email and we'll send you a link to set a new password.
            </p>

            {resetSent ? (
              <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-3 text-sm text-accent">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  If an account exists for {email}, a reset link is on its way. Check your inbox.
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={backToSignIn}
              className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-accent"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-gray-600">
          Protected access. Unauthorized use is prohibited.
        </p>
      </div>
    </div>
  )
}
