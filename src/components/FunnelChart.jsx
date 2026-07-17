const STAGES = [
  { key: 'sent', label: 'Sent', color: '#86e0c2' },
  { key: 'opened', label: 'Opened', color: '#1d9e75' },
  { key: 'clicked', label: 'Clicked', color: '#0f6b4d' },
]

export default function FunnelChart({ data }) {
  const max = data.sent || 1

  return (
    <div className="space-y-3">
      {STAGES.map(({ key, label, color }) => {
        const value = data[key] ?? 0
        const pct = Math.max((value / max) * 100, value > 0 ? 4 : 0)
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-gray-400">{label}</span>
            <div className="h-6 flex-1 rounded bg-surface">
              <div
                className="flex h-6 items-center justify-end rounded pr-2 transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              >
                <span className="text-xs font-semibold text-white">{value}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
