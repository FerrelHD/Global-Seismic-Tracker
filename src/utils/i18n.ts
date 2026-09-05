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
