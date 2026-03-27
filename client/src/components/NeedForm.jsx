import React, { useState, useEffect } from 'react';
import AllergenPicker from './AllergenPicker';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, ShieldAlert, CheckCircle, MapPin, Navigation } from 'lucide-react';

const DIET_OPTS = [
  { value: 'any', label: '🍽️ Any' },
  { value: 'veg', label: '🌿 Vegetarian' },
  { value: 'jain', label: '🟡 Jain' },
  { value: 'nonveg', label: '🍗 Non-Veg' },
];

export default function NeedForm({ isSOS = false, onClose }) {
  const { user, token } = useAuth();
  const [dietaryPref, setDietaryPref] = useState('any');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allergiesToAvoid, setAllergiesToAvoid] = useState([]);
  const [allergyNotes, setAllergyNotes] = useState('');
  const [saveProfile, setSaveProfile] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (user?.allergyProfile?.length) {
      setAllergiesToAvoid(user.allergyProfile);
      setProfileLoaded(true);
    }
  }, [user]);

  const handleAutoLocate = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          setAddress(data.display_name || `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          setAddress(`Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLoading(false);
      },
      () => {
        alert('Location access denied');
        setLoading(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const location = { 
      address,
      lat: user?.location?.lat || 19.213768 + (Math.random() - 0.5) * 0.02, 
      lng: user?.location?.lng || 72.865273 + (Math.random() - 0.5) * 0.02 
    };
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('http://localhost:5000/api/requests', {
        method: 'POST', headers,
        body: JSON.stringify({ dietaryPref, numberOfPeople, isAnonymous, isSOS, allergiesToAvoid, allergyNotes, location }),
      });
      if (!res.ok) throw new Error('Failed to create request');
      if (user && saveProfile) {
        await fetch('http://localhost:5000/api/users/allergy-profile', {
          method: 'PATCH', headers,
          body: JSON.stringify({ allergyProfile: allergiesToAvoid, allergyNotes }),
        });
      }
      setSuccess(true);
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-green-400" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>
          {isSOS ? '🚨 SOS Broadcast Sent!' : 'Request Submitted!'}
        </h3>
        <p className="text-slate-500 text-sm">Volunteers in your area have been notified.</p>
        {onClose && (
          <button onClick={onClose} className="btn-primary px-6 py-2.5 rounded-xl text-white font-bold text-sm">
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isSOS && (
        <div>
          <h2 className="text-3xl font-black text-slate-900 mb-2" style={{ fontFamily: 'Plus Jakarta Sans' }}>Find Food Near You</h2>
          <p className="text-slate-500 text-sm mt-1">Tell us your needs and we'll match the right food.</p>
        </div>
      )}

      {isSOS && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold">
          <ShieldAlert size={15} /> Emergency mode — your request will be broadcast immediately
        </div>
      )}

      {/* Dietary preference */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block">Dietary Preference</label>
        <div className="grid grid-cols-2 gap-2">
          {DIET_OPTS.map(o => (
            <button type="button" key={o.value} onClick={() => setDietaryPref(o.value)}
              className={`py-2 px-3 rounded-xl border text-sm font-bold transition-all ${dietaryPref === o.value ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Number of people */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block flex items-center gap-1.5">
          <Users size={13} /> For how many people?
        </label>
        <input required type="number" min="1" value={numberOfPeople}
          onChange={e => setNumberOfPeople(e.target.value)} className="form-input" />
      </div>

      {/* Allergens */}
      <div className="border-t border-slate-200 pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-orange-500" />
          <h3 className="text-sm font-bold text-slate-800">Your Dietary Restrictions</h3>
        </div>

        {profileLoaded && (
          <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs shadow-sm">
            💡 Loaded your saved allergy profile. You can change it for this request below.
          </div>
        )}

        <AllergenPicker mode="needer" selected={allergiesToAvoid} onChange={setAllergiesToAvoid} />

        <input type="text" placeholder="Anything else? e.g. Can't eat very spicy food"
          value={allergyNotes} onChange={e => setAllergyNotes(e.target.value)} className="form-input text-sm" />

        {user && (
          <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-500 hover:text-slate-800 transition">
            <input type="checkbox" checked={saveProfile} onChange={e => setSaveProfile(e.target.checked)}
              className="w-4 h-4 accent-orange-500 rounded" />
            Save my allergy profile for next time
          </label>
        )}
      </div>

      {/* Address */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
            <MapPin size={13} /> Where do you need food?
          </label>
          <button type="button" onClick={handleAutoLocate}
            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 transition shadow-sm border border-orange-200/50">
            <Navigation size={10} /> Auto-Locate
          </button>
        </div>
        <textarea
          required
          rows="2"
          placeholder="e.g. Near Star Mall entrance, Bandra West"
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="form-input text-sm resize-none"
        />
      </div>

      {/* Anonymous */}
      <label className="flex items-center gap-2 text-sm cursor-pointer text-slate-500 hover:text-slate-800 transition border-t border-slate-200 pt-4">
        <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)}
          className="w-4 h-4 accent-orange-500 rounded" />
        Keep my request anonymous
      </label>

      <button type="submit" disabled={loading}
        className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 ${isSOS ? 'bg-gradient-to-r from-red-600 to-rose-600 shadow-lg shadow-red-500/20' : 'btn-primary'}`}>
        {loading ? 'Sending…' : isSOS ? '🚨 Broadcast Emergency SOS' : '🍽️ Find Matching Food'}
      </button>
    </form>
  );
}
