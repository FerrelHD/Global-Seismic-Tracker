import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  SlidersHorizontal,
  X,
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
  style?: React.CSSProperties;
  lang?: Language;
  magCategory?: 'all' | 'felt' | 'significant';
  onMagCategoryChange?: (cat: 'all' | 'felt' | 'significant') => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
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
  style,
  lang = 'id',
  magCategory = 'all',
  onMagCategoryChange,
  isAudioMuted = false,
  onToggleAudio,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isOptionsSheetOpen, setIsOptionsSheetOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Determine if magnitude filter is relevant
  const showMagFilter =
    onMagCategoryChange &&
    (hazardMode === 'all' || hazardMode === 'dual' || hazardMode === 'seismic');

  return (
    <nav
      aria-label="Disaster Telemetry Floating Controller"
      style={style}
      className={`fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,12px))] sm:bottom-5 left-1/2 -translate-x-1/2 z-40 select-none w-auto max-w-[calc(100vw-1.25rem)] px-1 flex flex-col items-center justify-center transition-all duration-200 pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5 invisible'
      }`}
    >
      {/* MOBILE (<640px): Ergonomic 4-Tab Bar */}
      {isMobile ? (
        <div className="pointer-events-auto w-full max-w-[calc(100vw-1.25rem)]">
          <LiquidCard className="rounded-full shadow-xl border border-slate-200/90 w-full overflow-hidden">
            <div className="flex items-center justify-between gap-1 px-2 py-1.5 font-mono text-xs">
              {/* 1. Layers Segmented Switch */}
              <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => onHazardModeChange?.('dual')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    hazardMode === 'dual' || hazardMode === 'all' ? pillActive : pillInactive
                  }`}
                  title={lang === 'id' ? 'Semua Lapisan' : 'All Layers'}
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onHazardModeChange?.('seismic')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    hazardMode === 'seismic' ? pillActive : pillInactive
                  }`}
                  title={lang === 'id' ? 'Gempa Bumi' : 'Earthquakes'}
                >
                  <Activity className={`w-3.5 h-3.5 ${hazardMode === 'seismic' ? 'text-sky-300' : 'text-slate-500'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => onHazardModeChange?.('wildfire')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    hazardMode === 'wildfire' ? pillActive : pillInactive
                  }`}
                  title={lang === 'id' ? 'Titik Api' : 'Wildfires'}
                >
                  <Flame className={`w-3.5 h-3.5 ${hazardMode === 'wildfire' ? 'text-amber-300' : 'text-slate-500'}`} />
                </button>
                <button
                  type="button"
                  onClick={() => onHazardModeChange?.('volcano')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    hazardMode === 'volcano' ? pillActive : pillInactive
                  }`}
                  title={lang === 'id' ? 'Gunung Api' : 'Volcanoes'}
                >
                  <Mountain className={`w-3.5 h-3.5 ${hazardMode === 'volcano' ? 'text-rose-300' : 'text-slate-500'}`} />
                </button>
              </div>

              <div className="w-[1px] h-3.5 bg-slate-300/60 shrink-0" />

              {/* 2. Time Horizon (24H / 7D) */}
              <div className="flex items-center gap-0.5 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => onTimeFilterChange(timeFilter === '24h' ? 'all' : '24h')}
                  className={`px-2 py-1 min-h-[26px] rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                    timeFilter === '24h' ? pillActive : pillInactive
                  }`}
                >
                  24H
                </button>
                <button
                  type="button"
                  onClick={() => onTimeFilterChange(timeFilter === '7d' ? 'all' : '7d')}
                  className={`px-2 py-1 min-h-[26px] rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                    timeFilter === '7d' ? pillActive : pillInactive
                  }`}
                >
                  7D
                </button>
              </div>

              <div className="w-[1px] h-3.5 bg-slate-300/60 shrink-0" />

              {/* 3. Feed Drawer Toggle with count */}
              {onOpenFeed && (
                <button
                  type="button"
                  onClick={onOpenFeed}
                  className="flex items-center gap-1.5 px-2.5 py-1 min-h-[26px] rounded-full bg-slate-100/90 hover:bg-slate-200 border border-slate-200/80 text-slate-800 text-[10px] font-semibold shadow-2xs active:scale-95 cursor-pointer shrink-0"
                >
                  <List className="w-3.5 h-3.5 text-slate-600" />
                  <span>{t.feed}</span>
                  {eventCount !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[8.5px] font-mono font-bold text-white shadow-2xs">
                      {eventCount}
                    </span>
                  )}
                </button>
              )}

              <div className="w-[1px] h-3.5 bg-slate-300/60 shrink-0" />

              {/* 4. Options & Advanced Filter Button (⚙) */}
              <button
                type="button"
                onClick={() => setIsOptionsSheetOpen(true)}
                className={`relative p-1.5 min-h-[26px] min-w-[26px] flex items-center justify-center rounded-full border transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0 ${
                  isOptionsSheetOpen || magCategory !== 'all'
                    ? 'bg-slate-900 text-white border-slate-950'
                    : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200 border-slate-200/80'
                }`}
                title={lang === 'id' ? 'Filter & Opsi Lainnya' : 'Filter & More Options'}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {magCategory !== 'all' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
            </div>
          </LiquidCard>
        </div>
      ) : (
        /* DESKTOP (>=640px): Inline Extended Controller Dock */
        <div className="pointer-events-auto max-w-full">
          <LiquidCard className="rounded-full shadow-xl border border-slate-200/90 max-w-full overflow-hidden relative">
            <div
              className="flex items-center justify-center gap-1 sm:gap-1.5 font-mono text-xs whitespace-nowrap px-2.5 py-1.5 overflow-x-auto text-slate-800 touch-pan-x no-scrollbar"
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
                        ? pillActive
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Activity className={`w-3.5 h-3.5 ${hazardMode === 'seismic' ? 'text-sky-300' : 'text-slate-500 group-hover:text-slate-800'}`} />
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
                        ? pillActive
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Flame className={`w-3.5 h-3.5 ${hazardMode === 'wildfire' ? 'text-amber-300' : 'text-slate-500 group-hover:text-slate-800'}`} />
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
                        ? pillActive
                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Mountain className={`w-3.5 h-3.5 ${hazardMode === 'volcano' ? 'text-rose-300' : 'text-slate-500 group-hover:text-slate-800'}`} />
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
                onClick={() => onTimeFilterChange(timeFilter === '24h' ? 'all' : '24h')}
                title={
                  lang === 'id'
                    ? timeFilter === '24h'
                      ? 'Klik untuk batal / tampilkan semua waktu'
                      : 'Aktivitas 24 Jam Terakhir'
                    : timeFilter === '24h'
                      ? 'Click to deselect / show all time'
                      : 'Last 24 Hours Activity'
                }
                className={`${pillBase} ${timeFilter === '24h' ? pillActive : pillInactive}`}
              >
                <span>24H</span>
              </button>
              <button
                type="button"
                onClick={() => onTimeFilterChange(timeFilter === '7d' ? 'all' : '7d')}
                title={
                  lang === 'id'
                    ? timeFilter === '7d'
                      ? 'Klik untuk batal / tampilkan semua waktu'
                      : 'Aktivitas 7 Hari Terakhir'
                    : timeFilter === '7d'
                      ? 'Click to deselect / show all time'
                      : 'Last 7 Days Activity'
                }
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
                    <span>{lang === 'id' ? 'SEMUA' : 'ALL'}</span>
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
                        ? 'bg-rose-700 text-white font-semibold shadow-xs border border-rose-800'
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
      )}

      {/* Mobile Options & Filter Bottom Sheet */}
      {isMobile && isOptionsSheetOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto select-none font-mono">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs animate-in fade-in"
            onClick={() => setIsOptionsSheetOpen(false)}
          />
          <div
            className="relative z-10 w-full max-h-[75dvh] overflow-y-auto bg-white/95 backdrop-blur-2xl rounded-t-3xl border-t border-slate-200/90 shadow-2xl p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,16px))] text-slate-900 overscroll-contain animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm font-sans text-slate-900 uppercase tracking-tight">
                {lang === 'id' ? 'FILTER & KONTROL TELEMETRI' : 'TELEMETRY FILTERS & CONTROLS'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOptionsSheetOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-900 transition-colors"
                title={lang === 'id' ? 'Tutup' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Magnitude filter if seismic active */}
            {showMagFilter && (
              <div className="py-3 border-b border-slate-100">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  {lang === 'id' ? 'KEKUATAN GEMPA (MAGNITUDO)' : 'EARTHQUAKE MAGNITUDE'}
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onMagCategoryChange?.('all')}
                    className={`py-2 px-1 rounded-xl border text-center font-semibold transition-all ${
                      magCategory === 'all'
                        ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    {lang === 'id' ? 'SEMUA' : 'ALL'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMagCategoryChange?.('felt')}
                    className={`py-2 px-1 rounded-xl border text-center font-semibold transition-all ${
                      magCategory === 'felt'
                        ? 'bg-slate-950 text-white border-slate-950 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    ≥ 4.0 {lang === 'id' ? 'DIRASAKAN' : 'FELT'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMagCategoryChange?.('significant')}
                    className={`py-2 px-1 rounded-xl border text-center font-semibold transition-all ${
                      magCategory === 'significant'
                        ? 'bg-rose-700 text-white border-rose-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    ≥ 5.5 {lang === 'id' ? 'SIGNIFIKAN' : 'MAJOR'}
                  </button>
                </div>
              </div>
            )}

            {/* Additional Controls */}
            <div className="py-3 space-y-2 text-xs">
              {onOpenTimeLapse && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOptionsSheetOpen(false);
                    onOpenTimeLapse();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-900 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <History className="w-4 h-4 text-slate-700" />
                    <span>{lang === 'id' ? 'Putar Ulang Rangkaian 7 Hari' : 'Replay 7-Day Seismic Activity'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">TIME-LAPSE ▾</span>
                </button>
              )}

              {onToggleAudio && (
                <button
                  type="button"
                  onClick={onToggleAudio}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-900 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-indigo-600" />}
                    <span>{isAudioMuted ? (lang === 'id' ? 'Audio Dinonaktifkan' : 'Audio Muted') : (lang === 'id' ? 'Audio Alarm Aktif' : 'Audio Alert Active')}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-600">
                    {isAudioMuted ? (lang === 'id' ? 'AKTIFKAN' : 'UNMUTE') : (lang === 'id' ? 'SENYAPKAN' : 'MUTE')}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsOptionsSheetOpen(false);
                  onResetView();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-900 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <RotateCcw className="w-4 h-4 text-slate-700" />
                  <span>{lang === 'id' ? 'Pusatkan Peta ke Indonesia' : 'Recenter to Indonesia'}</span>
                </span>
                <span className="text-[10px] text-slate-400">NUSANTARA</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
};
