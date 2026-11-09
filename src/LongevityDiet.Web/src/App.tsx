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

const CatalogPage = lazy(() =>
  import('./features/catalog/CatalogPage').then((module) => ({ default: module.CatalogPage })),
)

const RecipeDetailPage = lazy(() =>
  import('./features/catalog/RecipeDetailPage').then((module) => ({ default: module.RecipeDetailPage })),
)

const AdminCatalogPage = lazy(() =>
  import('./features/admin/catalog/AdminCatalogPage').then((module) => ({ default: module.AdminCatalogPage })),
)

const ChallengeDashboardPage = lazy(() =>
  import('./features/progress/ChallengeDashboardPage').then((module) => ({
    default: module.ChallengeDashboardPage,
  })),
)

const WeeklyReportsPage = lazy(() =>
  import('./features/reports/WeeklyReportsPage').then((module) => ({
    default: module.WeeklyReportsPage,
  })),
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
        <Route
          path="/catalog"
          element={
            <ProtectedRoute>
              <CatalogPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/progress"
          element={
            <ProtectedRoute>
              <ChallengeDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <WeeklyReportsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/catalog/recipes/:id"
          element={
            <ProtectedRoute>
              <RecipeDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/catalog"
          element={
            <ProtectedRoute requiredRole="Admin">
              <AdminCatalogPage />
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
