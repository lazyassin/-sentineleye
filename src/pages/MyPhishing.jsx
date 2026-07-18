import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Flag, Loader2, Link2, CheckCircle2 } from 'lucide-react'
import { fetchMyPhishingEvents, reportPhishingEvent, reportPhishingByLink } from '../lib/phishing'
import PhishingStatusBadge from '../components/PhishingStatusBadge'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function ReportLinkForm({ onReported }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await reportPhishingByLink(text)
      setSuccess(true)
      setText('')
      onReported()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised p-6"
    >
      <h2 className="mb-1 text-sm font-semibold text-white">Report a suspicious link</h2>
      <p className="mb-4 text-xs text-gray-400">
        Got a suspicious email? Don't click it — copy the link address and paste it here to
        report it. You'll get credit for reporting even if you never open it.
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the link from the suspicious email"
            className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() || submitting}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
          Report
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-accent">
          <CheckCircle2 className="h-4 w-4" />
          Reported — thanks for catching it.
        </p>
      )}
    </form>
  )
}

export default function MyPhishing() {
  const { profile } = useOutletContext()
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)
  const [reportingId, setReportingId] = useState(null)

  const load = () => {
    fetchMyPhishingEvents(profile.employee_id).then(setEvents).catch((err) => setError(err.message))
  }

  useEffect(load, [profile.employee_id])

  const handleReport = async (id) => {
    setReportingId(id)
    try {
      await reportPhishingEvent(id)
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, reported: true } : e)))
    } catch {
      // Silently leave the row as-is; the button remains available to retry.
    } finally {
      setReportingId(null)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">My phishing simulations</h1>
        <p className="text-sm text-gray-400">
          Simulated phishing emails sent to you. If you recognize one as suspicious, report it — even after clicking.
        </p>
      </div>

      <ReportLinkForm onReported={load} />

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          Couldn't load your phishing history: {error}
        </div>
      )}

      {!events && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {events && (
        <div className="rounded-2xl border border-border-subtle bg-surface-raised">
          <div className="border-b border-border-subtle px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Simulation history</h2>
            <p className="text-xs text-gray-500">Most recent first</p>
          </div>
          <ul className="divide-y divide-border-subtle">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{e.template}</p>
                  <p className="text-xs text-gray-500">{formatDate(e.sentAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <PhishingStatusBadge reported={e.reported} clicked={e.clicked} />
                  {!e.reported && (
                    <button
                      type="button"
                      onClick={() => handleReport(e.id)}
                      disabled={reportingId === e.id}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reportingId === e.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Flag className="h-3.5 w-3.5" />
                      )}
                      Report as suspicious
                    </button>
                  )}
                </div>
              </li>
            ))}
            {events.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-gray-500">
                No simulated phishing emails yet.
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  )
}
