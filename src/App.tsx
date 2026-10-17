import React, { useEffect, useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { VectorGlobe, CameraCoordinates } from './components/ui/VectorGlobe';
import { ViewportTechnicalFrame } from './components/ui/ViewportTechnicalFrame';
import { LiquidGlassFilter, LiquidCard } from './components/ui/liquid-glass';
import { FloatingControllerDock } from './components/ui/FloatingControllerDock';
import { BookmarkDrawer } from './components/ui/BookmarkDrawer';
import { EventsListDrawer } from './components/ui/EventsListDrawer';
import { EpicenterMapCard } from './components/ui/EpicenterMapCard';
import { TimeLapseScrubber } from './components/ui/TimeLapseScrubber';
import { TectonicEducationModal } from './components/ui/TectonicEducationModal';
import { buildStoryChapters } from './utils/storyAnalytics';
import { SeismicEvent, Bookmark, WildfireHotspot, HazardMode, VolcanoActivity } from './types/seismic';
import { fetchVolcanoActivity } from './utils/volcanoService';
import { fetchLiveWildfireHotspots } from './utils/firmsService';

const EventModal = lazy(() =>
  import('./components/ui/EventModal').then((m) => ({ default: m.EventModal }))
);
const BMKGShakemapModal = lazy(() =>
  import('./components/ui/BMKGShakemapModal').then((m) => ({ default: m.BMKGShakemapModal }))
);
const SocialInfographicModal = lazy(() =>
  import('./components/ui/SocialInfographicModal').then((m) => ({ default: m.SocialInfographicModal }))
);
const VolcanoDetailModal = lazy(() =>
  import('./components/ui/VolcanoDetailModal').then((m) => ({ default: m.VolcanoDetailModal }))
);
import {
  fetchSeismicEvents,
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
  Bell,
  Activity,
  Flame,
  Mountain,
  BookOpen,
} from 'lucide-react';

const DEFAULT_FOCUS: [number, number] = [-0.78, 118.0];

export const App: React.FC = () => {
  const { lang, t, toggleLanguage } = useLanguage();
  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [bmkgAlert, setBmkgAlert] = useState<BMKGAlert | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [eventModalTab, setEventModalTab] = useState<'telemetry' | 'news'>('telemetry');
  const [selectedHotspot, setSelectedHotspot] = useState<WildfireHotspot | null>(null);

  // Active Camera & Tectonic Education Modal
  const [cameraCoords, setCameraCoords] = useState<CameraCoordinates>({ lat: 12.0, lon: 115.0 });
  const [isTectonicModalOpen, setIsTectonicModalOpen] = useState(false);

  // Filters & Controls
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d'>('all');
  const colorMode: 'magnitude' | 'depth' = 'magnitude';
  const isRotating = true;
  const [resetSignal, setResetSignal] = useState(0);
  const [targetFocus, setTargetFocus] = useState<[number, number] | null>(null);

  // Time-Lapse 7-Day Seismic Replay State
  const [isTimeLapseOpen, setIsTimeLapseOpen] = useState(false);
  const [isTimeLapsePlaying, setIsTimeLapsePlaying] = useState(false);
  const [timelapseSpeed, setTimelapseSpeed] = useState(5);
  const [timelapseTime, setTimelapseTime] = useState(Date.now());

  // BMKG Official Shakemap Modal State
  const [isShakemapModalOpen, setIsShakemapModalOpen] = useState(false);

  // Disaster Infographic Social Card State
  const [isInfographicOpen, setIsInfographicOpen] = useState(false);
  const [infographicEvent, setInfographicEvent] = useState<SeismicEvent | null>(null);

  // Multi-Hazard Telemetry State (NASA FIRMS Hotspots, Volcanology & Hazard Mode)
  const [hotspots, setHotspots] = useState<WildfireHotspot[]>([]);
  const [volcanoes, setVolcanoes] = useState<VolcanoActivity[]>([]);
  const [selectedVolcano, setSelectedVolcano] = useState<VolcanoActivity | null>(null);
  const [hazardMode, setHazardMode] = useState<HazardMode>('dual');

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

  const [syncCountdown, setSyncCountdown] = useState(45);
  const [pingLatencyMs, setPingLatencyMs] = useState<number | null>(null);
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Load live data from Supabase / USGS / NASA FIRMS
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const start = performance.now();
    try {
      const data = await fetchSeismicEvents();
      const latency = Math.round(performance.now() - start);
      setPingLatencyMs(latency);

      setEvents((prev) => {
        const bmkg = prev.find((e) => e.id === 'bmkg-autogempa');
        return bmkg ? [bmkg, ...data.filter((e) => e.id !== 'bmkg-autogempa')] : data;
      });

      // Background alert trigger on new events if not initial load
      if (!isInitialLoadRef.current && data && data.length > 0) {
        const newEvents = data.filter(
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
        }
      }

      // Deep linking support: ?event=<id> or ?id=<id> with optional &tab=news
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get('event') || params.get('id');
        const targetTab = params.get('tab') === 'news' ? 'news' : 'telemetry';
        if (targetId && data && data.length > 0) {
          const match = data.find((e) => e.usgs_id === targetId || e.id === targetId);
          if (match) {
            setSelectedEvent(match);
            setEventModalTab(targetTab);
            setTargetFocus([match.latitude, match.longitude]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      if (!silent) setLoading(false);
      isInitialLoadRef.current = false;
    }

    fetchBMKGAutogempa().then((res) => {
      if (res) {
        setBmkgAlert(res);
        let lat = -0.38;
        let lon = 123.13;
        if (res.coordinates && res.coordinates.includes(',')) {
          const parts = res.coordinates.split(',');
          const parsedLat = parseFloat(parts[0]);
          const parsedLon = parseFloat(parts[1]);
          if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
            lat = parsedLat;
            lon = parsedLon;
          }
        } else if (res.lintang && res.bujur) {
          const latVal = parseFloat(res.lintang);
          const lonVal = parseFloat(res.bujur);
          if (!isNaN(latVal)) lat = res.lintang.includes('LS') ? -Math.abs(latVal) : Math.abs(latVal);
          if (!isNaN(lonVal)) lon = lonVal;
        }

        const mag = parseFloat(res.magnitude) || 4.9;

        const bmkgEvent: SeismicEvent = {
          id: 'bmkg-autogempa',
          usgs_id: 'bmkg-autogempa',
          magnitude: mag,
          depth: parseFloat(res.kedalaman) || 7,
          latitude: lat,
          longitude: lon,
          place: res.wilayah || 'Laut 74 km Timur Laut Banggai, Sulawesi',
          occurred_at: res.datetime || new Date().toISOString(),
        };

        setEvents((prev) => [
          bmkgEvent,
          ...prev.filter((e) => e.id !== 'bmkg-autogempa' && e.usgs_id !== 'bmkg-autogempa'),
        ]);
      }
    });

    fetchLiveWildfireHotspots(true).then((res) => {
      if (res?.hotspots) setHotspots(res.hotspots);
    });

    fetchVolcanoActivity().then((data) => {
      if (data) setVolcanoes(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleManualRefresh = async () => {
    setIsManualSyncing(true);
    setSyncCountdown(45);
    try {
      await loadData(true);
      const firmsRes = await fetchLiveWildfireHotspots(true);
      if (firmsRes?.hotspots) setHotspots(firmsRes.hotspots);
      const volcRes = await fetchVolcanoActivity();
      if (volcRes) setVolcanoes(volcRes);
    } finally {
      setIsManualSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
    setBookmarks(getLocalBookmarks());
  }, []);

  // Compute dynamic story chapters from active language
  const storyChapters = useMemo(() => buildStoryChapters(lang), [lang]);

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

  // Camera Recenter to Archipelago Default
  const handleRecenterIndonesia = useCallback(() => {
    setTargetFocus(DEFAULT_FOCUS);
    setResetSignal((prev) => prev + 1);
  }, []);


  // Filtered Events Pipeline

  // Filtered Events Pipeline (Time Horizon & Magnitude)
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      // Always retain BMKG real-time headline event (Banggai) across magnitude filters
      if (e.id === 'bmkg-autogempa') {
        return true;
      }

      if (timeFilter !== 'all') {
        const eventTime = new Date(e.occurred_at).getTime();
        const now = Date.now();
        const diffHours = (now - eventTime) / (1000 * 60 * 60);

        if (timeFilter === '24h' && diffHours > 24) return false;
        if (timeFilter === '7d' && diffHours > 24 * 7) return false;
      }

      if (magCategory === 'felt' && (e.magnitude ?? 0) < 4.0) return false;
      if (magCategory === 'significant' && (e.magnitude ?? 0) < 5.5) return false;

      return true;
    });
  }, [events, timeFilter, magCategory]);


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
      type: 'event' | 'hotspot' | 'volcano';
      badge: string;
      place: string;
      lat: number;
      lon: number;
      data: any;
    }> = [];

    // 1. Primary Live BMKG Event (e.g. Banggai, Sulawesi M 4.9 today)
    const showSeismic = hazardMode === 'dual' || hazardMode === 'all' || hazardMode === 'seismic';
    if (showSeismic && bmkgAlert) {
      const coordsMatch = bmkgAlert.coordinates.match(/(-?\d+\.?\d*)[^\d]+(-?\d+\.?\d*)/);
      const lat = coordsMatch
        ? parseFloat(coordsMatch[1]) * (bmkgAlert.coordinates.includes('LS') ? -1 : 1)
        : -0.38;
      const lon = coordsMatch ? parseFloat(coordsMatch[2]) : 123.13;
      const mag = parseFloat(bmkgAlert.magnitude) || 4.9;

      let bmkgLoc = 'SULAWESI';
      if (bmkgAlert.wilayah) {
        const m = bmkgAlert.wilayah.match(/(?:laut|darat)\s*\d*\s*km\s*[A-Za-z\s]*\s+([A-Za-z\s]+)/i);
        bmkgLoc = m ? m[1].trim().toUpperCase() : 'SULAWESI';
      }

      const syntheticBMKG: SeismicEvent = {
        id: 'bmkg-autogempa',
        usgs_id: 'bmkg-autogempa',
        magnitude: mag,
        depth: parseFloat(bmkgAlert.kedalaman) || 10,
        latitude: lat,
        longitude: lon,
        place: bmkgAlert.wilayah || formattedBMKG?.location || 'Banggai, Sulawesi',
        occurred_at: bmkgAlert.datetime || new Date().toISOString(),
      };

      items.push({
        id: 'hl-bmkg-active',
        type: 'event',
        badge: `M ${mag.toFixed(1)}`,
        place: `${bmkgLoc}, SULAWESI`,
        lat,
        lon,
        data: syntheticBMKG,
      });
    }

    // 2. Recent USGS Earthquakes (Filter to last 7 days only to avoid stale data from August)
    if (showSeismic && filteredEvents.length > 0) {
      const oneWeekAgo = Date.now() - 7 * 86400000;
      const recentValid = filteredEvents.filter((e) => {
        if (e.magnitude == null) return false;
        const time = new Date(e.occurred_at).getTime();
        return !isNaN(time) && time >= oneWeekAgo;
      });

      const major = recentValid.filter((e) => (e.magnitude ?? 0) >= 5.5);
      const selected =
        major.length > 0
          ? [...major].sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0)).slice(0, 1)
          : recentValid
              .filter((e) => (e.magnitude ?? 0) >= 4.5)
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
    const showWildfires = hazardMode === 'dual' || hazardMode === 'all' || hazardMode === 'wildfire';
    if (showWildfires && hotspots && hotspots.length > 0) {
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

    // Active Volcanic Eruptions & Plumes (Level IV / Level III)
    const showVolcanoes = hazardMode === 'dual' || hazardMode === 'all' || hazardMode === 'volcano';
    if (showVolcanoes && volcanoes && volcanoes.length > 0) {
      const maxCount = hazardMode === 'volcano' ? 5 : 2;
      const sortedVolcs = [...volcanoes].sort((a, b) => {
        const score = (l: string) => (l === 'Level IV' ? 4 : l === 'Level III' ? 3 : l === 'Level II' ? 2 : 1);
        return score(b.alert_level) - score(a.alert_level);
      });
      sortedVolcs.slice(0, maxCount).forEach((v) => {
        const badgeLabel = v.alert_level === 'Level IV' ? 'AWAS' : v.alert_level === 'Level III' ? 'SIAGA' : 'WASPADA';
        items.push({
          id: `hl-volc-${v.id}`,
          type: 'volcano',
          badge: badgeLabel,
          place: v.name.replace('Gunung ', '').toUpperCase(),
          lat: v.latitude,
          lon: v.longitude,
          data: v,
        });
      });
    }

    return items;
  }, [filteredEvents, hotspots, volcanoes, hazardMode, cleanPlace]);

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

    const timer = setInterval(() => {
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          loadData(true);
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-white text-slate-900 selection:bg-[#0f2f63] selection:text-white font-sans">
      {/* 0. REALTIME SEISMIC ALERT TOAST NOTIFICATION */}
      <SeismicAlertToast
        alert={activeAlert}
        onClose={() => setActiveAlert(null)}
        onLocate={handleLocateAlert}
        lang={lang}
      />

      {/* 1. Global Liquid Glass SVG Refraction Filter */}
      <LiquidGlassFilter />

      {/* 2. Global Viewport Technical Blueprint Frame (Corner Crop Marks) */}
      <ViewportTechnicalFrame coordinates={cameraCoords} visible={true} />

      {/* 3. ARCHITECTURAL NUSANTARA VECTOR MAP LAYER */}
      <div className="fixed inset-0 z-10 flex items-center justify-center pt-14 sm:pt-16 pb-16 sm:pb-20 px-2 sm:px-4 overflow-hidden pointer-events-none">
        <div className="relative w-full max-w-6xl flex items-center justify-center h-[64vh] max-h-[620px] my-auto pointer-events-auto">
          <VectorGlobe
            events={filteredEvents}
            hotspots={hotspots}
            volcanoes={volcanoes}
            hazardMode={hazardMode}
            isRotating={isRotating && !isTimeLapseOpen}
            resetSignal={resetSignal}
            targetFocus={targetFocus}
            onSelectEvent={setSelectedEvent}
            onUpdateHotspots={setHotspots}
            onSelectVolcano={setSelectedVolcano}
            interactive={true}
            onCameraChange={setCameraCoords}
            colorMode={colorMode}
            timelapseTimestamp={isTimeLapseOpen ? timelapseTime : null}
            isPanoramic={true}
            showControls={true}
            selectedHotspot={selectedHotspot}
            onSelectHotspot={setSelectedHotspot}
            lang={lang}
          />
        </div>
      </div>

      {/* 4. EDITORIAL FIXED HEADER NAVBAR */}
      <header className="fixed top-3.5 sm:top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-6xl px-3 sm:px-4 pointer-events-none select-none">
        <LiquidCard className="rounded-2xl sm:rounded-full shadow-lg border border-neutral-200/80 bg-white/75 backdrop-blur-md pointer-events-auto">
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 px-2.5 py-1.5 sm:px-4 sm:py-2">
            {/* Logo + Branding: Click to Recenter to Indonesia */}
            <div
              onClick={handleRecenterIndonesia}
              title={lang === 'id' ? 'Klik untuk memusatkan kembali peta ke Indonesia' : 'Click to recenter map to Indonesia'}
              className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink-0 cursor-pointer group"
            >
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#0f2f63] text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                <GlobeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold tracking-wider uppercase font-sans text-neutral-900 leading-none flex items-center gap-x-1.5 text-[10px] sm:text-sm">
                  <span className="whitespace-nowrap font-extrabold tracking-tight">
                    {lang === 'id' ? 'OBSERVATORIUM' : 'SEISMIC'}
                  </span>
                  <span className="text-neutral-400 font-normal hidden sm:inline">//</span>
                  <span className="hidden md:inline text-neutral-500 font-mono font-medium text-xs truncate max-w-[140px] lg:max-w-none">
                    {t.observatorySubtitle}
                  </span>
                  <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200/90 font-mono tracking-wider font-semibold whitespace-nowrap">
                    {t.liveBadge}
                  </span>
                </h1>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 font-mono text-xs">
              {/* Tectonic Education Modal Toggle */}
              <button
                type="button"
                onClick={() => setIsTectonicModalOpen(true)}
                title={lang === 'id' ? 'Edukasi Zona Tektonik & Sesar Aktif' : 'Active Tectonic & Fault Systems Guide'}
                className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/90 border border-slate-200/80 text-slate-800 text-[9.5px] sm:text-[11px] font-mono font-bold tracking-wider transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
              >
                <BookOpen className="w-3 h-3 text-[#0f2f63]" />
                <span className="hidden sm:inline">{lang === 'id' ? 'TEKTONIK' : 'TECTONICS'}</span>
              </button>

              {/* Telemetry Ping Latency & Auto-Refresh Countdown Pill */}
              <button
                type="button"
                onClick={handleManualRefresh}
                title={
                  lang === 'id'
                    ? `Latensi Data: ${pingLatencyMs ? `${pingLatencyMs}ms` : 'Mengukur...'} • Auto-refresh dalam ${syncCountdown}s (Klik untuk refresh manual)`
                    : `Data Latency: ${pingLatencyMs ? `${pingLatencyMs}ms` : 'Measuring...'} • Auto-refresh in ${syncCountdown}s (Click to refresh now)`
                }
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1.5 rounded-full bg-neutral-100/90 hover:bg-neutral-200/90 border border-neutral-200/80 font-mono text-[9px] sm:text-[11px] font-medium tracking-wider transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0 text-slate-700"
              >
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
                  <span
                    className={`relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 ${
                      pingLatencyMs && pingLatencyMs < 400 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                </span>
                <span className="tabular-nums font-bold text-slate-900 hidden sm:inline">
                  {pingLatencyMs ? `${pingLatencyMs}ms` : 'LIVE'}
                </span>
                <span className="text-slate-300 font-light hidden sm:inline">/</span>
                <span className="tabular-nums font-bold text-slate-600">
                  {syncCountdown}s
                </span>
                <RefreshCw
                  className={`w-2 h-2 sm:w-2.5 sm:h-2.5 text-slate-500 transition-transform ${
                    isManualSyncing ? 'animate-spin text-slate-900' : ''
                  }`}
                />
              </button>

              {/* Language Switcher: ID / EN */}
              <button
                type="button"
                onClick={toggleLanguage}
                title={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
                className="flex items-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1.5 rounded-full bg-neutral-100/90 hover:bg-neutral-200/90 border border-neutral-200/80 font-mono text-[9.5px] sm:text-[11px] font-bold tracking-wider transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0"
              >
                <span className={lang === 'id' ? 'text-slate-950 font-black' : 'text-slate-400 font-normal'}>ID</span>
                <span className="text-slate-300 font-light">/</span>
                <span className={lang === 'en' ? 'text-slate-950 font-black' : 'text-slate-400 font-normal'}>EN</span>
              </button>

              {/* Realtime Live Seismic Alert Notification Toggle */}
              <button
                type="button"
                onClick={handleToggleAlerts}
                title={
                  alertsEnabled
                    ? lang === 'id'
                      ? 'Alarm Akustik Seismik Aktif (Klik untuk simulasi suara)'
                      : 'Seismic Acoustic Alarm Active (Click to simulate sound)'
                    : lang === 'id'
                    ? 'Aktifkan Alarm Akustik Seismik'
                    : 'Enable Seismic Acoustic Alarm'
                }
                className={`p-1.5 sm:p-2 rounded-full border transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0 flex items-center justify-center ${
                  alertsEnabled
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-neutral-100/80 text-neutral-500 border-neutral-200/80 hover:bg-neutral-200/90'
                }`}
              >
                <Bell className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${alertsEnabled ? 'text-rose-600' : 'text-neutral-500'}`} />
              </button>

              {/* Bookmarks */}
              <button
                type="button"
                id="bookmarks-btn"
                onClick={() => setIsDrawerOpen(true)}
                title={t.saved}
                className="relative p-1.5 sm:p-2 rounded-full bg-neutral-100/80 hover:bg-neutral-200/90 border border-neutral-200/80 text-neutral-700 hover:text-neutral-950 transition-all cursor-pointer active:scale-95 shadow-2xs shrink-0 flex items-center justify-center"
              >
                <BookmarkIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600 shrink-0" />
                {bookmarks.length > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#0f2f63] text-white text-[8px] sm:text-[8.5px] font-mono font-bold leading-none shadow-xs">
                    {bookmarks.length}
                  </span>
                )}
              </button>

              {/* Refresh */}
              <button
                type="button"
                id="refresh-btn"
                onClick={() => loadData()}
                title={lang === 'id' ? 'Muat Ulang Telemetri' : 'Reload Telemetry'}
                className="hidden sm:flex p-2 rounded-full bg-neutral-100/80 hover:bg-neutral-200/90 border border-neutral-200/80 text-neutral-700 hover:text-neutral-950 transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs items-center justify-center"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </LiquidCard>
      </header>

      {/* 5. TOP-LEFT HUD: BMKG EPICENTER CARD & MAJOR HAZARDS HIGHLIGHTS */}
      <div className="fixed top-18 sm:top-20 left-3 sm:left-6 z-30 flex flex-col items-start gap-2 max-w-[min(94vw,380px)] pointer-events-auto select-none">
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
            onOpenNews={() => {
              const coordsMatch = bmkgAlert.coordinates.match(/(-?\d+\.?\d*)[^\d]+(-?\d+\.?\d*)/);
              const lat = coordsMatch
                ? parseFloat(coordsMatch[1]) * (bmkgAlert.coordinates.includes('LS') ? -1 : 1)
                : -6.2;
              const lon = coordsMatch ? parseFloat(coordsMatch[2]) : 106.8;
              const syntheticBMKGEvent: SeismicEvent = {
                id: 'bmkg-autogempa',
                usgs_id: 'bmkg-autogempa',
                magnitude: parseFloat(bmkgAlert.magnitude) || 5.0,
                depth: parseFloat(bmkgAlert.kedalaman) || 10,
                latitude: lat,
                longitude: lon,
                place: bmkgAlert.wilayah || formattedBMKG.location,
                occurred_at: bmkgAlert.datetime || new Date().toISOString(),
              };
              setSelectedEvent(syntheticBMKGEvent);
              setEventModalTab('news');
            }}
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

        {/* Quick Focus Major Hazards HUD Strip */}
        {majorHighlights.length > 0 && (
          <div
            style={{
              maskImage: isDesktop ? 'none' : 'linear-gradient(to right, black 80%, transparent 100%)',
              WebkitMaskImage: isDesktop ? 'none' : 'linear-gradient(to right, black 80%, transparent 100%)',
            }}
            className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-visible no-scrollbar max-w-[calc(100vw-2rem)] sm:max-w-md py-1 px-1 pr-6"
          >
            <span className="text-[9px] font-mono font-bold tracking-widest text-slate-600 uppercase flex items-center gap-1.5 px-1 shrink-0">
              <Activity className="w-3 h-3 text-slate-700 shrink-0" />
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
                  } else if (item.type === 'hotspot') {
                    setSelectedHotspot(item.data);
                  } else if (item.type === 'volcano') {
                    setSelectedVolcano(item.data);
                  }
                }}
                className="group relative hover:z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50/95 hover:bg-white font-mono text-[10px] tracking-wide shadow-2xs border border-slate-200/90 hover:border-slate-300 text-slate-900 transition-all cursor-pointer active:scale-95 backdrop-blur-md shrink-0 sm:shrink"
                title={
                  lang === 'id'
                    ? `Fokus kamera & buka detail ${item.place} (${item.badge})`
                    : `Focus camera & view details of ${item.place} (${item.badge})`
                }
              >
                {item.type === 'event' ? (
                  <Activity className="w-3 h-3 text-rose-700 shrink-0" />
                ) : item.type === 'volcano' ? (
                  <Mountain className="w-3 h-3 text-red-700 shrink-0" />
                ) : (
                  <Flame className="w-3 h-3 text-amber-700 shrink-0" />
                )}
                <span
                  className={`font-bold ${
                    item.type === 'event'
                      ? 'text-rose-800'
                      : item.type === 'volcano'
                      ? 'text-red-800'
                      : 'text-amber-800'
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

      {/* 6. FLOATING TELEMETRY CONTROLLER DOCK */}
      <FloatingControllerDock
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        hazardMode={hazardMode}
        onHazardModeChange={setHazardMode}
        onResetView={handleRecenterIndonesia}
        onOpenFeed={() => setIsFeedOpen(true)}
        onOpenTimeLapse={handleOpenTimeLapse}
        eventCount={
          hazardMode === 'wildfire'
            ? hotspots.length
            : hazardMode === 'volcano'
            ? volcanoes.length
            : filteredEvents.length
        }
        visible={!isTimeLapseOpen}
        lang={lang}
        magCategory={magCategory}
        onMagCategoryChange={setMagCategory}
        isAudioMuted={isAudioMuted}
        onToggleAudio={handleToggleAudio}
      />

      {/* 7. EVENT DETAIL & BOOKMARK MODAL */}
      <Suspense fallback={null}>
        <EventModal
          event={selectedEvent}
          onClose={() => {
            setSelectedEvent(null);
            setEventModalTab('telemetry');
          }}
          isBookmarked={isEventBookmarked(selectedEvent)}
          onToggleBookmark={handleToggleBookmark}
          onFocusGlobe={(evt) => setTargetFocus([evt.latitude, evt.longitude])}
          onOpenInfographic={(evt) => {
            setInfographicEvent(evt);
            setIsInfographicOpen(true);
          }}
          initialTab={eventModalTab}
          lang={lang}
        />
      </Suspense>

      {/* 8. ACTIVE MULTI-HAZARD FEED DRAWER */}
      <EventsListDrawer
        isOpen={isFeedOpen}
        onClose={() => setIsFeedOpen(false)}
        events={filteredEvents}
        hotspots={hotspots}
        volcanoes={volcanoes}
        activeHazardMode={hazardMode}
        onSelectEvent={(evt) => {
          setSelectedEvent(evt);
          setTargetFocus([evt.latitude, evt.longitude]);
        }}
        onSelectHotspot={(h) => {
          setSelectedHotspot(h);
          setTargetFocus([h.latitude, h.longitude]);
        }}
        onSelectVolcano={(v) => {
          setSelectedVolcano(v);
          setTargetFocus([v.latitude, v.longitude]);
        }}
        isBookmarked={isEventBookmarked}
        onToggleBookmark={handleToggleBookmark}
        lang={lang}
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
        lang={lang}
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
          lang={lang}
          onClose={() => {
            setIsTimeLapseOpen(false);
            setIsTimeLapsePlaying(false);
          }}
        />
      )}

      {/* 11. BMKG OFFICIAL SHAKEMAP MODAL */}
      <Suspense fallback={null}>
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
          time={formattedBMKG?.time || bmkgAlert?.tanggal || (lang === 'id' ? 'Terbaru' : 'Latest')}
          potensi={formattedBMKG?.potensi || bmkgAlert?.potensi || (lang === 'id' ? 'Tidak berpotensi tsunami' : 'No tsunami threat')}
          coordinates={bmkgAlert?.coordinates}
          lang={lang}
        />
      </Suspense>

      {/* 12. DISASTER INFOGRAPHIC SOCIAL CARD GENERATOR */}
      <Suspense fallback={null}>
        <SocialInfographicModal
          isOpen={isInfographicOpen}
          onClose={() => setIsInfographicOpen(false)}
          location={infographicEvent?.place || formattedBMKG?.location || 'Indonesia Archipelago'}
          magnitude={infographicEvent ? (infographicEvent.magnitude ?? '5.0') : (bmkgAlert?.magnitude || '5.0')}
          depth={infographicEvent ? `${infographicEvent.depth} km` : (formattedBMKG?.depth || '10 km')}
          time={infographicEvent ? new Date(infographicEvent.occurred_at).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US') : (formattedBMKG?.time || (lang === 'id' ? 'Terbaru' : 'Latest'))}
          potensi={formattedBMKG?.potensi || (lang === 'id' ? 'Tidak berpotensi tsunami' : 'No tsunami threat')}
          coordinates={infographicEvent ? `${infographicEvent.latitude.toFixed(2)}°, ${infographicEvent.longitude.toFixed(2)}°` : (bmkgAlert?.coordinates || undefined)}
          lang={lang}
        />
      </Suspense>

      {/* 14. VOLCANO ACTIVITY & ASH PLUME MODAL */}
      {selectedVolcano && (
        <Suspense fallback={null}>
          <VolcanoDetailModal
            volcano={selectedVolcano}
            onClose={() => setSelectedVolcano(null)}
            lang={lang}
          />
        </Suspense>
      )}

      {/* 15. TECTONIC EDUCATION MODAL */}
      <TectonicEducationModal
        isOpen={isTectonicModalOpen}
        onClose={() => setIsTectonicModalOpen(false)}
        chapters={storyChapters}
        onFocusSector={(coords) => setTargetFocus(coords)}
        lang={lang}
      />
    </div>
  );
};

export default App;
