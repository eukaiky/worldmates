import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { isConfigured } from './lib/supabase'
import { getBasicProfile } from './lib/api'
import { profileComplete } from './data/worldmates'
import { AppErrorBoundary, Empty } from './components/UI'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import Feed from './pages/Feed'
import Discover from './pages/Discover'
import Profile from './pages/Profile'
import ProfileEditor from './pages/ProfileEditor'
import Messages from './pages/Messages'

function Gate({ complete = false }) {
  const { user, loading, error } = useAuth()
  const [result, setResult] = useState(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!user || !complete) return
    let alive = true
    setResult(null)

    getBasicProfile(user.id)
      .then(profile => {
        if (alive) setResult({ userId: user.id, profile })
      })
      .catch(failure => {
        if (alive) setResult({ userId: user.id, error: failure.message })
      })

    return () => { alive = false }
  }, [user?.id, complete, retry])

  if (loading) return <p className="p-8" role="status">Opening Worldmates...</p>
  if (error) return <p className="error m-6" role="alert">{error}</p>
  if (!user) return <Navigate to="/auth" replace />

  if (complete) {
    if (!result || result.userId !== user.id) return <p className="p-8" role="status">Loading your profile...</p>

    if (result.error) {
      return (
        <main className="mx-auto max-w-lg p-6">
          <Empty title="We couldn't load your profile" text={result.error}>
            <button className="btn" onClick={() => setRetry(value => value + 1)}>Try again</button>
          </Empty>
        </main>
      )
    }

    if (!profileComplete(result.profile)) return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}

export default function App() {
  if (!isConfigured) {
    return <p className="error m-8">Configure the Supabase variables in .env and restart Vite.</p>
  }

  return (
    <AppErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />

        <Route element={<Gate />}>
          <Route path="/onboarding" element={<ProfileEditor onboarding />} />
          <Route element={<Layout />}>
            <Route path="/settings/profile" element={<ProfileEditor />} />
          </Route>
        </Route>

        <Route element={<Gate complete />}>
          <Route element={<Layout />}>
            <Route path="/feed" element={<Feed />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/people/:id" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Messages />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppErrorBoundary>
  )
}