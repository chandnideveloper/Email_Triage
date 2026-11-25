import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

export const Login: React.FC = () => {
  const { login, loginWithMicrosoft } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Missing Email', 'Please enter your work email address.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      login(email);
      setIsLoading(false);
      toast.success('Signed In', `Welcome back to Email Triage.`);
      navigate(from, { replace: true });
    }, 600);
  };

  const handleM365Login = () => {
    setIsLoading(true);
    toast.info('Authenticating', 'Connecting to Microsoft Entra ID...');
    setTimeout(() => {
      loginWithMicrosoft();
      setIsLoading(false);
      toast.success('Entra ID Verified', 'Logged in as ibex.triage@aoscaustralia.com');
      navigate(from, { replace: true });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-indigo-600 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[360px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[420px] h-[260px] bg-purple-600/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-slate-800/60 relative z-10 bg-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 ring-1 ring-white/20">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Email Triage
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              v2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-[11px] font-medium text-emerald-400">System Online</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Ibex AI Classification Engine</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Sign in to Practice Triage
            </h1>
            <p className="text-xs text-slate-400">
              Microsoft 365 Shared Mailbox Ingestion & AI Accounting Dispatch
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-slate-800/90 bg-[#0E1524]/90 backdrop-blur-xl shadow-2xl shadow-indigo-950/20 space-y-5">
            {/* 1-Click Microsoft 365 SSO */}
            <button
              onClick={handleM365Login}
              disabled={isLoading}
              type="button"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-indigo-500/50 text-xs font-semibold text-white transition active:scale-[0.98] shadow-sm group cursor-pointer"
            >
              {/* Microsoft 4-square logo */}
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4 shrink-0">
                <div className="bg-[#f25022] w-1.5 h-1.5 rounded-[1px]" />
                <div className="bg-[#7fba00] w-1.5 h-1.5 rounded-[1px]" />
                <div className="bg-[#00a4ef] w-1.5 h-1.5 rounded-[1px]" />
                <div className="bg-[#ffb900] w-1.5 h-1.5 rounded-[1px]" />
              </div>
              <span>Sign in with Microsoft 365 (Entra ID)</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-slate-800" />
              <span className="absolute px-3 bg-[#0E1524] text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium">
                or email
              </span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="accountant@yourpractice.com.au"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500 text-xs transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info('Password Reset', 'Check with your Microsoft Entra administrator.')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-slate-900/80 border border-slate-800 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500 text-xs font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-[11px] text-slate-400 font-medium">Remember for 30 days</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition shadow-lg shadow-indigo-500/25 active:scale-[0.98] cursor-pointer"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign in to Dashboard'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Dev Access Shortcuts */}
            <div className="pt-3 border-t border-slate-800/80">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block mb-2">
                Quick Dev Access:
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    login('a.wright@yourpractice.com.au', 'A. Wright', 'Partner');
                    navigate(from, { replace: true });
                  }}
                  className="px-2.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800 text-slate-300 truncate text-left transition cursor-pointer font-medium"
                >
                  👤 Partner (A. Wright)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    login('ibex.triage@aoscaustralia.com', 'Ibex Admin', 'Practice Admin');
                    navigate(from, { replace: true });
                  }}
                  className="px-2.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800 text-slate-300 truncate text-left transition cursor-pointer font-medium"
                >
                  🏢 Admin (AOSC)
                </button>
              </div>
            </div>
          </div>

          {/* Security badge footer */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Microsoft Entra ID
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              256-bit AES
            </span>
            <span>•</span>
            <span className="text-slate-400">SOC2 Ready</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/60 text-center text-[11px] text-slate-500 font-medium relative z-10 bg-transparent">
        © 2026 AOSC Technologies & Ibex Readiness. All rights reserved.
      </footer>
    </div>
  );
};
