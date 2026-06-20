import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersAPI, swapsAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import StarRating from '../components/ui/StarRating'
import Spinner from '../components/ui/Spinner'

function StatCard({ label, value, color, to, icon, loading }) {
  const inner = (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${to ? 'hover:shadow-sm cursor-pointer' : ''} transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {loading
          ? <div className="h-7 w-10 bg-gray-100 rounded animate-pulse" />
          : <span className={`text-2xl font-bold ${color}`}>{value ?? '—'}</span>
        }
      </div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

export default function Dashboard() {
  const qc = useQueryClient()

  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersAPI.getMe().then(r => r.data),
    staleTime: 60_000,
  })
  const { data: swaps   = [] } = useQuery({
    queryKey: ['swaps'],
    queryFn: () => swapsAPI.getAll().then(r => r.data),
    staleTime: 30_000,
  })
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: () => swapsAPI.getMySessions().then(r => r.data),
    staleTime: 30_000,
  })
  const { data: notifData } = useQuery({
    queryKey: ['notifCount'],
    queryFn: () => usersAPI.getUnreadCount().then(r => r.data),
    refetchInterval: 30_000,
  })

  if (loadingProfile) return <Spinner />

  const incoming  = swaps.filter(s => s.status === 'pending'   && s.receiver_id === profile?.id)
  const active    = swaps.filter(s => s.status === 'accepted')
  const completed = swaps.filter(s => s.status === 'completed')
  const upcoming  = sessions.filter(s => s.status === 'scheduled' || s.status === 'ongoing')
  const initials  = profile?.full_name || profile?.username || 'U'

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-5">

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <Avatar name={initials} url={profile?.avatar_url} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{profile?.full_name || profile?.username}</h1>
            <p className="text-sm text-gray-500">{profile?.location || 'No location set'}</p>
            {profile?.bio && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{profile.bio}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {profile?.rating > 0 && (
                <span className="flex items-center gap-1 text-sm">
                  <StarRating value={Math.round(profile.rating)} readonly />
                  <span className="text-gray-500 text-xs">{profile.rating.toFixed(1)} ({profile.total_reviews})</span>
                </span>
              )}
              {profile?.experience_level && (
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{profile.experience_level}</span>
              )}
              <span className="text-xs text-gray-400">Joined {new Date(profile?.created_at).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span>
            </div>
            <div className="flex gap-3 mt-2">
              {profile?.github_url    && <a href={profile.github_url}    target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">GitHub ↗</a>}
              {profile?.linkedin_url  && <a href={profile.linkedin_url}  target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">LinkedIn ↗</a>}
              {profile?.portfolio_url && <a href={profile.portfolio_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline">Portfolio ↗</a>}
            </div>
          </div>
          <Link to="/profile" className="text-sm text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 flex-shrink-0 transition-colors">
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="🔔" label="Notifications"    value={notifData?.unread || 0}   color="text-red-500"    to="/notifications" />
        <StatCard icon="📬" label="Incoming Requests" value={incoming.length}           color="text-yellow-600" to="/swaps" />
        <StatCard icon="🔄" label="Active Swaps"      value={active.length}             color="text-indigo-600" to="/swaps" />
        <StatCard icon="✅" label="Completed"          value={completed.length}          color="text-green-600"  to="/swaps" />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon="📅" label="Upcoming Sessions"  value={upcoming.length}                                color="text-blue-600"   to="/sessions" />
        <StatCard icon="🏆" label="Sessions Done"       value={profile?.sessions_completed ?? 0}              color="text-orange-600" />
        <StatCard icon="⏱️" label="Hours Taught"        value={`${(profile?.total_hours_taught  || 0).toFixed(1)}h`} color="text-purple-600" />
        <StatCard icon="📚" label="Hours Learned"       value={`${(profile?.total_hours_learned || 0).toFixed(1)}h`} color="text-teal-600"   />
      </div>

      {/* Incoming requests alert */}
      {incoming.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-800 flex items-center gap-2">
              <span>📬</span>
              {incoming.length} Incoming Request{incoming.length > 1 ? 's' : ''}
            </p>
            <Link to="/swaps" className="text-xs text-indigo-600 hover:underline font-medium">View all →</Link>
          </div>
          <div className="space-y-2">
            {incoming.slice(0, 3).map(s => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-yellow-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={s.sender?.full_name || s.sender?.username} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.sender?.full_name || s.sender?.username}</p>
                    {s.message && <p className="text-xs text-gray-400 truncate">{s.message}</p>}
                  </div>
                </div>
                <Link to="/swaps" className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 ml-2 flex-shrink-0">
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming sessions */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-800">📅 Upcoming Sessions</p>
            <Link to="/sessions" className="text-xs text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {upcoming.slice(0, 3).map(s => {
              const partner = s.host_id === profile?.id ? s.guest : s.host
              return (
                <div key={s.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <Avatar name={partner?.full_name || partner?.username} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{s.title}</p>
                      <p className="text-xs text-gray-500">
                        with {partner?.full_name || partner?.username} ·{' '}
                        {new Date(s.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  {s.meeting_url && (
                    <a href={s.meeting_url} target="_blank" rel="noreferrer"
                      className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex-shrink-0">
                      Join
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Skills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-800 text-sm">Skills I Offer ({profile?.skills_offered?.length || 0})</p>
            <Link to="/profile" className="text-xs text-indigo-600 hover:underline">+ Add</Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile?.skills_offered?.length
              ? profile.skills_offered.map(s => (
                  <span key={s.id} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-100">
                    {s.name}
                  </span>
                ))
              : <p className="text-xs text-gray-400">No skills added yet. <Link to="/profile" className="text-indigo-600 hover:underline">Add some →</Link></p>
            }
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-gray-800 text-sm">Skills I Want ({profile?.skills_wanted?.length || 0})</p>
            <Link to="/profile" className="text-xs text-indigo-600 hover:underline">+ Add</Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile?.skills_wanted?.length
              ? profile.skills_wanted.map(s => (
                  <span key={s.id} className="bg-orange-50 text-orange-700 text-xs px-2.5 py-1 rounded-full border border-orange-100">
                    {s.name}
                  </span>
                ))
              : <p className="text-xs text-gray-400">No skills added yet. <Link to="/profile" className="text-indigo-600 hover:underline">Add some →</Link></p>
            }
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link to="/explore"
          className="flex-1 min-w-36 bg-indigo-600 hover:bg-indigo-700 text-white text-sm text-center py-3 rounded-xl font-semibold transition-colors">
          🔍 Find Matches
        </Link>
        <Link to="/swaps"
          className="flex-1 min-w-36 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm text-center py-3 rounded-xl font-medium transition-colors">
          🔄 My Swaps {incoming.length > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{incoming.length}</span>}
        </Link>
        <Link to="/chat"
          className="flex-1 min-w-36 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm text-center py-3 rounded-xl font-medium transition-colors">
          💬 Messages
        </Link>
      </div>
    </div>
  )
}
