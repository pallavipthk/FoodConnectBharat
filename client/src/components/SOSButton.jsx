import React, { useState } from 'react';
import NeedForm from './NeedForm';
import { ShieldAlert, X } from 'lucide-react';

export default function SOSButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-16 h-16 rounded-full shadow-2xl border-4 border-red-500/30 flex flex-col items-center justify-center text-white font-black hover:scale-110 transition-all"
        style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 0 30px rgba(239,68,68,0.5), 0 4px 20px rgba(0,0,0,0.4)', animation: 'blink 2s ease infinite' }}
      >
        <ShieldAlert size={20} className="mb-0.5" />
        <span className="text-[9px] uppercase tracking-widest leading-none">SOS</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-card overflow-hidden">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-600" />
                <h3 className="font-extrabold text-slate-900" style={{ fontFamily: 'Plus Jakarta Sans' }}>Emergency Food Request</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="max-h-[85vh] overflow-y-auto custom-scrollbar p-6 pt-2">
              <NeedForm isSOS={true} onClose={() => setShowModal(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
