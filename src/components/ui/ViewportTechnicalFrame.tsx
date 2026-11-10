import React from 'react';
import { CameraCoordinates } from './VectorGlobe';

interface ViewportTechnicalFrameProps {
  coordinates?: CameraCoordinates;
  visible?: boolean;
}

export const ViewportTechnicalFrame: React.FC<ViewportTechnicalFrameProps> = ({
  visible = true,
}) => {
  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none z-30 transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 1. Four Viewport Perimeter Corner Crop Marks (No Art Blueprint Frame) - hidden on mobile to avoid notch collision */}
      <div className="hidden sm:block absolute top-6 left-7 text-slate-900 font-mono text-lg font-light leading-none">
        ┌
      </div>
      <div className="hidden sm:block absolute top-6 right-7 text-slate-900 font-mono text-lg font-light leading-none">
        ┐
      </div>
      <div className="hidden sm:block absolute bottom-6 left-7 text-slate-900 font-mono text-lg font-light leading-none">
        └
      </div>
      <div className="hidden sm:block absolute bottom-6 right-7 text-slate-900 font-mono text-lg font-light leading-none">
        ┘
      </div>

      {/* 2. Side Midpoint Crosshairs */}
      <div className="hidden md:block absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 font-mono text-sm leading-none">
        ├
      </div>
      <div className="hidden md:block absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 font-mono text-sm leading-none">
        ┤
      </div>
    </div>
  );
};

