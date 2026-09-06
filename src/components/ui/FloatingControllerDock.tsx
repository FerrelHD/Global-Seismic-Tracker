import React from 'react';
import { LiquidCard } from './liquid-glass';
import {
  RotateCcw,
  List,
  History,
  Volume2,
  VolumeX,
  Layers,
  Activity,
  Flame,
  Mountain,
} from 'lucide-react';
import { HazardMode } from '../../types/seismic';
import { translations, Language } from '../../utils/i18n';

interface FloatingControllerDockProps {
  timeFilter: 'all' | '24h' | '7d';
  onTimeFilterChange: (val: 'all' | '24h' | '7d') => void;
  hazardMode?: HazardMode;
  onHazardModeChange?: (mode: HazardMode) => void;
  onResetView: () => void;
  onOpenFeed?: () => void;
  onOpenTimeLapse?: () => void;
  eventCount?: number;
  visible?: boolean;
  progress?: number;
  style?: React.CSSProperties;
  lang?: Language;
  magCategory?: 'all' | 'felt' | 'significant';
  onMagCategoryChange?: (cat: 'all' | 'felt' | 'significant') => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  // Deprecated/optional props kept for backwards compatibility
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  depthFilter?: 'all' | 'shallow' | 'mid' | 'deep';
  onDepthFilterChange?: (val: 'all' | 'shallow' | 'mid' | 'deep') => void;
  isRotating?: boolean;
  onToggleRotation?: () => void;
  onOpenSeismogram?: () => void;
  isSeismogramOpen?: boolean;
  colorMode?: 'magnitude' | 'depth';
  onColorModeChange?: (mode: 'magnitude' | 'depth') => void;
}

export const FloatingControllerDock: React.FC<FloatingControllerDockProps> = ({
  timeFilter,
  onTimeFilterChange,
  hazardMode = 'dual',
  onHazardModeChange,
  onResetView,
  onOpenFeed,
  onOpenTimeLapse,
  eventCount,
  visible = true,
  progress,
  style,
  lang = 'id',
  magCategory = 'all',
  onMagCategoryChange,
  isAudioMuted = false,
  onToggleAudio,
}) => {
  const t = translations[lang];

  const pillGroup =
    'flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80 shrink-0';
  const pillBase =
    'px-2 sm:px-2.5 py-1 min-h-[26px] rounded-full text-[9px] sm:text-[10px] font-mono tracking-wider font-medium transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center';
  const iconPillBase =
    'p-1.5 sm:px-2 min-h-[26px] rounded-full text-[9px] sm:text-[10px] font-mono tracking-wider font-medium transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center gap-1';
  const pillActive =
    'bg-slate-900 text-white font-semibold shadow-xs border border-slate-950';
  const pillInactive =
    'text-slate-500 hover:text-slate-800 hover:bg-white/60';
  const divider = (
    <div className="w-[1px] h-3.5 bg-slate-300/60 shrink-0 mx-0.5" />
  );

  const effectiveProgress = progress != null ? progress : visible ? 1 : 0;
  const isScrollDriven = progress != null;

  // Determine if magnitude filter is relevant
  const showMagFilter =
    onMagCategoryChange &&
    (hazardMode === 'all' || hazardMode === 'dual' || hazardMode === 'seismic');

  return (
    <nav
      aria-label="Disaster Telemetry Floating Controller"
      style={{
        ...style,
        opacity: effectiveProgress,
        filter: effectiveProgress < 0.99 ? `blur(${(1 - effectiveProgress) * 6}px)` : 'none',
        transform: `translate(-50%, ${(1 - effectiveProgress) * 20}px)`,
        transition: isScrollDriven ? 'none' : 'opacity 200ms ease-out, filter 200ms ease-out, transform 200ms ease-out',
        willChange: 'opacity, transform, filter',
        pointerEvents: effectiveProgress > 0.4 ? 'auto' : 'none',
        visibility: effectiveProgress <= 0.001 ? 'hidden' : 'visible',
      }}
      className="fixed bottom-[max(0.65rem,env(safe-area-inset-bottom,10px))] sm:bottom-5 left-1/2 z-40 select-none w-auto max-w-[calc(100vw-1rem)] px-1 flex flex-col items-center justify-center pointer-events-none"
    >
      {/* 1. Mobile Quick-Action Pill: Putar Ulang & Daftar Kejadian (Positioned above dock on mobile) */}
      {(onOpenTimeLapse || onOpenFeed) && (
        <div className="flex sm:hidden items-center justify-center gap-2 mb-1.5 pointer-events-auto">
          {onOpenTimeLapse && (
            <button
              type="button"
              onClick={onOpenTimeLapse}
              title={lang === 'id' ? 'Putar Ulang Rangkaian Gempa 7 Hari' : 'Replay 7-Day Seismic Activity'}
              className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-slate-800 text-[10px] font-mono tracking-wider font-semibold shadow-md border border-slate-200/90 active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <History className="w-3.5 h-3.5 text-slate-600 group-hover:rotate-[-45deg] transition-transform" />
              <span>{t.replay}</span>
            </button>
          )}

          {onOpenFeed && (
            <button
              type="button"
              onClick={onOpenFeed}
              title={lang === 'id' ? 'Buka Daftar Lengkap Kejadian' : 'Open Full Events List'}
              className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-slate-800 text-[10px] font-mono tracking-wider font-semibold shadow-md border border-slate-200/90 active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <List className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-950 transition-colors" />
              <span>{t.feed}</span>
              {eventCount !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[8.5px] font-mono font-bold text-white shadow-2xs">
                  {eventCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* 2. Main Filter Controller Dock (Ultra-compact, guaranteed to fit 100% on all phone screens) */}
      <div className="pointer-events-auto max-w-full">
        <LiquidCard className="rounded-full shadow-xl border border-slate-200/90 max-w-full overflow-hidden relative">
          {/* Scroll fade indicators on very small screens */}
          <div className="pointer-events-none absolute left-0 inset-y-0 w-2.5 bg-gradient-to-r from-white/90 to-transparent z-10 sm:hidden rounded-l-full" />
          <div className="pointer-events-none absolute right-0 inset-y-0 w-2.5 bg-gradient-to-l from-white/90 to-transparent z-10 sm:hidden rounded-r-full" />

          {/* Clean, Human-Friendly Controller Dock */}
          <div
            className="flex items-center justify-start sm:justify-center gap-1 sm:gap-1.5 font-mono text-xs whitespace-nowrap px-2 sm:px-2.5 py-1 sm:py-1.5 overflow-x-auto text-slate-800 touch-pan-x no-scrollbar"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* 1. Tipe Bencana / Hazard Mode (Icon-Based Compact Selector) */}
            {onHazardModeChange && (
              <>
                <div className={pillGroup} role="group" aria-label="Hazard Layer Filter">
                  {/* SEMUA LAPISAN BENCANA */}
                  <button
                    type="button"
                    onClick={() => onHazardModeChange('dual')}
                    title={
                      lang === 'id'
                        ? 'Semua Lapisan: Gempa Bumi, Titik Api Karhutla & Gunung Api'
                        : 'All Hazards: Earthquakes, Wildfires & Volcanoes'
                    }
                    aria-label={lang === 'id' ? 'Tampilkan Semua Bencana' : 'Show All Hazards'}
                    className={`${iconPillBase} ${
                      hazardMode === 'dual' || hazardMode === 'all'
                        ? pillActive
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden xl:inline text-[9px] font-bold">
                      {lang === 'id' ? 'SEMUA' : 'ALL'}
                    </span>
                  </button>

                  {/* KHUSUS GEMPA BUMI */}
                  <button
                    type="button"
                    onClick={() => onHazardModeChange('seismic')}
                    title={
                      lang === 'id'
                        ? 'Filter Khusus Gempa Bumi (USGS & BMKG TEWS)'
                        : 'Earthquakes Only (USGS & BMKG)'
                    }
                    aria-label={lang === 'id' ? 'Filter Gempa Bumi' : 'Filter Earthquakes'}
                    className={`${iconPillBase} ${
                      hazardMode === 'seismic'
                        ? 'bg-blue-600 text-white font-semibold shadow-xs border border-blue-700'
                        : 'text-slate-500 hover:text-blue-600 hover:bg-white/80'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600" />
                    <span className="hidden xl:inline text-[9px] font-bold">
                      {lang === 'id' ? 'GEMPA' : 'QUAKES'}
                    </span>
                  </button>

                  {/* KHUSUS TITIK API / KARHUTLA */}
                  <button
                    type="button"
                    onClick={() => onHazardModeChange('wildfire')}
                    title={
                      lang === 'id'
                        ? 'Filter Khusus Titik Api Karhutla (NASA FIRMS VIIRS)'
                        : 'Wildfire Hotspots Only (NASA FIRMS)'
                    }
                    aria-label={lang === 'id' ? 'Filter Titik Api Karhutla' : 'Filter Wildfires'}
                    className={`${iconPillBase} ${
                      hazardMode === 'wildfire'
                        ? 'bg-amber-600 text-white font-semibold shadow-xs border border-amber-700'
                        : 'text-slate-500 hover:text-amber-600 hover:bg-white/80'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-600" />
                    <span className="hidden xl:inline text-[9px] font-bold">
                      {lang === 'id' ? 'TITIK API' : 'FIRES'}
                    </span>
                  </button>

                  {/* KHUSUS GUNUNG API (PVMBG) */}
                  <button
                    type="button"
                    onClick={() => onHazardModeChange('volcano')}
                    title={
                      lang === 'id'
                        ? 'Filter Khusus Aktivitas Gunung Api (PVMBG / MAGMA Indonesia)'
                        : 'Active Volcanoes Only (PVMBG / MAGMA)'
                    }
                    aria-label={lang === 'id' ? 'Filter Gunung Api' : 'Filter Volcanoes'}
                    className={`${iconPillBase} ${
                      hazardMode === 'volcano'
                        ? 'bg-rose-600 text-white font-semibold shadow-xs border border-rose-700'
                        : 'text-slate-500 hover:text-rose-600 hover:bg-white/80'
                    }`}
                  >
                    <Mountain className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-600" />
                    <span className="hidden xl:inline text-[9px] font-bold">
                      {lang === 'id' ? 'GUNUNG' : 'VOLCANO'}
                    </span>
                  </button>
                </div>
                {divider}
              </>
            )}

            {/* 2. Rentang Waktu (Time Horizon: 24H / 7D) */}
            <div className={pillGroup} role="group" aria-label="Time Horizon Filter">
              <button
                type="button"
                onClick={() => onTimeFilterChange('24h')}
                title={lang === 'id' ? 'Aktivitas 24 Jam Terakhir' : 'Last 24 Hours Activity'}
                className={`${pillBase} ${timeFilter === '24h' ? pillActive : pillInactive}`}
              >
                <span>24H</span>
              </button>
              <button
                type="button"
                onClick={() => onTimeFilterChange('7d')}
                title={lang === 'id' ? 'Aktivitas 7 Hari Terakhir' : 'Last 7 Days Activity'}
                className={`${pillBase} ${timeFilter === '7d' ? pillActive : pillInactive}`}
              >
                <span>7D</span>
              </button>
            </div>

            {/* 3. Filter Kekuatan Gempa (Magnitude) - Only shown when seismic events are active */}
            {showMagFilter && (
              <>
                {divider}
                <div className={pillGroup} role="group" aria-label="Magnitude Filter">
                  <button
                    type="button"
                    onClick={() => onMagCategoryChange?.('all')}
                    title={lang === 'id' ? 'Semua Kekuatan Gempa' : 'All Magnitudes'}
                    className={`${pillBase} ${magCategory === 'all' ? pillActive : pillInactive}`}
                  >
                    <span>SEMUA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMagCategoryChange?.('felt')}
                    title={lang === 'id' ? 'Gempa Dirasakan Warga (M ≥ 4.0)' : 'Felt Tremors (M ≥ 4.0)'}
                    className={`${pillBase} ${magCategory === 'felt' ? pillActive : pillInactive}`}
                  >
                    <span>≥4.0<span className="hidden md:inline"> {lang === 'id' ? 'DIRASAKAN' : 'FELT'}</span></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMagCategoryChange?.('significant')}
                    title={lang === 'id' ? 'Gempa Signifikan / Kuat (M ≥ 5.5)' : 'Major Earthquakes (M ≥ 5.5)'}
                    className={`${pillBase} ${
                      magCategory === 'significant'
                        ? 'bg-rose-600 text-white font-semibold shadow-xs border border-rose-700'
                        : pillInactive
                    }`}
                  >
                    <span>≥5.5<span className="hidden md:inline"> {lang === 'id' ? 'SIGNIFIKAN' : 'MAJOR'}</span></span>
                  </button>
                </div>
              </>
            )}

            {/* 4. Desktop-Only Putar Ulang Time-Lapse 7 Hari */}
            {onOpenTimeLapse && (
              <div className="hidden sm:flex items-center gap-1.5">
                {divider}
                <button
                  type="button"
                  onClick={onOpenTimeLapse}
                  title={lang === 'id' ? 'Putar Ulang Rangkaian Gempa 7 Hari' : 'Replay 7-Day Seismic Activity'}
                  className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[9.5px] sm:text-[10px] font-mono tracking-wider font-semibold transition-all duration-150 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer shrink-0"
                >
                  <History className="w-3.5 h-3.5 text-slate-600 group-hover:rotate-[-45deg] transition-transform" />
                  <span>{t.replay}</span>
                </button>
              </div>
            )}

            {/* 5. Desktop-Only Daftar Kejadian (Feed Drawer) */}
            {onOpenFeed && (
              <div className="hidden sm:flex items-center gap-1.5">
                {divider}
                <button
                  type="button"
                  onClick={onOpenFeed}
                  title={lang === 'id' ? 'Buka Daftar Lengkap Kejadian' : 'Open Full Events List'}
                  className="group flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[9.5px] sm:text-[10px] font-mono tracking-wider font-semibold transition-all duration-150 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer shrink-0"
                >
                  <List className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-950 transition-colors" />
                  <span>{t.feed}</span>
                  {eventCount !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[8.5px] font-mono font-bold text-white shadow-2xs">
                      {eventCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {divider}

            {/* 6. Utility Controls (Audio & Reset View) */}
            <div className="flex items-center gap-1 shrink-0">
              {onToggleAudio && (
                <button
                  type="button"
                  onClick={onToggleAudio}
                  title={
                    isAudioMuted
                      ? lang === 'id'
                        ? 'Aktifkan Suara Peringatan'
                        : 'Unmute Alert Audio'
                      : lang === 'id'
                      ? 'Senyapkan Suara Peringatan'
                      : 'Mute Alert Audio'
                  }
                  className={`p-1.5 rounded-full border transition-all duration-150 hover:scale-110 active:scale-90 shadow-xs cursor-pointer ${
                    isAudioMuted
                      ? 'bg-slate-100 text-slate-400 border-slate-200 hover:text-slate-700'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {isAudioMuted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onResetView}
                title={lang === 'id' ? 'Pusatkan kembali ke Indonesia' : 'Recenter to Indonesia'}
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200 transition-all duration-150 hover:scale-110 active:scale-90 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 hover:-rotate-90 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </LiquidCard>
      </div>
    </nav>
  );
};
