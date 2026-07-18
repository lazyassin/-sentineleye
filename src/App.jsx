import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import { fetchProfile } from './lib/profile'
import Login from './pages/Login'
import Layout from './components/Layout'
import Overview from './pages/Overview'
import Phishing from './pages/Phishing'
import Admin from './pages/Admin'
import EmployeeLayout from './components/EmployeeLayout'
import MyTraining from './pages/MyTraining'
import MyPhishing from './pages/MyPhishing'
import TrainingModule from './pages/TrainingModule'
import SetNewPassword from './pages/SetNewPassword'
import PhishingCaught from './pages/PhishingCaught'
import PhishingInvalid from './pages/PhishingInvalid'

function NoAccess({ email }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border-subtle bg-surface-raised p-6 text-center">
        <p className="mb-4 text-sm text-gray-300">
          {email} is signed in, but no account profile was found. Contact an admin to get set up.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-accent hover:text-accent"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

function AuthedApp({ session, profile, profileError, setProfile }) {
  if (!session) {
    return <Login />
  }

  if (profileError) {
    return <NoAccess email={session.user.email} />
  }

  if (!profile) {
    return null
  }

  if (profile.role === 'employee' && profile.must_change_password) {
    return (
      <SetNewPassword
        email={session.user.email}
        onSuccess={() => setProfile((p) => ({ ...p, must_change_password: false }))}
      />
    )
  }

  return profile.role === 'admin' ? (
    <Routes>
      <Route element={<Layout session={session} />}>
        <Route index element={<Overview />} />
        <Route path="phishing" element={<Phishing />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  ) : (
    <Routes>
      <Route element={<EmployeeLayout session={session} profile={profile} />}>
        <Route index element={<MyTraining />} />
        <Route path="phishing" element={<MyPhishing />} />
        <Route path="training/:moduleId" element={<TrainingModule />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    const handleSession = (session) => {
      setSession(session)
      if (!session) {
        setProfile(null)
        setProfileError(null)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session)
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })
  }, [])

  useEffect(() => {
    if (!session) return
    fetchProfile(session.user.id)
      .then(setProfile)
      .catch((err) => setProfileError(err.message))
  }, [session])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public — reached by email recipients with no session, via the
            track-phishing-click edge function's redirect. */}
        <Route path="/phishing-caught" element={<PhishingCaught />} />
        <Route path="/phishing-invalid" element={<PhishingInvalid />} />
        <Route
          path="*"
          element={
            <AuthedApp
              session={session}
              profile={profile}
              profileError={profileError}
              setProfile={setProfile}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
