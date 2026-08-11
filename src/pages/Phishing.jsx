import { useEffect, useMemo, useState } from 'react'
import { Search, Send, Loader2, Copy, Check, AlertTriangle, X } from 'lucide-react'
import { fetchPhishingOverview, sendPhishingEmail } from '../lib/phishing'
import { fetchEmployees } from '../lib/admin'
import StatTile from '../components/StatTile'
import FunnelChart from '../components/FunnelChart'

const TEMPLATES = ['Fake invoice', 'Credential harvest', 'Business email compromise']

const formatDelta = (latest, previous) => {
  if (latest == null || previous == null) return null
  const diff = latest - previous
  if (diff === 0) return '±0pt vs last campaign'
  return `${diff > 0 ? '+' : ''}${diff}pt vs last campaign`
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

function CampaignRow({ c }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white">{c.name}</p>
        <p className="text-xs text-gray-500">
          {c.template} · {formatDate(c.sent_at)} · {c.target_count} targeted
        </p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          Click <span className="font-semibold text-white">{c.clickRate}%</span>
        </span>
        <span className="text-gray-400">
          Report <span className="font-semibold text-white">{c.reportRate}%</span>
        </span>
      </div>
    </li>
  )
}

export default function Phishing() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const [employees, setEmployees] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [template, setTemplate] = useState(TEMPLATES[0])
  const [audience, setAudience] = useState('one') // 'one' | 'department' | 'all'
  const [department, setDepartment] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [result, setResult] = useState(null)
  // Holds the link most recently copied, so the tick shows on that row only.
  const [copied, setCopied] = useState(null)

  const load = () => {
    fetchPhishingOverview().then(setData).catch((err) => setError(err.message))
  }

  useEffect(load, [])
  useEffect(() => {
    fetchEmployees().then(setEmployees).catch(() => {})
  }, [])

  const matches = useMemo(() => {
    if (!query || selected) return []
    const q = query.toLowerCase()
    return employees
      .filter((e) => e.full_name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
      .slice(0, 6)
  }, [query, employees, selected])

  const departments = useMemo(
    () => [...new Set(employees.map((e) => e.department).filter(Boolean))].sort(),
    [employees],
  )

  // Resolving the audience here rather than server-side keeps the edge
  // function to a single code path: it only ever receives a list of ids.
  const recipients = useMemo(() => {
    if (audience === 'all') return employees
    if (audience === 'department') return employees.filter((e) => e.department === department)
    return selected ? [selected] : []
  }, [audience, employees, department, selected])

  const audienceLabel =
    audience === 'all' ? 'All employees' : audience === 'department' ? department : 'Manual'

  const handleSend = async (e) => {
    e.preventDefault()
    setSendError(null)
    setResult(null)
    setCopied(null)
    setSending(true)

    try {
      const res = await sendPhishingEmail({
        employee_ids: recipients.map((r) => r.id),
        template,
        label: audienceLabel,
      })
      setResult(res)
      setSelected(null)
      setQuery('')
      load()
    } catch (err) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link)
    setCopied(true)
  }

  const latest = data?.campaigns[0]
  const previous = data?.campaigns[1]
  const normalCampaigns = data?.campaigns.filter((c) => !c.isManual) ?? []
  const manualCampaigns = data?.campaigns.filter((c) => c.isManual) ?? []

  return (
    <>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Phishing simulations</h1>
        <p className="text-sm text-gray-400">Simulated campaign results across all employees</p>
      </div>

      <form
        onSubmit={handleSend}
        className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised p-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-white">Send simulation</h2>

        <div className="mb-4">
          <span className="mb-1.5 block text-sm font-medium text-gray-300">Send to</span>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'one', label: 'One employee' },
              { key: 'department', label: 'A department' },
              { key: 'all', label: 'Everyone' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAudience(opt.key)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  audience === opt.key
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border-subtle text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="relative sm:col-span-2">
            {audience === 'department' ? (
              <>
                <label htmlFor="department" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Department
                </label>
                <select
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 px-3 text-sm text-white outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">Choose a department…</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d} ({employees.filter((e) => e.department === d).length})
                    </option>
                  ))}
                </select>
              </>
            ) : audience === 'all' ? (
              <>
                <span className="mb-1.5 block text-sm font-medium text-gray-300">Recipients</span>
                <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm text-white">
                  Every employee on the roster ({employees.length})
                </div>
              </>
            ) : (
              <>
            <label htmlFor="employee_search" className="mb-1.5 block text-sm font-medium text-gray-300">
              Employee
            </label>
            {selected ? (
              <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 py-2.5 pl-10 pr-3">
                <span className="text-sm text-white">
                  {selected.full_name} <span className="text-gray-500">· {selected.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  id="employee_search"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email"
                  autoComplete="off"
                  className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                />
                {matches.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border-subtle bg-surface-raised shadow-xl">
                    {matches.map((emp) => (
                      <li key={emp.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(emp)
                            setQuery('')
                          }}
                          className="block w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-accent/10 hover:text-white"
                        >
                          {emp.full_name} <span className="text-gray-500">· {emp.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
              </>
            )}
          </div>

          <div>
            <label htmlFor="template" className="mb-1.5 block text-sm font-medium text-gray-300">
              Template
            </label>
            <select
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 px-3 text-sm text-white outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
            >
              {TEMPLATES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sendError && (
          <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-400">
            {sendError}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                result.sent_count > 0
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-border-subtle bg-surface text-gray-300'
              }`}
            >
              Recorded {result.results.length} simulation
              {result.results.length === 1 ? '' : 's'} · delivered {result.sent_count},
              undelivered {result.failed_count}
            </div>

            {result.warning && (
              <div
                className="flex items-start gap-2 rounded-lg border p-3 text-xs"
                style={{ borderColor: 'rgba(250,178,25,0.3)', backgroundColor: 'rgba(250,178,25,0.1)', color: '#fab219' }}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {result.warning}
              </div>
            )}

            <div className="max-h-64 space-y-2 overflow-y-auto">
              {result.results.map((r) => (
                <div
                  key={r.employee_id}
                  className="rounded-lg border border-border-subtle bg-surface px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-white">
                      {r.full_name}
                      <span className="text-gray-500"> · {r.email}</span>
                    </span>
                    <span
                      className="shrink-0 text-xs"
                      style={{ color: r.email_sent ? '#1d9e75' : '#fab219' }}
                    >
                      {r.email_sent ? 'Delivered' : 'Not delivered'}
                    </span>
                  </div>
                  {r.tracking_link && (
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-xs text-gray-500">
                        {r.tracking_link}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(r.tracking_link)}
                        className="flex shrink-0 items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-xs text-gray-300 transition-colors hover:border-accent hover:text-accent"
                      >
                        {copied === r.tracking_link ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied === r.tracking_link ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={recipients.length === 0 || sending}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending
            ? 'Sending…'
            : recipients.length > 1
              ? `Send to ${recipients.length} employees`
              : 'Send simulation'}
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          Couldn't load phishing data: {error}
        </div>
      )}

      {!data && !error && <p className="text-sm text-gray-500">Loading…</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Campaigns run" value={data.campaignCount} />
            <StatTile label="Simulations sent" value={data.funnel.sent} />
            <StatTile
              label="Click rate (latest)"
              value={latest ? `${latest.clickRate}%` : '—'}
              delta={formatDelta(latest?.clickRate, previous?.clickRate)}
              deltaGood={
                latest?.clickRate != null && previous?.clickRate != null
                  ? latest.clickRate < previous.clickRate
                  : null
              }
            />
            <StatTile
              label="Report rate (latest)"
              value={latest ? `${latest.reportRate}%` : '—'}
              delta={formatDelta(latest?.reportRate, previous?.reportRate)}
              deltaGood={
                latest?.reportRate != null && previous?.reportRate != null
                  ? latest.reportRate > previous.reportRate
                  : null
              }
            />
          </div>

          <div className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised p-6">
            <h2 className="mb-4 text-sm font-semibold text-white">Engagement funnel</h2>
            <FunnelChart data={data.funnel} />
          </div>

          <div className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised">
            <div className="border-b border-border-subtle px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Campaigns</h2>
              <p className="text-xs text-gray-500">Most recent first</p>
            </div>
            <ul className="divide-y divide-border-subtle">
              {normalCampaigns.map((c) => (
                <CampaignRow key={c.id} c={c} />
              ))}
              {normalCampaigns.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-gray-500">
                  No campaigns run yet.
                </li>
              )}
            </ul>
          </div>

          {manualCampaigns.length > 0 && (
            <details className="rounded-2xl border border-border-subtle bg-surface-raised">
              <summary className="cursor-pointer select-none border-b border-border-subtle px-4 py-3 text-sm font-semibold text-white">
                Manual sends ({manualCampaigns.length})
              </summary>
              <ul className="divide-y divide-border-subtle">
                {manualCampaigns.map((c) => (
                  <CampaignRow key={c.id} c={c} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </>
  )
}
