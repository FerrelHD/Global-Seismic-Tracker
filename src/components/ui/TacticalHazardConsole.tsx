import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SeismicEvent, WildfireHotspot, HazardMode } from '../../types/seismic';
import { Activity, Flame, Layers, X } from 'lucide-react';

interface TacticalHazardConsoleProps {
  events: SeismicEvent[];
  hotspots: WildfireHotspot[];
  hazardMode: HazardMode;
  onHazardModeChange: (mode: HazardMode) => void;
  onSelectEvent?: (event: SeismicEvent) => void;
  className?: string;
}

// Bounding box for Indonesian Archipelago & neighboring regional context
const MIN_LON = 94.0;
const MAX_LON = 142.0;
const MIN_LAT = -11.5;
const MAX_LAT = 6.5;

export const TacticalHazardConsole: React.FC<TacticalHazardConsoleProps> = ({
  events,
  hotspots,
  hazardMode,
  onHazardModeChange,
  onSelectEvent,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [islandsData, setIslandsData] = useState<any[]>([]);
  const [worldData, setWorldData] = useState<any[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<WildfireHotspot | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<WildfireHotspot | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<SeismicEvent | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Load high-resolution Indonesian Archipelago and World Country vectors
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetch('/data/indonesia_islands.json').then((res) => res.json()).catch(() => null),
      fetch('/data/world_countries_110m.json').then((res) => res.json()).catch(() => null),
    ]).then(([indoGeo, worldGeo]) => {
      if (!isMounted) return;
      if (indoGeo?.features) {
        setIslandsData(indoGeo.features);
      }
      if (worldGeo?.features) {
        // Filter out coarse Indonesia polygon from world dataset since we use high-res islands
        const neighbors = worldGeo.features.filter(
          (f: any) => f.properties?.name !== 'Indonesia' && f.id !== 'IDN'
        );
        setWorldData(neighbors);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered dataset based on active hazard mode
  const visibleEvents = useMemo(() => {
    if (hazardMode === 'wildfire') return [];
    return events.slice(0, 250);
  }, [events, hazardMode]);

  const visibleHotspots = useMemo(() => {
    if (hazardMode === 'seismic') return [];
    return hotspots;
  }, [hotspots, hazardMode]);

  // Aggregate stats
  const totalFRP = useMemo(() => {
    return Math.round(hotspots.reduce((acc, h) => acc + h.frp, 0));
  }, [hotspots]);

  const maxMagnitude = useMemo(() => {
    return events.reduce((max, e) => Math.max(max, e.magnitude ?? 0), 0);
  }, [events]);

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

    // 1. Maritime Ocean Tint (Clean Paper Blueprint Slate)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const project = (lon: number, lat: number): [number, number] => {
      const x = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * w;
      const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * h;
      return [x, y];
    };

    // 2. Graticule Grid (Parallels & Meridians)
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';

    // Longitude lines every 5 degrees
    for (let lon = 95; lon <= 140; lon += 5) {
      const [x] = project(lon, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Latitude lines every 5 degrees
    for (let lat = -10; lat <= 5; lat += 5) {
      const [, y] = project(0, lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Equator Line (Latitude 0°) - Architectural dashed line
    const [, eqY] = project(0, 0);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(0, eqY);
    ctx.lineTo(w, eqY);
    ctx.stroke();
    ctx.restore();

    ctx.font = '500 8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('EQUATOR 0°', 16, eqY - 4);

    // Helper to draw GeoJSON polygons
    const renderFeatureCollection = (
      features: any[],
      fillColor: string,
      strokeColor: string,
      lineWidth: number
    ) => {
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let i = 0; i < features.length; i++) {
        const feat = features[i];
        const geom = feat?.geometry;
        if (!geom) continue;

        const polys =
          geom.type === 'Polygon'
            ? [geom.coordinates]
            : geom.type === 'MultiPolygon'
            ? geom.coordinates
            : [];

        for (let p = 0; p < polys.length; p++) {
          const poly = polys[p];
          for (let r = 0; r < poly.length; r++) {
            const ring = poly[r];
            if (ring.length < 3) continue;

            ctx.beginPath();
            const [startX, startY] = project(ring[0][0], ring[0][1]);
            ctx.moveTo(startX, startY);

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

    // 3. Render Neighboring Regional Lands (Malaysia, Singapore, Philippines, Australia, PNG)
    if (worldData.length > 0) {
      renderFeatureCollection(worldData, '#f1f5f9', '#cbd5e1', 0.6);
    }

    // 4. Render High-Resolution Indonesian Archipelago Islands (100% accurate coastlines)
    if (islandsData.length > 0) {
      renderFeatureCollection(islandsData, '#ffffff', '#64748b', 0.85);
    }

    // 5. Subtle Subduction Trench & Fault Hairline Indicator (Sunda Megathrust arc)
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const trenchCoords = [
      [93.5, 6.0],
      [95.0, 3.0],
      [98.5, -1.0],
      [102.0, -4.5],
      [107.0, -8.5],
      [114.0, -10.5],
      [121.0, -11.0],
      [129.0, -9.5],
    ];
    const [stX, stY] = project(trenchCoords[0][0], trenchCoords[0][1]);
    ctx.moveTo(stX, stY);
    for (let t = 1; t < trenchCoords.length; t++) {
      const [tx, ty] = project(trenchCoords[t][0], trenchCoords[t][1]);
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    ctx.restore();
  }, [islandsData, worldData]);

  // Redraw when data or window dimensions change
  useEffect(() => {
    drawMap();
    const handleResize = () => drawMap();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawMap]);

  // Coordinate projection from Lon/Lat to percentage on map container
  const getPercentageCoords = (lon: number, lat: number): [number, number] => {
    const xPct = ((lon - MIN_LON) / (MAX_LON - MIN_LON)) * 100;
    const yPct = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * 100;
    return [Math.max(0, Math.min(100, xPct)), Math.max(0, Math.min(100, yPct))];
  };

  // Handle live cursor coordinate HUD
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const lon = MIN_LON + relX * (MAX_LON - MIN_LON);
    const lat = MAX_LAT - relY * (MAX_LAT - MIN_LAT);

    setCursorCoords({
      lon: parseFloat(lon.toFixed(3)),
      lat: parseFloat(lat.toFixed(3)),
    });
  };

  const handleMouseLeave = () => {
    setCursorCoords(null);
    setHoveredHotspot(null);
    setHoveredEvent(null);
  };

  return (
    <div className={`w-full max-w-5xl mx-auto font-sans select-none ${className}`}>
      {/* 1. OUTER LIGHT ARCHITECTURAL CHASSIS */}
      <div className="relative rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white/95 backdrop-blur-2xl text-slate-800 shadow-xl overflow-hidden p-2 sm:p-3">
        {/* 2. TOP BEZEL BAR: Command Telemetry & Instrument Counters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-4 sm:px-5 py-2.5 bg-slate-50/80 border border-slate-200/80 rounded-xl sm:rounded-2xl text-xs mb-2">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-200/60 border border-slate-300/50 text-[10px] text-slate-700 font-mono font-bold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              OBSERVATORY 2D // REGIONAL HAZARDS
            </span>
            <span className="text-slate-400 font-mono text-[10.5px] hidden md:inline">
              BMKG/USGS SEISMIC · NASA FIRMS VIIRS
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            {/* Seismic Counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50/90 border border-sky-200/80 text-sky-800 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              <span className="tabular-nums">{events.length}</span>
              <span className="text-sky-600/80 text-[10px]">SEISMIC</span>
              <span className="text-slate-400 text-[9.5px]">· PEAK M{maxMagnitude.toFixed(1)}</span>
            </div>

            {/* Hotspots Counter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50/90 border border-orange-200/80 text-orange-800 font-semibold">
              <Flame className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
              <span className="tabular-nums">{hotspots.length}</span>
              <span className="text-orange-600/80 text-[10px]">HOTSPOTS</span>
              <span className="text-slate-400 text-[9.5px]">· {totalFRP} MW</span>
            </div>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE (Left Hazard Switcher + Center 2D Archipelago Canvas) */}
        <div className="relative flex flex-col md:flex-row items-stretch gap-2">
          {/* Left Modular Filter Controls */}
          <div className="w-full md:w-36 flex flex-row md:flex-col items-center justify-between md:justify-start gap-1.5 p-1.5 bg-slate-50/70 border border-slate-200/70 rounded-xl shrink-0 font-mono text-[11px]">
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider hidden md:block px-2 pt-1 pb-0.5">
              HAZARD FILTER
            </div>

            <button
              onClick={() => onHazardModeChange('dual')}
              className={`flex-1 md:flex-none w-full flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer font-medium ${
                hazardMode === 'dual'
                  ? 'bg-slate-900 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>DUAL</span>
            </button>

            <button
              onClick={() => onHazardModeChange('seismic')}
              className={`flex-1 md:flex-none w-full flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer font-medium ${
                hazardMode === 'seismic'
                  ? 'bg-sky-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>SEISMIC</span>
            </button>

            <button
              onClick={() => onHazardModeChange('wildfire')}
              className={`flex-1 md:flex-none w-full flex items-center justify-center md:justify-start gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer font-medium ${
                hazardMode === 'wildfire'
                  ? 'bg-orange-600 text-white shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-orange-700 hover:bg-orange-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>WILDFIRE</span>
            </button>

            <div className="hidden md:block mt-auto w-full pt-2 border-t border-slate-200/60 px-1 text-[8.5px] text-slate-400 leading-tight">
              <div>DATUM: WGS-84</div>
              <div>PROJ: EQUIR (2D)</div>
              <div>SCALE: 1:1.2M</div>
            </div>
          </div>

          {/* Center 2D Map Viewport Screen */}
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative flex-1 aspect-[2/1] min-h-[340px] sm:min-h-[420px] rounded-xl border border-slate-200/80 overflow-hidden bg-[#f8fafc]"
          >
            {/* 1. Base High-Resolution Vector Coastline Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* 2. Interactive Markers Overlay Container */}
            <div className="absolute inset-0 w-full h-full pointer-events-auto">
              {/* Seismic Points (USGS / BMKG Electric Cyan Nodes) */}
              {visibleEvents.map((evt) => {
                const [xPct, yPct] = getPercentageCoords(evt.longitude, evt.latitude);
                const mag = evt.magnitude ?? 4.0;
                const size = Math.min(13, Math.max(5, (mag / 7.0) * 11));
                const isMajor = mag >= 5.5;

                return (
                  <div
                    key={evt.id || evt.usgs_id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-10 transition-transform hover:scale-150"
                    style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    onMouseEnter={() => setHoveredEvent(evt)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onClick={() => onSelectEvent?.(evt)}
                  >
                    {/* Shockwave ring for major quakes */}
                    {isMajor && (
                      <span
                        className="absolute rounded-full border border-sky-400/60 animate-ping pointer-events-none"
                        style={{
                          width: size * 2.2,
                          height: size * 2.2,
                          top: -size * 0.6,
                          left: -size * 0.6,
                        }}
                      />
                    )}
                    <div
                      className={`rounded-full shadow-xs border transition-all ${
                        isMajor
                          ? 'bg-rose-500 border-white'
                          : mag >= 4.5
                          ? 'bg-sky-500 border-white'
                          : 'bg-sky-400 border-slate-100'
                      }`}
                      style={{ width: size, height: size }}
                    />
                  </div>
                );
              })}

              {/* Wildfire Points (NASA FIRMS - Flame Fire Icons) */}
              {visibleHotspots.map((h) => {
                const [xPct, yPct] = getPercentageCoords(h.longitude, h.latitude);
                const isHighIntensity = h.frp > 40;

                return (
                  <div
                    key={h.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20 transition-transform hover:scale-125"
                    style={{ left: `${xPct}%`, top: `${yPct}%` }}
                    onMouseEnter={() => setHoveredHotspot(h)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                    onClick={() => setSelectedHotspot(h)}
                  >
                    {/* Subtle pulse halo for strong wildfire hotspots */}
                    {isHighIntensity && (
                      <span className="absolute -inset-1 rounded-full bg-orange-400/25 animate-ping pointer-events-none" />
                    )}

                    {/* Crisp Flame Icon Badge */}
                    <div className="relative flex items-center justify-center p-0.5 rounded-full bg-white/95 border border-orange-400/80 shadow-xs hover:border-orange-600 hover:shadow-md transition-all">
                      <Flame
                        className={`transition-all ${
                          isHighIntensity
                            ? 'w-4 h-4 text-orange-600 fill-orange-500 animate-pulse'
                            : 'w-3 h-3 text-orange-500 fill-orange-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Cardinal Compass Rose Indicator */}
            <div className="absolute top-3 right-3 flex flex-col items-center justify-center w-8 h-8 rounded-full bg-white/90 border border-slate-200/80 shadow-xs pointer-events-none font-mono text-[9px] font-bold text-slate-700">
              <span className="text-sky-600 text-[10px] leading-none -mt-0.5">▲</span>
              <span className="leading-none text-[8px] text-slate-500">N</span>
            </div>

            {/* 4. Legend Key Pill */}
            <div className="absolute top-3 left-3 flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs text-[10px] font-mono text-slate-600 pointer-events-none">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>SEISMIC</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500 fill-orange-400" />
                <span>THERMAL HOTSPOT</span>
              </span>
            </div>

            {/* 5. Tooltip on Hovering Hotspot */}
            {hoveredHotspot && (
              <div
                className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl border border-slate-700 text-xs font-mono w-48"
                style={{
                  left: `${getPercentageCoords(hoveredHotspot.longitude, hoveredHotspot.latitude)[0]}%`,
                  top: `${getPercentageCoords(hoveredHotspot.longitude, hoveredHotspot.latitude)[1]}%`,
                }}
              >
                <div className="flex items-center justify-between text-orange-400 font-bold text-[10.5px] border-b border-slate-800 pb-1 mb-1">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400 fill-orange-400" />
                    THERMAL HOTSPOT
                  </span>
                  <span>{hoveredHotspot.island}</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Radiative Power:</span>
                    <span className="font-bold text-orange-300">{hoveredHotspot.frp} MW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Confidence:</span>
                    <span className="font-bold text-emerald-400">{hoveredHotspot.confidence}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Satellite Sensor:</span>
                    <span>NASA VIIRS</span>
                  </div>
                  <div className="text-[9px] text-slate-500 pt-0.5">
                    {hoveredHotspot.latitude.toFixed(2)}° N, {hoveredHotspot.longitude.toFixed(2)}° E
                  </div>
                </div>
              </div>
            )}

            {/* 6. Tooltip on Hovering Seismic Event */}
            {hoveredEvent && (
              <div
                className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl border border-slate-700 text-xs font-mono w-52"
                style={{
                  left: `${getPercentageCoords(hoveredEvent.longitude, hoveredEvent.latitude)[0]}%`,
                  top: `${getPercentageCoords(hoveredEvent.longitude, hoveredEvent.latitude)[1]}%`,
                }}
              >
                <div className="flex items-center justify-between text-sky-400 font-bold text-[10.5px] border-b border-slate-800 pb-1 mb-1">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-sky-400" />
                    SEISMIC RUPTURE
                  </span>
                  <span className="text-white font-bold">M{hoveredEvent.magnitude?.toFixed(1) ?? 'N/A'}</span>
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-300">
                  <div className="truncate text-slate-200 font-semibold">{hoveredEvent.place}</div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Depth:</span>
                    <span>{hoveredEvent.depth} km</span>
                  </div>
                  <div className="text-[9px] text-slate-500 pt-0.5">
                    {hoveredEvent.latitude.toFixed(2)}° N, {hoveredEvent.longitude.toFixed(2)}° E
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. BOTTOM TELEMETRY RIBBON */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2 mt-2 bg-slate-50/70 border border-slate-200/70 rounded-xl font-mono text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>REGION: NUSANTARA ARCHIPELAGO [94.0°E - 142.0°E]</span>
          </div>

          <div className="flex items-center gap-3">
            {cursorCoords ? (
              <span className="text-slate-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                LAT: {cursorCoords.lat >= 0 ? `+${cursorCoords.lat}°` : `${cursorCoords.lat}°`} · LON: {cursorCoords.lon}°
              </span>
            ) : (
              <span className="text-slate-400 italic">HOVER OVER MAP FOR COORDINATES</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. MODAL DETAIL POPUP FOR SELECTED HOTSPOT */}
      {selectedHotspot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 font-sans">
            <button
              onClick={() => setSelectedHotspot(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-600">
                <Flame className="w-5 h-5 fill-orange-500 text-orange-600" />
              </div>
              <div>
                <div className="text-[11px] font-mono text-orange-600 font-bold uppercase tracking-wider">
                  NASA FIRMS THERMAL TELEMETRY
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedHotspot.island} Hotspot Cluster
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-semibold mb-1">FIRE RADIATIVE POWER</div>
                <div className="text-lg font-bold text-orange-600">{selectedHotspot.frp} MW</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] text-slate-400 font-semibold mb-1">DETECTION CONFIDENCE</div>
                <div className="text-lg font-bold text-emerald-600">{selectedHotspot.confidence}%</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 col-span-2">
                <div className="text-[10px] text-slate-400 font-semibold mb-1">COORDINATES & SENSOR</div>
                <div className="text-slate-700 font-medium">
                  {selectedHotspot.latitude.toFixed(4)}° N, {selectedHotspot.longitude.toFixed(4)}° E
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  VIIRS S-NPP / NOAA-20 · High-Resolution 375m
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500 font-mono">
              <span>DETECTED: {new Date(selectedHotspot.detected_at).toLocaleString('id-ID')}</span>
              <button
                onClick={() => setSelectedHotspot(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-sans text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
