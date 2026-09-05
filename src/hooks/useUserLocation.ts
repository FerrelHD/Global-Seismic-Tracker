import { useState, useEffect, useCallback } from 'react';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
}

const STORAGE_KEY = 'geo_user_location_cache';

export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoordinates | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          return parsed;
        }
      }
    } catch {
      // Ignore sessionStorage errors
    }
    return null;
  });

  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable'>(() => {
    if (typeof window === 'undefined') return 'idle';
    return coords ? 'granted' : 'idle';
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      setErrorMessage('Geolokasi tidak didukung oleh browser Anda.');
      return;
    }

    setStatus('requesting');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoords: UserCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(newCoords);
        setStatus('granted');
        try {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newCoords));
        } catch {
          // Ignore
        }
      },
      (error) => {
        setStatus('denied');
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('Izin lokasi ditolak. Silakan izinkan akses lokasi di browser untuk mengukur jarak.');
        } else {
          setErrorMessage('Tidak dapat mengambil data posisi GPS saat ini.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 mins cache
      }
    );
  }, []);

  return {
    coords,
    status,
    errorMessage,
    requestLocation,
  };
}
