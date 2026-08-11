import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react'
import { fetchEmployeeDetail } from '../lib/admin'
import { fetchEmployeeRisk } from '../lib/risk'
import RiskCard from '../components/RiskCard'
import PhishingStatusBadge from '../components/PhishingStatusBadge'

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export default function EmployeeDetail() {
  const { employeeId } = useParams()
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState(null)
  const [risk, setRisk] = useState(null)
  const [riskError, setRiskError] = useState(null)

  useEffect(() => {
    fetchEmployeeDetail(employeeId).then(setDetail).catch((err) => setError(err.message))
  }, [employeeId])

  useEffect(() => {
    fetchEmployeeRisk(employeeId).then(setRisk).catch((err) => setRiskError(err.message))
  }, [employeeId])

  return (
    <>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to roster
      </Link>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          Couldn't load employee: {error}
        </div>
      )}

      {!detail && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {detail && (
        <>
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-white">{detail.employee.full_name}</h1>
            <p className="text-sm text-gray-400">
              {detail.employee.department} · {detail.employee.email}
            </p>
          </div>

          <RiskCard risk={risk} error={riskError} title="Risk score" />

          <div className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised">
            <div className="border-b border-border-subtle px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Training</h2>
              <p className="text-xs text-gray-500">
                {detail.modules.filter((m) => m.completed).length}/{detail.modules.length} modules completed
              </p>
            </div>
            <ul className="divide-y divide-border-subtle">
              {detail.modules.map((m) => (
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
                  {m.completed && (
                    <span className="shrink-0 text-right text-xs text-gray-500">
                      {m.score != null && m.total != null && (
                        <span className="block font-medium text-gray-300">
                          Scored {m.score}/{m.total}
                        </span>
                      )}
                      Completed {new Date(m.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
              {detail.modules.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-500">No training modules yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-raised">
            <div className="border-b border-border-subtle px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Phishing simulations</h2>
              <p className="text-xs text-gray-500">
                {detail.events.filter((e) => e.clicked).length}/{detail.events.length} clicked · Most recent first
              </p>
            </div>
            <ul className="divide-y divide-border-subtle">
              {detail.events.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{e.template}</p>
                    <p className="text-xs text-gray-500">{formatDate(e.sentAt)}</p>
                  </div>
                  <PhishingStatusBadge reported={e.reported} clicked={e.clicked} />
                </li>
              ))}
              {detail.events.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-500">No simulations sent yet.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
