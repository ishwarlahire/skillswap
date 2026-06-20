import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import StarRating from '../components/ui/StarRating'
import Spinner from '../components/ui/Spinner'

export default function UserProfile() {
  const { userId } = useParams()
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => usersAPI.getUser(userId).then(r => r.data),
  })
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', userId],
    queryFn: () => usersAPI.getUserReviews(userId).then(r => r.data),
    enabled: !!userId,
  })

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">
      {/* Hero */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-5">
          <Avatar name={user?.full_name||user?.username} url={user?.avatar_url} size="xl" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{user?.full_name||user?.username}</h1>
            <p className="text-sm text-gray-500">{user?.location}</p>
            {user?.rating > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <StarRating value={Math.round(user.rating)} readonly />
                <span className="text-sm text-gray-500">{user.rating.toFixed(1)} ({user.total_reviews} reviews)</span>
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              {user?.experience_level && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{user.experience_level}</span>}
              {user?.years_of_experience && <span>{user.years_of_experience} years exp</span>}
              {user?.education && <span>🎓 {user.education}</span>}
              <span>🏆 {user?.sessions_completed} sessions</span>
            </div>
            {user?.bio && <p className="text-sm text-gray-600 mt-3">{user.bio}</p>}
            {user?.availability && <p className="text-xs text-gray-400 mt-1">🕐 Available: {user.availability}</p>}
            <div className="flex gap-3 mt-3">
              {user?.github_url && <a href={user.github_url} target="_blank" className="text-xs text-indigo-600 hover:underline">GitHub ↗</a>}
              {user?.linkedin_url && <a href={user.linkedin_url} target="_blank" className="text-xs text-indigo-600 hover:underline">LinkedIn ↗</a>}
              {user?.portfolio_url && <a href={user.portfolio_url} target="_blank" className="text-xs text-indigo-600 hover:underline">Portfolio ↗</a>}
            </div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-800 mb-3 text-sm">Skills Offered</p>
          <div className="flex flex-wrap gap-1.5">
            {user?.skills_offered?.map(s => (
              <span key={s.id} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-100">{s.name}</span>
            ))}
            {!user?.skills_offered?.length && <p className="text-xs text-gray-400">None listed</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-800 mb-3 text-sm">Skills Wanted</p>
          <div className="flex flex-wrap gap-1.5">
            {user?.skills_wanted?.map(s => (
              <span key={s.id} className="bg-orange-50 text-orange-700 text-xs px-2.5 py-1 rounded-full border border-orange-100">{s.name}</span>
            ))}
            {!user?.skills_wanted?.length && <p className="text-xs text-gray-400">None listed</p>}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Reviews ({reviews.length})</h2>
        {reviews.length === 0 ? <p className="text-sm text-gray-400">No reviews yet.</p> : (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar name={r.reviewer?.full_name||r.reviewer?.username} size="sm" />
                  <span className="text-sm font-medium text-gray-800">{r.reviewer?.full_name||r.reviewer?.username}</span>
                  <StarRating value={r.rating} readonly />
                  <span className="ml-auto text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-600 ml-9">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
