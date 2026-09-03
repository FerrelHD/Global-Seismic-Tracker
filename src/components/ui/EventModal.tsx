import React, { useState } from 'react';
import { SeismicEvent } from '../../types/seismic';
import { LiquidCard } from './liquid-glass';
import { X, Bookmark as BookmarkIcon, ExternalLink, MapPin, Layers, Activity, Clock, Check } from 'lucide-react';

interface EventModalProps {
  event: SeismicEvent | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (event: SeismicEvent, note?: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [note, setNote] = useState('');

  if (!event) return null;

  const mag = event.magnitude?.toFixed(1) ?? 'N/A';
  const isHigh = (event.magnitude ?? 0) >= 5.0;
  const usgsUrl = `https://earthquake.usgs.gov/earthquakes/eventpage/${event.usgs_id}/executive`;

  const handleBookmarkClick = () => {
    onToggleBookmark(event, note);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-xs animate-in fade-in duration-200 select-none"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <LiquidCard className="w-full rounded-3xl p-6 sm:p-7 shadow-2xl font-sans text-slate-900">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider ${
                  isHigh
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-slate-100/80 text-slate-900 border border-slate-200'
                }`}
              >
                MAGNITUDE {mag}
              </span>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                {event.usgs_id}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-white/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Epicenter Title */}
          <div className="mt-4">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
              <h3 className="text-base font-bold text-slate-950 leading-snug">
                {event.place || 'Unknown Epicenter Location'}
              </h3>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mt-5 p-3.5 rounded-2xl bg-white/50 border border-white/60 shadow-xs font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Layers className="w-3 h-3 text-amber-500" /> HYPOCENTER DEPTH
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {event.depth.toFixed(1)} km
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Activity className="w-3 h-3 text-blue-600" /> COORDINATES
              </span>
              <span className="text-sm font-bold text-slate-900 mt-1 block">
                {event.latitude.toFixed(2)}°, {event.longitude.toFixed(2)}°
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{new Date(event.occurred_at).toUTCString()}</span>
          </div>

          {/* Custom Research Note Input */}
          <div className="mt-4">
            <label className="text-[10px] font-mono text-slate-500 block mb-1 font-semibold uppercase">
              RESEARCH NOTE
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add observation note..."
              className="w-full px-3.5 py-2 rounded-xl text-xs bg-white/60 border border-slate-200/80 focus:border-slate-500 focus:bg-white focus:outline-none transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="mt-5 pt-4 border-t border-slate-200/60 flex items-center justify-between gap-3">
            <a
              href={usgsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span>USGS Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleBookmarkClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                isBookmarked
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-900 text-white hover:bg-black shadow-xs'
              }`}
            >
              {isBookmarked ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>BOOKMARKED</span>
                </>
              ) : (
                <>
                  <BookmarkIcon className="w-3.5 h-3.5" />
                  <span>BOOKMARK EVENT</span>
                </>
              )}
            </button>
          </div>
        </LiquidCard>
      </div>
    </div>
  );
};
