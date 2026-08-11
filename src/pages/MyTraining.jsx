import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react'
import { fetchMyTraining } from '../lib/training'
import { fetchMyRisk } from '../lib/risk'
import RiskCard from '../components/RiskCard'

export default function MyTraining() {
  const { session, profile } = useOutletContext()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [risk, setRisk] = useState(null)
  const [riskError, setRiskError] = useState(null)

  useEffect(() => {
    fetchMyTraining(profile.employee_id).then(setData).catch((err) => setError(err.message))
  }, [profile.employee_id])

  useEffect(() => {
    fetchMyRisk().then(setRisk).catch((err) => setRiskError(err.message))
  }, [profile.employee_id])

  const total = data?.modules.length ?? 0
  const pct = total ? Math.round((data.completedCount / total) * 100) : 0

  return (
    <>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">My training</h1>
        <p className="text-sm text-gray-400">Signed in as {session.user.email}</p>
      </div>

      <RiskCard
        risk={risk}
        error={riskError}
        title="Your risk score"
        loadingLabel="Loading your risk score…"
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          Couldn't load training data: {error}
        </div>
      )}

      {!data && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {data && (
        <>
          <div className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised p-6">
            <p className="text-sm text-gray-400">Modules completed</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-white">{data.completedCount}</span>
              <span className="text-lg text-gray-500">/ {total}</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-surface">
              <div
                className="h-2 rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-raised">
            <div className="border-b border-border-subtle px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Assigned modules</h2>
            </div>
            <ul className="divide-y divide-border-subtle">
              {data.modules.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex items-start gap-3">
                    {m.completed ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">{m.title}</p>
                        {m.assigned && !m.completed && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ color: '#fab219', backgroundColor: 'rgba(250,178,25,0.12)' }}
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Priority
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{m.description}</p>
                      {m.assigned && (
                        <p className="mt-1 text-xs" style={{ color: '#fab219' }}>
                          {m.assignmentReason}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="h-3 w-3" />
                        {m.duration_minutes} min · {m.category}
                      </p>
                    </div>
                  </div>
                  {m.completed ? (
                    <span className="shrink-0 text-right text-xs text-gray-500">
                      {m.score != null && m.total != null && (
                        <span className="block font-medium text-gray-300">
                          Scored {m.score}/{m.total}
                        </span>
                      )}
                      Completed {new Date(m.completedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <Link
                      to={`/training/${m.id}`}
                      className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover"
                    >
                      Start module
                    </Link>
                  )}
                </li>
              ))}
              {data.modules.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-500">
                  No training modules assigned yet.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
