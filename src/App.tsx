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
import { TimeLapseScrubber } from './components/ui/TimeLapseScrubber';
import { BMKGShakemapModal } from './components/ui/BMKGShakemapModal';
import { VirtualSeismogram } from './components/ui/VirtualSeismogram';
import { SocialInfographicModal } from './components/ui/SocialInfographicModal';
import { buildStoryChapters } from './utils/storyAnalytics';
import { SeismicEvent, Bookmark, WildfireHotspot, HazardMode } from './types/seismic';
import {
  fetchSeismicEvents,
  fetchWildfireHotspots,
  fetchBMKGAutogempa,
  BMKGAlert,
  getLocalBookmarks,
  saveLocalBookmark,
  removeLocalBookmark,
} from './utils/supabase';
import { SeismicAlertToast, AlertEventData } from './components/ui/SeismicAlertToast';
import { playSeismicAlertPing } from './utils/audioAlert';
import {
  playSeismicSound,
  toggleAudioMute,
  getAudioMuteState,
} from './utils/seismicAudio';
import { useLanguage } from './utils/i18n';
import {
  Globe as GlobeIcon,
  RefreshCw,
  Bookmark as BookmarkIcon,
  ArrowDown,
  ArrowUp,
  Bell,
} from 'lucide-react';

export const App: React.FC = () => {
  const { lang, t, toggleLanguage } = useLanguage();
  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [bmkgAlert, setBmkgAlert] = useState<BMKGAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCurtainComplete, setIsCurtainComplete] = useState(false);

  const handleCurtainComplete = useCallback(() => {
    setIsCurtainComplete(true);
  }, []);

  // Realtime Seismic Alert Notification State
  const [activeAlert, setActiveAlert] = useState<AlertEventData | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const knownEventIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Bookmarks state & Drawer
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Events Feed Drawer
  const [isFeedOpen, setIsFeedOpen] = useState(false);

  // Selected event and hotspot modals
  const [selectedEvent, setSelectedEvent] = useState<SeismicEvent | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<WildfireHotspot | null>(null);

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
  const [colorMode, setColorMode] = useState<'magnitude' | 'depth'>('magnitude');
  const [isRotating, setIsRotating] = useState(true);
  const [resetSignal, setResetSignal] = useState(0);
  const [targetFocus, setTargetFocus] = useState<[number, number] | null>(null);

  // Time-Lapse 7-Day Seismic Replay State
  const [isTimeLapseOpen, setIsTimeLapseOpen] = useState(false);
  const [isTimeLapsePlaying, setIsTimeLapsePlaying] = useState(false);
  const [timelapseSpeed, setTimelapseSpeed] = useState(5);
  const [timelapseTime, setTimelapseTime] = useState(Date.now());

  // BMKG Official Shakemap Modal State
  const [isShakemapModalOpen, setIsShakemapModalOpen] = useState(false);

  // Virtual Seismogram Oscilloscope Monitor State
  const [isSeismogramOpen, setIsSeismogramOpen] = useState(false);

  // Disaster Infographic Social Card State
  const [isInfographicOpen, setIsInfographicOpen] = useState(false);
  const [infographicEvent, setInfographicEvent] = useState<SeismicEvent | null>(null);

  // Dual-Hazard Telemetry State (NASA FIRMS Hotspots & Hazard Mode)
  const [hotspots, setHotspots] = useState<WildfireHotspot[]>([]);
  const [hazardMode, setHazardMode] = useState<HazardMode>('dual');
  const [observatoryScrollZoom, setObservatoryScrollZoom] = useState<number>(1.0);
  const [observatoryProgress, setObservatoryProgress] = useState<number>(0);
  const [obsTopOffset, setObsTopOffset] = useState<number>(0);

  // Magnitude Quick Filter: 'all' | 'felt' (>=4.0) | 'significant' (>=5.5)
  const [magCategory, setMagCategory] = useState<'all' | 'felt' | 'significant'>('all');

  // Ensure dark class and theme storage are cleaned up
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.classList.remove('dark');
      localStorage.removeItem('gst_theme');
    }
  }, []);

  // Web Audio Synthesizer Mute State
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => getAudioMuteState());

  const handleToggleAudio = useCallback(() => {
    const nextState = toggleAudioMute();
    setIsAudioMuted(nextState);
  }, []);

  // Audio Synthesizer Acoustic Feedback on Event Focus
  useEffect(() => {
    if (selectedEvent && selectedEvent.magnitude != null) {
      playSeismicSound(selectedEvent.magnitude, selectedEvent.depth);
    }
  }, [selectedEvent]);

  // Load live data from Supabase / USGS / NASA FIRMS
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

    fetchWildfireHotspots().then((data) => {
      setHotspots(data);
    });
  };

  useEffect(() => {
    loadData();
    setBookmarks(getLocalBookmarks());
  }, []);

  // Compute dynamic story chapters from active dataset and active language
  const storyChapters = useMemo(() => buildStoryChapters(events, lang), [events, lang]);

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

  const activeChapterIndexRef = useRef(-1);

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

    const isHero = scrollY < heroHeight * 0.55;
    setIsHeroActive(isHero);
    if (isHero) {
      if (activeChapterIndexRef.current !== -1) {
        activeChapterIndexRef.current = -1;
        setActiveChapterIndex(-1);
      }
    }

    // Phase 1: Leaving Hero into Chapter 1 (0vw center -> 16vw right, zooming in smoothly)
    if (scrollY < heroHeight) {
      const p = Math.max(0, Math.min(1, scrollY / (heroHeight * 0.85)));
      // Ken Perlin's smootherstep for zero acceleration shock at endpoints
      const smoothP = p * p * p * (p * (p * 6 - 15) + 10);
      setGlobeOffsetVw(parseFloat((smoothP * 16).toFixed(2)));
      setGlobeScale(parseFloat((1.0 + smoothP * 0.12).toFixed(3)));
      setScrollRotation({
        phi: -smoothP * (Math.PI * 1.35),
        theta: 0,
      });
      setIsObservatoryActive(false);

      if (!isHero && activeChapterIndexRef.current !== 0) {
        activeChapterIndexRef.current = 0;
        setActiveChapterIndex(0);
        if (storyChapters[0]) {
          setTargetFocus(storyChapters[0].coordinates);
        }
      }
      return;
    }

    // Phase 2 & 3: Story Chapters & Observatory with Continuous Kinetic Scroll Interpolation
    // Stable analytical positioning without forced synchronous DOM layout reflows (Zero Layout Thrashing)
    const sections: { idx: number; centerY: number; offset: number }[] = [];
    const totalChapters = storyChapters.length;
    for (let idx = 0; idx < totalChapters; idx++) {
      const isObs = idx === totalChapters - 1;
      const sectionTop = heroHeight + idx * windowHeight;
      const centerY = sectionTop + windowHeight * 0.5;
      // Even: +16vw (Left card, map right), Odd: -16vw (Right card, map left), Observatory: 0vw
      const targetOff = isObs ? 0 : (idx % 2 === 1 ? -16 : 16);
      sections.push({ idx, centerY, offset: targetOff });
    }

    const viewCenterY = window.scrollY + windowHeight * 0.5;

    if (sections.length > 0) {
      if (viewCenterY <= sections[0].centerY) {
        setGlobeOffsetVw(sections[0].offset);
        if (activeChapterIndexRef.current !== sections[0].idx) {
          activeChapterIndexRef.current = sections[0].idx;
          setActiveChapterIndex(sections[0].idx);
          if (storyChapters[0]) setTargetFocus(storyChapters[0].coordinates);
        }
      } else if (viewCenterY >= sections[sections.length - 1].centerY) {
        setGlobeOffsetVw(sections[sections.length - 1].offset);
        const lastIdx = sections[sections.length - 1].idx;
        if (activeChapterIndexRef.current !== lastIdx) {
          activeChapterIndexRef.current = lastIdx;
          setActiveChapterIndex(lastIdx);
        }
      } else {
        for (let k = 0; k < sections.length - 1; k++) {
          if (viewCenterY >= sections[k].centerY && viewCenterY <= sections[k + 1].centerY) {
            const span = Math.max(1, sections[k + 1].centerY - sections[k].centerY);
            const rawP = Math.max(0, Math.min(1, (viewCenterY - sections[k].centerY) / span));
            // Ken Perlin smootherstep for velvety organic transition
            const smoothP = rawP * rawP * rawP * (rawP * (rawP * 6 - 15) + 10);
            const interpolatedOffset = sections[k].offset + (sections[k + 1].offset - sections[k].offset) * smoothP;
            setGlobeOffsetVw(parseFloat(interpolatedOffset.toFixed(2)));

            const activeIdx = rawP >= 0.5 ? sections[k + 1].idx : sections[k].idx;
            if (activeIdx !== activeChapterIndexRef.current) {
              activeChapterIndexRef.current = activeIdx;
              setActiveChapterIndex(activeIdx);
              if (storyChapters[activeIdx] && activeIdx < storyChapters.length - 1) {
                setTargetFocus(storyChapters[activeIdx].coordinates);
              }
            }
            break;
          }
        }
      }
    }

    // Observatory Section Continuous Progress & Scroll Zoom Logic
    const obsTop = heroHeight + (totalChapters - 1) * windowHeight - scrollY;
    const obsHeight = 2.2 * windowHeight;
    let currentObsP = 0;
    let currentTopOffset = 0;

    if (obsTop <= 0) {
      // Inside observatory section: full HUD and scroll zoom
      currentObsP = 1.0;
      currentTopOffset = 0;
      setIsObservatoryActive(true);

      const totalTravel = Math.max(1, obsHeight - windowHeight);
      const scrolledInside = Math.max(0, Math.min(totalTravel, -obsTop));
      const progressInObs = scrolledInside / totalTravel;
      const currentZoom = 1.0 + progressInObs * 2.2;
      setObservatoryScrollZoom(parseFloat(currentZoom.toFixed(2)));
    } else {
      // Scrolling up away from observatory section towards Chapter 4
      currentTopOffset = obsTop;
      const fadeDistance = 320; // seamless natural fade distance in pixels
      const exitProgress = Math.max(0, Math.min(1, obsTop / fadeDistance));
      const p = 1 - exitProgress;
      const smoothObsP = p * p * p * (p * (p * 6 - 15) + 10); // smootherstep
      currentObsP = parseFloat(smoothObsP.toFixed(3));

      setIsObservatoryActive(currentObsP > 0.001);
      setObservatoryScrollZoom(1.0);
    }

    setObservatoryProgress(currentObsP);
    setObsTopOffset(currentTopOffset);

    setGlobeScale(1.12);
    setScrollRotation({
      phi: -Math.PI * 1.35,
      theta: 0,
    });
  }, [storyChapters]);

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

  // Lock background scroll when any modal or drawer is open
  const isAnyModalOpen = Boolean(
    selectedEvent ||
    isDrawerOpen ||
    isFeedOpen ||
    isShakemapModalOpen ||
    isInfographicOpen ||
    isSeismogramOpen
  );

  useEffect(() => {
    if (isAnyModalOpen) {
      lenisRef.current?.stop();
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      lenisRef.current?.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      lenisRef.current?.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  // Fast Travel Navigation Actions
  const scrollToHero = () => {
    setActiveChapterIndex(-1);
    activeChapterIndexRef.current = -1;
    lenisRef.current?.scrollTo('#hero-section', { duration: 1.2 });
  };

  const scrollToStories = () => {
    setActiveChapterIndex(0);
    activeChapterIndexRef.current = 0;
    if (storyChapters[0]) {
      setGlobeOffsetVw(18);
      setGlobeScale(1.12);
      setTargetFocus(storyChapters[0].coordinates);
    }
    lenisRef.current?.scrollTo('#chapter-section-0', { duration: 1.2 });
  };

  const scrollToObservatory = () => {
    lenisRef.current?.scrollTo('#observatory-section', { duration: 1.4 });
  };

  const scrollToChapter = (index: number) => {
    setActiveChapterIndex(index);
    activeChapterIndexRef.current = index;
    if (storyChapters[index] && index < storyChapters.length - 1) {
      setGlobeOffsetVw(index % 2 === 1 ? -18 : 18);
      setGlobeScale(1.12);
      setTargetFocus(storyChapters[index].coordinates);
    }
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

      if (magCategory === 'felt' && (e.magnitude ?? 0) < 4.0) return false;
      if (magCategory === 'significant' && (e.magnitude ?? 0) < 5.5) return false;

      return true;
    });
  }, [events, searchQuery, timeFilter, depthFilter, magCategory]);

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

  // Determine time-lapse boundaries based on filteredEvents
  const { timelapseStartTime, timelapseEndTime } = useMemo(() => {
    if (filteredEvents.length === 0) {
      const now = Date.now();
      return { timelapseStartTime: now - 7 * 24 * 3600 * 1000, timelapseEndTime: now };
    }
    let minTime = Infinity;
    let maxTime = -Infinity;
    for (const e of filteredEvents) {
      const t = new Date(e.occurred_at).getTime();
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }
    return {
      timelapseStartTime: minTime,
      timelapseEndTime: Math.max(maxTime, Date.now()),
    };
  }, [filteredEvents]);

  // When opening time-lapse, initialize timelapseTime to oldest event and start playing
  const handleOpenTimeLapse = () => {
    setTimelapseTime(timelapseStartTime);
    setIsTimeLapseOpen(true);
    setIsTimeLapsePlaying(true);
  };

  // Time-Lapse simulation loop
  useEffect(() => {
    if (!isTimeLapseOpen || !isTimeLapsePlaying) return;

    let lastFrameTime = performance.now();
    let animationFrameId: number;

    const tick = (now: number) => {
      const dtSeconds = (now - lastFrameTime) / 1000;
      lastFrameTime = now;

      // dtSeconds * timelapseSpeed * 30 minutes of sim time per real second at 1x
      const simAdvanceMs = dtSeconds * timelapseSpeed * 1800000;

      setTimelapseTime((prev) => {
        const next = prev + simAdvanceMs;
        if (next >= timelapseEndTime) {
          setIsTimeLapsePlaying(false);
          return timelapseEndTime;
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isTimeLapseOpen, isTimeLapsePlaying, timelapseSpeed, timelapseEndTime]);

  // Count events visible up to current time-lapse timestamp
  const timelapseVisibleCount = useMemo(() => {
    if (!isTimeLapseOpen) return filteredEvents.length;
    return filteredEvents.filter((e) => new Date(e.occurred_at).getTime() <= timelapseTime).length;
  }, [filteredEvents, isTimeLapseOpen, timelapseTime]);

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

  // Bilingual formatting for BMKG Ground Zero telemetry
  const formattedBMKG = useMemo(() => {
    if (!bmkgAlert) return null;
    let loc = bmkgAlert.wilayah || (lang === 'id' ? 'Kepulauan Indonesia' : 'Indonesia Archipelago');
    if (lang === 'en') {
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
    } else {
      loc = loc
        .replace(/^Pusat gempa berada di\s*/i, '')
        .replace(/\s*-\s*/g, ', ')
        .trim();
    }

    let pot = lang === 'id' ? 'TIDAK BERPOTENSI TSUNAMI' : 'NO TSUNAMI THREAT';
    const pLower = (bmkgAlert.potensi || '').toLowerCase();
    if (pLower.includes('tidak berpotensi tsunami')) {
      pot = lang === 'id' ? 'TIDAK BERPOTENSI TSUNAMI' : 'NO TSUNAMI THREAT';
    } else if (pLower.includes('dirasakan')) {
      pot = lang === 'id' ? 'GEMPA DIRASAKAN · AMAN DARI TSUNAMI' : 'SHAKING FELT · NO TSUNAMI';
    } else if (pLower.includes('berpotensi tsunami')) {
      pot = lang === 'id' ? 'PERINGATAN DINI TSUNAMI AKTIF' : 'TSUNAMI WARNING ACTIVE';
    }

    const dateStr = bmkgAlert.tanggal || '';
    const timeStr = bmkgAlert.jam || '';
    const fullTime = dateStr && timeStr ? `${dateStr} · ${timeStr} WIB` : dateStr || timeStr || (lang === 'id' ? 'GEMPA TERKINI' : 'RECENT RUPTURE');
    const shortTime = dateStr && timeStr ? `${dateStr.slice(0, 6).trim()}, ${timeStr.slice(0, 5)} WIB` : dateStr || 'RECENT';

    return {
      location: loc.toUpperCase(),
      depth: lang === 'id' ? `KEDALAMAN ${bmkgAlert.kedalaman}` : `${bmkgAlert.kedalaman} DEPTH`,
      potensi: pot,
      time: fullTime,
      shortTime: shortTime,
    };
  }, [bmkgAlert, lang]);

  // Clean location names for badges (strip "X km of ...")
  const cleanPlace = useCallback((place: string | null): string => {
    if (!place) return 'PUSAT GEMPA';
    const parts = place.split(' of ');
    const name = parts.length > 1 ? parts[1] : place;
    return name.trim();
  }, []);

  // Top Major Hazards Highlights (M >= 6.0 for quakes, FRP >= 150 MW for wildfires)
  const majorHighlights = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'event' | 'hotspot';
      badge: string;
      place: string;
      lat: number;
      lon: number;
      data: any;
    }> = [];

    // Significant Earthquakes: M >= 6.0, or top 1 if >= 5.0
    if (hazardMode !== 'wildfire' && events.length > 0) {
      const valid = events.filter((e) => e.magnitude != null);
      const major = valid.filter((e) => (e.magnitude ?? 0) >= 6.0);
      const selected =
        major.length > 0
          ? [...major].sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0)).slice(0, 2)
          : valid
              .filter((e) => (e.magnitude ?? 0) >= 5.0)
              .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
              .slice(0, 1);

      selected.forEach((evt) => {
        items.push({
          id: `hl-evt-${evt.usgs_id || evt.id}`,
          type: 'event',
          badge: `M ${evt.magnitude?.toFixed(1)}`,
          place: cleanPlace(evt.place),
          lat: evt.latitude,
          lon: evt.longitude,
          data: evt,
        });
      });
    }

    // Significant Wildfires: FRP >= 150 MW, or top 1 if >= 80 MW
    if (hazardMode !== 'seismic' && hotspots && hotspots.length > 0) {
      const extreme = hotspots.filter((h) => h.frp >= 150);
      const selected =
        extreme.length > 0
          ? [...extreme].sort((a, b) => b.frp - a.frp).slice(0, 2)
          : hotspots.filter((h) => h.frp >= 80).sort((a, b) => b.frp - a.frp).slice(0, 1);

      selected.forEach((h) => {
        items.push({
          id: `hl-fire-${h.id}`,
          type: 'hotspot',
          badge: `${h.frp} MW`,
          place: h.island,
          lat: h.latitude,
          lon: h.longitude,
          data: h,
        });
      });
    }

    return items;
  }, [events, hotspots, hazardMode, cleanPlace]);

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

  // Realtime Live Seismic Alert Actions & Dispatch
  const triggerSeismicAlert = useCallback((alertData: AlertEventData) => {
    setActiveAlert(alertData);
    playSeismicAlertPing();

    // Browser native OS Web Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`⚠️ M${alertData.magnitude.toFixed(1)} Gempa Bumi Terdeteksi`, {
          body: `${alertData.place} · Kedalaman ${alertData.depth} km`,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Web notification error:', e);
      }
    }
  }, []);

  const handleLocateAlert = useCallback(
    (alert: AlertEventData) => {
      setActiveAlert(null);
      setTargetFocus([alert.latitude, alert.longitude]);
      scrollToObservatory();
      const found = events.find((e) => e.id === alert.id || e.usgs_id === alert.id);
      if (found) {
        setSelectedEvent(found);
      }
    },
    [events]
  );

  const handleToggleAlerts = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        Notification.requestPermission().then((perm) => {
          setAlertsEnabled(perm === 'granted');
        });
      } else {
        setAlertsEnabled((prev) => !prev);
      }
    }

    // Trigger demo alert on click so user can verify audio, toast & map flight immediately
    triggerSeismicAlert({
      id: `sim-${Date.now()}`,
      magnitude: 6.2,
      place: '124 KM BARAT LAUT KEP. TALAUD, SULAWESI UTARA',
      time: 'Baru saja',
      depth: 10,
      tsunami: false,
      latitude: 4.12,
      longitude: 126.85,
      isSimulated: true,
    });
  }, [triggerSeismicAlert]);

  // Initial event IDs cache and 45s periodic background alert poller
  useEffect(() => {
    if (events.length > 0 && isInitialLoadRef.current) {
      events.forEach((e) => {
        if (e.id) knownEventIdsRef.current.add(e.id);
        if (e.usgs_id) knownEventIdsRef.current.add(e.usgs_id);
      });
      isInitialLoadRef.current = false;
    }
  }, [events]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      setAlertsEnabled(true);
    }

    const pollInterval = setInterval(async () => {
      try {
        const fresh = await fetchSeismicEvents();
        if (fresh && fresh.length > 0 && !isInitialLoadRef.current) {
          const newEvents = fresh.filter(
            (e) => !knownEventIdsRef.current.has(e.id) && !knownEventIdsRef.current.has(e.usgs_id)
          );
          if (newEvents.length > 0) {
            newEvents.forEach((e) => {
              if (e.id) knownEventIdsRef.current.add(e.id);
              if (e.usgs_id) knownEventIdsRef.current.add(e.usgs_id);
            });
            const latest = newEvents[0];
            triggerSeismicAlert({
              id: latest.id || latest.usgs_id,
              magnitude: latest.magnitude ?? 5.0,
              place: latest.place || 'Indonesia Archipelago',
              time: 'Baru saja',
              depth: latest.depth,
              latitude: latest.latitude,
              longitude: latest.longitude,
            });
            setEvents((prev) => [...newEvents, ...prev]);
          }
        }
      } catch (err) {
        console.warn('Background alert polling check:', err);
      }
    }, 45000);

    return () => clearInterval(pollInterval);
  }, [triggerSeismicAlert]);

  const effectiveTranslateX = isDesktop ? `${globeOffsetVw}vw` : '0px';
  return (
    <div className="relative min-h-screen w-full bg-white text-slate-900 selection:bg-[#0f2f63] selection:text-white font-sans">
      {/* 0. REALTIME SEISMIC ALERT TOAST NOTIFICATION */}
      <SeismicAlertToast
        alert={activeAlert}
        onClose={() => setActiveAlert(null)}
        onLocate={handleLocateAlert}
      />

      {/* 1. Global Liquid Glass SVG Refraction Filter */}
      <LiquidGlassFilter />

      {/* 2. Global Viewport Technical Blueprint Frame (Corner Crop Marks & Live Telemetry) */}
      <ViewportTechnicalFrame coordinates={cameraCoords} visible={isCurtainComplete} />

      {/* 3. FIXED STICKY ARCHITECTURAL NUSANTARA VECTOR MAP LAYER (Pure White Background during Loading) */}
      <div
        style={{
          opacity: isCurtainComplete ? 1 : 0,
          transform: isCurtainComplete ? 'scale(1)' : 'scale(1.05)',
          filter: isCurtainComplete ? 'none' : 'blur(4px)',
          transition:
            'opacity 1100ms cubic-bezier(0.16, 1, 0.3, 1), transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), filter 1100ms ease-out',
          transitionDelay: '150ms',
          willChange: 'opacity, transform, filter',
        }}
        className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center pt-14 sm:pt-16 pb-16 sm:pb-20 px-2 sm:px-4 overflow-hidden"
      >
        <div
          style={{
            transform: `translate3d(${effectiveTranslateX}, 0px, 0) scale(${globeScale})`,
            willChange: 'transform',
          }}
          className={`relative w-full max-w-6xl flex items-center justify-center h-[64vh] max-h-[620px] my-auto ${
            isObservatoryActive ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          {/* Architectural Vector Nusantara Map */}
          <VectorGlobe
            events={filteredEvents}
            hotspots={hotspots}
            hazardMode={hazardMode}
            isRotating={isRotating && !isTimeLapseOpen}
            resetSignal={resetSignal}
            targetFocus={targetFocus}
            onSelectEvent={isObservatoryActive ? setSelectedEvent : undefined}
            onUpdateHotspots={setHotspots}
            interactive={isObservatoryActive}
            onCameraChange={setCameraCoords}
            scrollPhi={scrollRotation.phi}
            scrollTheta={scrollRotation.theta}
            colorMode={colorMode}
            timelapseTimestamp={isTimeLapseOpen ? timelapseTime : null}
            scrollZoom={isObservatoryActive ? observatoryScrollZoom : null}
            isPanoramic={true}
            showControls={isObservatoryActive}
            controlsProgress={observatoryProgress}
            activeChapterIndex={isObservatoryActive || isHeroActive ? -1 : activeChapterIndex}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={setSelectedHotspot}
          />
        </div>
      </div>

      {/* 3. EDITORIAL FIXED HEADER NAVBAR */}
      <header
        style={{
          transform: isCurtainComplete ? 'translate3d(-50%, 0, 0)' : 'translate3d(-50%, -140%, 0)',
          opacity: isCurtainComplete ? 1 : 0,
          transition: 'transform 850ms cubic-bezier(0.16, 1, 0.3, 1), opacity 850ms ease-out',
          transitionDelay: '350ms',
          willChange: 'transform, opacity',
        }}
        className="fixed top-3.5 sm:top-4 left-1/2 z-40 w-full max-w-6xl px-3 sm:px-4 pointer-events-none select-none"
      >
        <LiquidCard className="rounded-2xl sm:rounded-full shadow-lg border border-neutral-200/80 bg-white/70 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center justify-between gap-1.5 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2">
            {/* Logo + Branding: Sharp, Crisp Typography */}
            <div
              onClick={scrollToHero}
              className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0 cursor-pointer group"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0f2f63] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <GlobeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold tracking-wider uppercase font-sans text-neutral-900 leading-none flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs sm:text-sm">
                  <span className="whitespace-nowrap font-extrabold tracking-tight">
                    {lang === 'id' ? 'OBSERVATORIUM' : 'SEISMIC'}
                  </span>
                  <span className="text-neutral-400 font-normal">//</span>
                  <span className="hidden xl:inline text-neutral-500 font-mono font-medium text-xs">
                    {t.observatorySubtitle}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200/90 font-mono tracking-wider font-semibold whitespace-nowrap">
                    {t.liveBadge}
                  </span>
                </h1>
              </div>
            </div>

            {/* Header Right Actions: Clean & Minimalist */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 font-mono text-xs">
              {/* Language Switcher: ID / EN */}
              <button
                type="button"
                onClick={toggleLanguage}
                title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-neutral-100/90 hover:bg-neutral-200/90 border border-neutral-200/80 font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <span className={lang === 'id' ? 'text-slate-950 font-black' : 'text-slate-400 font-normal'}>ID</span>
                <span className="text-slate-300 font-light">/</span>
                <span className={lang === 'en' ? 'text-slate-950 font-black' : 'text-slate-400 font-normal'}>EN</span>
              </button>

              {/* Realtime Live Seismic Alert Notification Toggle */}
              <button
                onClick={handleToggleAlerts}
                title={alertsEnabled ? 'Live Seismic Alerts Active (Click to trigger demo alert)' : 'Enable Live Alerts'}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs font-mono font-medium tracking-wider transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                  alertsEnabled
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-2xs'
                    : 'bg-neutral-100/90 text-neutral-600 border-neutral-200/80 hover:bg-neutral-200/90'
                }`}
              >
                <Bell className={`w-3.5 h-3.5 ${alertsEnabled ? 'text-rose-600 animate-pulse' : 'text-neutral-400'}`} />
                <span className="hidden sm:inline">{alertsEnabled ? t.alertsOn : t.alertsOff}</span>
              </button>

              {!isObservatoryActive ? (
                <button
                  onClick={scrollToObservatory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100/90 hover:bg-neutral-200/90 text-neutral-800 border border-neutral-200/80 text-xs font-mono font-medium tracking-wider transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <span>{lang === 'id' ? 'OBSERVATORIUM' : 'OBSERVATORY'}</span>
                  <ArrowDown className="w-3.5 h-3.5 text-neutral-500" />
                </button>
              ) : (
                <>
                  <div className="hidden xl:flex items-center gap-2.5 px-2.5 py-1 rounded-full bg-neutral-100/60 border border-neutral-200/80 text-[10.5px] font-mono tracking-wider">
                    <div>
                      <span className="text-[9px] text-neutral-400 block font-medium uppercase">{t.totalEq}</span>
                      <span className="font-bold text-neutral-900 tabular-nums">{loading ? '—' : stats.count}</span>
                    </div>
                    <div className="w-px h-3.5 bg-neutral-200" />
                    <div>
                      <span className="text-[9px] text-neutral-400 block font-medium uppercase">{t.activityStatus}</span>
                      <span className="font-bold text-emerald-700 tabular-nums">{t.statusNormal}</span>
                    </div>
                  </div>

                  {/* Return to Hero / Stories */}
                  <button
                    onClick={scrollToHero}
                    title={lang === 'id' ? 'Kembali ke Bab Cerita' : 'Return to Stories / Hero'}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all text-[11px] font-mono font-semibold cursor-pointer whitespace-nowrap active:scale-95 shadow-xs shrink-0"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.stories}</span>
                  </button>

                  {/* Bookmarks */}
                  <button
                    id="bookmarks-btn"
                    onClick={() => setIsDrawerOpen(true)}
                    title={t.saved}
                    className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full bg-neutral-100/80 hover:bg-neutral-200/90 border border-neutral-200/80 text-neutral-900 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                  >
                    <BookmarkIcon className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                    <span className="hidden md:inline">{t.saved}</span>
                    {bookmarks.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#0f2f63] text-white text-[9px] font-mono leading-none">
                        {bookmarks.length}
                      </span>
                    )}
                  </button>

                  {/* Refresh */}
                  <button
                    id="refresh-btn"
                    onClick={loadData}
                    title={lang === 'id' ? 'Muat Ulang Telemetri' : 'Reload Telemetry'}
                    className="p-2 rounded-full bg-neutral-100/80 hover:bg-neutral-200/90 border border-neutral-200/80 text-neutral-700 hover:text-neutral-950 transition-all cursor-pointer shrink-0 active:scale-95"
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
        isReady={isCurtainComplete}
        onIntroComplete={handleCurtainComplete}
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
                className="story-chapter-section relative w-full pointer-events-none"
                style={{ height: '220vh' }}
              >
                {/* Sticky Viewport Stage Pinned during Scroll Zoom with Continuous Blur Fade */}
                <div
                  style={{
                    opacity: observatoryProgress,
                    filter: observatoryProgress < 0.99 ? `blur(${(1 - observatoryProgress) * 6}px)` : 'none',
                    transform: `translate3d(0, -${Math.min(obsTopOffset, 320)}px, 0)`,
                    willChange: 'opacity, transform, filter',
                    visibility: observatoryProgress <= 0.001 ? 'hidden' : 'visible',
                  }}
                  className="sticky top-0 h-screen w-full flex flex-col justify-between pt-16 sm:pt-20 pb-6 px-3 sm:px-6 lg:px-12 pointer-events-none z-20"
                >
                  {/* Top Row: Left-Aligned Epicenter Card + Right Telemetry & Scroll Zoom Reticle */}
                  <div className="w-full flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 pointer-events-none">
                    {/* Left Side: Interactive BMKG Epicenter Survey Card & Major Hazards Highlights HUD */}
                    <div className="pointer-events-auto flex flex-col items-start gap-2 max-w-sm">
                      {bmkgAlert && formattedBMKG && (
                        <EpicenterMapCard
                          location={formattedBMKG.location}
                          coordinates={bmkgAlert.coordinates}
                          magnitude={bmkgAlert.magnitude}
                          depth={formattedBMKG.depth}
                          time={formattedBMKG.time}
                          shortTime={formattedBMKG.shortTime}
                          potensi={formattedBMKG.potensi}
                          lang={lang}
                          onOpenShakemap={() => setIsShakemapModalOpen(true)}
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

                      {/* Option 1: Quick Focus Major Hazards HUD Strip */}
                      {majorHighlights.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar max-w-[calc(100vw-2.5rem)] sm:max-w-md py-0.5">
                          <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1 px-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            <span>{lang === 'id' ? 'SOROTAN:' : 'MAJOR:'}</span>
                          </span>
                          {majorHighlights.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setTargetFocus([item.lat, item.lon]);
                                if (item.type === 'event') {
                                  setSelectedEvent(item.data);
                                } else {
                                  setSelectedHotspot(item.data);
                                }
                              }}
                              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 font-mono text-[10px] tracking-wide shadow-xs border transition-all cursor-pointer active:scale-95 backdrop-blur-md hover:scale-105 hover:shadow-md ${
                                item.type === 'event'
                                  ? 'border-rose-200/90 hover:border-rose-400 text-slate-900'
                                  : 'border-orange-200/90 hover:border-orange-400 text-slate-900'
                              }`}
                              title={
                                lang === 'id'
                                  ? `Fokus kamera & buka detail ${item.place} (${item.badge})`
                                  : `Focus camera & view details of ${item.place} (${item.badge})`
                              }
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                                  item.type === 'event' ? 'bg-rose-600' : 'bg-orange-500'
                                }`}
                              />
                              <span
                                className={`font-bold ${
                                  item.type === 'event' ? 'text-rose-700' : 'text-orange-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-semibold uppercase text-slate-800 group-hover:text-slate-950">
                                {item.place}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Side: Depth Legend, Live Telemetry Counters & Scroll Zoom Indicator */}
                    <div className="pointer-events-auto self-end sm:self-auto flex items-center gap-2.5 flex-wrap">
                      {/* Depth Legend: inline dash markers */}
                      {colorMode === 'depth' && (
                        <div className="hidden md:flex items-center gap-3 font-mono text-[9px] tracking-widest text-slate-500 uppercase">
                          <span className="flex items-center gap-1.5">
                            <span className="block w-4 h-0.5" style={{ backgroundColor: '#f43f5e' }} />
                            &lt;70KM
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="block w-4 h-0.5" style={{ backgroundColor: '#f59e0b' }} />
                            70-300KM
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="block w-4 h-0.5" style={{ backgroundColor: '#06b6d4' }} />
                            &gt;300KM
                          </span>
                        </div>
                      )}

                      {/* Telemetry Counter: plain clean bordered */}
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md border border-slate-200 rounded-md font-mono text-[9.5px] tracking-wider text-slate-600 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                        <span className="font-bold text-slate-900 tabular-nums">{events.length}</span>
                        <span>{t.seismicOnly}</span>
                        <span className="text-slate-300 px-0.5">/</span>
                        <span className="font-bold text-slate-900 tabular-nums">{hotspots.length}</span>
                        <span>{t.hotspotsCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Center Content: Transparent pass-through exposing the panoramic letterboxed map */}
                  <div className="flex-1 w-full pointer-events-none" />

                  {/* Bottom spacer for dock clearance */}
                  <div className="h-16 pointer-events-none" />
                </div>
              </section>
            );
          }

          // Chapters 1 - 4: Guided Storytelling Stages (Alternating: Even cards Left, Odd cards Right)
          const isCardOnRight = index % 2 === 1;
          return (
            <section
              key={chapter.id}
              id={`chapter-section-${index}`}
              data-chapter-index={index}
              className={`story-chapter-section min-h-screen w-full flex items-center px-4 sm:px-8 lg:px-16 xl:px-24 py-28 pointer-events-none ${
                isCardOnRight ? 'justify-end md:pr-20 lg:pr-28' : 'justify-start md:pl-8 lg:pl-16'
              }`}
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

      {/* FLOATING TELEMETRY CONTROLLER DOCK (Fixed Root Viewport Level) */}
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
        onOpenTimeLapse={handleOpenTimeLapse}
        onOpenSeismogram={() => setIsSeismogramOpen((prev) => !prev)}
        isSeismogramOpen={isSeismogramOpen}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        hazardMode={hazardMode}
        onHazardModeChange={setHazardMode}
        eventCount={filteredEvents.length}
        visible={isObservatoryActive && !isTimeLapseOpen}
        progress={isTimeLapseOpen ? 0 : observatoryProgress}
        lang={lang}
        magCategory={magCategory}
        onMagCategoryChange={setMagCategory}
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
      />

      {/* 7. EVENT DETAIL & BOOKMARK MODAL */}
      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isBookmarked={isEventBookmarked(selectedEvent)}
        onToggleBookmark={handleToggleBookmark}
        onFocusGlobe={(evt) => setTargetFocus([evt.latitude, evt.longitude])}
        onOpenSeismogram={(evt) => {
          setSelectedEvent(evt);
          setIsSeismogramOpen(true);
        }}
        onOpenInfographic={(evt) => {
          setInfographicEvent(evt);
          setIsInfographicOpen(true);
        }}
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

      {/* 10. TIME-LAPSE 7-DAY REPLAY SCRUBBER */}
      {isTimeLapseOpen && (
        <TimeLapseScrubber
          isPlaying={isTimeLapsePlaying}
          onTogglePlay={() => setIsTimeLapsePlaying((p) => !p)}
          speed={timelapseSpeed}
          onSpeedChange={setTimelapseSpeed}
          currentTime={timelapseTime}
          startTime={timelapseStartTime}
          endTime={timelapseEndTime}
          onScrub={(t) => setTimelapseTime(t)}
          visibleCount={timelapseVisibleCount}
          totalCount={filteredEvents.length}
          onClose={() => {
            setIsTimeLapseOpen(false);
            setIsTimeLapsePlaying(false);
          }}
        />
      )}

      {/* 11. BMKG OFFICIAL SHAKEMAP MODAL */}
      <BMKGShakemapModal
        isOpen={isShakemapModalOpen}
        onClose={() => setIsShakemapModalOpen(false)}
        shakemapUrl={
          bmkgAlert?.shakemap
            ? bmkgAlert.shakemap.startsWith('http')
              ? bmkgAlert.shakemap
              : `https://data.bmkg.go.id/DataMKG/TEWS/${bmkgAlert.shakemap}`
            : null
        }
        location={formattedBMKG?.location || 'Kepulauan Indonesia'}
        magnitude={`M${bmkgAlert?.magnitude || '5.0+'}`}
        depth={formattedBMKG?.depth || `${bmkgAlert?.kedalaman || '10 km'}`}
        time={formattedBMKG?.time || bmkgAlert?.tanggal || 'Terbaru'}
        potensi={formattedBMKG?.potensi || bmkgAlert?.potensi || 'Tidak berpotensi tsunami'}
        coordinates={bmkgAlert?.coordinates}
      />

      {/* 12. VIRTUAL SEISMOGRAM OSCILLOSCOPE MONITOR (P & S WAVE RECORDER) */}
      <VirtualSeismogram
        isOpen={isSeismogramOpen}
        onClose={() => setIsSeismogramOpen(false)}
        activeEvent={selectedEvent || (filteredEvents.length > 0 ? filteredEvents[0] : null)}
      />

      {/* 13. DISASTER INFOGRAPHIC SOCIAL CARD GENERATOR */}
      <SocialInfographicModal
        isOpen={isInfographicOpen}
        onClose={() => setIsInfographicOpen(false)}
        event={infographicEvent || selectedEvent}
        location={infographicEvent?.place || formattedBMKG?.location || 'Indonesia Archipelago'}
        magnitude={infographicEvent ? (infographicEvent.magnitude ?? '5.0') : (bmkgAlert?.magnitude || '5.0')}
        depth={infographicEvent ? `${infographicEvent.depth} km` : (formattedBMKG?.depth || '10 km')}
        time={infographicEvent ? new Date(infographicEvent.occurred_at).toLocaleString('id-ID') : (formattedBMKG?.time || 'Terbaru')}
        potensi={formattedBMKG?.potensi || 'Tidak berpotensi tsunami'}
        coordinates={infographicEvent ? `${infographicEvent.latitude.toFixed(2)}°, ${infographicEvent.longitude.toFixed(2)}°` : (bmkgAlert?.coordinates || undefined)}
      />
    </div>
  );
};

export default App;
