import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import Avatar from '../components/ui/Avatar'
import StarRating from '../components/ui/StarRating'
import { useToast } from '../hooks/useToast'
import ToastContainer from '../components/ui/Toast'

const EMPTY_FORM = {
  full_name: '', bio: '', location: '', mobile: '',
  linkedin_url: '', github_url: '', portfolio_url: '',
  experience_level: '', years_of_experience: '', education: '', availability: '',
}

export default function Profile() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data: profile, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersAPI.getMe().then(r => r.data),
  })
  const { data: reviews = [] } = useQuery({
    queryKey: ['myReviews', profile?.id],
    queryFn: () => usersAPI.getUserReviews(profile.id).then(r => r.data),
    enabled: !!profile?.id,
  })

  const [form, setForm]       = useState(EMPTY_FORM)
  const [newSkill, setNewSkill] = useState({ name: '', type: 'offer', level: 'intermediate' })
  const [tab, setTab]         = useState('info')
  const [formDirty, setFormDirty] = useState(false)

  // Populate form whenever profile loads or changes
  useEffect(() => {
    if (profile) {
      setForm({
        full_name:           profile.full_name           || '',
        bio:                 profile.bio                 || '',
        location:            profile.location            || '',
        mobile:              profile.mobile              || '',
        linkedin_url:        profile.linkedin_url        || '',
        github_url:          profile.github_url          || '',
        portfolio_url:       profile.portfolio_url       || '',
        experience_level:    profile.experience_level    || '',
        years_of_experience: profile.years_of_experience ?? '',
        education:           profile.education           || '',
        availability:        profile.availability        || '',
      })
      setFormDirty(false)
    }
  }, [profile])

  const setField = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setFormDirty(true)
  }

  // FIX: pass current form snapshot to mutationFn — avoids stale closure
  const updateMe = useMutation({
    mutationFn: (formData) => usersAPI.updateMe(formData),
    onSuccess: (res) => {
      qc.setQueryData(['me'], res.data)   // update cache immediately
      qc.invalidateQueries(['me'])
      setFormDirty(false)
      toast.success('Profile saved successfully!')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error saving profile'),
  })

  const addSkill = useMutation({
    mutationFn: (d) => d.type === 'offer'
      ? usersAPI.addOfferedSkill({ name: d.name, level: d.level })
      : usersAPI.addWantedSkill({ name: d.name, level: d.level }),
    onSuccess: () => {
      qc.invalidateQueries(['me'])
      setNewSkill(s => ({ ...s, name: '' }))
      toast.success('Skill added!')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error adding skill'),
  })

  const delSkill = useMutation({
    mutationFn: (id) => usersAPI.deleteSkill(id),
    onSuccess: () => { qc.invalidateQueries(['me']); toast.success('Skill removed') },
  })

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition'

  if (isLoading) return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">
      <ToastContainer toasts={toast.toasts} />

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-5">
        <Avatar name={profile?.full_name || profile?.username} url={profile?.avatar_url} size="xl" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{profile?.full_name || profile?.username}</h1>
          <p className="text-sm text-gray-500">{profile?.location || 'No location set'}</p>
          {profile?.rating > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating value={Math.round(profile.rating)} readonly />
              <span className="text-sm text-gray-500">{profile.rating.toFixed(1)} ({profile.total_reviews} reviews)</span>
            </div>
          )}
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span>🏆 {profile?.sessions_completed || 0} sessions</span>
            <span>⏱️ {(profile?.total_hours_taught || 0).toFixed(1)}h taught</span>
            <span>📚 {(profile?.total_hours_learned || 0).toFixed(1)}h learned</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ k: 'info', l: 'Info' }, { k: 'skills', l: 'Skills' }, { k: 'reviews', l: 'Reviews' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.k ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* ── INFO TAB ── */}
      {tab === 'info' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-5">Personal Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Full Name</label>
              <input value={form.full_name} onChange={setField('full_name')} className={inp} placeholder="Ishwar Lahire" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
              <input value={form.location} onChange={setField('location')} className={inp} placeholder="Nashik, Maharashtra" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mobile</label>
              <input value={form.mobile} onChange={setField('mobile')} className={inp} placeholder="+91 9067xxxxxx" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Experience Level</label>
              <select value={form.experience_level} onChange={setField('experience_level')} className={inp}>
                <option value="">Select...</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Years of Experience</label>
              <input type="number" min={0} max={50} value={form.years_of_experience}
                onChange={setField('years_of_experience')} className={inp} placeholder="2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Education</label>
              <input value={form.education} onChange={setField('education')} className={inp} placeholder="MCA — University of Mysore" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Bio</label>
              <textarea value={form.bio} onChange={setField('bio')}
                className={inp + ' h-24 resize-none'} placeholder="Python backend developer passionate about..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Availability</label>
              <input value={form.availability} onChange={setField('availability')}
                className={inp} placeholder="Weekdays 6–9 PM IST" />
            </div>
          </div>

          <h2 className="font-semibold text-gray-800 mt-6 mb-4">Social Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">GitHub URL</label>
              <input value={form.github_url} onChange={setField('github_url')}
                className={inp} placeholder="https://github.com/ishwarlahire" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">LinkedIn URL</label>
              <input value={form.linkedin_url} onChange={setField('linkedin_url')}
                className={inp} placeholder="https://linkedin.com/in/ishwar-lahire" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Portfolio / Website</label>
              <input value={form.portfolio_url} onChange={setField('portfolio_url')}
                className={inp} placeholder="https://ishwarlahire.vercel.app" />
            </div>
          </div>

          {/* Save button — passes current form snapshot */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => updateMe.mutate(form)}
              disabled={updateMe.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-8 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {updateMe.isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {updateMe.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {formDirty && !updateMe.isPending && (
              <span className="text-xs text-orange-500">You have unsaved changes</span>
            )}
          </div>
        </div>
      )}

      {/* ── SKILLS TAB ── */}
      {tab === 'skills' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Manage Skills</h2>
          <div className="flex gap-2 mb-6 flex-wrap">
            <input
              value={newSkill.name}
              onChange={e => setNewSkill(s => ({ ...s, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && newSkill.name.trim() && addSkill.mutate(newSkill)}
              placeholder="e.g. React, Python, Figma"
              className="flex-1 min-w-40 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
            />
            <select value={newSkill.type} onChange={e => setNewSkill(s => ({ ...s, type: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="offer">I Offer</option>
              <option value="want">I Want</option>
            </select>
            <select value={newSkill.level} onChange={e => setNewSkill(s => ({ ...s, level: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
            <button onClick={() => newSkill.name.trim() && addSkill.mutate(newSkill)}
              disabled={addSkill.isPending || !newSkill.name.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
              {addSkill.isPending ? 'Adding...' : '+ Add'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { label: 'Offering 🎓', skills: profile?.skills_offered, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100' },
              { label: 'Wanting 📚', skills: profile?.skills_wanted, bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100' },
            ].map(({ label, skills, bg, text, border }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
                <div className="flex flex-wrap gap-2 min-h-8">
                  {skills?.length ? skills.map(s => (
                    <span key={s.id} className={`inline-flex items-center gap-1 ${bg} ${text} text-xs px-2.5 py-1 rounded-full border ${border}`}>
                      <span>{s.name}</span>
                      <span className="text-gray-400 text-xs">({s.level})</span>
                      <button onClick={() => delSkill.mutate(s.id)}
                        className="opacity-50 hover:opacity-100 hover:text-red-500 ml-0.5 text-base leading-none">×</button>
                    </span>
                  )) : <p className="text-xs text-gray-400">None added yet</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REVIEWS TAB ── */}
      {tab === 'reviews' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Reviews Received ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">⭐</p>
              <p className="text-sm text-gray-400">No reviews yet. Complete sessions to get reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar name={r.reviewer?.full_name || r.reviewer?.username} size="sm" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{r.reviewer?.full_name || r.reviewer?.username}</p>
                      <StarRating value={r.rating} readonly />
                    </div>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  {r.skill_name && <p className="text-xs text-indigo-600 ml-11 mb-1">Skill: {r.skill_name}</p>}
                  {r.comment && <p className="text-sm text-gray-600 ml-11">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
