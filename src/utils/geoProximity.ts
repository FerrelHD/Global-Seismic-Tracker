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

  lines.push(
    ``,
    isEn
      ? `🌐 *Monitor Live Seismogram & 3D Interactive Map:*`
      : `🌐 *Pantau Seismogram & Peta Interaktif Langsung:*`,
    `https://global-seismic-tracker.vercel.app`
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
