import React, { useState, useMemo, useRef, useEffect } from 'react';
import { VolcanoActivity } from '../../types/seismic';
import {
  X,
  Flame,
  Wind,
  Mountain,
  Compass,
  ShieldAlert,
  Share2,
  AlertTriangle,
  Activity,
  Newspaper,
  Navigation,
  MapPin,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Building2,
  ChevronDown,
  Search,
  Check,
} from 'lucide-react';
import { Language } from '../../utils/i18n';
import { DisasterNewsVerification } from './DisasterNewsVerification';
import { useUserLocation } from '../../hooks/useUserLocation';
import {
  INDONESIAN_REFERENCE_CITIES,
  calculateDistanceKm,
  getAshPlumeSafetyStatus,
  IndonesianCity,
} from '../../utils/geoProximity';

interface VolcanoDetailModalProps {
  volcano: VolcanoActivity | null;
  onClose: () => void;
  lang: Language;
  initialTab?: 'telemetry' | 'news';
}

export const VolcanoDetailModal: React.FC<VolcanoDetailModalProps> = ({
  volcano,
  onClose,
  lang,
  initialTab = 'telemetry',
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'news'>(initialTab);

  // Ash Plume Proximity Calculator State
  const { coords: userGpsCoords, status: gpsStatus, requestLocation: requestGpsLocation } = useUserLocation();
  const [locationMode, setLocationMode] = useState<'gps' | 'city'>(() => {
    return userGpsCoords ? 'gps' : 'city';
  });

  // Custom Glassmorphism Dropdown State
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Close city dropdown on click outside
  useEffect(() => {
    if (!isCityDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCityDropdownOpen]);

  // Escape key listener & body scroll lock
  useEffect(() => {
    if (!volcano) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [volcano, onClose]);

  // Default benchmark city (Default to closest NTT city if in NTT, else Depok/Jakarta)
  const [selectedCityName, setSelectedCityName] = useState<string>(() => {
    if (!volcano) return 'Depok';
    if (volcano.island.toLowerCase().includes('nusa') || volcano.island.toLowerCase().includes('bali')) {
      return 'Larantuka';
    }
    return 'Depok';
  });

  const selectedCity = useMemo<IndonesianCity>(() => {
    return (
      INDONESIAN_REFERENCE_CITIES.find((c) => c.name === selectedCityName) ||
      INDONESIAN_REFERENCE_CITIES[0]
    );
  }, [selectedCityName]);

  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return INDONESIAN_REFERENCE_CITIES;
    const q = citySearchQuery.toLowerCase().trim();
    return INDONESIAN_REFERENCE_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.province.toLowerCase().includes(q)
    );
  }, [citySearchQuery]);

  // Current active reference coordinates (GPS or City)
  const activeCoordinates = useMemo(() => {
    if (locationMode === 'gps' && userGpsCoords) {
      return {
        lat: userGpsCoords.latitude,
        lon: userGpsCoords.longitude,
        label: 'Posisi GPS Saya',
        subLabel: `${userGpsCoords.latitude.toFixed(2)}°, ${userGpsCoords.longitude.toFixed(2)}°`,
        isGps: true,
      };
    }
    return {
      lat: selectedCity.latitude,
      lon: selectedCity.longitude,
      label: selectedCity.name,
      subLabel: selectedCity.province,
      isGps: false,
    };
  }, [locationMode, userGpsCoords, selectedCity]);

  // Calculated Distances & Safety Status
  const proximityData = useMemo(() => {
    if (!volcano) return null;
    const { lat, lon } = activeCoordinates;

    // Direct Geographic Distance to Volcano Crater
    const craterDist = Math.round(calculateDistanceKm(lat, lon, volcano.latitude, volcano.longitude));
    const safety = getAshPlumeSafetyStatus(craterDist);

    return {
      craterDist,
      safety,
    };
  }, [volcano, activeCoordinates]);

  if (!volcano) return null;

  const isCritical = volcano.alert_level === 'Level IV';
  const isWarning = volcano.alert_level === 'Level III';

  const alertBadgeColor = isCritical
    ? 'bg-rose-50 border-rose-200 text-rose-700'
    : isWarning
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : volcano.alert_level === 'Level II'
    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';

  const alertDotColor = isCritical
    ? 'bg-rose-600'
    : isWarning
    ? 'bg-amber-500'
    : volcano.alert_level === 'Level II'
    ? 'bg-yellow-500'
    : 'bg-emerald-500';

  const alertLevelLabel = {
    'Level I': lang === 'id' ? 'LEVEL I (NORMAL)' : 'LEVEL I (NORMAL)',
    'Level II': lang === 'id' ? 'LEVEL II (WASPADA)' : 'LEVEL II (ADVISORY)',
    'Level III': lang === 'id' ? 'LEVEL III (SIAGA)' : 'LEVEL III (WATCH)',
    'Level IV': lang === 'id' ? 'LEVEL IV (AWAS)' : 'LEVEL IV (WARNING)',
  }[volcano.alert_level];

  const handleShare = () => {
    let text = `🌋 *${volcano.name} - Status: ${volcano.alert_level}*\n`;
    if (volcano.ash_plume) {
      text += `💨 Ketinggian Kolom Abu: FL${volcano.ash_plume.cloud_top_fl || 'N/A'}\n`;
      text += `🧭 Arah Sebaran: ${volcano.ash_plume.direction || 'N/A'} (${volcano.ash_plume.speed_knots || 0} Knots)\n`;
    }
    if (proximityData) {
      text += `📍 *Jarak ke Kawah (${activeCoordinates.label}):* ~${proximityData.craterDist.toLocaleString('id-ID')} km\n`;
      text += `🛡️ *Status:* ${proximityData.safety.badge} - ${proximityData.safety.statusText}\n`;
    }
    text += `\n🌐 *Pantau Peta & Abu Vulkanik:* https://global-seismic-tracker.vercel.app/`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const latDir = volcano.latitude >= 0 ? 'N' : 'S';
  const lonDir = volcano.longitude >= 0 ? 'E' : 'W';
  const formattedCoords = `${Math.abs(volcano.latitude).toFixed(3)}° ${latDir}, ${Math.abs(volcano.longitude).toFixed(3)}° ${lonDir}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detail status vulkanik ${volcano.name}`}
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/25 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto my-auto rounded-2xl sm:rounded-3xl no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Editorial Liquid Glass Native Card */}
        <div className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 pb-6 shadow-2xl border border-white/90 select-none bg-white/95 backdrop-blur-2xl relative overflow-visible ring-1 ring-black/[0.04]">
          {/* Technical Corner Crosshairs */}
          <span className="absolute top-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┌</span>
          <span className="absolute top-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┐</span>
          <span className="absolute bottom-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">└</span>
          <span className="absolute bottom-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">┘</span>

          {/* 1. HEADER ROW */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${alertDotColor} shrink-0 ${isCritical ? 'animate-ping' : ''}`} />
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold truncate">
                  VOLCANIC TELEMETRY // PVMBG - MAGMA INDONESIA
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-sans font-black text-slate-950 tracking-tight leading-snug truncate uppercase">
                {volcano.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold tracking-wider ${alertBadgeColor}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${alertDotColor}`} />
                  {alertLevelLabel}
                </span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {volcano.island}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Close readout"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TAB SWITCHER: STATUS VULKANIK vs VERIFIKASI BERITA */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 my-3">
            <button
              type="button"
              onClick={() => setActiveTab('telemetry')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-[10.5px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'telemetry'
                  ? 'bg-white text-slate-950 shadow-2xs border border-slate-200/70'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-slate-600" />
              <span>{lang === 'id' ? 'STATUS VULKANIK' : 'VOLCANIC STATUS'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('news')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-mono text-[10.5px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'news'
                  ? 'bg-white text-slate-950 shadow-2xs border border-slate-200/70'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 text-rose-500" />
              <span>{lang === 'id' ? 'VERIFIKASI BERITA' : 'NEWS VERIFICATION'}</span>
              {(isCritical || isWarning) && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </button>
          </div>

          {activeTab === 'telemetry' ? (
            <div>
              {/* 2. GEODETIC & VONA METRICS */}
              <div className="py-3.5 grid grid-cols-3 gap-2.5 border-b border-slate-100 font-mono">
                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase tracking-wider">
                    <Mountain className="w-3 h-3 text-slate-400" />
                    <span>ELEVASI</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 mt-1">{volcano.elevation_m.toLocaleString()} M</span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase tracking-wider">
                    <Compass className="w-3 h-3 text-slate-400" />
                    <span>KOORDINAT</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900 mt-1 truncate">{formattedCoords}</span>
                </div>

                <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase tracking-wider">
                    <ShieldAlert className="w-3 h-3 text-slate-400" />
                    <span>VONA CODE</span>
                  </div>
                  <span className={`text-xs font-bold mt-1 ${
                    volcano.ash_plume?.aviation_color_code === 'RED'
                      ? 'text-rose-600'
                      : volcano.ash_plume?.aviation_color_code === 'ORANGE'
                      ? 'text-amber-600'
                      : 'text-slate-800'
                  }`}>
                    {volcano.ash_plume?.aviation_color_code || 'YELLOW'}
                  </span>
                </div>
              </div>

              {/* 3. ASH PLUME & AVIATION HAZARD TELEMETRY */}
              {volcano.ash_plume && (
                <div className="py-3 border-b border-slate-100">
                  <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3 flex flex-col gap-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-rose-800 font-bold">
                      <span className="flex items-center gap-1.5 text-[11px] tracking-wide">
                        <Wind className="w-3.5 h-3.5 text-rose-600" />
                        <span>SEBARAN ABU VULKANIK (VAAC DARWIN)</span>
                      </span>
                      <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-bold">
                        FL{volcano.ash_plume.cloud_top_fl} (~{(volcano.ash_plume.cloud_top_fl * 100 * 0.3048).toFixed(0)}m)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 pt-1 border-t border-rose-200/60">
                      <div>
                        <span className="text-slate-400 block">ARAH ANGIN:</span>
                        <span className="font-bold text-rose-900">{volcano.ash_plume.direction} ({volcano.ash_plume.speed_knots} KNOTS)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">STATUS KORIDOR UDARA:</span>
                        <span className="font-bold text-rose-900">NOTAM / SIGMET ACTIVE</span>
                      </div>
                    </div>

                    {volcano.ash_plume.advisory_summary && (
                      <p className="text-[10px] text-slate-600 font-sans leading-relaxed bg-white/70 p-2 rounded border border-rose-100">
                        {volcano.ash_plume.advisory_summary}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 4. ASH PLUME PROXIMITY CALCULATOR (FITUR NOMOR 1) */}
              {proximityData && (
                <div className="py-3 border-b border-slate-100">
                  <div className="flex flex-col gap-2.5">
                    {/* Header & Location Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 text-slate-700" />
                        <span className="text-[10.5px] font-mono font-bold text-slate-900 tracking-wide uppercase">
                          KALKULATOR JARAK ABU VULKANIK
                        </span>
                      </div>

                      {/* Location Controls (GPS or City select) */}
                      <div className="flex items-center gap-1.5 w-full sm:w-auto relative" ref={cityDropdownRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setLocationMode('gps');
                            requestGpsLocation();
                          }}
                          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1.5 sm:py-1 rounded-lg font-mono text-[10px] font-semibold tracking-wider transition-all cursor-pointer ${
                            locationMode === 'gps' && userGpsCoords
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                          }`}
                          title="Gunakan posisi GPS browser"
                        >
                          <Navigation className={`w-3 h-3 ${gpsStatus === 'requesting' ? 'animate-spin' : ''}`} />
                          <span className="truncate">
                            {gpsStatus === 'requesting'
                              ? 'MENCARI GPS...'
                              : locationMode === 'gps' && userGpsCoords
                              ? 'GPS SAYA'
                              : 'GPS SAYA'}
                          </span>
                        </button>

                        {/* Custom Glassmorphism City Selector Dropdown Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsCityDropdownOpen((prev) => !prev);
                            setLocationMode('city');
                          }}
                          className={`flex-1 sm:flex-initial flex items-center justify-between sm:justify-start gap-1.5 px-2.5 py-1.5 sm:py-1 rounded-lg font-mono text-[10px] font-semibold tracking-wider border transition-all cursor-pointer ${
                            locationMode === 'city'
                              ? 'bg-white text-slate-900 border-slate-300 shadow-2xs'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200/80'
                          }`}
                          title="Pilih kota acuan jarak abu"
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="max-w-[110px] sm:max-w-[150px] truncate">
                              {selectedCity.name}
                            </span>
                          </span>
                          <ChevronDown
                            className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-200 ${
                              isCityDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Custom Dropdown Popover with Max Height & Search (Responsive Full-Width on Mobile) */}
                        {isCityDropdownOpen && (
                          <div className="absolute bottom-full mb-2 left-0 right-0 sm:left-auto sm:right-0 sm:w-72 bg-white/98 backdrop-blur-xl border border-slate-200/90 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-2 duration-150">
                            {/* Mini Search Header */}
                            <div className="p-2 border-b border-slate-100 flex items-center gap-1.5 bg-slate-50/90">
                              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={citySearchQuery}
                                onChange={(e) => setCitySearchQuery(e.target.value)}
                                placeholder="Cari kota / provinsi..."
                                className="w-full bg-transparent text-xs sm:text-[11px] font-sans text-slate-900 placeholder-slate-400 outline-none"
                                autoFocus
                              />
                              {citySearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setCitySearchQuery('')}
                                  className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Scrollable City List with Max-Height */}
                            <div className="max-h-48 overflow-y-auto py-1 divide-y divide-slate-100/80 no-scrollbar sm:custom-scrollbar">
                                {filteredCities.length === 0 ? (
                                  <div className="px-3 py-3 text-[11px] font-sans text-slate-400 text-center">
                                    Kota tidak ditemukan
                                  </div>
                                ) : (
                                  filteredCities.map((city) => {
                                    const isSelected = city.name === selectedCityName;
                                    return (
                                      <button
                                        key={city.name}
                                        type="button"
                                        onClick={() => {
                                          setSelectedCityName(city.name);
                                          setLocationMode('city');
                                          setIsCityDropdownOpen(false);
                                          setCitySearchQuery('');
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                                          isSelected
                                            ? 'bg-slate-900 text-white'
                                            : 'hover:bg-slate-100 text-slate-800'
                                        }`}
                                      >
                                        <div className="min-w-0 pr-2">
                                          <div
                                            className={`font-mono text-[11px] font-bold truncate ${
                                              isSelected ? 'text-white' : 'text-slate-900'
                                            }`}
                                          >
                                            {city.name}
                                          </div>
                                          <div
                                            className={`text-[9.5px] font-sans truncate ${
                                              isSelected ? 'text-slate-300' : 'text-slate-500'
                                            }`}
                                          >
                                            {city.province}
                                          </div>
                                        </div>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Proximity Readout Card */}
                    <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/90 font-mono flex flex-col gap-2.5">
                      {/* Metric Display */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>LOKASI: {activeCoordinates.label}</span>
                          </div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-2xl font-black text-slate-950 tracking-tight">
                              ~{proximityData.craterDist.toLocaleString('id-ID')}
                            </span>
                            <span className="text-xs font-bold text-slate-600">KM</span>
                            <span className="text-[10px] text-slate-500 ml-1">
                              dari kawah aktif
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Elevasi: {volcano.elevation_m} mdpl · {volcano.island}
                          </div>
                        </div>

                        {/* Status Pill Indicator */}
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-2xs ${proximityData.safety.badgeClass}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            {proximityData.safety.badge}
                          </span>
                          <span className="block text-[8.5px] text-slate-400 mt-1 uppercase">
                            {proximityData.craterDist < 50 ? '< 50 KM RADIUS' : proximityData.craterDist <= 250 ? '50 - 250 KM RADIUS' : '> 250 KM RADIUS'}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Safety Advisory Box */}
                      <div
                        className={`p-2.5 rounded-xl border text-[10.5px] leading-relaxed flex flex-col gap-1 ${proximityData.safety.bgClass} ${proximityData.safety.borderClass}`}
                      >
                        <div className="flex items-center gap-1.5 font-bold" style={{ color: proximityData.safety.colorHex }}>
                          {proximityData.safety.level === 'danger' ? (
                            <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                          ) : proximityData.safety.level === 'warning' ? (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{proximityData.safety.statusText}</span>
                        </div>
                        <p className="font-sans text-[11px] text-slate-700 leading-normal pl-5">
                          {proximityData.safety.recommendation}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[8px] text-slate-400 tracking-wider pt-1 border-t border-slate-200/60 uppercase">
                        <span>DATA: VAAC DARWIN & PVMBG POLIGON</span>
                        <span>FLIGHT LEVEL: FL{volcano.ash_plume?.cloud_top_fl || '300'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. ACTIVITY NARRATIVE & CRATER REPORT */}
              <div className="py-3 flex flex-col gap-2 font-sans text-xs">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-bold">
                  CATATAN AKTIVITAS VISUAL & KEGEMPAAN (PVMBG)
                </span>
                <p className="text-slate-700 leading-relaxed bg-slate-50/90 p-3 rounded-xl border border-slate-100">
                  {volcano.status_description}
                </p>
                {volcano.crater_status && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>KAWAH: {volcano.crater_status}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-3">
              <DisasterNewsVerification
                event={{
                  id: volcano.id,
                  place: volcano.name,
                  disasterType: 'volcano',
                }}
                lang={lang}
              />
            </div>
          )}

          {/* 5. FOOTER ACTIONS */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-semibold shadow-xs transition-colors cursor-pointer active:scale-98"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>BAGIKAN PERINGATAN (WA)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-xs font-semibold transition-colors cursor-pointer active:scale-98"
            >
              TUTUP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
