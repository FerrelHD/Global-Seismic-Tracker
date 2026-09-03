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
}) => {
  return (
    <nav
      aria-label="Seismic Telemetry Controller"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-auto select-none animate-in fade-in slide-in-from-bottom-6 duration-700 pointer-events-none"
    >
      <div className="pointer-events-auto">
        <LiquidCard className="rounded-full px-3 py-1.5 sm:px-4 sm:py-1.5 shadow-xl border border-slate-200/80">
          <div className="flex items-center gap-2 sm:gap-2.5 font-mono text-xs text-slate-800 whitespace-nowrap">
            {/* Segment 1: Clean Minimalist Grey Region Pills */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80">
              <button
                onClick={() => onSearchChange('')}
                className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                  searchQuery === ''
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                GLOBAL
              </button>
              <button
                onClick={() => onSearchChange('indonesia')}
                className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  searchQuery.toLowerCase() === 'indonesia'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block animate-pulse" />
                <span>IDN</span>
              </button>
              <button
                onClick={() => onSearchChange('japan')}
                className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  searchQuery.toLowerCase() === 'japan'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-pulse" />
                <span>JPN</span>
              </button>
              <button
                onClick={() => onSearchChange('alaska')}
                className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  searchQuery.toLowerCase() === 'alaska'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
                <span>USA</span>
              </button>
            </div>

            {/* Segment 2: Divider */}
            <div className="w-[1px] h-4 bg-slate-300/60" />

            {/* Segment 3: Time Horizon Scrubber Pills */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80">
              <button
                onClick={() => onTimeFilterChange('all')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                  timeFilter === 'all'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                ALL TIME
              </button>
              <button
                onClick={() => onTimeFilterChange('24h')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                  timeFilter === '24h'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                24H
              </button>
              <button
                onClick={() => onTimeFilterChange('7d')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                  timeFilter === '7d'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                7D
              </button>
            </div>

            {/* Segment 4: Divider */}
            <div className="w-[1px] h-4 bg-slate-300/60" />

            {/* Segment 5: Clean Minimalist Grey Depth Toggle */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80">
              <button
                onClick={() => onDepthFilterChange('all')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
                  depthFilter === 'all'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => onDepthFilterChange('shallow')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  depthFilter === 'shallow'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block animate-pulse" />
                &lt;30km
              </button>
              <button
                onClick={() => onDepthFilterChange('deep')}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  depthFilter === 'deep'
                    ? 'bg-slate-200/95 text-slate-900 font-semibold shadow-xs border border-slate-300/80'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
                &gt;100km
              </button>
            </div>

            {/* Segment 6: Divider */}
            <div className="w-[1px] h-4 bg-slate-300/60" />

            {/* Segment 7: Clean Minimalist Grey Feed Button */}
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
                <div className="w-[1px] h-4 bg-slate-300/60" />
              </>
            )}

            {/* Segment 8: Action Toggles in Clean Grey */}
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
