import React from 'react';
import { Play, Pause, X, Clock } from 'lucide-react';
import { LiquidCard } from './liquid-glass';

interface TimeLapseScrubberProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  currentTime: number;
  startTime: number;
  endTime: number;
  onScrub: (time: number) => void;
  visibleCount: number;
  totalCount: number;
  onClose: () => void;
}

export const TimeLapseScrubber: React.FC<TimeLapseScrubberProps> = ({
  isPlaying,
  onTogglePlay,
  speed,
  onSpeedChange,
  currentTime,
  startTime,
  endTime,
  onScrub,
  visibleCount,
  totalCount,
  onClose,
}) => {
  const range = Math.max(1, endTime - startTime);
  const progressPercent = Math.min(100, Math.max(0, ((currentTime - startTime) / range) * 100));

  // Format date and time in WIB (GMT+7)
  const formatWIB = (ms: number) => {
    const d = new Date(ms);
    const dateStr = d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    });
    const timeStr = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    });
    return `${dateStr.toUpperCase()} · ${timeStr} WIB`;
  };

  const speedOptions = [1, 5, 15, 45];

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto w-[min(94vw,760px)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <LiquidCard className="rounded-2xl sm:rounded-full shadow-2xl p-2.5 sm:px-5 sm:py-3 border border-slate-200/90">
        <div className="flex flex-col gap-2">
          {/* Top Row: Info & Controls */}
          <div className="flex items-center justify-between gap-2 text-xs font-mono">
            {/* Play/Pause Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={onTogglePlay}
                title={isPlaying ? 'Pause Replay' : 'Play Replay'}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-transform active:scale-95 shadow-xs cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              {/* Speed Cycle Button */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-full border border-slate-200/80">
                {speedOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSpeedChange(s)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                      speed === s
                        ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Center Live Simulation Timestamp */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-800 font-semibold tracking-wider text-[11px]">
              <Clock className="w-3 h-3 text-cyan-600 animate-pulse" />
              <span>{formatWIB(currentTime)}</span>
            </div>

            {/* Event Counter & Close */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-600 text-[10px] font-medium tracking-wide">
                <span className="font-bold text-slate-900 tabular-nums">{visibleCount}</span>
                <span className="text-slate-400"> / {totalCount} RUPTURES</span>
              </div>

              <button
                onClick={onClose}
                title="Keluar Time-Lapse"
                className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-950 transition-all cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile Timestamp View */}
          <div className="flex sm:hidden items-center justify-center gap-1.5 text-[10px] font-mono text-slate-700">
            <Clock className="w-2.5 h-2.5 text-cyan-600 animate-pulse" />
            <span className="font-semibold">{formatWIB(currentTime)}</span>
          </div>

          {/* Bottom Row: Scrubber Track Slider */}
          <div className="relative w-full flex items-center h-4 group">
            {/* Background Track */}
            <div className="absolute inset-x-0 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-blue-500 via-cyan-500 to-rose-500 rounded-full transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Native Invisible Range Input Overlaid for Seamless Touch/Drag */}
            <input
              type="range"
              min={startTime}
              max={endTime}
              step={60000} // 1-minute steps
              value={currentTime}
              onChange={(e) => onScrub(Number(e.target.value))}
              aria-label="Time scrubber"
              className="absolute inset-x-0 w-full h-4 opacity-0 cursor-pointer z-10"
            />

            {/* Visual Custom Playhead Thumb */}
            <div
              className="absolute w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-full shadow-md pointer-events-none -translate-x-1/2 group-hover:scale-125 transition-transform"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
        </div>
      </LiquidCard>
    </div>
  );
};
