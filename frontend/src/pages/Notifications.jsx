import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { usersAPI } from '../services/api'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

const TYPE_ICONS = {
  new_request:'📬', request_accepted:'✅', request_rejected:'❌',
  new_message:'💬', session_scheduled:'📅', session_reminder:'⏰',
  review_received:'⭐', request_cancelled:'🚫', request_completed:'🏆',
}

export default function Notifications() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => usersAPI.getNotifications({}).then(r => r.data),
  })

  const markAll = useMutation({
    mutationFn: () => usersAPI.markAllRead(),
    onSuccess: () => qc.invalidateQueries(['notifications', 'notifCount']),
  })

  const markOne = async (n) => {
    await usersAPI.markOneRead(n.id)
    qc.invalidateQueries(['notifications', 'notifCount'])
    if (n.link) navigate(n.link)
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {notifs.some(n => !n.is_read) && (
          <button onClick={() => markAll.mutate()} className="text-sm text-indigo-600 hover:underline">Mark all read</button>
        )}
      </div>

      {isLoading ? <Spinner /> : notifs.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" desc="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifs.map(n => (
            <div key={n.id} onClick={() => markOne(n)}
              className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${!n.is_read ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})}</p>
                </div>
                {!n.is_read && <span className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
