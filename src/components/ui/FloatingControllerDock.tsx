import React from 'react';
import { LiquidCard } from './liquid-glass';
import {
  RotateCcw,
  List,
  History,
  Volume2,
  VolumeX,
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
    'px-2.5 py-1 min-h-[26px] rounded-full text-[9.5px] sm:text-[10px] font-mono tracking-wider font-medium transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center';
  const pillActive =
    'bg-slate-900 text-white font-semibold shadow-xs border border-slate-950';
  const pillInactive =
    'text-slate-500 hover:text-slate-800 hover:bg-white/60';
  const divider = (
    <div className="w-[1px] h-3.5 bg-slate-300/60 shrink-0" />
  );

  const effectiveProgress = progress != null ? progress : visible ? 1 : 0;
  const isScrollDriven = progress != null;

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
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,12px))] sm:bottom-5 left-1/2 z-40 select-none w-auto max-w-[calc(100vw-1.5rem)] px-1 flex justify-center"
    >
      <div className="pointer-events-auto max-w-full">
        <LiquidCard className="rounded-full shadow-xl border border-slate-200/90 max-w-full overflow-hidden relative">
          {/* Scroll fade indicator on very small screens */}
          <div className="pointer-events-none absolute left-0 inset-y-0 w-2.5 bg-gradient-to-r from-white/90 to-transparent z-10 sm:hidden rounded-l-full" />
          <div className="pointer-events-none absolute right-0 inset-y-0 w-2.5 bg-gradient-to-l from-white/90 to-transparent z-10 sm:hidden rounded-r-full" />

          {/* Clean, Human-Friendly Controller Dock */}
          <div
            className="flex items-center justify-start sm:justify-center gap-1.5 font-mono text-xs whitespace-nowrap px-2.5 py-1.5 overflow-x-auto text-slate-800 touch-pan-x"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* 1. Tipe Bencana / Hazard Mode */}
            {onHazardModeChange && (
              <>
                <div className={pillGroup}>
                  <button
                    onClick={() => onHazardModeChange('dual')}
                    title={lang === 'id' ? 'Tampilkan Semua Bencana' : 'Show All Hazards'}
                    className={`${pillBase} ${hazardMode === 'dual' || hazardMode === 'all' ? pillActive : pillInactive}`}
                  >
                    <span>{lang === 'id' ? 'SEMUA' : 'ALL'}</span>
                  </button>
                  <button
                    onClick={() => onHazardModeChange('seismic')}
                    title={lang === 'id' ? 'Filter Khusus Gempa Bumi' : 'Earthquakes Only'}
                    className={`${pillBase} ${hazardMode === 'seismic' ? pillActive : pillInactive}`}
                  >
                    <span>{lang === 'id' ? 'GEMPA' : 'QUAKES'}</span>
                  </button>
                  <button
                    onClick={() => onHazardModeChange('wildfire')}
                    title={lang === 'id' ? 'Filter Khusus Titik Api Karhutla' : 'Wildfires Only'}
                    className={`${pillBase} ${hazardMode === 'wildfire' ? pillActive : pillInactive}`}
                  >
                    <span>{lang === 'id' ? 'TITIK API' : 'FIRES'}</span>
                  </button>
                </div>
                {divider}
              </>
            )}

            {/* 2. Rentang Waktu (Time Horizon) */}
            <div className={pillGroup}>
              <button
                onClick={() => onTimeFilterChange('24h')}
                className={`${pillBase} ${timeFilter === '24h' ? pillActive : pillInactive}`}
              >
                {t.last24h}
              </button>
              <button
                onClick={() => onTimeFilterChange('7d')}
                className={`${pillBase} ${timeFilter === '7d' ? pillActive : pillInactive}`}
              >
                {t.last7d}
              </button>
            </div>

            {divider}

            {/* 3. Filter Kekuatan Gempa (Magnitude) */}
            {onMagCategoryChange && (
              <>
                <div className={pillGroup}>
                  <button
                    onClick={() => onMagCategoryChange('all')}
                    title={lang === 'id' ? 'Semua Kekuatan Gempa' : 'All Magnitudes'}
                    className={`${pillBase} ${magCategory === 'all' ? pillActive : pillInactive}`}
                  >
                    <span>{lang === 'id' ? 'SEMUA MAG' : 'ALL MAG'}</span>
                  </button>
                  <button
                    onClick={() => onMagCategoryChange('felt')}
                    title={lang === 'id' ? 'Gempa Dirasakan Warga (M ≥ 4.0)' : 'Felt Tremors (M ≥ 4.0)'}
                    className={`${pillBase} ${magCategory === 'felt' ? pillActive : pillInactive}`}
                  >
                    <span>≥4.0 {lang === 'id' ? 'DIRASAKAN' : 'FELT'}</span>
                  </button>
                  <button
                    onClick={() => onMagCategoryChange('significant')}
                    title={lang === 'id' ? 'Gempa Signifikan / Kuat (M ≥ 5.5)' : 'Major Earthquakes (M ≥ 5.5)'}
                    className={`${pillBase} ${
                      magCategory === 'significant'
                        ? 'bg-rose-600 text-white font-semibold shadow-xs border border-rose-700'
                        : pillInactive
                    }`}
                  >
                    <span>≥5.5 {lang === 'id' ? 'SIGNIFIKAN' : 'MAJOR'}</span>
                  </button>
                </div>
                {divider}
              </>
            )}

            {/* 4. Putar Ulang Time-Lapse 7 Hari */}
            {onOpenTimeLapse && (
              <>
                <button
                  onClick={onOpenTimeLapse}
                  title={lang === 'id' ? 'Putar Ulang Rangkaian Gempa 7 Hari' : 'Replay 7-Day Seismic Activity'}
                  className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[10px] font-mono tracking-wider font-semibold transition-all duration-150 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer shrink-0"
                >
                  <History className="w-3.5 h-3.5 text-slate-600 group-hover:rotate-[-45deg] transition-transform" />
                  <span>{t.replay}</span>
                </button>
                {divider}
              </>
            )}

            {/* 5. Daftar Kejadian (Feed Drawer) */}
            {onOpenFeed && (
              <>
                <button
                  onClick={onOpenFeed}
                  title={lang === 'id' ? 'Buka Daftar Lengkap Kejadian' : 'Open Full Events List'}
                  className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[10px] font-mono tracking-wider font-semibold transition-all duration-150 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer shrink-0"
                >
                  <List className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-950 transition-colors" />
                  <span>{t.feed}</span>
                  {eventCount !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[8.5px] font-mono font-bold text-white shadow-2xs">
                      {eventCount}
                    </span>
                  )}
                </button>
                {divider}
              </>
            )}

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
