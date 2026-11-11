import React from 'react';
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
      className="h-[100dvh] w-full flex flex-col justify-between pt-[max(5.25rem,env(safe-area-inset-top,64px))] sm:pt-28 pb-[max(4.75rem,env(safe-area-inset-bottom,24px))] sm:pb-12 px-4 sm:px-8 lg:px-14 relative pointer-events-none select-none overflow-hidden"
    >
      {/* Directional white paper scrim so ink keeps >7:1 contrast over map coastlines */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent sm:w-3/4 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Editorial Opening Composition (Zero pills, zero capsule badges) */}
      <div
        className={`relative z-10 max-w-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isActive ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'
        }`}
      >
        <div className="border-t border-slate-900/15 pt-3 mb-4 sm:mb-5 flex items-baseline justify-between gap-4 max-w-md">
          <span className="font-mono text-[11px] font-semibold tracking-widest text-slate-600 uppercase tabular-nums">
            00 / {isId ? 'Monografi Tektonik' : 'Tectonic Monograph'}
          </span>
          <span className="font-mono text-[10px] tracking-wider text-slate-500 hidden sm:inline tabular-nums">
            94°E to 142°E · 12°S to 7°N
          </span>
        </div>

        <h2 className="font-sans font-black uppercase text-slate-950 tracking-[-0.035em] leading-[0.92] text-[clamp(2.5rem,7.5vw,5.25rem)]">
          <span className="block overflow-hidden pb-1">
            <span className="block animate-mask-reveal-1">
              {isId ? 'Cincin Api' : 'Archipelago'}
            </span>
          </span>
          <span className="block overflow-hidden pb-1 text-[#0f2f63]">
            <span className="block animate-mask-reveal-2">
              {isId ? 'Nusantara.' : 'Tectonics.'}
            </span>
          </span>
        </h2>

        <div className="overflow-hidden mt-4 sm:mt-5 max-w-[46ch]">
          <p className="animate-mask-reveal-3 font-sans text-sm sm:text-base leading-relaxed text-slate-700 font-normal">
            {isId
              ? 'Penelusuran visual melintasi pertemuan tiga lempeng tektonik utama Indonesia, dari palung subduksi Sunda hingga sabuk tumbukan Papua.'
              : 'A cartographic survey across Indonesia’s converging plate boundaries, tracing seismic strain from the Sunda Trench to the Papua Cordillera.'}
          </p>
        </div>
      </div>

      {/* Bottom Hairline Telemetry Ledger + Sharp Editorial Actions */}
      <div
        className={`relative z-10 w-full max-w-4xl animate-mask-reveal-4 transition-all duration-500 ${
          isActive ? 'opacity-100 translate-y-0' : 'opacity-25 translate-y-4'
        }`}
      >
        <div className="border-t border-b border-slate-900/15 py-3 sm:py-4 grid grid-cols-3 divide-x divide-slate-900/10 pointer-events-auto">
          <div className="pr-3 sm:pr-6">
            <div className="font-mono text-[9.5px] sm:text-[10px] text-slate-500 uppercase tracking-wider truncate">
              {isId ? 'Aktivitas Gempa' : 'Earthquakes'}
            </div>
            <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
              <span className="text-lg sm:text-2xl font-bold text-slate-950">
                {totalQuakes}
              </span>
              <span className="text-xs font-semibold text-[#0f2f63]">
                {maxMag !== '—' ? maxMag : ''}
              </span>
            </div>
          </div>

          <div className="px-3 sm:px-6">
            <div className="font-mono text-[9.5px] sm:text-[10px] text-slate-500 uppercase tracking-wider truncate">
              {isId ? 'Gunung Siaga/Awas' : 'Alert Volcanoes'}
            </div>
            <div className="mt-1 font-mono text-lg sm:text-2xl font-bold text-slate-950 tabular-nums">
              {activeVolcanoCount}
            </div>
          </div>

          <div className="pl-3 sm:pl-6">
            <div className="font-mono text-[9.5px] sm:text-[10px] text-slate-500 uppercase tracking-wider truncate">
              {isId ? 'Titik Panas VIIRS' : 'VIIRS Hotspots'}
            </div>
            <div className="mt-1 font-mono text-lg sm:text-2xl font-bold text-slate-950 tabular-nums">
              {hotspotCount}
            </div>
          </div>
        </div>

        <div className="pt-3.5 sm:pt-4 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBegin}
              className="min-h-[44px] px-5 py-2.5 rounded-md bg-[#0f2f63] hover:bg-[#153e7e] text-white font-mono text-xs font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] focus-visible:ring-offset-2"
            >
              {isId ? 'Mulai ekspedisi' : 'Begin expedition'}
            </button>

            <button
              type="button"
              onClick={onExit}
              className="min-h-[44px] px-3 py-2 font-mono text-xs font-medium tracking-wide text-slate-700 hover:text-slate-950 underline underline-offset-4 decoration-slate-400 hover:decoration-slate-950 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] focus-visible:ring-offset-2 rounded-md"
            >
              {isId ? 'Kembali ke peta' : 'Return to map'}
            </button>
          </div>

          <span className="hidden sm:inline font-mono text-[10px] tracking-widest text-slate-500 uppercase">
            {isId ? 'Scroll untuk bab 01' : 'Scroll for chapter 01'}
          </span>
        </div>
      </div>
    </section>
  );
};
