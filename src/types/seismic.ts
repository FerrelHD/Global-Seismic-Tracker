export interface SeismicEvent {
  id: string;
  usgs_id: string;
  magnitude: number | null;
  depth: number;
  latitude: number;
  longitude: number;
  place: string | null;
  occurred_at: string;
}

export interface WildfireHotspot {
  id: string;
  latitude: number;
  longitude: number;
  frp: number; // Fire Radiative Power (MW)
  confidence: 'low' | 'nominal' | 'high' | number;
  island: 'Sumatra' | 'Kalimantan' | 'Sulawesi' | 'Papua' | 'Jawa' | string;
  satellite: string;
  detected_at: string;
}

export type HazardMode = 'dual' | 'seismic' | 'wildfire';

export interface HoveredEventState {
  event: SeismicEvent;
  screenPos: { x: number; y: number };
}

export interface Bookmark {
  id: string;
  event_id: string;
  event: SeismicEvent;
  custom_note?: string;
  created_at: string;
}
