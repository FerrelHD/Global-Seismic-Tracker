/**
 * Precomputes 3D wireframe graticule coordinate lines (parallels & meridians).
 */
export interface GraticuleLine {
  type: 'parallel' | 'meridian';
  points: [number, number][]; // [lat, lon][]
}

export function generateGraticule(latStep = 30, lonStep = 30, pointResolution = 2.5): GraticuleLine[] {
  const lines: GraticuleLine[] = [];

  // 1. Latitude Parallels (Circles around the sphere)
  for (let lat = -60; lat <= 60; lat += latStep) {
    const points: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += pointResolution) {
      points.push([lat, lon]);
    }
    lines.push({ type: 'parallel', points });
  }

  // 2. Longitude Meridians (Pole-to-pole lines)
  for (let lon = -180; lon < 180; lon += lonStep) {
    const points: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += pointResolution) {
      points.push([lat, lon]);
    }
    lines.push({ type: 'meridian', points });
  }

  return lines;
}

export const PRECOMPUTED_GRATICULES = generateGraticule(30, 30, 2.5);
