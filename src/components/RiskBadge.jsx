import { riskBand } from '../lib/risk'

const STATUS = {
  good: { color: '#0ca30c', bg: 'rgba(12,163,12,0.12)', label: 'Low risk' },
  warning: { color: '#fab219', bg: 'rgba(250,178,25,0.12)', label: 'Moderate risk' },
  serious: { color: '#ec835a', bg: 'rgba(236,131,90,0.12)', label: 'High risk' },
  critical: { color: '#d03b3b', bg: 'rgba(208,59,59,0.12)', label: 'Critical risk' },
}

export default function RiskBadge({ score }) {
  const { color, bg, label } = STATUS[riskBand(score)]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
