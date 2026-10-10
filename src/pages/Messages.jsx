import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, RefreshCw, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getInbox, getMessages, sendMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { Avatar, CountryBadge, Empty } from '../components/UI'

function merge(previous, incoming) {
  const map = new Map(previous.map(message => [message.id, message]))
  incoming.forEach(message => map.set(message.id, message))

  return [...map.values()].sort((a, b) =>
    a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  )
}

export default function Messages() {
  const { id } = useParams()
  const { user } = useAuth()
  const [inbox, setInbox] = useState([])
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [body, setBody] = useState('')
  const [loadingInbox, setLoadingInbox] = useState(true)
  const [loadingChat, setLoadingChat] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [inboxError, setInboxError] = useState('')
  const [chatError, setChatError] = useState('')
  const [connection, setConnection] = useState('')
  const [reload, setReload] = useState(0)

  const activeId = useRef(id)
  const scroll = useRef(null)
  const nearBottom = useRef(true)
  const pending = useRef(null)
  activeId.current = id

  const selected = inbox.find(item => item.id === id)
  const visibleInbox = inbox.filter(item => item.person.name.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    let alive = true
    setLoadingInbox(true)
    setInboxError('')

    getInbox()
      .then(rows => { if (alive) setInbox(rows) })
      .catch(failure => { if (alive) setInboxError(failure.message) })
      .finally(() => { if (alive) setLoadingInbox(false) })

    return () => { alive = false }
  }, [user.id, reload])

  useEffect(() => {
    setMessages([])
    setBody('')
    setChatError('')
    setHasMore(false)
    setLoadingOlder(false)
    pending.current = null
    nearBottom.current = true
  }, [id])

  useEffect(() => {
    if (!id || !selected) return
    let alive = true
    setLoadingChat(true)
    setChatError('')

    getMessages(id)
      .then(result => {
        if (!alive) return
        setMessages(previous => merge(previous, result.messages))
        setHasMore(result.hasMore)
      })
      .catch(failure => { if (alive) setChatError(failure.message) })
      .finally(() => { if (alive) setLoadingChat(false) })

    return () => { alive = false }
  }, [id, selected?.id, reload])

  useEffect(() => {
    let alive = true

    const channel = supabase.channel(`social-messages:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (!alive) return

        if (payload.new.conversation_id === activeId.current) {
          setMessages(previous => merge(previous, [payload.new]))
        }

        setReload(value => value + 1)
      })
      .subscribe(status => {
        if (!alive) return

        if (status === 'SUBSCRIBED') {
          setConnection('')
          setReload(value => value + 1)
        } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
          setConnection('Live updates disconnected. Reload the page to reconnect.')
        }
      })

    return () => {
      alive = false
      void supabase.removeChannel(channel)
    }
  }, [user.id])

  useEffect(() => {
    if (nearBottom.current && scroll.current) {
      scroll.current.scrollTop = scroll.current.scrollHeight
    }
  }, [messages])

  async function earlier() {
    if (!messages.length || loadingOlder) return

    const requestedId = id
    const height = scroll.current?.scrollHeight || 0
    const top = scroll.current?.scrollTop || 0

    nearBottom.current = false
    setLoadingOlder(true)
    setChatError('')

    try {
      const result = await getMessages(id, messages[0])
      if (activeId.current !== requestedId) return

      setMessages(previous => merge(previous, result.messages))
      setHasMore(result.hasMore)

      requestAnimationFrame(() => {
        if (activeId.current === requestedId && scroll.current) {
          scroll.current.scrollTop = top + scroll.current.scrollHeight - height
        }
      })
    } catch (failure) {
      if (activeId.current === requestedId) setChatError(failure.message)
    } finally {
      if (activeId.current === requestedId) setLoadingOlder(false)
    }
  }

  async function send(event) {
    event.preventDefault()
    const text = body.trim()
    if (!text || sending || !selected) return

    const requestedId = id

    if (!pending.current || pending.current.body !== text || pending.current.id !== id) {
      pending.current = { body: text, id, clientId: crypto.randomUUID() }
    }

    const clientId = pending.current.clientId
    setSending(true)
    setChatError('')

    try {
      const message = await sendMessage(id, user.id, text, clientId)

      if (activeId.current === requestedId) {
        nearBottom.current = true
        setMessages(previous => merge(previous, [message]))
        setBody('')
        pending.current = null
      }

      setReload(value => value + 1)
    } catch (failure) {
      if (activeId.current === requestedId) setChatError(failure.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid h-[calc(100dvh-190px)] min-h-[440px] md:grid-cols-[280px_1fr]">
        <aside className={`border-r border-slate-100 ${id ? 'hidden md:block' : ''}`}>
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-extrabold">Messages</h1>
              <button aria-label="Refresh inbox" onClick={() => setReload(value => value + 1)}><RefreshCw size={17} /></button>
            </div>
            <input className="field py-2 text-sm" aria-label="Search conversations" placeholder="Search conversations" value={search} onChange={event => setSearch(event.target.value)} />
          </div>

          {loadingInbox && !inbox.length && <p className="px-5 text-sm text-slate-400" role="status">Loading...</p>}
          {inboxError && <p className="error mx-4" role="alert">{inboxError}</p>}

          <div className="max-h-[calc(100%-120px)] space-y-1 overflow-y-auto px-2 pb-4">
            {visibleInbox.map(item => (
              <Link className={`flex items-center gap-3 rounded-xl p-3 ${item.id === id ? 'bg-brand-50' : 'hover:bg-slate-50'}`} key={item.id} to={`/messages/${item.id}`}>
                <Avatar profile={item.person} size={46} />
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{item.person.name}</strong>
                  <p className="mt-1 truncate text-xs text-slate-400">{item.last_message || 'Say something friendly'}</p>
                </div>
              </Link>
            ))}
          </div>

          {!loadingInbox && !inboxError && !visibleInbox.length && (
            <p className="px-5 py-5 text-sm text-slate-400">{search ? 'No conversations found.' : 'Find someone in Explore and say Hi.'}</p>
          )}
        </aside>

        <div className={`flex min-h-0 flex-col ${!id ? 'hidden md:flex' : ''}`}>
          {!id ? (
            <div className="m-auto text-center">
              <MessageCircle size={42} className="mx-auto mb-4 text-brand-600" />
              <h2 className="text-xl font-bold">A hello goes a long way.</h2>
              <p className="mt-2 text-sm text-slate-400">Choose a conversation.</p>
            </div>
          ) : !selected ? (
            <div className="m-auto p-5">
              <Empty title={loadingInbox ? 'Opening chat...' : 'Chat unavailable'} text={inboxError || 'Choose another conversation.'}>
                <Link className="btn-secondary" to="/messages">Back to messages</Link>
              </Empty>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <Link className="md:hidden" to="/messages" aria-label="Back"><ArrowLeft size={20} /></Link>
                <Link to={`/people/${selected.person.id}`}><Avatar profile={selected.person} size={38} /></Link>
                <div className="min-w-0">
                  <Link className="block truncate text-sm font-bold" to={`/people/${selected.person.id}`}>{selected.person.name}</Link>
                  <CountryBadge country={selected.person.country} />
                </div>
              </header>

              {connection && <p className="px-5 pt-3 text-xs text-amber-700" role="status">{connection}</p>}
              {chatError && <p className="error mx-4 mt-3" role="alert">{chatError}</p>}

              <div
                ref={scroll}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/40 px-5 py-5"
                aria-label="Conversation messages"
                onScroll={event => {
                  const area = event.currentTarget
                  nearBottom.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80
                }}
              >
                {hasMore && <button className="btn-secondary mx-auto block text-xs" disabled={loadingOlder} onClick={earlier}>{loadingOlder ? 'Loading...' : 'Earlier messages'}</button>}
                {loadingChat && !messages.length && <p className="text-sm text-slate-400" role="status">Loading messages...</p>}

                {!loadingChat && !messages.length && !chatError && (
                  <div className="py-12 text-center">
                    <Avatar profile={selected.person} size={70} />
                    <h2 className="mt-4 font-bold">Say Hi to {selected.person.name}</h2>
                    <p className="mt-2 text-xs text-slate-400">Ask about something you have in common.</p>
                    <button className="btn-secondary mt-4 text-xs" onClick={() => setBody('Hey! How is your day going?')}>Hey! How is your day going?</button>
                  </div>
                )}

                {messages.map(message => {
                  const mine = message.sender_id === user.id

                  return (
                    <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${mine ? 'bg-brand-700 text-white' : 'border border-slate-200 bg-white'}`}>
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <time dateTime={message.created_at} className={`mt-2 block text-right text-[10px] ${mine ? 'text-white/60' : 'text-slate-400'}`}>
                          {new Date(message.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                    </div>
                  )
                })}
              </div>

              <form className="flex gap-2 border-t border-slate-100 p-4" onSubmit={send}>
                <input className="field min-w-0 flex-1 rounded-full text-sm" aria-label="Your message" placeholder="Message..." maxLength={2000} disabled={sending} value={body} onChange={event => setBody(event.target.value)} />
                <button className="btn rounded-full px-4" aria-label="Send message" disabled={sending || !body.trim()}><Send size={19} /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}