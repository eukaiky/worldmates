import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Compass, Home, LogOut, MessageCircle, Settings2, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getProfile } from '../lib/api'
import { Avatar, Logo } from './UI'

export default function Layout() {
  const { user } = useAuth()
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        const profile = await getProfile(user.id)
        if (alive) setMe(profile)
      } catch {
        // A navegação continua disponível se o avatar não carregar.
      }
    }

    void load()
    window.addEventListener('worldmates:profile-updated', load)

    return () => {
      alive = false
      window.removeEventListener('worldmates:profile-updated', load)
    }
  }, [user.id])

  const links = [
    ['/feed', 'Home', Home],
    ['/discover', 'Explore', Compass],
    ['/messages', 'Messages', MessageCircle],
    [`/people/${user.id}`, 'Profile', UserRound],
  ]

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
  }

  function navigation() {
    return links.map(([to, label, Icon]) => (
      <NavLink key={to} to={to} className={({ isActive }) => `social-nav ${isActive ? 'active' : ''}`}>
        <Icon size={23} strokeWidth={1.8} />
        <span>{label}</span>
      </NavLink>
    ))
  }

  return (
    <div>
      <aside className="social-sidebar">
        <Link className="mb-10 px-2" to="/feed"><Logo /></Link>
        <nav className="space-y-2" aria-label="Main navigation">{navigation()}</nav>
        <NavLink className="social-nav mt-2" to="/settings/profile"><Settings2 size={23} /> Edit profile</NavLink>

        <div className="mt-auto">
          {me && (
            <Link className="mb-5 flex items-center gap-3 px-3" to={`/people/${user.id}`}>
              <Avatar profile={me} />
              <span className="min-w-0">
                <strong className="block truncate text-sm">{me.name}</strong>
                <span className="text-xs text-slate-400">{me.plan === 'plus' ? 'Plus' : 'Worldmate'}</span>
              </span>
            </Link>
          )}
          <button className="social-nav w-full" onClick={logout}><LogOut size={21} /> Sign out</button>
        </div>
      </aside>

      <div className="social-workspace">
        <header className="social-topbar">
          <div className="social-topbar-inner">
            <Link to="/feed"><Logo /></Link>
            <div className="flex items-center gap-4">
              <Link aria-label="Edit profile" to="/settings/profile"><Settings2 size={21} /></Link>
              <button aria-label="Sign out" onClick={logout}><LogOut size={21} /></button>
            </div>
          </div>
        </header>

        <main className="social-main">
          {error && <p className="error mb-4" role="alert">{error}</p>}
          <Outlet />
        </main>
      </div>

      <nav className="social-bottom" aria-label="Mobile navigation">{navigation()}</nav>
    </div>
  )
}