import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Flag, CheckCircle2, MousePointerClick, Loader2 } from 'lucide-react'
import { fetchMyPhishingEvents, reportPhishingEvent } from '../lib/phishing'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function StatusBadge({ reported, clicked }) {
  if (reported) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-accent" style={{ backgroundColor: 'rgba(29,158,117,0.12)' }}>
        <CheckCircle2 className="h-3 w-3" />
        Reported
      </span>
    )
  }
  if (clicked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: '#ec835a', backgroundColor: 'rgba(236,131,90,0.12)' }}>
        <MousePointerClick className="h-3 w-3" />
        Clicked
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-gray-500" style={{ backgroundColor: 'rgba(148,163,184,0.1)' }}>
      No action recorded
    </span>
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
                  <StatusBadge reported={e.reported} clicked={e.clicked} />
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
