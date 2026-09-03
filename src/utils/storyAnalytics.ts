import { SeismicEvent } from '../types/seismic';

export interface StoryChapter {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  coordinates: [number, number];
  stats?: {
    label: string;
    value: string;
  }[];
  event?: SeismicEvent;
}

/**
 * Derives dynamic narrative chapters based on the active telemetry dataset.
 */
export function buildStoryChapters(events: SeismicEvent[]): StoryChapter[] {
  if (events.length === 0) {
    return [
      {
        id: 'hero',
        badge: '01 // TELEMETRY',
        title: 'Planetary Pulse',
        subtitle: 'Awaiting Global Seismic Sync',
        description: 'The global monitoring network is currently syncing real-time crustal displacement records.',
        coordinates: [0, 0],
      },
    ];
  }

  // 1. Peak Shock (Maximum Magnitude Event)
  const peakEvent = [...events].sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))[0];

  // 2. Deepest Hypocenter (Maximum Depth Event)
  const deepestEvent = [...events].sort((a, b) => b.depth - a.depth)[0];

  // 3. Regional Swarm Analysis (Identify dense cluster by country/region keyword)
  const regionCounts: Record<string, { count: number; sample: SeismicEvent }> = {};
  for (const e of events) {
    const place = e.place || '';
    let region = 'Global Oceanic';
    if (/indonesia|java|sumatra|bali|sulawesi|banda|maluku/i.test(place)) region = 'Indonesia Archipelago';
    else if (/japan|honshu|hokkaido|ryukyu/i.test(place)) region = 'Japan Trench';
    else if (/alaska|aleutian/i.test(place)) region = 'Aleutian Subduction Arc';
    else if (/chile|peru|andes/i.test(place)) region = 'South American Trench';
    else if (/fiji|tonga|kermadec|vanuatu/i.test(place)) region = 'Tonga-Kermadec Arc';
    else if (/california|san andreas|nevada/i.test(place)) region = 'San Andreas Transform';
    else if (/philippines/i.test(place)) region = 'Philippine Sea Plate';

    if (!regionCounts[region]) {
      regionCounts[region] = { count: 0, sample: e };
    }
    regionCounts[region].count++;
  }

  let topRegionName = 'Pacific Rim Subduction';
  let topRegionCount = 0;
  let topRegionSample = events[0];

  for (const [r, data] of Object.entries(regionCounts)) {
    if (data.count > topRegionCount) {
      topRegionCount = data.count;
      topRegionName = r;
      topRegionSample = data.sample;
    }
  }

  // Global aggregate metrics
  const avgDepth = (events.reduce((sum, e) => sum + e.depth, 0) / events.length).toFixed(1);
  const majorShocksCount = events.filter((e) => (e.magnitude ?? 0) >= 5.0).length;

  return [
    {
      id: 'chapter-1',
      badge: '01 // GLOBAL CONVERGENCE',
      title: 'Planetary Pulse',
      subtitle: 'Earth’s Dynamic Crust in Motion',
      description:
        `Across the globe, tectonic plates continuously collide, subduct, and fracture. In this observation window, our telemetry monitors ${events.length} seismic tremors with an average hypocenter depth of ${avgDepth} km, including ${majorShocksCount} significant tremors above M5.0.`,
      coordinates: [12.0, 115.0], // Neutral Asia-Pacific vista
      stats: [
        { label: 'RECORDED SHOCKS', value: `${events.length}` },
        { label: 'MAJOR TREMORS (M≥5)', value: `${majorShocksCount}` },
        { label: 'MEAN CRUST DEPTH', value: `${avgDepth} km` },
      ],
    },
    {
      id: 'chapter-2',
      badge: '02 // MAXIMUM ENERGY DISCHARGE',
      title: 'The Peak Tremor',
      subtitle: peakEvent.place || 'Unknown Epicenter',
      description:
        `The single most energetic shock recorded is Magnitude ${peakEvent.magnitude?.toFixed(1) ?? 'N/A'}, originating at a focal depth of ${peakEvent.depth.toFixed(1)} km. The rupture generated high-frequency shear waves radiating through the lithosphere, detected by global seismograph arrays.`,
      coordinates: [peakEvent.latitude, peakEvent.longitude],
      event: peakEvent,
      stats: [
        { label: 'PEAK MAGNITUDE', value: `M${peakEvent.magnitude?.toFixed(1) ?? 'N/A'}` },
        { label: 'FOCAL DEPTH', value: `${peakEvent.depth.toFixed(1)} km` },
        { label: 'COORDINATES', value: `${peakEvent.latitude.toFixed(2)}°, ${peakEvent.longitude.toFixed(2)}°` },
      ],
    },
    {
      id: 'chapter-3',
      badge: '03 // MANTLE SUBDUCTION',
      title: 'The Deep Earth Abyss',
      subtitle: deepestEvent.place || 'Deep Oceanic Trench',
      description:
        `Most earthquakes occur within the upper 30 km crust, but this deep-focus event struck at ${deepestEvent.depth.toFixed(1)} km below the surface. Here, an oceanic plate plunges into the semi-molten asthenosphere along the Wadati-Benioff subduction zone.`,
      coordinates: [deepestEvent.latitude, deepestEvent.longitude],
      event: deepestEvent,
      stats: [
        { label: 'HYPOCENTER DEPTH', value: `${deepestEvent.depth.toFixed(1)} km` },
        { label: 'MAGNITUDE', value: `M${deepestEvent.magnitude?.toFixed(1) ?? 'N/A'}` },
        { label: 'ZONE', value: 'Wadati-Benioff Slab' },
      ],
    },
    {
      id: 'chapter-4',
      badge: '04 // SEISMIC DENSITY CLUSTER',
      title: 'Active Tectonic Swarm',
      subtitle: `${topRegionName} (${topRegionCount} Shocks Recorded)`,
      description:
        `Tectonic stress is rarely distributed evenly. Right now, the ${topRegionName} experiences an intense concentration of tremors, accounting for ${topRegionCount} separate micro and macro-seismic ruptures along interlocking fault boundaries.`,
      coordinates: [topRegionSample.latitude, topRegionSample.longitude],
      stats: [
        { label: 'SWARM CONCENTRATION', value: `${topRegionCount} Events` },
        { label: 'FAULT COMPLEX', value: topRegionName },
        { label: 'SEISMIC STATUS', value: 'Elevated Microseism' },
      ],
    },
    {
      id: 'chapter-5',
      badge: '05 // FULL EXPLORATION',
      title: 'Interactive 3D Observatory',
      subtitle: 'Free Planetary Navigation Unlocked',
      description:
        'You have reached the live telemetry laboratory. Full interactive rotation, zoom, region scrubbers, time filters, and event bookmarking are now accessible.',
      coordinates: [topRegionSample.latitude, topRegionSample.longitude],
      stats: [
        { label: 'CONTROLS', value: 'Interactive' },
        { label: 'ORBIT', value: 'Unlocked' },
        { label: 'FEED', value: 'Real-Time' },
      ],
    },
  ];
}
