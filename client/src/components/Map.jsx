import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import clsx from 'clsx';
import { AlertCircle, Clock, MapPin, Navigation, RefreshCw } from 'lucide-react';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom coloured donation pin (Teardrop)
const createDonationIcon = (color, hasWarning) => L.divIcon({
  className: 'custom-icon',
  html: `
    <div style="position:relative; width:32px; height:40px;">
      <svg viewBox="0 0 32 40" style="width:32px;height:40px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${color}"/>
        <circle cx="16" cy="16" r="7" fill="rgba(255,255,255,0.3)"/>
        <circle cx="16" cy="16" r="4" fill="white"/>
      </svg>
      ${hasWarning ? `<div style="position:absolute;top:-4px;right:-4px;background:#ef4444;border-radius:50%;width:14px;height:14px;color:white;font-size:9px;font-weight:bold;display:flex;align-items:center;justify-content:center;border:2px solid #1e2130;">!</div>` : ''}
    </div>
  `,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -42],
});

// Custom coloured request pin (SQUARE)
const createRequestIcon = (isSOS) => L.divIcon({
  className: 'custom-icon',
  html: `
    <div style="position:relative; width:32px; height:32px;">
      <svg viewBox="0 0 32 32" style="width:32px;height:32px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">
        <rect x="2" y="2" width="28" height="28" rx="6" fill="${isSOS ? '#ef4444' : '#0ea5e9'}"/>
        <path d="M16 8v10M16 22h.01" stroke="white" stroke-width="3" stroke-linecap="round" />
      </svg>
      ${isSOS ? `<div style="position:absolute;top:-4px;right:-4px;width:12px;height:12px;background:#ef4444;border-radius:50%;animate:ping 1s infinite;"></div>` : ''}
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -20],
});

// Animated live location icon
const liveLocationIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative; width:24px; height:24px; display:flex; align-items:center; justify-content:center;">
      <div style="position:absolute; width:24px; height:24px; background:rgba(59,130,246,0.3); border-radius:50%; animation: pulse-ring 1.5s ease-out infinite;"></div>
      <div style="width:14px; height:14px; background:#3b82f6; border-radius:50%; border:2.5px solid white; box-shadow:0 2px 8px rgba(59,130,246,0.8); z-index:1;"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to fly map to a position
function FlyTo({ pos }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, 15, { duration: 1.4 });
  }, [pos]);
  return null;
}

const FOOD_COLORS = {
  veg: '#22c55e',
  jain: '#eab308',
  nonveg: '#ef4444',
  any: '#8b5cf6',
};

// Custom coloured request pin (LEGACY - replaced by createRequestIcon above)

const URGENCY_STYLES = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  stable: 'bg-green-500/10 text-green-600 border-green-500/20',
  expired: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

// Return distance in km
function getDistance(lat1, lon1, lat2, lon2) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + 
            c(lat1 * p) * c(lat2 * p) * 
            (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export default function Map({ donations, requests = [], center = [19.213768, 72.865273], mode = 'all' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [livePos, setLivePos] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [claiming, setClaiming] = useState(null);

  const handleClaim = async (d) => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Please login to request food.');
    
    setClaiming(d._id);
    try {
      const res = await fetch(`http://localhost:5000/api/donations/${d._id}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deliveryMethod: 'pickup',
          numberOfPeople: 1,
          isAnonymous: false,
          dietaryPref: 'any'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request');
      alert('Request sent successfully! Awaiting donor approval.');
    } catch (err) {
      alert(err.message);
    }
    setClaiming(null);
  };

  const locateMe = () => {
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setLivePos(coords);
        setFlyTarget(coords);
        setLocating(false);
      },
      () => {
        setLocError('Location access denied');
        setLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // Auto-locate on mount
  useEffect(() => { locateMe(); }, []);

  const getPinColor = (d) => d.isBhandara ? '#a855f7' : (FOOD_COLORS[d.foodType] || FOOD_COLORS.any);

  return (
    <div className="relative h-[480px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      <MapContainer
        center={livePos || center}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
      >
        {/* Light map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {flyTarget && <FlyTo pos={flyTarget} />}

        {/* Live location marker */}
        {livePos && (
          <>
            <Circle
              center={livePos}
              radius={120}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1 }}
            />
            <Marker position={livePos} icon={liveLocationIcon}>
              <Popup className="donation-popup">
                <div className="text-sm font-bold text-blue-400 flex items-center gap-1">
                  <Navigation size={14} /> You are here
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Donation markers - shown in 'donations' or 'all' mode */}
        {(mode === 'donations' || mode === 'all') && donations.map((d) => {
          if (!d.location?.lat || !d.location?.lng) return null;
          const hasWarning = d.allergenWarnings?.length > 0;
          const expired = d.urgencyScore === 'expired';
          return (
            <Marker
              key={d._id}
              position={[d.location.lat, d.location.lng]}
              icon={createDonationIcon(getPinColor(d), hasWarning)}
            >
              <Popup className="donation-popup" minWidth={240}>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-base font-extrabold capitalize text-slate-800">{d.foodType}</span>
                      {d.isBhandara && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-bold border border-purple-500/20">Bhandara</span>}
                      <p className="text-sm text-slate-500 mt-0.5">{d.quantity}</p>
                    </div>
                    <span className={clsx('px-2 py-1 rounded-full text-xs font-bold border flex items-center gap-1 whitespace-nowrap', URGENCY_STYLES[d.urgencyScore] || URGENCY_STYLES.stable, d.urgencyScore === 'critical' && 'badge-critical')}>
                      <Clock size={11} />{d.timeLeftString || d.urgencyScore}
                    </span>
                  </div>

                  {/* Allergen warning */}
                  {hasWarning && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-600 shadow-sm mt-3">
                      <AlertCircle size={13} className="shrink-0 mt-0.5" />
                      <div><strong>Allergy Warning:</strong><br/> Contains {d.allergenWarnings.join(', ')}</div>
                    </div>
                  )}

                  {/* Address */}
                  <p className="text-xs text-slate-500 flex items-start gap-1.5 pt-1">
                    <MapPin size={11} className="shrink-0 mt-0.5 text-slate-400" />
                    {d.location.address}
                  </p>

                  {/* Description */}
                  {d.description && (
                    <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">"{d.description}"</p>
                  )}

                  {/* CTA */}
                  <button
                    onClick={() => handleClaim(d)}
                    disabled={hasWarning || expired || claiming === d._id}
                    className={clsx(
                      'w-full py-2 rounded-xl text-xs font-bold transition-all mt-1',
                      hasWarning || expired
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'btn-primary text-white'
                    )}
                  >
                    {claiming === d._id ? 'Requesting...' : hasWarning ? '⚠ Allergen Conflict' : expired ? 'Expired' : '✓ Request This Food'}
                  </button>
                  
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={clsx(
                          "h-full transition-all duration-1000",
                          d.urgencyScore === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                          d.urgencyScore === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
                        )}
                        style={{ 
                          width: `${Math.max(5, Math.min(100, 
                            d.expiryTime && d.estimatedFreshFor 
                              ? ((new Date(d.expiryTime) - Date.now()) / (d.estimatedFreshFor * 3600000)) * 100 
                              : 50
                          ))}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 tracking-tighter uppercase whitespace-nowrap">Freshness</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Request markers - shown in 'requests' or 'all' mode */}
        {(mode === 'requests' || (mode === 'all' && ['donor', 'volunteer', 'ngo'].includes(user?.role))) && requests.map((r) => {
          if (!r.location?.lat || !r.location?.lng) return null;
          return (
            <Marker
              key={r._id}
              position={[r.location.lat, r.location.lng]}
              icon={createRequestIcon(r.isSOS)}
            >
              <Popup className="donation-popup" minWidth={240}>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-base font-extrabold text-blue-800">
                        {r.neederId?.role === 'ngo' ? '🏢 NGO Request' : '🤝 Seeker Request'}
                      </span>
                      {r.isSOS && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-bold border border-red-500/30 animate-pulse">🚨 SOS</span>}
                      <p className="text-sm text-slate-500 mt-0.5 font-medium">{r.isAnonymous ? 'Anonymous' : `From ${r.neederId?.name || 'Community Member'}`}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Feeding {r.numberOfPeople} people · {r.dietaryPref}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 flex items-start gap-1.5 pt-1">
                    <MapPin size={11} className="shrink-0 mt-0.5 text-slate-400" />
                    {r.location.address}
                  </p>

                  {r.allergyNotes && (
                    <p className="text-xs text-slate-500 italic border-t border-slate-100 pt-2">Note: {r.allergyNotes}</p>
                  )}

                  <button
                    onClick={() => navigate('/donate', { state: { targetRequest: r } })}
                    className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-xs font-bold transition-all mt-3 shadow-sm hover:shadow-md active:scale-95"
                  >
                    🤝 I can help — Donate Food
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Locate Me Button */}
      <button
        onClick={locateMe}
        disabled={locating}
        title="Show my location"
        className="absolute bottom-6 left-4 z-[999] flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-2xl transition-all btn-primary disabled:opacity-50"
      >
        {locating
          ? <><RefreshCw size={15} className="animate-spin" /> Locating…</>
          : <><Navigation size={15} /> My Location</>
        }
      </button>

      {locError && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[999] px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium">
          {locError}
        </div>
      )}

      {/* Dynamic Legend */}
      <div className="absolute top-4 left-4 z-[999] glass-card p-3 flex flex-col gap-1.5 text-xs font-semibold shadow-lg">
        <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">
          {mode === 'requests' ? 'Request Types' : mode === 'donations' ? 'Food Types' : 'Legend'}
        </p>
        {(mode === 'requests' ? [
          { color: '#ef4444', label: '🚨 SOS Request', shape: 'square' },
          { color: '#0ea5e9', label: '🤝 Food Request', shape: 'square' },
          { color: '#3b82f6', label: 'You' },
        ] : [
          { color: '#22c55e', label: '🌿 Veg Food' },
          { color: '#eab308', label: '🟡 Jain Food' },
          { color: '#ef4444', label: '🍗 Non-Veg' },
          { color: '#a855f7', label: '✨ Bhandara' },
          { color: '#3b82f6', label: '📍 You' },
        ]).map(({ color: c, label: l, shape }) => (
          <div key={l} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 shrink-0 shadow-sm border border-white/20 ${shape === 'square' ? 'rounded-sm' : 'rounded-full'}`}
              style={{ background: c }}
            />
            <span className="text-slate-700 font-semibold">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
