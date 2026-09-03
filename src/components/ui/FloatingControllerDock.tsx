import React from 'react';
import { LiquidCard } from './liquid-glass';
import { Play, Pause, RotateCcw, List } from 'lucide-react';

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
  eventCount?: number;
  visible?: boolean;
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
  eventCount,
  visible = true,
}) => {
  const pillGroup = 'flex items-center gap-0.5 sm:gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80 shrink-0';
  const pillBase = 'px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9.5px] sm:text-[11px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap';
  const pillActive = 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80';
  const pillInactive = 'text-slate-500 hover:text-slate-800 hover:bg-white/60';
  const smallPillBase = 'px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap';
  const divider = <div className="w-[1px] h-3 sm:h-3.5 bg-slate-300/60 shrink-0" />;

  return (
    <nav
      aria-label="Seismic Telemetry Controller"
      className={`fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 select-none transition-all duration-700 pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'
      }`}
      style={{ width: 'max-content', maxWidth: 'calc(100vw - 1rem)' }}
    >
      <div className="pointer-events-auto">
        <LiquidCard className="rounded-full shadow-xl">
          {/* Horizontally scrollable inner content on mobile, centered and fully visible on desktop */}
          <div
            className="flex items-center justify-start md:justify-center gap-1 sm:gap-2 font-mono text-xs whitespace-nowrap px-2 py-1 sm:px-3.5 sm:py-1.5 overflow-x-auto text-slate-800 touch-pan-x"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* Segment 1: Region Pills */}
            <div className={pillGroup}>
              <button
                onClick={() => onSearchChange('')}
                className={`${pillBase} ${searchQuery === '' ? pillActive : pillInactive}`}
              >
                ALL NUSANTARA
              </button>
              <button
                onClick={() => onSearchChange('sumatra')}
                className={`${pillBase} ${searchQuery.toLowerCase() === 'sumatra' ? pillActive : pillInactive}`}
              >
                SUMATRA
              </button>
              <button
                onClick={() => onSearchChange('java')}
                className={`${pillBase} ${searchQuery.toLowerCase() === 'java' ? pillActive : pillInactive}`}
              >
                JAVA
              </button>
              <button
                onClick={() => onSearchChange('sulawesi')}
                className={`${pillBase} ${searchQuery.toLowerCase() === 'sulawesi' ? pillActive : pillInactive}`}
              >
                SULAWESI
              </button>
              <button
                onClick={() => onSearchChange('banda')}
                className={`${pillBase} ${searchQuery.toLowerCase() === 'banda' ? pillActive : pillInactive}`}
              >
                BANDA
              </button>
              <button
                onClick={() => onSearchChange('papua')}
                className={`${pillBase} ${searchQuery.toLowerCase() === 'papua' ? pillActive : pillInactive}`}
              >
                PAPUA
              </button>
            </div>

            {/* Segment 2: Divider */}
            {divider}

            {/* Segment 3: Time Horizon Scrubber Pills */}
            <div className={pillGroup}>
              <button
                onClick={() => onTimeFilterChange('all')}
                className={`${smallPillBase} ${timeFilter === 'all' ? pillActive : pillInactive}`}
              >
                ALL TIME
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

            {/* Segment 4: Divider */}
            {divider}

            {/* Segment 5: Depth Toggle */}
            <div className={pillGroup}>
              <button
                onClick={() => onDepthFilterChange('all')}
                className={`${smallPillBase} ${depthFilter === 'all' ? pillActive : pillInactive}`}
              >
                ALL
              </button>
              <button
                onClick={() => onDepthFilterChange('shallow')}
                className={`${smallPillBase} ${depthFilter === 'shallow' ? pillActive : pillInactive} flex items-center gap-1.5`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block animate-pulse" />
                &lt;30km
              </button>
              <button
                onClick={() => onDepthFilterChange('deep')}
                className={`${smallPillBase} ${depthFilter === 'deep' ? pillActive : pillInactive} flex items-center gap-1.5`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                &gt;100km
              </button>
            </div>

            {/* Segment 6: Divider */}
            {divider}

            {/* Segment 7: Feed Button */}
            {onOpenFeed && (
              <>
                <button
                  onClick={onOpenFeed}
                  title="Open Seismic Events Feed"
                  className="group flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[10px] font-mono tracking-wider font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs border border-slate-200/90 cursor-pointer"
                >
                  <List className="w-3 h-3 text-slate-600 group-hover:text-slate-950 group-hover:rotate-12 transition-all duration-200" />
                  <span>FEED</span>
                  {eventCount !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[9px] font-mono font-bold text-slate-700 border border-slate-300/50">
                      {eventCount}
                    </span>
                  )}
                </button>
                {divider}
              </>
            )}

            {/* Segment 8: Action Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={onToggleRotation}
                title={isRotating ? 'Pause auto-rotation' : 'Play auto-rotation'}
                className="group p-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200/80 transition-all duration-200 hover:scale-110 active:scale-90 shadow-xs cursor-pointer"
              >
                {isRotating ? (
                  <Pause className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                ) : (
                  <Play className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                )}
              </button>
              <button
                onClick={onResetView}
                title="Reset camera view"
                className="group p-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200 text-slate-700 hover:text-slate-950 border border-slate-200/80 transition-all duration-200 hover:scale-110 active:scale-90 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </LiquidCard>
      </div>
    </nav>
  );
};
