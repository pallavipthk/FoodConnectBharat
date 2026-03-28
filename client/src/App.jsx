import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import HowItWorks from './pages/HowItWorks';
import Sustainability from './pages/Sustainability';
import CSR from './pages/CSR';
import UserCSR from './pages/UserCSR';
import Achievements from './pages/Achievements';
import WhyUs from './pages/WhyUs';
import VerificationHub from './pages/VerificationHub';
import Footer from './components/Footer';
import Register from './components/Register';
import Profile from './pages/Profile';
import DonationForm from './components/DonationForm';
import RequestPage from './components/RequestPage';
import FulfillerRequestsPage from './components/FulfillerRequestsPage';
import Dashboard from './components/Dashboard';

import { 
  MapPin, User, Utensils, LogOut, Menu, X, 
  Plus, HeartHandshake, Trophy, Zap, ClipboardList, 
  Info, Leaf, Building2, Star, HelpCircle, Truck, ShieldCheck
} from 'lucide-react';

// ── Protected route wrapper ────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Navbar ─────────────────────────────────────────────
function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const NAV = user ? [
    { to: '/dashboard',     icon: MapPin,         label: 'Live Map' },
    { to: '/achievements',  icon: Trophy,         label: 'Achievements' },
    ...(user.role !== 'needer' ? [{ to: '/csr-hub', icon: Building2, label: 'CSR Hub' }] : []),
    // Restoring requests management for donors/vols/ngos
    ...(user.role === 'donor' ? [{ to: '/my-requests', icon: Utensils, label: 'My Food' }] : []),
    ...(user.role === 'needer' ? [{ to: '/my-requests', icon: Utensils, label: 'My Requests' }] : []),
    ...(user.role === 'ngo' || user.role === 'volunteer' ? [
      { to: '/fulfill-requests', icon: Truck, label: 'Deliveries' },
      { to: '/verification-hub', icon: ShieldCheck, label: 'Verifications' }
    ] : []),
  ] : [
    { to: '/why-us',        icon: HelpCircle,     label: 'Why Us?' },
    { to: '/how-it-works', icon: Info,            label: 'Process' },
    { to: '/sustainability', icon: Leaf,          label: 'ESG Impact' },
    { to: '/csr',           icon: Building2,      label: 'For Business' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[9999] h-16"
      style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5">
          <div className="btn-primary w-9 h-9 rounded-xl flex items-center justify-center shadow-lg">
            <Utensils size={18} className="text-white" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Food<span className="text-orange-500">Connect</span>
          </span>
          <span className="hidden sm:block text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 tracking-widest uppercase">
            Bharat
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isActive ? 'bg-orange-50 text-orange-600' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`
              }>
              <Icon size={14} />{label}
            </NavLink>
          ))}

          {user ? (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-slate-200">
              <Link to="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition text-sm shadow-sm">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-xs font-bold text-white">
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-slate-800 font-medium">{user.name.split(' ')[0]}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-orange-50 text-orange-600">{user.role}</span>
              </Link>
              <button onClick={logout} className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition" title="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-3">
              <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition">Login</Link>
              <Link to="/register" className="btn-primary px-4 py-2 rounded-xl text-sm font-bold text-white shadow-md">Join Free</Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 text-slate-500" onClick={() => setOpen(o => !o)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden px-4 pb-4 pt-2 space-y-1 border-t border-slate-100 shadow-lg"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium">
              <Icon size={14} />{label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium">
                <User size={14} />{user.name}
              </Link>
              <button onClick={() => { logout(); setOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 font-medium">
                <LogOut size={14} />Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <Link to="/login" onClick={() => setOpen(false)} className="text-center px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm">Login</Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary text-center px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md">Join Free</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

import Hero3D from './components/Hero3D';

function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return (
    <div className="min-h-screen flex flex-col items-center px-4 pt-32 pb-20 text-center relative bg-slate-50">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Hero3D />
      </div>
      
      {/* Animated Background decorations */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-br from-orange-400/20 to-rose-400/20 blur-[120px] rounded-full pointer-events-none" 
      />
      <motion.div 
        animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-blue-400/20 to-purple-400/20 blur-[120px] rounded-full pointer-events-none" 
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 font-bold uppercase tracking-widest mb-8 z-10 shadow-sm"
      >
        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> Live across India
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.6 }}
        className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 leading-tight z-10" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
      >
        No Food Should<br />
        <span className="bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">Go to Waste</span>
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
        className="text-slate-600 text-lg md:text-xl max-w-2xl mb-12 z-10 font-medium"
      >
        FoodConnect Bharat acts as a real-time bridge between individuals, restaurants, and NGOs with surplus food to those in need. Safe, verified, and community-driven.
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
        className="flex flex-wrap gap-4 justify-center mb-16 z-10"
      >
        <Link to="/register" className="btn-primary px-8 py-3.5 rounded-2xl text-white font-bold text-lg shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 transform hover:-translate-y-1 transition-all">
          Join Free →
        </Link>
        <Link to="/login" className="px-8 py-3.5 rounded-2xl border-2 border-slate-200 bg-white text-slate-700 font-bold text-lg hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all transform hover:-translate-y-1">
          Login
        </Link>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full z-10 mb-16"
      >
        {[['🍲','12,480+','Meals Successfully Saved'],['🧑‍🤝‍🧑','348','Active Registered Donors'],['⚡','4 min','Average Response Time']].map(([e,v,l], i) => (
          <motion.div 
            key={l} whileHover={{ y: -5 }}
            className="glass-card px-6 py-8 flex flex-col items-center gap-3 shadow-sm border border-slate-100/50 hover:shadow-lg transition-all bg-white/60 backdrop-blur-xl rounded-3xl"
          >
            <div className="w-16 h-16 flex items-center justify-center bg-white rounded-2xl shadow-sm text-3xl mb-2">{e}</div>
            <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{v}</span>
            <span className="text-sm text-slate-500 font-bold uppercase tracking-wider text-center">{l}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick demo bar on landing too */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.5 }}
        className="glass-card p-6 w-full max-w-3xl space-y-5 shadow-xl border border-slate-200 bg-white/80 z-10 rounded-3xl"
      >
        <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-600 tracking-wider uppercase">
          <Zap size={16} className="text-orange-500" /> Try out our Live Demo Accounts
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '🍲 Donor',  phone: '9000000001', color: 'border-orange-500/40 bg-white shadow-sm text-orange-600 hover:bg-orange-50 hover:border-orange-500' },
            { label: '🍽️ Receiver', phone: '9000000002', color: 'border-blue-500/40 bg-white shadow-sm text-blue-600 hover:bg-blue-50 hover:border-blue-500' },
            { label: '🏢 NGO',    phone: '9000000003', color: 'border-purple-500/40 bg-white shadow-sm text-purple-600 hover:bg-purple-50 hover:border-purple-500' },
            { label: '🛵 Volunteer', phone: '9000000004', color: 'border-green-500/40 bg-white shadow-sm text-green-600 hover:bg-green-50 hover:border-green-500' },
          ].map(acc => (
            <QuickDemo key={acc.phone} {...acc} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function QuickDemo({ label, phone, color }) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigateShim();

  const go = async () => {
    setLoading(true);
    try {
      const res  = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password: 'demo123' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  return (
    <button type="button" disabled={loading} onClick={go}
      className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all text-center disabled:opacity-50 ${color}`}>
      {label}
    </button>
  );
}

// tiny hook shim so QuickDemo can call navigate without being inside Router context issues

function useNavigateShim() { return useNavigate(); }

// ── Standalone page wrappers ───────────────────────────
function DonatePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        🍲 Donate Food
      </h2>
      <DonationForm setDonations={() => {}} />
    </div>
  );
}


function LeaderboardPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-6" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        🏆 Leaderboard
      </h2>
      <Leaderboard />
    </div>
  );
}

// ── App ────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans selection:bg-orange-500/30">
          <Navbar />
          <main className="pt-16">
            <Routes>
              {/* Public */}
              <Route path="/"                 element={<Landing />} />
              <Route path="/how-it-works"    element={<HowItWorks />} />
              <Route path="/sustainability"   element={<Sustainability />} />
              <Route path="/login"            element={<Register defaultTab="login" />} />
              <Route path="/register"         element={<Register defaultTab="register" />} />

              {/* Protected */}
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/donate" element={
                <ProtectedRoute roles={['donor','ngo','volunteer']}><DonatePage /></ProtectedRoute>
              } />
              <Route path="/request" element={
                <ProtectedRoute roles={['needer','ngo', 'donor', 'volunteer']}><RequestPage /></ProtectedRoute>
              } />
              <Route path="/my-requests" element={
                <ProtectedRoute roles={['donor','needer']}><FulfillerRequestsPage /></ProtectedRoute>
              } />
              <Route path="/fulfill-requests" element={
                <ProtectedRoute roles={['ngo','volunteer']}><FulfillerRequestsPage /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><Profile /></ProtectedRoute>
              } />
              <Route path="/leaderboard" element={
                <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
              } />
              <Route path="/csr" element={<CSR />} />
              <Route path="/csr-hub" element={
                <ProtectedRoute roles={['donor','ngo','volunteer']}><UserCSR /></ProtectedRoute>
              } />
              <Route path="/verification-hub" element={
                <ProtectedRoute roles={['volunteer','ngo']}><VerificationHub /></ProtectedRoute>
              } />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/why-us" element={<WhyUs />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
