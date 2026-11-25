import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
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
    }, 400);
  };

  const handleM365Login = () => {
    setIsLoading(true);
    toast.info('Authenticating', 'Connecting to Microsoft Entra ID...');
    setTimeout(() => {
      loginWithMicrosoft();
      setIsLoading(false);
      toast.success('Entra ID Verified', 'Logged in as ibex.triage@aoscaustralia.com');
      navigate(from, { replace: true });
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F5F7F8] text-[#202B35] flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#E3E9ED] bg-[#FFFFFF]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#16877A] flex items-center justify-center text-white shadow-2xs">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base text-[#172B3A] tracking-tight">
              Email Triage
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-[#E8F4F1] text-[#16877A] border border-[#C6E6DF]">
              Enterprise v2.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#687786]">
          <span className="w-2 h-2 rounded-full bg-[#16877A]" />
          <span>Graph Delta Sync Operational</span>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-[#FFFFFF] border border-[#E3E9ED] rounded-xl shadow-sm p-8 space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-[#172B3A] tracking-tight">
              Sign in to your practice
            </h1>
            <p className="text-xs text-[#687786]">
              Secure financial email management & automated reconciliation
            </p>
          </div>

          {/* Microsoft 365 Direct SSO */}
          <button
            type="button"
            onClick={handleM365Login}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-[#FFFFFF] hover:bg-[#F5F7F8] border border-[#E3E9ED] hover:border-[#B0BEC7] rounded-lg text-xs font-semibold text-[#202B35] transition cursor-pointer shadow-2xs disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Continue with Microsoft 365
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E3E9ED]" />
            <span className="text-[11px] font-mono text-[#687786] uppercase">or email credentials</span>
            <div className="flex-1 h-px bg-[#E3E9ED]" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#202B35] mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687786]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="accountant@yourpractice.com.au"
                  className="w-full pl-9 pr-3 py-2 bg-[#F5F7F8] border border-[#E3E9ED] rounded-lg outline-none focus:border-[#16877A] text-[#202B35] placeholder:text-[#687786]"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#202B35] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#687786]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-9 py-2 bg-[#F5F7F8] border border-[#E3E9ED] rounded-lg outline-none focus:border-[#16877A] text-[#202B35] placeholder:text-[#687786]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687786] hover:text-[#202B35]"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#16877A] focus:ring-[#16877A]"
                />
                <span className="text-[11px] text-[#687786]">Remember device</span>
              </label>
              <span className="text-[11px] text-[#16877A] hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#16877A] hover:bg-[#127267] text-white rounded-lg font-medium transition cursor-pointer shadow-2xs flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <span>{isLoading ? 'Verifying...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="p-3 rounded-lg bg-[#E8F4F1]/60 border border-[#C6E6DF] flex items-center gap-2 text-[11px] text-[#16877A]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Encrypted with AES-256 and verified for Australian Practice Compliance.</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-[#E3E9ED] bg-[#FFFFFF] flex flex-col sm:flex-row items-center justify-between text-xs text-[#687786] gap-2">
        <span>© 2026 Email Triage — Enterprise Financial Operations Platform</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-[#202B35] cursor-pointer">Security Protocol</span>
          <span className="hover:text-[#202B35] cursor-pointer">Privacy Box</span>
          <span className="hover:text-[#202B35] cursor-pointer">Support</span>
        </div>
      </footer>
    </div>
  );
};
