import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ss_token')
      localStorage.removeItem('ss_user')    
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register: (d) => api.post('/auth/register', d),
  login: (d) => api.post('/auth/login',
    new URLSearchParams({ username: d.email, password: d.password }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }),
}

export const usersAPI = {
  getMe:           ()        => api.get('/users/me'),
  updateMe:        (d)       => api.put('/users/me', d),
  getUser:         (id)      => api.get(`/users/${id}`),
  getUserReviews:  (id)      => api.get(`/users/${id}/reviews`),
  searchUsers:     (p)       => api.get('/users/search', { params: p }),
  addOfferedSkill: (d)       => api.post('/users/me/skills/offer', d),
  addWantedSkill:  (d)       => api.post('/users/me/skills/want', d),
  deleteSkill:     (id)      => api.delete(`/users/me/skills/${id}`),
  getNotifications:(p)       => api.get('/users/notifications', { params: p }),
  getUnreadCount:  ()        => api.get('/users/notifications/count'),
  markAllRead:     ()        => api.put('/users/notifications/read-all'),
  markOneRead:     (id)      => api.put(`/users/notifications/${id}/read`),
}

export const swapsAPI = {
  create:           (d)     => api.post('/swaps/', d),
  getAll:           (p)     => api.get('/swaps/', { params: p }),
  getIncoming:      (p)     => api.get('/swaps/incoming', { params: p }),
  getSent:          (p)     => api.get('/swaps/sent', { params: p }),
  getOne:           (id)    => api.get(`/swaps/${id}`),
  update:           (id,d)  => api.put(`/swaps/${id}`, d),
  createSession:    (d)     => api.post('/swaps/sessions', d),
  getMySessions:    (p)     => api.get('/swaps/sessions/my', { params: p }),
  updateSession:    (id,d)  => api.put(`/swaps/sessions/${id}`, d),
  completeSession:  (id)    => api.post(`/swaps/sessions/${id}/complete`),
  createReview:     (d)     => api.post('/swaps/reviews', d),
  getSessionReviews:(id)    => api.get(`/swaps/sessions/${id}/reviews`),
}

export const messagesAPI = {
  getConversations: ()      => api.get('/messages/conversations'),
  getMessages:      (uid)   => api.get('/messages/', { params: { other_user_id: uid } }),
  send:             (d)     => api.post('/messages/', d),
}

export const adminAPI = {
  stats:       ()       => api.get('/admin/stats'),
  users:       (p)      => api.get('/admin/users', { params: p }),
  suspend:     (id)     => api.put(`/admin/users/${id}/suspend`),
  deleteUser:  (id)     => api.delete(`/admin/users/${id}`),
}

export default api
