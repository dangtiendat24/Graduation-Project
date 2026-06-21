import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage/LandingPage'
import AuthPage from './pages/AuthPage/AuthPage'
import VerifyEmailPage from './pages/VerifyEmailPage/VerifyEmailPage'
import AuthCallbackPage from './pages/AuthCallbackPage/AuthCallbackPage'
import RecruiterDashboardPage from './pages/RecruiterDashboardPage/RecruiterDashboardPage'
import CandidateHomePage from './pages/CandidateHomePage/CandidateHomePage'
import CandidateJobsPage from './pages/CandidateJobsPage/CandidateJobsPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
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
      </Routes>
    </BrowserRouter>
  )
}

export default App
