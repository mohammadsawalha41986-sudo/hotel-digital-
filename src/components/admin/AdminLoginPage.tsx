import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { loginAdmin } from '../../services/authService';
import { isFirebaseConfigured } from '../../services/firebase';
import { AdminUser } from '../../types/auth';

interface AdminLoginPageProps {
  onLoginSuccess: (user: AdminUser) => void;
  onBackToGuestPortal: () => void;
  hotelName?: string;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onBackToGuestPortal,
  hotelName = 'Swiss Flora Royal Hotel Riyadh',
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both your work email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await loginAdmin(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      const msg =
        err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found'
          ? 'Invalid staff credentials. Please check your email and password.'
          : err?.code === 'auth/too-many-requests'
          ? 'Too many failed login attempts. Please wait a few moments and try again.'
          : err?.message || 'Authentication failed. Please verify your staff credentials.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 text-stone-100 relative overflow-hidden selection:bg-amber-500 selection:text-stone-950">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-stone-900/90 border border-stone-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
        {/* Header Branding */}
        <div className="text-center space-y-2 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Shield size={28} className="text-amber-400" />
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-wide">
            Staff Control Center
          </h1>
          <p className="text-xs text-stone-400">
            Secure administrative and operational access for {hotelName}
          </p>
        </div>

        {/* Development Fallback Notice Banner */}
        {!isFirebaseConfigured && (
          <div className="mb-6 p-3 rounded-xl bg-amber-950/40 border border-amber-600/30 text-amber-300 text-xs flex items-start gap-2.5">
            <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold">Local Fallback Mode Active:</span> Firebase credentials not configured. You can sign in using any work email (e.g. <code className="bg-stone-800 px-1 py-0.5 rounded text-amber-200">admin@hotel.com</code>) with any 6+ char password.
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-stone-300 font-semibold mb-1.5" htmlFor="staff-email">
              Work Email Address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                id="staff-email"
                type="email"
                required
                autoComplete="email"
                placeholder="staff.member@hotel.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1.5" htmlFor="staff-password">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                id="staff-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-3 py-2.5 text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Authenticating Staff...</span>
              </>
            ) : (
              <>
                <span>Sign In to Admin Hub</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Back to Live Guest Portal Button */}
        <div className="mt-6 pt-6 border-t border-stone-800/80 text-center">
          <button
            type="button"
            onClick={onBackToGuestPortal}
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <ExternalLink size={13} className="text-amber-400" />
            <span>Return to Public Guest Portal</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-stone-500 text-[11px] space-y-1">
        <p>Enterprise Hospitality Staff Authentication • Multi-Tenant Tenant Isolation</p>
        <p>Unauthorized access attempts are monitored and recorded.</p>
      </footer>
    </div>
  );
};
