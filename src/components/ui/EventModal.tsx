import React from 'react';
import { SeismicEvent } from '../../types/seismic';
import { LiquidCard } from './liquid-glass';
import { X, Bookmark as BookmarkIcon, ExternalLink, Check } from 'lucide-react';

interface EventModalProps {
  event: SeismicEvent | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (event: SeismicEvent, note?: string) => void;
}

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function cleanPlace(place: string | null): string {
  if (!place) return 'Unknown Epicenter';
  const parts = place.split(' of ');
  return parts.length > 1 ? parts[1] : place;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  isBookmarked,
  onToggleBookmark,
}) => {
  if (!event) return null;

  const mag = event.magnitude?.toFixed(1) ?? 'N/A';
  const magVal = event.magnitude ?? 0;
  const isMajor = magVal >= 6.0;
  const isModerate = magVal >= 5.0;
  const usgsUrl = `https://earthquake.usgs.gov/earthquakes/eventpage/${event.usgs_id}/executive`;
  const relTime = formatRelativeTime(event.occurred_at);

  const latDir = event.latitude >= 0 ? 'N' : 'S';
  const lonDir = event.longitude >= 0 ? 'E' : 'W';
  const formattedCoords = `${Math.abs(event.latitude).toFixed(3)}° ${latDir}, ${Math.abs(event.longitude).toFixed(3)}° ${lonDir}`;

  const dateObj = new Date(event.occurred_at);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/20 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <LiquidCard className="w-full rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/80 select-none backdrop-blur-2xl">
          {/* Header: Clean Location Title & Close */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100/90">
            <div className="min-w-0">
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold block mb-1">
                Earthquake Event · {event.usgs_id}
              </span>
              <h2 className="text-xl sm:text-2xl font-sans font-bold text-slate-950 tracking-tight leading-snug truncate">
                {cleanPlace(event.place)}
              </h2>
              {event.place && event.place.includes(' of ') && (
                <p className="text-xs text-slate-500 font-sans mt-0.5 truncate">
                  {event.place}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              title="Close modal"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100/80 transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Hero Magnitude & Severity Display */}
          <div className="py-5 flex items-baseline justify-between gap-4 border-b border-slate-100/90">
            <div className="flex items-baseline gap-3">
              <span
                className={`text-5xl sm:text-6xl font-mono font-bold tracking-tight tabular-nums ${
                  isMajor
                    ? 'text-rose-600'
                    : isModerate
                    ? 'text-amber-600'
                    : 'text-slate-900'
                }`}
              >
                {mag}
              </span>
              <div>
                <span className="text-xs font-mono font-semibold text-slate-400 block tracking-wider uppercase">
                  Magnitude
                </span>
                <span className="text-xs font-sans text-slate-600 mt-0.5 block">
                  {isMajor ? 'Major Seismic Rupture' : isModerate ? 'Moderate Shock' : 'Minor Tremor'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono text-slate-400 block tracking-wider uppercase">
                Depth
              </span>
              <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                {event.depth.toFixed(1)} km
              </span>
            </div>
          </div>

          {/* Clean Information List */}
          <div className="py-4 space-y-2.5 font-sans text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                Recorded Time
              </span>
              <span className="font-medium text-slate-800 text-right">
                {formattedDate}, {formattedTime} <span className="text-slate-400 font-normal">({relTime})</span>
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                Coordinates
              </span>
              <span className="font-mono font-semibold text-slate-800 text-right">
                {formattedCoords}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                Crustal Layer
              </span>
              <span className="font-medium text-slate-700 text-right">
                {event.depth < 70
                  ? 'Shallow Crust (< 70 km)'
                  : event.depth < 300
                  ? 'Intermediate Subduction'
                  : 'Deep Mantle (> 300 km)'}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100/90 flex items-center justify-between gap-3">
            <a
              href={usgsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500 hover:text-slate-950 transition-colors"
            >
              <span>USGS Data Report</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => onToggleBookmark(event)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-mono font-semibold transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
                  : 'bg-slate-900 hover:bg-black text-white shadow-sm'
              }`}
            >
              {isBookmarked ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>SAVED</span>
                </>
              ) : (
                <>
                  <BookmarkIcon className="w-3.5 h-3.5" />
                  <span>BOOKMARK</span>
                </>
              )}
            </button>
          </div>
        </LiquidCard>
      </div>
    </div>
  );
};
