import React from 'react';
import { CameraCoordinates } from './VectorGlobe';

interface GlobeTechnicalHudProps {
  coordinates: CameraCoordinates;
  visible?: boolean;
}

export const GlobeTechnicalHud: React.FC<GlobeTechnicalHudProps> = ({
  coordinates,
  visible = true,
}) => {
  const latStr = `${Math.abs(coordinates.lat).toFixed(4)}° ${coordinates.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(coordinates.lon).toFixed(4)}° ${coordinates.lon >= 0 ? 'E' : 'W'}`;

  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 1. Corner Crop Marks (No Art Architectural Style) */}
      <div className="absolute top-2 left-2 text-slate-400 font-mono text-sm leading-none">┌</div>
      <div className="absolute top-2 right-2 text-slate-400 font-mono text-sm leading-none">┐</div>
      <div className="absolute bottom-2 left-2 text-slate-400 font-mono text-sm leading-none">└</div>
      <div className="absolute bottom-2 right-2 text-slate-400 font-mono text-sm leading-none">┘</div>

      {/* 2. Side Midpoint Crosshairs */}
      <div className="absolute top-1/2 left-1 -translate-y-1/2 text-slate-300 font-mono text-xs leading-none">├</div>
      <div className="absolute top-1/2 right-1 -translate-y-1/2 text-slate-300 font-mono text-xs leading-none">┤</div>

      {/* 3. Live Camera Telemetry Readout (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 flex flex-col font-mono text-[10px] tracking-wider text-slate-500 bg-white/70 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-slate-200/60 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">LAT:</span>
          <span className="font-semibold text-slate-900 tabular-nums">{latStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">LON:</span>
          <span className="font-semibold text-slate-900 tabular-nums">{lonStr}</span>
        </div>
      </div>
    </div>
  );
};
