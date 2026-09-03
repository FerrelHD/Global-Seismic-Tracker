import React from 'react';
import { CameraCoordinates } from './VectorGlobe';

interface ViewportTechnicalFrameProps {
  coordinates: CameraCoordinates;
  visible?: boolean;
}

export const ViewportTechnicalFrame: React.FC<ViewportTechnicalFrameProps> = ({
  coordinates,
  visible = true,
}) => {
  const latStr = `${Math.abs(coordinates.lat).toFixed(4)}° ${coordinates.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(coordinates.lon).toFixed(4)}° ${coordinates.lon >= 0 ? 'E' : 'W'}`;

  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none z-30 transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 1. Four Viewport Perimeter Corner Crop Marks (No Art Blueprint Frame) */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-7 text-slate-900 font-mono text-base sm:text-lg font-light leading-none">
        ┌
      </div>
      <div className="absolute top-4 right-4 sm:top-6 sm:right-7 text-slate-900 font-mono text-base sm:text-lg font-light leading-none">
        ┐
      </div>
      <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-7 text-slate-900 font-mono text-base sm:text-lg font-light leading-none">
        └
      </div>
      <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-7 text-slate-900 font-mono text-base sm:text-lg font-light leading-none">
        ┘
      </div>

      {/* 2. Side Midpoint Crosshairs */}
      <div className="absolute top-1/2 left-2 sm:left-4 -translate-y-1/2 text-slate-400 font-mono text-xs sm:text-sm leading-none">
        ├
      </div>
      <div className="absolute top-1/2 right-2 sm:right-4 -translate-y-1/2 text-slate-400 font-mono text-xs sm:text-sm leading-none">
        ┤
      </div>

      {/* 3. Live Camera Telemetry Readout (Fixed in Bottom-Left Screen Corner) */}
      <div className="absolute bottom-10 sm:bottom-12 left-6 sm:left-10 flex flex-col font-mono text-[10px] sm:text-[11px] tracking-wider text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">LAT:</span>
          <span className="font-bold text-slate-900 tabular-nums">{latStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">LON:</span>
          <span className="font-bold text-slate-900 tabular-nums">{lonStr}</span>
        </div>
      </div>
    </div>
  );
};
