import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserPlus, Mail, Building2, Loader2, Copy, Check, AlertTriangle, ChevronRight } from 'lucide-react'
import { fetchEmployees, addEmployee } from '../lib/admin'
import RiskBadge from '../components/RiskBadge'

export default function Admin() {
  const [employees, setEmployees] = useState(null)
  const [listError, setListError] = useState(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [department, setDepartment] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState(null)
  const [provisioned, setProvisioned] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = () => {
    fetchEmployees().then(setEmployees).catch((err) => setListError(err.message))
  }

  useEffect(load, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setProvisioned(null)
    setCopied(false)
    setLoading(true)

    try {
      const result = await addEmployee({
        full_name: fullName,
        email,
        department: department || 'Unassigned',
      })
      setProvisioned(result)
      setFullName('')
      setEmail('')
      setDepartment('')
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(provisioned.temp_password)
    setCopied(true)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Admin</h1>
        <p className="text-sm text-gray-400">Manage the employee roster</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mb-6 rounded-2xl border border-border-subtle bg-surface-raised p-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-white">Add employee</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-gray-300">
              Full name
            </label>
            <div className="relative">
              <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="full_name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@company.com"
                className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="department" className="mb-1.5 block text-sm font-medium text-gray-300">
              Department
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering"
                className="w-full rounded-lg border border-border-subtle bg-surface py-2.5 pl-10 pr-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {formError && (
          <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-400">
            {formError}
          </div>
        )}

        {provisioned && (
          <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-4">
            <p className="text-sm font-medium text-accent">
              Account created for {provisioned.employee.full_name}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Share these credentials with the employee. The password won't be shown again.
            </p>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-3 py-2">
                <span className="text-xs text-gray-500">Email</span>
                <span className="font-mono text-sm text-white">{provisioned.employee.email}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-3 py-2">
                <span className="text-xs text-gray-500">Temporary password</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-white">{provisioned.temp_password}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-xs text-gray-300 transition-colors hover:border-accent hover:text-accent"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            {provisioned.warning && (
              <div
                className="mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: 'rgba(250,178,25,0.3)', backgroundColor: 'rgba(250,178,25,0.1)', color: '#fab219' }}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {provisioned.warning}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Adding…' : 'Add to roster'}
        </button>
      </form>

      <div className="rounded-2xl border border-border-subtle bg-surface-raised">
        <div className="border-b border-border-subtle px-4 py-3">
          <h2 className="text-sm font-semibold text-white">Roster</h2>
          <p className="text-xs text-gray-500">Employees with provisioned accounts</p>
        </div>

        {listError && (
          <div className="px-4 py-3 text-sm text-red-400">Couldn't load roster: {listError}</div>
        )}

        <ul className="divide-y divide-border-subtle">
          {employees?.map((emp) => (
            <li key={emp.id}>
              <Link
                to={`/admin/employees/${emp.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent/5"
              >
                <div>
                  <p className="text-sm font-medium text-white">{emp.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {emp.department} · {emp.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <RiskBadge score={emp.risk_score} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-600" />
                </div>
              </Link>
            </li>
          ))}
          {employees?.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-gray-500">No employees yet.</li>
          )}
        </ul>
      </div>
    </>
  )
}
