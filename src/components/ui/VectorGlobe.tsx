import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { SeismicEvent, WildfireHotspot, HazardMode, RegionalWindData } from '../../types/seismic';
import { fetchNusantaraWindTelemetry, getInterpolatedWind, degreesToCompass } from '../../utils/weatherService';
import { fetchLiveWildfireHotspots } from '../../utils/firmsService';
import { Wind, RefreshCw, Flame, X } from 'lucide-react';

export interface CameraCoordinates {
  lat: number;
  lon: number;
}

interface VectorGlobeProps {
  events: SeismicEvent[];
  hotspots?: WildfireHotspot[];
  hazardMode?: HazardMode;
  className?: string;
  speed?: number;
  isRotating?: boolean;
  resetSignal?: number;
  targetFocus?: [number, number] | null;
  onSelectEvent?: (event: SeismicEvent) => void;
  onUpdateHotspots?: (hotspots: WildfireHotspot[]) => void;
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
  hazardMode = 'dual',
  className = '',
  resetSignal = 0,
  targetFocus = null,
  onSelectEvent,
  onUpdateHotspots,
  interactive = true,
  onCameraChange,
  colorMode = 'magnitude',
  timelapseTimestamp = null,
  scrollZoom = null,
  isPanoramic = true,
  showControls = true,
  controlsProgress = null,
  activeChapterIndex = -1,
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

  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const shockwavesContainerRef = useRef<HTMLDivElement>(null);

  // Wind Telemetry & Live FIRMS Polling
  const [windTelemetry, setWindTelemetry] = useState<RegionalWindData[]>([]);
  const [showWindPlume, setShowWindPlume] = useState<boolean>(true);
  const [selectedHotspot, setSelectedHotspot] = useState<WildfireHotspot | null>(null);
  const [isSyncingFIRMS, setIsSyncingFIRMS] = useState<boolean>(false);
  const [firmsStatus, setFirmsStatus] = useState<string>('NASA FIRMS LIVE');

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

  // Top Major Events for Floating Data Flag Badges
  const topEvents = useMemo(() => {
    if (events.length === 0) return [];
    const valid = events.filter((e) => e.magnitude != null);
    const sorted = [...valid].sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0));
    return sorted.slice(0, 4);
  }, [events]);
  const topEventsRef = useRef<SeismicEvent[]>(topEvents);
  topEventsRef.current = topEvents;

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

  // Zoom control actions
  const handleZoomIn = () => {
    targetZoomRef.current = Math.min(4.5, parseFloat((targetZoomRef.current + 0.35).toFixed(2)));
  };

  const handleZoomOut = () => {
    targetZoomRef.current = Math.max(0.75, parseFloat((targetZoomRef.current - 0.35).toFixed(2)));
  };

  const handleZoomReset = () => {
    targetPanLonRef.current = BASE_CENTER_LON;
    targetPanLatRef.current = BASE_CENTER_LAT;
    targetZoomRef.current = 1.0;
  };

  const focusIsland = (island: 'all' | 'sumatra' | 'kalimantan' | 'sulawesi' | 'papua') => {
    if (island === 'all') {
      targetPanLonRef.current = BASE_CENTER_LON;
      targetPanLatRef.current = BASE_CENTER_LAT;
      targetZoomRef.current = 1.0;
    } else if (island === 'sumatra') {
      targetPanLonRef.current = 101.5;
      targetPanLatRef.current = 0.5;
      targetZoomRef.current = 2.4;
    } else if (island === 'kalimantan') {
      targetPanLonRef.current = 113.5;
      targetPanLatRef.current = -1.8;
      targetZoomRef.current = 2.2;
    } else if (island === 'sulawesi') {
      targetPanLonRef.current = 121.5;
      targetPanLatRef.current = -2.0;
      targetZoomRef.current = 2.4;
    } else if (island === 'papua') {
      targetPanLonRef.current = 138.0;
      targetPanLatRef.current = -4.5;
      targetZoomRef.current = 2.0;
    }
  };

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
      if (target && target.closest('button, [role="button"], input, select, a, [data-interactive="true"]')) {
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
        // Check if user clicked an earthquake
        if (hoveredEventRef.current) {
          onSelectEventRef.current?.(hoveredEventRef.current);
        } else if (containerRef.current && hotspots.length > 0) {
          // Check if user clicked a hotspot
          const rect = containerRef.current.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          for (const h of hotspots) {
            const [hx, hy] = projectCoords(h.longitude, h.latitude, rect.width, rect.height);
            if (Math.hypot(hx - clickX, hy - clickY) < 18) {
              setSelectedHotspot(h);
              break;
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
  }, [interactive, hotspots, projectCoords]);

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

        // 1. Crisp Architectural Background Graticule Grid
        ctx.lineWidth = 0.55;
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.40)';
        ctx.font = '500 8px "JetBrains Mono", monospace';
        ctx.fillStyle = '#94a3b8';

        // Longitudes (Meridians)
        for (let lon = 90; lon <= 145; lon += 5) {
          const [gx] = project(lon, 0);
          if (gx >= -10 && gx <= w + 10) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
            ctx.fillText(`${lon}°E`, gx + 3, h - 8);
          }
        }

        // Latitudes (Parallels)
        for (let lat = -15; lat <= 10; lat += 5) {
          const [, gy] = project(0, lat);
          if (gy >= -10 && gy <= h + 10) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
            const label = lat === 0 ? '0°' : lat > 0 ? `${lat}°N` : `${Math.abs(lat)}°S`;
            ctx.fillText(label, 8, gy - 3);
          }
        }

        // Equator Hairline (0°)
        const [, eqY] = project(0, 0);
        if (eqY >= -10 && eqY <= h + 10) {
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(0, eqY);
          ctx.lineTo(w, eqY);
          ctx.stroke();
          ctx.restore();
          ctx.fillText('EQUATOR 0°', w - 75, eqY - 4);
        }

        // 2. High-Precision GeoJSON Landmasses
        const renderFeatureCollection = (features: any[], fillColor: string, strokeColor: string, lineWidth: number) => {
          ctx.fillStyle = fillColor;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          for (let f = 0; f < features.length; f++) {
            const geom = features[f]?.geometry;
            if (!geom) continue;
            const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];

            for (let p = 0; p < polys.length; p++) {
              const poly = polys[p];
              for (let r = 0; r < poly.length; r++) {
                const ring = poly[r];
                if (ring.length < 3) continue;

                ctx.beginPath();
                const [sx, sy] = project(ring[0][0], ring[0][1]);
                ctx.moveTo(sx, sy);
                for (let pt = 1; pt < ring.length; pt++) {
                  const [px, py] = project(ring[pt][0], ring[pt][1]);
                  ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
              }
            }
          }
        };

        if (worldData.length > 0) renderFeatureCollection(worldData, '#f8fafc', '#cbd5e1', 0.6);
        if (islandsData.length > 0) renderFeatureCollection(islandsData, '#ffffff', '#64748b', 0.85);

        // 3. Sunda Megathrust Subduction Trench Hairline
        ctx.save();
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        const trenchCoords = [[93.5, 6], [95, -3], [98.5, -1], [102, -4.5], [107, -8.5], [114, -10.5], [121, -11], [129, -9.5]];
        const [stX, stY] = project(trenchCoords[0][0], trenchCoords[0][1]);
        ctx.moveTo(stX, stY);
        for (let t = 1; t < trenchCoords.length; t++) {
          const [tx, ty] = project(trenchCoords[t][0], trenchCoords[t][1]);
          ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        ctx.restore();

        // 4. Kinetic Dispersing Smoke Plume & Wind Vector Telemetry (Open-Meteo)
        if (showWindPlume && hazardModeRef.current !== 'seismic') {
          const now = performance.now();

          for (let i = 0; i < hotspots.length; i++) {
            const hItem = hotspots[i];
            const [px, py] = project(hItem.longitude, hItem.latitude);
            if (px < -80 || px > w + 80 || py < -80 || py > h + 80) continue;

            const wind = getInterpolatedWind(hItem.latitude, hItem.longitude, windTelemetry);
            const rad = ((wind.windDirection + 180) % 360) * (Math.PI / 180);
            const frp = hItem.frp ?? 30;
            const currentZoom = Math.sqrt(zoomRef.current);
            const plumeLen = Math.max(26, Math.min(105, (wind.windSpeed * 1.8 + Math.sqrt(frp) * 2.8) * currentZoom));

            const endX = px + Math.sin(rad) * plumeLen;
            const endY = py - Math.cos(rad) * plumeLen;

            // Perpendicular unit vector (normal to drift direction)
            const nx = Math.cos(rad);
            const ny = Math.sin(rad);

            const wStart = Math.max(2, Math.min(5, Math.sqrt(frp) * 0.35 * currentZoom));
            const wEnd = Math.max(10, Math.min(26, plumeLen * 0.26));

            ctx.save();

            // 4a. Dispersing Atmospheric Smoke Cone
            const coneGrad = ctx.createLinearGradient(px, py, endX, endY);
            coneGrad.addColorStop(0, 'rgba(239, 68, 68, 0.40)');
            coneGrad.addColorStop(0.22, 'rgba(249, 115, 22, 0.24)');
            coneGrad.addColorStop(0.65, 'rgba(148, 163, 184, 0.14)');
            coneGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');

            ctx.beginPath();
            ctx.moveTo(px - nx * wStart, py - ny * wStart);
            ctx.lineTo(endX - nx * wEnd, endY - ny * wEnd);
            ctx.quadraticCurveTo(endX, endY, endX + nx * wEnd, endY + ny * wEnd);
            ctx.lineTo(px + nx * wStart, py + ny * wStart);
            ctx.closePath();
            ctx.fillStyle = coneGrad;
            ctx.fill();

            // 4b. Animated Kinetic Flow Streamlines (Dashed Streaks drifting downwind)
            const flowSpeed = (wind.windSpeed * 0.035 + 0.35);
            const dashOffset = -(now * flowSpeed * 0.04);

            // Centerline streamline
            ctx.setLineDash([7, 6]);
            ctx.lineDashOffset = dashOffset;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            // Flanking left streamline
            ctx.setLineDash([5, 7]);
            ctx.lineDashOffset = dashOffset * 0.9 + 4;
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(px - nx * (wStart * 0.5), py - ny * (wStart * 0.5));
            ctx.lineTo(endX - nx * (wEnd * 0.55), endY - ny * (wEnd * 0.55));
            ctx.stroke();

            // Flanking right streamline
            ctx.setLineDash([6, 8]);
            ctx.lineDashOffset = dashOffset * 1.1 + 8;
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(px + nx * (wStart * 0.5), py + ny * (wStart * 0.5));
            ctx.lineTo(endX + nx * (wEnd * 0.55), endY + ny * (wEnd * 0.55));
            ctx.stroke();

            // 4c. Aerodynamic Micro Wind Vector Arrow at Tip
            ctx.setLineDash([]);
            const arrowLen = Math.max(4, Math.min(8, 5 * currentZoom));
            const arrowRad1 = rad + Math.PI * 0.82;
            const arrowRad2 = rad - Math.PI * 0.82;
            ctx.beginPath();
            ctx.moveTo(endX + Math.sin(arrowRad1) * arrowLen, endY - Math.cos(arrowRad1) * arrowLen);
            ctx.lineTo(endX, endY);
            ctx.lineTo(endX + Math.sin(arrowRad2) * arrowLen, endY - Math.cos(arrowRad2) * arrowLen);
            ctx.strokeStyle = 'rgba(234, 88, 12, 0.75)';
            ctx.lineWidth = 1.1;
            ctx.stroke();

            ctx.restore();
          }
        }

        const currentTimelapse = timelapseTimestampRef.current;

        // 5a. Live Seismic Event Markers
        if (hazardModeRef.current !== 'wildfire') {
          const activeEvents = events;
          const currentMode = colorModeRef.current;

          for (let i = 0; i < activeEvents.length; i++) {
            const item = activeEvents[i];
            const eventTime = new Date(item.occurred_at).getTime();

            if (currentTimelapse != null && eventTime > currentTimelapse) {
              continue;
            }

            const [px, py] = project(item.longitude, item.latitude);
            if (px < -20 || px > w + 20 || py < -20 || py > h + 20) continue;

            const mag = item.magnitude ?? 3.5;
            const size = Math.max(2.5, Math.min(7.0, (mag / 7.0) * 6.0));

            let fillColor = '#3b82f6';
            if (currentMode === 'depth') {
              const d = item.depth;
              if (d < 70) fillColor = '#f43f5e';
              else if (d <= 300) fillColor = '#f59e0b';
              else fillColor = '#06b6d4';
            } else {
              fillColor = mag >= 5.5 ? '#ef4444' : '#3b82f6';
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
            }

            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();

            // Hairline white ring
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
          }
        }

        // 5b. NASA FIRMS Wildfire Hotspots (Technical Diamond Reticle & Thermal Core)
        if (hazardModeRef.current !== 'seismic') {
          const now = performance.now();

          for (let i = 0; i < hotspots.length; i++) {
            const hItem = hotspots[i];
            const [px, py] = project(hItem.longitude, hItem.latitude);
            if (px < -30 || px > w + 30 || py < -30 || py > h + 30) continue;

            const frp = hItem.frp ?? 30;
            const radius = Math.min(7.5, Math.max(2.8, Math.sqrt(frp) * 0.45));

            let coreColor = '#eab308';
            let haloColor = 'rgba(234, 179, 8, 0.22)';
            if (frp >= 150) { coreColor = '#dc2626'; haloColor = 'rgba(220, 38, 38, 0.26)'; }
            else if (frp >= 80) { coreColor = '#ea580c'; haloColor = 'rgba(234, 88, 12, 0.24)'; }
            else if (frp >= 40) { coreColor = '#f59e0b'; haloColor = 'rgba(245, 158, 11, 0.22)'; }

            ctx.save();

            // 1. Subtle Thermal Breathing Halo
            const pulse = (Math.sin(now * 0.0035 + i * 1.8) + 1) * 0.5; // 0 to 1
            const haloSize = radius * (1.9 + pulse * 0.75);
            ctx.beginPath();
            ctx.arc(px, py, haloSize, 0, Math.PI * 2);
            ctx.fillStyle = haloColor;
            ctx.fill();

            // 2. Technical Diamond Glyph (Vertical Architectural Hazard Diamond ◆)
            const dw = radius * 1.45;
            const dh = radius * 1.95;

            ctx.beginPath();
            ctx.moveTo(px, py - dh);
            ctx.lineTo(px + dw, py);
            ctx.lineTo(px, py + dh);
            ctx.lineTo(px - dw, py);
            ctx.closePath();
            ctx.fillStyle = coreColor;
            ctx.fill();

            // Crisp hairline outer border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.lineWidth = 0.65;
            ctx.stroke();

            // 3. Inner White-Hot Thermal Core
            const inDw = dw * 0.42;
            const inDh = dh * 0.42;
            ctx.beginPath();
            ctx.moveTo(px, py - inDh);
            ctx.lineTo(px + inDw, py);
            ctx.lineTo(px, py + inDh);
            ctx.lineTo(px - inDw, py);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();

            // 4. Precision Crosshair Sensor Reticle for Extreme Hotspots (FRP >= 65)
            if (frp >= 65) {
              ctx.strokeStyle = coreColor;
              ctx.lineWidth = 0.75;
              const tick = dh + 3.5;
              ctx.beginPath();
              ctx.moveTo(px, py - tick); ctx.lineTo(px, py - dh - 1);
              ctx.moveTo(px, py + dh + 1); ctx.lineTo(px, py + tick);
              ctx.moveTo(px - tick, py); ctx.lineTo(px - dw - 1, py);
              ctx.moveTo(px + dw + 1, py); ctx.lineTo(px + tick, py);
              ctx.stroke();
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

        // 6. Update Floating Data Flag Badges (ANTI-NEMBUS FIX)
        const isSeismicActive = hazardModeRef.current !== 'wildfire';

        if (labelsContainerRef.current) {
          const children = labelsContainerRef.current.children;
          const items = topEventsRef.current;

          if (!isSeismicActive) {
            for (let i = 0; i < children.length; i++) {
              const el = children[i] as HTMLElement;
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
            }
          } else {
            for (let i = 0; i < items.length && i < children.length; i++) {
              const item = items[i];
              const el = children[i] as HTMLElement;
              const [px, py] = project(item.longitude, item.latitude);

              // ANTI-NEMBUS EXCLUSION ZONE:
              const inBounds = px >= 25 && px <= w - 25 && py >= 75 && py <= h - 40;
              const inHeroHeadlineZone = px < 460 && py < 480;
              const inTopRightZone = px > w - 280 && py < 180;

              // If spotlight is active, only show HTML badges within or near spotlight radius
              let inSpotlightZone = true;
              if (currentSpotOp > 0.45) {
                const distToSpot = Math.hypot(px - spot.x, py - spot.y);
                inSpotlightZone = distToSpot <= spot.radius * 1.25;
              }

              const isVisible = inBounds && !inHeroHeadlineZone && !inTopRightZone && inSpotlightZone;

              if (isVisible) {
                el.style.opacity = '1';
                el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -100%) translateY(-6px)`;
                el.style.pointerEvents = 'auto';
              } else {
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
              }
            }
          }
        }

        // 7. Sonar Shockwaves for Major Earthquakes
        if (shockwavesContainerRef.current) {
          const shockwaveChildren = shockwavesContainerRef.current.children;
          const mItems = majorEventsRef.current;

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
  }, [islandsData, worldData, events, hotspots, displayZoom, showWindPlume, windTelemetry]);

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

      {/* 3. Floating Architectural Data Flag Badges (ANTI-NEMBUS WITH LEADER STEM) */}
      <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none">
        {topEvents.map((evt) => {
          const mag = evt.magnitude?.toFixed(1) ?? '';
          const isMajor = (evt.magnitude ?? 0) >= 6.0;

          return (
            <div
              key={evt.usgs_id || evt.id}
              className="label-tag absolute top-0 left-0 transition-opacity duration-300 z-20 cursor-pointer pointer-events-auto will-change-transform flex flex-col items-center"
              style={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEventRef.current?.(evt);
              }}
            >
              {/* Precision Data Flag */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/95 hover:bg-white text-slate-900 font-mono text-[10px] tracking-wide shadow-xs border border-slate-300/90 whitespace-nowrap hover:scale-105 active:scale-95 transition-all backdrop-blur-md">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${isMajor
                      ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse'
                      : 'bg-blue-600'
                    }`}
                />
                <span className="font-semibold text-slate-900 tracking-wider">
                  {cleanPlace(evt.place)}
                </span>
                <span className="text-slate-300 font-light">/</span>
                <span
                  className={`font-bold tabular-nums ${isMajor ? 'text-rose-600' : 'text-slate-900'
                    }`}
                >
                  {mag}
                </span>
              </div>
              {/* 1px Hairline Leader Stem pointing precisely to epicenter */}
              <div className="w-px h-2 bg-slate-400/90" />
            </div>
          );
        })}
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

      {/* 5. Minimalist Editorial Zoom HUD (Hidden on mobile, 2-finger pinch replaces it) */}
      {(() => {
        const effP = controlsProgress != null ? controlsProgress : (interactive && showControls ? 1 : 0);
        const isScrollDriven = controlsProgress != null;
        return (
          <div
            style={{
              opacity: effP,
              filter: effP < 0.99 ? `blur(${(1 - effP) * 6}px)` : 'none',
              transform: `translate(-50%, ${(1 - effP) * 14}px)`,
              transition: isScrollDriven ? 'none' : 'opacity 200ms ease-out, filter 200ms ease-out, transform 200ms ease-out',
              willChange: 'opacity, transform, filter',
              pointerEvents: effP > 0.4 ? 'auto' : 'none',
              visibility: effP <= 0.001 ? 'hidden' : 'visible',
            }}
            className="absolute bottom-16 sm:bottom-20 left-1/2 z-30 hidden sm:flex items-center gap-0.5 bg-white/95 backdrop-blur-md border border-slate-200/95 rounded-md p-0.5 sm:p-0.5 shadow-[0_2px_10px_rgba(0,0,0,0.08)] font-mono text-[10.5px] tracking-tight select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom in (+)"
              aria-label="Zoom in"
              className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors font-bold active:scale-90 cursor-pointer text-sm sm:text-xs"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              title="Reset overview (1.0x)"
              aria-label="Reset overview"
              className="px-2.5 h-7 sm:px-2 sm:h-5 flex items-center justify-center rounded font-semibold text-slate-900 hover:bg-slate-100 transition-colors tabular-nums cursor-pointer text-xs sm:text-[10.5px]"
            >
              {displayZoom.toFixed(1)}x
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom out (−)"
              aria-label="Zoom out"
              className="w-7 h-7 sm:w-5 sm:h-5 flex items-center justify-center rounded text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors font-bold active:scale-90 cursor-pointer text-sm sm:text-xs"
            >
              −
            </button>
          </div>
        );
      })()}

      {/* 6. Floating Top Instrument Bar (Hidden on mobile to prevent overlapping) */}
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
            {/* Live NASA FIRMS */}
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

            {/* Wind Plume Toggle */}
            <button
              type="button"
              onClick={() => setShowWindPlume(!showWindPlume)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${showWindPlume
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Wind className="w-2.5 h-2.5" />
              <span>WIND PLUME</span>
            </button>

            {/* Island Presets */}
            <div className="hidden sm:flex items-center gap-0.5 border-l border-slate-200 pl-1.5 text-slate-500">
              {[
                { id: 'all', label: 'NUSANTARA' },
                { id: 'sumatra', label: 'SUMATRA' },
                { id: 'kalimantan', label: 'KALIMANTAN' },
                { id: 'sulawesi', label: 'SULAWESI' },
                { id: 'papua', label: 'PAPUA' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => focusIsland(p.id as any)}
                  className="px-1.5 py-0.5 rounded hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
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
