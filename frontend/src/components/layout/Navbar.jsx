import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { usersAPI } from '../../services/api'

const NAV = [
  { to: '/dashboard',  label: 'Dashboard' },
  { to: '/explore',    label: 'Explore'   },
  { to: '/swaps',      label: 'Swaps'     },
  { to: '/chat',       label: 'Chat'      },
  { to: '/sessions',   label: 'Sessions'  },
  { to: '/profile',    label: 'Profile'   },
]

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [unread, setUnread]     = useState(0)
  const [showNotif, setShowNotif] = useState(false)
  const [notifs, setNotifs]     = useState([])

  useEffect(() => {
    const fetch = async () => {
      try {
        const c = await usersAPI.getUnreadCount()
        setUnread(c.data.unread)
      } catch {}
    }
    fetch()
    const t = setInterval(fetch, 30000)
    return () => clearInterval(t)
  }, [])

  const openNotifs = async () => {
    setShowNotif(s => !s)
    try {
      const r = await usersAPI.getNotifications({ unread_only: false })
      setNotifs(r.data)
    } catch {}
  }

  const markAllRead = async () => {
    await usersAPI.markAllRead()
    setUnread(0)
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })))
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="font-bold text-indigo-600 hidden sm:block">SkillSwap</span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV.map(({ to, label }) => (
            <Link key={to} to={to}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                pathname.startsWith(to) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >{label}</Link>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Notification bell */}
          <div className="relative">
            <button onClick={openNotifs} className="relative p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="font-semibold text-sm">Notifications</span>
                  <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No notifications</p>}
                  {notifs.map(n => (
                    <div key={n.id} className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer ${!n.is_read ? 'bg-indigo-50/40' : ''}`}
                      onClick={async () => { await usersAPI.markOneRead(n.id); if (n.link) navigate(n.link); setShowNotif(false) }}>
                      <p className="text-sm font-medium text-gray-800">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{n.body}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => { logout(); navigate('/login') }}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors">
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
