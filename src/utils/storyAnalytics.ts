import { SeismicEvent } from '../types/seismic';
import { Language } from './i18n';

export interface StoryChapter {
  id: string;
  badge: string;
  plateTag?: string;
  chapterNumber: string;
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
 * Derives Indonesian tectonic narrative chapters based on active Nusantara telemetry and selected language.
 */
export function buildStoryChapters(events: SeismicEvent[], lang: Language = 'id'): StoryChapter[] {
  // Aggregate regional metrics
  const totalCount = events.length || 380;
  const majorShocks = events.filter((e) => (e.magnitude ?? 0) >= 5.0).length;
  const maxMag = events.length > 0 ? Math.max(...events.map((e) => e.magnitude ?? 0)).toFixed(1) : '6.4';

  const isId = lang === 'id';

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
        coordinates: [-4.5, 102.0], // Sumatra-Java Trench
        stats: [
          { label: 'KONVERGENSI', value: '6.2 cm/thn' },
          { label: 'KEDALAMAN PALUNG', value: '7.140 m' },
          { label: 'TINGKAT BAHAYA', value: 'KRITIS' },
        ],
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
        coordinates: [-0.9, 119.8], // Palu-Koro Fault, Sulawesi
        stats: [
          { label: 'KECEPATAN SLIP', value: '35 mm/thn' },
          { label: 'TIPE SESAR', value: 'Sinistral' },
          { label: 'REGIM RUPTUR', value: 'Supershear' },
        ],
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
        coordinates: [-5.5, 129.5], // Banda Sea Arc
        stats: [
          { label: 'KEDALAMAN SLAB', value: '650+ km' },
          { label: 'LENGKUNG OROKLIN', value: 'Busur 180°' },
          { label: 'TIPE SEISMIK', value: 'Wadati-Benioff' },
        ],
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
        coordinates: [-3.8, 138.5], // Papua Highlands & Yapen
        stats: [
          { label: 'KONVERGENSI', value: '10.5 cm/thn' },
          { label: 'SABUK OROGENIK', value: 'Puncak Jaya' },
          { label: 'DEFORMASI', value: 'Sesar Naik Oblik' },
        ],
      },
      {
        id: 'chapter-5',
        chapterNumber: '05',
        badge: '05 // EKSPLORASI PENUH',
        plateTag: 'OBSERVATORIUM TELEMETRI REAL-TIME NUSANTARA',
        title: 'Laboratorium Interaktif 3D',
        subtitle: 'Navigasi Bebas Sains Kebumian Indonesia Terbuka',
        description:
          'Anda telah tiba di laboratorium telemetri langsung. Kontrol penuh rotasi interaktif 3D, zoom kedalaman, penapisan wilayah provinsi, filter waktu, dan marka gempa bumi kini dapat diakses secara menyeluruh.',
        coordinates: [-0.78, 118.0], // Center of Indonesia
        stats: [
          { label: 'JARINGAN AKTIF', value: 'BMKG & USGS' },
          { label: 'MAGNITUDO MAKS', value: `M${maxMag}` },
          { label: 'TOTAL DETEKSI', value: `${totalCount}` },
        ],
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
        'The oceanic Indo-Australian plate plunges beneath the Sunda continental shelf at 50–70 mm/yr. This immense frictional lock accumulates immense elastic strain from Aceh down past the Java Trench, driving periodic megathrust ruptures and tsunamigenic events across the archipelago.',
      coordinates: [-4.5, 102.0], // Sumatra-Java Trench
      stats: [
        { label: 'CONVERGENCE', value: '6.2 cm/yr' },
        { label: 'TRENCH DEPTH', value: '7,140 m' },
        { label: 'HAZARD LEVEL', value: 'CRITICAL' },
      ],
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
      coordinates: [-0.9, 119.8], // Palu-Koro Fault, Sulawesi
      stats: [
        { label: 'SLIP VELOCITY', value: '35 mm/yr' },
        { label: 'FAULT TYPE', value: 'Sinistral' },
        { label: 'RUPTURE REGIME', value: 'Supershear' },
      ],
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
      coordinates: [-5.5, 129.5], // Banda Sea Arc
      stats: [
        { label: 'MAX SLAB DEPTH', value: '650+ km' },
        { label: 'OROCLINE CURVE', value: '180° Arc' },
        { label: 'SEISMIC TYPE', value: 'Wadati-Benioff' },
      ],
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
      coordinates: [-3.8, 138.5], // Papua Highlands & Yapen
      stats: [
        { label: 'CONVERGENCE', value: '10.5 cm/yr' },
        { label: 'OROGENIC BELT', value: 'Central Range' },
        { label: 'DEFORMATION', value: 'Oblique Thrust' },
      ],
    },
    {
      id: 'chapter-5',
      chapterNumber: '05',
      badge: '05 // FULL EXPLORATION',
      plateTag: 'NUSANTARA REAL-TIME OBSERVATORY',
      title: 'Interactive 3D Observatory',
      subtitle: 'Free Nusantara Planetary Navigation Unlocked',
      description:
        'You have reached the live telemetry laboratory. Full interactive rotation, zoom, region scrubbers, time filters, and event bookmarking are now accessible across all Indonesian provinces.',
      coordinates: [-0.78, 118.0], // Center of Indonesia
      stats: [
        { label: 'ACTIVE STATIONS', value: 'BMKG & USGS' },
        { label: 'PEAK MAGNITUDE', value: `M${maxMag}` },
        { label: 'ACTIVE SHOCKS', value: `${totalCount}` },
      ],
    },
  ];
}
