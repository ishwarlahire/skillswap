import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, Link } from 'react-router-dom'
import { messagesAPI, usersAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'

function formatTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function Chat() {
  const [searchParams]        = useSearchParams()
  const qc                    = useQueryClient()
  const urlUserId             = searchParams.get('user') ? parseInt(searchParams.get('user')) : null

  const [activeConv, setActiveConv]   = useState(null)
  const [messages, setMessages]       = useState([])
  const [input, setInput]             = useState('')
  const [wsState, setWsState]         = useState('disconnected')
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sendError, setSendError]     = useState('')

  const wsRef    = useRef(null)
  const endRef   = useRef(null)
  const inputRef = useRef(null)
  // Track if we already auto-selected from URL param
  const autoSelected = useRef(false)

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersAPI.getMe().then(r => r.data),
  })

  const {
    data: convs = [],
    isLoading: loadingConvs,
    error: convsError,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesAPI.getConversations().then(r => r.data),
    refetchInterval: 15000,
    staleTime: 0,          // always fresh
    retry: 2,
  })

  // ── Auto-select from URL param — wait until convs loaded ──
  useEffect(() => {
    if (!urlUserId || loadingConvs || autoSelected.current) return
    if (convs.length === 0) return

    const found = convs.find(c => c.other_user.id === urlUserId)
    if (found) {
      autoSelected.current = true
      handleSelectConv(found)
    }
  // eslint-disable-next-line
  }, [urlUserId, convs, loadingConvs])

  // ── WebSocket ──
  const connectWS = useCallback(() => {
    const token = localStorage.getItem('ss_token')
    if (!token) return
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) return

    setWsState('connecting')

    // Dev: connect directly to backend port 8000
    // Prod: use same host (nginx proxies /api/messages/ws/)
    const isLocal  = window.location.hostname === 'localhost'
    const host     = isLocal ? 'localhost:8000' : window.location.host
    const proto    = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const url      = `${proto}://${host}/api/messages/ws/${token}`

    const ws = new WebSocket(url)

    ws.onopen = () => setWsState('connected')

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.error) { console.warn('WS error:', msg.error); return }
        setMessages(prev =>
          prev.some(m => m.id && m.id === msg.id) ? prev : [...prev, msg]
        )
        qc.invalidateQueries(['conversations'])
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      } catch {}
    }

    ws.onclose = () => {
      setWsState('disconnected')
      setTimeout(connectWS, 4000)   // reconnect
    }

    ws.onerror = () => ws.close()
    wsRef.current = ws
  }, [qc])

  useEffect(() => {
    connectWS()
    return () => { wsRef.current?.close() }
  }, [connectWS])

  // ── Load messages for selected conversation ──
  const handleSelectConv = async (conv) => {
    setActiveConv(conv)
    setMessages([])
    setLoadingMsgs(true)
    setSendError('')
    try {
      const r = await messagesAPI.getMessages(conv.other_user.id)
      setMessages(r.data)
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
      qc.invalidateQueries(['conversations'])
    } catch (err) {
      console.error('Load messages error:', err)
    } finally {
      setLoadingMsgs(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── Send message ──
  const sendMessage = async () => {
    const content = input.trim()
    if (!content || !activeConv) return
    setSendError('')

    const payload = {
      receiver_id:     activeConv.other_user.id,
      content,
      swap_request_id: activeConv.swap_request_id || null,
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
      setInput('')
    } else {
      // REST fallback
      try {
        const r = await messagesAPI.send(payload)
        setMessages(prev => [...prev, r.data])
        setInput('')
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        qc.invalidateQueries(['conversations'])
      } catch (err) {
        setSendError(err.response?.data?.detail || 'Could not send message. Make sure you have an accepted swap with this user.')
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  // ── WS Status badge ──
  const wsBadge = {
    connected:    { dot: 'bg-green-400',  text: 'text-green-600',  label: 'Live'         },
    connecting:   { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-600', label: 'Connecting...' },
    disconnected: { dot: 'bg-gray-300',   text: 'text-gray-400',   label: 'Offline'      },
  }[wsState]

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${wsBadge.text}`}>
          <span className={`w-2 h-2 rounded-full ${wsBadge.dot}`} />
          {wsBadge.label}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 flex overflow-hidden shadow-sm"
           style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>

        {/* ── SIDEBAR ── */}
        <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conversations</p>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">
              {convs.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Loading */}
            {loadingConvs && (
              <div className="space-y-3 p-3">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {convsError && !loadingConvs && (
              <div className="p-4 text-center">
                <p className="text-xs text-red-500">Could not load conversations</p>
                <button onClick={() => qc.invalidateQueries(['conversations'])}
                  className="text-xs text-indigo-600 hover:underline mt-1">Retry</button>
              </div>
            )}

            {/* Empty */}
            {!loadingConvs && !convsError && convs.length === 0 && (
              <div className="p-5 text-center">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm font-semibold text-gray-700 mb-1">No conversations yet</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Accept a swap request to start chatting.
                </p>
                <Link to="/swaps" className="inline-block text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                  View Swaps →
                </Link>
              </div>
            )}

            {/* Conversation list */}
            {convs.map(conv => {
              const name     = conv.other_user.full_name || conv.other_user.username
              const isActive = activeConv?.other_user.id === conv.other_user.id
              const hasUnread = conv.unread_count > 0

              return (
                <button
                  key={conv.other_user.id}
                  onClick={() => handleSelectConv(conv)}
                  className={`w-full text-left px-3 py-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                    isActive ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar name={name} url={conv.other_user.avatar_url} size="sm" />
                    {conv.is_online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {name}
                      </p>
                      {hasUnread && (
                        <span className="bg-indigo-600 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0 font-bold">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-gray-600 font-medium' : 'text-gray-400'}`}>
                      {conv.last_message || '👋 Say hello!'}
                    </p>
                    {conv.last_message_at && (
                      <p className="text-xs text-gray-300 mt-0.5">{formatTime(conv.last_message_at)}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">

          {!activeConv ? (
            /* No conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <span className="text-3xl">💬</span>
              </div>
              <p className="font-semibold text-gray-700 text-lg mb-1">Select a conversation</p>
              <p className="text-sm text-gray-400 max-w-xs">
                {convs.length > 0
                  ? 'Choose a partner from the left to start chatting'
                  : 'Accept a swap request first to unlock chat'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3 shadow-sm">
                <Avatar
                  name={activeConv.other_user.full_name || activeConv.other_user.username}
                  url={activeConv.other_user.avatar_url}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {activeConv.other_user.full_name || activeConv.other_user.username}
                  </p>
                  <p className="text-xs flex items-center gap-1 text-gray-400">
                    {activeConv.is_online
                      ? <><span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" /> Online</>
                      : 'Offline'
                    }
                    {activeConv.other_user.location && (
                      <span className="ml-1">· {activeConv.other_user.location}</span>
                    )}
                  </p>
                </div>
                <Link
                  to={`/users/${activeConv.other_user.id}`}
                  className="text-xs text-indigo-600 hover:text-indigo-700 border border-indigo-100 rounded-lg px-2.5 py-1 hover:bg-indigo-50 transition-colors flex-shrink-0"
                >
                  View Profile
                </Link>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {loadingMsgs ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="w-7 h-7 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl">👋</span>
                    </div>
                    <p className="font-medium text-gray-700 mb-1">Start the conversation!</p>
                    <p className="text-xs text-gray-400">
                      Say hello to {activeConv.other_user.full_name || activeConv.other_user.username}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((m, i) => {
                      const isMe      = m.sender_id === me?.id
                      const prevMsg   = messages[i - 1]
                      const sameSender= prevMsg?.sender_id === m.sender_id
                      const timeGap   = prevMsg
                        ? (new Date(m.created_at) - new Date(prevMsg.created_at)) > 5 * 60 * 1000
                        : true

                      return (
                        <div key={m.id || `tmp-${i}`}>
                          {/* Time divider */}
                          {timeGap && i > 0 && (
                            <div className="flex items-center justify-center my-3">
                              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-0.5 rounded-full">
                                {formatTime(m.created_at)}
                              </span>
                            </div>
                          )}

                          <div className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'} ${sameSender && !timeGap ? 'mt-0.5' : 'mt-2'}`}>
                            {/* Avatar for other person */}
                            {!isMe && (
                              <div className="w-6 flex-shrink-0 self-end mb-0.5">
                                {(!sameSender || timeGap) && (
                                  <Avatar
                                    name={activeConv.other_user.full_name || activeConv.other_user.username}
                                    url={activeConv.other_user.avatar_url}
                                    size="sm"
                                  />
                                )}
                              </div>
                            )}

                            <div className={`group max-w-[70%]`}>
                              <div className={`px-4 py-2.5 text-sm leading-relaxed ${
                                isMe
                                  ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm'
                                  : 'bg-white text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm'
                              }`}>
                                {m.content}
                              </div>
                              {/* Timestamp on hover */}
                              <p className={`text-xs mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${
                                isMe ? 'text-right text-gray-400' : 'text-gray-400'
                              }`}>
                                {formatTime(m.created_at)}
                                {isMe && (
                                  <span className="ml-1">
                                    {m.is_read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={endRef} />
                  </>
                )}
              </div>

              {/* Error message */}
              {sendError && (
                <div className="mx-4 mb-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{sendError}</span>
                  <button onClick={() => setSendError('')} className="ml-auto text-red-400 hover:text-red-600">×</button>
                </div>
              )}

              {/* Input bar */}
              <div className="p-3 border-t border-gray-200 bg-white">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${activeConv.other_user.full_name || activeConv.other_user.username}...`}
                      rows={1}
                      style={{ minHeight: '42px', maxHeight: '120px' }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300 resize-none transition"
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                    title="Send (Enter)"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-300 mt-1.5 text-right">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
