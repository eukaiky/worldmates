import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { createPost, discover, getFeed, getProfile } from '../lib/api'
import { characterCount } from '../data/worldmates'
import { Avatar, CountryBadge, Empty } from '../components/UI'
import PostCard from '../components/PostCard'

export default function Feed() {
  const { user } = useAuth()
  const [mode, setMode] = useState('all')
  const [posts, setPosts] = useState([])
  const [people, setPeople] = useState([])
  const [me, setMe] = useState(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')

    Promise.allSettled([getFeed(mode), getProfile(user.id), discover('recent')])
      .then(([feed, profile, suggestions]) => {
        if (!alive) return

        if (feed.status === 'fulfilled') {
          setPosts(feed.value)
          setHasMore(feed.value.length === 20)
        } else {
          setPosts([])
          setError(feed.reason.message)
        }

        if (profile.status === 'fulfilled') setMe(profile.value)
        if (suggestions.status === 'fulfilled') setPeople(suggestions.value.slice(0, 8))
      })
      .finally(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [mode, reload, user.id])

  async function publish(event) {
    event.preventDefault()
    if (posting || !body.trim()) return
    setPosting(true)
    setError('')

    try {
      await createPost(user.id, body)
      setBody('')
      setReload(value => value + 1)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setPosting(false)
    }
  }

  async function more() {
    if (loadingMore || !posts.length) return
    setLoadingMore(true)

    try {
      const next = await getFeed(mode, posts[posts.length - 1])
      setPosts(current => [...current, ...next.filter(post => !current.some(item => item.id === post.id))])
      setHasMore(next.length === 20)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="feed-grid">
      <div className="min-w-0 space-y-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">Home</h1>
          <button className="btn-secondary" aria-label="Refresh feed" disabled={loading} onClick={() => setReload(value => value + 1)}>
            <RefreshCw size={17} />
          </button>
        </header>

        {people.length > 0 && (
          <section className="card">
            <h2 className="mb-4 text-xs font-semibold text-slate-400">NEW FACES</h2>
            <div className="hide-scroll flex gap-5 overflow-x-auto pb-1">
              {people.map(person => (
                <Link className="flex w-16 shrink-0 flex-col items-center gap-2" key={person.id} to={`/people/${person.id}`}>
                  <span className="story-ring"><Avatar profile={person} size={54} /></span>
                  <span className="w-full truncate text-center text-xs font-medium">{person.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <form className="card" onSubmit={publish}>
          <div className="flex gap-3">
            <Avatar profile={me} />
            <textarea
              className="min-h-24 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
              aria-label="Write a post"
              placeholder="What's happening in your corner of the world?"
              value={body}
              disabled={posting}
              onChange={event => {
                if (characterCount(event.target.value) <= 500) setBody(event.target.value)
              }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs text-slate-400">{characterCount(body)}/500</span>
            <button className="btn px-5 py-2" disabled={posting || !body.trim()}>{posting ? 'Posting...' : 'Post'}</button>
          </div>
        </form>

        <div className="flex border-b border-slate-200">
          {[['all', 'World feed'], ['following', 'Following']].map(([value, label]) => (
            <button className={`flex-1 border-b-2 py-4 text-sm font-bold ${mode === value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-400'}`} key={value} onClick={() => setMode(value)}>
              {label}
            </button>
          ))}
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        {loading && <p className="py-8 text-center text-sm text-slate-400" role="status">Loading your feed...</p>}

        {!loading && posts.map(post => (
          <PostCard key={post.id} post={post} onDelete={id => setPosts(current => current.filter(item => item.id !== id))} />
        ))}

        {!loading && !error && !posts.length && (
          <Empty title={mode === 'following' ? 'Your circle starts here' : 'Be the first to post'} text={mode === 'following' ? 'Follow people in Explore to see their posts here.' : 'Share a thought, a question or something from your day.'}>
            <Link className="btn-secondary" to="/discover">Explore people</Link>
          </Empty>
        )}

        {!loading && hasMore && (
          <button className="btn-secondary w-full" disabled={loadingMore} onClick={more}>{loadingMore ? 'Loading...' : 'More posts'}</button>
        )}
      </div>

      <aside className="feed-aside">
        {me && (
          <Link className="mb-8 flex items-center gap-3" to={`/people/${user.id}`}>
            <Avatar profile={me} size={52} />
            <span><strong className="block text-sm">{me.name}</strong><CountryBadge country={me.country} /></span>
          </Link>
        )}

        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-500">People to meet</h2>
          <Link className="text-xs font-bold text-brand-700" to="/discover">See all</Link>
        </div>

        <div className="space-y-5">
          {people.slice(0, 5).map(person => (
            <Link className="flex items-center gap-3" key={person.id} to={`/people/${person.id}`}>
              <Avatar profile={person} size={38} />
              <span className="min-w-0"><strong className="block truncate text-xs">{person.name}</strong><CountryBadge country={person.country} /></span>
            </Link>
          ))}
        </div>

        <p className="mt-10 text-xs leading-relaxed text-slate-400">Worldmates<br />People beyond your borders.</p>
      </aside>
    </div>
  )
}