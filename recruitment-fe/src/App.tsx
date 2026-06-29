import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

const queryClient = new QueryClient()
import LandingPage from './pages/LandingPage/LandingPage'
import AuthPage from './pages/AuthPage/AuthPage'
import VerifyEmailPage from './pages/VerifyEmailPage/VerifyEmailPage'
import AuthCallbackPage from './pages/AuthCallbackPage/AuthCallbackPage'
import RecruiterDashboardPage from './pages/RecruiterDashboardPage/RecruiterDashboardPage'
import RecruiterCompanyPage from './pages/RecruiterCompanyPage/RecruiterCompanyPage'
import RecruiterJobsPage from './pages/RecruiterJobsPage/RecruiterJobsPage'
import RecruiterJobCreatePage from './pages/RecruiterJobCreatePage/RecruiterJobCreatePage'
import RecruiterJobEditPage from './pages/RecruiterJobEditPage/RecruiterJobEditPage'
import CandidateHomePage from './pages/CandidateHomePage/CandidateHomePage'
import CandidateJobsPage from './pages/CandidateJobsPage/CandidateJobsPage'
import CandidateJobDetailPage from './pages/CandidateJobDetailPage/CandidateJobDetailPage'
import CandidateProfilePage from './pages/CandidateProfilePage/CandidateProfilePage'
import CandidateCompanyPage from './pages/CandidateCompanyPage/CandidateCompanyPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap)
  const isReady = useAuthStore((s) => s.isReady)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // Khi tab khác đăng nhập/đăng xuất → re-verify ngay để cập nhật role
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'access_token') bootstrap()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [bootstrap])

  if (!isReady) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8f9fb',
        color: '#6b7280',
        fontSize: '15px',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Đang tải...
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route
          path="/recruiter/dashboard"
          element={
            <ProtectedRoute role="recruiter">
              <RecruiterDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/company"
          element={
            <ProtectedRoute role="recruiter">
              <RecruiterCompanyPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs"
          element={
            <ProtectedRoute role="recruiter">
              <RecruiterJobsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs/create"
          element={
            <ProtectedRoute role="recruiter">
              <RecruiterJobCreatePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruiter/jobs/:id/edit"
          element={
            <ProtectedRoute role="recruiter">
              <RecruiterJobEditPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidate/dashboard"
          element={
            <ProtectedRoute role="candidate">
              <CandidateHomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidate/jobs"
          element={
            <ProtectedRoute role="candidate">
              <CandidateJobsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidate/jobs/:id"
          element={
            <ProtectedRoute role="candidate">
              <CandidateJobDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidate/profile"
          element={
            <ProtectedRoute role="candidate">
              <CandidateProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidate/companies/:id"
          element={
            <ProtectedRoute role="candidate">
              <CandidateCompanyPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
