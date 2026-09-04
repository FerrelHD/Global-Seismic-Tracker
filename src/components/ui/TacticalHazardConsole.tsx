import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SeismicEvent, WildfireHotspot, HazardMode, RegionalWindData } from '../../types/seismic';
import { Activity, Flame, Layers, X, Wind, RefreshCw } from 'lucide-react';
import { fetchNusantaraWindTelemetry, getInterpolatedWind, degreesToCompass } from '../../utils/weatherService';
import { fetchLiveWildfireHotspots } from '../../utils/firmsService';

interface TacticalHazardConsoleProps {
  events: SeismicEvent[];
  hotspots: WildfireHotspot[];
  hazardMode: HazardMode;
  onHazardModeChange: (mode: HazardMode) => void;
  onSelectEvent?: (event: SeismicEvent) => void;
  onUpdateHotspots?: (newHotspots: WildfireHotspot[]) => void;
  className?: string;
}

// Bounding box for Indonesian Archipelago & neighboring regional context
const MIN_LON = 94.0;
const MAX_LON = 142.0;
const MIN_LAT = -11.5;
const MAX_LAT = 6.5;

// --- Wildfire utility helpers ---

/** FRP → severity tier */
function getFRPSeverity(frp: number): { label: string; color: string; bg: string; border: string } {
  if (frp >= 150) return { label: 'EXTREME', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  if (frp >= 80)  return { label: 'SEVERE',  color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' };
  if (frp >= 40)  return { label: 'MODERATE',color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  return             { label: 'LOW',      color: '#ca8a04', bg: '#fefce8', border: '#fef08a' };
}

/** FRP → canvas fill colour (gradient from amber to red) */
function getFRPColor(frp: number): { core: string; halo: string } {
  if (frp >= 150) return { core: '#ef4444', halo: 'rgba(239,68,68,0.20)' };   // red
  if (frp >= 80)  return { core: '#f97316', halo: 'rgba(249,115,22,0.20)' };  // orange
  if (frp >= 40)  return { core: '#f59e0b', halo: 'rgba(245,158,11,0.18)' };  // amber
  return             { core: '#eab308', halo: 'rgba(234,179,8,0.15)' };       // yellow
}

/** Age in hours since detection */
function getAgeHours(detected_at: string): number {
  return (Date.now() - new Date(detected_at).getTime()) / 3_600_000;
}

/** Age-based opacity: fresh = 1.0, 12+ hrs = 0.35 */
function getAgeOpacity(detected_at: string): number {
  const h = getAgeHours(detected_at);
  return Math.max(0.35, 1 - (h / 12) * 0.65);
}

/** Confidence → ring style (low = dashed/faint, high = solid) */
function getConfidenceRingClass(confidence: 'low' | 'nominal' | 'high' | number): {
  ring: string; ringStyle?: React.CSSProperties;
} {
  const c = typeof confidence === 'string' ? confidence : confidence >= 70 ? 'high' : 'nominal';
  if (c === 'high')    return { ring: 'border-2 border-current' };
  if (c === 'nominal') return { ring: 'border border-current border-dashed opacity-80' };
  return                      { ring: 'border border-current border-dashed opacity-50' };
}

/** Group hotspots into spatial clusters (0.5° radius) */
function clusterHotspots(hotspots: WildfireHotspot[]): { representative: WildfireHotspot; members: WildfireHotspot[]; totalFRP: number }[] {
  const used = new Set<string>();
  const clusters: { representative: WildfireHotspot; members: WildfireHotspot[]; totalFRP: number }[] = [];

  for (const h of hotspots) {
    if (used.has(h.id)) continue;
    const members: WildfireHotspot[] = [h];
    used.add(h.id);

    for (const other of hotspots) {
      if (used.has(other.id)) continue;
      const dLat = Math.abs(other.latitude - h.latitude);
      const dLon = Math.abs(other.longitude - h.longitude);
      if (dLat <= 0.5 && dLon <= 0.5) {
        members.push(other);
        used.add(other.id);
      }
    }

    // Representative = highest FRP member
    const rep = members.reduce((a, b) => (a.frp >= b.frp ? a : b));
    const totalFRP = members.reduce((sum, m) => sum + m.frp, 0);
    clusters.push({ representative: rep, members, totalFRP });
  }

  return clusters;
}

/** Per-island aggregate */
function aggregateByIsland(hotspots: WildfireHotspot[]): { island: string; count: number; totalFRP: number; maxFRP: number }[] {
  const map: Record<string, { count: number; totalFRP: number; maxFRP: number }> = {};
  for (const h of hotspots) {
    const key = h.island;
    if (!map[key]) map[key] = { count: 0, totalFRP: 0, maxFRP: 0 };
    map[key].count++;
    map[key].totalFRP += h.frp;
    map[key].maxFRP = Math.max(map[key].maxFRP, h.frp);
  }
  return Object.entries(map)
    .map(([island, d]) => ({ island, ...d }))
    .sort((a, b) => b.totalFRP - a.totalFRP);
}

export const TacticalHazardConsole: React.FC<TacticalHazardConsoleProps> = ({
  events,
  hotspots: initialHotspots,
  hazardMode,
  onHazardModeChange,
  onSelectEvent,
  onUpdateHotspots,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeHotspots, setActiveHotspots] = useState<WildfireHotspot[]>(initialHotspots);
  const [islandsData, setIslandsData] = useState<any[]>([]);
  const [worldData, setWorldData] = useState<any[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<WildfireHotspot | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<WildfireHotspot | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<SeismicEvent | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);

  // --- Zoom & Pan Viewport State ---
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // --- Wind Overlay & FIRMS Polling State ---
  const [windTelemetry, setWindTelemetry] = useState<RegionalWindData[]>([]);
  const [showWindPlume, setShowWindPlume] = useState<boolean>(true);
  const [isSyncingFIRMS, setIsSyncingFIRMS] = useState<boolean>(false);
  const [firmsStatus, setFirmsStatus] = useState<{ source: string; lastUpdated: string }>({
    source: 'snapshot',
    lastUpdated: 'Live Ready',
  });

  // Keep internal hotspots in sync if parent passes updated prop
  useEffect(() => {
    setActiveHotspots(initialHotspots);
  }, [initialHotspots]);

  // Fetch Open-Meteo Wind Telemetry
  useEffect(() => {
    fetchNusantaraWindTelemetry().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setWindTelemetry(data);
      }
    });
  }, []);

  // Sync Live FIRMS data
  const handleSyncFIRMS = async () => {
    setIsSyncingFIRMS(true);
    try {
      const res = await fetchLiveWildfireHotspots(true);
      if (res.hotspots && res.hotspots.length > 0) {
        setActiveHotspots(res.hotspots);
        onUpdateHotspots?.(res.hotspots);
        setFirmsStatus({
          source: res.source === 'live_firms' ? 'LIVE FIRMS (VIIRS)' : res.source === 'supabase_db' ? 'SUPABASE SYNC' : 'CURATED SNAPSHOT',
          lastUpdated: res.lastUpdated,
        });
      }
    } catch (err) {
      console.warn('Failed to sync FIRMS:', err);
    } finally {
      setIsSyncingFIRMS(false);
    }
  };

  // Load high-resolution Indonesian Archipelago and World Country vectors
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

  // Filtered datasets
  const visibleEvents = useMemo(() => {
    if (hazardMode === 'wildfire') return [];
    return events.filter(
      (e) => e.longitude >= MIN_LON && e.longitude <= MAX_LON && e.latitude >= MIN_LAT && e.latitude <= MAX_LAT
    );
  }, [events, hazardMode]);

  const visibleHotspots = useMemo(() => {
    if (hazardMode === 'seismic') return [];
    return activeHotspots.filter(
      (h) => h.longitude >= MIN_LON && h.longitude <= MAX_LON && h.latitude >= MIN_LAT && h.latitude <= MAX_LAT
    );
  }, [activeHotspots, hazardMode]);

  // Clusters for the 2D map rendering
  const hotspotClusters = useMemo(() => clusterHotspots(visibleHotspots), [visibleHotspots]);

  // Per-island aggregates
  const islandAggregates = useMemo(() => aggregateByIsland(visibleHotspots), [visibleHotspots]);

  // Aggregate stats
  const totalFRP = useMemo(() => Math.round(visibleHotspots.reduce((acc, h) => acc + h.frp, 0)), [visibleHotspots]);
  const maxMagnitude = useMemo(() => visibleEvents.reduce((max, e) => Math.max(max, e.magnitude ?? 0), 0), [visibleEvents]);

  // Convert (Lon, Lat) to current canvas screen pixel [x, y] taking zoom and pan into account
  const projectCoords = useCallback((lon: number, lat: number, w: number, h: number): [number, number] => {
    const rawX = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * w;
    const rawY = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * h;
    const cx = w / 2;
    const cy = h / 2;
    const x = cx + (rawX - cx) * zoom + panOffset.x;
    const y = cy + (rawY - cy) * zoom + panOffset.y;
    return [x, y];
  }, [zoom, panOffset]);

  // Render high-performance 2D Vector Map on Canvas
  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (w === 0 || h === 0) return;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const project = (lon: number, lat: number): [number, number] => {
      return projectCoords(lon, lat, w, h);
    };

    // Graticule
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    for (let lon = 95; lon <= 140; lon += 5) {
      const [x] = project(lon, 0);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let lat = -10; lat <= 5; lat += 5) {
      const [, y] = project(0, lat);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Equator
    const [, eqY] = project(0, 0);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.lineWidth = 0.85;
    ctx.beginPath(); ctx.moveTo(0, eqY); ctx.lineTo(w, eqY); ctx.stroke();
    ctx.restore();
    ctx.font = '500 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('EQUATOR 0°', 16, Math.max(12, Math.min(h - 8, eqY - 4)));

    // GeoJSON polygon renderer
    const renderFeatureCollection = (features: any[], fillColor: string, strokeColor: string, lineWidth: number) => {
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const feat of features) {
        const geom = feat?.geometry;
        if (!geom) continue;
        const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
        for (const poly of polys) {
          for (const ring of poly) {
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

    if (worldData.length > 0)  renderFeatureCollection(worldData,  '#f1f5f9', '#cbd5e1', 0.6);
    if (islandsData.length > 0) renderFeatureCollection(islandsData, '#ffffff', '#64748b', 0.85);

    // Sunda megathrust trench hairline
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const trenchCoords = [[93.5,6],[95,-3],[98.5,-1],[102,-4.5],[107,-8.5],[114,-10.5],[121,-11],[129,-9.5]];
    const [stX, stY] = project(trenchCoords[0][0], trenchCoords[0][1]);
    ctx.moveTo(stX, stY);
    for (let t = 1; t < trenchCoords.length; t++) {
      const [tx, ty] = project(trenchCoords[t][0], trenchCoords[t][1]);
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    ctx.restore();

    // Wind Direction Overlay & Smoke Plume Drift
    if (showWindPlume && hazardMode !== 'seismic') {
      for (const cluster of hotspotClusters) {
        const rep = cluster.representative;
        const [px, py] = project(rep.longitude, rep.latitude);

        // Skip rendering if far outside screen bounds
        if (px < -100 || px > w + 100 || py < -100 || py > h + 100) continue;

        const wind = getInterpolatedWind(rep.latitude, rep.longitude, windTelemetry);
        // Wind direction = where wind blows from. Smoke drifts in opposite direction: (windDirection + 180)%360
        const driftAngleRad = ((wind.windDirection + 180) % 360) * (Math.PI / 180);
        const plumeLength = Math.max(18, Math.min(80, (wind.windSpeed * 1.5 + Math.sqrt(rep.frp) * 2) * Math.sqrt(zoom)));
        const endX = px + Math.sin(driftAngleRad) * plumeLength;
        const endY = py - Math.cos(driftAngleRad) * plumeLength;

        // Draw graceful smoke drift plume gradient
        ctx.save();
        const grad = ctx.createLinearGradient(px, py, endX, endY);
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
        grad.addColorStop(0.3, 'rgba(249, 115, 22, 0.25)');
        grad.addColorStop(0.7, 'rgba(148, 163, 184, 0.18)');
        grad.addColorStop(1, 'rgba(148, 163, 184, 0)');

        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = Math.min(10, Math.max(3, Math.sqrt(rep.frp) * 0.45 * Math.sqrt(zoom)));
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [islandsData, worldData, projectCoords, showWindPlume, hazardMode, hotspotClusters, windTelemetry, zoom]);

  useEffect(() => {
    drawMap();
    const handleResize = () => drawMap();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMap]);

  // Zoom in / out controls
  const handleZoomIn = () => {
    setZoom((z) => Math.min(6.0, parseFloat((z + 0.4).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(1.0, parseFloat((z - 0.4).toFixed(2)));
      if (next === 1.0) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleZoomReset = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Preset island jump
  const focusPreset = (preset: 'all' | 'sumatra' | 'kalimantan' | 'sulawesi' | 'papua') => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth || 800;
    const h = containerRef.current.clientHeight || 400;

    if (preset === 'all') {
      setZoom(1.0);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    let targetLon = 118;
    let targetLat = -2.5;
    let targetZoom = 2.4;

    if (preset === 'sumatra') {
      targetLon = 101.5;
      targetLat = 0.5;
      targetZoom = 2.6;
    } else if (preset === 'kalimantan') {
      targetLon = 113.5;
      targetLat = -1.8;
      targetZoom = 2.4;
    } else if (preset === 'sulawesi') {
      targetLon = 121.5;
      targetLat = -2.0;
      targetZoom = 2.6;
    } else if (preset === 'papua') {
      targetLon = 138.0;
      targetLat = -4.5;
      targetZoom = 2.2;
    }

    const rawX = ((targetLon - MIN_LON) / (MAX_LON - MIN_LON)) * w;
    const rawY = ((MAX_LAT - targetLat) / (MAX_LAT - MIN_LAT)) * h;
    const cx = w / 2;
    const cy = h / 2;
    const newPanX = (cx - rawX) * targetZoom;
    const newPanY = (cy - rawY) * targetZoom;

    setZoom(targetZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  // Mouse wheel zoom centered on cursor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const delta = -e.deltaY * 0.0018;
    const newZoom = Math.max(1.0, Math.min(6.0, parseFloat((zoom + delta).toFixed(2))));
    if (newZoom === zoom) return;

    if (newZoom === 1.0) {
      setZoom(1.0);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    // Centered scaling math: keep geographical point under mouse constant
    const scaleRatio = newZoom / zoom;
    const newPanX = mouseX - cx - (mouseX - cx - panOffset.x) * scaleRatio;
    const newPanY = mouseY - cy - (mouseY - cy - panOffset.y) * scaleRatio;

    setZoom(newZoom);
    setPanOffset({ x: newPanX, y: newPanY });
  };

  // Pointer drag to pan
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }

    // Inverse projection to get accurate cursor Lat/Lon under zoom & pan
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rawX = (mouseX - cx - panOffset.x) / zoom + cx;
    const rawY = (mouseY - cy - panOffset.y) / zoom + cy;
    const lon = MIN_LON + (rawX / rect.width) * (MAX_LON - MIN_LON);
    const lat = MAX_LAT - (rawY / rect.height) * (MAX_LAT - MIN_LAT);

    setCursorCoords({
      lon: parseFloat(lon.toFixed(3)),
      lat: parseFloat(lat.toFixed(3)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleMouseLeave = () => {
    setCursorCoords(null);
    setHoveredHotspot(null);
    setHoveredEvent(null);
  };

  return (
    <div className={`w-full max-w-5xl mx-auto font-sans select-none ${className}`}>
      {/* 1. OUTER CHASSIS */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-2xl text-slate-800 shadow-xl overflow-hidden p-2 sm:p-3">

        {/* 2. TOP BEZEL BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2 bg-slate-50/80 backdrop-blur-md border border-slate-200/80 rounded-xl sm:rounded-2xl text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 border border-slate-200/90 shadow-2xs text-[10px] text-slate-800 font-mono font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              OBSERVATORY 2D TACTICAL
            </span>

            {/* Live FIRMS Status Badge & Refresh Button */}
            <div className="flex items-center gap-1 bg-white/80 border border-slate-200/80 rounded-md px-2 py-0.5 font-mono text-[9.5px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-600 font-medium">{firmsStatus.source}</span>
              <button
                type="button"
                onClick={handleSyncFIRMS}
                disabled={isSyncingFIRMS}
                title="Poll Live NASA FIRMS Data"
                className="ml-1 p-0.5 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isSyncingFIRMS ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {/* Wind Plume Overlay Toggle */}
            <button
              type="button"
              onClick={() => setShowWindPlume(!showWindPlume)}
              title="Toggle smoke plume drift vector overlay"
              className={`flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[10px] transition-colors cursor-pointer ${
                showWindPlume
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white'
              }`}
            >
              <Wind className="w-3 h-3" />
              <span>WIND PLUME {showWindPlume ? 'ON' : 'OFF'}</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 border border-slate-200/90 shadow-2xs text-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span className="font-bold tabular-nums">{visibleEvents.length}</span>
              <span className="text-slate-500 text-[10px]">EQ</span>
              <span className="text-slate-400 text-[9.5px]">· M{maxMagnitude.toFixed(1)}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 border border-slate-200/90 shadow-2xs text-slate-800">
              <Flame className="w-3 h-3 text-orange-500 fill-orange-400" />
              <span className="font-bold tabular-nums">{visibleHotspots.length}</span>
              <span className="text-slate-500 text-[10px]">HOTSPOTS</span>
              <span className="text-slate-400 text-[9.5px]">· {totalFRP} MW</span>
            </div>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE */}
        <div className="relative flex flex-col md:flex-row items-stretch gap-2">

          {/* Left Filter Controls & Island Presets */}
          <div className="w-full md:w-36 flex flex-row md:flex-col items-center justify-between md:justify-start gap-1.5 p-1.5 bg-slate-50/70 border border-slate-200/70 rounded-xl shrink-0 font-mono text-[11px]">
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden md:block px-2 pt-1 pb-0.5">
              HAZARD FILTER
            </div>

            {(['dual', 'seismic', 'wildfire'] as HazardMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onHazardModeChange(mode)}
                className={`flex-1 md:flex-none w-full flex items-center justify-center md:justify-start gap-2 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                  hazardMode === mode
                    ? mode === 'wildfire'
                      ? 'bg-orange-600 text-white shadow-xs font-semibold'
                      : 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                {mode === 'dual'     && <Layers   className="w-3.5 h-3.5" />}
                {mode === 'seismic'  && <Activity className="w-3.5 h-3.5" />}
                {mode === 'wildfire' && <Flame    className="w-3.5 h-3.5" />}
                <span className="uppercase">{mode}</span>
              </button>
            ))}

            {/* Quick Regional Focus Presets */}
            <div className="hidden md:block w-full mt-2 pt-2 border-t border-slate-200/60 space-y-1">
              <div className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider px-1">
                QUICK FOCUS
              </div>
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
                  onClick={() => focusPreset(p.id as any)}
                  className="w-full text-left px-2 py-1 rounded text-[9.5px] text-slate-600 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Per-Island Aggregate Panel */}
            {islandAggregates.length > 0 && hazardMode !== 'seismic' && (
              <div className="hidden md:block w-full mt-1 pt-1.5 border-t border-slate-200/60 space-y-1">
                <div className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider px-1">
                  HOTSPOTS BY ISLAND
                </div>
                {islandAggregates.slice(0, 4).map((agg) => {
                  const sev = getFRPSeverity(agg.maxFRP);
                  return (
                    <div key={agg.island} className="px-1">
                      <div className="flex items-center justify-between text-[8.5px]">
                        <span className="font-semibold text-slate-700 truncate">{agg.island.toUpperCase()}</span>
                        <span
                          className="font-bold text-[7.5px] px-1 rounded"
                          style={{ color: sev.color, backgroundColor: sev.bg }}
                        >
                          {agg.count}
                        </span>
                      </div>
                      <div className="text-[8px] text-slate-400 font-mono">{Math.round(agg.totalFRP)} MW</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Center 2D Map Viewport */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            className="relative flex-1 aspect-[8/3] min-h-[340px] sm:min-h-[400px] rounded-xl border border-slate-200/80 overflow-hidden bg-[#f8fafc] touch-none"
          >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Interactive Markers overlay with Pan/Zoom synchronization */}
            <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
              {containerRef.current && (() => {
                const w = containerRef.current.clientWidth;
                const h = containerRef.current.clientHeight;

                return (
                  <>
                    {/* Seismic Points */}
                    {visibleEvents.map((evt) => {
                      const [px, py] = projectCoords(evt.longitude, evt.latitude, w, h);
                      if (px < -20 || px > w + 20 || py < -20 || py > h + 20) return null;

                      const mag = evt.magnitude ?? 4.0;
                      const size = Math.min(14, Math.max(5, (mag / 7.0) * 10 * Math.sqrt(zoom)));
                      const isMajor = mag >= 5.5;

                      return (
                        <div
                          key={evt.id || evt.usgs_id}
                          className="absolute pointer-events-auto cursor-pointer z-10 hover:scale-150 transition-transform"
                          style={{
                            transform: `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`,
                          }}
                          onMouseEnter={() => setHoveredEvent(evt)}
                          onMouseLeave={() => setHoveredEvent(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent?.(evt);
                          }}
                        >
                          {isMajor && (
                            <span
                              className="absolute rounded-full border border-slate-400/50 animate-ping pointer-events-none"
                              style={{ width: size * 2.2, height: size * 2.2, top: -size * 0.6, left: -size * 0.6 }}
                            />
                          )}
                          <div
                            className={`rounded-full shadow-2xs border transition-all ${
                              isMajor ? 'bg-rose-600 border-white' : mag >= 4.5 ? 'bg-slate-900 border-white' : 'bg-slate-700/85 border-white/80'
                            }`}
                            style={{ width: size, height: size }}
                          />
                        </div>
                      );
                    })}

                    {/* Wildfire Hotspot Clusters */}
                    {hotspotClusters.map((cluster) => {
                      const { representative: rep, members } = cluster;
                      const [px, py] = projectCoords(rep.longitude, rep.latitude, w, h);
                      if (px < -30 || px > w + 30 || py < -30 || py > h + 30) return null;

                      const { core, halo } = getFRPColor(rep.frp);
                      const ageOpacity = getAgeOpacity(rep.detected_at);
                      const { ring } = getConfidenceRingClass(rep.confidence);
                      const isMulti = members.length > 1;

                      return (
                        <div
                          key={rep.id}
                          className="absolute pointer-events-auto cursor-pointer z-20 hover:scale-125 transition-transform"
                          style={{
                            transform: `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`,
                            opacity: ageOpacity,
                          }}
                          onMouseEnter={() => setHoveredHotspot(rep)}
                          onMouseLeave={() => setHoveredHotspot(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHotspot(rep);
                          }}
                        >
                          {rep.frp >= 40 && (
                            <span
                              className="absolute -inset-1 rounded-full animate-ping pointer-events-none"
                              style={{ backgroundColor: halo }}
                            />
                          )}

                          <div
                            className={`relative flex items-center justify-center p-0.5 rounded-full bg-white/95 shadow-2xs hover:shadow-xs transition-all ${ring}`}
                            style={{ borderColor: core }}
                          >
                            <Flame
                              className={`transition-all ${rep.frp >= 80 ? 'w-3.5 h-3.5' : 'w-3 h-3'}`}
                              style={{ color: core, fill: core + 'cc' }}
                            />
                          </div>

                          {isMulti && (
                            <span
                              className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-white text-[7px] font-bold font-mono leading-none px-0.5"
                              style={{ backgroundColor: core }}
                            >
                              {members.length}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>

            {/* Compass Rose */}
            <div className="absolute top-3 right-3 flex flex-col items-center justify-center w-8 h-8 rounded-md bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs pointer-events-none font-mono text-[9px] font-bold text-slate-700">
              <span className="text-slate-900 text-[10px] leading-none -mt-0.5">▲</span>
              <span className="leading-none text-[8px] text-slate-500">N</span>
            </div>

            {/* Minimalist On-Canvas Zoom Controls (Editorial, Monospace, Razor-thin border) */}
            <div
              className="absolute bottom-3 right-3 z-30 flex items-center gap-0.5 bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-md p-0.5 shadow-sm font-mono text-[10px] tracking-tight select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom in (+)"
                aria-label="Zoom in"
                className="w-5 h-5 flex items-center justify-center rounded text-slate-700 hover:bg-slate-100 transition-colors font-semibold active:scale-95 cursor-pointer"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomReset}
                title="Reset zoom (1.0x)"
                aria-label="Reset zoom"
                className="px-1.5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors tabular-nums cursor-pointer"
              >
                {zoom.toFixed(1)}x
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom out (−)"
                aria-label="Zoom out"
                className="w-5 h-5 flex items-center justify-center rounded text-slate-700 hover:bg-slate-100 transition-colors font-semibold active:scale-95 cursor-pointer"
              >
                −
              </button>
            </div>

            {/* Legend with FRP scale */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 px-2.5 py-1.5 bg-white/92 backdrop-blur-md border border-slate-200/80 shadow-xs text-[9px] font-mono text-slate-600 pointer-events-none rounded-md">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-900 border border-white" />
                <span>SEISMIC</span>
              </div>
              <div className="border-t border-slate-100 pt-1 mt-0.5 space-y-0.5">
                <div className="text-[7.5px] text-slate-400 uppercase tracking-wider">FRP INTENSITY</div>
                {[
                  { label: '<40 MW',   color: '#eab308' },
                  { label: '40-80 MW', color: '#f59e0b' },
                  { label: '80-150',   color: '#f97316' },
                  { label: '>150 MW',  color: '#ef4444' },
                ].map((tier) => (
                  <div key={tier.label} className="flex items-center gap-1.5">
                    <Flame className="w-2.5 h-2.5" style={{ color: tier.color, fill: tier.color + 'bb' }} />
                    <span>{tier.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hover Tooltip — Hotspot */}
            {hoveredHotspot && containerRef.current && (() => {
              const [px, py] = projectCoords(hoveredHotspot.longitude, hoveredHotspot.latitude, containerRef.current.clientWidth, containerRef.current.clientHeight);
              const sev = getFRPSeverity(hoveredHotspot.frp);
              const ageH = getAgeHours(hoveredHotspot.detected_at);
              const wind = getInterpolatedWind(hoveredHotspot.latitude, hoveredHotspot.longitude, windTelemetry);

              return (
                <div
                  className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-white/97 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-200/90 text-xs font-mono w-56 text-slate-800"
                  style={{ left: `${px}px`, top: `${py}px` }}
                >
                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-100">
                    <span className="flex items-center gap-1 font-bold text-[10.5px]">
                      <Flame className="w-3 h-3" style={{ color: sev.color, fill: sev.color + 'cc' }} />
                      HOTSPOT
                    </span>
                    <span
                      className="text-[8.5px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Radiative Power:</span>
                      <span className="font-bold" style={{ color: sev.color }}>{hoveredHotspot.frp} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wind Direction:</span>
                      <span className="font-bold text-slate-900">{degreesToCompass(wind.windDirection)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Wind Speed:</span>
                      <span className="font-bold text-slate-900">{wind.windSpeed.toFixed(1)} km/h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Age:</span>
                      <span className="font-bold text-slate-900">{ageH < 1 ? '<1 hr' : `${Math.round(ageH)} hr ago`}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-100">
                      {hoveredHotspot.latitude.toFixed(2)}°, {hoveredHotspot.longitude.toFixed(2)}° · {hoveredHotspot.satellite}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Hover Tooltip — Seismic */}
            {hoveredEvent && containerRef.current && (() => {
              const [px, py] = projectCoords(hoveredEvent.longitude, hoveredEvent.latitude, containerRef.current.clientWidth, containerRef.current.clientHeight);

              return (
                <div
                  className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-white/95 backdrop-blur-xl rounded-xl px-3.5 py-2.5 shadow-xl border border-slate-200/90 text-xs font-mono w-56 text-slate-800"
                  style={{ left: `${px}px`, top: `${py}px` }}
                >
                  <div className="flex items-center justify-between text-slate-900 font-bold text-[10.5px] border-b border-slate-100 pb-1 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-slate-700" />
                      SEISMIC EVENT
                    </span>
                    <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-900 border border-slate-200">
                      M{hoveredEvent.magnitude?.toFixed(1) ?? 'N/A'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-600">
                    <div className="truncate text-slate-900 font-semibold">{hoveredEvent.place}</div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Focal Depth:</span>
                      <span className="font-bold text-slate-800">{hoveredEvent.depth} km</span>
                    </div>
                    <div className="text-[9px] text-slate-400 pt-0.5 border-t border-slate-100">
                      {hoveredEvent.latitude.toFixed(2)}°, {hoveredEvent.longitude.toFixed(2)}°
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 4. BOTTOM TELEMETRY RIBBON */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2 mt-2 bg-slate-50/70 border border-slate-200/70 rounded-xl font-mono text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>REGION: NUSANTARA ARCHIPELAGO [94.0°E - 142.0°E] · VIEWPORT: {zoom.toFixed(1)}X</span>
          </div>
          <div className="flex items-center gap-3">
            {cursorCoords ? (
              <span className="text-slate-800 font-bold bg-white/90 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                LAT: {cursorCoords.lat >= 0 ? `+${cursorCoords.lat}°` : `${cursorCoords.lat}°`} · LON: {cursorCoords.lon}°
              </span>
            ) : (
              <span className="text-slate-400 italic">DRAG TO PAN · SCROLL TO ZOOM</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. SELECTED HOTSPOT DETAIL MODAL */}
      {selectedHotspot && (() => {
        const sev = getFRPSeverity(selectedHotspot.frp);
        const ageH = getAgeHours(selectedHotspot.detected_at);
        const wind = getInterpolatedWind(selectedHotspot.latitude, selectedHotspot.longitude, windTelemetry);
        const driftCompass = degreesToCompass((wind.windDirection + 180) % 360);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-md bg-white/97 backdrop-blur-2xl rounded-2xl border border-slate-200/90 shadow-2xl p-6 font-sans">
              <button
                type="button"
                onClick={() => setSelectedHotspot(null)}
                className="absolute top-4 right-4 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-2 rounded-md border"
                  style={{ backgroundColor: sev.bg, borderColor: sev.border }}
                >
                  <Flame className="w-5 h-5" style={{ color: sev.color, fill: sev.color + 'cc' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                      WILDFIRE THERMAL ANOMALY
                    </h3>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: sev.color, backgroundColor: sev.bg, border: `1px solid ${sev.border}` }}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    {selectedHotspot.island} · {selectedHotspot.satellite}
                  </p>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs mb-4">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                  <div className="text-[9px] text-slate-400 uppercase">FIRE RADIATIVE POWER</div>
                  <div className="text-base font-bold mt-0.5" style={{ color: sev.color }}>
                    {selectedHotspot.frp} <span className="text-xs font-normal text-slate-500">MW</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                  <div className="text-[9px] text-slate-400 uppercase">DETECTION AGE</div>
                  <div className="text-base font-bold text-slate-800 mt-0.5">
                    {ageH < 1 ? '<1 hr' : `${Math.round(ageH)} hrs`}
                    <span className="text-xs font-normal text-slate-400"> ago</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                  <div className="text-[9px] text-slate-400 uppercase">WIND SPEED & VECTOR</div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5">
                    {wind.windSpeed.toFixed(1)} km/h · {degreesToCompass(wind.windDirection)}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                  <div className="text-[9px] text-slate-400 uppercase">SMOKE DRIFT TRAJECTORY</div>
                  <div className="text-xs font-bold text-orange-600 mt-0.5">
                    TOWARD {driftCompass}
                  </div>
                </div>
              </div>

              {/* Coordinates */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-2.5 font-mono text-xs text-slate-600 flex items-center justify-between">
                <span>COORDINATES</span>
                <span className="font-bold text-slate-800">
                  {selectedHotspot.latitude.toFixed(4)}°N, {selectedHotspot.longitude.toFixed(4)}°E
                </span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
