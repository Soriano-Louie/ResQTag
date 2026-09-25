import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  ShieldAlert, 
  QrCode, 
  User, 
  HeartHandshake, 
  Lock, 
  LogOut, 
  Menu, 
  X,
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('You have been logged out.');
      navigate('/login');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center shadow-lg shadow-brand-600/30 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
                ResQ<span className="text-brand-500">Tag</span>
              </span>
              <span className="text-[10px] text-slate-400 -mt-1 tracking-wider uppercase font-semibold">Emergency QR</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/about" 
              className={`text-sm font-medium transition-colors hover:text-brand-400 ${
                isActive('/about') ? 'text-brand-400 font-semibold' : 'text-slate-300'
              }`}
            >
              How It Works
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                    isActive('/dashboard')
                      ? 'bg-slate-800 text-white shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-brand-400" />
                  Dashboard
                </Link>

                <Link
                  to="/qr"
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                    isActive('/qr')
                      ? 'bg-slate-800 text-white shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400" />
                  My ResQTag
                </Link>

                <Link
                  to="/privacy"
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                    isActive('/privacy')
                      ? 'bg-slate-800 text-white shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Lock className="w-4 h-4 text-sky-400" />
                  Privacy
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${
                      isActive('/admin')
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        : 'text-amber-400 hover:bg-amber-950/30'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                <div className="h-5 w-px bg-slate-800 mx-1" />

                <Link
                  to="/account"
                  className="flex items-center gap-2 text-sm text-slate-300 hover:text-white group"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-brand-400 group-hover:border-brand-500 transition-colors">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </div>
                  <span className="hidden lg:inline font-medium">{user?.firstName}</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl shadow-md shadow-brand-600/30 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  Create ResQTag
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
          >
            How It Works
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                <LayoutDashboard className="w-5 h-5 text-brand-400" />
                Dashboard
              </Link>
              <Link
                to="/qr"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                <QrCode className="w-5 h-5 text-emerald-400" />
                My ResQTag
              </Link>
              <Link
                to="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                <Lock className="w-5 h-5 text-sky-400" />
                Privacy Controls
              </Link>
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800"
              >
                <User className="w-5 h-5 text-purple-400" />
                Account Settings
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-amber-400 hover:bg-amber-950/40"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Admin Dashboard
                </Link>
              )}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-rose-950/40"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-slate-200 bg-slate-800 font-semibold"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl text-white bg-brand-600 font-semibold shadow"
              >
                Create ResQTag
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
