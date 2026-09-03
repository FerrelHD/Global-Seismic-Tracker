import React, { useEffect, useRef, useMemo } from 'react';
import createGlobe from 'cobe';
import { SeismicEvent } from '../../types/seismic';

interface CobeGlobeProps {
  events: SeismicEvent[];
  className?: string;
  speed?: number;
  isRotating?: boolean;
  resetSignal?: number;
  targetFocus?: [number, number] | null;
  onSelectEvent?: (event: SeismicEvent) => void;
}

function cleanPlace(place: string | null): string {
  if (!place) return 'EPICENTER';
  const parts = place.split(' of ');
  const name = parts.length > 1 ? parts[1] : place;
  return name.replace(/,.*$/, '').trim().toUpperCase();
}

/**
 * Exact mathematical projection matching Cobe's internal GLSL shader with true 0.8 sphere radius
 */
function projectCobe(
  lat: number,
  lon: number,
  phi: number,
  theta: number,
  width: number
) {
  const r = 0.8; // Cobe sphere exact physical radius (.64 = .8^2)
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180 - Math.PI;

  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const cosLon = Math.cos(lonRad);
  const sinLon = Math.sin(lonRad);

  const t0 = -cosLat * cosLon * r;
  const t1 = sinLat * r;
  const t2 = cosLat * sinLon * r;

  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const c = cosPhi * t0 + sinPhi * t2;
  const s = sinPhi * sinTheta * t0 + cosTheta * t1 - cosPhi * sinTheta * t2;
  const z = -sinPhi * cosTheta * t0 + sinTheta * t1 + cosPhi * cosTheta * t2;

  return {
    x: ((c + 1) / 2) * width,
    y: ((-s + 1) / 2) * width,
    visible: z >= 0.05, // Point is on visible hemisphere
  };
}

export const CobeGlobe: React.FC<CobeGlobeProps> = ({
  events,
  className = '',
  speed = 0.0025,
  isRotating = true,
  resetSignal = 0,
  targetFocus = null,
  onSelectEvent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);

  // Cached container width
  const containerWidthRef = useRef(540);

  // Direct Interactive Physics Refs
  const phiRef = useRef(0);
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0.2);
  const velocityRef = useRef(0);

  // DOM refs for zero-re-render high performance tooltip & labels
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipTitleRef = useRef<HTMLSpanElement>(null);
  const tooltipMagRef = useRef<HTMLSpanElement>(null);
  const tooltipDepthRef = useRef<HTMLSpanElement>(null);
  const hoveredEventRef = useRef<SeismicEvent | null>(null);

  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const shockwavesContainerRef = useRef<HTMLDivElement>(null);

  const pointerInteracting = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  const isRotatingRef = useRef(isRotating);
  isRotatingRef.current = isRotating;

  const onSelectEventRef = useRef(onSelectEvent);
  onSelectEventRef.current = onSelectEvent;

  // Selected Top Major Earthquakes for Label Callouts (max 2 visible at once)
  const topEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
      .slice(0, 10);
  }, [events]);

  const topEventsRef = useRef(topEvents);
  topEventsRef.current = topEvents;

  // Major earthquakes (M >= 5.8) that receive pulsing sonar rings
  const majorEvents = useMemo(() => {
    return events
      .filter((e) => (e.magnitude ?? 0) >= 5.8)
      .slice(0, 8);
  }, [events]);

  const majorEventsRef = useRef(majorEvents);
  majorEventsRef.current = majorEvents;

  // Markers for Cobe with Depth-Based Scientific Color Spectrum
  const cobeMarkers = useMemo(() => {
    const sorted = [...events].sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0));
    return sorted.slice(0, 80).map((e) => {
      let markerRgb: [number, number, number] = [0.15, 0.45, 0.95];
      if (e.depth < 30) {
        markerRgb = [0.0, 0.85, 1.0];
      } else if (e.depth > 100) {
        markerRgb = [0.55, 0.35, 0.95];
      }

      return {
        location: [e.latitude, e.longitude] as [number, number],
        size: Math.max(0.025, Math.min(0.07, ((e.magnitude ?? 2.5) / 6.0) * 0.05)),
        color: markerRgb,
        id: e.usgs_id || e.id,
      };
    });
  }, [events]);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.update({ markers: cobeMarkers });
    }
  }, [cobeMarkers]);

  // Handle Target Focus
  useEffect(() => {
    if (!targetFocus) return;
    const [targetLat, targetLon] = targetFocus;
    const targetPhi = -(targetLon * Math.PI) / 180 + Math.PI / 2;
    const targetTheta = (targetLat * Math.PI) / 180;

    let startPhi = phiRef.current + phiOffsetRef.current;
    let diff = (targetPhi - startPhi) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    const finalTargetPhi = startPhi + diff;
    const startTheta = thetaOffsetRef.current;
    const startTime = performance.now();
    const duration = 1200;

    const animateCamera = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);

      phiOffsetRef.current = startPhi + diff * ease - phiRef.current;
      thetaOffsetRef.current = startTheta + (targetTheta - startTheta) * ease;

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    requestAnimationFrame(animateCamera);
  }, [targetFocus]);

  // Handle Reset Signal
  useEffect(() => {
    if (resetSignal === 0) return;
    phiOffsetRef.current = 0;
    thetaOffsetRef.current = 0.2;
    velocityRef.current = 0;
  }, [resetSignal]);

  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Track Proximity Hover with Raycasting
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const w = containerWidthRef.current;

      const currentPhi = phiRef.current + phiOffsetRef.current;
      const currentTheta = thetaOffsetRef.current;

      let closestEvt: SeismicEvent | null = null;
      let minDistance = 24;
      let closestX = 0;
      let closestY = 0;

      for (const evt of eventsRef.current) {
        const proj = projectCobe(evt.latitude, evt.longitude, currentPhi, currentTheta, w);
        if (proj.visible) {
          const dist = Math.hypot(proj.x - mouseX, proj.y - mouseY);
          if (dist < minDistance) {
            minDistance = dist;
            closestEvt = evt;
            closestX = proj.x;
            closestY = proj.y;
          }
        }
      }

      if (closestEvt && tooltipRef.current) {
        hoveredEventRef.current = closestEvt;
        tooltipRef.current.style.display = 'block';
        tooltipRef.current.style.transform = `translate3d(${closestX}px, ${closestY}px, 0) translate(-50%, -125%)`;

        if (tooltipTitleRef.current) {
          tooltipTitleRef.current.innerText = cleanPlace(closestEvt.place);
        }
        if (tooltipMagRef.current) {
          tooltipMagRef.current.innerText = `M${closestEvt.magnitude?.toFixed(1) ?? '?'}`;
        }
        if (tooltipDepthRef.current) {
          tooltipDepthRef.current.innerText = `Depth: ${closestEvt.depth.toFixed(1)}km`;
        }
      } else if (tooltipRef.current) {
        hoveredEventRef.current = null;
        tooltipRef.current.style.display = 'none';
      }
    };

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      container.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  // Pointer Interaction (Drag, Inertia, Click)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startX = 0;
    let startY = 0;
    let lastX = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerInteracting.current = { x: e.clientX, y: e.clientY };
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      velocityRef.current = 0;
      isDraggingRef.current = false;
      container.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        const deltaX = e.clientX - pointerInteracting.current.x;
        const deltaY = e.clientY - pointerInteracting.current.y;

        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) {
          isDraggingRef.current = true;
        }

        phiOffsetRef.current += deltaX * 0.005;
        thetaOffsetRef.current = Math.max(-0.8, Math.min(1.0, thetaOffsetRef.current - deltaY * 0.004));

        velocityRef.current = (e.clientX - lastX) * 0.003;
        lastX = e.clientX;
        pointerInteracting.current = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerUp = () => {
      if (pointerInteracting.current !== null) {
        pointerInteracting.current = null;
        container.style.cursor = 'grab';

        if (!isDraggingRef.current && hoveredEventRef.current) {
          onSelectEventRef.current?.(hoveredEventRef.current);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      phiOffsetRef.current += e.deltaY * 0.0015;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Initialize Cobe Globe ONCE on mount
  useEffect(() => {
    let animationFrameId: number;
    if (!canvasRef.current) return;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: 1000,
      height: 1000,
      phi: 0,
      theta: 0.2,
      dark: 0,
      diffuse: 1.25,
      mapSamples: 19000,
      mapBrightness: 4.8,
      mapBaseBrightness: 0.05,
      baseColor: [0.91, 0.92, 0.95],
      markerColor: [0.15, 0.45, 0.95],
      glowColor: [1, 1, 1],
      markerElevation: 0.015,
      markers: cobeMarkers,
      arcs: [],
      opacity: 0.95,
    });

    globeRef.current = globe;

    // Smart Label Occlusion & Anti-Collision Engine + Sonar Shockwaves
    function updateDomLabels(currentPhi: number, currentTheta: number) {
      const w = containerWidthRef.current;

      // 1. Update Expanding Sonar Shockwaves for Major Shocks
      if (shockwavesContainerRef.current) {
        const shockwaveChildren = shockwavesContainerRef.current.children;
        const mItems = majorEventsRef.current;
        for (let i = 0; i < mItems.length && i < shockwaveChildren.length; i++) {
          const evt = mItems[i];
          const proj = projectCobe(evt.latitude, evt.longitude, currentPhi, currentTheta, w);
          const el = shockwaveChildren[i] as HTMLElement;
          if (proj.visible) {
            el.style.opacity = '1';
            el.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0) translate(-50%, -50%)`;
          } else {
            el.style.opacity = '0';
          }
        }
      }

      // 2. Update Floating Labels
      if (!labelsContainerRef.current) return;
      const children = labelsContainerRef.current.children;
      const items = topEventsRef.current;

      // Calculate projection for all candidate events
      const candidates: { elIndex: number; x: number; y: number; mag: number }[] = [];
      for (let i = 0; i < items.length && i < children.length; i++) {
        const evt = items[i];
        const proj = projectCobe(evt.latitude, evt.longitude, currentPhi, currentTheta, w);
        if (proj.visible) {
          candidates.push({
            elIndex: i,
            x: proj.x,
            y: proj.y,
            mag: evt.magnitude ?? 0,
          });
        }
      }

      // Select top 1 or 2 with anti-collision distance check (>= 85px)
      const allowedIndices = new Set<number>();
      if (candidates.length > 0) {
        allowedIndices.add(candidates[0].elIndex);

        if (candidates.length > 1) {
          const c1 = candidates[0];
          const c2 = candidates[1];
          const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y);
          if (dist >= 85) {
            allowedIndices.add(c2.elIndex);
          }
        }
      }

      // Apply visibility to DOM elements
      for (let i = 0; i < items.length && i < children.length; i++) {
        const el = children[i] as HTMLElement;
        if (allowedIndices.has(i)) {
          const cand = candidates.find((c) => c.elIndex === i);
          if (cand) {
            el.style.opacity = '1';
            el.style.transform = `translate3d(${cand.x}px, ${cand.y}px, 0) translate(-50%, -100%) translateY(-6px)`;
            el.style.pointerEvents = 'auto';
          }
        } else {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      }
    }

    // High-performance Render Loop
    function render() {
      if (!document.hidden) {
        if (isRotatingRef.current && pointerInteracting.current === null) {
          phiRef.current += speed;
        }

        if (pointerInteracting.current === null && Math.abs(velocityRef.current) > 0.0001) {
          phiOffsetRef.current += velocityRef.current;
          velocityRef.current *= 0.92;
        }

        const currentPhi = phiRef.current + phiOffsetRef.current;
        const finalTheta = thetaOffsetRef.current;

        globe.update({
          phi: currentPhi,
          theta: finalTheta,
        });

        updateDomLabels(currentPhi, finalTheta);
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      globe.destroy();
      globeRef.current = null;
    };
  }, [speed]);

  return (
    <div
      ref={containerRef}
      style={{ cursor: 'grab', touchAction: 'none' }}
      className={`relative w-full aspect-square max-w-[560px] select-none mx-auto flex items-center justify-center will-change-transform ${className}`}
    >
      {/* Ambient Atmospheric Optical Glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.07) 0%, rgba(99, 102, 241, 0.02) 50%, transparent 70%)',
          transform: 'scale(1.18)',
          filter: 'blur(30px)',
        }}
      />

      {/* 1. Base Cobe WebGL Globe (High density 19,000 points) */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '560px',
          maxHeight: '560px',
          aspectRatio: '1',
          touchAction: 'none',
        }}
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
              {/* Outer Pulsing Sonar Ripple */}
              <span className="absolute w-14 h-14 rounded-full border border-rose-500/50 animate-ping duration-1000" />
              {/* Mid Sonar Halo */}
              <span className="absolute w-8 h-8 rounded-full border border-rose-400/60 animate-pulse" />
              {/* Core Hotspot */}
              <span className="relative w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
            </span>
          </div>
        ))}
      </div>

      {/* 3. Floating Frosted Glass Badges (Strictly 1-2 facing tags, clean grey palette) */}
      <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none">
        {topEvents.map((evt) => (
          <div
            key={evt.usgs_id || evt.id}
            className="label-tag absolute top-0 left-0 transition-opacity duration-200 z-20 cursor-pointer pointer-events-auto will-change-transform"
            style={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectEventRef.current?.(evt);
            }}
          >
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/92 hover:bg-white text-slate-900 font-mono text-[10px] font-semibold tracking-wider shadow-md border border-slate-200/90 whitespace-nowrap hover:scale-105 active:scale-95 transition-all backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
              </span>
              <span className="text-slate-800">{cleanPlace(evt.place)}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[9px] font-bold text-slate-700 border border-slate-200">
                M{evt.magnitude?.toFixed(1) ?? ''}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Instant Hover Tooltip in Frosted Acrylic Glass */}
      <div
        ref={tooltipRef}
        style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
        className="z-30 pointer-events-none will-change-transform"
      >
        <div className="px-3.5 py-2 rounded-xl bg-white/95 text-slate-900 font-sans text-xs shadow-xl border border-slate-200/90 flex flex-col gap-0.5 whitespace-nowrap backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span
              ref={tooltipMagRef}
              className="px-1.5 py-0.2 rounded-md bg-slate-100 text-[10px] font-mono font-bold text-slate-900 border border-slate-200"
            >
              M5.0
            </span>
            <span
              ref={tooltipTitleRef}
              className="font-semibold text-slate-900 truncate max-w-[200px]"
            >
              Location
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500 font-mono mt-1">
            <span ref={tooltipDepthRef}>Depth: 10km</span>
            <span className="text-blue-600 font-medium">Click to inspect</span>
          </div>
        </div>
      </div>
    </div>
  );
};
