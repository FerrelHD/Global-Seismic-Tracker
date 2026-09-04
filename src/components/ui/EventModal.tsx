import React, { useState, useMemo } from 'react';
import { SeismicEvent } from '../../types/seismic';
import { LiquidCard } from './liquid-glass';
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

  const magVal = event?.magnitude ?? 0;
  const energyStr = useMemo(() => calculateEnergyEquivalent(magVal), [magVal]);
  const waveformPath = useMemo(() => generateSeismicWaveform(magVal, 150, 42), [magVal]);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/25 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg max-h-[92vh] overflow-y-auto my-auto">
        <LiquidCard className="w-full rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl border border-white/80 select-none backdrop-blur-2xl relative overflow-hidden">
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
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
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
          <div className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-5 border-b border-slate-100">
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
                <div className="mt-3.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider mb-1.5 uppercase">
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
              <div className="mt-4 pt-3 border-t border-slate-100/80">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider mb-1 uppercase">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-slate-400" />
                    <span>SEISMOGRAPH HARMONIC</span>
                  </div>
                  <span className="text-slate-500 font-semibold">
                    {magVal >= 6 ? 'HIGH CODA' : 'STABLE OSCILLATION'}
                  </span>
                </div>
                <div className="w-full h-11 bg-slate-50/80 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden px-2">
                  <svg viewBox="0 0 150 42" className="w-full h-full text-slate-800">
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
            <div className="sm:col-span-5 bg-slate-50/90 rounded-2xl p-3.5 border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 tracking-wider uppercase">
                <div className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  <span>DEPTH GAUGE</span>
                </div>
                <span className="font-bold text-slate-900 font-mono text-xs">{event.depth.toFixed(1)} KM</span>
              </div>

              {/* Vertical Stratum Meter Bar */}
              <div className="my-2.5 flex gap-3 items-center">
                {/* Stratum Bar */}
                <div className="relative w-4 h-28 bg-slate-200/80 rounded-full overflow-hidden shrink-0 border border-slate-300/60">
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
                <div className="flex flex-col justify-between h-28 font-mono text-[9px] tracking-tight text-slate-500 leading-tight">
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
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[8px] font-mono font-bold tracking-wider text-slate-700 uppercase block truncate">
                  {crustLayerLabel}
                </span>
              </div>
            </div>
          </div>

          {/* 3. TECHNICAL METRICS FOOTER */}
          <div className="py-3.5 space-y-2 font-mono text-xs">
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
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2.5">
            {/* Action Buttons Left Side */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleFocus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-900 text-[11px] font-mono font-semibold tracking-wider transition-all cursor-pointer shadow-2xs border border-slate-200/70"
              >
                <Compass className="w-3.5 h-3.5 text-slate-700" />
                <span>GLOBE</span>
              </button>

              {onOpenSeismogram && (
                <button
                  onClick={() => onOpenSeismogram(event)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-[11px] font-mono font-semibold tracking-wider transition-all cursor-pointer shadow-2xs border border-cyan-200/80"
                  title="Buka Seismogram Gelombang P & S"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
                  <span>WAVEFORM</span>
                </button>
              )}

              {onOpenInfographic && (
                <button
                  onClick={() => onOpenInfographic(event)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-mono font-semibold tracking-wider transition-all cursor-pointer shadow-2xs border border-slate-200/70"
                  title="Generate Kartu Infografis Bencana"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>SHARE CARD</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* USGS Official Link */}
              <a
                href={usgsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-950 text-xs font-mono font-medium tracking-wider transition-all border border-slate-200/60"
              >
                <span>REPORT</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* Bookmark Toggle */}
              <button
                onClick={() => onToggleBookmark(event)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-mono font-semibold tracking-wider transition-all cursor-pointer ${
                  isBookmarked
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
                    : 'bg-slate-950 hover:bg-black text-white shadow-xs'
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
