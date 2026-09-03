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

  // Filtered Events Pipeline
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // 1. Text Search Filter (Place matching)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchPlace = e.place?.toLowerCase().includes(q) ?? false;
        if (!matchPlace) return false;
      }

      // 2. Time Horizon Scrubber Filter
      if (timeFilter !== 'all') {
        const eventTime = new Date(e.occurred_at).getTime();
        const now = Date.now();
        const diffHours = (now - eventTime) / (1000 * 60 * 60);

        if (timeFilter === '24h' && diffHours > 24) return false;
        if (timeFilter === '7d' && diffHours > 24 * 7) return false;
      }

      // 3. Depth Range Filter
      if (depthFilter === 'shallow' && e.depth >= 30) return false;
      if (depthFilter === 'mid' && (e.depth < 30 || e.depth > 100)) return false;
      if (depthFilter === 'deep' && e.depth <= 100) return false;

      return true;
    });
  }, [events, searchQuery, timeFilter, depthFilter]);

  // Statistics Pipeline
  const stats = useMemo(() => {
    if (filteredEvents.length === 0) {
      return { count: 0, maxMag: '0.0', avgDepth: '0.0' };
    }
    const max = Math.max(...filteredEvents.map((e) => e.magnitude ?? 0));
    const sumDepth = filteredEvents.reduce((acc, curr) => acc + curr.depth, 0);
    return {
      count: filteredEvents.length,
      maxMag: max.toFixed(1),
      avgDepth: (sumDepth / filteredEvents.length).toFixed(1),
    };
  }, [filteredEvents]);

  // Region Preset Click Handler
  const handleRegionChange = (region: string) => {
    setSearchQuery(region);
    const lower = region.toLowerCase();
    if (lower === 'indonesia') {
      setTargetFocus([-0.7893, 113.9213]);
    } else if (lower === 'japan') {
      setTargetFocus([36.2048, 138.2529]);
    } else if (lower === 'alaska') {
      setTargetFocus([64.2008, -149.4937]);
    } else {
      setTargetFocus(null);
    }
  };

  const isEventBookmarked = useCallback(
    (event: SeismicEvent | null) => {
      if (!event) return false;
      return bookmarks.some((b) => b.event_id === event.id || b.event.usgs_id === event.usgs_id);
    },
    [bookmarks]
  );

  const handleToggleBookmark = useCallback(
    (event: SeismicEvent, note = '') => {
      const isAlready = bookmarks.some(
        (b) => b.event_id === event.id || b.event.usgs_id === event.usgs_id
      );
      let updated: Bookmark[];
      if (isAlready) {
        updated = removeLocalBookmark(event.id || event.usgs_id);
      } else {
        updated = saveLocalBookmark(event, note);
      }
      setBookmarks(updated);
    },
    [bookmarks]
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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-3 sm:px-4 pointer-events-none select-none">
        <LiquidCard className="rounded-2xl sm:rounded-full shadow-xl pointer-events-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 py-2.5 sm:px-5 sm:py-3">
            {/* LEFT: Logo + Observatory Branding */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
                <GlobeIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold tracking-widest uppercase font-mono text-slate-950 leading-none flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm">
                  <span className="whitespace-nowrap">SEISMIC OBSERVATORY</span>
                  <span className="hidden md:inline text-slate-300 font-normal">//</span>
                  <span className="hidden md:inline text-slate-600 font-display font-black tracking-tight text-[11px]">
                    GLOBAL TECTONICS
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300/80 font-mono tracking-wider font-semibold whitespace-nowrap">
                    LIVE 3D
                  </span>
                </h1>
              </div>
            </div>

            {/* CENTER: Telemetry Counters — visible on lg+ */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 rounded-full bg-white/50 border border-white/80 shadow-xs text-[11px] font-mono tracking-wider shrink-0">
              <div className="text-center">
                <span className="text-[9px] text-slate-400 block font-medium">TOTAL SHOCKS</span>
                <span className="font-bold text-slate-900">{loading ? '—' : stats.count}</span>
              </div>
              <div className="w-px h-5 bg-slate-200" />
              <div className="text-center">
                <span className="text-[9px] text-slate-400 block font-medium">PEAK SHOCK</span>
                <span className="font-bold text-slate-900">{loading ? '—' : `M${stats.maxMag}`}</span>
              </div>
              <div className="w-px h-5 bg-slate-200" />
              <div className="text-center">
                <span className="text-[9px] text-slate-400 block font-medium">AVG DEPTH</span>
                <span className="font-bold text-slate-900">{loading ? '—' : `${stats.avgDepth}km`}</span>
              </div>
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono text-xs">
              {/* Bookmarks Drawer Toggle Button */}
              <button
                id="bookmarks-btn"
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-white/80 text-slate-900 transition-all font-mono tracking-wider text-xs font-semibold shadow-xs cursor-pointer whitespace-nowrap"
              >
                <BookmarkIcon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span className="hidden sm:inline">SAVED</span>
                {bookmarks.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-mono leading-none">
                    {bookmarks.length}
                  </span>
                )}
              </button>

              {/* Refresh Button */}
              <button
                id="refresh-btn"
                onClick={loadData}
                title="Reload Telemetry"
                className="p-2 rounded-full bg-white/60 hover:bg-white border border-white/80 text-slate-700 hover:text-slate-950 transition-all shadow-xs cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </LiquidCard>
      </div>

      {/* 3. CENTERPIECE: 3D COBE GLOBE */}
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

      {/* 4. AWWWARDS-STYLE REFINED LABORATORY DOCK */}
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

      {/* 5. EVENT DETAIL & BOOKMARK MODAL (LIQUID CARD) */}
      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isBookmarked={isEventBookmarked(selectedEvent)}
        onToggleBookmark={handleToggleBookmark}
      />

      {/* 6. ACTIVE SEISMIC FEED DRAWER */}
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

      {/* 7. SAVED BOOKMARKS SLIDING DRAWER */}
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
