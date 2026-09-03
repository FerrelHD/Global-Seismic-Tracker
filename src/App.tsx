import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Lenis from 'lenis';
import { CobeGlobe } from './components/ui/CobeGlobe';
import { LiquidGlassFilter, LiquidCard } from './components/ui/liquid-glass';
import { FloatingControllerDock } from './components/ui/FloatingControllerDock';
import { BookmarkDrawer } from './components/ui/BookmarkDrawer';
import { EventsListDrawer } from './components/ui/EventsListDrawer';
import { EventModal } from './components/ui/EventModal';
import { StoryChapterCard } from './components/story/StoryChapterCard';
import { StoryProgressRail } from './components/story/StoryProgressRail';
import { buildStoryChapters } from './utils/storyAnalytics';
import { SeismicEvent, Bookmark } from './types/seismic';
import {
  fetchSeismicEvents,
  getLocalBookmarks,
  saveLocalBookmark,
  removeLocalBookmark,
} from './utils/supabase';
import {
  Globe as GlobeIcon,
  RefreshCw,
  Bookmark as BookmarkIcon,
  ArrowDown,
  ChevronDown,
} from 'lucide-react';

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

  // Scrollytelling & Navigation State
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isObservatoryActive, setIsObservatoryActive] = useState(false);
  const [globeProgress, setGlobeProgress] = useState(0); // 0 = at right (story mode), 1 = centered (observatory)
  const lenisRef = useRef<Lenis | null>(null);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d'>('all');
  const [depthFilter, setDepthFilter] = useState<'all' | 'shallow' | 'mid' | 'deep'>('all');
  const [isRotating, setIsRotating] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [targetFocus, setTargetFocus] = useState<[number, number] | null>(null);

  // Load live data from Supabase / USGS
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

  // Compute dynamic story chapters from active dataset
  const storyChapters = useMemo(() => buildStoryChapters(events), [events]);

  // Continuous Scroll-based Globe Centering Calculation (smoothly glides without snapping)
  const updateGlobeTransition = useCallback(() => {
    const obsEl = document.getElementById('observatory-section');
    if (!obsEl) return;

    const rect = obsEl.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // As user scrolls from chapter 4 into chapter 5, calculate continuous 0 -> 1 progress
    const distanceToView = rect.top - windowHeight * 0.15;
    const travelRange = windowHeight * 0.85;
    const rawProgress = 1 - Math.max(0, Math.min(travelRange, distanceToView)) / travelRange;

    // Smoothstep interpolation
    const smooth = rawProgress * rawProgress * (3 - 2 * rawProgress);
    setGlobeProgress(smooth);

    if (rawProgress >= 0.9) {
      setIsObservatoryActive(true);
    } else {
      setIsObservatoryActive(false);
    }
  }, []);

  // Initialize Lenis smooth momentum scroll engine
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Hook scroll listener to continuously update globe centering without discrete jumps
    lenis.on('scroll', updateGlobeTransition);
    window.addEventListener('scroll', updateGlobeTransition, { passive: true });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
      window.removeEventListener('scroll', updateGlobeTransition);
    };
  }, [updateGlobeTransition]);

  // IntersectionObserver for tracking which story chapter is active & triggering camera fly-to
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexAttr = entry.target.getAttribute('data-chapter-index');
            if (indexAttr !== null) {
              const idx = parseInt(indexAttr, 10);
              setActiveChapterIndex(idx);

              // Fly globe camera to the chapter's epicenter
              if (storyChapters[idx] && idx < storyChapters.length - 1) {
                setTargetFocus(storyChapters[idx].coordinates);
              }
            }
          }
        });
      },
      {
        threshold: 0.45,
        rootMargin: '-10% 0px -10% 0px',
      }
    );

    const chapterElements = document.querySelectorAll('.story-chapter-section');
    chapterElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [storyChapters]);

  // Fast Travel Jump Actions
  const scrollToObservatory = () => {
    lenisRef.current?.scrollTo('#observatory-section', { duration: 1.4 });
  };

  const scrollToChapter = (index: number) => {
    lenisRef.current?.scrollTo(`#chapter-section-${index}`, { duration: 1.1 });
  };

  // Filtered Events Pipeline
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchPlace = e.place?.toLowerCase().includes(q) ?? false;
        if (!matchPlace) return false;
      }

      if (timeFilter !== 'all') {
        const eventTime = new Date(e.occurred_at).getTime();
        const now = Date.now();
        const diffHours = (now - eventTime) / (1000 * 60 * 60);

        if (timeFilter === '24h' && diffHours > 24) return false;
        if (timeFilter === '7d' && diffHours > 24 * 7) return false;
      }

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

  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute smooth continuous translation offset
  // On desktop: 24vw when globeProgress = 0, glides smoothly to 0vw when globeProgress = 1
  const translateX = isDesktop ? `${(1 - globeProgress) * 24}vw` : '0px';
  const currentScale = isDesktop ? 1 + globeProgress * 0.06 : 1;

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 hud-grid-bg selection:bg-slate-900 selection:text-white font-sans">
      {/* 1. Global Liquid Glass SVG Refraction Filter */}
      <LiquidGlassFilter />

      {/* 2. FIXED STICKY 3D COBE GLOBE LAYER — CONTINUOUS SCROLL INTERPOLATION WITHOUT SNAPPING */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div
          style={{
            transform: `translate3d(${translateX}, 0, 0) scale(${currentScale})`,
            willChange: 'transform',
          }}
          className="w-full max-w-[530px] sm:max-w-[560px] aspect-square flex items-center justify-center transition-transform duration-100 ease-out"
        >
          <CobeGlobe
            events={filteredEvents}
            isRotating={isRotating}
            resetSignal={resetSignal}
            targetFocus={targetFocus}
            onSelectEvent={isObservatoryActive ? setSelectedEvent : undefined}
            interactive={isObservatoryActive}
          />
        </div>
      </div>

      {/* 3. AWWWARDS-STYLE FIXED HEADER NAVBAR — CLEAN & MINIMALIST */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-3 sm:px-4 pointer-events-none select-none">
        <LiquidCard className="rounded-2xl sm:rounded-full shadow-xl pointer-events-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 py-2.5 sm:px-5 sm:py-3">
            {/* Logo + Branding: Sharp, Crisp, Non-blurry Typography */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
                <GlobeIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold tracking-widest uppercase font-mono text-slate-950 leading-none flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm">
                  <span className="whitespace-nowrap">SEISMIC OBSERVATORY</span>
                  <span className="hidden md:inline text-slate-300 font-normal">//</span>
                  <span className="hidden md:inline text-slate-400 font-mono font-medium text-xs">
                    GLOBAL TECTONICS
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono tracking-wider font-semibold whitespace-nowrap">
                    LIVE 3D
                  </span>
                </h1>
              </div>
            </div>

            {/* Header Right Actions: Clean, Minimalist Button without AI-slop sparkles */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 font-mono text-xs">
              {!isObservatoryActive ? (
                <button
                  onClick={scrollToObservatory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 border border-slate-200/80 text-xs font-mono font-medium tracking-wider transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>OBSERVATORY</span>
                  <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                </button>
              ) : (
                <>
                  <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-full bg-white/50 border border-white/80 shadow-xs text-[11px] font-mono tracking-wider">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-medium">TOTAL</span>
                      <span className="font-bold text-slate-900">{loading ? '—' : stats.count}</span>
                    </div>
                    <div className="w-px h-4 bg-slate-200" />
                    <div>
                      <span className="text-[9px] text-slate-400 block font-medium">PEAK</span>
                      <span className="font-bold text-slate-900">{loading ? '—' : `M${stats.maxMag}`}</span>
                    </div>
                  </div>

                  {/* Return to story tour button */}
                  <button
                    onClick={() => scrollToChapter(0)}
                    title="Return to Story Tour"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/60 hover:bg-white border border-white/80 text-slate-700 hover:text-slate-950 transition-all text-[11px] font-semibold shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <span>TOUR</span>
                  </button>

                  {/* Bookmarks */}
                  <button
                    id="bookmarks-btn"
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-white/80 text-slate-900 transition-all text-xs font-semibold shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    <BookmarkIcon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                    <span className="hidden sm:inline">SAVED</span>
                    {bookmarks.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[9px] font-mono leading-none">
                        {bookmarks.length}
                      </span>
                    )}
                  </button>

                  {/* Refresh */}
                  <button
                    id="refresh-btn"
                    onClick={loadData}
                    title="Reload Telemetry"
                    className="p-2 rounded-full bg-white/60 hover:bg-white border border-white/80 text-slate-700 hover:text-slate-950 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </>
              )}
            </div>
          </div>
        </LiquidCard>
      </header>

      {/* 4. STORY PROGRESS RAIL (FIXED RIGHT-HAND STEPPER) */}
      <StoryProgressRail
        chapters={storyChapters}
        activeChapterIndex={activeChapterIndex}
        onSelectChapter={scrollToChapter}
        visible={!isObservatoryActive}
      />

      {/* 5. SCROLLING STORY SECTIONS LAYER */}
      <div className="relative z-10 w-full pointer-events-none">
        {storyChapters.map((chapter, index) => {
          const isFinal = index === storyChapters.length - 1;

          if (isFinal) {
            // Chapter 5: The Full Observatory Stage
            return (
              <section
                key={chapter.id}
                id="observatory-section"
                data-chapter-index={index}
                className="story-chapter-section min-h-screen w-full flex flex-col justify-between pt-24 pb-8 px-4 pointer-events-auto"
              >
                {/* Clean minimalist status indicator */}
                <div className="w-full flex items-center justify-center pt-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs text-slate-600 font-mono text-[10px] tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>INTERACTIVE LABORATORY MODE</span>
                  </div>
                </div>

                {/* Center empty space for globe exploration */}
                <div className="flex-1 w-full" />

                {/* Bottom Floating Controller Dock */}
                <div className="w-full">
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
                    visible={isObservatoryActive}
                  />
                </div>
              </section>
            );
          }

          // Chapters 1 - 4: Guided Storytelling Stages
          return (
            <section
              key={chapter.id}
              id={`chapter-section-${index}`}
              data-chapter-index={index}
              className="story-chapter-section min-h-screen w-full flex items-center px-4 sm:px-8 lg:px-16 xl:px-24 py-28 pointer-events-none"
            >
              <div className="w-full max-w-lg pointer-events-auto">
                <StoryChapterCard
                  chapter={chapter}
                  isActive={activeChapterIndex === index}
                  onExploreClick={scrollToObservatory}
                />

                {/* Minimalist Scroll Prompt on Chapter 1 */}
                {index === 0 && (
                  <div className="mt-6 flex items-center gap-2 text-slate-400 font-mono text-[11px] tracking-wider select-none">
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                    <span>SCROLL TO EXPLORE PLANETARY CRUST</span>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* 6. EVENT DETAIL & BOOKMARK MODAL */}
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
