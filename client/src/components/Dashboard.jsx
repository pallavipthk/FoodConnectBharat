import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import RoleSelect from './RoleSelect';
import Map from './Map';
import DonationForm from './DonationForm';
import NeedForm from './NeedForm';
import SOSButton from './SOSButton';
import Leaderboard from './Leaderboard';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Plus, HeartHandshake, Utensils, Users, Clock,
  List, AlertTriangle, ChevronRight, Sparkles, RefreshCw,
  UtensilsCrossed, Heart, Zap, CheckCircle2
} from 'lucide-react';

// ── Hero stats ─────────────────────────────────
const STATS = [
  { label: 'Meals Saved', value: '12,480', icon: Utensils, color: 'from-orange-400 to-amber-500' },
  { label: 'Active Donors', value: '348', icon: Users, color: 'from-green-400 to-emerald-500' },
  { label: 'Avg Response', value: '4 min', icon: Clock, color: 'from-blue-400 to-cyan-500' },
];

// ── Food color map ──────────────────────────────
const FOOD_COLORS = {
  veg:      { dot: '#22c55e', label: '🌿 Veg',      badge: 'bg-green-100 text-green-700 border-green-200' },
  jain:     { dot: '#eab308', label: '🟡 Jain',     badge: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  nonveg:   { dot: '#ef4444', label: '🍗 Non-Veg',  badge: 'bg-red-100 text-red-700 border-red-200' },
  bhandara: { dot: '#a855f7', label: '✨ Bhandara', badge: 'bg-purple-100 text-purple-700 border-purple-200' },
};

// ── Urgency badge ───────────────────────────────
function UrgencyBadge({ score, timeLeft }) {
  const map = {
    critical: 'bg-red-100 text-red-600 border-red-200 animate-pulse',
    moderate: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    stable:   'bg-green-100 text-green-600 border-green-200',
    expired:  'bg-slate-100 text-slate-400 border-slate-200',
    'pending (syncing)': 'bg-blue-50 text-blue-500 border-blue-100 font-medium italic animate-pulse',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border whitespace-nowrap ${map[score] || map.stable}`}>
      <Clock size={10} />{timeLeft || score}
    </span>
  );
}

// ── Food type dot ───────────────────────────────
function FoodDot({ type }) {
  const c = FOOD_COLORS[type] || FOOD_COLORS.veg;
  return <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.dot }} />;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [role, setRole] = useState(user?.role || null);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [livePos, setLivePos] = useState([19.213768, 72.865273]);
  const [activeTab, setActiveTab] = useState('map');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showNeedModal, setShowNeedModal] = useState(false);
  const navigate = useNavigate();

  const isNeeder    = role === 'needer'    || user?.role === 'needer';
  const isDonor     = role === 'donor'     || user?.role === 'donor';
  const isNgo       = role === 'ngo'       || user?.role === 'ngo';
  const isVolunteer = role === 'volunteer' || user?.role === 'volunteer';
  const isFulfiller = isDonor || isNgo || isVolunteer;

  // ── Geolocation ────────────────────────────────
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLivePos([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    fetchDonations();
    fetchRequests();
  }, [user, livePos]);

  // ── Data fetching ──────────────────────────────
  const fetchDonations = async () => {
    let url = 'http://localhost:5000/api/donations';
    const p = new URLSearchParams();
    if (user?.role === 'needer') {
      if (user.dietaryPref) p.append('dietPref', user.dietaryPref);
      if (user.allergyProfile?.length) p.append('avoidAllergens', user.allergyProfile.join(','));
    }
    p.append('lat', livePos[0]);
    p.append('lng', livePos[1]);
    p.append('radius', 50);
    try {
      const res = await fetch(`${url}?${p}`);
      const data = await res.json();
      setDonations(Array.isArray(data) ? data : []);
    } catch { setDonations([]); }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/requests?nearby=true');
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { setRequests([]); }
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([fetchDonations(), fetchRequests()]);
    setLoading(false);
  };

  // ── Demo generator ─────────────────────────────
  const generateNeederDemos = async () => {
    const [baseLat, baseLng] = livePos;
    const jitter = () => (Math.random() - 0.5) * 0.005;
    const tok = localStorage.getItem('token');
    if (!tok) return alert('Please login first.');

    setLoading(true);
    try {
      const demoDonations = [
        { type: 'veg',      quantity: '50 plates',  address: 'Thakur Village, Kandivali',     latO: 0.002,  lngO: 0.002  },
        { type: 'jain',     quantity: '20 boxes',   address: 'Jain Derasar, 90 Feet Road',    latO: -0.001, lngO: 0.003, isBhandara: true },
        { type: 'nonveg',   quantity: '10 packets', address: 'Restaurant, Borivali East',      latO: 0.004,  lngO: -0.002 },
        { type: 'bhandara', quantity: '100 plates', address: 'Bhandara near Tempel',           latO: -0.003, lngO: -0.001, isBhandara: true },
      ];
      
      await Promise.all(demoDonations.map(async item => {
        const sType = item.type === 'bhandara' ? 'veg' : item.type;
        await fetch('http://localhost:5000/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
          body: JSON.stringify({
            foodType: sType,
            foodCategory: 'ready-to-eat',
            quantity: item.quantity,
            description: `Fresh demo ${item.type} food.`,
            location: { lat: baseLat + item.latO + jitter(), lng: baseLng + item.lngO + jitter(), address: item.address },
            preparedAt: new Date(),
            estimatedFreshFor: 12,
            isBhandara: item.isBhandara || false,
          })
        });
      }));
      alert('🍛 Available food demos added! Check the map.');
    } catch (e) { console.error(e); }
    await refresh();
    setLoading(false);
  };

  const generateNgoDemos = async () => {
    const [baseLat, baseLng] = livePos;
    const jitter = () => (Math.random() - 0.5) * 0.005;
    const tok = localStorage.getItem('token');
    if (!tok) return alert('Please login first.');

    setLoading(true);
    try {
      // NGO adds both Food and Requests
      const demoDonations = [
        { type: 'veg', quantity: '40 meals', address: 'NGO Hub A', latO: 0.001, lngO: -0.003 },
        { type: 'veg', quantity: '25 meals', address: 'NGO Hub B', latO: -0.002, lngO: 0.004 },
      ];
      const demoRequests = [
        { dietaryPref: 'any', numberOfPeople: 15, allergyNotes: 'Slum area requirement.', latO: 0.004, lngO: 0.002 },
        { dietaryPref: 'veg', numberOfPeople: 30, isSOS: true, allergyNotes: 'Flood relief need.', latO: -0.005, lngO: -0.001 },
      ];

      await Promise.all([
        ...demoDonations.map(async item => {
          await fetch('http://localhost:5000/api/donations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
            body: JSON.stringify({
              foodType: item.type,
              foodCategory: 'ready-to-eat',
              quantity: item.quantity,
              description: `NGO Surplus Demo - ${item.address}`,
              location: { lat: baseLat + item.latO + jitter(), lng: baseLng + item.lngO + jitter(), address: item.address },
              preparedAt: new Date(),
              estimatedFreshFor: 24,
            })
          });
        }),
        ...demoRequests.map(async item => {
          await fetch('http://localhost:5000/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
            body: JSON.stringify({
              dietaryPref: item.dietaryPref,
              numberOfPeople: item.numberOfPeople,
              allergyNotes: item.allergyNotes,
              isSOS: item.isSOS || false,
              location: { lat: baseLat + item.latO + jitter(), lng: baseLng + item.lngO + jitter(), address: 'Nearby Slum Area' }
            })
          });
        })
      ]);
      alert('🏢 NGO Demos: Food & Requests added!');
    } catch (e) { console.error(e); }
    await refresh();
    setLoading(false);
  };

  const generateDonorDemos = async () => {
    const [baseLat, baseLng] = livePos;
    const jitter = () => (Math.random() - 0.5) * 0.005;
    const tok = localStorage.getItem('token');
    if (!tok) return alert('Please login first.');
    setLoading(true);
    try {
      const items = [
        { foodType: 'veg',    quantity: '30 plates',  address: 'Donor Kitchen – Sector 7',  latO:  0.002, lngO:  0.001 },
        { foodType: 'nonveg', quantity: '15 packets', address: 'Local Restaurant Surplus',    latO: -0.002, lngO:  0.003 },
        { foodType: 'jain',   quantity: '10 boxes',   address: 'Society Gate – Block C',      latO:  0.003, lngO: -0.002 },
      ];
      const results = await Promise.all(items.map(i =>
        fetch('http://localhost:5000/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
          body: JSON.stringify({
            foodType: i.foodType,
            foodCategory: 'ready-to-eat',
            quantity: i.quantity,
            description: `Demo surplus food donated by local donor — ${i.foodType} option.`,
            location: { lat: baseLat + i.latO + jitter(), lng: baseLng + i.lngO + jitter(), address: i.address },
            preparedAt: new Date(),
            estimatedFreshFor: 12,
          })
        }).then(r => r.json())
      ));
      const errors = results.filter(r => r.error);
      if (errors.length) console.error('Demo food errors:', errors);
      alert(`🍲 ${items.length - errors.length} food donations added to the map!`);
    } catch (e) { console.error(e); }
    await refresh();
    setLoading(false);
  };

  const generateVolunteerDemos = async () => {
    const [baseLat, baseLng] = livePos;
    const jitter = () => (Math.random() - 0.5) * 0.005;
    const tok = localStorage.getItem('token');
    if (!tok) return alert('Please login first.');
    setLoading(true);
    try {
      await Promise.all([
        { dietaryPref: 'any', numberOfPeople: 8, isSOS: false, latO:  0.003, lngO:  0.001 },
        { dietaryPref: 'veg', numberOfPeople: 5, isSOS: true,  latO: -0.002, lngO:  0.004 },
      ].map(r => fetch('http://localhost:5000/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify({
          dietaryPref: r.dietaryPref, numberOfPeople: r.numberOfPeople, isSOS: r.isSOS,
          location: { lat: baseLat + r.latO + jitter(), lng: baseLng + r.lngO + jitter() },
        })
      })));
      alert('🛵 Demo delivery requests added!');
    } catch (e) { console.error(e); }
    await refresh();
    setLoading(false);
  };

  const generateDemos = isNgo ? generateNgoDemos
    : isNeeder    ? generateNeederDemos
    : isDonor     ? generateDonorDemos
    : isVolunteer ? generateVolunteerDemos
    : generateDonorDemos;

  // ── Filtered data ──────────────────────────────
  const MAP_LAYER_KEYS = ['both', 'requests', 'donations'];
  const filteredDonations = donations.filter(d => {
    // These keys are used for map-layer toggle, not food type — show all food
    if (filterType === 'all' || MAP_LAYER_KEYS.includes(filterType)) return true;
    if (filterType === 'bhandara') return d.isBhandara;
    return d.foodType === filterType;
  });

  const pendingRequests = requests.filter(r => !r.linkedDonation);

  // ── NOT LOGGED IN ──────────────────────────────
  if (!user && !role) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 max-w-2xl"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 text-xs font-bold uppercase tracking-widest mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" /> Live in your city
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-4 leading-tight" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          No Food Should <br />
          <span className="bg-gradient-to-r from-orange-400 to-rose-500 bg-clip-text text-transparent">Go to Waste</span>
        </h1>
        <p className="text-slate-600 text-lg mb-10">
          FoodConnect Bharat bridges surplus food with those in need — in real time, with smart allergen matching.
        </p>
        <div className="flex flex-wrap justify-center gap-5 mb-10">
          {STATS.map(({ label, value, icon: Icon, color }) => (
            <motion.div key={label} whileHover={{ y: -4 }}
              className="glass-card px-6 py-4 flex flex-col items-center gap-1.5 min-w-[120px]">
              <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                <Icon size={20} className="text-white" />
              </div>
              <span className="text-2xl font-extrabold text-slate-800">{value}</span>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
      <p className="text-slate-500 text-sm mb-6 uppercase tracking-widest font-semibold">Ready to jump in?</p>
      <RoleSelect onSelect={(id) => {
        if (id === 'needer') setRole('needer');
        else navigate('/register');
      }} />
    </div>
  );

  // ── NEEDY DASHBOARD ─────────────────────────────
  if (isNeeder) return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Looking for food</p>
          <h2 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {user?.name || 'Guest'}
            <span className="ml-3 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase tracking-wider">Needy</span>
          </h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'map' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
            <MapPin size={14} /> Food Map
          </button>
          <button onClick={() => setActiveTab('request')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'request' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}>
            <Heart size={14} /> My Requests
          </button>
        </div>
      </div>

      {/* CTA Banner */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-blue-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Heart size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-extrabold text-lg" style={{ fontFamily: 'Plus Jakarta Sans' }}>Need food today?</h3>
            <p className="text-blue-100 text-sm">Submit a request and nearby donors will respond.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/request')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 rounded-xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all whitespace-nowrap">
          <Plus size={16} /> Add Request
        </button>
      </motion.div>

      {activeTab === 'map' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2 shrink-0">Filter:</span>
              <div className="flex gap-2">
                {['all', 'veg', 'nonveg', 'jain', 'bhandara'].map(f => (
                  <button key={f} onClick={() => setFilterType(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-extrabold capitalize transition-all whitespace-nowrap flex items-center gap-1 ${filterType === f ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                    {f !== 'all' && <FoodDot type={f} />}
                    {f === 'bhandara' ? '🎊 Bhandara' : f === 'all' ? 'All Food' : f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={refresh} disabled={loading}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition border border-slate-200">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={generateDemos} disabled={loading}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition border border-blue-200 whitespace-nowrap">
                <Sparkles size={12} /> Add Demo Food
              </button>
            </div>
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap gap-3 px-1">
            {Object.entries(FOOD_COLORS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: val.dot }} />
                <span className="text-xs font-semibold text-slate-600">{val.label}</span>
              </div>
            ))}
          </div>

          {/* Map - shows DONATIONS only for needy */}
          <div className="relative">
            <Map donations={filteredDonations} requests={[]} mode="donations" />
            <div className="absolute bottom-6 right-4 z-[999]">
              <SOSButton />
            </div>
            <div className="absolute top-4 right-4 z-[500] hidden lg:block w-72 glass-card overflow-hidden shadow-2xl">
              <Leaderboard />
            </div>
          </div>

          {/* Donation cards for needy */}
          {filteredDonations.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
              {filteredDonations.slice(0, 6).map(d => {
                const fc = FOOD_COLORS[d.isBhandara ? 'bhandara' : d.foodType] || FOOD_COLORS.veg;
                return (
                  <motion.div key={d._id} whileHover={{ y: -2 }}
                    className="glass-card p-4 flex flex-col gap-3 border border-slate-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: fc.dot + '22' }}>
                          <div className="w-3 h-3 rounded-full" style={{ background: fc.dot }} />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm capitalize">
                            {d.isBhandara ? 'Bhandara Special' : d.foodType}
                          </p>
                          <p className="text-xs text-slate-500">{d.quantity}</p>
                        </div>
                      </div>
                      <UrgencyBadge score={d.urgencyScore} timeLeft={d.timeLeftString} />
                    </div>
                    <p className="text-xs text-slate-500 flex items-start gap-1">
                      <MapPin size={11} className="shrink-0 mt-0.5 text-slate-400" />
                      {d.location?.address}
                    </p>
                    {d.allergenWarnings?.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5 border border-red-100">
                        <AlertTriangle size={11} />
                        Contains: {d.allergenWarnings.join(', ')}
                      </div>
                    )}
                    <button className="w-full py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold transition-all active:scale-95 shadow-sm">
                      Request This Food →
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'request' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans' }}>Your Food Requests</h3>
            <button onClick={() => navigate('/request')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl btn-primary text-white text-sm font-bold shadow-md">
              <Plus size={14} /> New Request
            </button>
          </div>
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-blue-400" />
            </div>
            <h4 className="font-extrabold text-slate-700 mb-2">No active requests</h4>
            <p className="text-sm text-slate-500 mb-6">Submit a new request and donors nearby will be notified.</p>
            <button onClick={() => navigate('/request')}
              className="btn-primary px-6 py-2.5 rounded-xl text-white font-bold text-sm inline-flex items-center gap-2">
              <Plus size={14} /> Add Food Request
            </button>
          </div>
          <div className="mt-4 lg:hidden glass-card overflow-hidden">
            <Leaderboard />
          </div>
        </div>
      )}
    </div>
  );

  // ── FULFILLER DASHBOARD (Donor / NGO / Volunteer) ──
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Welcome back</p>
          <h2 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
            {user?.name || 'Guest'}
            <span className="ml-3 text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 uppercase tracking-wider">
              {user?.role || role}
            </span>
          </h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'map' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
            <MapPin size={14} /> Live Map
          </button>
          <button onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600 hover:bg-blue-50'}`}>
            <List size={14} /> Food Requests
            {pendingRequests.length > 0 && (
              <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
          {(isDonor || isNgo) && (
            <button onClick={() => setActiveTab('donate')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'donate' ? 'btn-primary text-white shadow-md' : 'text-orange-600 hover:bg-orange-50'}`}>
              <Plus size={14} /> Donate Food
            </button>
          )}
        </div>
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Food Requests', value: pendingRequests.length, icon: Heart, color: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
          { label: 'SOS Active', value: pendingRequests.filter(r => r.isSOS).length, icon: AlertTriangle, color: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
          { label: 'Available Food', value: donations.length, icon: Utensils, color: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
        ].map(({ label, value, icon: Icon, color, text, border }) => (
          <div key={label} className={`${color} border ${border} rounded-2xl p-4 flex flex-col gap-1 shadow-sm`}>
            <div className="flex items-center gap-2">
              <Icon size={16} className={text} />
              <span className="text-xs font-bold text-slate-500">{label}</span>
            </div>
            <span className={`text-3xl font-extrabold ${text}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* MAP TAB */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
            {/* Layer toggle */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { key: 'both',     label: '🗺️ All' },
                { key: 'requests', label: '🤝 Requests' },
                { key: 'donations', label: '🍲 Food' },
              ].map(({ key, label }) => (
                <button key={key}
                  onClick={() => setFilterType(key === filterType ? 'both' : key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border ${
                    filterType === key || (key === 'both' && !['requests','donations'].includes(filterType))
                      ? 'bg-slate-800 text-white border-slate-800 shadow' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                  }`}>{label}</button>
              ))}
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={refresh} disabled={loading}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition border border-slate-200">
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={generateDemos} disabled={loading}
                className="flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition border border-orange-200 whitespace-nowrap">
                <Sparkles size={12} />
                {isDonor ? '+ Demo Food' : isNgo ? '+ Demo Food & Requests' : '+ Demo Requests'}
              </button>
            </div>
          </div>

          {/* Map - shows BOTH food and requests for fulfillers */}
          <div className="relative">
            <Map
              donations={filterType === 'requests' ? [] : filteredDonations}
              requests={filterType === 'donations' ? [] : pendingRequests}
              mode="all"
            />
            <div className="absolute bottom-6 right-4 z-[999]">
              <SOSButton />
            </div>
            <div className="absolute top-4 right-4 z-[500] hidden lg:block w-72 glass-card overflow-hidden shadow-2xl">
              <Leaderboard />
            </div>
          </div>

          {/* Mini legend */}
          <div className="flex flex-wrap gap-4 px-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"/>Veg food</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"/>Jain food</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"/>Non-veg food</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded bg-sky-500 inline-block"/>Food request</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded bg-red-600 inline-block"/>SOS request</span>
          </div>
        </div>
      )}

      {/* REQUESTS LIST TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans' }}>
                Remaining Food Requests
              </h3>
              <p className="text-sm text-slate-500">{pendingRequests.length} people waiting for food today</p>
            </div>
            <button onClick={refresh} disabled={loading}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="glass-card p-14 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-green-400" />
              </div>
              <h4 className="font-extrabold text-slate-700 mb-2">All caught up!</h4>
              <p className="text-sm text-slate-500">No pending food requests right now. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map(r => (
                <motion.div key={r._id} whileHover={{ y: -2 }}
                  className={`glass-card p-5 flex flex-col gap-3 border ${r.isSOS ? 'border-red-200 bg-red-50/50' : 'border-slate-100'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {r.isSOS && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase animate-pulse">SOS</span>
                        )}
                        <span className="text-sm font-extrabold text-slate-800">
                          {r.neederId?.role === 'ngo' ? '🏢 NGO Request' : '🤝 Seeker Request'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Feeding <strong>{r.numberOfPeople}</strong> people • {r.dietaryPref} food
                      </p>
                      {!r.isAnonymous && r.neederId?.name && (
                        <p className="text-xs text-slate-400 mt-0.5">From: {r.neederId.name}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200 whitespace-nowrap">
                      Awaiting
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-start gap-1.5">
                    <MapPin size={11} className="shrink-0 mt-0.5 text-slate-400" />
                    {r.location?.address}
                  </p>
                  {r.allergyNotes && (
                    <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">
                      Note: {r.allergyNotes}
                    </p>
                  )}
                  <button
                    onClick={() => navigate('/donate', { state: { targetRequest: r } })}
                    className="w-full py-2.5 rounded-xl btn-primary text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95">
                    <Utensils size={13} /> I Can Help — Donate Food
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-4 lg:hidden glass-card overflow-hidden">
            <Leaderboard />
          </div>
        </div>
      )}

      {/* DONATE TAB */}
      {activeTab === 'donate' && (isDonor || isNgo) && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-4 p-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-center gap-3 shadow-sm">
            <Plus size={18} className="text-orange-500 shrink-0" />
            <p className="text-slate-700 text-sm">
              <strong>Ready to share?</strong> List your surplus food to help those around you.
            </p>
          </div>
          <DonationForm setDonations={setDonations} />
        </div>
      )}
    </div>
  );
}
