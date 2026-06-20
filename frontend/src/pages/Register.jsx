import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import useAuthStore from '../store/authStore'

export default function Register() {
  const [form, setForm]   = useState({ email: '', username: '', password: '', full_name: '', location: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(er => ({ ...er, [k]: '' }))
  }
  const inp = (err) => `w-full border ${err ? 'border-red-400' : 'border-gray-200'} rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 transition`

  const validate = () => {
    const e = {}
    if (!form.email)         e.email    = 'Email is required'
    if (!form.username || form.username.length < 3)
                             e.username = 'Min 3 characters'
    if (!/^[a-zA-Z0-9_]+$/.test(form.username))
                             e.username = 'Only letters, numbers, underscore'
    if (!form.password || form.password.length < 6)
                             e.password = 'Min 6 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true); setApiError('')
    try {
      const res = await authAPI.register(form)
      setAuth(res.data.user, res.data.access_token)
      navigate('/profile')
    } catch (err) {
      const detail = err.response?.data?.detail
      setApiError(typeof detail === 'string' ? detail : 'Registration failed. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Teach what you know. Learn what you want.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-7 shadow-sm">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-5">⚠️ {apiError}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input value={form.full_name} onChange={set('full_name')} className={inp()} placeholder="Ishwar" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Username *</label>
                <input value={form.username} onChange={set('username')} className={inp(errors.username)} placeholder="ishwar_dev" />
                {errors.username && <p className="text-xs text-red-500 mt-0.5">{errors.username}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={set('email')} className={inp(errors.email)} placeholder="you@example.com" />
              {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password * (min 6)</label>
              <input type="password" value={form.password} onChange={set('password')} className={inp(errors.password)} placeholder="••••••••" />
              {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Location</label>
              <input value={form.location} onChange={set('location')} className={inp()} placeholder="Nashik, Maharashtra" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-5">
            Have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
