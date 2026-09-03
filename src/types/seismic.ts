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
