import React, { useMemo } from 'react';
import { SeismicEvent } from '../../types/seismic';
import { X, Bookmark as BookmarkIcon } from 'lucide-react';

interface EventsListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: SeismicEvent[];
  selectedRegion: string;
  onSelectEvent: (event: SeismicEvent) => void;
  isBookmarked: (event: SeismicEvent) => boolean;
  onToggleBookmark: (event: SeismicEvent) => void;
}

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}

export const EventsListDrawer: React.FC<EventsListDrawerProps> = ({
  isOpen,
  onClose,
  events,
  selectedRegion,
  onSelectEvent,
  isBookmarked,
  onToggleBookmark,
}) => {
  // Cap at top 60 significant events for fast ledger rendering
  const sortedEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
      .slice(0, 60);
  }, [events]);

  if (!isOpen) return null;

  return (
    <>
      {/* Subtle backdrop so the 3D globe remains faintly visible */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/15 backdrop-blur-[2px] z-50 transition-opacity duration-300 opacity-100 pointer-events-auto animate-in fade-in"
      />

      {/* High-End Scientific Telemetry Ledger Drawer in Minimalist Grey Glass */}
      <aside
        className="fixed top-0 left-0 bottom-0 h-full w-full max-w-md z-50 shadow-2xl bg-white/92 backdrop-blur-2xl border-r border-slate-200/70 rounded-r-3xl flex flex-col justify-between animate-in slide-in-from-left duration-300 ease-out font-sans overflow-hidden"
      >
        {/* Compact Laboratory Header in Clean Grey */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200/60 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
            </span>
            <div>
              <div className="overflow-hidden">
                <h2 className="text-xs font-bold tracking-widest text-slate-900 font-mono uppercase flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-300">
                  SEISMIC TELEMETRY LEDGER
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/90 text-slate-700 font-mono border border-slate-300/60">
                    LIVE
                  </span>
                </h2>
              </div>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mt-0.5 animate-in fade-in duration-500 delay-100">
                {selectedRegion || 'GLOBAL'} // TOP {sortedEvents.length} OF {events.length} SHOCKS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/70 transition-all hover:scale-110 active:scale-90 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Continuous Data Rows with Clean Grey Hover State & Signature Rolling Text */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain select-none divide-y divide-slate-100/90">
          {sortedEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 font-mono text-xs">
              <p>// NO SEISMIC TELEMETRY RECORDED FOR ACTIVE FILTER</p>
            </div>
          ) : (
            sortedEvents.map((evt, idx) => {
              const mag = evt.magnitude?.toFixed(1) ?? 'N/A';
              const magVal = evt.magnitude ?? 0;
              const bookmarked = isBookmarked(evt);
              const relTime = formatRelativeTime(evt.occurred_at);

              // Direct text color-coding on clean grey background
              const magColorClass =
                magVal >= 6.0
                  ? 'text-rose-600'
                  : magVal >= 5.0
                  ? 'text-amber-600'
                  : 'text-slate-900';

              return (
                <div
                  key={evt.usgs_id || evt.id}
                  onClick={() => {
                    onSelectEvent(evt);
                    onClose();
                  }}
                  style={{
                    animationDelay: `${Math.min(idx * 22, 350)}ms`,
                  }}
                  className="group relative flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-slate-100/90 transition-colors duration-200 cursor-pointer animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
                >
                  {/* Subtle Clean Blue/Slate Left-Edge Indicator on Hover */}
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform duration-200 ease-out origin-center" />

                  {/* Left Column: Monospace Magnitude with Micro-Zoom */}
                  <div className="w-11 shrink-0 text-left">
                    <span
                      className={`font-mono text-lg font-bold tracking-tight tabular-nums transition-all duration-200 inline-block group-hover:scale-110 ${magColorClass}`}
                    >
                      {mag}
                    </span>
                  </div>

                  {/* Center Column: Signature Dual-Layer Rolling Text in Clean Palette */}
                  <div className="flex-1 min-w-0 pr-2">
                    {/* Masked Kinetic Rolling Text */}
                    <div className="overflow-hidden h-[18px] relative">
                      <div className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1/2">
                        {/* Layer 1: Normal Slate Typography */}
                        <div className="h-[18px] flex items-center">
                          <h3 className="text-xs font-semibold text-slate-900 tracking-tight truncate">
                            {evt.place || 'Unknown Epicenter'}
                          </h3>
                        </div>
                        {/* Layer 2: Hover Highlight Typography */}
                        <div className="h-[18px] flex items-center">
                          <h3 className="text-xs font-bold text-blue-600 tracking-tight truncate">
                            {evt.place || 'Unknown Epicenter'}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Sub-telemetry in Minimalist Grey */}
                    <div className="text-[10px] font-mono text-slate-400 group-hover:text-slate-600 mt-0.5 transition-all duration-200 group-hover:translate-x-0.5 tracking-wider">
                      DEPTH {evt.depth.toFixed(1)}KM // {relTime}
                    </div>
                  </div>

                  {/* Right Column: Bookmark with Micro-Pop Reveal */}
                  <div className="shrink-0 w-7 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(evt);
                      }}
                      className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                        bookmarked
                          ? 'opacity-100 text-emerald-600 hover:text-emerald-500 scale-100'
                          : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 hover:scale-115'
                      }`}
                    >
                      <BookmarkIcon className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Minimalist Bottom Shortcut Bar in Clean Grey */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-200/60 bg-slate-50/80 flex items-center justify-between text-[10px] font-mono text-slate-500 tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-slate-400 animate-pulse" />
            CLICK ROW TO FOCUS 3D GLOBE
          </span>
          <span>PRESS ESC TO CLOSE</span>
        </div>
      </aside>
    </>
  );
};
