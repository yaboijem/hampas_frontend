import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import RequireAdmin from './auth/RequireAdmin';
import RegisterPage from './pages/Auth/RegisterPage';
import LoginPage from './pages/Auth/LoginPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/Auth/ResetPasswordPage';
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import Terms from './pages/Legal/Terms';
import ProfilePage from './pages/Profile/ProfilePage';
import RoleRequestsPage from './pages/Admin/RoleRequestsPage';
import CreateEventPage from './pages/Events/CreateEventPage';
import EditEventPage from './pages/Events/EditEventPage';
import EventDetailPage from './pages/Events/EventDetailPage';
import EventsPage from './pages/Events/EventsPage';
import MyApplicationsPage from './pages/Applications/MyApplicationsPage';
import EventApplicationsPage from './pages/Applications/EventApplicationsPage';
import InstallPrompt from './components/InstallPrompt';
import OfflinePage from './pages/OfflinePage';
import ErrorBoundary from './components/ErrorBoundary';
import AppHeader from './components/AppHeader';
import { ThemeProvider } from './theme/ThemeContext';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 text-muted" role="status">
        Loading…
      </div>
    );
  }
  return <Navigate to={user ? '/events' : '/login'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-dvh bg-ice text-navy">
          <AppHeader />
          <InstallPrompt />
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                <Route
                  path="/admin/role-requests"
                  element={
                    <RequireAuth>
                      <RequireAdmin>
                        <RoleRequestsPage />
                      </RequireAdmin>
                    </RequireAuth>
                  }
                />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/new" element={<RequireAuth><CreateEventPage /></RequireAuth>} />
                <Route path="/events/:id/edit" element={<RequireAuth><EditEventPage /></RequireAuth>} />
                <Route path="/events/:id/applications" element={<RequireAuth><EventApplicationsPage /></RequireAuth>} />
                <Route path="/me/applications" element={<RequireAuth><MyApplicationsPage /></RequireAuth>} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/offline" element={<OfflinePage />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
