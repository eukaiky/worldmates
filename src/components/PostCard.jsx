import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { addComment, deletePost, getComments, setLike } from '../lib/api'
import { timeAgo } from '../data/worldmates'
import { Avatar, CountryBadge } from './UI'

export default function PostCard({ post, onDelete }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(post.liked)
  const [likes, setLikes] = useState(Number(post.likes))
  const [commentCount, setCommentCount] = useState(Number(post.comments))
  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [busyLike, setBusyLike] = useState(false)
  const [busyComment, setBusyComment] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function like() {
    if (busyLike) return
    setBusyLike(true)
    setError('')

    try {
      const count = await setLike(post.id, user.id, !liked)
      setLiked(!liked)
      setLikes(count)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusyLike(false)
    }
  }

  async function toggleComments() {
    if (open) {
      setOpen(false)
      return
    }

    setOpen(true)
    setLoadingComments(true)
    setError('')

    try {
      setComments(await getComments(post.id))
    } catch (failure) {
      setError(failure.message)
    } finally {
      setLoadingComments(false)
    }
  }

  async function reply(event) {
    event.preventDefault()
    if (!body.trim() || busyComment) return
    setBusyComment(true)
    setError('')

    try {
      await addComment(post.id, user.id, body)
      setComments(await getComments(post.id))
      setCommentCount(value => value + 1)
      setBody('')
    } catch (failure) {
      setError(failure.message)
    } finally {
      setBusyComment(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this post?')) return
    setDeleting(true)

    try {
      await deletePost(post.id)
      onDelete?.(post.id)
    } catch (failure) {
      setError(failure.message)
      setDeleting(false)
    }
  }

  return (
    <article className="card">
      <header className="flex items-start gap-3">
        <Link to={`/people/${post.author.id}`}><Avatar profile={post.author} /></Link>

        <div className="min-w-0 flex-1">
          <Link className="block truncate text-sm font-bold" to={`/people/${post.author.id}`}>{post.author.name}</Link>
          <CountryBadge country={post.author.country} />
        </div>

        <time className="shrink-0 text-xs text-slate-400" dateTime={post.created_at}>{timeAgo(post.created_at)}</time>

        {post.author.id === user.id && (
          <button aria-label="Delete post" className="text-slate-400 hover:text-red-600" disabled={deleting} onClick={remove}>
            <Trash2 size={16} />
          </button>
        )}
      </header>

      <p className="post-body my-5 text-[15px]">{post.body}</p>

      <div className="flex items-center gap-6 border-t border-slate-100 pt-4">
        <button className={`flex items-center gap-2 text-sm ${liked ? 'text-pink-600' : 'text-slate-500'}`} aria-pressed={liked} disabled={busyLike} onClick={like}>
          <Heart size={21} fill={liked ? 'currentColor' : 'none'} />
          {likes}
        </button>

        <button className="flex items-center gap-2 text-sm text-slate-500" aria-expanded={open} onClick={toggleComments}>
          <MessageCircle size={21} /> {commentCount}
        </button>
      </div>

      {error && <p className="error mt-4" role="alert">{error}</p>}

      {open && (
        <section className="mt-5 border-t border-slate-100 pt-5">
          {loadingComments ? <p className="text-sm text-slate-400" role="status">Loading replies...</p> : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div className="flex gap-3" key={comment.id}>
                  <Link to={`/people/${comment.author.id}`}><Avatar profile={comment.author} size={30} /></Link>
                  <div className="min-w-0">
                    <Link className="text-xs font-bold" to={`/people/${comment.author.id}`}>{comment.author.name}</Link>
                    <p className="post-body text-sm text-slate-600">{comment.body}</p>
                  </div>
                </div>
              ))}
              {!comments.length && <p className="text-sm text-slate-400">Start the conversation.</p>}
              {comments.length === 50 && <p className="text-xs text-slate-400">Showing the 50 most recent replies.</p>}
            </div>
          )}

          <form className="mt-4 flex gap-2" onSubmit={reply}>
            <input className="field min-w-0 flex-1 text-sm" aria-label="Write a reply" placeholder="Add a reply..." maxLength={500} value={body} disabled={busyComment} onChange={event => setBody(event.target.value)} />
            <button className="btn px-3" aria-label="Send reply" disabled={busyComment || !body.trim()}><Send size={17} /></button>
          </form>
        </section>
      )}
    </article>
  )
}