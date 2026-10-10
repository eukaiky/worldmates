import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Grid3X3, Hand, MessageSquare, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  getFeed, getProfile, getProfileStats, sayHi, setFollow,
} from '../lib/api'
import { isOnline } from '../data/worldmates'
import { Avatar, CountryBadge, Empty } from '../components/UI'
import PostCard from '../components/PostCard'

export default function Profile() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('photos')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [moreBusy, setMoreBusy] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setProfile(null)
    setStats(null)
    setPosts([])

    Promise.allSettled([getProfile(id), getProfileStats(id, user.id), getFeed('all', null, id)])
      .then(([person, counts, feed]) => {
        if (!alive) return
        if (person.status === 'fulfilled') setProfile(person.value)
        else setError(person.reason.message)

        if (counts.status === 'fulfilled') setStats(counts.value)
        else setError(counts.reason.message)

        if (feed.status === 'fulfilled') {
          setPosts(feed.value)
          setHasMore(feed.value.length === 20)
        } else setError(feed.reason.message)
      })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [id, user.id, reload])

  async function follow() {
    if (busy || !stats) return
    setBusy(true)
    setError('')

    try {
      setStats(await setFollow(user.id, id, !stats.isFollowing))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  async function hello() {
    if (busy) return
    setBusy(true)
    setError('')

    try {
      navigate(`/messages/${await sayHi(id)}`)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusy(false)
    }
  }

  async function more() {
    if (!posts.length || moreBusy) return
    setMoreBusy(true)

    try {
      const rows = await getFeed('all', posts[posts.length - 1], id)
      setPosts(current => [...current, ...rows.filter(row => !current.some(post => post.id === row.id))])
      setHasMore(rows.length === 20)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setMoreBusy(false)
    }
  }

  if (loading) return <p role="status">Loading profile...</p>
  if (!profile) return <Empty title="Profile unavailable" text={error}><button className="btn" onClick={() => setReload(value => value + 1)}>Try again</button></Empty>

  return (
    <section className="mx-auto max-w-4xl">
      <Link className="text-xs text-slate-400" to="/discover">Back to Explore</Link>

      <header className="mb-8 mt-6">
        <div className="flex flex-wrap items-start gap-6 sm:gap-9">
          <Avatar profile={profile} size={110} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-words text-2xl font-extrabold">{profile.name}</h1>
              {isOnline(profile) && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">● Active</span>}
            </div>

            <div className="mt-2"><CountryBadge country={profile.country} /></div>

            {stats && (
              <div className="mt-5 flex flex-wrap gap-5 text-sm">
                <span><strong>{stats.posts}</strong> <span className="text-slate-400">posts</span></span>
                <span><strong>{stats.followers}</strong> <span className="text-slate-400">followers</span></span>
                <span><strong>{stats.following}</strong> <span className="text-slate-400">following</span></span>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {user.id === id ? <Link className="btn-secondary" to="/settings/profile"><Pencil size={15} /> Edit profile</Link> : (
                <>
                  <button className={stats?.isFollowing ? 'btn-secondary' : 'btn'} disabled={busy || !stats} onClick={follow}>{stats?.isFollowing ? 'Following' : 'Follow'}</button>
                  <button className="btn-secondary" disabled={busy} onClick={hello}><Hand size={16} /> Say Hi</button>
                </>
              )}
            </div>
          </div>
        </div>

        {profile.bio && <p className="post-body mt-6 max-w-xl text-sm text-slate-600">{profile.bio}</p>}

        <div className="mt-4 flex flex-wrap gap-2">{(profile.interests || []).map(item => <span className="chip" key={item}>{item}</span>)}</div>
      </header>

      {error && <p className="error mb-5" role="alert">{error}</p>}

      <nav className="mb-6 flex justify-center gap-10 border-y border-slate-200" aria-label="Profile content">
        {[['photos', 'Photos', Grid3X3], ['posts', 'Posts', MessageSquare]].map(([value, label, Icon]) => (
          <button key={value} className={`flex items-center gap-2 border-b-2 py-4 text-sm font-semibold ${tab === value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-400'}`} aria-pressed={tab === value} onClick={() => setTab(value)}><Icon size={17} /> {label}</button>
        ))}
      </nav>

      {tab === 'photos' ? (
        <>
          {profile.photoWarning && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{profile.photoWarning} <button className="underline" onClick={() => setReload(value => value + 1)}>Reload</button></p>}
          {profile.photos?.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {profile.photos.map(photo => (
                <a key={photo.slot} href={photo.url} target="_blank" rel="noopener noreferrer" aria-label="Open photo">
                  <img className="aspect-square w-full rounded-lg object-cover" src={photo.url} alt={`${profile.name}'s photo`} loading="lazy" />
                </a>
              ))}
            </div>
          ) : <Empty title="A little mystery for now" text="No photos have been shared yet.">{user.id === id && <Link className="btn-secondary" to="/settings/profile">Add photos</Link>}</Empty>}
        </>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          {posts.map(post => <PostCard key={post.id} post={post} onDelete={postId => {
            setPosts(current => current.filter(item => item.id !== postId))
            setStats(current => current ? { ...current, posts: Math.max(0, current.posts - 1) } : current)
          }} />)}
          {!posts.length && <Empty title="No posts yet" text={user.id === id ? 'Share your first thought from Home.' : 'Check back for a glimpse of their world.'}>{user.id === id && <Link className="btn-secondary" to="/feed">Write a post</Link>}</Empty>}
          {hasMore && <button className="btn-secondary w-full" disabled={moreBusy} onClick={more}>{moreBusy ? 'Loading...' : 'More posts'}</button>}
        </div>
      )}
    </section>
  )
}