import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: React.ReactNode
  role: 'recruiter' | 'candidate'
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, token } = useAuthStore()

  if (!token || !user) return <Navigate to="/login" replace />

  // Sai role → về login để user tự chọn đúng tài khoản
  if (user.role !== role) return <Navigate to="/login" replace />

  return <>{children}</>
}
