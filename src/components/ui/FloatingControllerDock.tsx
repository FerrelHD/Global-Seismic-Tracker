import React, { useState } from 'react';
import { LiquidCard } from './liquid-glass';
import {
  Play,
  Pause,
  RotateCcw,
  List,
  History,
  Activity,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { HazardMode } from '../../types/seismic';
import { translations, Language } from '../../utils/i18n';

interface FloatingControllerDockProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  timeFilter: 'all' | '24h' | '7d';
  onTimeFilterChange: (val: 'all' | '24h' | '7d') => void;
  depthFilter: 'all' | 'shallow' | 'mid' | 'deep';
  onDepthFilterChange: (val: 'all' | 'shallow' | 'mid' | 'deep') => void;
  isRotating: boolean;
  onToggleRotation: () => void;
  onResetView: () => void;
  onOpenFeed?: () => void;
  onOpenTimeLapse?: () => void;
  onOpenSeismogram?: () => void;
  isSeismogramOpen?: boolean;
  colorMode?: 'magnitude' | 'depth';
  onColorModeChange?: (mode: 'magnitude' | 'depth') => void;
  hazardMode?: HazardMode;
  onHazardModeChange?: (mode: HazardMode) => void;
  eventCount?: number;
  visible?: boolean;
  progress?: number;
  style?: React.CSSProperties;
  lang?: Language;
  magCategory?: 'all' | 'felt' | 'significant';
  onMagCategoryChange?: (cat: 'all' | 'felt' | 'significant') => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
}

export const FloatingControllerDock: React.FC<FloatingControllerDockProps> = ({
  searchQuery,
  onSearchChange,
  timeFilter,
  onTimeFilterChange,
  depthFilter,
  onDepthFilterChange,
  isRotating,
  onToggleRotation,
  onResetView,
  onOpenFeed,
  onOpenTimeLapse,
  onOpenSeismogram,
  isSeismogramOpen = false,
  colorMode = 'magnitude',
  onColorModeChange,
  hazardMode = 'dual',
  onHazardModeChange,
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const t = translations[lang];

  const pillGroup =
    'flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80 shrink-0';
  const pillBase =
    'px-2.5 sm:px-2.5 py-1 sm:py-1 min-h-[26px] sm:min-h-[24px] rounded-full text-[9.5px] sm:text-[10px] xl:text-[10.5px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center';
  const pillActive =
    'bg-slate-900 text-white font-semibold shadow-xs border border-slate-950';
  const pillInactive =
    'text-slate-500 hover:text-slate-800 hover:bg-white/60';
  const smallPillBase =
    'px-2 sm:px-2 py-1 sm:py-1 min-h-[26px] sm:min-h-[24px] rounded-full text-[9px] sm:text-[9.5px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap flex items-center justify-center';
  const divider = (
    <div className="w-[1px] h-3.5 sm:h-3.5 bg-slate-300/60 shrink-0" />
  );

  const effectiveProgress = progress != null ? progress : (visible ? 1 : 0);
  const isScrollDriven = progress != null;

  return (
    <nav
      aria-label="Seismic Telemetry Controller"
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
        <LiquidCard className="rounded-full shadow-2xl border border-slate-200/90 max-w-full overflow-hidden relative">
          {/* Scroll fade gradient indicator on small screens */}
          <div className="pointer-events-none absolute left-0 inset-y-0 w-3 bg-gradient-to-r from-white/90 to-transparent z-10 sm:hidden rounded-l-full" />
          <div className="pointer-events-none absolute right-0 inset-y-0 w-3 bg-gradient-to-l from-white/90 to-transparent z-10 sm:hidden rounded-r-full" />

          {/* Horizontally scrollable inner content with smooth momentum on small screens, centered on desktop */}
          <div
            className="flex items-center justify-start xl:justify-center gap-1 sm:gap-1.5 font-mono text-xs whitespace-nowrap px-2.5 py-1 sm:px-3 sm:py-1.5 overflow-x-auto text-slate-800 touch-pan-x"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Segment 0: Hazard Layer Mode Switcher */}
            {onHazardModeChange && (
              <>
                <div className={pillGroup}>
                  <button
                    onClick={() => onHazardModeChange('dual')}
                    title={lang === 'id' ? 'Tampilkan Semua Bencana Bersamaan' : 'Show All Hazards Together'}
                    className={`${smallPillBase} ${hazardMode === 'dual' || hazardMode === 'all' ? pillActive : pillInactive}`}
                  >
                    {t.dualMode}
                  </button>
                  <button
                    onClick={() => onHazardModeChange('seismic')}
                    title={lang === 'id' ? 'Filter Khusus Seismik / Gempa' : 'Filter Seismic Events Only'}
                    className={`${smallPillBase} ${
                      hazardMode === 'seismic'
                        ? 'bg-slate-900 text-white shadow-xs font-semibold'
                        : pillInactive
                    }`}
                  >
                    {t.seismicOnly}
                  </button>
                  <button
                    onClick={() => onHazardModeChange('wildfire')}
                    title={lang === 'id' ? 'Filter Khusus Titik Api Karhutla' : 'Filter Wildfire Hotspots Only'}
                    className={`${smallPillBase} ${
                      hazardMode === 'wildfire'
                        ? 'bg-slate-900 text-white shadow-xs font-semibold'
                        : pillInactive
                    }`}
                  >
                    {t.fireOnly}
                  </button>
                  <button
                    onClick={() => onHazardModeChange('volcano')}
                    title={lang === 'id' ? 'Filter Khusus Gunung Berapi & Abu' : 'Filter Volcano Activity & Ash Plumes Only'}
                    className={`${smallPillBase} ${hazardMode === 'volcano' ? pillActive : pillInactive}`}
                  >
                    {t.volcanoOnly}
                  </button>
                </div>
                {divider}
              </>
            )}

            {/* Segment 1: Region Pills */}
            <div className={pillGroup}>
              <button
                onClick={() => onSearchChange('')}
                title={lang === 'id' ? 'Seluruh Nusantara' : 'All Archipelago'}
                className={`${pillBase} ${searchQuery === '' ? pillActive : pillInactive}`}
              >
                <span>{lang === 'id' ? 'SEMUA' : 'ALL'}</span>
              </button>
              <button
                onClick={() => onSearchChange('sumatra')}
                title="Sumatra & Sunda Arc"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'sumatra' ? pillActive : pillInactive}`}
              >
                <span>SUM</span>
              </button>
              <button
                onClick={() => onSearchChange('java')}
                title="Jawa & Selat Sunda"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'java' ? pillActive : pillInactive}`}
              >
                <span>{lang === 'id' ? 'JAW' : 'JAV'}</span>
              </button>
              <button
                onClick={() => onSearchChange('sulawesi')}
                title="Sulawesi & Sesar Palu"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'sulawesi' ? pillActive : pillInactive}`}
              >
                <span>SUL</span>
              </button>
              <button
                onClick={() => onSearchChange('kalimantan')}
                title="Kalimantan"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'kalimantan' ? pillActive : pillInactive}`}
              >
                <span>KAL</span>
              </button>
              <button
                onClick={() => onSearchChange('papua')}
                title="Papua & Maluku"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'papua' ? pillActive : pillInactive}`}
              >
                <span>PAP</span>
              </button>
            </div>

            {/* Divider */}
            {divider}

            {/* Segment 1.5: Magnitude Quick Category Filter */}
            {onMagCategoryChange && (
              <>
                <div className={pillGroup}>
                  <button
                    onClick={() => onMagCategoryChange('all')}
                    title={lang === 'id' ? 'Tampilkan Semua Magnitudo' : 'Show All Magnitudes'}
                    className={`${smallPillBase} ${magCategory === 'all' ? pillActive : pillInactive}`}
                  >
                    <span>{lang === 'id' ? 'SEMUA MAG' : 'ALL MAG'}</span>
                  </button>
                  <button
                    onClick={() => onMagCategoryChange('felt')}
                    title={lang === 'id' ? 'Gempa Dirasakan (M ≥ 4.0)' : 'Felt Earthquakes (M ≥ 4.0)'}
                    className={`${smallPillBase} ${magCategory === 'felt' ? pillActive : pillInactive}`}
                  >
                    <span>≥4.0 {lang === 'id' ? 'DIRASAKAN' : 'FELT'}</span>
                  </button>
                  <button
                    onClick={() => onMagCategoryChange('significant')}
                    title={lang === 'id' ? 'Gempa Signifikan / Merusak (M ≥ 5.5)' : 'Significant Earthquakes (M ≥ 5.5)'}
                    className={`${smallPillBase} ${
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

            {/* Segment 2: Time Horizon Scrubber Pills */}
            <div className={pillGroup}>
              <button
                onClick={() => onTimeFilterChange('24h')}
                className={`${smallPillBase} ${timeFilter === '24h' ? pillActive : pillInactive}`}
              >
                {t.last24h}
              </button>
              <button
                onClick={() => onTimeFilterChange('7d')}
                className={`${smallPillBase} ${timeFilter === '7d' ? pillActive : pillInactive}`}
              >
                {t.last7d}
              </button>
              <button
                onClick={() => onTimeFilterChange('all')}
                className={`${smallPillBase} ${timeFilter === 'all' ? pillActive : pillInactive}`}
              >
                {t.allTime}
              </button>
            </div>

            {/* Divider */}
            {divider}

            {/* Segment 3 & 4 & 5: Collapsible Advanced Filters */}
            {showAdvanced && (
              <>
                {/* Depth Filter */}
                <div className={pillGroup}>
                  <button
                    onClick={() => onDepthFilterChange('all')}
                    className={`${smallPillBase} ${depthFilter === 'all' ? pillActive : pillInactive}`}
                  >
                    {t.allTime}
                  </button>
                  <button
                    onClick={() => onDepthFilterChange('shallow')}
                    title="< 30km"
                    className={`${smallPillBase} ${depthFilter === 'shallow' ? pillActive : pillInactive}`}
                  >
                    &lt;30KM
                  </button>
                  <button
                    onClick={() => onDepthFilterChange('deep')}
                    title="> 100km"
                    className={`${smallPillBase} ${depthFilter === 'deep' ? pillActive : pillInactive}`}
                  >
                    &gt;100KM
                  </button>
                </div>

                {divider}

                {/* Color Palette Mode */}
                {onColorModeChange && (
                  <>
                    <div className={pillGroup}>
                      <button
                        onClick={() => onColorModeChange('magnitude')}
                        className={`${smallPillBase} ${colorMode === 'magnitude' ? pillActive : pillInactive}`}
                      >
                        {t.colorMag}
                      </button>
                      <button
                        onClick={() => onColorModeChange('depth')}
                        className={`${smallPillBase} ${colorMode === 'depth' ? pillActive : pillInactive}`}
                      >
                        {t.colorDepth}
                      </button>
                    </div>
                    {divider}
                  </>
                )}

                {/* Time-Lapse Replay Button */}
                {onOpenTimeLapse && (
                  <>
                    <button
                      onClick={onOpenTimeLapse}
                      title="Putar Time-Lapse Seismik 7 Hari"
                      className="group flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[9.5px] font-mono tracking-wider font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer shrink-0"
                    >
                      <History className="w-3 h-3 text-slate-600 group-hover:scale-110 transition-transform" />
                      <span>{t.replay}</span>
                    </button>
                    {divider}
                  </>
                )}
              </>
            )}

            {/* Toggle Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              title={lang === 'id' ? 'Filter & Pengaturan Lanjutan' : 'Advanced Filters & Settings'}
              className={`p-1.5 rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
                showAdvanced
                  ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200/90 text-slate-700 border-slate-200/90'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>

            {divider}

            {/* Segment 6: Virtual Seismogram Oscilloscope Button */}
            {onOpenSeismogram && (
              <>
                <button
                  onClick={onOpenSeismogram}
                  title="Monitor Seismograf Real-Time"
                  className={`group flex items-center gap-1 px-2.5 py-1 rounded-full text-[9.5px] font-mono tracking-wider font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs border cursor-pointer shrink-0 ${
                    isSeismogramOpen
                      ? 'bg-slate-900 text-white border-slate-950'
                      : 'bg-slate-100 hover:bg-slate-200/90 text-slate-800 border-slate-200/90'
                  }`}
                >
                  <Activity className="w-3 h-3 text-slate-600 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">{t.seismogram}</span>
                  <span className="sm:hidden text-[8.5px]">WAVE</span>
                </button>
                {divider}
              </>
            )}

            {/* Segment 7: Events Feed Button */}
            {onOpenFeed && (
              <>
                <button
                  onClick={onOpenFeed}
                  title="Daftar Gempa Terkini"
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[9.5px] font-mono tracking-wider font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer shrink-0"
                >
                  <List className="w-3 h-3 text-slate-600 group-hover:text-slate-950 group-hover:rotate-12 transition-all duration-200" />
                  <span>{t.feed}</span>
                  {eventCount !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[8.5px] font-mono font-bold text-slate-700 border border-slate-300/50">
                      {eventCount}
                    </span>
                  )}
                </button>
                {divider}
              </>
            )}

            {/* Segment 8: Action Toggles (Audio, Play/Pause Orbit & Reset) */}
            <div className="flex items-center gap-1 shrink-0">
              {onToggleAudio && (
                <button
                  type="button"
                  onClick={onToggleAudio}
                  title={
                    isAudioMuted
                      ? lang === 'id'
                        ? 'Aktifkan Audio Seismik Akustik'
                        : 'Unmute Seismic Audio'
                      : lang === 'id'
                      ? 'Senyapkan Audio Seismik'
                      : 'Mute Seismic Audio'
                  }
                  className={`group p-1.5 rounded-full border transition-all duration-200 hover:scale-110 active:scale-90 shadow-xs cursor-pointer ${
                    isAudioMuted
                      ? 'bg-slate-100/90 text-slate-400 border-slate-200/80 hover:text-slate-700'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {isAudioMuted ? (
                    <VolumeX className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Volume2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
                  )}
                </button>
              )}

              <button
                onClick={onToggleRotation}
                title={isRotating ? 'Pause rotasi' : 'Putar otomatis'}
                className="group p-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200/80 transition-all duration-200 hover:scale-110 active:scale-90 shadow-xs cursor-pointer"
              >
                {isRotating ? (
                  <Pause className="w-3 h-3 group-hover:scale-110 transition-transform" />
                ) : (
                  <Play className="w-3 h-3 group-hover:scale-110 transition-transform" />
                )}
              </button>
              <button
                onClick={onResetView}
                title="Reset kamera ke kepulauan Indonesia"
                className="group p-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200/80 transition-all duration-200 hover:scale-110 active:scale-90 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 group-hover:-rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </LiquidCard>
      </div>
    </nav>
  );
};
