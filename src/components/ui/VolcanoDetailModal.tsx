import React from 'react';
import { VolcanoActivity } from '../../types/seismic';
import { X, Flame, Wind, Mountain, Compass, ShieldAlert, Share2, AlertTriangle } from 'lucide-react';
import { Language } from '../../utils/i18n';

interface VolcanoDetailModalProps {
  volcano: VolcanoActivity | null;
  onClose: () => void;
  lang: Language;
}

export const VolcanoDetailModal: React.FC<VolcanoDetailModalProps> = ({
  volcano,
  onClose,
  lang,
}) => {
  if (!volcano) return null;

  const isCritical = volcano.alert_level === 'Level IV';
  const isWarning = volcano.alert_level === 'Level III';

  const alertBadgeColor = isCritical
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : isWarning
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : volcano.alert_level === 'Level II'
    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';

  const alertDotColor = isCritical
    ? 'bg-rose-600'
    : isWarning
    ? 'bg-amber-500'
    : volcano.alert_level === 'Level II'
    ? 'bg-yellow-500'
    : 'bg-emerald-500';

  const alertLevelLabel = {
    'Level I': lang === 'id' ? 'LEVEL I (NORMAL)' : 'LEVEL I (NORMAL)',
    'Level II': lang === 'id' ? 'LEVEL II (WASPADA)' : 'LEVEL II (ADVISORY)',
    'Level III': lang === 'id' ? 'LEVEL III (SIAGA)' : 'LEVEL III (WATCH)',
    'Level IV': lang === 'id' ? 'LEVEL IV (AWAS)' : 'LEVEL IV (WARNING)',
  }[volcano.alert_level];

  const handleShare = () => {
    const text = `🌋 ${volcano.name} - Status: ${volcano.alert_level}\nKetinggian Kolom Abu: FL${
      volcano.ash_plume?.cloud_top_fl || 'N/A'
    }\nArah Sebaran: ${volcano.ash_plume?.direction || 'N/A'}\nInfo dari Nusantara Hazard Observatory: https://global-seismic-tracker.vercel.app/`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const latDir = volcano.latitude >= 0 ? 'N' : 'S';
  const lonDir = volcano.longitude >= 0 ? 'E' : 'W';
  const formattedCoords = `${Math.abs(volcano.latitude).toFixed(3)}° ${latDir}, ${Math.abs(volcano.longitude).toFixed(3)}° ${lonDir}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detail status vulkanik ${volcano.name}`}
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/25 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        data-lenis-prevent="true"
        className="w-full max-w-[560px] max-h-[88vh] overflow-y-auto my-auto rounded-3xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {/* Editorial Liquid Glass Native Card */}
        <div className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/90 select-none bg-white/90 backdrop-blur-2xl relative overflow-hidden ring-1 ring-black/[0.04]">
          {/* Technical Corner Crosshairs */}
          <span className="absolute top-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┌</span>
          <span className="absolute top-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┐</span>
          <span className="absolute bottom-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">└</span>
          <span className="absolute bottom-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┘</span>

          {/* 1. HEADER ROW */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${alertDotColor} shrink-0 ${isCritical ? 'animate-ping' : ''}`} />
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold truncate">
                  VOLCANIC TELEMETRY // PVMBG - MAGMA INDONESIA
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-sans font-black text-slate-950 tracking-tight leading-snug truncate uppercase">
                {volcano.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold tracking-wider ${alertBadgeColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${alertDotColor}`} />
                  {alertLevelLabel}
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {volcano.island}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Close readout"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. GEODETIC & VONA METRICS */}
          <div className="py-3.5 grid grid-cols-3 gap-2.5 border-b border-slate-100 font-mono">
            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase tracking-wider">
                <Mountain className="w-3 h-3 text-slate-400" />
                <span>ELEVASI</span>
              </div>
              <span className="text-sm font-bold text-slate-900 mt-1">{volcano.elevation_m.toLocaleString()} M</span>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase tracking-wider">
                <Compass className="w-3 h-3 text-slate-400" />
                <span>KOORDINAT</span>
              </div>
              <span className="text-xs font-bold text-slate-900 mt-1 truncate">{formattedCoords}</span>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase tracking-wider">
                <ShieldAlert className="w-3 h-3 text-slate-400" />
                <span>VONA CODE</span>
              </div>
              <span className={`text-xs font-bold mt-1 ${
                volcano.ash_plume?.aviation_color_code === 'RED'
                  ? 'text-rose-600'
                  : volcano.ash_plume?.aviation_color_code === 'ORANGE'
                  ? 'text-amber-600'
                  : 'text-slate-800'
              }`}>
                {volcano.ash_plume?.aviation_color_code || 'YELLOW'}
              </span>
            </div>
          </div>

          {/* 3. ASH PLUME & AVIATION HAZARD TELEMETRY */}
          {volcano.ash_plume && (
            <div className="py-3 border-b border-slate-100">
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center justify-between text-rose-800 font-bold">
                  <span className="flex items-center gap-1.5 text-[11px] tracking-wide">
                    <Wind className="w-3.5 h-3.5 text-rose-600" />
                    <span>SEBARAN ABU VULKANIK (VAAC DARWIN)</span>
                  </span>
                  <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-bold">
                    FL{volcano.ash_plume.cloud_top_fl} (~{(volcano.ash_plume.cloud_top_fl * 100 * 0.3048).toFixed(0)}m)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 pt-1 border-t border-rose-200/60">
                  <div>
                    <span className="text-slate-400 block">ARAH ANGIN:</span>
                    <span className="font-bold text-rose-900">{volcano.ash_plume.direction} ({volcano.ash_plume.speed_knots} KNOTS)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">STATUS KORIDOR UDARA:</span>
                    <span className="font-bold text-rose-900">NOTAM / SIGMET ACTIVE</span>
                  </div>
                </div>

                {volcano.ash_plume.advisory_summary && (
                  <p className="text-[10px] text-slate-600 font-sans leading-relaxed bg-white/70 p-2 rounded border border-rose-100">
                    {volcano.ash_plume.advisory_summary}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 4. ACTIVITY NARRATIVE & CRATER REPORT */}
          <div className="py-3 flex flex-col gap-2 font-sans text-xs">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
              CATATAN AKTIVITAS VISUAL & KEGEMPAAN (PVMBG)
            </span>
            <p className="text-slate-700 leading-relaxed bg-slate-50/90 p-3 rounded-xl border border-slate-100">
              {volcano.status_description}
            </p>
            {volcano.crater_status && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>KAWAH: {volcano.crater_status}</span>
              </div>
            )}
          </div>

          {/* 5. FOOTER ACTIONS */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-98"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>BAGIKAN PERINGATAN (WA)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-semibold transition-colors cursor-pointer active:scale-98"
            >
              TUTUP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
