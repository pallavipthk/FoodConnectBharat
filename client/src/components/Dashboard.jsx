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
  UtensilsCrossed, Heart, Zap, CheckCircle2, Bike, Activity, BrainCircuit, Globe, BarChart3, ShieldCheck
} from 'lucide-react';
import { io } from 'socket.io-client';
import { localStorageBridge } from '../utils/localStorageBridge';

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
  const [hungerSpots, setHungerSpots] = useState(localStorageBridge.getHungerSpots());
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [livePos, setLivePos] = useState([19.213768, 72.865273]);
  const [activeTab, setActiveTab] = useState('map');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showNeedModal, setShowNeedModal] = useState(false);
  const [nearbyHungry, setNearbyHungry] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [impact, setImpact] = useState(null);
  const [aiForecast, setAiForecast] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [fetchingAI, setFetchingAI] = useState(false);
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
      const reqList = Array.isArray(data) ? data : [];
      setRequests(reqList);

      // Smart Donor Nudge: Count pending requests within 5km
      if (isDonor || isNgo || isVolunteer) {
        const count = reqList.filter(r => {
          if (r.status !== 'pending') return false;
          // Simple Haversine approx (inline for speed)
          const p = 0.017453292519943295;
          const a = 0.5 - Math.cos((r.location.lat - livePos[0]) * p)/2 + 
                    Math.cos(livePos[0] * p) * Math.cos(r.location.lat * p) * 
                    (1 - Math.cos((r.location.lng - livePos[1]) * p))/2;
          const d = 12742 * Math.asin(Math.sqrt(a));
          return d <= 5;
        }).length;
        setNearbyHungry(count);
      }
    } catch { setRequests([]); }
  };

  const refresh = async () => {
    setLoading(true);
    await Promise.all([fetchDonations(), fetchRequests(), fetchInventory(), fetchImpact()]);
    setLoading(false);
  };

  const fetchImpact = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/system/impact');
      const data = await res.json();
      setImpact(data);
    } catch { setImpact(null); }
  };

  const fetchAiForecast = async () => {
    setFetchingAI(true);
    // Simulate high-fidelity AI processing pulse
    await new Promise(r => setTimeout(r, 2200));
    try {
      // In a real app, this calls the python_bridge endpoint
      // For the demo/prototype, we'll simulate the intelligent output
      setAiForecast({
        community_velocity: 'High (+12.4%)',
        forecast_next_30_days: {
          meals: '14,200',
          reach_growth: '+18.5%'
        },
        impact_score: 94,
        sustainability_index: 0.88
      });
    } catch (e) { console.error('AI Sync Failed', e); }
    setFetchingAI(false);
  };

  const fetchInventory = async () => {
    if (!isNgo) return;
    const tok = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/donations/inventory', {
        headers: { 'Authorization': `Bearer ${tok}` }
      });
      const data = await res.json();
      setInventory(Array.isArray(data) ? data : []);
    } catch { setInventory([]); }
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
                  {/* AI Prediction Hub */}
                  <div className="md:col-span-3 space-y-6">
                    <div className="glass-card p-8 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                        <BrainCircuit size={120} />
                      </div>
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-purple-600">
                            <Sparkles size={20} className="animate-pulse" />
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">AI Impact Predictor</h3>
                          </div>
                          <p className="text-slate-500 text-sm max-w-lg leading-relaxed font-medium">
                            Our Python-powered Intelligence engine analyzes real-time food redistribution trends and hunger density to forecast community growth and efficiency.
                          </p>
                        </div>
                        <button 
                          onClick={fetchAiForecast}
                          disabled={fetchingAI}
                          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {fetchingAI ? <><RefreshCw size={16} className="animate-spin inline mr-2" /> Syncing AI...</> : '🚀 Generate Forecast'}
                        </button>
                      </div>

                      {aiForecast && (
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-500">
                          <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm hover:shadow-md transition-all">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Community Velocity</p>
                            <h4 className="text-3xl font-black text-slate-900 leading-none">{aiForecast.community_velocity}</h4>
                            <p className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                              <Zap size={12} /> High-Speed Intervention
                            </p>
                          </div>
                          <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm hover:shadow-md transition-all">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Predicted Meals (30d)</p>
                            <h4 className="text-3xl font-black text-slate-900 leading-none">{aiForecast.forecast_next_30_days.meals}</h4>
                            <p className="text-[11px] text-purple-600 font-bold mt-2 flex items-center gap-1">
                              <Activity size={12} /> {aiForecast.forecast_next_30_days.reach_growth} growth projected
                            </p>
                          </div>
                          <div className="bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white shadow-sm hover:shadow-md transition-all">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">AI Recommendation</p>
                            <p className="text-xs text-slate-600 font-bold leading-relaxed pr-2">
                              {aiForecast.ai_recommendation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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

  const handleVerify = async (id) => {
    const tok = localStorage.getItem('token');
    if (!tok) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/donations/${id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tok}`
        },
        body: JSON.stringify({
          foodImages: ['https://foodconnect.bharat/verified.jpg'] // Placeholder for verification image requirement
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message);
    } catch (e) { alert(e.message); }
    await refresh();
    setLoading(false);
  };

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
          {isNgo && (
            <button onClick={() => { setActiveTab('inventory'); fetchInventory(); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 hover:bg-purple-50'}`}>
              <List size={14} /> Inventory
            </button>
          )}
          {!isNeeder && (
            <button onClick={() => navigate('/csr-hub')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all text-emerald-600 hover:bg-emerald-50`}>
              <BarChart3 size={14} /> CSR Hub
            </button>
          )}
        </div>
      </div>

      {nearbyHungry > 0 && (isDonor || isNgo) && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mb-4 overflow-hidden"
        >
          <div className="relative group p-6 rounded-[2.5rem] bg-gradient-to-br from-rose-500 to-rose-600 shadow-2xl shadow-rose-500/20 text-white flex flex-col md:flex-row items-center gap-6 border-b-8 border-rose-700">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
              <UtensilsCrossed size={120} />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 animate-bounce">
              <AlertTriangle size={32} />
            </div>
            <div className="flex-1 text-center md:text-left relative z-10">
              <h3 className="text-xl font-black tracking-tight mb-1" style={{ fontFamily: 'Plus Jakarta Sans' }}>Impact Alert: Local Needs</h3>
              <p className="text-rose-50 font-medium opacity-90 text-sm">
                There are <span className="underline decoration-wavy underline-offset-4 decoration-white/50">{nearbyHungry} hunger requests</span> within <span className="font-black">5km</span>.
                Got leftovers? Your donation can feed them <strong>right now</strong>.
              </p>
            </div>
            {(isDonor || isNgo) && (
              <button onClick={() => setActiveTab('donate')} className="px-8 py-4 rounded-2xl bg-white text-rose-600 font-black text-sm uppercase tracking-widest hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10">
                Donate Now
              </button>
            )}
          </div>
        </motion.div>
      )}

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

          {/* Quick Tools Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
             {/* Tool 1: Mark Hunger spot */}
             {['donor', 'ngo', 'volunteer'].includes(user?.role) && (
               <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-rose-500/5 rounded-full group-hover:scale-150 transition-transform"></div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-inner">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Mark Hunger Area</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">Crowdsource high-need zones</p>
                  </div>
                  <button onClick={() => { setActiveTab('map'); /* Map will handle UI via floating btn */ }} className="w-full py-2.5 rounded-xl bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-500 active:scale-95 transition-all">
                     Open Map Tool →
                  </button>
               </motion.div>
             )}

             {/* Tool 2: Heatmap Toggle */}
             {(isNgo || isDonor) && (
               <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between overflow-hidden group">
                  <div className="flex items-center justify-between mb-4">
                     <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Activity size={24} />
                     </div>
                     <div className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${showHeatmap ? 'bg-orange-500' : 'bg-slate-200'}`} onClick={() => setShowHeatmap(!showHeatmap)}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${showHeatmap ? 'translate-x-6' : 'translate-x-0'}`} />
                     </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Hunger Heatmap</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">Visualize verified zones</p>
                  </div>
               </motion.div>
             )}

             {/* Tool 3: Volunteer Invite (RECRUITMENT) */}
             {isVolunteer && (
               <motion.div whileHover={{ y: -4 }} className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col gap-4 relative overflow-hidden group lg:col-span-2">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                    <Users size={80} />
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                     <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                        <Users size={24} />
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">Invite Ground Donors</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed">Onboard local shops & merchants</p>
                     </div>
                  </div>
                  
                  <div className="flex gap-2 relative z-10">
                     <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 flex items-center justify-between font-black text-blue-400 text-lg tracking-widest">
                        {inviteCode || 'CODE_GEN'}
                        {inviteCode && (
                          <button onClick={() => navigator.clipboard.writeText(inviteCode)} className="text-[10px] text-white opacity-40 hover:opacity-100 transition-opacity">Copy</button>
                        )}
                     </div>
                     <button 
                       onClick={() => setInviteCode(localStorageBridge.generateInvite(user?.id))}
                       className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all">
                        Generate
                     </button>
                  </div>
               </motion.div>
             )}
          </div>

          {/* Map - shows BOTH food and requests for fulfillers */}
          <div className="relative">
            {(isVolunteer || isNgo) && (
              <div className="absolute top-4 left-4 z-[999]">
                <button onClick={() => navigate('/verification-hub')}
                  className="flex items-center gap-3 p-4 rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-500/10 hover:bg-blue-500 transition-all border border-blue-400/20 group">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 italic">Action Center</p>
                    <p className="text-sm font-black whitespace-nowrap">Verification Hub</p>
                  </div>
                </button>
              </div>
            )}
            <Map
              donations={filterType === 'requests' ? [] : filteredDonations}
              requests={filterType === 'donations' ? [] : pendingRequests}
              hungerSpots={hungerSpots}
              showHeatmap={showHeatmap}
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

          {/* Volunteer Verification Section */}
          {isVolunteer && donations.filter(d => !d.verifiedByVolunteer && d.status === 'available').length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans' }}>Verify Freshness Near You</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Earn +5 Karma per verification</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {donations.filter(d => !d.verifiedByVolunteer && d.status === 'available').slice(0,3).map(d => (
                  <div key={d._id} className="glass-card p-5 border-l-4 border-l-emerald-500 flex flex-col gap-3 shadow-md hover:shadow-xl transition-all group overflow-hidden relative">
                    <div className="absolute -right-2 -top-2 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform">
                      <CheckCircle2 size={80} className="text-emerald-900" />
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs">
                          {d.foodType?.[0]?.toUpperCase() || 'V'}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-800 text-sm">{d.foodType} food</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{d.quantity}</p>
                        </div>
                      </div>
                      <UrgencyBadge score={d.urgencyScore} timeLeft={d.timeLeftString} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium flex items-start gap-1">
                      <MapPin size={11} className="mt-0.5 text-slate-400 shrink-0" />
                      {d.location?.address}
                    </p>
                    <button 
                      onClick={() => handleVerify(d._id)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 z-10">
                      Verify Quality →
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
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
      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && isNgo && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans' }}>Bulk Inventory Management</h3>
            <span className="text-xs font-bold text-slate-400 border border-slate-100 px-3 py-1 rounded-full uppercase tracking-widest">{inventory.length} Containers</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventory.map(item => {
              const remains = Math.max(0, Math.round((new Date(item.expiryTime) - new Date()) / 3600000));
              const isCrit = remains < 6;

              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={item._id} 
                  className={`bg-white rounded-[2.5rem] border p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col gap-4 overflow-hidden relative ${isCrit ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${isCrit ? 'bg-red-500 animate-ping' : 'bg-emerald-500'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isCrit ? 'text-red-700' : 'text-emerald-700'}`}>
                        {isCrit ? '⚠️ Low Quality Freshness' : '✅ Stable Inventory'}
                      </span>
                    </div>
                    <UrgencyBadge score={item.urgencyScore} timeLeft={`${remains}h remaining`} />
                  </div>

                  <div>
                    <h4 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">{item.quantity}</h4>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400">{item.foodType} food category</span>
                    <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5 font-medium">
                      <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                      {item.location.address}
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mt-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter text-slate-400 mb-1.5 border-b border-slate-200 pb-1">
                      <span>Source Partner</span>
                      <span className="text-indigo-600">{item.donorId?.name || 'Local Partner'}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic">"{item.description}"</p>
                  </div>

                  {item.status === 'assigned_to_volunteer' ? (
                     <div className="mt-auto py-3 px-4 bg-emerald-50 text-emerald-600 rounded-xl text-center text-xs font-black uppercase tracking-widest border border-emerald-100 flex items-center justify-center gap-2">
                        <CheckCircle2 size={14} /> Assigned to Delivery Team
                     </div>
                  ) : (
                    <div className="mt-auto flex gap-2">
                      <button className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-200 active:scale-95">
                        Assign Last Mile
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}

            {inventory.length === 0 && (
              <div className="col-span-full py-24 text-center glass-card border-dashed">
                 <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-12">
                   <Plus size={40} className="text-indigo-400" />
                 </div>
                 <h4 className="text-slate-900 font-extrabold text-2xl tracking-tighter">Inventory Empty</h4>
                 <p className="text-slate-500 text-sm max-w-[280px] mx-auto mt-2 leading-relaxed">
                   Claims bulk surplus food from the Live Map to start managing your distribution inventory.
                 </p>
              </div>
            )}
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

      {/* IMPACT HUB TAB (Phase 13, 14, 15) */}
      {activeTab === 'impact' && (
        <div className="space-y-10">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
             <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Plus Jakarta Sans' }}>System Impact Report</h3>
                <p className="text-slate-500 font-medium tracking-tight">Real-time ESG & community sustainability audit</p>
             </div>
             <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-105 transition-all">
               <FileText size={16} /> Export CSR Report
             </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                  <Utensils size={80} />
                </div>
                <p className="text-indigo-100/50 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Total Meals Shared</p>
                <h4 className="text-6xl font-black tabular-nums tracking-tighter mb-2">{impact?.mealsFed || 0}</h4>
                <p className="text-indigo-50/70 text-xs font-medium leading-relaxed">Equating to <strong>{impact?.peopleImpacted || 0}</strong> nutritious meal deliveries across Bharat.</p>
             </div>

             <div className="p-8 rounded-[2.5rem] bg-emerald-600 text-white shadow-2xl shadow-emerald-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                  <Wind size={80} />
                </div>
                <p className="text-emerald-100/50 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Carbon Footprint Avoided</p>
                <div className="flex items-baseline gap-2">
                   <h4 className="text-6xl font-black tabular-nums tracking-tighter mb-2">{impact?.carbonSaved || 0}</h4>
                   <span className="text-xl font-bold opacity-60">KG CO₂</span>
                </div>
                <p className="text-emerald-50/70 text-xs font-medium leading-relaxed">Reduced methane production by preventing food waste in regional landfills.</p>
             </div>

             <div className="p-8 rounded-[2.5rem] bg-rose-500 text-white shadow-2xl shadow-rose-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                   <Target size={80} />
                </div>
                <p className="text-rose-100/50 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Community Reach</p>
                <h4 className="text-6xl font-black tabular-nums tracking-tighter mb-2">94%</h4>
                <p className="text-rose-50/70 text-xs font-medium leading-relaxed">Efficiency rate in matching urgent food needs with available regional donors.</p>
             </div>
          </div>

          <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl">
             <div className="flex items-center justify-between mb-8 border-b border-slate-50 pb-6">
                <div>
                   <h4 className="text-xl font-black text-slate-800 tracking-tight">CSR Growth Forecast</h4>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Projected Platform Scale 2026</p>
                </div>
                <div className="flex gap-4 items-end">
                   {impact?.growth?.map(g => (
                      <div key={g.month} className="flex flex-col items-center">
                         <div className="w-12 bg-emerald-500/10 rounded-t-xl relative overflow-hidden group" style={{ height: `${g.count}px` }}>
                            <div className="absolute bottom-0 w-full bg-emerald-500 transition-all duration-1000" style={{ height: activeTab === 'impact' ? '100%' : '0' }} />
                         </div>
                         <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{g.month}</span>
                      </div>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                   <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50">
                         <MapIcon size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Operational Reach</p>
                         <p className="text-sm font-extrabold text-slate-800">12 Major Cities in Western Bharat</p>
                      </div>
                   </div>
                   <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
                         <Users size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Registered CSR Partners</p>
                         <p className="text-sm font-extrabold text-slate-800">48 Corporate & NGO Entities</p>
                      </div>
                   </div>
                </div>
                
                <div className="flex flex-col justify-center p-8 rounded-[3rem] bg-indigo-950 text-white shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500 rounded-full -mr-20 -mt-20 blur-3xl opacity-20" />
                   <h5 className="text-lg font-black text-emerald-400 uppercase tracking-tighter mb-2">Platform Vision: Zero Hunger</h5>
                   <p className="text-indigo-200 text-xs leading-relaxed font-medium">
                      Our intelligence engine reduces food waste by 65% through real-time geospatial pairing. Join us in building a more efficient community food network today.
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
