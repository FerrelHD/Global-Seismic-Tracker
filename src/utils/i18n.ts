import { useState, useEffect } from 'react';

export type Language = 'id' | 'en';

export interface Translations {
  // Navigation & Header
  observatoryTitle: string;
  observatorySubtitle: string;
  liveBadge: string;
  alertsOn: string;
  alertsOff: string;
  stories: string;
  saved: string;
  totalEq: string;
  activityStatus: string;
  statusNormal: string;
  hotspotsCount: string;

  // BMKG Card
  latestEarthquake: string;
  groundZero: string;
  depth: string;
  shallow: string;
  intermediate: string;
  deep: string;
  felt: string;
  tsunamiSafe: string;
  tsunamiWarning: string;

  // Hotspots & Wind
  firmsLive: string;
  windPlume: string;
  smokeDirection: string;
  towards: string;
  power: string;
  extremeFire: string;
  severeFire: string;
  moderateFire: string;

  // Proximity & WhatsApp
  checkDistance: string;
  measureNow: string;
  measuring: string;
  distanceFromYou: string;
  estimatedShaking: string;
  shareWhatsApp: string;
  waEarthquakeHeader: string;
  waFireHeader: string;

  // Controller Dock
  dualMode: string;
  seismicOnly: string;
  fireOnly: string;
  volcanoOnly: string;
  allRegions: string;
  allTime: string;
  last24h: string;
  last7d: string;
  feed: string;
  seismogram: string;
  replay: string;
  advancedFilter: string;
  colorMag: string;
  colorDepth: string;

  // Modals & Details
  specimen: string;
  richterScale: string;
  waveformHarmonic: string;
  depthGauge: string;
  timestamp: string;
  coordinates: string;
  close: string;

  // Major Hazards HUD Bar
  megathrustTitle: string;
  megathrustStatus: string;
  megathrustMesh: string;
  tsunamiProtocolBtn: string;
  hazardEval: string;

  // Quick Filters
  allMag: string;
  magFelt: string;
  magSignificant: string;

  // BMKG 20-20-20 & Alerts
  tsunamiProtocolTitle: string;
  tsunamiRule20: string;
  tsunamiRuleDesc: string;
  copyInfo: string;
  copied: string;
  shareWhatsAppBtn: string;
  feltEarthquake: string;
  shallowCrustBadge: string;

  // Storytelling & Actions
  focusSector: string;
  exploreObservatory: string;
  sectorMonitored: string;
  laboratoryUnlocked: string;

  // Hero & Navigation
  crustalStations: string;
  clickToEnter: string;
  feedLink: string;
  tsunamiLink: string;
  storyLink: string;
}

export const translations: Record<Language, Translations> = {
  id: {
    // Navigation & Header
    observatoryTitle: 'OBSERVATORIUM TEKTONIK & BENCANA',
    observatorySubtitle: 'KEPULAUAN INDONESIA',
    liveBadge: 'LIVE',
    alertsOn: 'ALARM AKTIF',
    alertsOff: 'ALARM NONAKTIF',
    stories: 'BAB CERITA',
    saved: 'TERSIMPAN',
    totalEq: 'TOTAL GEMPA',
    activityStatus: 'STATUS SEISMIK',
    statusNormal: 'AKTIF NORMAL',
    hotspotsCount: 'TITIK API',

    // BMKG Card
    latestEarthquake: 'PUSAT GEMPA TERKINI (BMKG)',
    groundZero: 'EPISENTER',
    depth: 'KEDALAMAN',
    shallow: 'KERAK DANGKAL',
    intermediate: 'MENENGAH',
    deep: 'DALAM',
    felt: 'DIRASAKAN',
    tsunamiSafe: 'TIDAK BERPOTENSI TSUNAMI',
    tsunamiWarning: 'PERINGATAN DINI TSUNAMI',

    // Hotspots & Wind
    firmsLive: 'SATELIT NASA FIRMS',
    windPlume: 'VEKTOR ANGIN',
    smokeDirection: 'ARAH SEBARAN ASAP',
    towards: 'MENUJU',
    power: 'DAYA RADIASI',
    extremeFire: 'KEBAKARAN EKSTRIM',
    severeFire: 'KEBAKARAN PARAH',
    moderateFire: 'KEBAKARAN SEDANG',

    // Proximity & WhatsApp
    checkDistance: 'CEK JARAK DARI LOKASI SAYA',
    measureNow: 'UKUR SEKARANG',
    measuring: 'MENGUKUR...',
    distanceFromYou: 'JARAK DARI LOKASI ANDA',
    estimatedShaking: 'ESTIMASI GETARAN (MMI)',
    shareWhatsApp: 'BAGIKAN KE WHATSAPP',
    waEarthquakeHeader: 'INFO GEMPA TERKINI (BMKG / USGS)',
    waFireHeader: 'PANTAUAN TITIK API / KARHUTLA (NASA FIRMS)',

    // Controller Dock
    dualMode: 'SEMUA',
    seismicOnly: 'GEMPA',
    fireOnly: 'TITIK API',
    volcanoOnly: 'GUNUNG',
    allRegions: 'SEMUA WILAYAH',
    allTime: 'SEMUA',
    last24h: '24 JAM',
    last7d: '7 HARI',
    feed: 'DAFTAR',
    seismogram: 'SEISMOGRAM',
    replay: 'PUTAR ULANG',
    advancedFilter: 'FILTER',
    colorMag: 'MAGNITUDO',
    colorDepth: 'KEDALAMAN',

    // Modals & Details
    specimen: 'DATA SPESIMEN',
    richterScale: 'SKALA ENERGI RICHTER',
    waveformHarmonic: 'GELOMBANG SEISMOGRAF',
    depthGauge: 'KEDALAMAN HIPOSENTER',
    timestamp: 'WAKTU DETEKSI',
    coordinates: 'KOORDINAT EPISENTER',
    close: 'TUTUP',

    // Major Hazards HUD Bar
    megathrustTitle: 'MEGATHRUST SUMATERA-JAWA',
    megathrustStatus: 'STATUS: TELEMETRI AKTIF',
    megathrustMesh: 'JARINGAN SEISMIK BMKG & USGS',
    tsunamiProtocolBtn: 'PROTOKOL TSUNAMI 20-20-20',
    hazardEval: 'EVALUASI BAHAYA',

    // Quick Filters
    allMag: 'SEMUA MAG',
    magFelt: '≥4.0 DIRASAKAN',
    magSignificant: '≥5.5 SIGNIFIKAN',

    // BMKG 20-20-20 & Alerts
    tsunamiProtocolTitle: 'PEDOMAN EVAKUASI MANDIRI TSUNAMI',
    tsunamiRule20: 'ATURAN 20-20-20 BMKG',
    tsunamiRuleDesc: 'Gempa terasa 20 detik atau lebih? Evakuasi dalam 20 menit menuju tempat setinggi minimal 20 meter.',
    copyInfo: 'SALIN DATA GEMPA',
    copied: 'DATA TERSALIN!',
    shareWhatsAppBtn: 'SEBARKAN VIA WHATSAPP',
    feltEarthquake: 'GEMPA BUMI DIRASAKAN',
    shallowCrustBadge: 'KERAK DANGKAL (< 60 KM)',

    // Storytelling & Actions
    focusSector: 'FOKUS SEKTOR ⌖',
    exploreObservatory: 'JELAJAHI OBSERVATORIUM',
    sectorMonitored: 'SEKTOR TERPANTAU',
    laboratoryUnlocked: 'LABORATORIUM TERBUKA',

    // Hero & Navigation
    crustalStations: '2.200 STASIUN KERAK BUMI TERSINKRONISASI',
    clickToEnter: 'KLIK DI MANA SAJA UNTUK MASUK',
    feedLink: 'KATALOG SEISMIK',
    tsunamiLink: 'BMKG TSUNAMI',
    storyLink: 'BAB CERITA',
  },
  en: {
    // Navigation & Header
    observatoryTitle: 'INDONESIAN CRUSTAL OBSERVATORY',
    observatorySubtitle: 'INDONESIAN ARCHIPELAGO',
    liveBadge: 'LIVE',
    alertsOn: 'ALERTS ON',
    alertsOff: 'ALERTS OFF',
    stories: 'STORIES',
    saved: 'SAVED',
    totalEq: 'TOTAL EQ',
    activityStatus: 'SEISMIC STATUS',
    statusNormal: 'ACTIVE NORMAL',
    hotspotsCount: 'HOTSPOTS',

    // BMKG Card
    latestEarthquake: 'LATEST EARTHQUAKE (BMKG)',
    groundZero: 'EPICENTER',
    depth: 'DEPTH',
    shallow: 'SHALLOW CRUST',
    intermediate: 'INTERMEDIATE',
    deep: 'DEEP SLAB',
    felt: 'FELT SHOCK',
    tsunamiSafe: 'NO TSUNAMI POTENTIAL',
    tsunamiWarning: 'TSUNAMI EARLY WARNING',

    // Hotspots & Wind
    firmsLive: 'NASA FIRMS LIVE',
    windPlume: 'WIND PLUME',
    smokeDirection: 'SMOKE PLUME DRIFT',
    towards: 'TOWARD',
    power: 'RADIATIVE FLUX',
    extremeFire: 'EXTREME WILDFIRE',
    severeFire: 'SEVERE ANOMALY',
    moderateFire: 'MODERATE ANOMALY',

    // Proximity & WhatsApp
    checkDistance: 'CHECK DISTANCE FROM MY LOCATION',
    measureNow: 'MEASURE NOW',
    measuring: 'MEASURING...',
    distanceFromYou: 'DISTANCE FROM YOUR LOCATION',
    estimatedShaking: 'ESTIMATED SHAKING (MMI)',
    shareWhatsApp: 'SHARE TO WHATSAPP',
    waEarthquakeHeader: 'EARTHQUAKE TELEMETRY REPORT (BMKG / USGS)',
    waFireHeader: 'WILDFIRE HOTSPOT MONITORING (NASA FIRMS)',

    // Controller Dock
    dualMode: 'DUAL',
    seismicOnly: 'SEIS',
    fireOnly: 'FIRE',
    volcanoOnly: 'VOLC',
    allRegions: 'ALL REGIONS',
    allTime: 'ALL',
    last24h: '24H',
    last7d: '7D',
    feed: 'FEED',
    seismogram: 'SEISMOGRAM',
    replay: 'REPLAY',
    advancedFilter: 'FILTER',
    colorMag: 'MAG',
    colorDepth: 'DEPTH',

    // Modals & Details
    specimen: 'SPECIMEN READOUT',
    richterScale: 'RICHTER ENERGY SCALE',
    waveformHarmonic: 'SEISMOGRAPH HARMONIC',
    depthGauge: 'DEPTH GAUGE',
    timestamp: 'TIMESTAMP',
    coordinates: 'COORDINATES',
    close: 'CLOSE',

    // Major Hazards HUD Bar
    megathrustTitle: 'SUMATRA-JAVA MEGATHRUST',
    megathrustStatus: 'STATUS: CRUSTAL UNLOCKED',
    megathrustMesh: 'BMKG & USGS SEISMIC MESH',
    tsunamiProtocolBtn: 'BMKG 20-20-20 PROTOCOL',
    hazardEval: 'HAZARD EVALUATION',

    // Quick Filters
    allMag: 'ALL MAG',
    magFelt: '≥4.0 FELT',
    magSignificant: '≥5.5 SIGNIFICANT',

    // BMKG 20-20-20 & Alerts
    tsunamiProtocolTitle: 'COASTAL TSUNAMI EVACUATION PROTOCOL',
    tsunamiRule20: 'BMKG 20-20-20 RULE',
    tsunamiRuleDesc: 'Shaking felt for 20 seconds or more? Evacuate within 20 minutes to at least 20 meters elevation.',
    copyInfo: 'COPY SEISMIC DATA',
    copied: 'DATA COPIED!',
    shareWhatsAppBtn: 'SHARE VIA WHATSAPP',
    feltEarthquake: 'FELT EARTHQUAKE',
    shallowCrustBadge: 'SHALLOW CRUST (< 60 KM)',

    // Storytelling & Actions
    focusSector: 'FOCUS SECTOR ⌖',
    exploreObservatory: 'EXPLORE OBSERVATORY',
    sectorMonitored: 'SECTOR MONITORED',
    laboratoryUnlocked: 'LABORATORY UNLOCKED',

    // Hero & Navigation
    crustalStations: '2,200 CRUSTAL STATIONS SYNCHRONIZED',
    clickToEnter: 'CLICK ANYWHERE TO ENTER',
    feedLink: 'SEISMIC FEED',
    tsunamiLink: 'BMKG TSUNAMI',
    storyLink: 'STORY MODE',
  },
};

const LANG_STORAGE_KEY = 'seismic_app_language';

export function useLanguage() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'id';
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'id' || saved === 'en') return saved;
    } catch {
      // Ignore
    }
    return 'id'; // Default to Indonesian
  });

  const toggleLanguage = () => {
    setLang((prev) => {
      const next = prev === 'id' ? 'en' : 'id';
      try {
        localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const setLanguage = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, newLang);
    } catch {
      // Ignore
    }
  };

  return {
    lang,
    t: translations[lang],
    toggleLanguage,
    setLanguage,
  };
}
