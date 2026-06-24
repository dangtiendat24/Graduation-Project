import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const queryClient = new QueryClient()
import LandingPage from './pages/LandingPage/LandingPage'
import AuthPage from './pages/AuthPage/AuthPage'
import VerifyEmailPage from './pages/VerifyEmailPage/VerifyEmailPage'
import AuthCallbackPage from './pages/AuthCallbackPage/AuthCallbackPage'
import RecruiterDashboardPage from './pages/RecruiterDashboardPage/RecruiterDashboardPage'
import RecruiterCompanyPage from './pages/RecruiterCompanyPage/RecruiterCompanyPage'
import CandidateHomePage from './pages/CandidateHomePage/CandidateHomePage'
import CandidateJobsPage from './pages/CandidateJobsPage/CandidateJobsPage'
import CandidateProfilePage from './pages/CandidateProfilePage/CandidateProfilePage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
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
          path="/candidate/profile"
          element={
            <ProtectedRoute role="candidate">
              <CandidateProfilePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
