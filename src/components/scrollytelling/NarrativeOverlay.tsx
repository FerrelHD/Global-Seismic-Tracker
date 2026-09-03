import React from 'react';
import { SeismicEvent } from '../../types/seismic';
import { FilterControls } from '../ui/FilterControls';
import { ChevronDown, Radio, Activity, Compass, ShieldAlert } from 'lucide-react';

interface NarrativeOverlayProps {
  currentChapter: number;
  topEvent: SeismicEvent | null;
  totalEvents: number;
  avgDepth: string;
  maxMag: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  minMagnitude: number;
  onMinMagChange: (m: number) => void;
  depthFilter: 'all' | 'shallow' | 'mid' | 'deep';
  onDepthFilterChange: (d: 'all' | 'shallow' | 'mid' | 'deep') => void;
  filteredCount: number;
}

export const NarrativeOverlay: React.FC<NarrativeOverlayProps> = ({
  currentChapter,
  topEvent,
  totalEvents,
  avgDepth,
  maxMag,
  searchQuery,
  onSearchChange,
  minMagnitude,
  onMinMagChange,
  depthFilter,
  onDepthFilterChange,
  filteredCount,
}) => {
  return (
    <div className="relative z-10 w-full pointer-events-none">
      {/* Chapter Indicator Pill (Sticky top right) */}
      <div className="fixed top-24 right-8 z-30 flex items-center gap-2 font-mono text-xs text-slate-700 bg-white/90 px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span className="font-semibold">CH.0{currentChapter} // 04</span>
      </div>

      {/* SECTION 1: GLOBAL PULSE */}
      <section className="h-screen w-full flex flex-col justify-between p-8 sm:p-16 max-w-4xl">
        <div className="pt-20">
          <div className="flex items-center gap-2 text-rose-500 font-mono text-xs font-bold tracking-widest uppercase mb-3">
            <Radio className="w-3.5 h-3.5 animate-spin" />
            CHAPTER 01 // GLOBAL PULSE
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tighter text-slate-950 font-sans uppercase leading-none">
            TECTONIC <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
              HARMONICS
            </span>
          </h1>
          <p className="mt-4 text-slate-600 text-sm sm:text-base font-normal max-w-xl leading-relaxed">
            Earth's lithosphere in continuous oscillation. Visualizing dynamic tectonic stress release across planetary fault lines from USGS telemetry.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="pb-8 flex items-center gap-2 text-xs font-mono font-medium text-slate-400 animate-bounce">
          <ChevronDown className="w-4 h-4 text-slate-600" />
          <span>SCROLL TO TRAVERSE PLANETARY TELEMETRY</span>
        </div>
      </section>

      {/* SECTION 2: CRITICAL EPISTRUM */}
      <section className="h-screen w-full flex flex-col justify-center p-8 sm:p-16 max-w-xl">
        <div className="p-6 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl text-slate-800">
          <div className="flex items-center justify-between gap-2 text-rose-600 font-mono text-xs font-bold tracking-widest uppercase mb-2">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> CHAPTER 02 // CRITICAL EPISTRUM
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 font-bold">
              PEAK SHOCK
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight uppercase mt-2">
            {topEvent?.place || 'Analyzing High-Shock Event...'}
          </h2>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 font-mono text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">MAGNITUDE</span>
              <span className="text-xl font-bold text-rose-600">M{topEvent?.magnitude?.toFixed(1) ?? maxMag}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">FOCAL DEPTH</span>
              <span className="text-xl font-bold text-amber-600">{topEvent?.depth.toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-medium">TIMESTAMP</span>
              <span className="text-slate-700 text-[11px] block mt-1 font-semibold">
                {topEvent ? new Date(topEvent.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: DEPTH SLICE */}
      <section className="h-screen w-full flex flex-col justify-center items-end p-8 sm:p-16">
        <div className="max-w-md p-6 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl text-right text-slate-800">
          <div className="flex items-center justify-end gap-2 text-amber-600 font-mono text-xs font-bold tracking-widest uppercase mb-2">
            <Activity className="w-4 h-4" />
            CHAPTER 03 // SUBTERRANEAN SLICE
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight uppercase">
            HYPOCENTER STRATIFICATION
          </h2>
          <p className="mt-3 text-slate-600 text-xs sm:text-sm font-normal leading-relaxed">
            Seismic rupture points descend deep into the asthenosphere. Angled profile telemetry reveals whether fractures occur in shallow crustal sheets or deep Wadati–Benioff subduction zones.
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-4 font-mono text-xs">
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block font-medium">RECORDED AVERAGE</span>
              <span className="text-base font-bold text-amber-600">{avgDepth} km Sub-surface</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: FREE EXPLORATION & FILTER CONTROLS */}
      <section className="h-screen w-full flex flex-col justify-center items-center p-8 sm:p-16">
        <div className="pointer-events-auto flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 text-slate-700 font-mono text-xs font-bold tracking-widest uppercase">
            <Compass className="w-4 h-4 animate-pulse" />
            CHAPTER 04 // FREE OBSERVATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight uppercase">
            PLANETARY TELEMETRY SUITE
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm max-w-lg font-normal">
            Full 3D orbital control is active. Drag to rotate the globe, scroll to zoom, inspect floating markers for instantaneous focal telemetry.
          </p>

          <div className="mt-2 w-full">
            <FilterControls
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              minMagnitude={minMagnitude}
              onMinMagChange={onMinMagChange}
              depthFilter={depthFilter}
              onDepthFilterChange={onDepthFilterChange}
              filteredCount={filteredCount}
              totalCount={totalEvents}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
