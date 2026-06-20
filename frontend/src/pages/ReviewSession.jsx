import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { swapsAPI, usersAPI } from '../services/api'
import StarRating from '../components/ui/StarRating'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/ui/Toast'

export default function ReviewSession() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => usersAPI.getMe().then(r => r.data) })
  const { data: session } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      const r = await swapsAPI.getMySessions()
      return r.data.find(s => s.id === parseInt(sessionId))
    },
  })

  const reviewee = session ? (session.host_id === me?.id ? session.guest : session.host) : null

  const submit = async () => {
    if (!rating) { toast.error('Please give a rating'); return }
    setLoading(true)
    try {
      await swapsAPI.createReview({
        session_id: parseInt(sessionId),
        reviewee_id: reviewee?.id,
        rating, comment,
        skill_name: session?.title,
      })
      toast.success('Review submitted!')
      setTimeout(() => navigate('/sessions'), 1500)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error submitting review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <ToastContainer toasts={toast.toasts} />
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Leave a Review</h1>
        <p className="text-sm text-gray-500 mb-6">
          For: <strong>{reviewee?.full_name || reviewee?.username}</strong>
          {session && <span className="ml-2 text-gray-400">· {session.title}</span>}
        </p>

        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Rating *</p>
          <StarRating value={rating} onChange={setRating} />
          <p className="text-xs text-gray-400 mt-1">
            {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Very Good' : rating === 5 ? 'Excellent' : 'Tap to rate'}
          </p>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Share your experience — what did you learn, how was the session?"
            className="w-full border border-gray-200 rounded-lg p-3 text-sm h-28 resize-none focus:outline-none focus:border-indigo-400"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/sessions')} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50">
            Skip
          </button>
          <button onClick={submit} disabled={loading || !rating}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
