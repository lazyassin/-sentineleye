import { NavLink, Outlet } from 'react-router-dom'
import { ShieldCheck, LogOut } from 'lucide-react'
import { supabase } from '../supabase'

const navLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:text-white'
  }`

export default function EmployeeLayout({ session, profile }) {
  return (
    <div className="min-h-screen bg-surface text-white">
      <header className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="font-semibold">SentinelEye</span>
          </div>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              My Training
            </NavLink>
          </nav>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-accent hover:text-accent"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <Outlet context={{ session, profile }} />
      </main>
    </div>
  )
}
