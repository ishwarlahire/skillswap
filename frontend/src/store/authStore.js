import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user:  JSON.parse(localStorage.getItem('ss_user')  || 'null'),
  token: localStorage.getItem('ss_token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('ss_user', JSON.stringify(user))
    localStorage.setItem('ss_token', token)
    set({ user, token })
  },
  updateUser: (user) => {
    localStorage.setItem('ss_user', JSON.stringify(user))
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('ss_user')
    localStorage.removeItem('ss_token')
    set({ user: null, token: null })
  },
}))

export default useAuthStore
