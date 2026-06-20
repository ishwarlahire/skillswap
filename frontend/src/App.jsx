import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Navbar          from './components/layout/Navbar'
import Login           from './pages/Login'
import Register        from './pages/Register'
import Dashboard       from './pages/Dashboard'
import Explore         from './pages/Explore'
import Swaps           from './pages/Swaps'
import Sessions        from './pages/Sessions'
import Chat            from './pages/Chat'
import Profile         from './pages/Profile'
import UserProfile     from './pages/UserProfile'
import Notifications   from './pages/Notifications'
import ReviewSession   from './pages/ReviewSession'

function Private({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { token } = useAuthStore()
  return (
    <div className="min-h-screen bg-gray-50">
      {token && <Navbar />}
      <Routes>
        <Route path="/"                       element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
        <Route path="/login"                  element={<Login />} />
        <Route path="/register"               element={<Register />} />
        <Route path="/dashboard"              element={<Private><Dashboard /></Private>} />
        <Route path="/explore"                element={<Private><Explore /></Private>} />
        <Route path="/swaps"                  element={<Private><Swaps /></Private>} />
        <Route path="/swaps/incoming"         element={<Private><Swaps /></Private>} />
        <Route path="/sessions"               element={<Private><Sessions /></Private>} />
        <Route path="/sessions/new"           element={<Private><Sessions /></Private>} />
        <Route path="/sessions/:sessionId/review" element={<Private><ReviewSession /></Private>} />
        <Route path="/chat"                   element={<Private><Chat /></Private>} />
        <Route path="/profile"                element={<Private><Profile /></Private>} />
        <Route path="/users/:userId"          element={<Private><UserProfile /></Private>} />
        <Route path="/notifications"          element={<Private><Notifications /></Private>} />
        <Route path="*"                       element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
