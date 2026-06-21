import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: React.ReactNode
  role: 'recruiter' | 'candidate'
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, token } = useAuthStore()

  if (!token || !user) return <Navigate to="/login" replace />

  if (user.role !== role) {
    const fallback = user.role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard'
    return <Navigate to={fallback} replace />
  }

  return <>{children}</>
}
