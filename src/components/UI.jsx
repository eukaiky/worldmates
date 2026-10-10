import { Component, useState } from 'react'
import { Globe2, Sparkles } from 'lucide-react'
import { countryName, primaryPhoto } from '../data/worldmates'

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
        <Globe2 size={22} />
      </span>
      Worldmates
    </span>
  )
}

export function Avatar({ profile, size = 44 }) {
  const photo = primaryPhoto(profile)
  const [failedUrl, setFailedUrl] = useState('')
  const initials = (profile?.name || 'W')
    .split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()

  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size / 3 }}>
      {photo?.url && failedUrl !== photo.url ? (
        <img src={photo.url} alt={profile?.name || 'Profile'} loading="lazy" onError={() => setFailedUrl(photo.url)} />
      ) : initials}
    </span>
  )
}

export function CountryBadge({ country }) {
  const [failed, setFailed] = useState('')

  if (!country || !/^[A-Z]{2}$/.test(country)) return null

  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
      {failed === country ? (
        <span>{country}</span>
      ) : (
        <img
          src={`https://flagcdn.com/${country.toLowerCase()}.svg`}
          alt={`${countryName(country)} flag`}
          width="20" height="14"
          className="h-3.5 w-5 rounded-sm object-cover"
          loading="lazy" onError={() => setFailed(country)}
        />
      )}
      {countryName(country)}
    </span>
  )
}

export function Empty({ title, text, children }) {
  return (
    <div className="card py-12 text-center">
      <Sparkles className="mx-auto mb-4 text-brand-600" size={28} />
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

export class AppErrorBoundary extends Component {
  state = { error: false }

  static getDerivedStateFromError() { return { error: true } }

  componentDidCatch(error) { console.error('Worldmates:', error) }

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto max-w-lg p-8">
          <Empty title="Something went wrong" text="Reload the page and try again.">
            <button className="btn" onClick={() => window.location.reload()}>Reload</button>
          </Empty>
        </main>
      )
    }
    return this.props.children
  }
}