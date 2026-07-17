import { useMemo, useRef, useState } from 'react'

const WIDTH = 600
const HEIGHT = 220
const PAD = { top: 16, right: 12, bottom: 28, left: 32 }
const GRID_STEPS = [0, 25, 50, 75, 100]

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function RiskTrendChart({ data, color = '#1d9e75' }) {
  const svgRef = useRef(null)
  const [hoverIndex, setHoverIndex] = useState(null)

  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: PAD.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * innerW),
        y: PAD.top + (1 - d.score / 100) * innerH,
      })),
    [data, innerW, innerH],
  )

  if (points.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-500">No trend data yet.</p>
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const baseline = PAD.top + innerH
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`

  const last = points[points.length - 1]
  const labelIdxs = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])]

  const handleMove = (e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * WIDTH
    let nearest = 0
    let nearestDist = Infinity
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - svgX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {GRID_STEPS.map((g) => {
          const y = PAD.top + (1 - g / 100) * innerH
          return (
            <g key={g}>
              <line
                x1={PAD.left}
                y1={y}
                x2={WIDTH - PAD.right}
                y2={y}
                stroke="#30363d"
                strokeWidth="1"
              />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#898781">
                {g}
              </text>
            </g>
          )
        })}

        {labelIdxs.map((i) => (
          <text
            key={i}
            x={points[i].x}
            y={HEIGHT - 8}
            textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
            fontSize="9"
            fill="#898781"
          >
            {formatDate(points[i].recorded_at)}
          </text>
        ))}

        <path d={areaPath} fill={color} opacity="0.1" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle cx={last.x} cy={last.y} r="4" fill={color} stroke="#161b22" strokeWidth="2" />
        <text x={last.x} y={last.y - 10} textAnchor="end" fontSize="10" fontWeight="600" fill="#ffffff">
          {last.score}
        </text>

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={PAD.top}
              x2={hovered.x}
              y2={baseline}
              stroke="#898781"
              strokeWidth="1"
            />
            <circle cx={hovered.x} cy={hovered.y} r="4" fill={color} stroke="#161b22" strokeWidth="2" />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%` }}
        >
          <div className="font-semibold text-white">{hovered.score}</div>
          <div className="text-gray-400">{formatDate(hovered.recorded_at)}</div>
        </div>
      )}

      <table className="sr-only">
        <caption>Org risk score trend</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.recorded_at}>
              <td>{d.recorded_at}</td>
              <td>{d.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
