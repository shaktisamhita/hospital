import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { User, Language } from './types';
import { TRANSLATIONS } from './constants';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ForgotPasswordPage from './pages/ForgotPassword';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import BookAppointment from './pages/BookAppointment';
import ChatBot from './components/ChatBot';
import { LogOut, HeartPulse } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

const AuthContext = createContext<AuthContextType | null>(null);
const LanguageContext = createContext<LanguageContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900 tracking-tighter block leading-none uppercase">{t('hospital_name')}</span>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{t('hospital_tagline')}</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['en', 'gu', 'hi'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                    language === lang ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {lang === 'en' ? 'EN' : lang === 'gu' ? 'GJ' : 'HI'}
                </button>
              ))}
            </div>

            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                    {user.firstName[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user.firstName} {user.lastName}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex items-center gap-2 text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all"
                  title={t('logout')}
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="flex gap-4">
                <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-blue-600 uppercase tracking-tighter">{t('login')}</Link>
                <Link to="/register" className="text-sm font-bold text-blue-600 border border-blue-600 px-4 py-1.5 rounded-lg hover:bg-blue-50 uppercase tracking-tighter">{t('register')}</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const ProtectedRoute = ({ children, role }: { children: React.ReactNode, role?: 'PATIENT' | 'DOCTOR' }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'PATIENT' ? '/patient' : '/doctor'} />;
  }
  return <>{children}</>;
};

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('medlink_lang') as Language) || 'en';
  });

  useEffect(() => {
    const saved = localStorage.getItem('medlink_session');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('medlink_session', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('medlink_session');
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('medlink_lang', lang);
  };

  const t = (key: keyof typeof TRANSLATIONS['en']): string => {
    return TRANSLATIONS[language][key] || TRANSLATIONS['en'][key];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleLanguageChange, t }}>
      <AuthContext.Provider value={{ user, login, logout }}>
        <HashRouter>
          <div className="min-h-screen flex flex-col bg-slate-50">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                
                <Route path="/patient" element={
                  <ProtectedRoute role="PATIENT">
                    <PatientDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/doctor" element={
                  <ProtectedRoute role="DOCTOR">
                    <DoctorDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/book" element={
                  <ProtectedRoute role="PATIENT">
                    <BookAppointment />
                  </ProtectedRoute>
                } />
                
                <Route path="/" element={<Navigate to={user ? (user.role === 'PATIENT' ? '/patient' : '/doctor') : '/login'} />} />
              </Routes>
            </main>
            <ChatBot />
            <footer className="py-8 text-center text-slate-400 text-[10px] border-t border-slate-200 font-bold uppercase tracking-widest">
              &copy; 2025 {t('hospital_name')} • SECURE HEALTHCARE PORTAL
            </footer>
          </div>
        </HashRouter>
      </AuthContext.Provider>
    </LanguageContext.Provider>
  );
};

export default App;
