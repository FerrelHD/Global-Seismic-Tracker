import React, { useState, useMemo } from 'react';
import { SeismicEvent } from '../../types/seismic';
import { LiquidCard } from './liquid-glass';
import { useUserLocation } from '../../hooks/useUserLocation';
import {
  calculateDistanceKm,
  estimateMMI,
  formatSeismicWAMessage,
  openWhatsAppShare,
} from '../../utils/geoProximity';
import {
  X,
  Bookmark as BookmarkIcon,
  ExternalLink,
  Check,
  Compass,
  Copy,
  Layers,
  Activity,
  Share2,
  MapPin,
  Navigation,
  Loader2,
} from 'lucide-react';

interface EventModalProps {
  event: SeismicEvent | null;
  onClose: () => void;
  isBookmarked: boolean;
  onToggleBookmark: (event: SeismicEvent, note?: string) => void;
  onFocusGlobe?: (event: SeismicEvent) => void;
  onOpenSeismogram?: (event: SeismicEvent) => void;
  onOpenInfographic?: (event: SeismicEvent) => void;
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

function cleanPlace(place: string | null): string {
  if (!place) return 'UNKNOWN EPICENTER';
  const parts = place.split(' of ');
  const name = parts.length > 1 ? parts[1] : place;
  return name.replace(/,.*$/, '').trim().toUpperCase();
}

/**
 * Calculates approximate TNT energy equivalent using Gutenberg-Richter formula:
 * log10(E) = 4.8 + 1.5 * M (Joules)
 * 1 ton of TNT = 4.184 x 10^9 Joules
 */
function calculateEnergyEquivalent(mag: number): string {
  if (mag <= 0) return 'Trace Energy';
  const joules = Math.pow(10, 4.8 + 1.5 * mag);
  const tonsTNT = joules / 4.184e9;

  if (tonsTNT < 1) {
    const kg = tonsTNT * 1000;
    return `~${kg.toFixed(0)} kg TNT eq.`;
  }
  if (tonsTNT < 1000) {
    return `~${tonsTNT.toFixed(0)} tons TNT eq.`;
  }
  if (tonsTNT < 1000000) {
    const kilotons = tonsTNT / 1000;
    return `~${kilotons.toFixed(1)} kt TNT eq.`;
  }
  const megatons = tonsTNT / 1000000;
  return `~${megatons.toFixed(2)} Mt TNT eq.`;
}

/**
 * Generates an authentic damped seismograph waveform SVG path
 * tailored dynamically to the magnitude of the earthquake.
 */
function generateSeismicWaveform(mag: number, width = 160, height = 44): string {
  const numPoints = 72;
  const midY = height / 2;
  const maxAmp = Math.min(height * 0.44, Math.max(6, (mag / 7.5) * (height * 0.44)));
  const points: [number, number][] = [];

  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * width;
    const normX = (i - numPoints / 2) / (numPoints / 2);
    // Gaussian wavepacket envelope
    const env = Math.exp(-normX * normX * 4.8);

    // Primary P-wave, S-wave and coda noise packet
    const wave1 = Math.sin(normX * 16 * Math.PI) * maxAmp * env;
    const wave2 = Math.cos(normX * 32 * Math.PI) * (maxAmp * 0.4) * env;
    const wave3 = Math.sin(normX * 54 * Math.PI) * (maxAmp * 0.16) * env;

    const y = midY + wave1 + wave2 + wave3;
    points.push([x, y]);
  }

  return points.map(([px, py], idx) => `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onFocusGlobe,
  onOpenSeismogram,
  onOpenInfographic,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTsunamiGuide, setShowTsunamiGuide] = useState(false);
  const { coords, status: geoStatus, errorMessage: geoError, requestLocation } = useUserLocation();

  const magVal = event?.magnitude ?? 0;
  const energyStr = useMemo(() => calculateEnergyEquivalent(magVal), [magVal]);
  const waveformPath = useMemo(() => generateSeismicWaveform(magVal, 150, 42), [magVal]);

  const userDistanceKm = useMemo(() => {
    if (!coords || !event) return null;
    return calculateDistanceKm(coords.latitude, coords.longitude, event.latitude, event.longitude);
  }, [coords, event]);

  const mmiInfo = useMemo(() => {
    if (userDistanceKm == null || !event || event.magnitude == null) return null;
    return estimateMMI(event.magnitude, event.depth, userDistanceKm);
  }, [userDistanceKm, event]);

  if (!event) return null;

  const mag = magVal > 0 ? magVal.toFixed(1) : 'N/A';
  const isMajor = magVal >= 6.0;
  const isModerate = magVal >= 5.0;
  const usgsUrl = `https://earthquake.usgs.gov/earthquakes/eventpage/${event.usgs_id}/executive`;
  const relTime = formatRelativeTime(event.occurred_at);

  const latDir = event.latitude >= 0 ? 'N' : 'S';
  const lonDir = event.longitude >= 0 ? 'E' : 'W';
  const formattedCoords = `${Math.abs(event.latitude).toFixed(3)}° ${latDir}, ${Math.abs(event.longitude).toFixed(3)}° ${lonDir}`;

  const dateObj = new Date(event.occurred_at);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  // Depth stratum percentage (clamped 0 - 700km)
  const depthClamped = Math.max(0, Math.min(700, event.depth));
  const depthPct = Math.max(6, Math.min(94, (depthClamped / 700) * 100));

  const crustLayerLabel =
    event.depth < 70
      ? 'SHALLOW CRUST (< 70 KM)'
      : event.depth < 300
      ? 'INTERMEDIATE SUBDUCTION (70-300 KM)'
      : 'DEEP MANTLE SLAB (> 300 KM)';

  const handleCopy = () => {
    navigator.clipboard.writeText(`${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFocus = () => {
    if (onFocusGlobe) {
      onFocusGlobe(event);
    }
    onClose();
  };

  return (
    <div
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/25 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        data-lenis-prevent="true"
        className="w-full max-w-[560px] max-h-[88vh] overflow-y-auto my-auto rounded-3xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <LiquidCard className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl border border-white/90 select-none backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle Technical Corner Crosshairs (No Art Style) */}
          <span className="absolute top-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
            ┌
          </span>
          <span className="absolute top-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
            ┐
          </span>
          <span className="absolute bottom-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
            └
          </span>
          <span className="absolute bottom-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
            ┘
          </span>

          {/* 1. HEADER ROW */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0f2f63] shrink-0" />
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold truncate">
                  SEISMIC SPECIMEN // {event.usgs_id}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-sans font-black text-slate-950 tracking-tight leading-snug truncate uppercase">
                {cleanPlace(event.place)}
              </h2>
              {event.place && (
                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate tracking-wide">
                  {event.place.toUpperCase()}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              title="Close readout"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-950 hover:bg-slate-100 transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. SCIENTIFIC VISUALIZATION MATRIX (MAGNITUDE + WAVEFORM + DEPTH GAUGE) */}
          <div className="py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-4 border-b border-slate-100">
            {/* Left Col: Magnitude + Richter Segment Meter + Seismograph Waveform */}
            <div className="sm:col-span-7 flex flex-col justify-between">
              <div>
                <div className="flex items-baseline gap-2.5">
                  <span
                    className={`text-5xl sm:text-6xl font-mono font-black tracking-tighter tabular-nums ${
                      isMajor
                        ? 'text-rose-600'
                        : isModerate
                        ? 'text-amber-600'
                        : 'text-slate-950'
                    }`}
                  >
                    {mag}
                  </span>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 block tracking-widest uppercase">
                      MAGNITUDE (Mw)
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-600 mt-0.5 block tracking-wide">
                      {isMajor ? 'MAJOR RUPTURE' : isModerate ? 'MODERATE TREMOR' : 'LIGHT CRUSTAL SHOCK'}
                    </span>
                  </div>
                </div>

                {/* Segmented Richter Energy Scale (10 Discrete Segments) */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider mb-1 uppercase">
                    <span>RICHTER SCALE</span>
                    <span className="font-semibold text-slate-700">{energyStr}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => {
                      const isActive = magVal >= step - 0.5;
                      const isPeak = isActive && magVal < step + 0.5;
                      return (
                        <div
                          key={step}
                          className={`h-1.5 flex-1 rounded-xs transition-all ${
                            isPeak
                              ? isMajor
                                ? 'bg-rose-500 shadow-xs'
                                : isModerate
                                ? 'bg-amber-500 shadow-xs'
                                : 'bg-slate-900'
                              : isActive
                              ? isMajor
                                ? 'bg-rose-400/80'
                                : isModerate
                                ? 'bg-amber-400/80'
                                : 'bg-slate-700'
                              : 'bg-slate-100 border border-slate-200/60'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dynamic Waveform Visualizer */}
              <div className="mt-3 pt-2.5 border-t border-slate-100/80">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider mb-1 uppercase">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-slate-400" />
                    <span>SEISMOGRAPH HARMONIC</span>
                  </div>
                  <span className="text-slate-500 font-semibold">
                    {magVal >= 6 ? 'HIGH CODA' : 'STABLE OSCILLATION'}
                  </span>
                </div>
                <div className="w-full h-9 bg-slate-50/80 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden px-2">
                  <svg viewBox="0 0 150 36" className="w-full h-full text-slate-800">
                    <path
                      d={waveformPath}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Col: Depth Stratum Cross-Section Gauge */}
            <div className="sm:col-span-5 bg-slate-50/90 rounded-2xl p-3 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider uppercase">
                <div className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  <span>DEPTH GAUGE</span>
                </div>
                <span className="font-bold text-slate-900 font-mono text-xs">{event.depth.toFixed(1)} KM</span>
              </div>

              {/* Vertical Stratum Meter Bar */}
              <div className="my-1.5 flex gap-2.5 items-center">
                {/* Stratum Bar */}
                <div className="relative w-3.5 h-24 bg-slate-200/80 rounded-full overflow-hidden shrink-0 border border-slate-300/60">
                  {/* Crust zone (0 - 70km = top 10%) */}
                  <div className="absolute top-0 inset-x-0 h-[10%] bg-emerald-100/90 border-b border-emerald-300/40" />
                  {/* Intermediate zone (70 - 300km = next 33%) */}
                  <div className="absolute top-[10%] inset-x-0 h-[33%] bg-sky-100/90 border-b border-sky-300/40" />
                  {/* Deep mantle zone (300 - 700km = bottom 57%) */}
                  <div className="absolute top-[43%] inset-x-0 bottom-0 bg-indigo-100/90" />

                  {/* Target Depth Indicator Pin */}
                  <div
                    style={{ top: `${depthPct}%` }}
                    className="absolute inset-x-0 h-1 bg-slate-950 -translate-y-1/2 shadow-xs transition-all"
                  />
                </div>

                {/* Stratum Labels & Depth Ticks */}
                <div className="flex flex-col justify-between h-24 font-mono text-[9px] tracking-tight text-slate-500 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800">0 km</span>
                    <span className="text-slate-400">SURFACE</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800">70 km</span>
                    <span className="text-slate-400">CRUST</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800">300 km</span>
                    <span className="text-slate-400">SUBDUCTION</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800">700 km</span>
                    <span className="text-slate-400">MANTLE</span>
                  </div>
                </div>
              </div>

              {/* Crust Stratum Pill Tag */}
              <div className="pt-1.5 border-t border-slate-200/60">
                <span className="text-[8px] font-mono font-bold tracking-wider text-slate-700 uppercase block truncate">
                  {crustLayerLabel}
                </span>
              </div>
            </div>
          </div>

          {/* 2.5 LIVE PROXIMITY & SHAKING ESTIMATE (LIQUID GLASS STYLE) */}
          <div className="my-3 p-3 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs backdrop-blur-md relative overflow-hidden">
            {geoStatus !== 'granted' || !coords || userDistanceKm == null ? (
              <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-sky-700" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-slate-800 block tracking-wider uppercase">
                      CEK JARAK DARI LOKASI SAYA
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 block truncate">
                      Hitung jarak langsung & estimasi getaran ke tempat tinggal Anda
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={requestLocation}
                  disabled={geoStatus === 'requesting'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-semibold tracking-wider transition-all cursor-pointer active:scale-95 shrink-0 shadow-2xs"
                >
                  {geoStatus === 'requesting' ? (
                    <>
                      <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
                      <span>MENGUKUR...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3 h-3 text-sky-300" />
                      <span>UKUR SEKARANG</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-slate-700">
                      JARAK DARI LOKASI ANDA
                    </span>
                  </div>
                  <span className="text-[12px] font-mono font-black tabular-nums text-slate-950 bg-white/95 px-2 py-0.5 rounded-md border border-slate-200/90 shadow-2xs">
                    ~{userDistanceKm.toLocaleString('id-ID')} KM
                  </span>
                </div>

                {mmiInfo && (
                  <div className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex items-start gap-2.5">
                    <div
                      className="w-1.5 self-stretch rounded-full shrink-0"
                      style={{ backgroundColor: mmiInfo.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm text-white"
                          style={{ backgroundColor: mmiInfo.color }}
                        >
                          {mmiInfo.scale}
                        </span>
                        <span className="text-[10.5px] font-mono font-bold text-slate-800">
                          {mmiInfo.label}
                        </span>
                      </div>
                      <p className="text-[9.5px] font-mono text-slate-600 mt-1 leading-snug">
                        {mmiInfo.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {geoError && (
              <p className="text-[9px] font-mono text-rose-600 mt-1.5">{geoError}</p>
            )}
          </div>

          {/* 2.6 BMKG 20-20-20 COASTAL TSUNAMI PROTOCOL */}
          <div className="mb-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTsunamiGuide((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">🛡️</span>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-slate-800 uppercase tracking-wider block">
                    PANDUAN EVAKUASI TSUNAMI (BMKG 20-20-20)
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 block truncate">
                    Aturan keselamatan mandiri jika berada di dekat garis pantai
                  </span>
                </div>
              </div>
              <span className="text-slate-400 font-mono text-[10px] ml-2 shrink-0">
                {showTsunamiGuide ? '▲' : '▼'}
              </span>
            </button>

            {showTsunamiGuide && (
              <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 bg-amber-50/60 text-amber-950 font-mono text-[9.5px] space-y-1.5 leading-snug">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-800 shrink-0">20 DETIK:</span>
                  <span>Jika merasakan gempa berayun kuat atau terus-menerus selama minimal 20 detik.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-800 shrink-0">20 MENIT:</span>
                  <span>Anda memiliki waktu sekitar 20 menit sebelum gelombang pertama tiba ke bibir pantai.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-800 shrink-0">20 METER:</span>
                  <span>Segera lari menjauhi laut menuju dataran tinggi atau bangunan vertikal minimal ketinggian 20 meter.</span>
                </div>
                <p className="text-[8.5px] text-amber-800/80 pt-1 italic border-t border-amber-200/50">
                  *Jangan menunggu sirine atau konfirmasi resmi bila guncangan kuat membuat sulit berdiri di pesisir.
                </p>
              </div>
            )}
          </div>

          {/* 3. TECHNICAL METRICS FOOTER */}
          <div className="py-2.5 space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">TIMESTAMP:</span>
              <span className="text-slate-800 text-[11px] font-medium tracking-wide">
                {formattedDate} · {formattedTime} <span className="text-slate-400">({relTime})</span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase tracking-wider">COORDINATES:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-[11px] tracking-wider">{formattedCoords}</span>
                <button
                  onClick={handleCopy}
                  title="Copy Lat, Lon"
                  className="p-1 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* 4. ACTION CONTROLS DOCK */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            {/* Action Buttons Left Side */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleFocus}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-900 text-[10.5px] font-mono font-semibold tracking-wider transition-all cursor-pointer shadow-2xs border border-slate-200/70"
              >
                <Compass className="w-3.5 h-3.5 text-slate-700" />
                <span>GLOBE</span>
              </button>

              {onOpenSeismogram && (
                <button
                  onClick={() => onOpenSeismogram(event)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10.5px] font-mono font-semibold tracking-wider transition-all cursor-pointer shadow-2xs border border-neutral-200"
                  title="Buka Seismogram Gelombang P & S"
                >
                  <Activity className="w-3.5 h-3.5 text-[#0f2f63]" />
                  <span>WAVEFORM</span>
                </button>
              )}

              {/* WhatsApp One-Click Broadcast */}
              <button
                onClick={() => {
                  const msg = formatSeismicWAMessage(
                    event,
                    userDistanceKm ?? undefined,
                    mmiInfo ?? undefined
                  );
                  openWhatsAppShare(msg);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-[10.5px] font-mono font-bold tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
                title="Bagikan Ringkasan Laporan ke WhatsApp"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>WHATSAPP</span>
              </button>

              {onOpenInfographic && (
                <button
                  onClick={() => onOpenInfographic(event)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-mono font-semibold tracking-wider transition-all cursor-pointer shadow-2xs border border-slate-200/70"
                  title="Generate Kartu Infografis Bencana"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>SHARE</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* USGS Official Link */}
              <a
                href={usgsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-950 text-[11px] font-mono font-medium tracking-wider transition-all border border-slate-200/60"
              >
                <span>REPORT</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Bookmark Toggle */}
              <button
                onClick={() => onToggleBookmark(event)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-mono font-semibold tracking-wider transition-all cursor-pointer ${
                  isBookmarked
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
                    : 'bg-[#0f2f63] hover:bg-[#153e7e] text-white shadow-xs'
                }`}
              >
                {isBookmarked ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>SAVED</span>
                  </>
                ) : (
                  <>
                    <BookmarkIcon className="w-3.5 h-3.5" />
                    <span>SAVE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </LiquidCard>
      </div>
    </div>
  );
};
