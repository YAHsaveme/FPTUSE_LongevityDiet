import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './auth/ProtectedRoute'

const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage })),
)

const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
)

const RegisterPage = lazy(() =>
  import('./pages/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })),
)

const NotificationsPage = lazy(() =>
  import('./pages/tracking/NotificationsPage')
    .then((module) => ({ default: module.NotificationsPage })),
)

const ActivityTrackingPage = lazy(() =>
  import('./pages/tracking/ActivityTrackingPage')
    .then((module) => ({ default: module.ActivityTrackingPage })),
)

const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)

const profilePages = () => import('./pages/auth/ProfileEditorPage')

const OnboardingPage = lazy(() =>
  profilePages().then((module) => ({ default: module.OnboardingPage })),
)

const ProfilePage = lazy(() =>
  profilePages().then((module) => ({ default: module.ProfilePage })),
)

const PlannerWorkspacePage = lazy(() =>
  import('./pages/planner/PlannerWorkspacePage').then((module) => ({
    default: module.PlannerWorkspacePage,
  })),
)

function RouteLoading() {
  return (
    <div className="auth-loading" role="status">
      <span />
      <p>Đang tải nội dung...</p>
    </div>
  )
}

function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Bá» qua Ä‘iá»u hÆ°á»›ng</a>
      <div id="main-content" tabIndex={-1}>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute allowIncompleteProfile>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute allowIncompleteProfile>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <PlannerWorkspacePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/planner"
          element={
            <ProtectedRoute>
              <PlannerWorkspacePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <ActivityTrackingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </>
  )
}

export default App
