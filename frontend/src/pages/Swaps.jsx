import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { swapsAPI, usersAPI } from '../services/api'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/ui/Toast'

const TABS = [
  { key: 'all',      label: 'All'      },
  { key: 'incoming', label: 'Incoming' },
  { key: 'sent',     label: 'Sent'     },
]

function SwapCard({ swap, myId, onAction, loading }) {
  const isReceiver = swap.receiver_id === myId
  const other      = isReceiver ? swap.sender : swap.receiver
  const partnerId  = isReceiver ? swap.sender_id : swap.receiver_id

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar name={other?.full_name || other?.username} url={other?.avatar_url} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/users/${partnerId}`}
                  className="font-semibold text-gray-900 hover:text-indigo-600 text-sm">
                  {other?.full_name || other?.username}
                </Link>
                {other?.location && (
                  <span className="text-gray-400 text-xs">{other.location}</span>
                )}
                <span className="text-xs text-gray-300">
                  {isReceiver ? '← from them' : '→ you sent'}
                </span>
              </div>
            </div>
            <Badge status={swap.status} />
          </div>

          {swap.message && (
            <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">
              "{swap.message}"
            </p>
          )}

          {/* Partner skills */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {other?.skills_offered?.slice(0, 4).map(s => (
              <span key={s.id} className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                {s.name}
              </span>
            ))}
          </div>

          <p className="text-xs text-gray-300 mt-2">
            {new Date(swap.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 space-y-2">

        {/* Pending — receiver can accept/decline */}
        {swap.status === 'pending' && isReceiver && (
          <div className="flex gap-2">
            <button
              onClick={() => onAction(swap.id, 'accepted')}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              ✓ Accept
            </button>
            <button
              onClick={() => onAction(swap.id, 'rejected')}
              disabled={loading}
              className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              ✕ Decline
            </button>
          </div>
        )}

        {/* Pending — sender can cancel */}
        {swap.status === 'pending' && !isReceiver && (
          <button
            onClick={() => onAction(swap.id, 'cancelled')}
            disabled={loading}
            className="w-full border border-red-200 text-red-600 text-sm py-2 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            Cancel Request
          </button>
        )}

        {/* Accepted — chat, schedule, complete */}
        {swap.status === 'accepted' && (
          <div className="flex gap-2 flex-wrap">
            <Link
              to={`/chat?user=${partnerId}`}
              className="flex-1 min-w-24 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 rounded-lg text-center font-medium transition-colors"
            >
              💬 Open Chat
            </Link>
            <Link
              to={`/sessions?swap=${swap.id}`}
              className="flex-1 min-w-24 bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 rounded-lg text-center font-medium transition-colors"
            >
              📅 Schedule
            </Link>
            <button
              onClick={() => onAction(swap.id, 'completed')}
              disabled={loading}
              className="flex-1 min-w-24 bg-emerald-500 hover:bg-emerald-600 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50"
            >
              ✅ Complete
            </button>
          </div>
        )}

        {/* Accepted info banner */}
        {swap.status === 'accepted' && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-xs text-indigo-700 flex items-center gap-2">
            <span>🎉</span>
            <span>Swap accepted! Click <strong>Open Chat</strong> to start messaging.</span>
          </div>
        )}

        {/* Completed — leave review */}
        {swap.status === 'completed' && (
          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-700">
            ✅ Completed! <Link to="/sessions" className="underline font-medium">Leave a review →</Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Swaps() {
  const location = useLocation()
  // If navigated to /swaps/incoming, default to incoming tab
  const defaultTab = location.pathname.includes('incoming') ? 'incoming' : 'all'
  const [tab, setTab] = useState(defaultTab)
  const qc    = useQueryClient()
  const toast = useToast()

  const { data: me }               = useQuery({ queryKey: ['me'],              queryFn: () => usersAPI.getMe().then(r => r.data) })
  const { data: all = [],      isLoading: la } = useQuery({ queryKey: ['swaps','all'],      enabled: tab==='all',      queryFn: () => swapsAPI.getAll().then(r => r.data) })
  const { data: incoming = [], isLoading: li } = useQuery({ queryKey: ['swaps','incoming'], enabled: tab==='incoming', queryFn: () => swapsAPI.getIncoming().then(r => r.data) })
  const { data: sent = [],     isLoading: ls } = useQuery({ queryKey: ['swaps','sent'],     enabled: tab==='sent',     queryFn: () => swapsAPI.getSent().then(r => r.data) })

  const update = useMutation({
    mutationFn: ({ id, status }) => swapsAPI.update(id, { status }),
    onSuccess: (res, vars) => {
      // Invalidate all swap queries + conversations (for chat)
      qc.invalidateQueries(['swaps'])
      qc.invalidateQueries(['conversations'])
      qc.invalidateQueries(['notifCount'])

      const msgs = {
        accepted:  '✅ Swap accepted! You can now chat.',
        rejected:  'Request declined.',
        cancelled: 'Request cancelled.',
        completed: '🏆 Swap marked as completed!',
      }
      toast.success(msgs[vars.status] || `Status: ${vars.status}`)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Something went wrong'),
  })

  const swaps   = tab === 'all' ? all : tab === 'incoming' ? incoming : sent
  const loading = (tab === 'all' ? la : tab === 'incoming' ? li : ls) || update.isPending

  const pendingIncoming = (incoming.length || 0)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <ToastContainer toasts={toast.toasts} />

      <h1 className="text-xl font-bold text-gray-900 mb-5">Swap Requests</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.key === 'incoming' && pendingIncoming > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-bold">
                {pendingIncoming}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && !swaps.length ? (
        <Spinner />
      ) : swaps.length === 0 ? (
        <EmptyState
          icon={tab === 'incoming' ? '📬' : '🔄'}
          title={tab === 'incoming' ? 'No incoming requests' : tab === 'sent' ? 'No sent requests' : 'No swap requests'}
          desc={tab === 'incoming' ? 'When someone sends you a request, it appears here' : 'Find someone and send a swap request'}
          action={
            tab !== 'incoming' && (
              <Link to="/explore" className="inline-block mt-2 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
                Find Matches
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {swaps.map(s => (
            <SwapCard
              key={s.id}
              swap={s}
              myId={me?.id}
              loading={update.isPending}
              onAction={(id, status) => update.mutate({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
