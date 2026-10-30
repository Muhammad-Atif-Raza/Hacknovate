import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginRegister } from './pages/auth/LoginRegister';
import { CampusMapPage } from './pages/common/CampusMapPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { RoomSearch } from './pages/student/RoomSearch';
import { RoomSelection } from './pages/student/RoomSelection';
import { UserInfoPage } from './pages/student/UserInfoPage';
import { PermissionWaiting } from './pages/student/PermissionWaiting';
import { StudentProfile } from './pages/student/StudentProfile';
import { StandbyQueuePage } from './pages/student/StandbyQueuePage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminPendingRequests } from './pages/admin/AdminPendingRequests';
import { AdminAllBookings } from './pages/admin/AdminAllBookings';
import { AdminRoomManagement } from './pages/admin/AdminRoomManagement';
import { AdminMaintenance } from './pages/admin/AdminMaintenance';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminProfile } from './pages/admin/AdminProfile';

// Protected Route Guard
const ProtectedRoute = ({ roleRequired }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roleRequired && user?.role !== roleRequired) {
    // If student tries to access admin route, redirect to student dashboard
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
  }

  return <Outlet />;
};

// Portal Layout with Sidebar
const PortalLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Public Layout
const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginRegister />} />
            <Route path="/campus-map" element={<CampusMapPage />} />
          </Route>

          {/* Student Portal Protected Routes */}
          <Route element={<ProtectedRoute roleRequired="student" />}>
            <Route element={<PortalLayout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/apply" element={<RoomSearch />} />
              <Route path="/student/selection" element={<RoomSelection />} />
              <Route path="/student/book-info" element={<UserInfoPage />} />
              <Route path="/student/permission-waiting" element={<PermissionWaiting />} />
              <Route path="/student/standby" element={<StandbyQueuePage />} />
              <Route path="/student/profile" element={<StudentProfile />} />
            </Route>
          </Route>

          {/* Admin Portal Protected Routes */}
          <Route element={<ProtectedRoute roleRequired="admin" />}>
            <Route element={<PortalLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/pending" element={<AdminPendingRequests />} />
              <Route path="/admin/bookings" element={<AdminAllBookings />} />
              <Route path="/admin/rooms" element={<AdminRoomManagement />} />
              <Route path="/admin/maintenance" element={<AdminMaintenance />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
              <Route path="/admin/profile" element={<AdminProfile />} />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
