import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { CobeGlobe } from './components/ui/CobeGlobe';
import { LiquidGlassFilter, LiquidCard } from './components/ui/liquid-glass';
import { FloatingControllerDock } from './components/ui/FloatingControllerDock';
import { BookmarkDrawer } from './components/ui/BookmarkDrawer';
import { EventsListDrawer } from './components/ui/EventsListDrawer';
import { EventModal } from './components/ui/EventModal';
import { SeismicEvent, Bookmark } from './types/seismic';
import {
  fetchSeismicEvents,
  getLocalBookmarks,
  saveLocalBookmark,
  removeLocalBookmark,
} from './utils/supabase';
import { Globe as GlobeIcon, RefreshCw, Bookmark as BookmarkIcon } from 'lucide-react';

export const App: React.FC = () => {
  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Bookmarks state & Drawer
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Events Feed Drawer
  const [isFeedOpen, setIsFeedOpen] = useState(false);

  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d'>('all');
  const [depthFilter, setDepthFilter] = useState<'all' | 'shallow' | 'mid' | 'deep'>('all');
  const [isRotating, setIsRotating] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [targetFocus, setTargetFocus] = useState<[number, number] | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSeismicEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setBookmarks(getLocalBookmarks());
  }, []);

  // Keyboard shortcut: ESC to close drawers & modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setIsFeedOpen(false);
        setSelectedEvent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const place = (e.place || '').toLowerCase();

        // Smart Indonesia Detection (Text + Geocoordinates Bounding Box: -11.5 to 6.5 Lat, 95 to 141.5 Lon)
        if (q === 'indonesia' || q === 'indo' || q === 'idn') {
          const inGeoBounds =
            e.latitude >= -11.5 && e.latitude <= 6.5 && e.longitude >= 95.0 && e.longitude <= 141.5;
          const hasKeyword =
            place.includes('indonesia') ||
            place.includes('sumatra') ||
            place.includes('java') ||
            place.includes('bali') ||
            place.includes('sulawesi') ||
            place.includes('maluku') ||
            place.includes('papua') ||
            place.includes('banda sea');
          if (!inGeoBounds && !hasKeyword) return false;
        } else if (!place.includes(q)) {
          return false;
        }
      }

      // Time horizon filter
      if (timeFilter !== 'all') {
        const now = Date.now();
        const eventTime = new Date(e.occurred_at).getTime();
        const diffHours = (now - eventTime) / (1000 * 60 * 60);
        if (timeFilter === '24h' && diffHours > 24) return false;
        if (timeFilter === '7d' && diffHours > 24 * 7) return false;
      }

      // Depth filter
      if (depthFilter === 'shallow' && e.depth > 30) return false;
      if (depthFilter === 'mid' && (e.depth <= 30 || e.depth > 100)) return false;
      if (depthFilter === 'deep' && e.depth <= 100) return false;

      return true;
    });
  }, [events, searchQuery, timeFilter, depthFilter]);

  const topEvent = useMemo(() => {
    if (filteredEvents.length === 0) return null;
    return [...filteredEvents].sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))[0];
  }, [filteredEvents]);

  const stats = useMemo(() => {
    if (filteredEvents.length === 0) return { count: 0, maxMag: '0.0', avgDepth: '0.0' };
    const maxMag = topEvent?.magnitude ?? 0;
    const avgDepth = filteredEvents.reduce((acc, e) => acc + e.depth, 0) / filteredEvents.length;
    return {
      count: filteredEvents.length,
      maxMag: maxMag.toFixed(1),
      avgDepth: avgDepth.toFixed(1),
    };
  }, [filteredEvents, topEvent]);

  // Region change with auto-focus camera animation
  const handleRegionChange = useCallback((val: string) => {
    setSearchQuery(val);
    const q = val.toLowerCase();
    if (q === 'indonesia') {
      setTargetFocus([-2.5, 120.0]);
    } else if (q === 'japan') {
      setTargetFocus([36.0, 138.0]);
    } else if (q === 'alaska') {
      setTargetFocus([58.0, -150.0]);
    } else {
      setTargetFocus(null);
    }
  }, []);

  // Bookmark actions
  const isEventBookmarked = useCallback(
    (event: SeismicEvent | null) => {
      if (!event) return false;
      return bookmarks.some(
        (b) => b.event_id === event.id || b.event.usgs_id === event.usgs_id
      );
    },
    [bookmarks]
  );

  const handleToggleBookmark = useCallback(
    (event: SeismicEvent, note = '') => {
      const exists = isEventBookmarked(event);
      if (exists) {
        const updated = removeLocalBookmark(event.id || event.usgs_id);
        setBookmarks(updated);
      } else {
        const updated = saveLocalBookmark(event, note);
        setBookmarks(updated);
      }
    },
    [isEventBookmarked]
  );

  const handleRemoveBookmark = useCallback((id: string) => {
    const updated = removeLocalBookmark(id);
    setBookmarks(updated);
  }, []);

  const handleSelectEventById = useCallback(
    (eventId: string) => {
      const found = events.find((e) => e.id === eventId || e.usgs_id === eventId);
      if (found) {
        setSelectedEvent(found);
        setTargetFocus([found.latitude, found.longitude]);
      }
    },
    [events]
  );

  return (
    <div className="relative h-screen w-screen bg-white text-slate-900 hud-grid-bg flex flex-col justify-between overflow-hidden selection:bg-slate-900 selection:text-white font-sans">
      {/* 1. Global Liquid Glass SVG Refraction Filter */}
      <LiquidGlassFilter />

      {/* 2. AWWWARDS-STYLE LIQUID GLASS NAVBAR */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4 pointer-events-none select-none">
        <LiquidCard className="rounded-2xl sm:rounded-full p-2.5 sm:px-6 sm:py-2.5 shadow-xl pointer-events-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <GlobeIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-bold tracking-widest uppercase font-mono text-slate-950 flex items-center gap-2">
                  SEISMIC OBSERVATORY
                  <span className="text-slate-300 font-normal hidden sm:inline">//</span>
                  <span className="text-slate-600 font-display font-black tracking-tight hidden sm:inline text-xs">
                    GLOBAL TECTONICS
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-800 border border-slate-300/80 font-mono tracking-wider font-semibold">
                    LIVE 3D
                  </span>
                </h1>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3 font-mono text-xs">
              {/* Telemetry Counters */}
              <div className="hidden md:flex items-center gap-4 px-3.5 py-1 rounded-full bg-white/50 border border-white/80 shadow-xs text-[11px] font-mono tracking-wider">
                <div>
                  <span className="text-[9px] text-slate-400 block font-medium">TOTAL SHOCKS</span>
                  <span className="font-bold text-slate-900">{loading ? '...' : `${stats.count}`}</span>
                </div>
                <div className="w-[1px] h-4 bg-slate-200" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-medium">PEAK SHOCK</span>
                  <span className="font-bold text-slate-900">{loading ? '...' : `M${stats.maxMag}`}</span>
                </div>
                <div className="w-[1px] h-4 bg-slate-200" />
                <div>
                  <span className="text-[9px] text-slate-400 block font-medium">AVG DEPTH</span>
                  <span className="font-bold text-slate-900">{loading ? '...' : `${stats.avgDepth} km`}</span>
                </div>
              </div>

              {/* Bookmarks Drawer Toggle Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-white/80 text-slate-900 transition-all font-mono tracking-wider text-xs font-semibold shadow-xs cursor-pointer"
              >
                <BookmarkIcon className="w-3.5 h-3.5 text-slate-700" />
                <span>SAVED</span>
                {bookmarks.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px] font-mono">
                    {bookmarks.length}
                  </span>
                )}
              </button>

              {/* Refresh Button */}
              <button
                onClick={loadData}
                title="Reload Telemetry"
                className="p-1.5 rounded-full bg-white/60 hover:bg-white border border-white/80 text-slate-700 hover:text-slate-950 transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </LiquidCard>
      </div>

      {/* 3. CENTERPIECE: 3D COBE GLOBE WITH 100% UNRESTRICTED VIEWPORT */}
      <main className="relative flex-1 flex items-center justify-center p-0 z-10 w-full h-full overflow-hidden">
        <div className="w-full max-w-[530px] sm:max-w-[560px] aspect-square flex items-center justify-center pt-8 pb-4">
          <CobeGlobe
            events={filteredEvents}
            isRotating={isRotating}
            resetSignal={resetSignal}
            targetFocus={targetFocus}
            onSelectEvent={setSelectedEvent}
          />
        </div>
      </main>

      {/* 5. AWWWARDS-STYLE REFINED LABORATORY DOCK */}
      <FloatingControllerDock
        searchQuery={searchQuery}
        onSearchChange={handleRegionChange}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        depthFilter={depthFilter}
        onDepthFilterChange={setDepthFilter}
        isRotating={isRotating}
        onToggleRotation={() => setIsRotating((prev) => !prev)}
        onResetView={() => {
          setTargetFocus(null);
          setResetSignal((prev) => prev + 1);
        }}
        onOpenFeed={() => setIsFeedOpen(true)}
        eventCount={filteredEvents.length}
      />

      {/* 6. EVENT DETAIL & BOOKMARK MODAL (LIQUID CARD) */}
      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isBookmarked={isEventBookmarked(selectedEvent)}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* 7. ACTIVE SEISMIC FEED DRAWER */}
      <EventsListDrawer
        isOpen={isFeedOpen}
        onClose={() => setIsFeedOpen(false)}
        events={filteredEvents}
        selectedRegion={searchQuery}
        onSelectEvent={(evt) => {
          setSelectedEvent(evt);
          setTargetFocus([evt.latitude, evt.longitude]);
        }}
        isBookmarked={isEventBookmarked}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* 8. SAVED BOOKMARKS SLIDING DRAWER */}
      <BookmarkDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        bookmarks={bookmarks}
        onRemoveBookmark={handleRemoveBookmark}
        onSelectEvent={(eventId) => {
          handleSelectEventById(eventId);
          setIsDrawerOpen(false);
        }}
      />
    </div>
  );
};
export default App;
