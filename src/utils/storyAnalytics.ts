import { SeismicEvent, VolcanoActivity } from '../types/seismic';
import { Language } from './i18n';

export type TectonicVectorType = 'sunda' | 'palu' | 'banda' | 'papua' | 'epilog';

export interface StoryChapter {
  id: string;
  badge: string;
  plateTag?: string;
  chapterNumber: string;
  title: string;
  subtitle: string;
  description: string;
  coordinates: [number, number];
  zoom: number;
  vectorType: TectonicVectorType;
  regionBounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  stats: {
    label: string;
    value: string;
  }[];
  liveMetrics: {
    quakeCount: number;
    maxMag: string;
    volcanoCount: number;
  };
}

function computeZoneMetrics(
  events: SeismicEvent[],
  volcanoes: VolcanoActivity[],
  bounds: StoryChapter['regionBounds']
): StoryChapter['liveMetrics'] {
  const zoneQuakes = events.filter(
    (e) =>
      e.latitude >= bounds.minLat &&
      e.latitude <= bounds.maxLat &&
      e.longitude >= bounds.minLon &&
      e.longitude <= bounds.maxLon
  );

  const maxMagVal =
    zoneQuakes.length > 0 ? Math.max(...zoneQuakes.map((e) => e.magnitude ?? 0)) : 0;

  const zoneVolcanoes = volcanoes.filter(
    (v) =>
      v.latitude >= bounds.minLat &&
      v.latitude <= bounds.maxLat &&
      v.longitude >= bounds.minLon &&
      v.longitude <= bounds.maxLon &&
      (v.alert_level === 'Level III' || v.alert_level === 'Level IV' || v.alert_level === 'Level II')
  );

  return {
    quakeCount: zoneQuakes.length,
    maxMag: maxMagVal > 0 ? `M${maxMagVal.toFixed(1)}` : '—',
    volcanoCount: zoneVolcanoes.length,
  };
}

const REGION_BOUNDS = {
  sunda: { minLat: -11.5, maxLat: 6.5, minLon: 93.0, maxLon: 116.5 },
  palu: { minLat: -6.0, maxLat: 4.5, minLon: 117.0, maxLon: 126.5 },
  banda: { minLat: -10.5, maxLat: 1.5, minLon: 124.5, maxLon: 134.5 },
  papua: { minLat: -8.5, maxLat: 1.5, minLon: 132.0, maxLon: 142.5 },
  epilog: { minLat: -12.0, maxLat: 7.5, minLon: 94.0, maxLon: 142.0 },
};

/**
 * Derives bilingual Indonesian tectonic narrative chapters bound with live seismic & volcanic metrics.
 */
export function buildStoryChapters(
  events: SeismicEvent[] = [],
  volcanoes: VolcanoActivity[] = [],
  lang: Language = 'id'
): StoryChapter[] {
  const isId = lang === 'id';

  const sundaLive = computeZoneMetrics(events, volcanoes, REGION_BOUNDS.sunda);
  const paluLive = computeZoneMetrics(events, volcanoes, REGION_BOUNDS.palu);
  const bandaLive = computeZoneMetrics(events, volcanoes, REGION_BOUNDS.banda);
  const papuaLive = computeZoneMetrics(events, volcanoes, REGION_BOUNDS.papua);
  const epilogLive = computeZoneMetrics(events, volcanoes, REGION_BOUNDS.epilog);

  if (isId) {
    return [
      {
        id: 'chapter-1',
        chapterNumber: '01',
        badge: '01 // ZONA SUBDUKSI SUNDA',
        plateTag: 'KONVERGENSI INDO-AUSTRALIA ⇄ EURASIA',
        title: 'Megathrust Sunda',
        subtitle: 'Palung Sumatera-Jawa · 4.5° LS, 102.0° BT',
        description:
          'Lempeng samudera Indo-Australia menunjam ke bawah paparan benua Sunda dengan laju 50–70 mm/tahun. Penguncian friksional raksasa ini mengakumulasi regangan elastis masif dari Aceh hingga Palung Jawa, memicu gempa megathrust siklis dan ancaman tsunamigenik di sepanjang pesisir kepulauan.',
        coordinates: [-4.5, 102.0],
        zoom: 1.55,
        vectorType: 'sunda',
        regionBounds: REGION_BOUNDS.sunda,
        stats: [
          { label: 'KONVERGENSI', value: '6.2 cm/thn' },
          { label: 'KEDALAMAN PALUNG', value: '7.140 m' },
          { label: 'TINGKAT BAHAYA', value: 'KRITIS' },
        ],
        liveMetrics: sundaLive,
      },
      {
        id: 'chapter-2',
        chapterNumber: '02',
        badge: '02 // DINAMIKA SESAR GESER',
        plateTag: 'SIMPANG TIGA SULAWESI · SESAR SINISTRAL',
        title: 'Sistem Sesar Palu-Koro',
        subtitle: 'Transform Sulawesi Tengah · 0.9° LS, 119.8° BT',
        description:
          'Membelah Sulawesi Tengah langsung menuju Teluk Palu, sesar Palu-Koro adalah salah satu patahan geser benua tercepat di dunia dengan slip rate melebihi 35 mm/tahun. Pergeseran mendatar sinistral ini mengakomodasi rotasi mikro-lempeng cepat yang dapat memicu pergeseran supershear mendadak.',
        coordinates: [-0.9, 119.8],
        zoom: 2.35,
        vectorType: 'palu',
        regionBounds: REGION_BOUNDS.palu,
        stats: [
          { label: 'KECEPATAN SLIP', value: '35 mm/thn' },
          { label: 'TIPE SESAR', value: 'Sinistral' },
          { label: 'REGIM RUPTUR', value: 'Supershear' },
        ],
        liveMetrics: paluLive,
      },
      {
        id: 'chapter-3',
        chapterNumber: '03',
        badge: '03 // PELEPASAN KERAK MANTEL',
        plateTag: 'OROKLIN TAPAL KUDA 180° · LEMBAR SUBDUKSI',
        title: 'Palung Dalam Laut Banda',
        subtitle: 'Laut Banda & Cekungan Maluku · 5.5° LS, 129.5° BT',
        description:
          'Melengkung tajam 180 derajat dalam morfologi tapal kuda unik, Busur Banda menyimpan salah satu aktivitas hiposenter terdalam bumi. Litosfer yang menunjam menembus lebih dari 600 km ke dalam astenosfer di sepanjang zona Wadati-Benioff, melepaskan getaran dalam yang dirasakan hingga radius ribuan kilometer.',
        coordinates: [-5.5, 129.5],
        zoom: 1.95,
        vectorType: 'banda',
        regionBounds: REGION_BOUNDS.banda,
        stats: [
          { label: 'KEDALAMAN SLAB', value: '650+ km' },
          { label: 'LENGKUNG OROKLIN', value: 'Busur 180°' },
          { label: 'TIPE SEISMIK', value: 'Wadati-Benioff' },
        ],
        liveMetrics: bandaLive,
      },
      {
        id: 'chapter-4',
        chapterNumber: '04',
        badge: '04 // OROGENESA TUMBUKAN',
        plateTag: 'FRONT KERAK PASIFIK-CAROLINE ⇄ AUSTRALIA',
        title: 'Sabuk Tumbukan Papua',
        subtitle: 'Pegunungan Tengah & Palung Yapen · 3.8° LS, 138.5° BT',
        description:
          'Di sepanjang batas utara Papua, konvergensi miring cepat antara lempeng samudera Pasifik-Caroline dan kraton Australia menciptakan pemendekan kerak intensif, memicu sesar naik aktif serta pengangkatan pegunungan orogenik tinggi di sepanjang jajaran kordilera tengah.',
        coordinates: [-3.8, 138.5],
        zoom: 1.9,
        vectorType: 'papua',
        regionBounds: REGION_BOUNDS.papua,
        stats: [
          { label: 'KONVERGENSI', value: '10.5 cm/thn' },
          { label: 'SABUK OROGENIK', value: 'Puncak Jaya' },
          { label: 'DEFORMASI', value: 'Sesar Naik Oblik' },
        ],
        liveMetrics: papuaLive,
      },
      {
        id: 'chapter-5',
        chapterNumber: '05',
        badge: '05 // EKSPLORASI PENUH',
        plateTag: 'OBSERVATORIUM TELEMETRI REAL-TIME NUSANTARA',
        title: 'Observatorium Peta Live',
        subtitle: 'Navigasi Bebas Radar Multi-Bencana Nusantara',
        description:
          'Ekspedisi melintasi empat sabuk tektonik utama Nusantara telah selesai. Kembali ke mode peta interaktif penuh untuk mengeksplorasi episenter gempa BMKG & USGS, titik panas NASA FIRMS, serta aktivitas vulkanologi PVMBG secara real-time.',
        coordinates: [-2.2, 118.0],
        zoom: 1.02,
        vectorType: 'epilog',
        regionBounds: REGION_BOUNDS.epilog,
        stats: [
          { label: 'JARINGAN SENSOR', value: 'BMKG · USGS' },
          { label: 'SATELIT TERMAL', value: 'NASA VIIRS' },
          { label: 'VULKANOLOGI', value: 'MAGMA ID' },
        ],
        liveMetrics: epilogLive,
      },
    ];
  }

  return [
    {
      id: 'chapter-1',
      chapterNumber: '01',
      badge: '01 // SUNDA SUBDUCTION ARC',
      plateTag: 'INDO-AUSTRALIAN ⇄ EURASIAN CONVERGENCE',
      title: 'The Sunda Megathrust',
      subtitle: 'Sumatra-Java Trench · 4.5°S, 102.0°E',
      description:
        'The oceanic Indo-Australian plate plunges beneath the Sunda continental shelf at 50–70 mm/yr. This immense frictional lock accumulates vast elastic strain from Aceh down past the Java Trench, driving periodic megathrust ruptures and tsunamigenic events across the archipelago.',
      coordinates: [-4.5, 102.0],
      zoom: 1.55,
      vectorType: 'sunda',
      regionBounds: REGION_BOUNDS.sunda,
      stats: [
        { label: 'CONVERGENCE', value: '6.2 cm/yr' },
        { label: 'TRENCH DEPTH', value: '7,140 m' },
        { label: 'HAZARD LEVEL', value: 'CRITICAL' },
      ],
      liveMetrics: sundaLive,
    },
    {
      id: 'chapter-2',
      chapterNumber: '02',
      badge: '02 // STRIKE-SLIP DYNAMICS',
      plateTag: 'SULAWESI TRIPLE JUNCTION · SINISTRAL FAULT',
      title: 'The Palu-Koro System',
      subtitle: 'Central Sulawesi Transform · 0.9°S, 119.8°E',
      description:
        'Traversing central Sulawesi directly into Palu Bay, the Palu-Koro fault is one of the world’s fastest continental strike-slip faults, with slip rates exceeding 35 mm/yr. Its sinistral shear accommodates rapid microplate rotation, capable of triggering sudden supershear displacements.',
      coordinates: [-0.9, 119.8],
      zoom: 2.35,
      vectorType: 'palu',
      regionBounds: REGION_BOUNDS.palu,
      stats: [
        { label: 'SLIP VELOCITY', value: '35 mm/yr' },
        { label: 'FAULT TYPE', value: 'Sinistral' },
        { label: 'RUPTURE REGIME', value: 'Supershear' },
      ],
      liveMetrics: paluLive,
    },
    {
      id: 'chapter-3',
      chapterNumber: '03',
      badge: '03 // MANTLE DETACHMENT',
      plateTag: '180° HORSESHOE OROCLINE · SUBDUCTION SLAB',
      title: 'The Deep Banda Abyss',
      subtitle: 'Banda Sea & Maluku Basin · 5.5°S, 129.5°E',
      description:
        'Curving 180 degrees in an extraordinary horseshoe morphology, the Banda Arc hosts some of Earth’s deepest mantle tremors. Subducting lithosphere plunges over 600 km deep into the asthenosphere along the Wadati-Benioff zone, generating deep-focus shocks felt across thousand-kilometer radiuses.',
      coordinates: [-5.5, 129.5],
      zoom: 1.95,
      vectorType: 'banda',
      regionBounds: REGION_BOUNDS.banda,
      stats: [
        { label: 'MAX SLAB DEPTH', value: '650+ km' },
        { label: 'OROCLINE CURVE', value: '180° Arc' },
        { label: 'SEISMIC TYPE', value: 'Wadati-Benioff' },
      ],
      liveMetrics: bandaLive,
    },
    {
      id: 'chapter-4',
      chapterNumber: '04',
      badge: '04 // CONVERGENT OROGENY',
      plateTag: 'PACIFIC-CAROLINE ⇄ AUSTRALIAN CRUSTAL FRONT',
      title: 'The Papua Collision Belt',
      subtitle: 'Central Highlands & Yapen Trench · 3.8°S, 138.5°E',
      description:
        'Along the northern margin of Papua, rapid oblique convergence between the Pacific-Caroline oceanic plate and the Australian craton creates intense crustal shortening, driving active thrust faulting and towering orogenic mountain uplift along the central cordillera.',
      coordinates: [-3.8, 138.5],
      zoom: 1.9,
      vectorType: 'papua',
      regionBounds: REGION_BOUNDS.papua,
      stats: [
        { label: 'CONVERGENCE', value: '10.5 cm/yr' },
        { label: 'OROGENIC BELT', value: 'Central Range' },
        { label: 'DEFORMATION', value: 'Oblique Thrust' },
      ],
      liveMetrics: papuaLive,
    },
    {
      id: 'chapter-5',
      chapterNumber: '05',
      badge: '05 // FULL EXPLORATION',
      plateTag: 'NUSANTARA REAL-TIME OBSERVATORY',
      title: 'Interactive Live Map',
      subtitle: 'Multi-Hazard Planetary Telemetry Unlocked',
      description:
        'Your expedition across Indonesia’s four primary tectonic belts is complete. Return to full interactive map mode to inspect live BMKG & USGS earthquakes, NASA FIRMS wildfire hotspots, and PVMBG volcanic alerts.',
      coordinates: [-2.2, 118.0],
      zoom: 1.02,
      vectorType: 'epilog',
      regionBounds: REGION_BOUNDS.epilog,
      stats: [
        { label: 'SEISMIC FEEDS', value: 'BMKG · USGS' },
        { label: 'THERMAL ARRAY', value: 'NASA VIIRS' },
        { label: 'VOLCANOLOGY', value: 'MAGMA ID' },
      ],
      liveMetrics: epilogLive,
    },
  ];
}
