import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getProfile, saveProfile } from '../lib/api'
import { COUNTRIES, INTERESTS, characterCount } from '../data/worldmates'
import { Avatar, CountryBadge, Empty, Logo } from '../components/UI'
import PhotoManager from '../components/PhotoManager'

export default function ProfileEditor({ onboarding = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ name: '', country: '', bio: '', interests: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    getProfile(user.id)
      .then(value => {
        if (!alive) return
        setProfile(value)
        setForm({ name: value.name || '', country: value.country || '', bio: value.bio || '', interests: value.interests || [] })
      })
      .catch(failure => { if (alive) setError(failure.message) })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [user.id, retry])

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }))
    setNotice('')
  }

  function interest(item) {
    setForm(current => ({
      ...current,
      interests: current.interests.includes(item)
        ? current.interests.filter(value => value !== item)
        : current.interests.length < 8 ? [...current.interests, item] : current.interests,
    }))
    setNotice('')
  }

  async function save(event) {
    event.preventDefault()
    if (busy || photoBusy) return
    setBusy(true)
    setError('')
    setNotice('')

    try {
      const saved = await saveProfile(user.id, form)
      setProfile(current => ({ ...current, ...saved }))
      if (onboarding) navigate('/feed', { replace: true })
      else setNotice('Saved. Your profile is up to date.')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="p-8" role="status">Loading profile...</p>
  if (!profile) return <Empty title="Profile unavailable" text={error}><button className="btn" onClick={() => setRetry(value => value + 1)}>Try again</button></Empty>

  return (
    <div className={`mx-auto max-w-3xl ${onboarding ? 'px-5 py-10' : ''}`}>
      {onboarding && <div className="mb-10"><Logo /></div>}

      <header className="mb-7">
        <h1 className="text-2xl font-extrabold tracking-tight">{onboarding ? 'Let’s make this yours.' : 'Edit profile'}</h1>
        <p className="mt-2 text-sm text-slate-400">{onboarding ? 'A name, a country and a little personality.' : 'Give people a little glimpse of your world.'}</p>
      </header>

      <form className="space-y-5" onSubmit={save}>
        <section className="card">
          <div className="mb-6 flex items-center gap-4">
            <Avatar profile={profile} size={70} />
            <div><strong className="block">{form.name || 'Your name'}</strong><CountryBadge country={form.country} /><span className="mt-1 block text-xs text-slate-400">{profile.plan === 'plus' ? 'Plus' : 'Free'} plan</span></div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label><span className="mb-2 block text-sm font-medium">Name</span><input className="field" required maxLength={50} disabled={busy} value={form.name} onChange={event => update('name', event.target.value)} /></label>
            <label><span className="mb-2 block text-sm font-medium">Country</span><select className="field" required disabled={busy} value={form.country} onChange={event => update('country', event.target.value)}><option value="">Choose your country</option>{COUNTRIES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium">Bio</span>
            <textarea className="field min-h-24" placeholder="Something about you. Keep it short, keep it you." disabled={busy} value={form.bio} onChange={event => { if (characterCount(event.target.value) <= 100) update('bio', event.target.value) }} />
            <span className="mt-2 block text-right text-xs text-slate-400">{characterCount(form.bio)}/100</span>
          </label>
        </section>

        <section className="card">
          <h2 className="text-lg font-bold">Your interests</h2>
          <p className="mb-4 mt-1 text-xs text-slate-400">Choose up to 8 things you could talk about for hours.</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(item => {
              const active = form.interests.includes(item)
              return <button type="button" key={item} aria-pressed={active} disabled={busy || (!active && form.interests.length >= 8)} onClick={() => interest(item)} className={`rounded-full border px-4 py-2 text-sm disabled:opacity-30 ${active ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{item}</button>
            })}
          </div>
        </section>

        <div className="card"><PhotoManager userId={user.id} profile={profile} onChange={setProfile} onBusyChange={setPhotoBusy} disabled={busy} /></div>

        {error && <p className="error" role="alert">{error}</p>}
        {notice && <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-700" role="status">{notice}</p>}

        <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
          <p className="text-xs text-slate-400">Photos save separately.</p>
          <div className="flex gap-3">
            {!onboarding && <Link className="btn-secondary" to={`/people/${user.id}`}>View profile</Link>}
            <button className="btn" disabled={busy || photoBusy}>{busy ? 'Saving...' : onboarding ? 'Save and join the feed' : 'Save changes'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}