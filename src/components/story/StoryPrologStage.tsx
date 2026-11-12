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
      className="h-[100dvh] w-full flex flex-col justify-between pt-[max(4.5rem,env(safe-area-inset-top,56px))] sm:pt-24 lg:pt-28 short:pt-14 pb-[max(4.5rem,env(safe-area-inset-bottom,18px))] story-split:pb-12 short:pb-3 px-4 sm:px-8 lg:px-14 relative pointer-events-none select-none overflow-hidden"
    >
      {/* Directional white paper scrim so ink keeps >7:1 contrast over map coastlines */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent sm:w-3/4 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-56 short:h-40 bg-gradient-to-t from-white via-white/85 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Editorial Opening Composition (Zero pills, zero capsule badges) */}
      <div
        className={`relative z-10 max-w-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isActive ? 'opacity-100 translate-y-0' : 'opacity-30 -translate-y-4'
        }`}
      >
        <div className="border-t border-slate-900/15 pt-2.5 sm:pt-3 mb-3 sm:mb-5 short:mb-2 flex items-baseline justify-between gap-4 max-w-md">
          <span className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-widest text-slate-600 uppercase tabular-nums">
            00 / {isId ? 'Monografi Tektonik' : 'Tectonic Monograph'}
          </span>
          <span className="font-mono text-[10px] tracking-wider text-slate-500 hidden sm:inline tabular-nums">
            94°E to 142°E · 12°S to 7°N
          </span>
        </div>

        <h2 className="font-sans font-black uppercase text-slate-950 tracking-[-0.035em] leading-[0.92] text-[clamp(2rem,8.5vw,5.25rem)] short:text-[clamp(1.65rem,4.5vw,2.75rem)]">
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

        <div className="overflow-hidden mt-3 sm:mt-5 short:mt-2 max-w-[46ch]">
          <p className="animate-mask-reveal-3 font-sans text-[13px] sm:text-base short:text-xs leading-relaxed short:leading-snug text-slate-700 font-normal">
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
        <div className="border-t border-b border-slate-900/15 py-2.5 sm:py-4 short:py-2 grid grid-cols-3 divide-x divide-slate-900/10 pointer-events-auto">
          <div className="pr-2 sm:pr-6">
            <div className="font-mono text-[8.5px] sm:text-[10px] text-slate-500 uppercase tracking-wider truncate">
              {isId ? 'Aktivitas Gempa' : 'Earthquakes'}
            </div>
            <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1.5 sm:gap-2 font-mono tabular-nums">
              <span className="text-base sm:text-2xl short:text-lg font-bold text-slate-950">
                {totalQuakes}
              </span>
              <span className="text-[10px] sm:text-xs font-semibold text-[#0f2f63]">
                {maxMag && maxMag !== 'N/A' ? maxMag : ''}
              </span>
            </div>
          </div>

          <div className="px-2 sm:px-6">
            <div className="font-mono text-[8.5px] sm:text-[10px] text-slate-500 uppercase tracking-wider truncate">
              {isId ? 'Gunung Siaga/Awas' : 'Alert Volcanoes'}
            </div>
            <div className="mt-0.5 sm:mt-1 font-mono text-base sm:text-2xl short:text-lg font-bold text-slate-950 tabular-nums">
              {activeVolcanoCount}
            </div>
          </div>

          <div className="pl-2 sm:pl-6">
            <div className="font-mono text-[8.5px] sm:text-[10px] text-slate-500 uppercase tracking-wider truncate">
              {isId ? 'Titik Panas VIIRS' : 'VIIRS Hotspots'}
            </div>
            <div className="mt-0.5 sm:mt-1 font-mono text-base sm:text-2xl short:text-lg font-bold text-slate-950 tabular-nums">
              {hotspotCount}
            </div>
          </div>
        </div>

        <div className="pt-3 sm:pt-4 short:pt-2.5 flex flex-wrap items-center justify-between gap-2.5 pointer-events-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onBegin}
              className="min-h-[44px] short:min-h-[38px] px-4 sm:px-5 py-2 rounded-md bg-[#0f2f63] hover:bg-[#153e7e] text-white font-mono text-[11px] sm:text-xs font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] focus-visible:ring-offset-2"
            >
              {isId ? 'Mulai ekspedisi' : 'Begin expedition'}
            </button>

            <button
              type="button"
              onClick={onExit}
              className="min-h-[44px] short:min-h-[38px] px-2.5 sm:px-3 py-2 font-mono text-[11px] sm:text-xs font-medium tracking-wide text-slate-700 hover:text-slate-950 underline underline-offset-4 decoration-slate-400 hover:decoration-slate-950 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] focus-visible:ring-offset-2 rounded-md"
            >
              {isId ? 'Kembali ke peta' : 'Return to map'}
            </button>
          </div>

          <span className="hidden lg:inline short:hidden font-mono text-[10px] tracking-widest text-slate-500 uppercase">
            {isId ? 'Scroll untuk bab 01' : 'Scroll for chapter 01'}
          </span>
        </div>
      </div>
    </section>
  );
};
