import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { swapsAPI, usersAPI } from '../services/api'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/ui/Toast'

const MEETING_OPTIONS = [
  { value: 'google_meet', label: 'Google Meet',       icon: '🟢', placeholder: 'https://meet.google.com/xxx-xxxx-xxx' },
  { value: 'zoom',        label: 'Zoom',               icon: '🔵', placeholder: 'https://zoom.us/j/xxxxxxxxxx' },
  { value: 'teams',       label: 'Microsoft Teams',   icon: '🟣', placeholder: 'https://teams.microsoft.com/l/...' },
  { value: 'custom',      label: 'Other / Custom URL', icon: '🔗', placeholder: 'https://...' },
]

const EMPTY_FORM = {
  swap_request_id: '',
  title: '',
  description: '',
  scheduled_at: '',
  end_at: '',
  duration_minutes: 60,
  timezone: 'Asia/Kolkata',
  meeting_type: 'google_meet',
  meeting_url: '',
  notes: '',
}

export default function Sessions() {
  const [tab, setTab]         = useState('upcoming')
  const [showForm, setShowForm] = useState(false)
  const [params]              = useSearchParams()
  const navigate              = useNavigate()
  const qc                    = useQueryClient()
  const toast                 = useToast()
  const swapParam             = params.get('swap')

  const [form, setForm] = useState({ ...EMPTY_FORM, swap_request_id: swapParam || '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  // Auto-open form if ?swap= is in URL
  useEffect(() => {
    if (swapParam) setShowForm(true)
  }, [swapParam])

  const { data: me }           = useQuery({ queryKey: ['me'], queryFn: () => usersAPI.getMe().then(r => r.data) })
  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['sessions', 'all'],
    queryFn: () => swapsAPI.getMySessions().then(r => r.data),
  })
  const { data: acceptedSwaps = [] } = useQuery({
    queryKey: ['swaps', 'accepted'],
    queryFn: () => swapsAPI.getAll().then(r => r.data.filter(s => s.status === 'accepted')),
  })

  // Filter sessions client-side
  const sessions = allSessions.filter(s => {
    if (tab === 'upcoming')  return s.status === 'scheduled' || s.status === 'ongoing'
    if (tab === 'completed') return s.status === 'completed'
    return true
  })

  const create = useMutation({
    mutationFn: (d) => swapsAPI.createSession(d),
    onSuccess: () => {
      qc.invalidateQueries(['sessions'])
      setShowForm(false)
      setForm(EMPTY_FORM)
      toast.success('Session scheduled! Both parties have been notified.')
      // Remove ?swap from URL
      navigate('/sessions', { replace: true })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error scheduling session'),
  })

  const complete = useMutation({
    mutationFn: (id) => swapsAPI.completeSession(id),
    onSuccess: (res) => {
      qc.invalidateQueries(['sessions', 'all'])
      if (res.data.both_completed) {
        toast.success('Session completed! Please leave a review for your partner.')
      } else {
        toast.info('Marked as complete. Waiting for the other person to confirm.')
      }
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error'),
  })

  const handleSubmit = () => {
    if (!form.swap_request_id) { toast.error('Please select a swap request'); return }
    if (!form.title.trim())    { toast.error('Please enter a title'); return }
    if (!form.scheduled_at)    { toast.error('Please select date and time'); return }

    create.mutate({
      swap_request_id: parseInt(form.swap_request_id),
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      scheduled_at: form.scheduled_at,
      end_at: form.end_at || undefined,
      duration_minutes: parseInt(form.duration_minutes),
      timezone: form.timezone,
      meeting_type: form.meeting_type,
      meeting_url: form.meeting_url.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })
  }

  // Get partner name for a swap
  const getPartnerName = (swap) => {
    const isSender = swap.sender_id === me?.id
    const partner = isSender ? swap.receiver : swap.sender
    return partner?.full_name || partner?.username || `User #${isSender ? swap.receiver_id : swap.sender_id}`
  }

  const selectedMeeting = MEETING_OPTIONS.find(m => m.value === form.meeting_type)

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition'

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <ToastContainer toasts={toast.toasts} />

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">Sessions</h1>
        <button onClick={() => setShowForm(s => !s)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
          {showForm ? '✕ Cancel' : '+ Schedule Session'}
        </button>
      </div>

      {/* ── SCHEDULE FORM ── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-900 text-lg mb-1">Schedule a Session</h2>
          <p className="text-sm text-gray-500 mb-5">Set up your skill exchange session details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Swap partner selector */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Session Partner (Accepted Swap) *
              </label>
              {acceptedSwaps.length === 0 ? (
                <div className="border border-orange-200 bg-orange-50 rounded-lg px-3 py-2.5 text-sm text-orange-700">
                  No accepted swaps yet. Go to{' '}
                  <Link to="/swaps" className="underline font-medium">Swaps</Link>{' '}
                  and accept a request first.
                </div>
              ) : (
                <select value={form.swap_request_id} onChange={set('swap_request_id')} className={inp}>
                  <option value="">— Select partner —</option>
                  {acceptedSwaps.map(s => (
                    <option key={s.id} value={s.id}>
                      {getPartnerName(s)}
                      {s.sender?.location || s.receiver?.location
                        ? ` · ${(s.sender_id === me?.id ? s.receiver?.location : s.sender?.location) || ''}`
                        : ''}
                      {'  (Swap #'}{s.id}{')'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Session Title *</label>
              <input value={form.title} onChange={set('title')} className={inp}
                placeholder="e.g. Python Basics — Session 1" />
            </div>

            {/* Date/Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date & Time *</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date & Time</label>
              <input type="datetime-local" value={form.end_at} onChange={set('end_at')} className={inp} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (minutes)</label>
              <select value={form.duration_minutes} onChange={set('duration_minutes')} className={inp}>
                {[30, 45, 60, 90, 120, 180].map(m => (
                  <option key={m} value={m}>{m} min {m >= 60 ? `(${m/60}h)` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Timezone</label>
              <select value={form.timezone} onChange={set('timezone')} className={inp}>
                <option value="Asia/Kolkata">IST — Asia/Kolkata (+5:30)</option>
                <option value="UTC">UTC (+0:00)</option>
                <option value="America/New_York">EST — New York (-5:00)</option>
                <option value="America/Los_Angeles">PST — Los Angeles (-8:00)</option>
                <option value="Europe/London">GMT — London (+0:00)</option>
                <option value="Europe/Berlin">CET — Berlin (+1:00)</option>
                <option value="Asia/Dubai">GST — Dubai (+4:00)</option>
                <option value="Asia/Singapore">SGT — Singapore (+8:00)</option>
              </select>
            </div>

            {/* Meeting platform */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Meeting Platform</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {MEETING_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm(f => ({ ...f, meeting_type: opt.value }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.meeting_type === opt.value
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <span className="text-base">{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting URL */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {selectedMeeting?.icon} {selectedMeeting?.label} Link
              </label>
              <div className="flex gap-2">
                <input value={form.meeting_url} onChange={set('meeting_url')} className={inp}
                  placeholder={selectedMeeting?.placeholder || 'https://...'}/>
              </div>
              {form.meeting_type === 'google_meet' && (
                <p className="text-xs text-gray-400 mt-1">
                  Create a meeting at{' '}
                  <a href="https://meet.google.com/new" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
                    meet.google.com/new ↗
                  </a>
                  {' '}and paste the link here.
                </p>
              )}
              {form.meeting_type === 'zoom' && (
                <p className="text-xs text-gray-400 mt-1">
                  Create at{' '}
                  <a href="https://zoom.us/meeting/schedule" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
                    zoom.us ↗
                  </a>
                </p>
              )}
              {form.meeting_type === 'teams' && (
                <p className="text-xs text-gray-400 mt-1">
                  Create at{' '}
                  <a href="https://teams.microsoft.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
                    teams.microsoft.com ↗
                  </a>
                </p>
              )}
            </div>

            {/* Description + Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={set('description')}
                className={inp + ' h-16 resize-none'}
                placeholder="What topics will you cover?" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes / Prerequisites</label>
              <textarea value={form.notes} onChange={set('notes')}
                className={inp + ' h-16 resize-none'}
                placeholder="Any setup needed, prerequisites..." />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={create.isPending}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {create.isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {create.isPending ? 'Scheduling...' : '📅 Schedule Session'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ k: 'upcoming', l: 'Upcoming' }, { k: 'completed', l: 'Completed' }, { k: 'all', l: 'All' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.k ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : sessions.length === 0 ? (
        <EmptyState
          icon="📅"
          title="No sessions"
          desc={tab === 'upcoming' ? 'No upcoming sessions. Schedule one after accepting a swap!' : 'No completed sessions yet.'}
          action={
            <button onClick={() => setShowForm(true)}
              className="mt-2 inline-block bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">
              + Schedule Session
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {sessions.map(s => {
            const isHost = s.host_id === me?.id
            const partner = isHost ? s.guest : s.host
            const mtInfo = MEETING_OPTIONS.find(m => m.value === s.meeting_type)
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">{mtInfo?.icon || '📅'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="font-bold text-gray-900">{s.title}</span>
                      <Badge status={s.status} />
                    </div>
                    {s.description && <p className="text-xs text-gray-500 mb-2">{s.description}</p>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-500 mb-2">
                      <span>📅 {new Date(s.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span>⏱️ {s.duration_minutes} minutes · {s.timezone}</span>
                      <span>🎓 Host: <strong>{s.host?.full_name || s.host?.username}</strong></span>
                      <span>👤 Guest: <strong>{s.guest?.full_name || s.guest?.username}</strong></span>
                    </div>

                    {s.meeting_url && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{mtInfo?.label}:</span>
                        <a href={s.meeting_url} target="_blank" rel="noreferrer"
                          className="text-xs text-indigo-600 hover:underline truncate max-w-xs">{s.meeting_url}</a>
                      </div>
                    )}
                    {s.notes && <p className="text-xs text-gray-400 mt-1 italic">{s.notes}</p>}
                  </div>

                  {/* Completion status */}
                  {s.status === 'scheduled' && (
                    <div className="flex flex-col gap-1 text-xs text-gray-400 flex-shrink-0 text-right">
                      <span>{s.host_completed ? '✅ Host done' : '⏳ Host pending'}</span>
                      <span>{s.guest_completed ? '✅ Guest done' : '⏳ Guest pending'}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  {s.meeting_url && (
                    <a href={s.meeting_url} target="_blank" rel="noreferrer"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors">
                      {mtInfo?.icon} Join {mtInfo?.label}
                    </a>
                  )}
                  {(s.status === 'scheduled' || s.status === 'ongoing') && (
                    <button onClick={() => complete.mutate(s.id)} disabled={complete.isPending}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
                      ✅ Mark as Complete
                    </button>
                  )}
                  {s.status === 'completed' && (
                    <Link to={`/sessions/${s.id}/review`}
                      className="border border-yellow-300 bg-yellow-50 text-yellow-700 text-xs px-4 py-2 rounded-lg font-medium hover:bg-yellow-100 transition-colors">
                      ⭐ Leave Review
                    </Link>
                  )}
                  <Link to={`/chat?user=${isHost ? s.guest_id : s.host_id}`}
                    className="border border-gray-200 text-gray-600 text-xs px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    💬 Chat
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
