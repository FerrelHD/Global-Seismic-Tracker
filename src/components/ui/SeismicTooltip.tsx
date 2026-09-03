import React from 'react';
import { HoveredEventState } from '../../types/seismic';
import { Activity, Layers, MapPin, Clock } from 'lucide-react';

interface SeismicTooltipProps {
  hoveredState: HoveredEventState | null;
}

export const SeismicTooltip: React.FC<SeismicTooltipProps> = ({ hoveredState }) => {
  if (!hoveredState) return null;

  const { event, screenPos } = hoveredState;
  const mag = event.magnitude?.toFixed(1) ?? 'N/A';
  const isHigh = (event.magnitude ?? 0) >= 5.0;

  const formattedTime = new Date(event.occurred_at).toUTCString().replace('GMT', 'UTC');

  return (
    <div
      className="fixed z-50 pointer-events-none transition-transform duration-75 ease-out"
      style={{
        left: `${screenPos.x + 16}px`,
        top: `${screenPos.y + 16}px`,
        transform: 'translate3d(0, 0, 0)',
      }}
    >
      <div className="w-80 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 p-4 shadow-xl font-mono text-xs text-slate-800">
        {/* Header: Magnitude badge & USGS ID */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 rounded-md text-xs font-bold tracking-wider ${
                isHigh
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              MAG {mag}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
              {event.usgs_id}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            LIVE
          </div>
        </div>

        {/* Place */}
        <div className="mt-3 flex items-start gap-2 text-slate-800">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span className="font-sans font-semibold text-sm leading-snug line-clamp-2">
            {event.place || 'Unknown Epicenter'}
          </span>
        </div>

        {/* Depth & Coordinates Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
              <Layers className="w-3 h-3 text-amber-500" /> DEPTH
            </span>
            <span className="text-slate-800 font-bold mt-0.5">
              {event.depth.toFixed(1)} km
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
              <Activity className="w-3 h-3 text-cyan-600" /> COORD
            </span>
            <span className="text-slate-800 font-bold mt-0.5 text-[11px]">
              {event.latitude.toFixed(2)}°, {event.longitude.toFixed(2)}°
            </span>
          </div>
        </div>

        {/* Occurred At Timestamp */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};
