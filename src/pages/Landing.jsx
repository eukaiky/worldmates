import { Link, Navigate } from 'react-router-dom'
import { ArrowUpRight, Globe2, Heart, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/UI'

export default function Landing() {
  const { user, loading } = useAuth()

  if (!loading && user) return <Navigate to="/feed" replace />

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      <header className="flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <Link className="btn-secondary" to="/auth">Log in</Link>
      </header>

      <section className="grid items-center gap-12 py-14 sm:py-24 md:grid-cols-2">
        <div>
          <p className="mb-5 text-sm font-semibold text-brand-700">Your people might be anywhere.</p>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Different places.<br />
            Shared interests.<br />
            New friends.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-500">
            Share a little of your world.
            Find someone you click with.
            Start with a hello.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link className="btn" to="/auth?mode=register">Join Worldmates <ArrowUpRight size={18} /></Link>
            <Link className="text-sm font-semibold" to="/auth">Already here? Log in</Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-6 -z-10 rounded-full bg-brand-100 blur-3xl" />

          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <Logo />
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Preview</span>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3">
                <span className="avatar h-12 w-12"><Globe2 size={24} /></span>
                <div>
                  <p className="font-bold">Your profile</p>
                  <p className="text-xs text-slate-400">Your corner of the world</p>
                </div>
              </div>

              <div className="mt-5 flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 via-pink-50 to-orange-100">
                <span className="text-center text-5xl">🌍<br /><span className="text-xl font-bold">A world to meet.</span></span>
              </div>

              <div className="mt-4 flex gap-4"><Heart size={23} /><MessageCircle size={23} /></div>
              <p className="mt-3 text-sm">A photo, a thought, a conversation.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Music', 'Travel', 'Gaming'].map(item => <span className="chip" key={item}>{item}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Worldmates · Meet people beyond your borders.
      </footer>
    </main>
  )
}