import { CheckCircle2, MousePointerClick } from 'lucide-react'

export default function PhishingStatusBadge({ reported, clicked }) {
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
