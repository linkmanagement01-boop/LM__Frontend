import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, User, Phone, MessageCircle, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { AuthShell, AuthError, authInput, authIcon, authLabel, authButton } from '../components/AuthShell.jsx';

/**
 * SignupPage - Blogger Registration
 * Official signup page for new blogger users
 */
export function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    whatsapp: '',
    skype: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // 'form' or 'verify'
  const [code, setCode] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const sendCode = async () => {
    await api.post('/auth/register/send-code', formData);
    setStep('verify');
    setCode('');
    setCooldown(60);
    setInfo(`We sent a 6-digit code to ${formData.email}. It expires in 10 minutes.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || formData.name.trim().length < 2) return setError('Name is required');
    if (!formData.email || !formData.email.includes('@')) return setError('Invalid email address');
    if (!formData.password || formData.password.length < 8) return setError('Password too short (min 8 chars)');
    if (formData.password !== formData.confirm_password) return setError('Passwords do not match');
    if (!formData.whatsapp) return setError('WhatsApp number is required');
    if (!formData.skype) return setError('Skype ID is required');

    try {
      setLoading(true);
      await sendCode();
    } catch (err) {
      setError(err.message || 'Could not send the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email');

    try {
      setLoading(true);
      await api.post('/auth/register/verify', { email: formData.email, code });
      navigate('/login', { state: { message: 'Account created successfully! Please sign in.' } });
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try {
      setLoading(true);
      await sendCode();
    } catch (err) {
      setError(err.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      wide
      title={step === 'verify' ? 'Check your email' : 'Create your account'}
      subtitle={step === 'verify' ? 'Enter the code we sent to finish creating your account.' : 'Join the exclusive network of premium publishers.'}
      footer={<>Already have an account?{' '}<Link to="/login" className="text-violet-600 hover:text-violet-800 font-bold transition-colors">Sign in here</Link></>}
    >
      <AuthError message={error} />

      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Name */}
          <div>
            <label className={authLabel}>Full Name</label>
            <div className="relative group">
              <User className={authIcon} />
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className={authInput} placeholder="John Doe" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className={authLabel}>Email</label>
            <div className="relative group">
              <Mail className={authIcon} />
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className={authInput} placeholder="you@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* WhatsApp */}
            <div>
              <label className={authLabel}>WhatsApp</label>
              <div className="relative group">
                <Phone className={authIcon} />
                <input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} required className={authInput} placeholder="+1 234..." />
              </div>
            </div>

            {/* Skype */}
            <div>
              <label className={authLabel}>Skype ID</label>
              <div className="relative group">
                <MessageCircle className={authIcon} />
                <input type="text" name="skype" value={formData.skype} onChange={handleChange} required className={authInput} placeholder="live:skype" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Password */}
            <div>
              <label className={authLabel}>Password</label>
              <div className="relative group">
                <Lock className={authIcon} />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} required className={`${authInput} pr-12`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-900 transition-colors"><Eye className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className={authLabel}>Confirm</label>
              <div className="relative group">
                <Lock className={authIcon} />
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirm_password" value={formData.confirm_password} onChange={handleChange} required className={`${authInput} pr-12`} placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-900 transition-colors"><Eye className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className={`${authButton} mt-2`}>
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                Register Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerify} className="space-y-5">
          {info && (
            <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl">
              <p className="text-sm text-violet-800 font-medium">{info}</p>
            </div>
          )}

          <div>
            <label className={authLabel}>Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); if (error) setError(''); }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-center text-2xl tracking-[0.5em] font-bold text-slate-900 focus:outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-500/15 transition-all duration-200"
              placeholder="------"
            />
          </div>

          <button type="submit" disabled={loading || code.length !== 6} className={authButton}>
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Verify & Create Account'
            )}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setStep('form'); setError(''); setInfo(''); }}
              className="text-slate-500 hover:text-slate-900 font-medium"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="text-violet-600 hover:text-violet-800 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
