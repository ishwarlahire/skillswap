import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usersAPI, swapsAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import StarRating from '../components/ui/StarRating'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/ui/Toast'

const CATEGORIES = ['All', 'Programming', 'Design', 'Data Science', 'Marketing', 'Language', 'Music', 'Finance']

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="flex gap-1 mt-2">
            {[1,2,3].map(i => <div key={i} className="h-5 w-14 bg-gray-100 rounded-full" />)}
          </div>
        </div>
      </div>
    </div>
  )
}

function UserCard({ user, onRequest, myId }) {
  const isMe = user.id === myId
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar name={user.full_name || user.username} url={user.avatar_url} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/users/${user.id}`}
                className="font-semibold text-gray-900 hover:text-indigo-600 text-sm block truncate">
                {user.full_name || user.username}
              </Link>
              {user.location && <p className="text-xs text-gray-400">{user.location}</p>}
            </div>
            {user.rating > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-yellow-500 text-sm">★</span>
                <span className="text-xs text-gray-600 font-medium">{user.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {user.experience_level && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full mt-1.5 inline-block">
              {user.experience_level}
            </span>
          )}

          {user.bio && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{user.bio}</p>}

          <div className="flex flex-wrap gap-1 mt-2">
            {user.skills_offered?.slice(0, 4).map(s => (
              <span key={s.id} className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">✓ {s.name}</span>
            ))}
            {user.skills_offered?.length > 4 && (
              <span className="text-xs text-gray-400">+{user.skills_offered.length - 4} more</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {user.skills_wanted?.slice(0, 3).map(s => (
              <span key={s.id} className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full">↗ {s.name}</span>
            ))}
          </div>

          {user.availability && (
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <span>🕐</span> {user.availability}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={() => onRequest(user)}
          disabled={isMe}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs py-2 rounded-lg font-medium transition-colors">
          {isMe ? 'You' : 'Request Swap'}
        </button>
        <Link to={`/users/${user.id}`}
          className="border border-gray-200 text-gray-600 text-xs px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          Profile
        </Link>
      </div>
    </div>
  )
}

export default function Explore() {
  const [skill, setSkill]       = useState('')
  const [location, setLoc]      = useState('')
  const [modal, setModal]       = useState(null)
  const [msg, setMsg]           = useState('')
  const qc = useQueryClient()
  const toast = useToast()

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => usersAPI.getMe().then(r => r.data) })
  const { data: users = [], isLoading, isFetching } = useQuery({
    queryKey: ['users', skill, location],
    queryFn: () => usersAPI.searchUsers({
      skill: skill || undefined,
      location: location || undefined,
    }).then(r => r.data),
    placeholderData: [],
  })

  const sendSwap = useMutation({
    mutationFn: (d) => swapsAPI.create(d),
    onSuccess: () => {
      setModal(null); setMsg('')
      qc.invalidateQueries(['swaps'])
      toast.success('Swap request sent! They will be notified.')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error sending request'),
  })

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <ToastContainer toasts={toast.toasts} />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Explore Skills</h1>
        <p className="text-sm text-gray-500">Find people offering what you want to learn</p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={skill} onChange={e => setSkill(e.target.value)}
            placeholder="Search by skill (React, Python, Figma...)"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        <div className="relative w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📍</span>
          <input value={location} onChange={e => setLoc(e.target.value)}
            placeholder="Location"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
        </div>
        {(skill || location) && (
          <button onClick={() => { setSkill(''); setLoc('') }}
            className="border border-gray-200 text-gray-500 px-3 py-2.5 rounded-lg text-sm hover:bg-gray-50">
            Clear
          </button>
        )}
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="text-xs text-gray-400 mb-4">
          {isFetching ? 'Searching...' : `${users.length} user${users.length !== 1 ? 's' : ''} found`}
        </p>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold text-gray-700 mb-1">No users found</p>
          <p className="text-sm text-gray-400">Try different keywords or clear filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {users.map(u => (
            <UserCard key={u.id} user={u} myId={me?.id} onRequest={setModal} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="font-bold text-gray-900 text-lg mb-1">Send Swap Request</h2>
            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <Avatar name={modal.full_name || modal.username} size="sm" />
              <div>
                <p className="text-sm font-medium text-gray-800">{modal.full_name || modal.username}</p>
                {modal.location && <p className="text-xs text-gray-400">{modal.location}</p>}
              </div>
            </div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Message (optional)</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)}
              placeholder="Hi! I can teach you Python and would love to learn React from you..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:border-indigo-400 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { setModal(null); setMsg('') }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => sendSwap.mutate({ receiver_id: modal.id, message: msg.trim() || undefined })}
                disabled={sendSwap.isPending}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
                {sendSwap.isPending ? 'Sending...' : 'Send Request ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
