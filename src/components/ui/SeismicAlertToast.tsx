import React, { useEffect } from 'react';
import { X, ArrowRight, AlertTriangle } from 'lucide-react';

export interface AlertEventData {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  depth: string | number;
  tsunami?: boolean;
  latitude: number;
  longitude: number;
  isSimulated?: boolean;
}

interface SeismicAlertToastProps {
  alert: AlertEventData | null;
  onClose: () => void;
  onLocate: (alert: AlertEventData) => void;
}

export const SeismicAlertToast: React.FC<SeismicAlertToastProps> = ({
  alert,
  onClose,
  onLocate,
}) => {
  useEffect(() => {
    if (!alert) return;

    // Clean 12-second auto-dismiss without any bottom progress bar
    const timer = setTimeout(() => {
      onClose();
    }, 12000);

    return () => clearTimeout(timer);
  }, [alert, onClose]);

  if (!alert) return null;

  return (
    <div className="fixed top-[4.5rem] sm:top-[4.85rem] left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-3 sm:px-4 pointer-events-none select-none animate-in fade-in slide-in-from-top-2 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
      <div className="relative overflow-hidden rounded-full bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-lg px-3.5 sm:px-5 py-2 flex items-center justify-between gap-2 sm:gap-4 pointer-events-auto">
        {/* Left: Tectonic Telemetry Feed Readout */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Pulsing Beacon Indicator */}
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
          </span>

          {/* Dispatch Tag */}
          <span className="hidden sm:inline-block font-mono text-[10px] font-bold text-rose-600 tracking-wider whitespace-nowrap">
            [RUPTURE ALERT]
          </span>

          <span className="hidden sm:inline text-slate-300 font-mono text-xs">/</span>

          {/* Magnitude Badge */}
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-rose-100 border border-rose-200 text-rose-900 font-mono font-black text-[11px] sm:text-xs tracking-tight">
            M{alert.magnitude.toFixed(1)}
          </span>

          {/* Location & Depth Headline */}
          <span className="font-sans font-bold text-xs sm:text-[13px] text-slate-950 tracking-tight uppercase truncate">
            {alert.place}
          </span>

          <span className="hidden md:inline font-mono text-[10px] text-slate-400 whitespace-nowrap">
            · {typeof alert.depth === 'number' ? `${alert.depth} KM` : alert.depth}
          </span>

          {alert.tsunami && (
            <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[9px] font-bold uppercase tracking-wider shrink-0">
              <AlertTriangle className="w-2.5 h-2.5" />
              <span>TSUNAMI WARNING</span>
            </span>
          )}
        </div>

        {/* Right: Technical Hyperlink Action & Dismiss */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => onLocate(alert)}
            className="group flex items-center gap-1 font-mono text-[11px] sm:text-xs font-bold text-slate-950 hover:text-rose-600 transition-colors uppercase underline underline-offset-4 decoration-rose-500/70 cursor-pointer whitespace-nowrap"
          >
            <span>TRACK EPICENTER</span>
            <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
            title="Dismiss Dispatch"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
