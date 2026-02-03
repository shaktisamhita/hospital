import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth, useLanguage } from '../App';
import { HeartPulse, Lock, Mail } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await api.login(email, password);
      login(user);
      navigate(user.role === 'PATIENT' ? '/patient' : '/doctor');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-slate-50 p-4">
      {/* Top Branding */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{t('hospital_name')}</h2>
        <div className="w-16 h-1.5 bg-blue-600 mx-auto rounded-full mt-2"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl mb-4">
            <HeartPulse className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-tight">{t('login')}</h1>
          <p className="text-slate-400 text-xs mt-2 font-medium uppercase tracking-widest">{t('welcome')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 font-medium">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t('email')}</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t('password')}</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            {/* Fix: Changed 'class' to 'className' for React compliance */}
            <Link to="/forgot-password" className="text-blue-600 text-xs font-black uppercase tracking-widest hover:underline">
              {t('forgot_access')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95"
          >
            {loading ? '...' : t('secure_login')}
          </button>

          <div className="text-center pt-4">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              New here?{' '}
              <Link to="/register" className="text-blue-600 hover:underline">
                {t('create_account')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
