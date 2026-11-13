import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { AuthShell, AuthError, authInput, authIcon, authLabel, authButton } from '../components/AuthShell.jsx';

export function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();
  // e.g. "Account created successfully! Please sign in." after sign-up
  const notice = useLocation().state?.message;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      // Basic validation handled by 'required' formatting usually, but good to have
      return;
    }

    const result = await login(formData.email, formData.password);
    if (result.success) {
      const routeMap = {
        Admin: '/admin',
        admin: '/admin',
        Blogger: '/blogger',
        vendor: '/blogger',
        Manager: '/manager',
        manager: '/manager',
        Team: '/teams',
        team: '/teams',
        Outreach: '/outreach', // Outreach Team panel
        outreach: '/outreach',
        Writer: '/writer',
        writer: '/writer',
        Accountant: '/accountant',
        Client: '/client',
        client: '/client',
        super_admin: '/admin'
      };
      navigate(routeMap[result.role] || '/');
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to access your dashboard."
      footer={<>Don't have an account?{' '}<a href="/signup" className="text-violet-600 hover:text-violet-800 font-bold transition-colors">Create one</a></>}
    >
      {notice && !error && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">{notice}</p>
        </div>
      )}
      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={authLabel}>Email Address</label>
          <div className="relative group">
            <Mail className={authIcon} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={authInput}
              placeholder="name@company.com"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-slate-500 tracking-wider">Password</label>
            <a href="#" className="text-xs font-medium text-slate-500 hover:text-violet-700 transition-colors">Forgot password?</a>
          </div>
          <div className="relative group">
            <Lock className={authIcon} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={`${authInput} pr-12`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-900 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className={`${authButton} mt-2`}>
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <>
              Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
