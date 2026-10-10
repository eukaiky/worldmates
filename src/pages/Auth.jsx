import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/UI'

function message(error) {
  const text = error.message || 'Please try again.'
  const lower = text.toLowerCase()

  if (lower.includes('invalid login credentials')) return 'That email or password isn’t right.'
  if (lower.includes('email not confirmed')) return 'Your email still needs confirmation.'
  if (lower.includes('email rate limit')) return 'Email sending is temporarily limited. Check your Supabase email settings.'
  return text
}

export default function Auth() {
  const [params, setParams] = useSearchParams()
  const register = params.get('mode') === 'register'
  const { user, loading, error: authError } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!loading && user) navigate('/feed', { replace: true })
  }, [user, loading, navigate])

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setNotice('')

    try {
      if (register) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        })

        if (error) throw error

        if (!data.session) {
          setNotice('Account created. If email confirmation is enabled, check your inbox before logging in.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      }
    } catch (failure) {
      setError(message(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-12 sm:py-20">
      <Link className="mb-10 flex justify-center" to="/"><Logo /></Link>

      <div className="card p-7">
        <h1 className="text-3xl font-extrabold tracking-tight">{register ? 'Find your worldmates.' : 'Hey, welcome back.'}</h1>
        <p className="mb-7 mt-3 text-sm text-slate-500">
          {register ? 'A new friend can start with a simple hello.' : 'Your people are waiting.'}
        </p>

        <form className="space-y-5" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <input className="field" type="email" autoComplete="email" required disabled={busy} value={email} onChange={event => setEmail(event.target.value)} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Password</span>
            <div className="relative">
              <input
                className="field pr-16" type={visible ? 'text' : 'password'}
                minLength={register ? 8 : undefined}
                autoComplete={register ? 'new-password' : 'current-password'}
                required disabled={busy} value={password}
                onChange={event => setPassword(event.target.value)}
              />
              <button type="button" className="absolute right-3 top-4 text-xs text-slate-500" onClick={() => setVisible(value => !value)}>
                {visible ? 'Hide' : 'Show'}
              </button>
            </div>
            {register && <p className="mt-2 text-xs text-slate-400">At least 8 characters.</p>}
          </label>

          {(error || authError) && <p className="error" role="alert">{error || authError}</p>}
          {notice && <p className="rounded-xl bg-brand-50 p-3 text-sm" role="status">{notice}</p>}

          <button className="btn w-full" disabled={busy || loading || Boolean(authError)}>
            {busy ? 'One moment...' : loading ? 'Checking session...' : register ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          {register ? 'Already a worldmate?' : 'New around here?'}{' '}
          <button className="font-bold text-brand-700" disabled={busy} onClick={() => {
            setParams(register ? {} : { mode: 'register' })
            setError('')
            setNotice('')
          }}>
            {register ? 'Log in' : 'Join us'}
          </button>
        </p>
      </div>
    </main>
  )
}