import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AllergenPicker from './AllergenPicker';
import { User, Phone, Lock, ChevronRight, ChevronLeft, CheckCircle, Zap, Eye, EyeOff, ArrowRight } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { label: '🍲 Donor',       phone: '9000000001', password: 'demo123', bg: 'from-orange-500 to-amber-500' },
  { label: '🍽️ Beneficiary', phone: '9000000002', password: 'demo123', bg: 'from-blue-500 to-cyan-500' },
  { label: '🏢 NGO',         phone: '9000000003', password: 'demo123', bg: 'from-purple-500 to-violet-500' },
  { label: '🛵 Volunteer',   phone: '9000000004', password: 'demo123', bg: 'from-green-500 to-emerald-500' },
];

const ROLES = [
  { id: 'donor',     emoji: '🍲', title: 'Donor',        desc: 'Share surplus food',    accent: 'from-orange-500 to-amber-500' },
  { id: 'needer',   emoji: '🍽️', title: 'Beneficiary',  desc: 'Find free food nearby', accent: 'from-blue-500 to-cyan-500' },
  { id: 'volunteer', emoji: '🛵', title: 'Volunteer',    desc: 'Help deliver food',     accent: 'from-green-500 to-emerald-500' },
  { id: 'ngo',       emoji: '🏢', title: 'NGO / Org',   desc: 'Represent an org',      accent: 'from-purple-500 to-violet-500' },
];

const BRAND_QUOTES = [
  { text: '"No food should go to waste when someone is hungry."', author: 'FoodConnect Bharat' },
  { text: '"Every meal shared is a life touched."', author: 'Our Mission' },
  { text: '"Together we can end food insecurity."', author: 'Community First' },
];

export default function AuthPage({ defaultTab = 'login' }) {
  const [tab, setTab]        = useState(defaultTab);
  const [step, setStep]      = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [quoteIdx]           = useState(() => Math.floor(Math.random() * BRAND_QUOTES.length));

  const [loginData, setLoginData] = useState({ phone: '', password: '' });
  const [regData, setRegData]     = useState({
    name: '', phone: '', password: '', role: 'donor',
    dietaryPref: 'any', allergyProfile: [], allergyNotes: '',
  });

  const { login } = useAuth();
  const navigate  = useNavigate();

  const callAuth = async (url, body) => {
    const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    login(data.user, data.token);
    navigate('/');
  };

  const demoLogin = async (phone, password) => {
    setLoading(true);
    try { await callAuth('http://localhost:5000/api/auth/login', { phone, password }); }
    catch (err) { alert(`Demo login failed: ${err.message}`); }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await callAuth('http://localhost:5000/api/auth/login', loginData); }
    catch (err) { alert(err.message); }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try { await callAuth('http://localhost:5000/api/auth/register', regData); }
    catch (err) { alert(err.message); }
    setLoading(false);
  };

  const quote = BRAND_QUOTES[quoteIdx];

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 p-10 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-orange-500/10 blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-orange-600/10 blur-3xl translate-y-1/3 -translate-x-1/3" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            🍱 FoodConnect
          </div>
          <div className="text-orange-400 text-sm font-semibold mt-1">Bharat</div>
        </div>

        {/* Quote */}
        <div className="relative z-10 space-y-4">
          <blockquote className="text-white/90 text-xl font-medium leading-relaxed" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            {quote.text}
          </blockquote>
          <p className="text-orange-400 text-sm font-semibold">— {quote.author}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { val: '10K+', label: 'Meals Shared' },
              { val: '500+', label: 'Donors' },
              { val: '50+',  label: 'NGO Partners' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
                <div className="text-xl font-black text-orange-400">{s.val}</div>
                <div className="text-white/60 text-[11px] font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-white/30 text-xs font-medium">
          No food waste. Only love. 🧡
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4 py-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-5">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-2">
            <div className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              🍱 FoodConnect Bharat
            </div>
          </div>

          {/* ── Demo tiles ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <Zap size={11} className="text-orange-500" /> Try a demo account
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.phone} type="button" disabled={loading}
                  onClick={() => demoLogin(acc.phone, acc.password)}
                  className={`bg-gradient-to-r ${acc.bg} text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 shadow-sm`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              password: <code className="bg-slate-100 px-1 rounded font-mono text-slate-500">demo123</code>
            </p>
          </div>

          {/* ── Tab switcher ── */}
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
            {['login', 'register'].map(t => (
              <button key={t} type="button"
                onClick={() => { setTab(t); setStep(1); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {t === 'login' ? '🔑 Sign In' : '✨ Register'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── LOGIN ── */}
            {tab === 'login' && (
              <motion.div key="login"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5"
              >
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Welcome back 👋
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Sign in to continue helping your community.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input required type="tel" placeholder="10-digit mobile number"
                        value={loginData.phone}
                        onChange={e => setLoginData({ ...loginData, phone: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input required type={showPwd ? 'text' : 'password'} placeholder="Your password"
                        value={loginData.password}
                        onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
                    ) : (
                      <>Sign In <ArrowRight size={15} /></>
                    )}
                  </button>
                </form>

                <p className="text-center text-slate-500 text-xs">
                  No account?{' '}
                  <button type="button" onClick={() => setTab('register')} className="text-orange-600 font-bold hover:underline">
                    Create one →
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── REGISTER ── */}
            {tab === 'register' && (
              <motion.div key="register"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="space-y-4"
              >
                {/* Step progress */}
                <div className="flex items-center gap-2 px-1">
                  {[1, 2].map(s => (
                    <React.Fragment key={s}>
                      <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-black transition-all ${
                        s < step ? 'bg-green-500 text-white' : s === step ? 'bg-orange-500 text-white shadow-md' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {s < step ? <CheckCircle size={14} /> : s}
                      </div>
                      {s < 2 && <div className={`flex-1 h-0.5 rounded-full transition-all ${s < step ? 'bg-green-400' : 'bg-slate-200'}`} />}
                    </React.Fragment>
                  ))}
                  <span className="text-xs font-semibold text-slate-400 ml-1">Step {step}/2</span>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {step === 1 ? 'Create account 🚀' : 'Dietary profile 🥗'}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                      {step === 1 ? 'Quick setup — no email needed.' : 'Help us match you with safe food.'}
                    </p>
                  </div>

                  <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleRegister}
                    className="space-y-4">

                    {step === 1 && (
                      <>
                        {/* Name */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                          <div className="relative">
                            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input required type="text" placeholder="Your full name"
                              value={regData.name} onChange={e => setRegData({ ...regData, name: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" />
                          </div>
                        </div>

                        {/* Phone */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Phone Number</label>
                          <div className="relative">
                            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input required type="tel" placeholder="10-digit mobile number"
                              value={regData.phone} onChange={e => setRegData({ ...regData, phone: e.target.value })}
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" />
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Password</label>
                          <div className="relative">
                            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input required type={showPwd ? 'text' : 'password'} placeholder="Min 6 characters" minLength={6}
                              value={regData.password} onChange={e => setRegData({ ...regData, password: e.target.value })}
                              className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition" />
                            <button type="button" onClick={() => setShowPwd(!showPwd)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        {/* Role */}
                        <div className="space-y-2 pt-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">I am a…</label>
                          <div className="grid grid-cols-2 gap-2">
                            {ROLES.map(r => (
                              <button type="button" key={r.id}
                                onClick={() => setRegData({ ...regData, role: r.id })}
                                className={`relative p-3 rounded-xl border text-left transition-all overflow-hidden ${
                                  regData.role === r.id
                                    ? 'border-orange-400 shadow-md bg-orange-50'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                                }`}>
                                {regData.role === r.id && (
                                  <div className={`absolute inset-0 bg-gradient-to-br ${r.accent} opacity-5`} />
                                )}
                                <span className="text-xl">{r.emoji}</span>
                                <p className="text-sm font-bold text-slate-800 mt-1 leading-tight">{r.title}</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
                                {regData.role === r.id && (
                                  <CheckCircle size={13} className="text-orange-500 absolute top-2.5 right-2.5" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button type="submit"
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2">
                          Continue <ChevronRight size={15} />
                        </button>
                      </>
                    )}

                    {step === 2 && (
                      <>
                        {/* Diet pref */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dietary Preference</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { val: 'veg',  label: '🥦 Veg' },
                              { val: 'jain', label: '🌿 Jain' },
                              { val: 'any',  label: '🍗 Non-veg' },
                            ].map(p => (
                              <button type="button" key={p.val}
                                onClick={() => setRegData({ ...regData, dietaryPref: p.val })}
                                className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${
                                  regData.dietaryPref === p.val
                                    ? 'border-green-400 bg-green-50 text-green-700 shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                }`}>
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Allergens */}
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            {regData.role === 'donor' ? 'Ingredients in your food' : 'Allergens to avoid'}
                          </label>
                          <AllergenPicker
                            mode={regData.role === 'donor' ? 'donor' : 'needer'}
                            selected={regData.allergyProfile}
                            onChange={ap => setRegData({ ...regData, allergyProfile: ap })}
                          />
                        </div>

                        <div className="flex gap-3 pt-1">
                          <button type="button" onClick={() => setStep(1)}
                            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 text-sm font-bold transition">
                            <ChevronLeft size={15} /> Back
                          </button>
                          <button type="submit" disabled={loading}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm shadow-md hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? (
                              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
                            ) : '🎉 Join Now'}
                          </button>
                        </div>

                        <button type="button" onClick={handleRegister}
                          className="w-full text-slate-400 text-xs py-1 hover:text-slate-600 transition font-medium">
                          Skip dietary setup →
                        </button>
                      </>
                    )}
                  </form>

                  <p className="text-center text-slate-500 text-xs mt-6">
                    Already have an account?{' '}
                    <button type="button" onClick={() => setTab('login')} className="text-orange-600 font-bold hover:underline">
                      Sign in →
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-slate-400 text-xs pb-2">
            Community guidelines apply · No food waste, only love 🧡
          </p>
        </div>
      </div>
    </div>
  );
}
