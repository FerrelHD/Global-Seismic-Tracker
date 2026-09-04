import React, { useEffect, useRef, useMemo, useState } from 'react';
import { SeismicEvent } from '../../types/seismic';
import { PRECOMPUTED_GRATICULES } from '../../utils/graticule';

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
  scrollPhi?: number;
  scrollTheta?: number;
  colorMode?: 'magnitude' | 'depth';
  timelapseTimestamp?: number | null;
}

interface PrecomputedRing {
  vectors: Float32Array; // Flattened [t0, t1, t2, ...]
  count: number;
}

interface PrecomputedFeature {
  rings: PrecomputedRing[];
}

interface PrecomputedEvent {
  evt: SeismicEvent;
  t0: number;
  t1: number;
  t2: number;
  eventTime: number;
}

interface CameraMatrix {
  m00: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
  m20: number;
  m21: number;
  m22: number;
  width: number;
}

function cleanPlace(place: string | null): string {
  if (!place) return 'EPICENTER';
  const parts = place.split(' of ');
  const name = parts.length > 1 ? parts[1] : place;
  return name.replace(/,.*$/, '').trim().toUpperCase();
}

/**
 * Precomputes 3D Cartesian spherical coordinate [t0, t1, t2] on a sphere of radius 0.82.
 * This runs ONCE when data loads, eliminating all per-frame trigonometry.
 */
function geoToSphereVector(lat: number, lon: number, radius = 0.82): [number, number, number] {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180 - Math.PI;

  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const cosLon = Math.cos(lonRad);
  const sinLon = Math.sin(lonRad);

  return [
    -cosLat * cosLon * radius,
    sinLat * radius,
    cosLat * sinLon * radius,
  ];
}

/**
 * Creates camera transformation matrix once per frame.
 */
function getCameraMatrix(phi: number, theta: number, width: number): CameraMatrix {
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  return {
    m00: cosPhi,
    m02: sinPhi,
    m10: sinPhi * sinTheta,
    m11: cosTheta,
    m12: -cosPhi * sinTheta,
    m20: -sinPhi * cosTheta,
    m21: sinTheta,
    m22: cosPhi * cosTheta,
    width,
  };
}

/**
 * Fallback projection helper for single coordinates
 */
export function projectSphere(
  lat: number,
  lon: number,
  phi: number,
  theta: number,
  width: number,
  radius = 0.82
) {
  const [t0, t1, t2] = geoToSphereVector(lat, lon, radius);
  const m = getCameraMatrix(phi, theta, width);
  const c = m.m00 * t0 + m.m02 * t2;
  const s = m.m10 * t0 + m.m11 * t1 + m.m12 * t2;
  const z = m.m20 * t0 + m.m21 * t1 + m.m22 * t2;

  return {
    x: ((c + 1) * 0.5) * width,
    y: ((-s + 1) * 0.5) * width,
    z,
    visible: z >= 0.03,
  };
}

// Precompute graticules once at module load
const PRECOMPUTED_GRATICULE_RINGS: PrecomputedRing[] = PRECOMPUTED_GRATICULES.map((line) => {
  const vectors = new Float32Array(line.points.length * 3);
  for (let i = 0; i < line.points.length; i++) {
    const [lat, lon] = line.points[i];
    const [t0, t1, t2] = geoToSphereVector(lat, lon, 0.82);
    vectors[i * 3] = t0;
    vectors[i * 3 + 1] = t1;
    vectors[i * 3 + 2] = t2;
  }
  return { vectors, count: line.points.length };
});

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
  scrollPhi = 0,
  scrollTheta = 0,
  colorMode = 'magnitude',
  timelapseTimestamp = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [countries, setCountries] = useState<PrecomputedFeature[]>([]);
  const containerWidthRef = useRef(560);

  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;

  const timelapseTimestampRef = useRef(timelapseTimestamp);
  timelapseTimestampRef.current = timelapseTimestamp;

  // Direct Interactive Physics Refs - Default centered on Indonesian archipelago (Lat -0.78, Lon 118.0)
  const indoPhi = -((118.0 + 90) * Math.PI) / 180;
  const phiRef = useRef(0);
  const phiOffsetRef = useRef(indoPhi);
  const thetaOffsetRef = useRef(-0.013);
  const velocityRef = useRef(0);

  // Scroll-driven kinetic rotation refs
  const scrollPhiTargetRef = useRef(scrollPhi);
  const scrollPhiCurrentRef = useRef(scrollPhi);
  const scrollThetaTargetRef = useRef(scrollTheta);
  const scrollThetaCurrentRef = useRef(scrollTheta);

  useEffect(() => {
    scrollPhiTargetRef.current = scrollPhi;
    scrollThetaTargetRef.current = scrollTheta;
  }, [scrollPhi, scrollTheta]);

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

  // Precompute seismic events vectors whenever events prop updates
  const precomputedEvents = useMemo(() => {
    return events.map((evt) => {
      const [t0, t1, t2] = geoToSphereVector(evt.latitude, evt.longitude, 0.82);
      const eventTime = new Date(evt.occurred_at).getTime();
      return { evt, t0, t1, t2, eventTime };
    });
  }, [events]);
  const precomputedEventsRef = useRef<PrecomputedEvent[]>(precomputedEvents);
  precomputedEventsRef.current = precomputedEvents;

  // Selected top earthquakes for floating callout tags
  const topEvents = useMemo(() => {
    return [...precomputedEvents]
      .sort((a, b) => (b.evt.magnitude ?? 0) - (a.evt.magnitude ?? 0))
      .slice(0, 10);
  }, [precomputedEvents]);
  const topEventsRef = useRef(topEvents);
  topEventsRef.current = topEvents;

  // Major earthquakes (M >= 5.8) for pulsing shockwave ripples
  const majorEvents = useMemo(() => {
    return precomputedEvents.filter((e) => (e.evt.magnitude ?? 0) >= 5.8).slice(0, 8);
  }, [precomputedEvents]);
  const majorEventsRef = useRef(majorEvents);
  majorEventsRef.current = majorEvents;

  // Load world countries vector and high-resolution Indonesian archipelago islands
  useEffect(() => {
    Promise.all([
      fetch('/data/world_countries_110m.json').then((res) => res.json()).catch(() => null),
      fetch('/data/indonesia_islands.json').then((res) => res.json()).catch(() => null),
    ])
      .then(([worldData, indoData]) => {
        const features: PrecomputedFeature[] = [];

        const parseFeat = (feat: any) => {
          const geom = feat?.geometry;
          if (!geom) return null;
          const polys =
            geom.type === 'Polygon'
              ? [geom.coordinates as number[][][]]
              : (geom.coordinates as number[][][][]);

          const rings: PrecomputedRing[] = [];
          for (const poly of polys) {
            for (const ring of poly) {
              if (ring.length < 3) continue;
              const vectors = new Float32Array(ring.length * 3);
              for (let i = 0; i < ring.length; i++) {
                const [lon, lat] = ring[i];
                const [t0, t1, t2] = geoToSphereVector(lat, lon, 0.82);
                vectors[i * 3] = t0;
                vectors[i * 3 + 1] = t1;
                vectors[i * 3 + 2] = t2;
              }
              rings.push({ vectors, count: ring.length });
            }
          }
          return rings.length > 0 ? { rings } : null;
        };

        // 1. World countries (exclude coarse Indonesia polygon if high-res archipelago is available)
        if (worldData?.features) {
          for (const feat of worldData.features) {
            const isIndo = feat.properties?.name === 'Indonesia' || feat.id === 'IDN';
            if (isIndo && indoData?.features) continue; // Replaced by high-resolution islands!
            const parsed = parseFeat(feat);
            if (parsed) features.push(parsed);
          }
        }

        // 2. High-resolution Indonesian archipelago (1,000+ detailed islands)
        if (indoData?.features) {
          for (const feat of indoData.features) {
            const parsed = parseFeat(feat);
            if (parsed) features.push(parsed);
          }
        }

        setCountries(features);
      })
      .catch((err) => console.error('Failed to load world & indonesia vector:', err));
  }, []);

  // Measure container width dynamically for responsive high-res rendering
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
    const targetPhi = -((targetLon + 90) * Math.PI) / 180;
    const targetTheta = (targetLat * Math.PI) / 180;

    let startPhi = phiRef.current + phiOffsetRef.current + scrollPhiCurrentRef.current;
    let diff = (targetPhi - startPhi) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff -= Math.PI * 2;
    // Ensure dynamic spin flourish on chapter entrance when angular diff is small
    if (Math.abs(diff) < 0.35) {
      diff += Math.PI * 2;
    }

    const startTheta = thetaOffsetRef.current + scrollThetaCurrentRef.current;
    const startTime = performance.now();
    const duration = 1200;

    const animateCamera = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);

      phiOffsetRef.current = startPhi + diff * ease - phiRef.current - scrollPhiCurrentRef.current;
      thetaOffsetRef.current = startTheta + (targetTheta - startTheta) * ease - scrollThetaCurrentRef.current;

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    requestAnimationFrame(animateCamera);
  }, [targetFocus]);

  // Handle Reset Signal - Reset to Indonesia
  useEffect(() => {
    if (resetSignal === 0) return;
    phiOffsetRef.current = indoPhi;
    thetaOffsetRef.current = 0.05;
    velocityRef.current = 0;
  }, [resetSignal]);

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
      const w = containerWidthRef.current;

      const currentPhi = phiRef.current + phiOffsetRef.current + scrollPhiCurrentRef.current;
      const currentTheta = Math.max(-0.85, Math.min(1.0, thetaOffsetRef.current + scrollThetaCurrentRef.current));
      const matrix = getCameraMatrix(currentPhi, currentTheta, w);

      let closestEvt: SeismicEvent | null = null;
      let minDistance = 24;
      let closestX = 0;
      let closestY = 0;

      const activeEvents = precomputedEventsRef.current;
      const currentTimelapse = timelapseTimestampRef.current;
      for (let i = 0; i < activeEvents.length; i++) {
        const item = activeEvents[i];
        if (currentTimelapse != null && item.eventTime > currentTimelapse) {
          continue;
        }
        const c = matrix.m00 * item.t0 + matrix.m02 * item.t2;
        const s = matrix.m10 * item.t0 + matrix.m11 * item.t1 + matrix.m12 * item.t2;
        const z = matrix.m20 * item.t0 + matrix.m21 * item.t1 + matrix.m22 * item.t2;

        if (z >= 0.03) {
          const px = ((c + 1) * 0.5) * w;
          const py = ((-s + 1) * 0.5) * w;
          const dist = Math.hypot(px - mouseX, py - mouseY);
          if (dist < minDistance) {
            minDistance = dist;
            closestEvt = item.evt;
            closestX = px;
            closestY = py;
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
      if (pointerInteracting.current !== null) {
        e.preventDefault();
        phiOffsetRef.current += e.deltaY * 0.0015;
      }
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

  // Main 60fps Vector Rendering Engine with Precomputed Vector Pipeline
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

        // Lerp scroll rotation for fluid continuous momentum
        scrollPhiCurrentRef.current += (scrollPhiTargetRef.current - scrollPhiCurrentRef.current) * 0.14;
        scrollThetaCurrentRef.current += (scrollThetaTargetRef.current - scrollThetaCurrentRef.current) * 0.14;

        const currentPhi = phiRef.current + phiOffsetRef.current + scrollPhiCurrentRef.current;
        const currentTheta = Math.max(-0.85, Math.min(1.0, thetaOffsetRef.current + scrollThetaCurrentRef.current));

        // Emit live camera coordinates to HUD
        if (onCameraChangeRef.current) {
          const lat = (currentTheta * 180) / Math.PI;
          let lon = -90 - (currentPhi * 180) / Math.PI;
          lon = (((lon + 180) % 360) + 360) % 360 - 180;
          onCameraChangeRef.current({ lat, lon });
        }

        const w = containerWidthRef.current;
        const isMobile = window.innerWidth < 768;
        const maxDpr = isMobile ? 1.25 : 1.5;
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

        if (canvas.width !== Math.round(w * dpr)) {
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(w * dpr);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        const cx = w / 2;
        const cy = w / 2;
        const sphereRadius = (w / 2) * 0.82;

        // 1. Solid Matte Base Sphere with Atmospheric Gradient
        ctx.beginPath();
        ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(
          cx - sphereRadius * 0.3,
          cy - sphereRadius * 0.3,
          sphereRadius * 0.1,
          cx,
          cy,
          sphereRadius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.8, '#f8fafc');
        grad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = grad;
        ctx.fill();

        // Outer crisp rim silhouette
        ctx.lineWidth = 1.0;
        ctx.strokeStyle = '#334155';
        ctx.stroke();

        // Clip subsequent drawings to sphere interior
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, sphereRadius, 0, Math.PI * 2);
        ctx.clip();

        // Construct frame camera matrix
        const matrix = getCameraMatrix(currentPhi, currentTheta, w);

        // 2. Precomputed Curved Wireframe Graticules
        ctx.lineWidth = 0.65;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        for (let g = 0; g < PRECOMPUTED_GRATICULE_RINGS.length; g++) {
          const line = PRECOMPUTED_GRATICULE_RINGS[g];
          const vec = line.vectors;
          const count = line.count;
          ctx.beginPath();
          let drawing = false;

          for (let i = 0; i < count; i++) {
            const idx = i * 3;
            const t0 = vec[idx];
            const t1 = vec[idx + 1];
            const t2 = vec[idx + 2];

            const c = matrix.m00 * t0 + matrix.m02 * t2;
            const s = matrix.m10 * t0 + matrix.m11 * t1 + matrix.m12 * t2;
            const z = matrix.m20 * t0 + matrix.m21 * t1 + matrix.m22 * t2;

            if (z >= 0.03) {
              const px = ((c + 1) * 0.5) * w;
              const py = ((-s + 1) * 0.5) * w;
              if (!drawing) {
                ctx.moveTo(px, py);
                drawing = true;
              } else {
                ctx.lineTo(px, py);
              }
            } else {
              drawing = false;
            }
          }
          ctx.stroke();
        }

        // 3. Precomputed Continental & Country Vector Outlines
        if (countries.length > 0) {
          ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.85;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';

          for (let f = 0; f < countries.length; f++) {
            const feature = countries[f];
            for (let r = 0; r < feature.rings.length; r++) {
              const ring = feature.rings[r];
              const vec = ring.vectors;
              const count = ring.count;
              ctx.beginPath();
              let hasVisible = false;
              let drawing = false;

              for (let i = 0; i < count; i++) {
                const idx = i * 3;
                const t0 = vec[idx];
                const t1 = vec[idx + 1];
                const t2 = vec[idx + 2];

                const c = matrix.m00 * t0 + matrix.m02 * t2;
                const s = matrix.m10 * t0 + matrix.m11 * t1 + matrix.m12 * t2;
                const z = matrix.m20 * t0 + matrix.m21 * t1 + matrix.m22 * t2;

                if (z >= 0.03) {
                  hasVisible = true;
                  const px = ((c + 1) * 0.5) * w;
                  const py = ((-s + 1) * 0.5) * w;
                  if (!drawing) {
                    ctx.moveTo(px, py);
                    drawing = true;
                  } else {
                    ctx.lineTo(px, py);
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

        // 4. Precomputed Seismic Event Markers
        const activeEvents = precomputedEventsRef.current;
        const currentMode = colorModeRef.current;
        const currentTimelapse = timelapseTimestampRef.current;

        for (let i = 0; i < activeEvents.length; i++) {
          const item = activeEvents[i];
          if (currentTimelapse != null && item.eventTime > currentTimelapse) {
            continue;
          }

          const c = matrix.m00 * item.t0 + matrix.m02 * item.t2;
          const s = matrix.m10 * item.t0 + matrix.m11 * item.t1 + matrix.m12 * item.t2;
          const z = matrix.m20 * item.t0 + matrix.m21 * item.t1 + matrix.m22 * item.t2;

          if (z >= 0.03) {
            const px = ((c + 1) * 0.5) * w;
            const py = ((-s + 1) * 0.5) * w;
            const mag = item.evt.magnitude ?? 3.5;
            const size = Math.max(2.5, Math.min(6.5, (mag / 7.0) * 5.5));

            let fillColor = '#3b82f6';
            if (currentMode === 'depth') {
              const d = item.evt.depth;
              if (d < 70) {
                fillColor = '#f43f5e'; // Shallow / Crustal (<70km)
              } else if (d <= 300) {
                fillColor = '#f59e0b'; // Intermediate (70-300km)
              } else {
                fillColor = '#06b6d4'; // Deep (>300km Wadati-Benioff)
              }
            } else {
              fillColor = mag >= 5.5 ? '#ef4444' : '#3b82f6';
            }

            // Fresh event rupture ripple pulse when scrubbing in time-lapse mode
            if (currentTimelapse != null) {
              const ageMs = currentTimelapse - item.eventTime;
              if (ageMs >= 0 && ageMs < 43200000) {
                const pulseP = (ageMs % 21600000) / 21600000;
                ctx.save();
                ctx.beginPath();
                ctx.arc(px, py, size + pulseP * 18, 0, Math.PI * 2);
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

            // Hairline white border around marker
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
            const item = items[i];
            if (currentTimelapse != null && item.eventTime > currentTimelapse) {
              continue;
            }
            const c = matrix.m00 * item.t0 + matrix.m02 * item.t2;
            const s = matrix.m10 * item.t0 + matrix.m11 * item.t1 + matrix.m12 * item.t2;
            const z = matrix.m20 * item.t0 + matrix.m21 * item.t1 + matrix.m22 * item.t2;

            if (z >= 0.03) {
              const px = ((c + 1) * 0.5) * w;
              const py = ((-s + 1) * 0.5) * w;
              candidates.push({ elIndex: i, x: px, y: py, mag: item.evt.magnitude ?? 0 });
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
            const item = mItems[i];
            const el = shockwaveChildren[i] as HTMLElement;

            if (currentTimelapse != null && item.eventTime > currentTimelapse) {
              el.style.opacity = '0';
              continue;
            }

            const c = matrix.m00 * item.t0 + matrix.m02 * item.t2;
            const s = matrix.m10 * item.t0 + matrix.m11 * item.t1 + matrix.m12 * item.t2;
            const z = matrix.m20 * item.t0 + matrix.m21 * item.t1 + matrix.m22 * item.t2;

            if (z >= 0.03) {
              const px = ((c + 1) * 0.5) * w;
              const py = ((-s + 1) * 0.5) * w;
              el.style.opacity = '1';
              el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
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
      className={`relative w-full h-full aspect-square select-none mx-auto flex items-center justify-center will-change-transform ${className}`}
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
        {majorEvents.map((item) => {
          const evt = item.evt;
          return (
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
          );
        })}
      </div>

      {/* 3. Floating Architectural Blueprint Tags (No Clumsy Oval Capsules) */}
      <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none">
        {topEvents.map((item) => {
          const evt = item.evt;
          const mag = evt.magnitude?.toFixed(1) ?? '';
          const isMajor = (evt.magnitude ?? 0) >= 6.0;

          return (
            <div
              key={evt.usgs_id || evt.id}
              className="label-tag absolute top-0 left-0 transition-opacity duration-200 z-20 cursor-pointer pointer-events-auto will-change-transform flex flex-col items-center"
              style={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectEventRef.current?.(evt);
              }}
            >
              {/* Architectural Precision Data Flag */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/95 hover:bg-white text-slate-900 font-mono text-[10px] tracking-wide shadow-xs border border-slate-300/80 whitespace-nowrap hover:scale-105 active:scale-95 transition-all backdrop-blur-md">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isMajor
                      ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse'
                      : 'bg-blue-600'
                  }`}
                />
                <span className="font-semibold text-slate-900 tracking-wider">
                  {cleanPlace(evt.place)}
                </span>
                <span className="text-slate-300 font-light">/</span>
                <span
                  className={`font-bold tabular-nums ${
                    isMajor ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {mag}
                </span>
              </div>
              {/* 1px Hairline Leader Stem pointing to epicenter */}
              <div className="w-px h-1.5 bg-slate-400/80" />
            </div>
          );
        })}
      </div>

      {/* 4. Precision Micro-Telemetry Strip (Floating HUD Reticle) */}
      <div
        ref={tooltipRef}
        style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
        className="z-30 pointer-events-none will-change-transform"
      >
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950/90 text-white font-mono text-[11px] shadow-xl border border-slate-800 whitespace-nowrap backdrop-blur-xl">
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
    </div>
  );
};
