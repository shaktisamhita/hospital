
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { HeartPulse, Key, ShieldAlert } from 'lucide-react';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass !== confirm) return setError('Error: Password confirmation does not match.');
    setError('');
    setLoading(true);
    try {
      await api.resetPassword(email, pass);
      alert('Access Key Updated! Please login with your new password.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Verification failed. This email is not in our records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-slate-50 p-4">
      {/* Top Branding */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">MedLink Hospital</h2>
        <div className="w-16 h-1.5 bg-blue-600 mx-auto rounded-full mt-2"></div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-white text-center">
          <Key className="w-12 h-12 mx-auto mb-4 text-blue-500" />
          <h1 className="text-2xl font-black uppercase tracking-tighter">Security Reset</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Verify identity to change access key</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2"><ShieldAlert className="w-4 h-4" />{error}</div>}
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered Email</label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-medium"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Access Key</label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-medium"
              placeholder="••••••••"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm New Key</label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 outline-none font-medium"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50 active:scale-95"
          >
            Update Security Key
          </button>

          <div className="text-center">
            <Link to="/login" className="text-slate-400 text-xs font-black uppercase tracking-widest hover:text-blue-600">Back to Authentication</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
