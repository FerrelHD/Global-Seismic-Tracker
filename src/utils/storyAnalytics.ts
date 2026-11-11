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
  focalMetric: {
    value: string;
    unit: string;
    label: string;
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
    maxMag: maxMagVal > 0 ? `M${maxMagVal.toFixed(1)}` : 'N/A',
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
        badge: 'ZONA SUBDUKSI SUNDA',
        plateTag: 'Konvergensi Indo-Australia ke Eurasia',
        title: 'Megathrust Sunda',
        subtitle: 'Palung Sumatera-Jawa · 4.5° LS, 102.0° BT',
        description:
          'Lempeng samudera Indo-Australia menunjam ke bawah paparan benua Sunda dengan laju 50 sampai 70 mm per tahun. Penguncian friksional raksasa ini mengakumulasi regangan elastis masif dari Aceh hingga Palung Jawa, memicu gempa megathrust siklis dan ancaman tsunamigenik di pesisir selatan.',
        coordinates: [-4.5, 102.0],
        zoom: 1.55,
        vectorType: 'sunda',
        regionBounds: REGION_BOUNDS.sunda,
        focalMetric: {
          value: '6.2',
          unit: 'cm/thn',
          label: 'Laju konvergensi lempeng',
        },
        stats: [
          { label: 'Kedalaman Palung', value: '7.140 m' },
          { label: 'Tingkat Bahaya', value: 'Kritis' },
        ],
        liveMetrics: sundaLive,
      },
      {
        id: 'chapter-2',
        chapterNumber: '02',
        badge: 'DINAMIKA SESAR GESER',
        plateTag: 'Simpang Tiga Sulawesi · Sesar Sinistral',
        title: 'Sistem Sesar Palu-Koro',
        subtitle: 'Transform Sulawesi Tengah · 0.9° LS, 119.8° BT',
        description:
          'Membelah Sulawesi Tengah langsung menuju Teluk Palu, sesar Palu-Koro adalah salah satu patahan geser benua tercepat di dunia dengan slip rate melebihi 35 mm per tahun. Pergeseran mendatar sinistral ini mengakomodasi rotasi mikro-lempeng cepat yang mampu memicu ruptur supershear.',
        coordinates: [-0.9, 119.8],
        zoom: 2.35,
        vectorType: 'palu',
        regionBounds: REGION_BOUNDS.palu,
        focalMetric: {
          value: '35',
          unit: 'mm/thn',
          label: 'Kecepatan slip mendatar',
        },
        stats: [
          { label: 'Tipe Patahan', value: 'Sinistral' },
          { label: 'Regim Ruptur', value: 'Supershear' },
        ],
        liveMetrics: paluLive,
      },
      {
        id: 'chapter-3',
        chapterNumber: '03',
        badge: 'PELEPASAN KERAK MANTEL',
        plateTag: 'Oroklin Tapal Kuda 180° · Lembar Subduksi',
        title: 'Palung Dalam Laut Banda',
        subtitle: 'Laut Banda & Cekungan Maluku · 5.5° LS, 129.5° BT',
        description:
          'Melengkung tajam 180 derajat dalam morfologi tapal kuda unik, Busur Banda menyimpan aktivitas hiposenter terdalam bumi. Litosfer yang menunjam menembus lebih dari 600 km ke dalam astenosfer di sepanjang zona Wadati-Benioff, menghasilkan getaran dalam yang terasa ribuan kilometer jauhnya.',
        coordinates: [-5.5, 129.5],
        zoom: 1.95,
        vectorType: 'banda',
        regionBounds: REGION_BOUNDS.banda,
        focalMetric: {
          value: '650+',
          unit: 'km',
          label: 'Kedalaman slab Wadati-Benioff',
        },
        stats: [
          { label: 'Lengkung Oroklin', value: 'Busur 180°' },
          { label: 'Karakter Seismik', value: 'Deep-focus' },
        ],
        liveMetrics: bandaLive,
      },
      {
        id: 'chapter-4',
        chapterNumber: '04',
        badge: 'OROGENESA TUMBUKAN',
        plateTag: 'Front Kerak Pasifik-Caroline ke Australia',
        title: 'Sabuk Tumbukan Papua',
        subtitle: 'Pegunungan Tengah & Palung Yapen · 3.8° LS, 138.5° BT',
        description:
          'Di sepanjang batas utara Papua, konvergensi miring cepat antara lempeng samudera Pasifik-Caroline dan kraton Australia menciptakan pemendekan kerak intensif. Tekanan tektonik ini memicu sesar naik aktif serta mengangkat pegunungan orogenik tinggi di jajaran kordilera tengah.',
        coordinates: [-3.8, 138.5],
        zoom: 1.9,
        vectorType: 'papua',
        regionBounds: REGION_BOUNDS.papua,
        focalMetric: {
          value: '10.5',
          unit: 'cm/thn',
          label: 'Konvergensi oblik Pasifik',
        },
        stats: [
          { label: 'Sabuk Orogenik', value: 'Puncak Jaya' },
          { label: 'Mekanisme', value: 'Sesar Naik Oblik' },
        ],
        liveMetrics: papuaLive,
      },
      {
        id: 'chapter-5',
        chapterNumber: '05',
        badge: 'EKSPLORASI TERBUKA',
        plateTag: 'Observatorium Multi-Bencana Nusantara',
        title: 'Observatorium Peta Live',
        subtitle: 'Navigasi Radar Real-time Indonesia',
        description:
          'Ekspedisi melintasi empat sabuk tektonik utama Nusantara telah selesai. Kembali ke mode peta interaktif penuh untuk mengeksplorasi episenter gempa BMKG dan USGS, titik panas NASA FIRMS, serta status vulkanologi PVMBG secara langsung.',
        coordinates: [-2.2, 118.0],
        zoom: 1.02,
        vectorType: 'epilog',
        regionBounds: REGION_BOUNDS.epilog,
        focalMetric: {
          value: '03',
          unit: 'lempeng',
          label: 'Sistem lempeng utama Nusantara',
        },
        stats: [
          { label: 'Seismik', value: 'BMKG & USGS' },
          { label: 'Satelit & Gunung', value: 'VIIRS & MAGMA ID' },
        ],
        liveMetrics: epilogLive,
      },
    ];
  }

  return [
    {
      id: 'chapter-1',
      chapterNumber: '01',
      badge: 'SUNDA SUBDUCTION ARC',
      plateTag: 'Indo-Australian to Eurasian Convergence',
      title: 'The Sunda Megathrust',
      subtitle: 'Sumatra-Java Trench · 4.5°S, 102.0°E',
      description:
        'The oceanic Indo-Australian plate plunges beneath the Sunda continental shelf at 50 to 70 mm per year. This immense frictional lock accumulates vast elastic strain from Aceh down past the Java Trench, driving periodic megathrust ruptures and tsunamigenic events across the archipelago.',
      coordinates: [-4.5, 102.0],
      zoom: 1.55,
      vectorType: 'sunda',
      regionBounds: REGION_BOUNDS.sunda,
      focalMetric: {
        value: '6.2',
        unit: 'cm/yr',
        label: 'Plate convergence rate',
      },
      stats: [
        { label: 'Trench Depth', value: '7,140 m' },
        { label: 'Hazard Level', value: 'Critical' },
      ],
      liveMetrics: sundaLive,
    },
    {
      id: 'chapter-2',
      chapterNumber: '02',
      badge: 'STRIKE-SLIP DYNAMICS',
      plateTag: 'Sulawesi Triple Junction · Sinistral Fault',
      title: 'The Palu-Koro System',
      subtitle: 'Central Sulawesi Transform · 0.9°S, 119.8°E',
      description:
        'Traversing central Sulawesi directly into Palu Bay, the Palu-Koro fault is one of the fastest continental strike-slip faults on Earth, exceeding 35 mm per year. Its sinistral shear accommodates rapid microplate rotation, capable of triggering sudden supershear displacements.',
      coordinates: [-0.9, 119.8],
      zoom: 2.35,
      vectorType: 'palu',
      regionBounds: REGION_BOUNDS.palu,
      focalMetric: {
        value: '35',
        unit: 'mm/yr',
        label: 'Horizontal slip velocity',
      },
      stats: [
        { label: 'Fault Type', value: 'Sinistral' },
        { label: 'Rupture Regime', value: 'Supershear' },
      ],
      liveMetrics: paluLive,
    },
    {
      id: 'chapter-3',
      chapterNumber: '03',
      badge: 'MANTLE DETACHMENT',
      plateTag: '180° Horseshoe Orocline · Subduction Slab',
      title: 'The Deep Banda Abyss',
      subtitle: 'Banda Sea & Maluku Basin · 5.5°S, 129.5°E',
      description:
        'Curving 180 degrees in an extraordinary horseshoe morphology, the Banda Arc hosts some of Earth’s deepest mantle tremors. Subducting lithosphere plunges over 600 km deep into the asthenosphere along the Wadati-Benioff zone, generating deep-focus shocks felt thousands of kilometers away.',
      coordinates: [-5.5, 129.5],
      zoom: 1.95,
      vectorType: 'banda',
      regionBounds: REGION_BOUNDS.banda,
      focalMetric: {
        value: '650+',
        unit: 'km',
        label: 'Wadati-Benioff slab depth',
      },
      stats: [
        { label: 'Orocline Curve', value: '180° Arc' },
        { label: 'Seismic Type', value: 'Deep-focus' },
      ],
      liveMetrics: bandaLive,
    },
    {
      id: 'chapter-4',
      chapterNumber: '04',
      badge: 'CONVERGENT OROGENY',
      plateTag: 'Pacific-Caroline to Australian Crustal Front',
      title: 'The Papua Collision Belt',
      subtitle: 'Central Highlands & Yapen Trench · 3.8°S, 138.5°E',
      description:
        'Along the northern margin of Papua, rapid oblique convergence between the Pacific-Caroline oceanic plate and the Australian craton creates intense crustal shortening, driving active thrust faulting and towering orogenic mountain uplift along the central cordillera.',
      coordinates: [-3.8, 138.5],
      zoom: 1.9,
      vectorType: 'papua',
      regionBounds: REGION_BOUNDS.papua,
      focalMetric: {
        value: '10.5',
        unit: 'cm/yr',
        label: 'Oblique convergence speed',
      },
      stats: [
        { label: 'Orogenic Belt', value: 'Central Range' },
        { label: 'Deformation', value: 'Oblique Thrust' },
      ],
      liveMetrics: papuaLive,
    },
    {
      id: 'chapter-5',
      chapterNumber: '05',
      badge: 'OPEN EXPLORATION',
      plateTag: 'Nusantara Multi-Hazard Observatory',
      title: 'Interactive Live Map',
      subtitle: 'Real-time Indonesian Telemetry Radar',
      description:
        'Your expedition across Indonesia’s four primary tectonic belts is complete. Return to full interactive map mode to inspect live BMKG and USGS earthquakes, NASA FIRMS wildfire hotspots, and PVMBG volcanic alerts.',
      coordinates: [-2.2, 118.0],
      zoom: 1.02,
      vectorType: 'epilog',
      regionBounds: REGION_BOUNDS.epilog,
      focalMetric: {
        value: '03',
        unit: 'plates',
        label: 'Major converging tectonic plates',
      },
      stats: [
        { label: 'Seismic', value: 'BMKG & USGS' },
        { label: 'Satellite & Volcanoes', value: 'VIIRS & MAGMA ID' },
      ],
      liveMetrics: epilogLive,
    },
  ];
}
