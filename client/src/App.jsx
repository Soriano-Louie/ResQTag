import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Public Pages
const Home = lazy(() => import('./pages/public/Home'));
const About = lazy(() => import('./pages/public/About'));
import EmergencyView from './pages/public/EmergencyView';
const PrivacyPolicy = lazy(() => import('./pages/public/PrivacyPolicy'));
const DataLeakPolicy = lazy(() => import('./pages/public/DataLeakPolicy'));
const Terms = lazy(() => import('./pages/public/Terms'));

// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Authenticated User Pages
const Dashboard = lazy(() => import('./pages/user/Dashboard'));
const FamilyPage = lazy(() => import('./pages/user/FamilyPage'));
const ProfilePage = lazy(() => import('./pages/user/ProfilePage'));
const MedicalPage = lazy(() => import('./pages/user/MedicalPage'));
const ContactsPage = lazy(() => import('./pages/user/ContactsPage'));
const PrivacyPage = lazy(() => import('./pages/user/PrivacyPage'));
const QRPage = lazy(() => import('./pages/user/QRPage'));
const AccountSettings = lazy(() => import('./pages/user/AccountSettings'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-brand-500 selection:text-white">
            <Navbar />
            <main className="flex-1">
              <Suspense fallback={<div role="status" className="p-6 text-center text-slate-500">Loading...</div>}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/emergency/:token" element={<EmergencyView />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/zero-public-data-leak-policy" element={<DataLeakPolicy />} />
                <Route path="/terms" element={<Terms />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/family" element={<ProtectedRoute><FamilyPage /></ProtectedRoute>} />
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
              </Suspense>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
