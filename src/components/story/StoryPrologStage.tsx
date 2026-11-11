import React from 'react';
import { ArrowDown, ArrowRight, Activity, Mountain, Flame } from 'lucide-react';
import { Language } from '../../utils/i18n';

interface StoryPrologStageProps {
  totalQuakes: number;
  maxMag: string;
  activeVolcanoCount: number;
  hotspotCount: number;
  onBegin: () => void;
  onExit: () => void;
  isActive: boolean;
  lang: Language;
}

export const StoryPrologStage: React.FC<StoryPrologStageProps> = ({
  totalQuakes,
  maxMag,
  activeVolcanoCount,
  hotspotCount,
  onBegin,
  onExit,
  isActive,
  lang,
}) => {
  const isId = lang === 'id';

  return (
    <section
      data-story-stage="0"
      className="h-[100dvh] w-full flex flex-col justify-between pt-[max(4.75rem,env(safe-area-inset-top,56px))] sm:pt-24 pb-[max(4.5rem,env(safe-area-inset-bottom,28px))] sm:pb-10 px-4 sm:px-8 lg:px-14 relative pointer-events-none select-none"
    >
      {/* Top Editorial Header + Live Datum */}
      <div className="flex items-start justify-between gap-4 z-10">
        <div
          className={`max-w-3xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isActive ? 'opacity-100 translate-y-0' : 'opacity-40 -translate-y-4'
          }`}
        >
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-2xs mb-3 sm:mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] animate-pulse" />
            <span className="text-[9.5px] sm:text-[10.5px] font-mono font-bold tracking-[0.2em] text-slate-700 uppercase">
              {isId
                ? '00 // EKSPEDISI TEKTONIK NUSANTARA'
                : '00 // NUSANTARA TECTONIC EXPEDITION'}
            </span>
          </div>

          {/* Kinetic Typographic Mask Reveal Headline */}
          <h2 className="font-sans font-black uppercase text-slate-950 tracking-tight leading-[0.9] text-[clamp(2.35rem,8vw,5.25rem)] drop-shadow-[0_2px_18px_rgba(255,255,255,0.9)]">
            <span className="block overflow-hidden pb-1">
              <span className="block animate-mask-reveal-1">
                {isId ? 'CINCIN API' : 'ARCHIPELAGO'}
              </span>
            </span>
            <span className="block overflow-hidden pb-1 text-[#0f2f63]">
              <span className="block animate-mask-reveal-2">
                {isId ? 'NUSANTARA.' : 'TECTONICS.'}
              </span>
            </span>
          </h2>

          <div className="overflow-hidden mt-3 sm:mt-4 max-w-xl">
            <p className="animate-mask-reveal-3 font-mono text-[10.5px] sm:text-xs leading-relaxed text-slate-700 uppercase tracking-wide bg-white/75 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-200/70 inline-block">
              {isId
                ? 'MENELUSURI PERTEMUAN TIGA LEMPENG RAKSASA — DARI PALUNG SUBDUKSI SUNDA HINGGA SABUK TUMBUKAN PAPUA.'
                : 'TRACING EARTH’S MOST COMPLEX TRIPLE JUNCTION — FROM THE SUNDA MEGATHRUST TO THE PAPUA COLLISION BELT.'}
            </p>
          </div>
        </div>

        {/* Desktop Right Technical Specimen Stamp */}
        <div className="hidden lg:flex flex-col items-end text-right font-mono text-[10px] tracking-wider text-slate-500 pt-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/88 backdrop-blur-md border border-slate-200/80 shadow-2xs space-y-0.5">
            <div className="text-[9px] text-slate-400 font-semibold uppercase">
              {isId ? 'CAKUPAN KORIDOR' : 'SURVEY CORRIDOR'}
            </div>
            <div className="font-bold text-slate-900">94°E — 142°E · 12°S — 7°N</div>
            <div className="text-[9px] text-emerald-700 font-semibold">
              {isId ? 'TELEMETRI AKTIF 60FPS' : 'REAL-TIME TELEMETRY LOCKED'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Composition: Live Archipelago Snapshot + Navigation Actions */}
      <div
        className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3.5 sm:gap-6 z-10 animate-mask-reveal-4 transition-all duration-500 ${
          isActive ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4'
        }`}
      >
        {/* Live Telemetry Summary Card */}
        <div className="pointer-events-auto bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-xl max-w-lg w-full sm:w-auto">
          <div className="flex items-center justify-between gap-3 pb-2 mb-2.5 border-b border-slate-100">
            <span className="font-mono text-[9px] sm:text-[9.5px] font-bold tracking-widest text-slate-400 uppercase">
              {isId ? 'DENYUT OBSERVATORIUM SAAT INI' : 'LIVE ARCHIPELAGO TELEMETRY'}
            </span>
            <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
              LIVE FEED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 font-mono">
            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl px-2.5 py-2">
              <div className="flex items-center gap-1 text-[8.5px] text-slate-400 uppercase">
                <Activity className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                <span className="truncate">{isId ? 'GEMPA' : 'QUAKES'}</span>
              </div>
              <div className="text-sm sm:text-base font-black text-slate-950 mt-0.5 tabular-nums">
                {totalQuakes}{' '}
                <span className="text-[10px] font-semibold text-rose-700">{maxMag}</span>
              </div>
            </div>

            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl px-2.5 py-2">
              <div className="flex items-center gap-1 text-[8.5px] text-slate-400 uppercase">
                <Mountain className="w-2.5 h-2.5 text-red-600 shrink-0" />
                <span className="truncate">{isId ? 'SIAGA/AWAS' : 'VOLCANO'}</span>
              </div>
              <div className="text-sm sm:text-base font-black text-slate-950 mt-0.5 tabular-nums">
                {activeVolcanoCount}
              </div>
            </div>

            <div className="bg-slate-50/90 border border-slate-200/70 rounded-xl px-2.5 py-2">
              <div className="flex items-center gap-1 text-[8.5px] text-slate-400 uppercase">
                <Flame className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span className="truncate">{isId ? 'TITIK API' : 'HOTSPOTS'}</span>
              </div>
              <div className="text-sm sm:text-base font-black text-slate-950 mt-0.5 tabular-nums">
                {hotspotCount}
              </div>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onBegin}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0f2f63] hover:bg-[#153e7e] text-white font-mono text-[10.5px] sm:text-xs font-bold tracking-wider uppercase shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <span>{isId ? 'MULAI EKSPEDISI' : 'BEGIN EXPEDITION'}</span>
              <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
            </button>

            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase border border-slate-200/80 transition-all cursor-pointer active:scale-95"
            >
              <span>{isId ? 'KE PETA' : 'LIVE MAP'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Bottom-Right Subtle Scroll Cue (Desktop) */}
        <div className="hidden sm:flex flex-col items-end font-mono text-[10px] text-slate-500 tracking-widest uppercase pr-10">
          <div className="flex items-center gap-2 bg-white/85 backdrop-blur-md border border-slate-200/80 px-3 py-1.5 rounded-full shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-ping" />
            <span>{isId ? 'SCROLL UNTUK BAB 01' : 'SCROLL TO CHAPTER 01'}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
