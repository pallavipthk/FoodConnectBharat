import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils, AlertTriangle, MapPin, RefreshCw, Sparkles, Clock,
  Heart, CheckCircle2, Truck, Users, Filter, ArrowLeft, Plus,
  Package, HandHeart, ShieldAlert, ChevronRight, Zap,
} from 'lucide-react';

// ── Urgency badge ──────────────────────────────────────────
function UrgencyBadge({ isSOS }) {
  if (!isSOS) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
      <ShieldAlert size={9} /> SOS
    </span>
  );
}

// ── Diet badge ─────────────────────────────────────────────
const DIET_COLORS = {
  veg:  'bg-green-100 text-green-700 border-green-200',
  jain: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  nonveg: 'bg-red-100 text-red-700 border-red-200',
  any:  'bg-slate-100 text-slate-600 border-slate-200',
};

// ── Role CTA config ────────────────────────────────────────
const ROLE_CONFIG = {
  donor: {
    color:     'from-orange-500 to-amber-500',
    ctaLabel:  'I Can Donate Food',
    ctaIcon:   Utensils,
    ctaAction: (r, navigate) => navigate('/donate', { state: { targetRequest: r } }),
    badge:     'bg-orange-500/10 text-orange-600 border-orange-500/20',
    label:     'Donor',
  },
  ngo: {
    color:     'from-purple-500 to-indigo-500',
    ctaLabel:  'Assign & Fulfill',
    ctaIcon:   HandHeart,
    ctaAction: (r, navigate) => navigate('/donate', { state: { targetRequest: r } }),
    badge:     'bg-purple-500/10 text-purple-600 border-purple-500/20',
    label:     'NGO',
  },
  volunteer: {
    color:     'from-green-500 to-emerald-500',
    ctaLabel:  "I'll Deliver This",
    ctaIcon:   Truck,
    ctaAction: async (r) => {
      const tok = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/requests/${r._id}/volunteer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed'); return; }
      alert('✅ Delivery accepted!');
    },
    badge:     'bg-green-500/10 text-green-700 border-green-500/20',
    label:     'Volunteer',
  },
};

const FILTERS = ['all', 'sos', 'veg', 'nonveg', 'jain', 'any'];

export default function FulfillerRequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || 'donor';
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.donor;

  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [filter, setFilter]         = useState('all');
  const [livePos, setLivePos]       = useState([19.213768, 72.865273]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setLivePos([p.coords.latitude, p.coords.longitude]),
      () => {}
    );
  }, []);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res  = await fetch('http://localhost:5000/api/requests?nearby=true');
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { setRequests([]); }
    setLoading(false);
  };

  // ── Role-specific: Donor generates food donations ─────────
  const generateDonorDemos = async () => {
    const tok = localStorage.getItem('token');
    if (!tok) return alert('Please login first.');
    const [baseLat, baseLng] = livePos;
    const jitter = () => (Math.random() - 0.5) * 0.005;
    setDemoLoading(true);
    const items = [
      { foodType: 'veg',    quantity: '30 plates', address: 'Community Hall A',    latO: 0.002, lngO: 0.001 },
      { foodType: 'nonveg', quantity: '15 packets', address: 'Donor Kitchen B',    latO: -0.002, lngO: 0.003 },
      { foodType: 'jain',   quantity: '10 boxes',  address: 'Society Gate C',      latO: 0.003, lngO: -0.002 },
    ];
    await Promise.all(items.map(i =>
      fetch('http://localhost:5000/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify({
          foodType: i.foodType,
          foodCategory: 'ready-to-eat',
          quantity: i.quantity,
          description: `Demo surplus food donated by local donor — ${i.foodType}.`,
          location: { lat: baseLat + i.latO + jitter(), lng: baseLng + i.lngO + jitter(), address: i.address },
          preparedAt: new Date(),
          estimatedFreshFor: 12,
        })
      })
    ));
    alert('🍲 Demo food donations added! Check the map.');
    setDemoLoading(false);
  };

  // ── NGO generates food + requests ────────────────────────
  const generateNgoDemos = async () => {
    const tok = localStorage.getItem('token');
    if (!tok) return alert('Please login first.');
    const [baseLat, baseLng] = livePos;
    const jitter = () => (Math.random() - 0.5) * 0.005;
    setDemoLoading(true);
    await Promise.all([
      // food donations
      ...[ 
        { foodType: 'veg', quantity: '50 meals', address: 'NGO Relief Point', latO: 0.001, lngO: -0.003 },
      ].map(i => fetch('http://localhost:5000/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify({
          foodType: i.foodType, foodCategory: 'ready-to-eat', quantity: i.quantity,
          description: `NGO surplus demo — distributed from relief point.`,
          location: { lat: baseLat + i.latO + jitter(), lng: baseLng + i.lngO + jitter(), address: i.address },
          preparedAt: new Date(), estimatedFreshFor: 24,
        })
      })),
      // requests
      ...[
        { dietaryPref: 'any',  numberOfPeople: 20, isSOS: false, allergyNotes: 'Urban slum cluster.', latO: 0.004, lngO: 0.002 },
        { dietaryPref: 'veg',  numberOfPeople: 40, isSOS: true,  allergyNotes: 'Flood relief camp.',  latO: -0.005, lngO: -0.001 },
      ].map(r => fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify({
          dietaryPref: r.dietaryPref, numberOfPeople: r.numberOfPeople,
          isSOS: r.isSOS, allergyNotes: r.allergyNotes,
          location: { lat: baseLat + r.latO + jitter(), lng: baseLng + r.lngO + jitter(), address: 'Nearby Relief Area' }
        })
      })),
    ]);
    alert('🏢 NGO Demos: Food & Requests added!');
    await fetchRequests();
    setDemoLoading(false);
  };

  // ── Volunteer generates demo requests ─────────────────────
  const generateVolunteerDemos = async () => {
    const tok = localStorage.getItem('token');
    if (!tok) return alert('Please login first.');
    const [baseLat, baseLng] = livePos;
    const jitter = () => (Math.random() - 0.5) * 0.005;
    setDemoLoading(true);
    await Promise.all([
      { dietaryPref: 'any', numberOfPeople: 8, latO: 0.003, lngO: 0.001 },
      { dietaryPref: 'veg', numberOfPeople: 5, isSOS: true, latO: -0.002, lngO: 0.004 },
    ].map(r => fetch('http://localhost:5000/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
      body: JSON.stringify({
        dietaryPref: r.dietaryPref, numberOfPeople: r.numberOfPeople,
        isSOS: r.isSOS || false,
        location: { lat: baseLat + r.latO + jitter(), lng: baseLng + r.lngO + jitter() }
      })
    })));
    await fetchRequests();
    setDemoLoading(false);
  };

  const demoFn = role === 'donor' ? generateDonorDemos : role === 'ngo' ? generateNgoDemos : generateVolunteerDemos;
  const demoLabel = role === 'donor' ? '+ Add Demo Food' : role === 'ngo' ? '+ Demo Food & Requests' : '+ Add Demo Requests';

  // ── Filtered list ─────────────────────────────────────────
  const filtered = requests.filter(r => {
    if (filter === 'sos')    return r.isSOS;
    if (filter === 'all')    return true;
    return r.dietaryPref === filter;
  });

  const sosCount     = requests.filter(r => r.isSOS).length;
  const pendingCount = requests.length;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Hero Header ──────────────────────────────── */}
      <div className={`bg-gradient-to-r ${cfg.color} pt-12 pb-28 px-6 relative overflow-hidden`}>
        {/* decorative blobs */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-4 right-12 w-48 h-48 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 left-8 w-36 h-36 rounded-full bg-white blur-2xl" />
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate('/dashboard')}
              className="p-2.5 rounded-2xl bg-white/10 text-white backdrop-blur-md hover:bg-white/20 transition border border-white/10">
              <ArrowLeft size={18} />
            </button>
            <span className={`text-xs font-black px-3 py-1.5 rounded-full border bg-white/10 text-white border-white/20 uppercase tracking-widest`}>
              {cfg.label} View
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-white mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {role === 'donor' ? '🍲 Food Requests Near You' :
             role === 'ngo'   ? '🏢 Community Food Needs' :
                                '🛵 Deliveries Needed'}
          </h1>
          <p className="text-white/80 text-base font-medium max-w-xl">
            {role === 'donor'   ? 'People nearby are waiting for food. Donate today and see the change.' :
             role === 'ngo'     ? 'Manage, assign, and fulfill community food requests.' :
                                  'Accept deliveries and earn impact points on the leaderboard.'}
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            {[
              { icon: Heart,         label: 'Pending Requests', value: pendingCount },
              { icon: ShieldAlert,   label: 'SOS Urgent',       value: sosCount,   red: true },
              { icon: Users,         label: 'Avg People/Req',
                value: requests.length ? Math.round(requests.reduce((s,r) => s + (r.numberOfPeople||1), 0) / requests.length) : 0 },
            ].map(({ icon: Icon, label, value, red }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                <Icon size={18} className="text-white" />
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{label}</p>
                  <p className={`text-2xl font-black ${red && value > 0 ? 'text-red-200 animate-pulse' : 'text-white'}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#f8fafc] to-transparent" />
      </div>

      {/* ── Content Area ─────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 -mt-14 pb-20 space-y-6 relative z-10">

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Filters */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
            <Filter size={13} className="text-slate-400 shrink-0 ml-1" />
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold capitalize whitespace-nowrap transition-all flex items-center gap-1 ${
                  filter === f ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                } ${f === 'sos' ? (filter === 'sos' ? 'bg-red-500' : 'text-red-500') : ''}`}>
                {f === 'sos' && <ShieldAlert size={10} />}
                {f === 'all' ? 'All' : f.toUpperCase()}
                {f === 'sos' && sosCount > 0 && (
                  <span className="ml-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] font-black">
                    {sosCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <button onClick={fetchRequests} disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition">
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={demoFn} disabled={demoLoading}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition whitespace-nowrap ${
                role === 'donor' ? 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' :
                role === 'ngo'   ? 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100' :
                                   'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
              }`}>
              <Sparkles size={11} className={demoLoading ? 'animate-spin' : ''} /> {demoLabel}
            </button>
            {(role === 'donor' || role === 'ngo') && (
              <button onClick={() => navigate('/donate')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold text-white bg-orange-500 hover:bg-orange-600 border border-orange-600 transition shadow-sm">
                <Plus size={11} /> Donate Food
              </button>
            )}
          </div>
        </div>

        {/* Idea cards — role-specific suggestions ────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(role === 'donor' ? [
            { icon: '📦', title: 'Packed Surplus?', desc: 'List packaged items with exact expiry.' },
            { icon: '📍', title: 'Recurring Pickup', desc: 'Set a schedule for daily/weekly surplus.' },
            { icon: '📊', title: 'Impact Score', desc: 'Check the leaderboard to see your rank.' },
          ] : role === 'ngo' ? [
            { icon: '🗺️', title: 'Zone Mapping', desc: 'SOS clusters show where need is highest.' },
            { icon: '📋', title: 'Bulk Fulfill', desc: 'Assign multiple requests at once via batch.' },
            { icon: '📞', title: 'Direct Contact', desc: 'Call a needer directly from their card.' },
          ] : [
            { icon: '🛵', title: 'Accept Delivery', desc: 'Click "I\'ll Deliver This" on any card below.' },
            { icon: '⚡', title: 'SOS First', desc: 'Prioritise SOS requests — they earn 3× points.' },
            { icon: '🏆', title: 'Climb Ranks', desc: 'Every delivery adds to your leaderboard score.' },
          ]).map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0">{icon}</div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Requests Grid ──────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <h4 className="font-extrabold text-slate-700 mb-1">All caught up!</h4>
            <p className="text-sm text-slate-500 mb-6">No pending food requests right now. Use the demo button to generate sample data.</p>
            <button onClick={demoFn} disabled={demoLoading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm shadow-md bg-gradient-to-r ${cfg.color}`}>
              <Sparkles size={14} /> {demoLabel}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filtered.map(r => {
                const CTA = cfg.ctaIcon;
                return (
                  <motion.div key={r._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    whileHover={{ y: -2 }}
                    className={`bg-white rounded-3xl border shadow-sm p-5 flex flex-col gap-3 transition-all ${
                      r.isSOS ? 'border-red-200 bg-red-50/40 shadow-red-100' : 'border-slate-100'
                    }`}>

                    {/* Card header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <UrgencyBadge isSOS={r.isSOS} />
                        <span className="font-extrabold text-slate-800 text-sm">
                          {r.neederId?.role === 'ngo' ? '🏢 NGO Request' : '🤝 Community Request'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${DIET_COLORS[r.dietaryPref] || DIET_COLORS.any}`}>
                        {r.dietaryPref}
                      </span>
                    </div>

                    {/* People count */}
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <Users size={14} className="text-slate-400" />
                      <span>Feeding <strong>{r.numberOfPeople}</strong> people</span>
                    </div>

                    {/* Location */}
                    <p className="text-xs text-slate-500 flex items-start gap-1.5">
                      <MapPin size={11} className="shrink-0 mt-0.5 text-slate-400" />
                      {r.location?.address || 'Nearby location'}
                    </p>

                    {/* Requester name */}
                    {!r.isAnonymous && r.neederId?.name && (
                      <p className="text-xs text-slate-400">From: <span className="font-semibold text-slate-600">{r.neederId.name}</span></p>
                    )}

                    {/* Allergy notes */}
                    {r.allergyNotes && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-start gap-1.5">
                        <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                        {r.allergyNotes}
                      </div>
                    )}

                    {/* Time */}
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(r.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                    </p>

                    {/* CTA */}
                    <button
                      onClick={() => cfg.ctaAction(r, navigate)}
                      className={`w-full py-2.5 rounded-2xl text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md bg-gradient-to-r ${cfg.color} hover:opacity-90 transition-all active:scale-95`}>
                      <CTA size={13} /> {cfg.ctaLabel} <ChevronRight size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
