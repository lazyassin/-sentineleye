import { useState } from 'react'
import { ShieldCheck, Lock, Loader2, Check, X } from 'lucide-react'
import { supabase } from '../supabase'
import { passwordChecks, isPasswordValid } from '../lib/password'

export default function SetNewPassword({ email, onSuccess }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isPasswordValid(password)) {
      setError('Password does not meet the requirements below.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Best-effort: a failed clear just means this screen shows again next
    // login, which is harmless. Blocking entry after a successful password
    // change would not be.
    await supabase.rpc('clear_must_change_password')

    setLoading(false)
    onSuccess()
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
            <p className="text-sm text-gray-400">Signed in as {email}</p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border-subtle bg-surface-raised p-6 shadow-xl"
        >
          <h2 className="mb-1 text-sm font-semibold text-white">Set a new password</h2>
          <p className="mb-4 text-xs text-gray-500">
            You're signed in with a temporary password. Choose a new one to continue.
          </p>

          <div className="mb-4">
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
              New password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <ul className="mt-2 space-y-1">
              {passwordChecks(password).map(({ key, label, passed }) => (
                <li
                  key={key}
                  className={`flex items-center gap-1.5 text-xs ${passed ? 'text-accent' : 'text-gray-500'}`}
                >
                  {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-5">
            <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-gray-300">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
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
            {loading ? 'Saving…' : 'Set password'}
          </button>

          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mt-4 w-full text-center text-sm text-gray-400 transition-colors hover:text-accent"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
