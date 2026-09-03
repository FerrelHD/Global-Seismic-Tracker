import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Lenis from 'lenis';
import { VectorGlobe, CameraCoordinates } from './components/ui/VectorGlobe';
import { ViewportTechnicalFrame } from './components/ui/ViewportTechnicalFrame';
import { HeroSection } from './components/hero/HeroSection';
import { LiquidGlassFilter, LiquidCard } from './components/ui/liquid-glass';
import { FloatingControllerDock } from './components/ui/FloatingControllerDock';
import { BookmarkDrawer } from './components/ui/BookmarkDrawer';
import { EventsListDrawer } from './components/ui/EventsListDrawer';
import { EventModal } from './components/ui/EventModal';
import { StoryChapterCard } from './components/story/StoryChapterCard';
import { StoryProgressRail } from './components/story/StoryProgressRail';
import { EpicenterMapCard } from './components/ui/EpicenterMapCard';
import { buildStoryChapters } from './utils/storyAnalytics';
import { SeismicEvent, Bookmark } from './types/seismic';
import {
  fetchSeismicEvents,
  fetchBMKGAutogempa,
  BMKGAlert,
  getLocalBookmarks,
  saveLocalBookmark,
  removeLocalBookmark,
} from './utils/supabase';
import {
  Globe as GlobeIcon,
  RefreshCw,
  Bookmark as BookmarkIcon,
  ArrowDown,
} from 'lucide-react';

export const App: React.FC = () => {
  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [bmkgAlert, setBmkgAlert] = useState<BMKGAlert | null>(null);
  const [loading, setLoading] = useState(true);

  // Bookmarks state & Drawer
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Events Feed Drawer
  const [isFeedOpen, setIsFeedOpen] = useState(false);

  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);

  // Scrollytelling & Navigation State
  const [activeChapterIndex, setActiveChapterIndex] = useState(-1); // -1 = Hero Section
  const [isObservatoryActive, setIsObservatoryActive] = useState(false);
  const [isHeroActive, setIsHeroActive] = useState(true);
  const [heroExitProgress, setHeroExitProgress] = useState(0);
  const [cameraCoords, setCameraCoords] = useState<CameraCoordinates>({ lat: 12.0, lon: 115.0 });

  // Spatial continuous scroll translation (in vw units: 0vw = hero center, 20vw = stories right, 0vw = observatory center)
  const [globeOffsetVw, setGlobeOffsetVw] = useState(0);
  const [globeScale, setGlobeScale] = useState(1.0);
  const [scrollRotation, setScrollRotation] = useState({ phi: 0, theta: 0 });

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

    fetchBMKGAutogempa().then((res) => {
      if (res) setBmkgAlert(res);
    });
  };

  useEffect(() => {
    loadData();
    setBookmarks(getLocalBookmarks());
  }, []);

  // Compute dynamic story chapters from active dataset
  const storyChapters = useMemo(() => buildStoryChapters(events), [events]);

  // Screen Width state for responsive translation
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3-Phase Continuous Scroll Interpolation Choreography
  const handleScrollUpdate = useCallback(() => {
    const heroEl = document.getElementById('hero-section');
    const obsEl = document.getElementById('observatory-section');
    if (!heroEl || !obsEl) return;

    const scrollY = window.scrollY;
    const heroHeight = heroEl.offsetHeight || window.innerHeight;
    const windowHeight = window.innerHeight;

    // Exit progress for Hero Section (0 at top, 1 when scrolled 380px down)
    const exitP = Math.max(0, Math.min(1, scrollY / 380));
    setHeroExitProgress(exitP);

    const isHero = scrollY < heroHeight * 0.75;
    setIsHeroActive(isHero);

    // Phase 1: Leaving Hero into Chapter 1 (0vw center -> 20vw right, kinetic 3D spin & tilt)
    if (scrollY < heroHeight) {
      const p = Math.max(0, Math.min(1, scrollY / (heroHeight * 0.85)));
      const smoothP = p * p * (3 - 2 * p); // smoothstep
      setGlobeOffsetVw(smoothP * 20);
      setGlobeScale(1.0 - smoothP * 0.05);
      // Kinetic 3D spin eastward and aerodynamic pitch tilt during the roll
      setScrollRotation({
        phi: -smoothP * (Math.PI * 1.35),
        theta: Math.sin(smoothP * Math.PI) * 0.16,
      });
      setIsObservatoryActive(false);
      return;
    }

    // Phase 3: Leaving Chapter 4 into Observatory (20vw -> 0vw center, scaling comfortably up to 1.04)
    const obsRect = obsEl.getBoundingClientRect();
    const distanceToView = obsRect.top - windowHeight * 0.15;
    const travelRange = windowHeight * 0.85;

    if (distanceToView < travelRange) {
      const rawProgress = 1 - Math.max(0, Math.min(travelRange, distanceToView)) / travelRange;
      const smoothP = rawProgress * rawProgress * (3 - 2 * rawProgress);
      setGlobeOffsetVw((1 - smoothP) * 20);
      setGlobeScale(0.95 + smoothP * 0.09);
      setScrollRotation({
        phi: -(Math.PI * 1.35) - smoothP * (Math.PI * 0.75),
        theta: 0,
      });

      if (rawProgress >= 0.88) {
        setIsObservatoryActive(true);
      } else {
        setIsObservatoryActive(false);
      }
      return;
    }

    // Phase 2: In Story Chapters 1 - 4 (Comfortably matched alongside chapter cards on the left)
    setGlobeOffsetVw(20);
    setGlobeScale(0.95);
    setScrollRotation({
      phi: -Math.PI * 1.35,
      theta: 0,
    });
    setIsObservatoryActive(false);
  }, []);

  // Initialize Lenis smooth momentum scroll engine
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', handleScrollUpdate);
    window.addEventListener('scroll', handleScrollUpdate, { passive: true });

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
      window.removeEventListener('scroll', handleScrollUpdate);
    };
  }, [handleScrollUpdate]);

  // IntersectionObserver for tracking story chapters & triggering camera fly-to
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const indexAttr = entry.target.getAttribute('data-chapter-index');
            if (indexAttr !== null) {
              const idx = parseInt(indexAttr, 10);
              setActiveChapterIndex(idx);

              // Fly globe camera to chapter epicenter
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

  // Fast Travel Navigation Actions
  const scrollToHero = () => {
    lenisRef.current?.scrollTo('#hero-section', { duration: 1.2 });
  };

  const scrollToStories = () => {
    lenisRef.current?.scrollTo('#chapter-section-0', { duration: 1.2 });
  };

  const scrollToObservatory = () => {
    lenisRef.current?.scrollTo('#observatory-section', { duration: 1.4 });
  };

  const scrollToChapter = (index: number) => {
    lenisRef.current?.scrollTo(`#chapter-section-${index}`, { duration: 1.1 });
  };

// Geographic Coordinate Bounding Boxes for Indonesian Archipelago Sectors
const REGION_BOUNDS: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  sumatra: { minLat: -6.0, maxLat: 6.0, minLon: 95.0, maxLon: 106.0 },
  java: { minLat: -11.0, maxLat: -5.5, minLon: 105.0, maxLon: 116.0 },
  sulawesi: { minLat: -6.0, maxLat: 2.5, minLon: 118.5, maxLon: 125.5 },
  banda: { minLat: -11.0, maxLat: 2.0, minLon: 119.0, maxLon: 134.0 },
  papua: { minLat: -10.0, maxLat: 1.0, minLon: 130.0, maxLon: 141.0 },
};

  // Filtered Events Pipeline
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const bounds = REGION_BOUNDS[q];
        if (bounds) {
          // Accurate geographic coordinate matching
          const inBounds =
            e.latitude >= bounds.minLat &&
            e.latitude <= bounds.maxLat &&
            e.longitude >= bounds.minLon &&
            e.longitude <= bounds.maxLon;
          if (!inBounds) return false;
        } else {
          // Freeform text search fallback
          const matchPlace = e.place?.toLowerCase().includes(q) ?? false;
          if (!matchPlace) return false;
        }
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

  // Region Preset Click Handler (Indonesian Archipelago Sectors)
  const handleRegionChange = (region: string) => {
    setSearchQuery(region);
    const lower = region.toLowerCase();
    if (lower === '' || lower === 'indonesia' || lower === 'all') {
      setTargetFocus([-0.78, 118.0]);
    } else if (lower === 'sumatra') {
      setTargetFocus([-0.5897, 101.3431]);
    } else if (lower === 'java') {
      setTargetFocus([-7.6145, 110.7122]);
    } else if (lower === 'sulawesi') {
      setTargetFocus([-1.43, 121.4456]);
    } else if (lower === 'banda') {
      setTargetFocus([-5.5, 129.5]);
    } else if (lower === 'papua') {
      setTargetFocus([-3.8, 138.5]);
    } else {
      setTargetFocus([-0.78, 118.0]);
    }
  };

  // Scientific English formatting for BMKG Ground Zero telemetry
  const formattedBMKG = useMemo(() => {
    if (!bmkgAlert) return null;
    let loc = bmkgAlert.wilayah || 'Indonesia Archipelago';
    loc = loc
      .replace(/^Pusat gempa berada di\s*laut\s*/i, '')
      .replace(/^Pusat gempa berada di\s*darat\s*/i, '')
      .replace(/\butara\b/gi, 'N of')
      .replace(/\bselatan\b/gi, 'S of')
      .replace(/\bbarat\s*daya\b/gi, 'SW of')
      .replace(/\bbarat\s*laut\b/gi, 'NW of')
      .replace(/\btenggara\b/gi, 'SE of')
      .replace(/\btimur\s*laut\b/gi, 'NE of')
      .replace(/\bbarat\b/gi, 'W of')
      .replace(/\btimur\b/gi, 'E of')
      .replace(/(\d+)\s*km\s*/gi, '$1 KM ')
      .replace(/\bkec\.\s*/gi, '')
      .replace(/\bkab\.\s*/gi, '')
      .replace(/\s*-\s*/g, ', ')
      .trim();

    let pot = 'NO TSUNAMI THREAT';
    const pLower = (bmkgAlert.potensi || '').toLowerCase();
    if (pLower.includes('tidak berpotensi tsunami')) {
      pot = 'NO TSUNAMI THREAT';
    } else if (pLower.includes('dirasakan')) {
      pot = 'SHAKING FELT · NO TSUNAMI';
    } else if (pLower.includes('berpotensi tsunami')) {
      pot = 'TSUNAMI WARNING ACTIVE';
    }

    const dateStr = bmkgAlert.tanggal || '';
    const timeStr = bmkgAlert.jam || '';
    const fullTime = dateStr && timeStr ? `${dateStr} · ${timeStr} (GMT+7)` : dateStr || timeStr || 'RECENT RUPTURE';
    const shortTime = dateStr && timeStr ? `${dateStr.slice(0, 6).trim()}, ${timeStr.slice(0, 5)} WIB` : dateStr || 'RECENT';

    return {
      location: loc.toUpperCase(),
      depth: `${bmkgAlert.kedalaman} DEPTH`,
      potensi: pot,
      time: fullTime,
      shortTime: shortTime,
    };
  }, [bmkgAlert]);

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

  const effectiveTranslateX = isDesktop ? `${globeOffsetVw}vw` : '0px';

  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 selection:bg-slate-900 selection:text-white font-sans">
      {/* 1. Global Liquid Glass SVG Refraction Filter */}
      <LiquidGlassFilter />

      {/* 2. Global Viewport Technical Blueprint Frame (Corner Crop Marks & Live Telemetry) */}
      <ViewportTechnicalFrame coordinates={cameraCoords} visible={true} />

      {/* 3. FIXED STICKY 3D VECTOR GLOBE LAYER (RESPONSIVE EDITORIAL PRESENCE) */}
      <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center pt-16 sm:pt-20 pb-20 sm:pb-24 px-4 overflow-hidden">
        <div
          style={{
            transform: `translate3d(${effectiveTranslateX}, 0px, 0) scale(${globeScale})`,
            willChange: 'transform',
          }}
          className="relative w-[min(82vw,calc(100dvh-170px),340px)] sm:w-[min(72vw,calc(100dvh-170px),460px)] md:w-[min(65vw,calc(100dvh-160px),540px)] lg:w-[min(54vw,calc(100dvh-150px),640px)] xl:w-[min(52vw,calc(100dvh-140px),720px)] 2xl:w-[min(50vw,calc(100dvh-140px),780px)] aspect-square flex items-center justify-center pointer-events-auto transition-transform duration-75 ease-out"
        >
          {/* No Art Architectural Vector Wireframe 3D Globe */}
          <VectorGlobe
            events={filteredEvents}
            isRotating={isRotating}
            resetSignal={resetSignal}
            targetFocus={targetFocus}
            onSelectEvent={isObservatoryActive ? setSelectedEvent : undefined}
            interactive={true}
            onCameraChange={setCameraCoords}
            scrollPhi={scrollRotation.phi}
            scrollTheta={scrollRotation.theta}
          />
        </div>
      </div>

      {/* 3. AWWWARDS FIXED HEADER NAVBAR */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-3 sm:px-4 pointer-events-none select-none">
        <LiquidCard className="rounded-2xl sm:rounded-full shadow-xl pointer-events-auto">
          <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 py-2.5 sm:px-5 sm:py-3">
            {/* Logo + Branding: Sharp, Crisp Typography */}
            <div
              onClick={scrollToHero}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0 cursor-pointer"
            >
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

            {/* Header Right Actions: Clean & Minimalist */}
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

                  {/* Return to Hero / Tour */}
                  <button
                    onClick={scrollToHero}
                    title="Return to Hero"
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
        activeChapterIndex={activeChapterIndex >= 0 ? activeChapterIndex : 0}
        onSelectChapter={scrollToChapter}
        visible={!isObservatoryActive && !isHeroActive && heroExitProgress > 0.5 && activeChapterIndex >= 0}
      />

      {/* 5. HERO SECTION (STAGE 0) */}
      <HeroSection
        onExploreClick={scrollToStories}
        onDirectClick={scrollToObservatory}
        exitProgress={heroExitProgress}
        totalEvents={events.length || 2200}
      />

      {/* 6. SCROLLING STORY SECTIONS LAYER */}
      <div className="relative z-10 w-full pointer-events-none">
        {storyChapters.map((chapter, index) => {
          const isFinal = index === storyChapters.length - 1;

          if (isFinal) {
            // Chapter 5: Full Interactive Observatory Stage
            return (
              <section
                key={chapter.id}
                id="observatory-section"
                data-chapter-index={index}
                className="story-chapter-section min-h-screen w-full flex flex-col justify-between pt-24 pb-8 px-4 sm:px-8 lg:px-12 xl:px-16 pointer-events-none"
              >
                {/* Top Row: Left-Aligned Epicenter Card (Never blocks the globe!) + Right Status Pill */}
                <div className="w-full flex flex-col sm:flex-row items-center sm:items-start justify-between gap-2 sm:gap-4 pointer-events-none pt-1">
                  {/* Left Side: Interactive 3D Epicenter Survey Card */}
                  <div className="pointer-events-auto">
                    {bmkgAlert && formattedBMKG && (
                      <EpicenterMapCard
                        location={formattedBMKG.location}
                        coordinates={bmkgAlert.coordinates}
                        magnitude={bmkgAlert.magnitude}
                        depth={formattedBMKG.depth}
                        time={formattedBMKG.time}
                        shortTime={formattedBMKG.shortTime}
                        potensi={formattedBMKG.potensi}
                        onFocusEpicenter={() => {
                          const coordsMatch = bmkgAlert.coordinates.match(/(-?\d+\.?\d*)[^\d]+(-?\d+\.?\d*)/);
                          if (coordsMatch) {
                            const lat = parseFloat(coordsMatch[1]) * (bmkgAlert.coordinates.includes('LS') ? -1 : 1);
                            const lon = parseFloat(coordsMatch[2]);
                            setTargetFocus([lat, lon]);
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Right Side: Observatory Live Telemetry Pill */}
                  <div className="pointer-events-auto self-end sm:self-auto">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-slate-200/80 shadow-xs text-slate-600 font-mono text-[10px] tracking-widest uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>NUSANTARA REAL-TIME TELEMETRY</span>
                    </div>
                  </div>
                </div>

                {/* Center empty space for globe exploration (pointer-events-none allows direct click on 3D globe) */}
                <div className="flex-1 w-full pointer-events-none" />

                {/* Bottom Floating Controller Dock */}
                <div className="w-full pointer-events-auto">
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
                      setTargetFocus([-0.78, 118.0]);
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
                  onFocusSector={(coords) => setTargetFocus(coords)}
                />
              </div>
            </section>
          );
        })}
      </div>

      {/* 7. EVENT DETAIL & BOOKMARK MODAL */}
      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isBookmarked={isEventBookmarked(selectedEvent)}
        onToggleBookmark={handleToggleBookmark}
        onFocusGlobe={(evt) => setTargetFocus([evt.latitude, evt.longitude])}
      />

      {/* 8. ACTIVE SEISMIC FEED DRAWER */}
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

      {/* 9. SAVED BOOKMARKS SLIDING DRAWER */}
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
