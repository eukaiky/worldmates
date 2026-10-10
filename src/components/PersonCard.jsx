import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Hand, UserRound } from 'lucide-react'
import { sayHi } from '../lib/api'
import { isOnline, primaryPhoto } from '../data/worldmates'
import { Avatar, CountryBadge } from './UI'

export { Avatar } from './UI'
export { primaryPhoto } from '../data/worldmates'

export default function PersonCard({ profile }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const main = primaryPhoto(profile)
  const showcase = profile.photos?.find(photo => photo.slot !== main?.slot) || main

  async function hello() {
    if (busy) return
    setBusy(true)
    setError('')

    try {
      navigate(`/messages/${await sayHi(profile.id)}`)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <Link className="relative flex aspect-[4/3] items-center justify-center bg-brand-50" to={`/people/${profile.id}`}>
        {showcase?.url ? (
          <img src={showcase.url} alt={`A photo from ${profile.name}'s world`} className="h-full w-full object-cover" loading="lazy" />
        ) : <UserRound size={52} className="text-brand-600/40" />}

        {isOnline(profile) && (
          <span className="absolute right-3 top-3 rounded-full bg-white px-2 py-1 text-[10px] font-bold text-emerald-600">● Active</span>
        )}
      </Link>

      <div className="p-4">
        <div className="flex items-center gap-3">
          <Link to={`/people/${profile.id}`}><Avatar profile={profile} size={38} /></Link>
          <div className="min-w-0 flex-1">
            <Link className="block truncate text-sm font-bold" to={`/people/${profile.id}`}>{profile.name}</Link>
            <CountryBadge country={profile.country} />
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 disabled:opacity-40" aria-label={`Say Hi to ${profile.name}`} disabled={busy} onClick={hello}>
            <Hand size={18} />
          </button>
        </div>

        <p className="my-3 min-h-10 break-words text-xs leading-relaxed text-slate-500">{profile.bio || 'Always up for a good conversation.'}</p>

        <div className="flex flex-wrap gap-1.5">
          {(profile.interests || []).slice(0, 3).map(item => <span className="chip" key={item}>{item}</span>)}
        </div>

        {error && <p className="error mt-3" role="alert">{error}</p>}
      </div>
    </article>
  )
}