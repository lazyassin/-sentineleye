import { riskBand } from '../lib/risk'
import RiskBadge from './RiskBadge'

const BAND_COLOR = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
}

export default function RiskCard({ risk, error, title = 'Risk score', loadingLabel = 'Loading risk score…' }) {
  if (error) {
    return (
      <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
        Couldn't load risk score: {error}
      </div>
    )
  }

  if (!risk) {
    return <p className="mb-6 text-sm text-gray-500">{loadingLabel}</p>
  }

  const color = BAND_COLOR[riskBand(risk.score)]
  const trainingPct = Math.round(risk.trainingRate * 100)
  const clickPct = Math.round(risk.clickRate * 100)

  return (
    <div className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised p-6">
      <p className="text-sm text-gray-400">{title}</p>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="text-4xl font-semibold text-white">{risk.score}</span>
        <RiskBadge score={risk.score} />
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-400">Training completion (40% of score)</span>
            <span className="text-gray-300">
              {risk.modulesCompleted}/{risk.modulesTotal} modules · {trainingPct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface">
            <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${trainingPct}%` }} />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-400">Phishing risk (60% of score)</span>
            <span className="text-gray-300">
              {risk.phishingClicked}/{risk.phishingSent} clicked, {risk.phishingReported} reported
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface">
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${clickPct}%`, backgroundColor: color }} />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-gray-500">
        Calculated as 40% missed training + 60% phishing risk — lower is better. A click you
        later report still counts against you, but only at half weight, since reporting a
        threat is worth rewarding even after clicking.
      </p>
    </div>
  )
}
