import React, { useMemo, useState, useEffect } from 'react';
import { SeismicEvent, WildfireHotspot, VolcanoActivity, HazardMode } from '../../types/seismic';
import { X, Bookmark as BookmarkIcon, Search, Radio, Flame, Triangle, Activity, MapPin } from 'lucide-react';

interface EventsListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: SeismicEvent[];
  hotspots?: WildfireHotspot[];
  volcanoes?: VolcanoActivity[];
  activeHazardMode?: HazardMode;
  selectedRegion: string;
  onSelectEvent: (event: SeismicEvent) => void;
  onSelectHotspot?: (hotspot: WildfireHotspot) => void;
  onSelectVolcano?: (volcano: VolcanoActivity) => void;
  isBookmarked: (event: SeismicEvent) => boolean;
  onToggleBookmark: (event: SeismicEvent) => void;
}

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function cleanLocation(place: string | null): string {
  if (!place) return 'Unknown Epicenter';
  const parts = place.split(' of ');
  return parts.length > 1 ? parts[1] : place;
}

export const EventsListDrawer: React.FC<EventsListDrawerProps> = ({
  isOpen,
  onClose,
  events,
  hotspots = [],
  volcanoes = [],
  activeHazardMode = 'all',
  selectedRegion,
  onSelectEvent,
  onSelectHotspot,
  onSelectVolcano,
  isBookmarked,
  onToggleBookmark,
}) => {
  // Category tabs: 'earthquake' | 'wildfire' | 'volcano'
  const [categoryTab, setCategoryTab] = useState<'earthquake' | 'wildfire' | 'volcano'>('earthquake');

  // Sub-filter modes per category
  const [seismicFilter, setSeismicFilter] = useState<'all' | 'm5' | 'm6' | 'saved'>('all');
  const [wildfireFilter, setWildfireFilter] = useState<'all' | 'high_frp' | 'extreme_frp' | 'kalimantan' | 'sumatra'>('all');
  const [volcanoFilter, setVolcanoFilter] = useState<'all' | 'level3' | 'level2'>('all');

  const [searchQuery, setSearchQuery] = useState('');

  // Auto-sync category tab with active dock hazard mode when drawer opens
  useEffect(() => {
    if (!isOpen) return;
    if (activeHazardMode === 'wildfire') {
      setCategoryTab('wildfire');
    } else if (activeHazardMode === 'volcano') {
      setCategoryTab('volcano');
    } else {
      setCategoryTab('earthquake');
    }
    setSearchQuery('');
  }, [isOpen, activeHazardMode]);

  // Process & filter earthquakes
  const filteredEvents = useMemo(() => {
    let list = [...events].sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0));

    if (seismicFilter === 'm6') {
      list = list.filter((e) => (e.magnitude ?? 0) >= 6.0);
    } else if (seismicFilter === 'm5') {
      list = list.filter((e) => (e.magnitude ?? 0) >= 5.0);
    } else if (seismicFilter === 'saved') {
      list = list.filter((e) => isBookmarked(e));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          (e.place && e.place.toLowerCase().includes(q)) ||
          (e.magnitude && `m${e.magnitude}`.includes(q))
      );
    }

    return list.slice(0, 100);
  }, [events, seismicFilter, searchQuery, isBookmarked]);

  // Process & filter wildfires
  const filteredHotspots = useMemo(() => {
    let list = [...hotspots].sort((a, b) => b.frp - a.frp);

    if (wildfireFilter === 'high_frp') {
      list = list.filter((h) => h.frp >= 50);
    } else if (wildfireFilter === 'extreme_frp') {
      list = list.filter((h) => h.frp >= 120);
    } else if (wildfireFilter === 'kalimantan') {
      list = list.filter((h) => h.island === 'Kalimantan');
    } else if (wildfireFilter === 'sumatra') {
      list = list.filter((h) => h.island === 'Sumatra');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (h) =>
          h.island.toLowerCase().includes(q) ||
          h.satellite.toLowerCase().includes(q) ||
          `${h.frp}`.includes(q)
      );
    }

    return list.slice(0, 120);
  }, [hotspots, wildfireFilter, searchQuery]);

  // Process & filter volcanoes
  const filteredVolcanoes = useMemo(() => {
    let list = [...volcanoes];

    if (volcanoFilter === 'level3') {
      list = list.filter((v) => v.alert_level === 'Level III');
    } else if (volcanoFilter === 'level2') {
      list = list.filter((v) => v.alert_level === 'Level II');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.island.toLowerCase().includes(q) ||
          v.alert_level.toLowerCase().includes(q)
      );
    }

    return list;
  }, [volcanoes, volcanoFilter, searchQuery]);

  const savedCount = useMemo(() => {
    return events.filter((e) => isBookmarked(e)).length;
  }, [events, isBookmarked]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        onWheel={(e) => e.stopPropagation()}
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 transition-opacity duration-300 opacity-100 pointer-events-auto animate-in fade-in"
      />

      {/* Multi-Hazard Telemetry Ledger Drawer */}
      <aside
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className="fixed top-0 left-0 bottom-0 h-full w-full sm:max-w-md z-50 shadow-2xl bg-white/95 backdrop-blur-2xl border-r border-slate-200/80 rounded-none sm:rounded-r-3xl flex flex-col justify-between animate-in slide-in-from-left duration-300 ease-out font-sans overflow-hidden"
      >
        {/* 1. Header: Clean Category Tabs & Live Status */}
        <div className="shrink-0 px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-5 pb-3 border-b border-slate-200/70 bg-white/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0f2f63] shrink-0 animate-pulse" />
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Live Hazard Ledger
              </h2>
            </div>

            <button
              onClick={onClose}
              title="Close drawer"
              className="p-2 sm:p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Category Switcher (Gempa / Karhutla / Gunung) */}
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 mt-3.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 font-mono text-[11px] sm:text-xs">
            <button
              onClick={() => {
                setCategoryTab('earthquake');
                setSearchQuery('');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                categoryTab === 'earthquake'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">GEMPA</span>
              <span className="text-[9.5px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-mono">
                {events.length}
              </span>
            </button>

            <button
              onClick={() => {
                setCategoryTab('wildfire');
                setSearchQuery('');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                categoryTab === 'wildfire'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">API</span>
              <span className="text-[9.5px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-mono">
                {hotspots.length}
              </span>
            </button>

            <button
              onClick={() => {
                setCategoryTab('volcano');
                setSearchQuery('');
              }}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                categoryTab === 'volcano'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Triangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">GUNUNG</span>
              <span className="text-[9.5px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 font-mono">
                {volcanoes.length}
              </span>
            </button>
          </div>

          {/* Sub-Filters: Earthquake */}
          {categoryTab === 'earthquake' && (
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSeismicFilter('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  seismicFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setSeismicFilter('m5')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  seismicFilter === 'm5'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                M5.0+
              </button>
              <button
                onClick={() => setSeismicFilter('m6')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  seismicFilter === 'm6'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                M6.0+ Mayor
              </button>
              <button
                onClick={() => setSeismicFilter('saved')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1 cursor-pointer ${
                  seismicFilter === 'saved'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                <BookmarkIcon className="w-3 h-3" />
                <span>Disimpan</span>
                {savedCount > 0 && (
                  <span className="text-[10px] px-1.5 rounded-full bg-slate-200/80 text-slate-800">
                    {savedCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Sub-Filters: Wildfires (NASA FIRMS) */}
          {categoryTab === 'wildfire' && (
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setWildfireFilter('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  wildfireFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                Semua Titik
              </button>
              <button
                onClick={() => setWildfireFilter('high_frp')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  wildfireFilter === 'high_frp'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                FRP &ge; 50 MW
              </button>
              <button
                onClick={() => setWildfireFilter('extreme_frp')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  wildfireFilter === 'extreme_frp'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                Ekstrem &ge; 120 MW
              </button>
              <button
                onClick={() => setWildfireFilter('kalimantan')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  wildfireFilter === 'kalimantan'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                Kalimantan
              </button>
              <button
                onClick={() => setWildfireFilter('sumatra')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  wildfireFilter === 'sumatra'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                Sumatra
              </button>
            </div>
          )}

          {/* Sub-Filters: Volcanoes */}
          {categoryTab === 'volcano' && (
            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setVolcanoFilter('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  volcanoFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                Semua (7)
              </button>
              <button
                onClick={() => setVolcanoFilter('level3')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  volcanoFilter === 'level3'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Level III (Siaga)
              </button>
              <button
                onClick={() => setVolcanoFilter('level2')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-all cursor-pointer ${
                  volcanoFilter === 'level2'
                    ? 'bg-yellow-600 text-white shadow-xs'
                    : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
                }`}
              >
                Level II (Waspada)
              </button>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative mt-2.5">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                categoryTab === 'earthquake'
                  ? 'Cari wilayah atau magnitudo gempa...'
                  : categoryTab === 'wildfire'
                  ? 'Cari pulau (Kalimantan, Sumatra, dll)...'
                  : 'Cari nama gunung atau provinsi...'
              }
              className="w-full pl-8.5 pr-3 py-2 sm:py-1.5 bg-slate-50 rounded-lg text-base sm:text-xs text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:outline-hidden focus:border-slate-400 transition-colors"
            />
          </div>
        </div>

        {/* 2. Scrollable Data List */}
        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain select-none divide-y divide-slate-100/80 px-2 py-1"
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* TAB 1: GEMPA BUMI */}
          {categoryTab === 'earthquake' && (
            filteredEvents.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-8 text-slate-400 font-sans text-xs">
                <Radio className="w-6 h-6 text-slate-300 mb-2" />
                <p className="font-medium text-slate-600">Tidak ada gempa yang cocok</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Ubah kata kunci pencarian atau filter</p>
              </div>
            ) : (
              filteredEvents.map((evt) => {
                const mag = evt.magnitude?.toFixed(1) ?? 'N/A';
                const magVal = evt.magnitude ?? 0;
                const bookmarked = isBookmarked(evt);
                const relTime = formatRelativeTime(evt.occurred_at);

                return (
                  <div
                    key={evt.usgs_id || evt.id}
                    onClick={() => {
                      onSelectEvent(evt);
                      onClose();
                    }}
                    className="group relative flex items-center justify-between gap-3 px-3.5 py-2.5 my-0.5 rounded-lg hover:bg-slate-100/80 transition-colors duration-150 cursor-pointer"
                  >
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-blue-600 rounded-r scale-y-0 group-hover:scale-y-100 transition-transform duration-150 ease-out origin-center" />

                    <div className="shrink-0 w-12 flex items-center gap-1.5 pl-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          magVal >= 6.0
                            ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse'
                            : magVal >= 5.0
                            ? 'bg-amber-500'
                            : 'bg-slate-300'
                        }`}
                      />
                      <span
                        className={`font-mono text-sm tabular-nums tracking-tight ${
                          magVal >= 6.0
                            ? 'text-rose-600 font-bold'
                            : magVal >= 5.0
                            ? 'text-slate-900 font-semibold'
                            : 'text-slate-600 font-medium'
                        }`}
                      >
                        {mag}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 pr-1 pl-1">
                      <h3 className="text-xs font-medium text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                        {cleanLocation(evt.place)}
                      </h3>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{evt.depth.toFixed(0)} km</span>
                        <span className="text-slate-300">/</span>
                        <span>{relTime}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBookmark(evt);
                        }}
                        title={bookmarked ? 'Hapus bookmark' : 'Simpan bookmark'}
                        className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                          bookmarked
                            ? 'text-blue-600 opacity-100'
                            : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-700 hover:bg-slate-200/60'
                        }`}
                      >
                        <BookmarkIcon className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* TAB 2: TITIK PANAS / KARHUTLA (NASA FIRMS REALTIME) */}
          {categoryTab === 'wildfire' && (
            filteredHotspots.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-8 text-slate-400 font-sans text-xs">
                <Flame className="w-6 h-6 text-slate-300 mb-2" />
                <p className="font-medium text-slate-600">Tidak ada titik api ditemukan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Satelit NASA tidak mendeteksi anomali pada filter ini</p>
              </div>
            ) : (
              filteredHotspots.map((hotspot) => {
                const isHigh = hotspot.frp >= 100;
                const isExtreme = hotspot.frp >= 200;
                const relTime = formatRelativeTime(hotspot.detected_at);

                return (
                  <div
                    key={hotspot.id}
                    onClick={() => {
                      if (onSelectHotspot) onSelectHotspot(hotspot);
                      onClose();
                    }}
                    className="group relative flex items-center justify-between gap-3 px-3.5 py-2.5 my-0.5 rounded-lg hover:bg-rose-50/50 transition-colors duration-150 cursor-pointer"
                  >
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-rose-600 rounded-r scale-y-0 group-hover:scale-y-100 transition-transform duration-150 ease-out origin-center" />

                    {/* FRP Metric Badge */}
                    <div className="shrink-0 w-16 flex flex-col items-start pl-0.5">
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            isExtreme
                              ? 'bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.8)] animate-pulse'
                              : isHigh
                              ? 'bg-orange-500'
                              : 'bg-amber-400'
                          }`}
                        />
                        <span
                          className={`font-mono text-xs tabular-nums font-bold ${
                            isExtreme ? 'text-rose-600' : isHigh ? 'text-orange-600' : 'text-slate-800'
                          }`}
                        >
                          {hotspot.frp.toFixed(0)} <span className="text-[9px] font-medium text-slate-400">MW</span>
                        </span>
                      </div>
                      <span className="text-[8.5px] font-mono text-slate-400 uppercase tracking-tight">
                        {hotspot.confidence} conf
                      </span>
                    </div>

                    {/* Island & Coordinates */}
                    <div className="flex-1 min-w-0 pr-1 pl-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-rose-600 transition-colors truncate">
                          {hotspot.island}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                          {hotspot.satellite}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{hotspot.latitude.toFixed(3)}°, {hotspot.longitude.toFixed(3)}°</span>
                        <span className="text-slate-300">/</span>
                        <span>{relTime}</span>
                      </div>
                    </div>

                    {/* Jump Pin Arrow */}
                    <div className="shrink-0 text-slate-400 group-hover:text-rose-600 transition-colors">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* TAB 3: GUNUNG BERAPI (PVMBG MAGMA ESDM) */}
          {categoryTab === 'volcano' && (
            filteredVolcanoes.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-8 text-slate-400 font-sans text-xs">
                <Triangle className="w-6 h-6 text-slate-300 mb-2" />
                <p className="font-medium text-slate-600">Tidak ada gunung yang cocok</p>
              </div>
            ) : (
              filteredVolcanoes.map((volcano) => {
                const isLevel3 = volcano.alert_level === 'Level III';
                const isLevel4 = volcano.alert_level === 'Level IV';

                return (
                  <div
                    key={volcano.id}
                    onClick={() => {
                      if (onSelectVolcano) onSelectVolcano(volcano);
                      onClose();
                    }}
                    className="group relative flex items-center justify-between gap-3 px-3.5 py-3 my-0.5 rounded-lg hover:bg-amber-50/50 transition-colors duration-150 cursor-pointer"
                  >
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-amber-600 rounded-r scale-y-0 group-hover:scale-y-100 transition-transform duration-150 ease-out origin-center" />

                    {/* Alert Level Pill */}
                    <div className="shrink-0 w-20 flex flex-col items-start pl-0.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold uppercase tracking-wider ${
                          isLevel4
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : isLevel3
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLevel4 ? 'bg-rose-600 animate-pulse' : isLevel3 ? 'bg-orange-600 animate-pulse' : 'bg-yellow-500'
                          }`}
                        />
                        {volcano.alert_level === 'Level III' ? 'SIAGA' : volcano.alert_level === 'Level II' ? 'WASPADA' : 'AWAS'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-400 mt-1">
                        {volcano.elevation_m} mdpl
                      </span>
                    </div>

                    {/* Volcano Name & Status Snippet */}
                    <div className="flex-1 min-w-0 pr-1 pl-1">
                      <h3 className="text-xs font-bold text-slate-900 tracking-tight group-hover:text-amber-700 transition-colors truncate">
                        {volcano.name}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-sans line-clamp-1 mt-0.5">
                        {volcano.crater_status || volcano.status_description}
                      </p>
                      <div className="flex items-center gap-2 text-[9.5px] text-slate-400 font-mono mt-0.5">
                        <span>{volcano.island}</span>
                        <span className="text-slate-300">·</span>
                        <span>{volcano.latitude.toFixed(3)}°, {volcano.longitude.toFixed(3)}°</span>
                      </div>
                    </div>

                    {/* Jump Pin Arrow */}
                    <div className="shrink-0 text-slate-400 group-hover:text-amber-600 transition-colors">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* 3. Footer Bar */}
        <div className="shrink-0 px-4 sm:px-5 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200/70 bg-slate-50/80 flex items-center justify-end text-[11px] text-slate-500 font-sans">
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs text-slate-600 font-medium">
              ESC
            </kbd>
            <span>tutup</span>
          </span>
        </div>
      </aside>
    </>
  );
};
