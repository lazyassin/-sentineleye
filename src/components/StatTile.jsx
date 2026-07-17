const GOOD = '#0ca30c'
const BAD = '#d03b3b'

export default function StatTile({ label, value, delta, deltaGood }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface-raised p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-white">{value}</span>
        {delta != null && (
          <span
            className="text-xs font-medium"
            style={{ color: deltaGood === null ? '#898781' : deltaGood ? GOOD : BAD }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}
