import React, { useState } from 'react';
import { X, ExternalLink, ShieldAlert, Info, ZoomIn } from 'lucide-react';
import { LiquidCard } from './liquid-glass';

interface BMKGShakemapModalProps {
  isOpen: boolean;
  onClose: () => void;
  shakemapUrl?: string | null;
  location?: string;
  magnitude?: string | number;
  depth?: string | number;
  time?: string;
  potensi?: string;
}

export const BMKGShakemapModal: React.FC<BMKGShakemapModalProps> = ({
  isOpen,
  onClose,
  shakemapUrl,
  location = 'Indonesia Archipelago',
  magnitude = 'M5.0+',
  depth = '10 km',
  time = 'Terbaru',
  potensi = 'Tidak berpotensi tsunami',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const isTsunamiThreat = potensi?.toLowerCase().includes('berpotensi tsunami');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <LiquidCard className="rounded-3xl shadow-2xl overflow-hidden border border-slate-200/90 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80 bg-white/70">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-rose-600">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-sans font-bold text-sm sm:text-base text-slate-900 tracking-tight">
                  PETA TINGKAT GUNCANGAN (SHAKEMAP BMKG)
                </h3>
                <p className="font-mono text-[11px] text-slate-500">
                  BADAN METEOROLOGI, KLIMATOLOGI, DAN GEOFISIKA
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">MAGNITUDO</span>
                <span className="font-bold text-rose-600 text-sm">{magnitude}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">KEDALAMAN</span>
                <span className="font-bold text-slate-800 text-sm">{depth}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 col-span-2">
                <span className="block text-[10px] text-slate-400 font-bold uppercase">WILAYAH PUSAT</span>
                <span className="font-bold text-slate-800 truncate block text-xs">{location}</span>
              </div>
            </div>

            {/* Tsunami Status Banner */}
            <div
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-mono font-semibold ${
                isTsunamiThreat
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isTsunamiThreat ? 'bg-rose-600' : 'bg-emerald-600'}`} />
              <span>STATUS: {potensi.toUpperCase()}</span>
            </div>

            {/* Shakemap Image Section */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-900 flex items-center justify-center min-h-[260px] sm:min-h-[340px]">
              {shakemapUrl && !imageError ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 font-mono text-xs">
                      <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>Mengunduh Shakemap BMKG...</span>
                    </div>
                  )}
                  <img
                    src={shakemapUrl}
                    alt="Peta Guncangan BMKG"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    className={`w-full h-auto object-contain transition-opacity duration-300 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 font-mono text-xs">
                  <Info className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-slate-300 font-semibold mb-1">Peta Shakemap Belum Tersedia</p>
                  <p className="text-slate-500 text-[11px] max-w-sm">
                    BMKG menghasilkan shakemap resmi dalam waktu 5-15 menit pasca kejadian gempa signifikan.
                  </p>
                </div>
              )}
            </div>

            {/* MMI Educational Reference Guide */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] font-sans">
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700 text-xs mb-2">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>PANDUAN SKALA INTENSITAS MMI (MODIFIED MERCALLI INTENSITY)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 font-mono text-[10px]">
                <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="font-bold text-slate-900">II - III MMI:</span> Getaran dirasakan oleh beberapa orang, benda ringan yang digantung bergoyang.
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="font-bold text-slate-900">IV - V MMI:</span> Dirasakan hampir semua penduduk, gerabah pecah, jendela berderik, tiang bergoyang.
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="font-bold text-amber-700">VI - VII MMI:</span> Kerusakan ringan pada bangunan dengan konstruksi yang kurang baik, dinding retak.
                </div>
                <div className="p-2 rounded-lg bg-white border border-slate-200/60">
                  <span className="font-bold text-rose-700">VIII+ MMI:</span> Kerusakan berat, dinding terlepas dari rangka, struktur bangunan runtuh.
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200/80 bg-white/70 font-mono text-xs">
            <span className="text-slate-500 text-[11px]">{time}</span>
            {shakemapUrl && (
              <a
                href={shakemapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold transition-all shadow-xs"
              >
                <span>Buka Gambar Asli</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </LiquidCard>
      </div>
    </div>
  );
};
