import React, { useState } from 'react';
import { Bookmark } from '../../types/seismic';
import { LiquidCard } from './liquid-glass';
import { X, Bookmark as BookmarkIcon, Trash2, MapPin, Layers, Clock, FileText, Check } from 'lucide-react';

interface BookmarkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  onRemoveBookmark: (id: string) => void;
  onSelectEvent?: (eventId: string) => void;
  onUpdateNote?: (bookmarkId: string, note: string) => void;
}

export const BookmarkDrawer: React.FC<BookmarkDrawerProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onRemoveBookmark,
  onSelectEvent,
  onUpdateNote,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const startEditing = (b: Bookmark) => {
    setEditingId(b.id);
    setNoteInput(b.custom_note || '');
  };

  const saveNote = (id: string) => {
    if (onUpdateNote) {
      onUpdateNote(id, noteInput);
    }
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        onWheel={(e) => e.stopPropagation()}
        className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 transition-opacity duration-200 opacity-100 pointer-events-auto"
      />

      {/* Slide-over Liquid Glass Panel */}
      <aside
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className="fixed top-0 right-0 bottom-0 h-full w-full max-w-md z-50 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 ease-out font-sans overflow-hidden"
      >
        <LiquidCard interactive={false} className="h-full w-full border-l border-white/80 rounded-l-3xl overflow-hidden">
        {/* Header (Fixed at top) */}
        <div className="shrink-0 p-6 border-b border-slate-100 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <BookmarkIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 font-mono uppercase">
                SAVED OBSERVATIONS
              </h2>
              <p className="text-[11px] text-slate-500 font-mono font-medium">
                {bookmarks.length} {bookmarks.length === 1 ? 'EVENT' : 'EVENTS'} BOOKMARKED
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmarks List (Scrollable) */}
        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4 overscroll-contain"
        >
          {bookmarks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 mb-3">
                <BookmarkIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No events saved yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs font-light">
                Use the bookmark action on any seismic event to store telemetry and notes for future reference.
              </p>
            </div>
          ) : (
            bookmarks.map((b) => {
              const mag = b.event.magnitude?.toFixed(1) ?? 'N/A';
              const isHigh = (b.event.magnitude ?? 0) >= 5.0;

              return (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                          isHigh
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        M{mag}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        {b.event.usgs_id}
                      </span>
                    </div>

                    <button
                      onClick={() => onRemoveBookmark(b.id)}
                      title="Remove bookmark"
                      className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Location title */}
                  <div
                    onClick={() => onSelectEvent?.(b.event_id)}
                    className="mt-2.5 flex items-start gap-1.5 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {b.event.place || 'Unknown Epicenter'}
                    </span>
                  </div>

                  {/* Telemetry info */}
                  <div className="flex items-center gap-4 mt-2.5 text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-500" />
                      {b.event.depth.toFixed(1)} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(b.event.occurred_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Custom Note Section */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    {editingId === b.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder="Add research note..."
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-slate-500 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => saveNote(b.id)}
                          className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-600 italic truncate max-w-[240px]">
                          {b.custom_note || 'No notes added'}
                        </span>
                        <button
                          onClick={() => startEditing(b)}
                          className="text-[10px] font-mono font-medium text-slate-400 hover:text-slate-800 flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          {b.custom_note ? 'Edit' : 'Add Note'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>SYNCED LOCALLY & SUPABASE</span>
          <span className="text-slate-400">PRESS ESC TO CLOSE</span>
        </div>
        </LiquidCard>
      </aside>
    </>
  );
};
