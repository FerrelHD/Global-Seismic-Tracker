import React, { useState } from 'react';
import { X, ExternalLink, ZoomIn, ZoomOut, CheckCircle, AlertTriangle } from 'lucide-react';

interface BMKGShakemapModalProps {
  isOpen: boolean;
  onClose: () => void;
  shakemapUrl?: string | null;
  location?: string;
  magnitude?: string | number;
  depth?: string | number;
  time?: string;
  potensi?: string;
  coordinates?: string;
}

export const BMKGShakemapModal: React.FC<BMKGShakemapModalProps> = ({
  isOpen,
  onClose,
  shakemapUrl,
  location = 'Kepulauan Indonesia',
  magnitude = 'M5.0+',
  depth = '10 km',
  time = 'Terbaru',
  potensi = 'Tidak berpotensi tsunami',
  coordinates,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 1.35>(1);

  if (!isOpen) return null;

  const isTsunamiThreat =
    potensi?.toLowerCase().includes('berpotensi tsunami') ||
    potensi?.toLowerCase().includes('tsunami warning');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col pointer-events-auto shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-[#fafafa] text-slate-900 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Swiss Editorial Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 bg-white font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="font-bold tracking-widest text-slate-900 uppercase">
              BMKG TEWS · BULLETIN
            </span>
            <span className="text-slate-400 font-light hidden sm:inline">/</span>
            <span className="text-slate-500 hidden sm:inline tracking-wider">
              SHAKEMAP SURVEY
            </span>
          </div>

          <div className="flex items-center gap-3">
            {coordinates && (
              <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                [{coordinates}]
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Body: Scientific Document Layout */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* Header Title & Date */}
          <div className="border-b border-slate-200/80 pb-4">
            <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 block mb-1">
              EPICENTER SECTOR REPORT
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 uppercase font-sans">
              {location}
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-1">
              {time}
            </p>
          </div>

          {/* Clean Metric Grid (Swiss Hairline Rules) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-b border-slate-200/80 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase block">MAGNITUDE</span>
              <span className="text-lg sm:text-xl font-bold text-slate-950 block mt-0.5">
                {magnitude}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase block">HYPOCENTER DEPTH</span>
              <span className="text-lg sm:text-xl font-bold text-slate-950 block mt-0.5">
                {depth}
              </span>
            </div>

            <div className="col-span-2 sm:col-span-2">
              <span className="text-[10px] text-slate-400 tracking-wider uppercase block">TSUNAMI ADVISORY</span>
              <div className="flex items-center gap-1.5 mt-1">
                {isTsunamiThreat ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-rose-700 uppercase">{potensi}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-800 uppercase">{potensi}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. Official Shakemap Viewer Canvas */}
          <div className="relative rounded-xl border border-slate-200 bg-white p-3 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[420px] shadow-xs">
            {/* Zoom Tool Floating Top-Right */}
            {shakemapUrl && imageLoaded && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setZoomLevel((z) => (z === 1 ? 1.35 : 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/90 font-mono text-[10px] tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  {zoomLevel === 1 ? <ZoomIn className="w-3.5 h-3.5" /> : <ZoomOut className="w-3.5 h-3.5" />}
                  <span>{zoomLevel === 1 ? 'ZOOM' : 'RESET'}</span>
                </button>
              </div>
            )}

            {shakemapUrl && !imageError ? (
              <div className="w-full flex items-center justify-center overflow-hidden">
                {!imageLoaded && (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 font-mono text-xs">
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    <span>SYNCHRONIZING BMKG ARCHIVE...</span>
                  </div>
                )}
                <img
                  src={shakemapUrl}
                  alt="Peta Guncangan Shakemap BMKG"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transition: 'transform 0.25s ease-out',
                  }}
                  className={`max-w-full max-h-[460px] object-contain transition-opacity duration-200 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 font-mono text-xs">
                <p className="font-semibold text-slate-700 mb-1">SHAKEMAP SEDANG DIPROSES BMKG</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Peta intensitas guncangan dipublikasikan secara resmi oleh sistem InaTEWS beberapa menit pasca perekaman gelombang seismik.
                </p>
              </div>
            )}
          </div>

          {/* 4. Minimalist MMI Intensity Scale Ribbon */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 space-y-2 font-mono">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
              <span>SKALA INTENSITAS GUNCANGAN (MMI)</span>
              <span className="text-slate-500">BMKG OFFICIAL INTENSITY SCALE</span>
            </div>

            {/* Continuous Color Ribbon */}
            <div className="w-full h-2 rounded-full overflow-hidden bg-slate-100">
              <div className="w-full h-full bg-gradient-to-r from-cyan-400 via-green-400 via-yellow-400 via-orange-500 via-rose-600 to-purple-800" />
            </div>

            {/* Scale Divisions */}
            <div className="grid grid-cols-5 text-[9px] text-slate-500 pt-1">
              <div>
                <span className="block font-bold text-slate-800">I - III</span>
                <span>Lemah</span>
              </div>
              <div>
                <span className="block font-bold text-slate-800">IV - V</span>
                <span>Sedang</span>
              </div>
              <div>
                <span className="block font-bold text-slate-800">VI</span>
                <span>Kuat</span>
              </div>
              <div>
                <span className="block font-bold text-slate-800">VII - VIII</span>
                <span>Sangat Kuat</span>
              </div>
              <div className="text-right">
                <span className="block font-bold text-slate-800">IX - XII</span>
                <span>Destruktif</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Minimal Clean Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-white font-mono text-xs">
          <span className="text-[10px] text-slate-400 tracking-wider uppercase">
            SUMBER: PUSAT GEMPABUMI DAN TSUNAMI BMKG
          </span>

          <div className="flex items-center gap-2">
            {shakemapUrl && (
              <a
                href={shakemapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-300 font-mono text-[11px] font-medium tracking-wider transition-all cursor-pointer"
              >
                <span>BUKA CITRA ASLI</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white font-mono text-[11px] font-semibold tracking-wider transition-all cursor-pointer"
            >
              TUTUP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
