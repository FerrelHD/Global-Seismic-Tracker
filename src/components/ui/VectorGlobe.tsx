import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SeismicEvent, WildfireHotspot, HazardMode, RegionalWindData, VolcanoActivity } from '../../types/seismic';
import { fetchNusantaraWindTelemetry, getInterpolatedWind, degreesToCompass } from '../../utils/weatherService';
import { fetchLiveWildfireHotspots } from '../../utils/firmsService';
import { useUserLocation } from '../../hooks/useUserLocation';
import {
  calculateDistanceKm,
  formatWildfireWAMessage,
  openWhatsAppShare,
} from '../../utils/geoProximity';
import { Wind, RefreshCw, Flame, X, MapPin, Navigation, Loader2 } from 'lucide-react';

export interface CameraCoordinates {
  lat: number;
  lon: number;
}

interface VectorGlobeProps {
  events: SeismicEvent[];
  hotspots?: WildfireHotspot[];
  volcanoes?: VolcanoActivity[];
  hazardMode?: HazardMode;
  className?: string;
  speed?: number;
  isRotating?: boolean;
  resetSignal?: number;
  targetFocus?: [number, number] | null;
  onSelectEvent?: (event: SeismicEvent) => void;
  onUpdateHotspots?: (hotspots: WildfireHotspot[]) => void;
  onSelectVolcano?: (volcano: VolcanoActivity | null) => void;
  selectedVolcano?: VolcanoActivity | null;
  interactive?: boolean;
  onCameraChange?: (coords: CameraCoordinates) => void;
  scrollPhi?: number;
  scrollTheta?: number;
  colorMode?: 'magnitude' | 'depth';
  timelapseTimestamp?: number | null;
  scrollZoom?: number | null;
  isPanoramic?: boolean;
  showControls?: boolean;
  controlsProgress?: number | null;
  activeChapterIndex?: number;
  lang?: 'id' | 'en';
  selectedHotspot?: WildfireHotspot | null;
  onSelectHotspot?: (h: WildfireHotspot | null) => void;
}

// Bounding box for Indonesian Archipelago (Nusantara)
const BASE_CENTER_LON = 118.0;
const BASE_CENTER_LAT = -2.2;
const BASE_SPAN_LON = 48.0; // 94°E to 142°E
const BASE_SPAN_LAT = 19.0; // -12°S to 7°N

export interface ChapterSectorConfig {
  coords: [number, number]; // [lat, lon]
  label: string;
  subLabel: string;
  radius: number; // in CSS pixels
}

export const CHAPTER_SECTORS: Record<number, ChapterSectorConfig> = {
  0: {
    coords: [-4.5, 102.0], // Sumatra-Java Trench
    label: 'SECTOR 01 // SUNDA MEGATHRUST ARC',
    subLabel: 'SUBDUCTION ZONE · INDO-AUSTRALIAN CONVERGENCE',
    radius: 250,
  },
  1: {
    coords: [-0.9, 119.8], // Central Sulawesi Transform
    label: 'SECTOR 02 // PALU-KORO TRANSFORM',
    subLabel: 'STRIKE-SLIP SYSTEM · SULAWESI TRIPLE JUNCTION',
    radius: 200,
  },
  2: {
    coords: [-5.5, 129.5], // Deep Banda Sea Arc
    label: 'SECTOR 03 // DEEP BANDA ABYSS',
    subLabel: '180° HORSESHOE OROCLINE · WADATI-BENIOFF SLAB',
    radius: 220,
  },
  3: {
    coords: [-3.8, 138.5], // Papua Highlands & Yapen
    label: 'SECTOR 04 // PAPUA COLLISION BELT',
    subLabel: 'PACIFIC-CAROLINE FRONT · OBLIQUE THRUST OROGENY',
    radius: 240,
  },
};

function cleanPlace(place: string | null): string {
  if (!place) return 'EPICENTER';
  const parts = place.split(' of ');
  const name = parts.length > 1 ? parts[1] : place;
  return name.replace(/,.*$/, '').trim().toUpperCase();
}

function getFRPSeverity(frp: number): { label: string; color: string; bg: string; border: string } {
  if (frp >= 150) return { label: 'EXTREME', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  if (frp >= 80) return { label: 'SEVERE', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
  if (frp >= 40) return { label: 'MODERATE', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  return { label: 'LOW', color: '#ca8a04', bg: '#fefce8', border: '#fef08a' };
}

export const VectorGlobe: React.FC<VectorGlobeProps> = ({
  events,
  hotspots = [],
  volcanoes = [],
  hazardMode = 'dual',
  className = '',
  resetSignal = 0,
  targetFocus = null,
  onSelectEvent,
  onUpdateHotspots,
  onSelectVolcano,
  selectedVolcano: externalSelectedVolcano,
  interactive = true,
  onCameraChange,
  colorMode = 'magnitude',
  timelapseTimestamp = null,
  scrollZoom = null,
  isPanoramic = true,
  showControls = true,
  controlsProgress = null,
  activeChapterIndex = -1,
  lang = 'id',
  selectedHotspot: externalSelectedHotspot,
  onSelectHotspot,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeChapterIndexRef = useRef(activeChapterIndex);
  activeChapterIndexRef.current = activeChapterIndex;

  const spotlightRef = useRef({
    x: 0,
    y: 0,
    radius: 220,
    opacity: 0,
    initialized: false,
  });

  const [islandsData, setIslandsData] = useState<any[]>([]);
  const [worldData, setWorldData] = useState<any[]>([]);

  // Camera Pan & Zoom Refs (Smooth kinetic lerp)
  const panLonRef = useRef(BASE_CENTER_LON);
  const panLatRef = useRef(BASE_CENTER_LAT);
  const targetPanLonRef = useRef(BASE_CENTER_LON);
  const targetPanLatRef = useRef(BASE_CENTER_LAT);

  const zoomRef = useRef(1.0);
  const targetZoomRef = useRef(1.0);
  const [displayZoom, setDisplayZoom] = useState(1.0);

  // Manual Drag Pan state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panAtDragStartRef = useRef<{ lon: number; lat: number }>({ lon: BASE_CENTER_LON, lat: BASE_CENTER_LAT });

  // Tooltip & Hover Refs
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTitleRef = useRef<HTMLSpanElement>(null);
  const tooltipMagRef = useRef<HTMLSpanElement>(null);
  const tooltipDepthRef = useRef<HTMLSpanElement>(null);
  const hoveredEventRef = useRef<SeismicEvent | null>(null);

  const shockwavesContainerRef = useRef<HTMLDivElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseMapKeyRef = useRef<string>('');

  // Wind Telemetry & Live FIRMS Polling
  const [windTelemetry, setWindTelemetry] = useState<RegionalWindData[]>([]);
  const [internalSelectedHotspot, setInternalSelectedHotspot] = useState<WildfireHotspot | null>(null);
  const selectedHotspot = externalSelectedHotspot !== undefined ? externalSelectedHotspot : internalSelectedHotspot;
  const setSelectedHotspot = (h: WildfireHotspot | null) => {
    if (onSelectHotspot) onSelectHotspot(h);
    else setInternalSelectedHotspot(h);
  };
  const [isSyncingFIRMS, setIsSyncingFIRMS] = useState<boolean>(false);
  const [firmsStatus, setFirmsStatus] = useState<string>('NASA FIRMS LIVE');

  // User Geolocation for Proximity Matrix
  const {
    coords: userCoords,
    status: userGeoStatus,
    errorMessage: userGeoError,
    requestLocation: requestUserLocation,
  } = useUserLocation();

  // Close Wildfire Hotspot detail modal on Escape key
  useEffect(() => {
    if (!selectedHotspot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedHotspot(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedHotspot]);

  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;

  const hazardModeRef = useRef(hazardMode);
  hazardModeRef.current = hazardMode;

  const timelapseTimestampRef = useRef(timelapseTimestamp);
  timelapseTimestampRef.current = timelapseTimestamp;

  const onSelectEventRef = useRef(onSelectEvent);
  onSelectEventRef.current = onSelectEvent;

  const onSelectVolcanoRef = useRef(onSelectVolcano);
  onSelectVolcanoRef.current = onSelectVolcano;

  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;

  // Track scrollZoom changes from sticky scroll section
  useEffect(() => {
    if (scrollZoom != null && typeof scrollZoom === 'number') {
      targetZoomRef.current = scrollZoom;
    }
  }, [scrollZoom]);

  // Fetch Open-Meteo Wind Telemetry
  useEffect(() => {
    fetchNusantaraWindTelemetry().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setWindTelemetry(data);
      }
    });
  }, []);

  // Handle Live NASA FIRMS Sync
  const handleSyncFIRMS = async () => {
    setIsSyncingFIRMS(true);
    try {
      const res = await fetchLiveWildfireHotspots(true);
      if (res.hotspots && res.hotspots.length > 0) {
        onUpdateHotspots?.(res.hotspots);
        setFirmsStatus(res.source === 'live_firms' ? 'LIVE FIRMS (VIIRS)' : 'CACHED SYNC');
      }
    } finally {
      setIsSyncingFIRMS(false);
    }
  };

  // Load High-Resolution Indonesia Vector Islands and Neighboring World Countries
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/data/indonesia_islands.json').then((res) => res.json()).catch(() => null),
      fetch('/data/world_countries_110m.json').then((res) => res.json()).catch(() => null),
    ]).then(([indoGeo, worldGeo]) => {
      if (!isMounted) return;
      if (indoGeo?.features) setIslandsData(indoGeo.features);
      if (worldGeo?.features) {
        const neighbors = worldGeo.features.filter(
          (f: any) => f.properties?.name !== 'Indonesia' && f.id !== 'IDN'
        );
        setWorldData(neighbors);
      }
    });
    return () => { isMounted = false; };
  }, []);


  // Major Events for Expanding Sonar Shockwaves (M >= 5.8)
  const majorEvents = useMemo(() => {
    return events.filter((e) => (e.magnitude ?? 0) >= 5.8).slice(0, 3);
  }, [events]);
  const majorEventsRef = useRef<SeismicEvent[]>(majorEvents);
  majorEventsRef.current = majorEvents;

  // Handle Target Focus updates from Storytelling Chapters or Event Selection
  useEffect(() => {
    if (!targetFocus) return;
    const [lat, lon] = targetFocus;
    targetPanLatRef.current = lat;
    targetPanLonRef.current = lon;
    targetZoomRef.current = 1.85;
  }, [targetFocus]);

  // Handle Reset Signal - Reset to Full Nusantara Overview
  useEffect(() => {
    if (resetSignal === 0) return;
    targetPanLonRef.current = BASE_CENTER_LON;
    targetPanLatRef.current = BASE_CENTER_LAT;
    targetZoomRef.current = 1.0;
  }, [resetSignal]);


  // Convert (Lon, Lat) to current canvas screen coordinates [px, py]
  const projectCoords = useCallback((lon: number, lat: number, w: number, h: number): [number, number] => {
    const baseScale = Math.min(w / BASE_SPAN_LON, h / BASE_SPAN_LAT);
    const scale = baseScale * zoomRef.current;
    const px = w / 2 + (lon - panLonRef.current) * scale;
    const py = h / 2 - (lat - panLatRef.current) * scale;
    return [px, py];
  }, []);

  // Proximity Hover Raycasting with AnimationFrame Throttling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scheduled = false;
    let lastPointerEvent: PointerEvent | null = null;

    const checkProximity = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      const isSeismicVisible = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'seismic';
      const isVolcanoVisible = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'volcano';

      // 1. Check if hovering near a volcano
      if (isVolcanoVisible && volcanoes.length > 0) {
        let closestVolc: VolcanoActivity | null = null;
        let minVolcDist = 18;
        let volcX = 0;
        let volcY = 0;

        for (let i = 0; i < volcanoes.length; i++) {
          const v = volcanoes[i];
          const [vx, vy] = projectCoords(v.longitude, v.latitude, w, h);
          const dist = Math.hypot(vx - mouseX, vy - mouseY);
          if (dist < minVolcDist) {
            minVolcDist = dist;
            closestVolc = v;
            volcX = vx;
            volcY = vy;
          }
        }

        if (closestVolc && tooltipRef.current) {
          hoveredEventRef.current = null;
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.transform = `translate3d(${volcX}px, ${volcY}px, 0) translate(-50%, -130%)`;

          if (tooltipTitleRef.current) {
            tooltipTitleRef.current.innerText = closestVolc.name.replace('Gunung ', '').toUpperCase();
          }
          if (tooltipMagRef.current) {
            tooltipMagRef.current.innerText = closestVolc.alert_level;
          }
          if (tooltipDepthRef.current) {
            tooltipDepthRef.current.innerText = `${closestVolc.elevation_m}m`;
          }
          return;
        }
      }

      // 2. Check if hovering near an earthquake
      if (!isSeismicVisible) {
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
        hoveredEventRef.current = null;
        return;
      }

      let closestEvt: SeismicEvent | null = null;
      let minDistance = 22 * Math.min(1.4, Math.max(0.8, zoomRef.current));
      let closestX = 0;
      let closestY = 0;

      const activeEvents = events;
      const currentTimelapse = timelapseTimestampRef.current;

      for (let i = 0; i < activeEvents.length; i++) {
        const item = activeEvents[i];
        if (currentTimelapse != null) {
          const t = new Date(item.occurred_at).getTime();
          if (t > currentTimelapse) continue;
        }

        const [px, py] = projectCoords(item.longitude, item.latitude, w, h);
        const dist = Math.hypot(px - mouseX, py - mouseY);
        if (dist < minDistance) {
          minDistance = dist;
          closestEvt = item;
          closestX = px;
          closestY = py;
        }
      }

      if (closestEvt && tooltipRef.current) {
        hoveredEventRef.current = closestEvt;
        tooltipRef.current.style.display = 'block';
        tooltipRef.current.style.transform = `translate3d(${closestX}px, ${closestY}px, 0) translate(-50%, -130%)`;

        if (tooltipTitleRef.current) {
          tooltipTitleRef.current.innerText = cleanPlace(closestEvt.place);
        }
        if (tooltipMagRef.current) {
          tooltipMagRef.current.innerText = `${closestEvt.magnitude?.toFixed(1) ?? '?'}`;
        }
        if (tooltipDepthRef.current) {
          tooltipDepthRef.current.innerText = `${closestEvt.depth.toFixed(0)}km`;
        }
      } else if (tooltipRef.current) {
        hoveredEventRef.current = null;
        tooltipRef.current.style.display = 'none';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      lastPointerEvent = e;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          if (lastPointerEvent) checkProximity(lastPointerEvent);
        });
      }
    };

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      container.removeEventListener('pointermove', onPointerMove);
    };
  }, [events, projectCoords]);

  // Pointer Drag Pan, Mouse Wheel Zoom, Multi-Touch Pinch Zoom, and Click Select
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let hasDragged = false;
    const activePointers = new Map<number, { x: number; y: number }>();
    let initialPinchDistance = 0;
    let initialZoomAtPinch = 1.0;

    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, [role="button"], input, select, a, [data-interactive="true"], .label-tag')) {
        return;
      }

      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (e.pointerType === 'mouse') {
        // Desktop single-cursor mouse dragging
        isDraggingRef.current = true;
        hasDragged = false;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        panAtDragStartRef.current = { lon: targetPanLonRef.current, lat: targetPanLatRef.current };
        container.style.cursor = 'grabbing';
        try {
          container.setPointerCapture(e.pointerId);
        } catch { }
      } else {
        // Touchscreen: 1 finger is reserved for page scrolling, 2 fingers for map pan & pinch-zoom
        if (activePointers.size === 1) {
          isDraggingRef.current = false;
          hasDragged = false;
          dragStartRef.current = { x: e.clientX, y: e.clientY };
        } else if (activePointers.size === 2) {
          isDraggingRef.current = true;
          hasDragged = true;
          const pts = Array.from(activePointers.values());
          initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          initialZoomAtPinch = targetZoomRef.current;
          dragStartRef.current = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
          panAtDragStartRef.current = { lon: targetPanLonRef.current, lat: targetPanLatRef.current };
          try {
            container.setPointerCapture(e.pointerId);
          } catch { }
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (e.pointerType !== 'mouse') {
        // Touchscreen: 2-finger pinch zoom and pan
        if (activePointers.size >= 2 && initialPinchDistance > 10) {
          const pts = Array.from(activePointers.values());
          // 1. Pinch zoom
          const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          const ratio = currentDist / initialPinchDistance;
          targetZoomRef.current = Math.max(0.75, Math.min(4.5, parseFloat((initialZoomAtPinch * ratio).toFixed(2))));

          // 2. Two-finger pan
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          const dx = midX - dragStartRef.current.x;
          const dy = midY - dragStartRef.current.y;

          const rect = container.getBoundingClientRect();
          const baseScale = Math.min(rect.width / BASE_SPAN_LON, rect.height / BASE_SPAN_LAT);
          const scale = baseScale * zoomRef.current;

          targetPanLonRef.current = panAtDragStartRef.current.lon - dx / scale;
          targetPanLatRef.current = panAtDragStartRef.current.lat + dy / scale;
          hasDragged = true;
        }
        return;
      }

      // Desktop mouse drag
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      if (Math.hypot(dx, dy) > 5) {
        hasDragged = true;
      }

      const rect = container.getBoundingClientRect();
      const baseScale = Math.min(rect.width / BASE_SPAN_LON, rect.height / BASE_SPAN_LAT);
      const scale = baseScale * zoomRef.current;

      targetPanLonRef.current = panAtDragStartRef.current.lon - dx / scale;
      targetPanLatRef.current = panAtDragStartRef.current.lat + dy / scale;
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);

      if (activePointers.size === 0) {
        isDraggingRef.current = false;
        container.style.cursor = interactive ? 'grab' : 'default';
      }

      try {
        container.releasePointerCapture(e.pointerId);
      } catch { }

      if (!hasDragged) {
        const isSeismicVisible = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'seismic';
        const isWildfireVisible = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'wildfire';
        const isVolcanoVisible = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'volcano';

        // Check if user clicked an earthquake
        if (isSeismicVisible && hoveredEventRef.current) {
          onSelectEventRef.current?.(hoveredEventRef.current);
        } else if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;

          let clickedVolcano = false;
          // Check if user clicked a volcano
          if (isVolcanoVisible && volcanoes.length > 0) {
            for (const v of volcanoes) {
              const [vx, vy] = projectCoords(v.longitude, v.latitude, rect.width, rect.height);
              if (Math.hypot(vx - clickX, vy - clickY) < 22) {
                onSelectVolcanoRef.current?.(v);
                clickedVolcano = true;
                break;
              }
            }
          }

          // Check if user clicked a hotspot
          if (!clickedVolcano && isWildfireVisible && hotspots.length > 0) {
            for (const h of hotspots) {
              const [hx, hy] = projectCoords(h.longitude, h.latitude, rect.width, rect.height);
              if (Math.hypot(hx - clickX, hy - clickY) < 18) {
                setSelectedHotspot(h);
                break;
              }
            }
          }
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0018;
      targetZoomRef.current = Math.max(0.75, Math.min(4.5, parseFloat((targetZoomRef.current + delta).toFixed(2))));
    };

    const onDblClick = (e: MouseEvent) => {
      if (!interactive) return;
      e.preventDefault();
      targetZoomRef.current = targetZoomRef.current > 1.5 ? 1.0 : 2.0;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('dblclick', onDblClick);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('dblclick', onDblClick);
    };
  }, [interactive, hotspots, volcanoes, projectCoords]);

  // Main 60fps Planar Vector Rendering Engine
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function render() {
      if (!document.hidden && canvas && ctx && containerRef.current) {
        // Smooth camera lerp
        panLonRef.current += (targetPanLonRef.current - panLonRef.current) * 0.08;
        panLatRef.current += (targetPanLatRef.current - panLatRef.current) * 0.08;
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * 0.10;

        // Sync display state periodically
        if (Math.abs(displayZoom - zoomRef.current) > 0.06) {
          setDisplayZoom(parseFloat(zoomRef.current.toFixed(1)));
        }

        // Emit live camera coordinates
        if (onCameraChangeRef.current) {
          onCameraChangeRef.current({
            lat: parseFloat(panLatRef.current.toFixed(2)),
            lon: parseFloat(panLonRef.current.toFixed(2)),
          });
        }

        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        const isMobile = window.innerWidth < 768;
        const maxDpr = isMobile ? 1.25 : 1.5;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        const project = (lon: number, lat: number): [number, number] => {
          const baseScale = Math.min(w / BASE_SPAN_LON, h / BASE_SPAN_LAT);
          const scale = baseScale * zoomRef.current;
          const px = w / 2 + (lon - panLonRef.current) * scale;
          const py = h / 2 - (lat - panLatRef.current) * scale;
          return [px, py];
        };

        // Offscreen Base Map Caching (Graticules + Landmasses + Subduction Trench)
        // Eliminates re-projecting thousands of GeoJSON vertices every frame at 60fps
        const baseMapKey = `${Math.round(w * dpr)}_${Math.round(h * dpr)}_${zoomRef.current.toFixed(4)}_${panLonRef.current.toFixed(4)}_${panLatRef.current.toFixed(4)}_${worldData.length}_${islandsData.length}`;

        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        const offCanvas = offscreenCanvasRef.current;

        if (baseMapKeyRef.current !== baseMapKey || offCanvas.width !== canvas.width || offCanvas.height !== canvas.height) {
          baseMapKeyRef.current = baseMapKey;
          offCanvas.width = canvas.width;
          offCanvas.height = canvas.height;
          const offCtx = offCanvas.getContext('2d');
          if (offCtx) {
            offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
            offCtx.save();
            offCtx.scale(dpr, dpr);

            // 1. Crisp Architectural Background Graticule Grid
            offCtx.lineWidth = 0.55;
            offCtx.strokeStyle = 'rgba(203, 213, 225, 0.40)';
            offCtx.font = '500 8px "JetBrains Mono", monospace';
            offCtx.fillStyle = '#94a3b8';

            // Longitudes (Meridians)
            for (let lon = 90; lon <= 145; lon += 5) {
              const [gx] = project(lon, 0);
              if (gx >= -10 && gx <= w + 10) {
                offCtx.beginPath();
                offCtx.moveTo(gx, 0);
                offCtx.lineTo(gx, h);
                offCtx.stroke();
                offCtx.fillText(`${lon}°E`, gx + 3, h - 8);
              }
            }

            // Latitudes (Parallels)
            for (let lat = -15; lat <= 10; lat += 5) {
              const [, gy] = project(0, lat);
              if (gy >= -10 && gy <= h + 10) {
                offCtx.beginPath();
                offCtx.moveTo(0, gy);
                offCtx.lineTo(w, gy);
                offCtx.stroke();
                const label = lat === 0 ? '0°' : lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`;
                offCtx.fillText(label, 8, gy - 3);
              }
            }

            // Equator Hairline (0°)
            const [, eqY] = project(0, 0);
            if (eqY >= -10 && eqY <= h + 10) {
              offCtx.save();
              offCtx.setLineDash([4, 4]);
              offCtx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
              offCtx.lineWidth = 0.8;
              offCtx.beginPath();
              offCtx.moveTo(0, eqY);
              offCtx.lineTo(w, eqY);
              offCtx.stroke();
              offCtx.restore();
              offCtx.fillText('EQUATOR 0°', w - 75, eqY - 4);
            }

            // 2. High-Precision GeoJSON Landmasses
            const renderFeatureCollection = (features: any[], fillColor: string, strokeColor: string, lineWidth: number) => {
              offCtx.fillStyle = fillColor;
              offCtx.strokeStyle = strokeColor;
              offCtx.lineWidth = lineWidth;
              offCtx.lineJoin = 'round';
              offCtx.lineCap = 'round';

              for (let f = 0; f < features.length; f++) {
                const geom = features[f]?.geometry;
                if (!geom) continue;
                const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];

                for (let p = 0; p < polys.length; p++) {
                  const poly = polys[p];
                  for (let r = 0; r < poly.length; r++) {
                    const ring = poly[r];
                    if (ring.length < 3) continue;

                    offCtx.beginPath();
                    const [sx, sy] = project(ring[0][0], ring[0][1]);
                    offCtx.moveTo(sx, sy);
                    for (let pt = 1; pt < ring.length; pt++) {
                      const [px, py] = project(ring[pt][0], ring[pt][1]);
                      offCtx.lineTo(px, py);
                    }
                    offCtx.closePath();
                    offCtx.fill();
                    offCtx.stroke();
                  }
                }
              }
            };

            if (worldData.length > 0) renderFeatureCollection(worldData, '#f8fafc', '#cbd5e1', 0.6);
            if (islandsData.length > 0) renderFeatureCollection(islandsData, '#ffffff', '#64748b', 0.85);

            // 3. Sunda Megathrust Subduction Trench Hairline
            offCtx.save();
            offCtx.setLineDash([3, 5]);
            offCtx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
            offCtx.lineWidth = 1.0;
            offCtx.beginPath();
            const trenchCoords = [[93.5, 6], [95, -3], [98.5, -1], [102, -4.5], [107, -8.5], [114, -10.5], [121, -11], [129, -9.5]];
            const [stX, stY] = project(trenchCoords[0][0], trenchCoords[0][1]);
            offCtx.moveTo(stX, stY);
            for (let t = 1; t < trenchCoords.length; t++) {
              const [tx, ty] = project(trenchCoords[t][0], trenchCoords[t][1]);
              offCtx.lineTo(tx, ty);
            }
            offCtx.stroke();
            offCtx.restore();

            offCtx.restore();
          }
        }

        // Blit pre-rendered crisp base map instantly
        ctx.drawImage(offCanvas, 0, 0, w, h);

        const currentTimelapse = timelapseTimestampRef.current;

        // 4a. Live Seismic Event Markers (Crisp 3-tier hierarchy, pulse only for M >= 6.0)
        const isSeismicVisible = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'seismic';
        if (isSeismicVisible) {
          const activeEvents = events;
          const currentMode = colorModeRef.current;
          const now = performance.now();

          for (let i = 0; i < activeEvents.length; i++) {
            const item = activeEvents[i];
            const eventTime = new Date(item.occurred_at).getTime();

            if (currentTimelapse != null && eventTime > currentTimelapse) {
              continue;
            }

            const [px, py] = project(item.longitude, item.latitude);
            if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;

            const mag = item.magnitude ?? 3.5;
            const isMajor = mag >= 6.0;
            const size = isMajor ? 5.5 : mag >= 4.5 ? 3.8 : 2.2;

            let fillColor = '#3b82f6';
            if (currentMode === 'depth') {
              const d = item.depth;
              if (d < 70) fillColor = '#f43f5e';
              else if (d <= 300) fillColor = '#f59e0b';
              else fillColor = '#06b6d4';
            } else {
              fillColor = mag >= 6.0 ? '#ef4444' : mag >= 5.0 ? '#f97316' : '#3b82f6';
            }

            // Fresh event rupture ripple pulse in time-lapse mode
            if (currentTimelapse != null) {
              const ageMs = currentTimelapse - eventTime;
              if (ageMs >= 0 && ageMs < 43200000) {
                const pulseP = (ageMs % 21600000) / 21600000;
                ctx.save();
                ctx.beginPath();
                ctx.arc(px, py, size + pulseP * 20, 0, Math.PI * 2);
                ctx.strokeStyle = fillColor;
                ctx.lineWidth = Math.max(0.4, 1.6 * (1 - pulseP));
                ctx.globalAlpha = (1 - pulseP) * 0.8;
                ctx.stroke();
                ctx.restore();
              }
            } else if (isMajor) {
              // Emergency pulse ring ONLY for M >= 6.0
              const pulse = (Math.sin(now * 0.004 + i) + 1) * 0.5;
              ctx.save();
              ctx.beginPath();
              ctx.arc(px, py, size + 2 + pulse * 6, 0, Math.PI * 2);
              ctx.strokeStyle = fillColor;
              ctx.lineWidth = 0.8 * (1 - pulse * 0.4);
              ctx.globalAlpha = (1 - pulse) * 0.6;
              ctx.stroke();
              ctx.restore();
            }

            // Draw core dot with subtle alpha hierarchy for minor quakes
            ctx.save();
            if (mag < 4.5) {
              ctx.globalAlpha = 0.72;
            }
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();

            // Hairline white boundary ring
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
            ctx.restore();
          }
        }

        // 4b. NASA FIRMS Wildfire Hotspots (Flat high-performance diamond, pulse ONLY for FRP >= 150MW)
        const isWildfireVisible = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'wildfire';
        if (isWildfireVisible) {
          const now = performance.now();

          for (let i = 0; i < hotspots.length; i++) {
            const hItem = hotspots[i];
            const [px, py] = project(hItem.longitude, hItem.latitude);
            if (px < -30 || px > w + 30 || py < -30 || py > h + 30) continue;

            const frp = hItem.frp ?? 30;
            const isEmergencyHotspot = frp >= 150;
            const radius = isEmergencyHotspot ? 5.2 : frp >= 80 ? 4.0 : 2.8;

            let coreColor = '#eab308';
            if (frp >= 150) coreColor = '#dc2626';
            else if (frp >= 80) coreColor = '#ea580c';
            else if (frp >= 40) coreColor = '#f59e0b';

            ctx.save();

            // Pulse ONLY for emergency scale (FRP >= 150 MW)
            if (isEmergencyHotspot) {
              const pulse = (Math.sin(now * 0.004 + i * 1.5) + 1) * 0.5;
              ctx.beginPath();
              ctx.arc(px, py, radius * 2.0 + pulse * 6, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }

            // Technical Diamond Glyph (Vertical Architectural Hazard Diamond ◆)
            const dw = radius * 1.35;
            const dh = radius * 1.85;

            ctx.beginPath();
            ctx.moveTo(px, py - dh);
            ctx.lineTo(px + dw, py);
            ctx.lineTo(px, py + dh);
            ctx.lineTo(px - dw, py);
            ctx.closePath();
            ctx.fillStyle = coreColor;
            ctx.fill();

            // Crisp hairline outer border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.65;
            ctx.stroke();

            // Inner White-Hot Thermal Core for severe hotspots
            if (frp >= 80) {
              const inDw = dw * 0.38;
              const inDh = dh * 0.38;
              ctx.beginPath();
              ctx.moveTo(px, py - inDh);
              ctx.lineTo(px + inDw, py);
              ctx.lineTo(px, py + inDh);
              ctx.lineTo(px - inDw, py);
              ctx.closePath();
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }

            // Precision Crosshair Reticle for Emergency Hotspots (FRP >= 150)
            if (isEmergencyHotspot) {
              ctx.strokeStyle = coreColor;
              ctx.lineWidth = 0.75;
              const tick = dh + 3;
              ctx.beginPath();
              ctx.moveTo(px, py - tick); ctx.lineTo(px, py - dh);
              ctx.moveTo(px, py + dh); ctx.lineTo(px, py + tick);
              ctx.moveTo(px - tick, py); ctx.lineTo(px - dw, py);
              ctx.moveTo(px + dw, py); ctx.lineTo(px + tick, py);
              ctx.stroke();
            }

            ctx.restore();
          }
        }

        // 4c. Active Volcanology Telemetry (PVMBG / MAGMA Indonesia)
        // Level IV (Awas): Pulse halo & permanent text badge
        // Level I - III: Crisp triangle icon, label shown on hover/click only
        const isVolcanoVisible = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'volcano';
        if (isVolcanoVisible && volcanoes.length > 0) {
          const now = performance.now();

          for (let i = 0; i < volcanoes.length; i++) {
            const v = volcanoes[i];
            const [vx, vy] = project(v.longitude, v.latitude);
            if (vx < -50 || vx > w + 50 || vy < -50 || vy > h + 50) continue;

            const isCritical = v.alert_level === 'Level IV';
            const isWarning = v.alert_level === 'Level III';
            const alertColor = isCritical
              ? '#e11d48'
              : isWarning
              ? '#f97316'
              : v.alert_level === 'Level II'
              ? '#eab308'
              : '#10b981';

            // Ash Plume Dispersion Polygon (ONLY for Level IV Awas)
            if (isCritical && v.ash_plume?.dispersion_polygon) {
              const poly = v.ash_plume.dispersion_polygon;
              if (poly.length >= 3) {
                ctx.save();
                ctx.beginPath();
                const [startPx, startPy] = project(poly[0][0], poly[0][1]);
                ctx.moveTo(startPx, startPy);
                for (let p = 1; p < poly.length; p++) {
                  const [px, py] = project(poly[p][0], poly[p][1]);
                  ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = 'rgba(225, 29, 72, 0.12)';
                ctx.fill();
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = 'rgba(225, 29, 72, 0.45)';
                ctx.lineWidth = 0.8;
                ctx.stroke();
                ctx.restore();
              }
            }

            ctx.save();

            // Warning Halo Pulse ONLY for Level IV (Awas)
            if (isCritical) {
              const pulse = (Math.sin(now * 0.004 + i * 1.5) + 1) * 0.5;
              const haloR = 14 + pulse * 8;
              ctx.beginPath();
              ctx.arc(vx, vy, haloR, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(225, 29, 72, 0.18)';
              ctx.fill();
            }

            // Technical Volcano Architectural Triangle Beacon (▲)
            const triSize = isCritical ? 8.5 : isWarning ? 6.8 : 5.2;
            ctx.beginPath();
            ctx.moveTo(vx, vy - triSize * 1.25);
            ctx.lineTo(vx + triSize, vy + triSize * 0.8);
            ctx.lineTo(vx - triSize, vy + triSize * 0.8);
            ctx.closePath();
            ctx.fillStyle = alertColor;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.9;
            ctx.stroke();

            // Inner White Crater Dot
            ctx.beginPath();
            ctx.arc(vx, vy - triSize * 0.1, 1.3, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // Permanent label ONLY for Level IV (Awas, e.g. Lewotobi)
            // Other levels show label in tooltip on hover or detail modal on click
            if (isCritical) {
              const vShortName = v.name.replace('Gunung ', '').toUpperCase();
              ctx.font = '600 8.5px "JetBrains Mono", monospace';
              const labelText = `${vShortName} ▲ FL${v.ash_plume?.cloud_top_fl ?? '300'}`;
              const textMetrics = ctx.measureText(labelText);
              const textW = textMetrics.width;
              const textX = vx - textW / 2;
              const textY = vy + triSize * 0.8 + 10;

              // Background pill for crisp readability on map
              ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
              ctx.fillRect(textX - 3, textY - 7.5, textW + 6, 10);
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(textX - 3, textY - 7.5, textW + 6, 10);

              // Label text
              ctx.fillStyle = alertColor;
              ctx.fillText(labelText, textX, textY);
            }

            ctx.restore();
          }
        }

        // 5c. Scrollytelling Dynamic Sector Spotlight & Precision Geodetic Reticle
        const currentChapter = activeChapterIndexRef.current ?? -1;
        const activeSector = (currentChapter >= 0 && currentChapter <= 3) ? CHAPTER_SECTORS[currentChapter] : null;

        let targetSpotX = w / 2;
        let targetSpotY = h / 2;
        let targetSpotRadius = 220;
        let targetSpotOpacity = 0.0;

        if (activeSector) {
          const [sx, sy] = project(activeSector.coords[1], activeSector.coords[0]);
          targetSpotX = sx;
          targetSpotY = sy;
          targetSpotRadius = activeSector.radius;
          targetSpotOpacity = 1.0;
        }

        if (!spotlightRef.current.initialized && activeSector) {
          spotlightRef.current.x = targetSpotX;
          spotlightRef.current.y = targetSpotY;
          spotlightRef.current.radius = targetSpotRadius;
          spotlightRef.current.opacity = targetSpotOpacity;
          spotlightRef.current.initialized = true;
        } else {
          spotlightRef.current.x += (targetSpotX - spotlightRef.current.x) * 0.08;
          spotlightRef.current.y += (targetSpotY - spotlightRef.current.y) * 0.08;
          spotlightRef.current.radius += (targetSpotRadius - spotlightRef.current.radius) * 0.08;
          spotlightRef.current.opacity += (targetSpotOpacity - spotlightRef.current.opacity) * 0.08;
        }

        const spot = spotlightRef.current;
        const currentSpotOp = spot.opacity;

        if (currentSpotOp > 0.01) {
          // 1. Soft Paper Vignette Mask (dimming non-spotlight background)
          const innerR = Math.max(30, spot.radius * 0.65);
          const outerR = Math.max(innerR + 80, spot.radius * 1.65);

          const radialGrad = ctx.createRadialGradient(
            spot.x, spot.y, innerR,
            spot.x, spot.y, outerR
          );
          radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          radialGrad.addColorStop(0.55, `rgba(255, 255, 255, ${0.36 * currentSpotOp})`);
          radialGrad.addColorStop(1, `rgba(255, 255, 255, ${0.64 * currentSpotOp})`);

          ctx.save();
          ctx.fillStyle = radialGrad;
          ctx.fillRect(0, 0, w, h);

          // 2. High-Precision Technical Geodetic Reticle
          if (currentSpotOp > 0.12) {
            const now = performance.now();
            const pulse = (Math.sin(now * 0.0028) + 1) * 0.5; // 0 to 1
            const reticleRadius = spot.radius * 0.95;

            // Outer Dashed Orbit Ring
            ctx.save();
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, reticleRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(15, 47, 99, ${0.28 * currentSpotOp})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.stroke();

            // Subtle breathing acoustic pulse wave
            const breathingRadius = reticleRadius + pulse * 10;
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, breathingRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(15, 47, 99, ${0.12 * (1 - pulse) * currentSpotOp})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 5]);
            ctx.stroke();
            ctx.restore();

            // Precision Geodetic Crosshair Ticks
            ctx.save();
            ctx.strokeStyle = `rgba(15, 47, 99, ${0.40 * currentSpotOp})`;
            ctx.lineWidth = 1.2;
            const tickLength = 10;

            ctx.beginPath();
            // North
            ctx.moveTo(spot.x, spot.y - reticleRadius - tickLength);
            ctx.lineTo(spot.x, spot.y - reticleRadius + 4);
            // South
            ctx.moveTo(spot.x, spot.y + reticleRadius - 4);
            ctx.lineTo(spot.x, spot.y + reticleRadius + tickLength);
            // West
            ctx.moveTo(spot.x - reticleRadius - tickLength, spot.y);
            ctx.lineTo(spot.x - reticleRadius + 4, spot.y);
            // East
            ctx.moveTo(spot.x + reticleRadius - 4, spot.y);
            ctx.lineTo(spot.x + reticleRadius + tickLength, spot.y);
            ctx.stroke();

            // Micro Center Target Pip
            ctx.beginPath();
            ctx.arc(spot.x, spot.y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(15, 47, 99, ${0.5 * currentSpotOp})`;
            ctx.fill();

            // Architectural Sector Identification Callout Badge
            if (activeSector && currentSpotOp > 0.40) {
              const badgeAngle = -Math.PI / 4; // 45 deg NE
              const rawBx = spot.x + Math.cos(badgeAngle) * reticleRadius + 16;
              const rawBy = spot.y + Math.sin(badgeAngle) * reticleRadius - 12;

              const badgeW = 220;
              const badgeH = 34;
              const clampedBx = Math.max(16, Math.min(w - badgeW - 16, rawBx));
              const clampedBy = Math.max(20, Math.min(h - badgeH - 16, rawBy));

              // Dotted Hairline Pointer from ring to badge
              ctx.beginPath();
              ctx.moveTo(spot.x + Math.cos(badgeAngle) * reticleRadius, spot.y + Math.sin(badgeAngle) * reticleRadius);
              ctx.lineTo(clampedBx, clampedBy + 12);
              ctx.strokeStyle = `rgba(15, 47, 99, ${0.35 * currentSpotOp})`;
              ctx.lineWidth = 0.8;
              ctx.setLineDash([2, 3]);
              ctx.stroke();
              ctx.setLineDash([]);

              // Badge Card Background (Swiss Minimalist Editorial)
              ctx.fillStyle = `rgba(255, 255, 255, ${0.94 * currentSpotOp})`;
              ctx.strokeStyle = `rgba(203, 213, 225, ${0.85 * currentSpotOp})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(clampedBx, clampedBy, badgeW, badgeH, 6);
              } else {
                ctx.rect(clampedBx, clampedBy, badgeW, badgeH);
              }
              ctx.fill();
              ctx.stroke();

              // Active Beacon Dot
              ctx.beginPath();
              ctx.arc(clampedBx + 12, clampedBy + 17, 3, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(15, 47, 99, ${0.9 * currentSpotOp})`;
              ctx.fill();

              // Badge Text: Primary & Secondary
              ctx.font = '700 8.5px "JetBrains Mono", monospace';
              ctx.fillStyle = `rgba(15, 23, 42, ${0.95 * currentSpotOp})`;
              ctx.fillText(activeSector.label, clampedBx + 22, clampedBy + 14);

              ctx.font = '500 7px "Inter", sans-serif';
              ctx.fillStyle = `rgba(100, 116, 139, ${0.9 * currentSpotOp})`;
              ctx.fillText(activeSector.subLabel, clampedBx + 22, clampedBy + 25);
            }

            ctx.restore();
          }

          ctx.restore();
        }

        ctx.restore();


        // 7. Sonar Shockwaves for Major Earthquakes
        if (shockwavesContainerRef.current) {
          const shockwaveChildren = shockwavesContainerRef.current.children;
          const mItems = majorEventsRef.current;
          const isSeismicActive = hazardModeRef.current === 'dual' || hazardModeRef.current === 'all' || hazardModeRef.current === 'seismic';

          if (!isSeismicActive) {
            for (let i = 0; i < shockwaveChildren.length; i++) {
              (shockwaveChildren[i] as HTMLElement).style.opacity = '0';
            }
          } else {
            for (let i = 0; i < mItems.length && i < shockwaveChildren.length; i++) {
              const item = mItems[i];
              const el = shockwaveChildren[i] as HTMLElement;
              const [px, py] = project(item.longitude, item.latitude);

              if (px >= 0 && px <= w && py >= 0 && py <= h) {
                el.style.opacity = '1';
                el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
              } else {
                el.style.opacity = '0';
              }
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [islandsData, worldData, events, hotspots, volcanoes, displayZoom]);

  return (
    <div
      ref={containerRef}
      style={{
        cursor: interactive ? 'grab' : 'default',
        touchAction: interactive ? 'pan-y' : 'auto',
        maskImage: isPanoramic
          ? 'radial-gradient(ellipse 90% 75% at 50% 50%, black 50%, rgba(0,0,0,0.85) 68%, rgba(0,0,0,0.2) 88%, transparent 100%)'
          : 'none',
        WebkitMaskImage: isPanoramic
          ? 'radial-gradient(ellipse 90% 75% at 50% 50%, black 50%, rgba(0,0,0,0.85) 68%, rgba(0,0,0,0.2) 88%, transparent 100%)'
          : 'none',
      }}
      className={`relative w-full h-full select-none flex items-center justify-center will-change-transform ${className}`}
    >
      {/* 1. Vector Map Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', touchAction: interactive ? 'pan-y' : 'auto' }}
      />

      {/* 2. Expanding Sonar Shockwave Rings on Major Earthquakes (M >= 5.8) */}
      <div ref={shockwavesContainerRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        {majorEvents.map((evt) => (
          <div
            key={`shockwave-${evt.usgs_id || evt.id}`}
            className="absolute top-0 left-0 transition-opacity duration-300 pointer-events-none"
            style={{ opacity: 0 }}
          >
            <span className="relative flex items-center justify-center">
              <span className="absolute w-14 h-14 rounded-full border border-rose-500/50 animate-ping duration-1000" />
              <span className="absolute w-8 h-8 rounded-full border border-rose-400/60 animate-pulse" />
              <span className="relative w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
            </span>
          </div>
        ))}
      </div>


      {/* 4. Precision Micro-Telemetry Tooltip Reticle */}
      <div
        ref={tooltipRef}
        style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
        className="z-30 pointer-events-none will-change-transform"
      >
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/92 text-white font-mono text-[11px] shadow-xl border border-slate-800 whitespace-nowrap backdrop-blur-xl">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span ref={tooltipMagRef} className="font-bold text-white tabular-nums">
            5.0
          </span>
          <span className="text-slate-600 font-light">|</span>
          <span
            ref={tooltipTitleRef}
            className="font-medium text-slate-200 tracking-wide truncate max-w-[200px]"
          >
            Location
          </span>
          <span className="text-slate-600 font-light">·</span>
          <span ref={tooltipDepthRef} className="text-slate-400 tabular-nums">
            10km
          </span>
        </div>
      </div>

      {/* 5. Floating Top Instrument Bar (Minimalist & Clean) */}
      {(() => {
        const effP = controlsProgress != null ? controlsProgress : (showControls ? 1 : 0);
        const isScrollDriven = controlsProgress != null;
        return (
          <div
            style={{
              opacity: effP,
              filter: effP < 0.99 ? `blur(${(1 - effP) * 6}px)` : 'none',
              transform: `translate(-50%, -${(1 - effP) * 14}px)`,
              transition: isScrollDriven ? 'none' : 'opacity 200ms ease-out, filter 200ms ease-out, transform 200ms ease-out',
              willChange: 'opacity, transform, filter',
              pointerEvents: effP > 0.4 ? 'auto' : 'none',
              visibility: effP <= 0.001 ? 'hidden' : 'visible',
            }}
            className="absolute top-2.5 left-1/2 z-30 hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-lg px-2.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.06)] font-mono text-[9.5px] select-none max-w-[92vw] overflow-x-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Live NASA FIRMS Status */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100/90 text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">{firmsStatus}</span>
              <button
                type="button"
                onClick={handleSyncFIRMS}
                disabled={isSyncingFIRMS}
                title="Poll Live NASA FIRMS"
                className="p-0.5 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncingFIRMS ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* 7. Wildfire Hotspot Detail Modal (Liquid Glass Style) */}
      {selectedHotspot && typeof document !== 'undefined' && createPortal(
        (() => {
          const sev = getFRPSeverity(selectedHotspot.frp);
          const ageH = (Date.now() - new Date(selectedHotspot.detected_at).getTime()) / 3_600_000;
          const wind = getInterpolatedWind(selectedHotspot.latitude, selectedHotspot.longitude, windTelemetry);
          const driftCompass = degreesToCompass((wind.windDirection + 180) % 360);

          // Geodesic distance from user
          const hotspotDistKm = userCoords
            ? calculateDistanceKm(
                userCoords.latitude,
                userCoords.longitude,
                selectedHotspot.latitude,
                selectedHotspot.longitude
              )
            : null;

          // FRP Gauge Stratum (clamped 0 - 200 MW)
          const frpClamped = Math.max(0, Math.min(200, selectedHotspot.frp));
          const frpPct = Math.max(6, Math.min(94, 100 - (frpClamped / 200) * 100));

          const latDir = selectedHotspot.latitude >= 0 ? 'N' : 'S';
          const lonDir = selectedHotspot.longitude >= 0 ? 'E' : 'W';
          const formattedCoords = `${Math.abs(selectedHotspot.latitude).toFixed(3)}° ${latDir}, ${Math.abs(selectedHotspot.longitude).toFixed(3)}° ${lonDir}`;

          const dateObj = new Date(selectedHotspot.detected_at);
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
              onClick={() => setSelectedHotspot(null)}
              onWheel={(e) => e.stopPropagation()}
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/25 backdrop-blur-xs select-none animate-in fade-in duration-200"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
                data-lenis-prevent="true"
                className="w-full max-w-[560px] max-h-[88vh] overflow-y-auto my-auto rounded-3xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {/* Container Liquid Glass Native */}
                <div className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/90 select-none bg-white/85 backdrop-blur-2xl relative overflow-hidden ring-1 ring-black/[0.04]">
                  {/* Technical Corner Crosshairs */}
                  <span className="absolute top-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┌</span>
                  <span className="absolute top-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┐</span>
                  <span className="absolute bottom-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">└</span>
                  <span className="absolute bottom-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┘</span>

                  {/* 1. HEADER ROW */}
                  <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />
                        <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold truncate">
                          THERMAL SPECIMEN // {selectedHotspot.satellite} - {(selectedHotspot.id || '').slice(0, 8)}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-sans font-black text-slate-950 tracking-tight leading-snug truncate uppercase">
                        {selectedHotspot.island} REGION
                      </h2>
                      <p className="text-xs text-slate-500 font-mono mt-0.5 truncate tracking-wide uppercase">
                        VIIRS THERMAL ANOMALY // SATELLITE TELEMETRY
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedHotspot(null)}
                      title="Close readout"
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-all cursor-pointer shrink-0 mt-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 2. SCIENTIFIC VISUALIZATION MATRIX */}
                  <div className="py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-4 border-b border-slate-100">
                    {/* Left Col: Numeric FRP + Segmented Meter + Plume Box */}
                    <div className="sm:col-span-7 flex flex-col justify-between">
                      <div>
                        <div className="flex items-baseline gap-2.5">
                          <span
                            className="text-5xl sm:text-6xl font-mono font-black tracking-tighter tabular-nums"
                            style={{ color: sev.color }}
                          >
                            {selectedHotspot.frp}
                          </span>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-widest uppercase">
                              POWER (MW)
                            </span>
                            <span className="text-xs font-mono font-medium text-slate-600 mt-0.5 block tracking-wide">
                              {sev.label} ANOMALY
                            </span>
                          </div>
                        </div>

                        {/* Segmented Radiative Energy Scale */}
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider mb-1 uppercase">
                            <span>RADIATIVE SCALE</span>
                            <span className="font-semibold text-slate-700">{selectedHotspot.frp} MW FLUX</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {[20, 40, 60, 80, 100, 120, 140, 160, 180, 200].map((step) => {
                              const isActive = selectedHotspot.frp >= step * 0.75;
                              const isPeak = selectedHotspot.frp >= step;
                              return (
                                <div
                                  key={step}
                                  className={`h-1.5 flex-1 rounded-xs transition-all ${isPeak
                                      ? 'shadow-xs'
                                      : isActive
                                        ? 'opacity-80'
                                        : 'bg-slate-100 border border-slate-200/60'
                                    }`}
                                  style={{
                                    backgroundColor: isPeak || isActive ? sev.color : undefined,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Wind Drift Vector Telemetry */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100/80">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider mb-1 uppercase">
                          <div className="flex items-center gap-1.5">
                            <Wind className="w-3 h-3 text-slate-400" />
                            <span>PLUME DRIFT VECTOR</span>
                          </div>
                          <span className="text-orange-600 font-semibold">
                            TOWARD {driftCompass}
                          </span>
                        </div>
                        <div className="w-full h-9 bg-slate-50/80 rounded-lg border border-slate-100 flex items-center justify-between px-2.5 text-[10px] font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-slate-500">WIND:</span>
                            <span className="text-slate-800 font-bold">{wind.windSpeed.toFixed(1)} km/h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">BEARING:</span>
                            <span className="text-slate-800 font-bold">{degreesToCompass(wind.windDirection)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Col: FRP Stratum Gauge */}
                    <div className="sm:col-span-5 bg-slate-50/90 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider uppercase">
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-slate-400" />
                          <span>CONFIDENCE</span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono text-xs uppercase">
                          {String(selectedHotspot.confidence || 'HIGH')}
                        </span>
                      </div>

                      {/* Vertical Stratum Meter Bar */}
                      <div className="my-1.5 flex gap-2.5 items-center">
                        <div className="relative w-3.5 h-24 bg-slate-200/80 rounded-full overflow-hidden shrink-0 border border-slate-300/60">
                          {/* Extreme zone */}
                          <div className="absolute top-0 inset-x-0 h-[25%] bg-rose-200/90 border-b border-rose-300/40" />
                          {/* Severe zone */}
                          <div className="absolute top-[25%] inset-x-0 h-[35%] bg-orange-200/90 border-b border-orange-300/40" />
                          {/* Moderate zone */}
                          <div className="absolute top-[60%] inset-x-0 h-[20%] bg-amber-100/90 border-b border-amber-300/40" />
                          {/* Low zone */}
                          <div className="absolute top-[80%] inset-x-0 bottom-0 bg-yellow-100/90" />

                          {/* Target Indicator Pin */}
                          <div
                            style={{ top: `${frpPct}%` }}
                            className="absolute inset-x-0 h-1 bg-slate-950 -translate-y-1/2 shadow-xs transition-all"
                          />
                        </div>

                        {/* Stratum Labels & MW Ticks */}
                        <div className="flex flex-col justify-between h-24 font-mono text-[9px] tracking-tight text-slate-500 leading-tight">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">&gt;150 MW</span>
                            <span className="text-slate-400">EXTREME</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">80 MW</span>
                            <span className="text-slate-400">SEVERE</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">40 MW</span>
                            <span className="text-slate-400">MODERATE</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">0 MW</span>
                            <span className="text-slate-400">SURFACE</span>
                          </div>
                        </div>
                      </div>

                      {/* Sensor Pill Tag */}
                      <div className="pt-1.5 border-t border-slate-200/60">
                        <span className="text-[8px] font-mono font-bold tracking-wider text-slate-700 uppercase block truncate">
                          SENSOR: {selectedHotspot.satellite}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2.5 LIVE PROXIMITY & SMOKE DRIFT MATRIX (LIQUID GLASS STYLE) */}
                  <div className="my-3 p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs backdrop-blur-md relative overflow-hidden">
                    {userGeoStatus !== 'granted' || !userCoords || hotspotDistKm == null ? (
                      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-orange-700" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono font-bold text-slate-800 block tracking-wider uppercase">
                              CEK JARAK DARI LOKASI SAYA
                            </span>
                            <span className="text-[9px] font-mono text-slate-500 block truncate">
                              Hitung jarak langsung ke titik api & pantau sebaran asap
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={requestUserLocation}
                          disabled={userGeoStatus === 'requesting'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-semibold tracking-wider transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs"
                        >
                          {userGeoStatus === 'requesting' ? (
                            <>
                              <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />
                              <span>MENGUKUR...</span>
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 text-orange-300" />
                              <span>UKUR SEKARANG</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                            </span>
                            <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-700">
                              JARAK TITIK API KE LOKASI ANDA
                            </span>
                          </div>
                          <span className="text-[12px] font-mono font-black tabular-nums text-slate-950 bg-white/95 px-2 py-0.5 rounded-md border border-slate-200/90 shadow-2xs">
                            ~{hotspotDistKm.toLocaleString('id-ID')} KM
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-start gap-2.5">
                          <div className="w-1.5 self-stretch rounded-full shrink-0 bg-orange-500" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm text-white bg-orange-600">
                                ASAP MENUJU {driftCompass}
                              </span>
                              <span className="text-[10.5px] font-mono font-bold text-slate-800">
                                Kecepatan Angin {wind.windSpeed.toFixed(1)} km/h
                              </span>
                            </div>
                            <p className="text-[9.5px] font-mono text-slate-600 mt-1 leading-snug">
                              {hotspotDistKm < 100
                                ? 'Perhatian: Titik api terdeteksi dalam radius dekat (<100 km). Waspadai potensi penurunan kualitas udara / kabut asap.'
                                : 'Titik api berada di luar radius pemukiman dekat Anda. Pantau arah angin untuk potensi sebaran asap regional.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {userGeoError && (
                      <p className="text-[9px] font-mono text-rose-600 mt-1.5">{userGeoError}</p>
                    )}
                  </div>

                  {/* 3. TECHNICAL METRICS FOOTER */}
                  <div className="py-2.5 space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider">TIMESTAMP:</span>
                      <span className="text-slate-800 text-[11px] font-medium tracking-wide">
                        {formattedDate} · {formattedTime} <span className="text-slate-400">({ageH < 1 ? 'Just now' : `${Math.round(ageH)}h ago`})</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider">COORDINATES:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-[11px] tracking-wider">{formattedCoords}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            navigator.clipboard.writeText(`${selectedHotspot.latitude.toFixed(4)}, ${selectedHotspot.longitude.toFixed(4)}`);
                            const el = e.currentTarget;
                            el.classList.add('text-emerald-600');
                            setTimeout(() => el.classList.remove('text-emerald-600'), 1500);
                          }}
                          title="Copy Lat, Lon"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4. ACTION CONTROLS DOCK */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          targetPanLonRef.current = selectedHotspot.longitude;
                          targetPanLatRef.current = selectedHotspot.latitude;
                          targetZoomRef.current = 2.4;
                          setSelectedHotspot(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-900 text-[10.5px] font-mono font-semibold tracking-wider transition-all cursor-pointer shadow-2xs border border-slate-200/70"
                      >
                        <svg className="w-3.5 h-3.5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                        </svg>
                        <span>FOCUS MAP</span>
                      </button>

                      {/* WhatsApp One-Click Broadcast */}
                      <button
                        type="button"
                        onClick={() => {
                          const msg = formatWildfireWAMessage(
                            selectedHotspot,
                            {
                              windSpeed: wind.windSpeed,
                              windDirection: wind.windDirection,
                              driftCompass,
                            },
                            hotspotDistKm ?? undefined
                          );
                          openWhatsAppShare(msg);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10.5px] font-mono font-bold tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
                        title="Bagikan Ringkasan Laporan Titik Api ke WhatsApp"
                      >
                        <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                        </svg>
                        <span>WHATSAPP</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://firms.modaps.eosdis.nasa.gov/map/#d:today;@${selectedHotspot.longitude},${selectedHotspot.latitude},11z`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-950 text-[11px] font-mono font-medium tracking-wider transition-all border border-slate-200/60"
                      >
                        <span>FIRMS VIIRS</span>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>

                      <button
                        type="button"
                        onClick={() => setSelectedHotspot(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold tracking-wider transition-all cursor-pointer bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                      >
                        <span>DISMISS</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};
