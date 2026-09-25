import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import EmergencyView from './pages/public/EmergencyView';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import Terms from './pages/public/Terms';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Authenticated User Pages
import Dashboard from './pages/user/Dashboard';
import ProfilePage from './pages/user/ProfilePage';
import MedicalPage from './pages/user/MedicalPage';
import ContactsPage from './pages/user/ContactsPage';
import PrivacyPage from './pages/user/PrivacyPage';
import QRPage from './pages/user/QRPage';
import AccountSettings from './pages/user/AccountSettings';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/emergency/:token" element={<EmergencyView />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* User Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/medical"
                  element={
                    <ProtectedRoute>
                      <MedicalPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/contacts"
                  element={
                    <ProtectedRoute>
                      <ContactsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/privacy"
                  element={
                    <ProtectedRoute>
                      <PrivacyPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/qr"
                  element={
                    <ProtectedRoute>
                      <QRPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <AccountSettings />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Protected Routes */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
