import React, { useEffect, useRef, useMemo, useState } from 'react';
import { SeismicEvent } from '../../types/seismic';
import { PRECOMPUTED_GRATICULES, GraticuleLine } from '../../utils/graticule';

export interface CameraCoordinates {
  lat: number;
  lon: number;
}

interface VectorGlobeProps {
  events: SeismicEvent[];
  className?: string;
  speed?: number;
  isRotating?: boolean;
  resetSignal?: number;
  targetFocus?: [number, number] | null;
  onSelectEvent?: (event: SeismicEvent) => void;
  interactive?: boolean;
  onCameraChange?: (coords: CameraCoordinates) => void;
}

interface CountryFeature {
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

function cleanPlace(place: string | null): string {
  if (!place) return 'EPICENTER';
  const parts = place.split(' of ');
  const name = parts.length > 1 ? parts[1] : place;
  return name.replace(/,.*$/, '').trim().toUpperCase();
}

/**
 * 3D Spherical orthographic projection matching physical 0.85 sphere radius.
 */
function projectSphere(
  lat: number,
  lon: number,
  phi: number,
  theta: number,
  width: number,
  radius = 0.82
) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180 - Math.PI;

  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const cosLon = Math.cos(lonRad);
  const sinLon = Math.sin(lonRad);

  const t0 = -cosLat * cosLon * radius;
  const t1 = sinLat * radius;
  const t2 = cosLat * sinLon * radius;

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
    z,
    visible: z >= 0.03, // Visible front hemisphere
  };
}

export const VectorGlobe: React.FC<VectorGlobeProps> = ({
  events,
  className = '',
  speed = 0.0018,
  isRotating = true,
  resetSignal = 0,
  targetFocus = null,
  onSelectEvent,
  interactive = true,
  onCameraChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const containerWidthRef = useRef(560);

  // Direct Interactive Physics Refs
  const phiRef = useRef(0);
  const phiOffsetRef = useRef(0);
  const thetaOffsetRef = useRef(0.2);
  const velocityRef = useRef(0);

  // Tooltip & DOM Refs
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

  const interactiveRef = useRef(interactive);
  interactiveRef.current = interactive;

  const onSelectEventRef = useRef(onSelectEvent);
  onSelectEventRef.current = onSelectEvent;

  const onCameraChangeRef = useRef(onCameraChange);
  onCameraChangeRef.current = onCameraChange;

  // Selected top earthquakes for floating callout tags
  const topEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
      .slice(0, 10);
  }, [events]);
  const topEventsRef = useRef(topEvents);
  topEventsRef.current = topEvents;

  // Major earthquakes (M >= 5.8) for pulsing shockwave ripples
  const majorEvents = useMemo(() => {
    return events.filter((e) => (e.magnitude ?? 0) >= 5.8).slice(0, 8);
  }, [events]);
  const majorEventsRef = useRef(majorEvents);
  majorEventsRef.current = majorEvents;

  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Load clean 110m countries vector data
  useEffect(() => {
    fetch('/data/world_countries_110m.json')
      .then((res) => res.json())
      .then((data) => {
        if (data.features) setCountries(data.features);
      })
      .catch((err) => console.error('Failed to load world countries vector:', err));
  }, []);

  // Measure container width dynamically for responsive high-res rendering up to 820px
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 780;
        containerWidthRef.current = w;
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle Camera Target Focus
  useEffect(() => {
    if (!targetFocus) return;
    const [targetLat, targetLon] = targetFocus;
    const targetPhi = -(targetLon * Math.PI) / 180 + Math.PI / 2;
    const targetTheta = (targetLat * Math.PI) / 180;

    let startPhi = phiRef.current + phiOffsetRef.current;
    let diff = (targetPhi - startPhi) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

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

  // Proximity Hover Raycasting
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
        const proj = projectSphere(evt.latitude, evt.longitude, currentPhi, currentTheta, w);
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
      if (!interactiveRef.current) return;
      pointerInteracting.current = { x: e.clientX, y: e.clientY };
      startX = e.clientX;
      startY = e.clientY;
      lastX = e.clientX;
      velocityRef.current = 0;
      isDraggingRef.current = false;
      container.style.cursor = 'grabbing';
      try {
        container.setPointerCapture(e.pointerId);
      } catch {}
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

    const onPointerUp = (e: PointerEvent) => {
      if (pointerInteracting.current !== null) {
        pointerInteracting.current = null;
        container.style.cursor = interactiveRef.current ? 'grab' : 'default';
        try {
          container.releasePointerCapture(e.pointerId);
        } catch {}

        if (!isDraggingRef.current && hoveredEventRef.current) {
          onSelectEventRef.current?.(hoveredEventRef.current);
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      // If user is actively dragging the globe, allow wheel to fine-tune yaw
      if (pointerInteracting.current !== null) {
        e.preventDefault();
        phiOffsetRef.current += e.deltaY * 0.0015;
      }
      // Otherwise let wheel scroll naturally through the web page!
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

  // Main 60-120fps Vector Rendering Engine
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function render() {
      if (!document.hidden && canvas && ctx) {
        // Auto-rotation when not interacting
        if (isRotatingRef.current && pointerInteracting.current === null) {
          phiRef.current += speed;
        }

        // Momentum inertia decay
        if (pointerInteracting.current === null && Math.abs(velocityRef.current) > 0.0001) {
          phiOffsetRef.current += velocityRef.current;
          velocityRef.current *= 0.92;
        }

        const currentPhi = phiRef.current + phiOffsetRef.current;
        const currentTheta = thetaOffsetRef.current;

        // Emit live camera coordinates to HUD
        if (onCameraChangeRef.current) {
          const lat = (currentTheta * 180) / Math.PI;
          let lon = ((-currentPhi + Math.PI / 2) * 180) / Math.PI;
          lon = (((lon + 180) % 360) + 360) % 360 - 180;
          onCameraChangeRef.current({ lat, lon });
        }

        const w = containerWidthRef.current;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        if (canvas.width !== w * dpr) {
          canvas.width = w * dpr;
          canvas.height = w * dpr;
        }

        ctx.clearRect(0, 0, w * dpr, w * dpr);
        ctx.save();
        ctx.scale(dpr, dpr);

        const cx = w / 2;
        const cy = w / 2;
        const sphereRadius = (w / 2) * 0.82;

        // 1. Solid Matte Base Sphere with Subtle Atmospheric Gradient
        ctx.beginPath();
        ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(cx - sphereRadius * 0.3, cy - sphereRadius * 0.3, sphereRadius * 0.1, cx, cy, sphereRadius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.8, '#f8fafc');
        grad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = grad;
        ctx.fill();

        // Outer crisp rim silhouette
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        // Clip subsequent vector drawings to the sphere interior
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
        ctx.clip();

        // 2. Curved Wireframe Graticules (Latitude Parallels & Longitude Meridians)
        ctx.lineWidth = 0.65;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        for (const line of PRECOMPUTED_GRATICULES) {
          ctx.beginPath();
          let drawing = false;
          for (let i = 0; i < line.points.length; i++) {
            const [lat, lon] = line.points[i];
            const p = projectSphere(lat, lon, currentPhi, currentTheta, w);
            if (p.visible) {
              if (!drawing) {
                ctx.moveTo(p.x, p.y);
                drawing = true;
              } else {
                ctx.lineTo(p.x, p.y);
              }
            } else {
              drawing = false;
            }
          }
          ctx.stroke();
        }

        // 3. Vector Continental & Country Outlines
        if (countries.length > 0) {
          ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.85;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          for (const feature of countries) {
            const geom = feature.geometry;
            const polys = geom.type === 'Polygon' ? [geom.coordinates as number[][][]] : (geom.coordinates as number[][][][]);

            for (const poly of polys) {
              for (const ring of poly) {
                ctx.beginPath();
                let hasVisible = false;
                let drawing = false;

                for (let i = 0; i < ring.length; i++) {
                  const [lon, lat] = ring[i];
                  const p = projectSphere(lat, lon, currentPhi, currentTheta, w);
                  if (p.visible) {
                    hasVisible = true;
                    if (!drawing) {
                      ctx.moveTo(p.x, p.y);
                      drawing = true;
                    } else {
                      ctx.lineTo(p.x, p.y);
                    }
                  } else {
                    drawing = false;
                  }
                }

                if (hasVisible) {
                  ctx.fill();
                  ctx.stroke();
                }
              }
            }
          }
        }

        // 4. Seismic Event Markers (Clean Architectural Red Dots / Squares)
        const activeEvents = eventsRef.current;
        for (let i = 0; i < activeEvents.length; i++) {
          const evt = activeEvents[i];
          const proj = projectSphere(evt.latitude, evt.longitude, currentPhi, currentTheta, w);
          if (proj.visible) {
            const mag = evt.magnitude ?? 3.5;
            const size = Math.max(2.5, Math.min(6.5, (mag / 7.0) * 5.5));

            ctx.fillStyle = mag >= 5.5 ? '#ef4444' : '#3b82f6';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
            ctx.fill();

            // Hairline border around marker
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();
          }
        }

        ctx.restore(); // Restore clip
        ctx.restore(); // Restore scale

        // 5. Update Floating DOM Labels & Sonar Shockwaves
        if (labelsContainerRef.current) {
          const children = labelsContainerRef.current.children;
          const items = topEventsRef.current;

          const candidates: { elIndex: number; x: number; y: number; mag: number }[] = [];
          for (let i = 0; i < items.length && i < children.length; i++) {
            const evt = items[i];
            const proj = projectSphere(evt.latitude, evt.longitude, currentPhi, currentTheta, w);
            if (proj.visible) {
              candidates.push({ elIndex: i, x: proj.x, y: proj.y, mag: evt.magnitude ?? 0 });
            }
          }

          const allowedIndices = new Set<number>();
          if (candidates.length > 0) {
            allowedIndices.add(candidates[0].elIndex);
            if (candidates.length > 1) {
              const c1 = candidates[0];
              const c2 = candidates[1];
              if (Math.hypot(c1.x - c2.x, c1.y - c2.y) >= 85) {
                allowedIndices.add(c2.elIndex);
              }
            }
          }

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

        // Update Sonar Shockwaves for Major Earthquakes (M >= 5.8)
        if (shockwavesContainerRef.current) {
          const shockwaveChildren = shockwavesContainerRef.current.children;
          const mItems = majorEventsRef.current;
          for (let i = 0; i < mItems.length && i < shockwaveChildren.length; i++) {
            const evt = mItems[i];
            const proj = projectSphere(evt.latitude, evt.longitude, currentPhi, currentTheta, w);
            const el = shockwaveChildren[i] as HTMLElement;
            if (proj.visible) {
              el.style.opacity = '1';
              el.style.transform = `translate3d(${proj.x}px, ${proj.y}px, 0) translate(-50%, -50%)`;
            } else {
              el.style.opacity = '0';
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [countries, speed]);

  return (
    <div
      ref={containerRef}
      style={{ cursor: interactive ? 'grab' : 'default', touchAction: interactive ? 'none' : 'auto' }}
      className={`relative w-full aspect-square max-w-[620px] sm:max-w-[740px] lg:max-w-[820px] select-none mx-auto flex items-center justify-center will-change-transform ${className}`}
    >
      {/* 1. Vector 2D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
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
              <span className="absolute w-14 h-14 rounded-full border border-rose-500/50 animate-ping duration-1000" />
              <span className="absolute w-8 h-8 rounded-full border border-rose-400/60 animate-pulse" />
              <span className="relative w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
            </span>
          </div>
        ))}
      </div>

      {/* 3. Floating Frosted Glass Badges */}
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
