import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { SeismicEvent } from '../../types/seismic';
import { geoToCoords } from '../../utils/geoTo3d';

interface FloatingSeismicBadgesProps {
  events: SeismicEvent[];
  radius?: number;
}

// Editorial color palette matching Cobe design
const BADGE_COLORS = [
  { bg: '#e76f51', rotate: -5 },
  { bg: '#2a9d8f', rotate: 4 },
  { bg: '#264653', rotate: -3 },
  { bg: '#e84855', rotate: 6 },
  { bg: '#7b2cbf', rotate: -4 },
  { bg: '#f4a261', rotate: 5 },
  { bg: '#457b9d', rotate: -6 },
  { bg: '#e63946', rotate: 3 },
];

function cleanPlaceName(place: string | null): string {
  if (!place) return 'Unknown';
  // If format like "84 km SSW of Nikolski, Alaska" -> "Nikolski, Alaska"
  const parts = place.split(' of ');
  if (parts.length > 1) {
    return parts[1];
  }
  return place;
}

export const FloatingSeismicBadges: React.FC<FloatingSeismicBadgesProps> = ({
  events,
  radius = 2.5,
}) => {
  // Select top 7 highest magnitude events for prominent floating labels
  const topEvents = useMemo(() => {
    return [...events]
      .filter((e) => (e.magnitude ?? 0) >= 3.5)
      .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
      .slice(0, 8);
  }, [events]);

  return (
    <group>
      {topEvents.map((evt, idx) => {
        // Position badge slightly above the globe surface
        const coords = geoToCoords(evt.latitude, evt.longitude, radius + 0.08);
        const styleConfig = BADGE_COLORS[idx % BADGE_COLORS.length];
        const placeTitle = cleanPlaceName(evt.place);
        const magText = evt.magnitude ? `M${evt.magnitude.toFixed(1)}` : '';

        return (
          <group key={evt.id || idx} position={coords}>
            {/* Small anchor pin dot on surface */}
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.02, 12, 12]} />
              <meshBasicMaterial color={styleConfig.bg} />
            </mesh>

            {/* Floating Cobe-style HTML Pill Label */}
            <Html
              center
              distanceFactor={8}
              occlude="blending"
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
                transition: 'opacity 0.25s ease',
              }}
            >
              <div
                style={{
                  transform: `rotate(${styleConfig.rotate}deg)`,
                  backgroundColor: styleConfig.bg,
                  boxShadow:
                    '0 1px 3px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.12), inset 0 -1px 0 rgba(0,0,0,0.15)',
                }}
                className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-white font-sans text-xs font-semibold whitespace-nowrap shadow-md"
              >
                {/* Glossy top sheen highlight */}
                <span className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/35 to-transparent rounded-t-md pointer-events-none" />

                <span className="drop-shadow-sm truncate max-w-[140px] tracking-tight">
                  {placeTitle}
                </span>
                <span className="px-1 py-0.2 rounded bg-black/25 text-[10px] font-mono font-bold tracking-wider">
                  {magText}
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
