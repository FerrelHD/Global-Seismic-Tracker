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

export interface RegionalWindData {
  region: string;
  latitude: number;
  longitude: number;
  windSpeed: number; // km/h
  windDirection: number; // degrees 0-360
  gustSpeed?: number;
  timestamp: string;
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
  windSpeed?: number;
  windDirection?: number;
}

export type AlertLevel = 'Level I' | 'Level II' | 'Level III' | 'Level IV';
export type AviationColorCode = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface AshPlume {
  id: string;
  volcano_id?: string;
  volcano_code: string;
  aviation_color_code: AviationColorCode;
  cloud_top_fl: number; // Flight level (e.g. FL200 = 20,000 ft)
  direction: string; // e.g. 'W', 'SW', 'NW'
  speed_knots: number;
  dispersion_polygon: [number, number][]; // Array of [lon, lat] coordinates
  advisory_summary?: string;
  issued_at: string;
}

export interface VolcanoActivity {
  id: string;
  code: string;
  name: string;
  island: string;
  latitude: number;
  longitude: number;
  elevation_m: number;
  alert_level: AlertLevel; // Level I (Normal), Level II (Waspada), Level III (Siaga), Level IV (Awas)
  status_description: string;
  crater_status?: string;
  updated_at: string;
  ash_plume?: AshPlume;
}

export type HazardMode = 'all' | 'dual' | 'seismic' | 'wildfire' | 'volcano';

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
