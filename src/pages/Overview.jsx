import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { fetchOverview } from '../lib/dashboard'
import StatTile from '../components/StatTile'
import RiskTrendChart from '../components/RiskTrendChart'
import RiskBadge from '../components/RiskBadge'

const formatDelta = (latest, previous, suffix = '') => {
  if (latest == null || previous == null) return null
  const diff = latest - previous
  if (diff === 0) return `±0${suffix}`
  return `${diff > 0 ? '+' : ''}${diff}${suffix} vs prior period`
}

export default function Overview() {
  const { session } = useOutletContext()
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchOverview().then(setOverview).catch((err) => setError(err.message))
  }, [])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Overview</h1>
        <p className="text-sm text-gray-400">Signed in as {session.user.email}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          Couldn't load dashboard data: {error}
        </div>
      )}

      {!overview && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {overview && (
        <>
          <div className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400">Org risk score</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-5xl font-semibold text-white">
                    {overview.orgScore ?? '—'}
                  </span>
                  {overview.orgScore != null && <RiskBadge score={overview.orgScore} />}
                </div>
                {overview.orgScorePrev != null && (
                  <p
                    className="mt-1 text-xs font-medium"
                    style={{
                      color: overview.orgScore <= overview.orgScorePrev ? '#0ca30c' : '#d03b3b',
                    }}
                  >
                    {formatDelta(overview.orgScore, overview.orgScorePrev)}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6">
              <RiskTrendChart data={overview.history} />
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatTile label="Employees tracked" value={overview.employeeCount} />
            <StatTile
              label="Phishing click rate"
              value={
                overview.metrics.phishing_click_rate?.latest != null
                  ? `${overview.metrics.phishing_click_rate.latest}%`
                  : '—'
              }
              delta={formatDelta(
                overview.metrics.phishing_click_rate?.latest,
                overview.metrics.phishing_click_rate?.previous,
                'pt',
              )}
              deltaGood={
                overview.metrics.phishing_click_rate?.latest != null &&
                overview.metrics.phishing_click_rate?.previous != null
                  ? overview.metrics.phishing_click_rate.latest <
                    overview.metrics.phishing_click_rate.previous
                  : null
              }
            />
            <StatTile
              label="Training completion"
              value={overview.trainingCompletionRate != null ? `${overview.trainingCompletionRate}%` : '—'}
              delta={null}
              deltaGood={null}
            />
            <StatTile
              label="Open incidents"
              value={overview.metrics.open_incidents?.latest ?? '—'}
              delta={formatDelta(
                overview.metrics.open_incidents?.latest,
                overview.metrics.open_incidents?.previous,
              )}
              deltaGood={
                overview.metrics.open_incidents?.latest != null &&
                overview.metrics.open_incidents?.previous != null
                  ? overview.metrics.open_incidents.latest <
                    overview.metrics.open_incidents.previous
                  : null
              }
            />
            <StatTile
              label="Simulations sent"
              value={overview.metrics.simulations_sent?.latest ?? '—'}
              delta={formatDelta(
                overview.metrics.simulations_sent?.latest,
                overview.metrics.simulations_sent?.previous,
              )}
              deltaGood={null}
            />
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface-raised">
            <div className="border-b border-border-subtle px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Employees to watch</h2>
              <p className="text-xs text-gray-500">Highest individual risk scores</p>
            </div>
            <ul className="divide-y divide-border-subtle">
              {overview.topRisk.map((emp) => (
                <li key={emp.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{emp.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {emp.department} · {emp.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {emp.risk_score}
                    </span>
                    <RiskBadge score={emp.risk_score} />
                  </div>
                </li>
              ))}
              {overview.topRisk.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-500">
                  No employees tracked yet.
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </>
  )
}
