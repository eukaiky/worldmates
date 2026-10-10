import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let alive = true
    let receivedAuthEvent = false
    let timeout

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        receivedAuthEvent = true
        window.clearTimeout(timeout)

        if (!alive) return

        setSession(nextSession)
        setError('')
        setLoading(false)
      })

    timeout = window.setTimeout(() => {
      if (!alive || receivedAuthEvent) return

      setError(
        'Your session took too long to load. Check your connection and try again.',
      )
      setLoading(false)
    }, 15_000)

    supabase.auth.getSession()
      .then(({ data, error: failure }) => {
        if (!alive || receivedAuthEvent) return

        window.clearTimeout(timeout)

        if (failure) {
          setError(failure.message)
        } else {
          setSession(data.session)
          setError('')
        }

        setLoading(false)
      })
      .catch(failure => {
        if (!alive || receivedAuthEvent) return

        window.clearTimeout(timeout)
        setError(failure.message)
        setLoading(false)
      })

    return () => {
      alive = false
      window.clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId || !supabase) return

    async function ping() {
      if (document.visibilityState !== 'visible') return

      try {
        const { error: failure } = await supabase.rpc('heartbeat')

        if (failure) {
          console.warn('Presence update failed:', failure.message)
        }
      } catch (failure) {
        console.warn('Presence update failed:', failure.message)
      }
    }

    void ping()

    const timer = window.setInterval(ping, 30_000)
    document.addEventListener('visibilitychange', ping)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', ping)
    }
  }, [userId])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}