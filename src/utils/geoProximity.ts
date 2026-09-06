import { SeismicEvent } from '../types/seismic';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MMIIntensity {
  scale: string;
  romans: string;
  label: string;
  description: string;
  color: string;
}

/**
 * Calculates geodesic distance between two lat/lon coordinates using the Haversine formula (km).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Estimates human-perceived shaking intensity (MMI - Modified Mercalli Intensity)
 * at a given hypocentral distance based on seismic magnitude and depth.
 * Simplified attenuation relation for Indonesian crustal tremors.
 */
export function estimateMMI(
  magnitude: number,
  depthKm: number,
  surfaceDistKm: number
): MMIIntensity {
  // Hypocentral slant distance (hypotenuse)
  const hypocentralDist = Math.sqrt(surfaceDistKm * surfaceDistKm + depthKm * depthKm);

  // Approximate peak ground intensity attenuation:
  // I ~ 1.5 * M - 3.2 * log10(R) + 1.2
  const rawIntensity = 1.5 * magnitude - 3.2 * Math.log10(Math.max(10, hypocentralDist)) + 1.2;
  const mmiNum = Math.max(1, Math.min(10, Math.round(rawIntensity)));

  if (mmiNum <= 2) {
    return {
      scale: 'MMI I - II',
      romans: 'I-II',
      label: 'Getaran Nyaris Tidak Terasa',
      description: 'Hanya dirasakan oleh beberapa orang dalam keadaan diam/santai di lantai atas gedung.',
      color: '#64748b', // slate
    };
  }
  if (mmiNum === 3) {
    return {
      scale: 'MMI III',
      romans: 'III',
      label: 'Getaran Lemah di Dalam Rumah',
      description: 'Dirasakan nyata di dalam rumah, terasa seperti ada truk ringan yang sedang melintas.',
      color: '#0284c7', // sky
    };
  }
  if (mmiNum === 4) {
    return {
      scale: 'MMI IV',
      romans: 'IV',
      label: 'Getaran Ringan - Sedang',
      description: 'Dirasakan oleh banyak orang di dalam rumah. Benda gantung, cangkir, atau jendela berdenting.',
      color: '#059669', // emerald
    };
  }
  if (mmiNum === 5) {
    return {
      scale: 'MMI V',
      romans: 'V',
      label: 'Getaran Sedang - Kuat',
      description: 'Dirasakan hampir semua orang. Benda terpelanting, tiang bergoyang, orang terbangun tidur.',
      color: '#d97706', // amber
    };
  }
  if (mmiNum === 6) {
    return {
      scale: 'MMI VI',
      romans: 'VI',
      label: 'Getaran Kuat (Potensi Retak)',
      description: 'Semua orang berlari keluar. Kerusakan ringan pada dinding plester atau bangunan tidak bertulang.',
      color: '#ea580c', // orange
    };
  }
  return {
    scale: 'MMI VII+',
    romans: 'VII+',
    label: 'Getaran Sangat Kuat (Destruktif)',
    description: 'Kerusakan pada bangunan berkonstruksi lemah, retakan pada tanah, cerobong roboh.',
    color: '#e11d48', // rose
  };
}

/**
 * Creates clean, human-friendly Indonesian WhatsApp broadcast copy for earthquakes.
 */
export function formatSeismicWAMessage(
  event: SeismicEvent,
  userDistKm?: number,
  mmi?: MMIIntensity,
  lang: 'id' | 'en' = 'id'
): string {
  const isEn = lang === 'en';
  const locale = isEn ? 'en-US' : 'id-ID';
  const dateObj = new Date(event.occurred_at);
  const formattedDate = dateObj.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const place = (event.place || (isEn ? 'Earthquake Epicenter' : 'Pusat Gempa')).toUpperCase();
  const mag = event.magnitude != null ? event.magnitude.toFixed(1) : '-';
  const depth = event.depth != null ? event.depth.toFixed(0) : '-';

  const lines = isEn
    ? [
        `🚨 *LATEST EARTHQUAKE BULLETIN (BMKG / USGS)* 🚨`,
        ``,
        `📍 *Location:* ${place}`,
        `💥 *Magnitude:* M ${mag}`,
        `🌊 *Depth:* ${depth} km`,
        `🕒 *Time:* ${formattedDate} - ${formattedTime}`,
      ]
    : [
        `🚨 *INFO GEMPA TERKINI (BMKG / USGS)* 🚨`,
        ``,
        `📍 *Lokasi:* ${place}`,
        `💥 *Kekuatan:* M ${mag}`,
        `🌊 *Kedalaman:* ${depth} km`,
        `🕒 *Waktu:* ${formattedDate} - ${formattedTime}`,
      ];

  if (userDistKm != null) {
    if (isEn) {
      lines.push(`📌 *Distance from my location:* ~${userDistKm.toLocaleString('en-US')} km`);
      if (mmi) {
        lines.push(`📊 *Estimated Shaking:* ${mmi.scale} (${mmi.label})`);
      }
    } else {
      lines.push(`📌 *Jarak dari saya:* ~${userDistKm.toLocaleString('id-ID')} km`);
      if (mmi) {
        lines.push(`📊 *Estimasi Getaran:* ${mmi.scale} (${mmi.label})`);
      }
    }
  }

  const baseUrl = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://global-seismic-tracker.vercel.app';
  const eventLink = `${baseUrl}/?event=${encodeURIComponent(event.usgs_id || event.id || '')}`;

  lines.push(
    ``,
    isEn
      ? `🌐 *Live Map & News Verification:*`
      : `🌐 *Pantau Peta & Verifikasi Berita Langsung:*`,
    eventLink
  );

  return lines.join('\n');
}

/**
 * Creates clean, human-friendly Indonesian WhatsApp broadcast copy for thermal anomalies / wildfires.
 */
export function formatWildfireWAMessage(
  hotspot: {
    id: string;
    satellite: string;
    latitude: number;
    longitude: number;
    frp: number;
    island: string;
    detected_at: string;
  },
  windInfo?: { windSpeed: number; windDirection: number; driftCompass?: string },
  userDistKm?: number
): string {
  const dateObj = new Date(hotspot.detected_at);
  const formattedDate = dateObj.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const lines = [
    `🔥 *PANTAUAN TITIK API / KARHUTLA (NASA FIRMS)* 🔥`,
    ``,
    `📍 *Wilayah:* ${hotspot.island.toUpperCase()} REGION`,
    `🛰️ *Sensor Satelit:* ${hotspot.satellite}`,
    `⚡ *Daya Radiasi (FRP):* ${hotspot.frp} MW`,
    `🕒 *Waktu Deteksi:* ${formattedDate} - ${formattedTime}`,
  ];

  if (windInfo) {
    lines.push(
      `💨 *Arah Sebaran Asap:* Menuju ${windInfo.driftCompass || 'sekitarnya'} (${windInfo.windSpeed.toFixed(1)} km/h)`
    );
  }

  if (userDistKm != null) {
    lines.push(`📌 *Jarak dari saya:* ~${userDistKm.toLocaleString('id-ID')} km`);
  }

  lines.push(
    ``,
    `🌐 *Pantau Arah Angin & Titik Api di Peta:*`,
    `https://global-seismic-tracker.vercel.app`
  );

  return lines.join('\n');
}

/**
 * Opens WhatsApp sharing link across mobile apps or desktop web.
 */
export function openWhatsAppShare(text: string): void {
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Curated Indonesian benchmark cities for proximity calculation and simulation.
 */
export interface IndonesianCity {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
}

export const INDONESIAN_REFERENCE_CITIES: IndonesianCity[] = [
  // NTT & Nusa Tenggara
  { name: 'Larantuka', province: 'Flores Timur, NTT', latitude: -8.344, longitude: 122.981 },
  { name: 'Maumere', province: 'Sikka, NTT', latitude: -8.621, longitude: 122.214 },
  { name: 'Ende', province: 'Ende, NTT', latitude: -8.843, longitude: 121.662 },
  { name: 'Ruteng', province: 'Manggarai, NTT', latitude: -8.614, longitude: 120.464 },
  { name: 'Labuan Bajo', province: 'Manggarai Barat, NTT', latitude: -8.503, longitude: 119.888 },
  { name: 'Kupang', province: 'NTT', latitude: -10.177, longitude: 123.607 },
  { name: 'Waingapu', province: 'Sumba Timur, NTT', latitude: -9.656, longitude: 120.264 },
  { name: 'Mataram', province: 'Lombok, NTB', latitude: -8.583, longitude: 116.116 },
  { name: 'Denpasar', province: 'Bali', latitude: -8.670, longitude: 115.212 },

  // Jawa
  { name: 'Surabaya', province: 'Jawa Timur', latitude: -7.257, longitude: 112.752 },
  { name: 'Malang', province: 'Jawa Timur', latitude: -7.978, longitude: 112.630 },
  { name: 'Yogyakarta', province: 'DI Yogyakarta', latitude: -7.795, longitude: 110.369 },
  { name: 'Semarang', province: 'Jawa Tengah', latitude: -6.993, longitude: 110.420 },
  { name: 'Bandung', province: 'Jawa Barat', latitude: -6.917, longitude: 107.619 },
  { name: 'Depok', province: 'Jawa Barat', latitude: -6.402, longitude: 106.818 },
  { name: 'Jakarta', province: 'DKI Jakarta', latitude: -6.208, longitude: 106.845 },

  // Sumatra
  { name: 'Bandar Lampung', province: 'Lampung', latitude: -5.450, longitude: 105.266 },
  { name: 'Palembang', province: 'Sumatera Selatan', latitude: -2.976, longitude: 104.775 },
  { name: 'Padang', province: 'Sumatera Barat', latitude: -0.949, longitude: 100.354 },
  { name: 'Pekanbaru', province: 'Riau', latitude: 0.507, longitude: 101.447 },
  { name: 'Medan', province: 'Sumatera Utara', latitude: 3.595, longitude: 98.672 },
  { name: 'Banda Aceh', province: 'Aceh', latitude: 5.548, longitude: 95.323 },

  // Kalimantan
  { name: 'Pontianak', province: 'Kalimantan Barat', latitude: -0.026, longitude: 109.342 },
  { name: 'Palangka Raya', province: 'Kalimantan Tengah', latitude: -2.216, longitude: 113.916 },
  { name: 'Banjarmasin', province: 'Kalimantan Selatan', latitude: -3.319, longitude: 114.590 },
  { name: 'Balikpapan', province: 'Kalimantan Timur', latitude: -1.265, longitude: 116.831 },
  { name: 'Samarinda', province: 'Kalimantan Timur', latitude: -0.502, longitude: 117.153 },

  // Sulawesi, Maluku & Papua
  { name: 'Makassar', province: 'Sulawesi Selatan', latitude: -5.147, longitude: 119.432 },
  { name: 'Manado', province: 'Sulawesi Utara', latitude: 1.487, longitude: 124.842 },
  { name: 'Palu', province: 'Sulawesi Tengah', latitude: -0.900, longitude: 119.877 },
  { name: 'Ambon', province: 'Maluku', latitude: -3.695, longitude: 128.181 },
  { name: 'Ternate', province: 'Maluku Utara', latitude: 0.790, longitude: 127.382 },
  { name: 'Jayapura', province: 'Papua', latitude: -2.533, longitude: 140.718 },
  { name: 'Sorong', province: 'Papua Barat Daya', latitude: -0.876, longitude: 131.255 },
];

/**
 * Checks if a point [lat, lon] is strictly inside a 2D polygon using Ray-Casting algorithm.
 * Note: polygon is GeoJSON [lon, lat][]
 */
export function isPointInsidePolygon(lat: number, lon: number, polygon: [number, number][]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]; // lon
    const yi = polygon[i][1]; // lat
    const xj = polygon[j][0]; // lon
    const yj = polygon[j][1]; // lat

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates shortest geodesic distance from a point to a 2D polygon (in km).
 * Returns 0 if point is inside the polygon.
 */
export function calculateDistanceToPolygonKm(
  userLat: number,
  userLon: number,
  polygon: [number, number][]
): number {
  if (!polygon || polygon.length === 0) return 0;
  if (isPointInsidePolygon(userLat, userLon, polygon)) {
    return 0;
  }

  let minDistance = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    // Compute distance to vertex p1
    const distToVertex = calculateDistanceKm(userLat, userLon, p1[1], p1[0]);
    if (distToVertex < minDistance) minDistance = distToVertex;

    // Approximate point projection onto geodesic segment p1-p2
    const dLon = p2[0] - p1[0];
    const dLat = p2[1] - p1[1];
    const segLenSq = dLon * dLon + dLat * dLat;
    if (segLenSq > 0.00000001) {
      const t = Math.max(0, Math.min(1, ((userLon - p1[0]) * dLon + (userLat - p1[1]) * dLat) / segLenSq));
      const projLon = p1[0] + t * dLon;
      const projLat = p1[1] + t * dLat;
      const distToProj = calculateDistanceKm(userLat, userLon, projLat, projLon);
      if (distToProj < minDistance) minDistance = distToProj;
    }
  }

  return minDistance === Infinity ? 0 : parseFloat(minDistance.toFixed(1));
}

export interface AshPlumeSafetyStatus {
  level: 'danger' | 'warning' | 'safe';
  badge: string;
  statusText: string;
  recommendation: string;
  colorHex: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
}

/**
 * Returns standardized Indonesian civil protection safety status based on distance to ash plume.
 */
export function getAshPlumeSafetyStatus(distanceKm: number): AshPlumeSafetyStatus {
  if (distanceKm < 50) {
    return {
      level: 'danger',
      badge: 'WASPADA TINGGI',
      statusText: distanceKm === 0 ? 'Posisi berada di dalam zona sebaran abu!' : 'Sangat dekat dengan lintasan abu vulkanik.',
      recommendation: 'Gunakan masker standar N95 / medis dan batasi aktivitas luar ruang.',
      colorHex: '#e11d48',
      badgeClass: 'bg-rose-600 text-white',
      borderClass: 'border-rose-200',
      bgClass: 'bg-rose-50/80',
    };
  }

  if (distanceKm <= 250) {
    return {
      level: 'warning',
      badge: 'RADIUS SIAGA',
      statusText: 'Waspadai pergeseran arah angin muson.',
      recommendation: 'Siapkan perlindungan masker dan pantau rute penerbangan setempat.',
      colorHex: '#d97706',
      badgeClass: 'bg-amber-500 text-white',
      borderClass: 'border-amber-200',
      bgClass: 'bg-amber-50/80',
    };
  }

  return {
    level: 'safe',
    badge: 'ZONA AMAN',
    statusText: 'Di luar jangkauan abu permukaan saat ini.',
    recommendation: 'Lokasi Anda aman dan jauh dari lintasan dispersi abu vulkanik aktif.',
    colorHex: '#059669',
    badgeClass: 'bg-emerald-600 text-white',
    borderClass: 'border-emerald-200',
    bgClass: 'bg-emerald-50/80',
  };
}
