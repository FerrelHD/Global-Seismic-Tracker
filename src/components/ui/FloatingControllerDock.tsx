import React from 'react';
import { LiquidCard } from './liquid-glass';
import { Play, Pause, RotateCcw, List, History, Activity } from 'lucide-react';
import { HazardMode } from '../../types/seismic';

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
}) => {
  const pillGroup = 'flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80 shrink-0';
  const pillBase = 'px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] xl:text-[10.5px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap';
  const pillActive = 'bg-slate-900 text-white font-semibold shadow-xs border border-slate-950';
  const pillInactive = 'text-slate-500 hover:text-slate-800 hover:bg-white/60';
  const smallPillBase = 'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8.5px] sm:text-[9.5px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap';
  const divider = <div className="w-[1px] h-3 sm:h-3.5 bg-slate-300/60 shrink-0" />;

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
      className="fixed bottom-3 sm:bottom-5 left-1/2 z-40 select-none w-auto max-w-[calc(100vw-1.5rem)] px-1 flex justify-center"
    >
      <div className="pointer-events-auto max-w-full">
        <LiquidCard className="rounded-full shadow-2xl border border-slate-200/90 max-w-full overflow-hidden">
          {/* Horizontally scrollable inner content with smooth momentum on small screens, centered on desktop */}
          <div
            className="flex items-center justify-start xl:justify-center gap-1 sm:gap-1.5 font-mono text-xs whitespace-nowrap px-2 py-1 sm:px-3 sm:py-1.5 overflow-x-auto text-slate-800 touch-pan-x"
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
                    title="Tampilkan Gempa dan Karhutla Bersamaan"
                    className={`${smallPillBase} ${hazardMode === 'dual' ? pillActive : pillInactive}`}
                  >
                    DUAL
                  </button>
                  <button
                    onClick={() => onHazardModeChange('seismic')}
                    title="Filter Khusus Seismik / Gempa"
                    className={`${smallPillBase} ${
                      hazardMode === 'seismic'
                        ? 'bg-slate-900 text-white shadow-xs font-semibold'
                        : pillInactive
                    }`}
                  >
                    SEIS
                  </button>
                  <button
                    onClick={() => onHazardModeChange('wildfire')}
                    title="Filter Khusus Titik Panas Karhutla (NASA FIRMS)"
                    className={`${smallPillBase} ${
                      hazardMode === 'wildfire'
                        ? 'bg-slate-900 text-white shadow-xs font-semibold'
                        : pillInactive
                    }`}
                  >
                    FIRE
                  </button>
                </div>
                {divider}
              </>
            )}

            {/* Segment 1: Region Pills with Adaptive Responsive Labels */}
            <div className={pillGroup}>
              <button
                onClick={() => onSearchChange('')}
                title="Semua Wilayah Nusantara"
                className={`${pillBase} ${searchQuery === '' ? pillActive : pillInactive}`}
              >
                <span className="hidden 2xl:inline">ALL NUSANTARA</span>
                <span className="2xl:hidden">ALL</span>
              </button>
              <button
                onClick={() => onSearchChange('sumatra')}
                title="Sektor Sumatra & Sunda Arc"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'sumatra' ? pillActive : pillInactive}`}
              >
                <span className="hidden 2xl:inline">SUMATRA</span>
                <span className="2xl:hidden">SUM</span>
              </button>
              <button
                onClick={() => onSearchChange('java')}
                title="Sektor Jawa & Selat Sunda"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'java' ? pillActive : pillInactive}`}
              >
                <span className="hidden 2xl:inline">JAVA</span>
                <span className="2xl:hidden">JAV</span>
              </button>
              <button
                onClick={() => onSearchChange('sulawesi')}
                title="Sektor Sulawesi & Sesar Palu-Koro"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'sulawesi' ? pillActive : pillInactive}`}
              >
                <span className="hidden 2xl:inline">SULAWESI</span>
                <span className="2xl:hidden">SUL</span>
              </button>
              <button
                onClick={() => onSearchChange('banda')}
                title="Sektor Laut Banda (Deep Wadati-Benioff Slab)"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'banda' ? pillActive : pillInactive}`}
              >
                <span className="hidden 2xl:inline">BANDA</span>
                <span className="2xl:hidden">BAN</span>
              </button>
              <button
                onClick={() => onSearchChange('papua')}
                title="Sektor Papua & Yapen Fault"
                className={`${pillBase} ${searchQuery.toLowerCase() === 'papua' ? pillActive : pillInactive}`}
              >
                <span className="hidden 2xl:inline">PAPUA</span>
                <span className="2xl:hidden">PAP</span>
              </button>
            </div>

            {/* Divider */}
            {divider}

            {/* Segment 2: Time Horizon Scrubber Pills */}
            <div className={pillGroup}>
              <button
                onClick={() => onTimeFilterChange('all')}
                className={`${smallPillBase} ${timeFilter === 'all' ? pillActive : pillInactive}`}
              >
                ALL
              </button>
              <button
                onClick={() => onTimeFilterChange('24h')}
                className={`${smallPillBase} ${timeFilter === '24h' ? pillActive : pillInactive}`}
              >
                24H
              </button>
              <button
                onClick={() => onTimeFilterChange('7d')}
                className={`${smallPillBase} ${timeFilter === '7d' ? pillActive : pillInactive}`}
              >
                7D
              </button>
            </div>

            {/* Divider */}
            {divider}

            {/* Segment 3: Depth Filter */}
            <div className={pillGroup}>
              <button
                onClick={() => onDepthFilterChange('all')}
                className={`${smallPillBase} ${depthFilter === 'all' ? pillActive : pillInactive}`}
              >
                ALL
              </button>
              <button
                onClick={() => onDepthFilterChange('shallow')}
                title="Kedalaman Dangkal < 30km"
                className={`${smallPillBase} ${depthFilter === 'shallow' ? pillActive : pillInactive}`}
              >
                &lt;30KM
              </button>
              <button
                onClick={() => onDepthFilterChange('deep')}
                title="Kedalaman Dalam > 100km"
                className={`${smallPillBase} ${depthFilter === 'deep' ? pillActive : pillInactive}`}
              >
                &gt;100KM
              </button>
            </div>

            {/* Divider */}
            {divider}

            {/* Segment 4: Color Palette Mode */}
            {onColorModeChange && (
              <>
                <div className={pillGroup}>
                  <button
                    onClick={() => onColorModeChange('magnitude')}
                    title="Warna: Skala Magnitudo"
                    className={`${smallPillBase} ${colorMode === 'magnitude' ? pillActive : pillInactive}`}
                  >
                    MAG
                  </button>
                  <button
                    onClick={() => onColorModeChange('depth')}
                    title="Warna: Kedalaman Hiposenter (Subduksi)"
                    className={`${smallPillBase} ${colorMode === 'depth' ? pillActive : pillInactive}`}
                  >
                    DEPTH
                  </button>
                </div>
                {divider}
              </>
            )}

            {/* Segment 5: Time-Lapse Replay Button */}
            {onOpenTimeLapse && (
              <>
                <button
                  onClick={onOpenTimeLapse}
                  title="Putar Time-Lapse Seismik 7 Hari"
                  className="group flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[9.5px] font-mono tracking-wider font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer shrink-0"
                >
                  <History className="w-3 h-3 text-slate-600 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">REPLAY</span>
                </button>
                {divider}
              </>
            )}

            {/* Segment 6: Virtual Seismogram Oscilloscope Button */}
            {onOpenSeismogram && (
              <>
                <button
                  onClick={onOpenSeismogram}
                  title="Buka Monitor Seismograf Real-Time"
                  className={`group flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[9.5px] font-mono tracking-wider font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs border cursor-pointer shrink-0 ${
                    isSeismogramOpen
                      ? 'bg-slate-900 text-white border-slate-950'
                      : 'bg-slate-100 hover:bg-slate-200/90 text-slate-800 border-slate-200/90'
                  }`}
                >
                  <Activity className="w-3 h-3 text-slate-600 group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">SEISMOGRAM</span>
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
                  title="Buka Daftar Gempa Terkini"
                  className="group flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[9.5px] font-mono tracking-wider font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer shrink-0"
                >
                  <List className="w-3 h-3 text-slate-600 group-hover:text-slate-950 group-hover:rotate-12 transition-all duration-200" />
                  <span>FEED</span>
                  {eventCount !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[8.5px] font-mono font-bold text-slate-700 border border-slate-300/50">
                      {eventCount}
                    </span>
                  )}
                </button>
                {divider}
              </>
            )}

            {/* Segment 8: Action Toggles (Play/Pause Orbit & Reset) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={onToggleRotation}
                title={isRotating ? 'Pause rotasi bola' : 'Putar bola otomatis'}
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
