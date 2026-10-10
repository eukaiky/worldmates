import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { discover } from '../lib/api'
import { COUNTRIES, INTERESTS } from '../data/worldmates'
import PersonCard from '../components/PersonCard'
import { Empty } from '../components/UI'

export default function Discover() {
  const [mode, setMode] = useState('recent')
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')
  const [interest, setInterest] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    discover(mode)
      .then(rows => { if (alive) setPeople(rows) })
      .catch(failure => {
        if (alive) {
          setPeople([])
          setError(failure.message)
        }
      })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [mode, reload])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()

    return people.filter(person =>
      (!country || person.country === country) &&
      (!interest || person.interests?.includes(interest)) &&
      (!term || `${person.name} ${person.bio}`.toLowerCase().includes(term)),
    )
  }, [people, search, country, interest])

  return (
    <section>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Explore</h1>
          <p className="mt-1 text-sm text-slate-400">Find your kind of people.</p>
        </div>
        <button className="btn-secondary" aria-label="Refresh profiles" disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={17} /></button>
      </header>

      <label className="relative mb-5 block">
        <Search className="absolute left-4 top-4 text-slate-400" size={19} />
        <input className="field rounded-2xl bg-white pl-12" aria-label="Search people" placeholder="Search people or bios..." value={search} onChange={event => setSearch(event.target.value)} />
      </label>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {[['recent', 'New faces'], ['random', 'Random'], ['online', 'Active now']].map(([value, label]) => (
          <button key={value} className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold ${mode === value ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</button>
        ))}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <select className="field text-sm" aria-label="Country filter" value={country} onChange={event => setCountry(event.target.value)}>
          <option value="">Anywhere in the world</option>
          {COUNTRIES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
        <select className="field text-sm" aria-label="Interest filter" value={interest} onChange={event => setInterest(event.target.value)}>
          <option value="">Any interest</option>
          {INTERESTS.map(item => <option key={item}>{item}</option>)}
        </select>
      </div>

      {(search || country || interest) && (
        <button className="mb-4 text-xs font-semibold text-brand-700" onClick={() => { setSearch(''); setCountry(''); setInterest('') }}>Clear filters</button>
      )}

      {error && <p className="error mb-4" role="alert">{error}</p>}
      {loading ? <p className="py-12 text-center text-sm text-slate-400" role="status">Finding people...</p> : (
        <>
          <p className="mb-4 text-xs text-slate-400">{visible.length} people in this selection{mode === 'online' && ' · Active in the last 90 seconds'}</p>
          {visible.length ? (
            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-3">{visible.map(person => <PersonCard key={person.id} profile={person} />)}</div>
          ) : !error ? <Empty title="No matches here yet" text="Try another selection, refresh or clear your filters." /> : null}
        </>
      )}
    </section>
  )
}