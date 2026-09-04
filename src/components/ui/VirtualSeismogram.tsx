import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Activity, X, Minimize2, Maximize2, Radio, RefreshCw } from 'lucide-react';
import { SeismicEvent } from '../../types/seismic';

interface VirtualSeismogramProps {
  isOpen: boolean;
  onClose: () => void;
  activeEvent?: SeismicEvent | null;
  className?: string;
}

// Known prominent BMKG broadband seismic stations across Indonesian archipelago
const SEISMIC_STATIONS = [
  { code: 'LEM', name: 'Lembang, West Java', lat: -6.82, lon: 107.62 },
  { code: 'DNP', name: 'Denpasar, Bali', lat: -8.67, lon: 115.21 },
  { code: 'RTG', name: 'Ruteng, Flores NTT', lat: -8.61, lon: 120.46 },
  { code: 'BND', name: 'Banda Neira, Maluku', lat: -4.52, lon: 129.90 },
  { code: 'PCI', name: 'Pacitan, East Java', lat: -8.20, lon: 111.09 },
  { code: 'PSI', name: 'Pasir Mayang, Jambi', lat: -1.45, lon: 102.18 },
  { code: 'GTO', name: 'Gorontalo, Sulawesi', lat: 0.54, lon: 123.06 },
  { code: 'JAY', name: 'Jayapura, Papua', lat: -2.53, lon: 140.71 },
  { code: 'AAI', name: 'Ambon, Maluku', lat: -3.70, lon: 128.18 },
  { code: 'TRT', name: 'Ternate, North Maluku', lat: 0.78, lon: 127.38 },
];

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const VirtualSeismogram: React.FC<VirtualSeismogramProps> = ({
  isOpen,
  onClose,
  activeEvent,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [channel, setChannel] = useState<'BHZ' | 'BHN' | 'BHE'>('BHZ');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSimulatingRupture, setIsSimulatingRupture] = useState(true);

  // Identify nearest BMKG seismic station
  const station = useMemo(() => {
    if (!activeEvent) return SEISMIC_STATIONS[0];
    let nearest = SEISMIC_STATIONS[0];
    let minD = Infinity;
    for (const s of SEISMIC_STATIONS) {
      const d = calculateDistanceKm(activeEvent.latitude, activeEvent.longitude, s.lat, s.lon);
      if (d < minD) {
        minD = d;
        nearest = s;
      }
    }
    return nearest;
  }, [activeEvent]);

  const distanceKm = useMemo(() => {
    if (!activeEvent) return 142;
    return Math.max(
      12,
      Math.round(
        calculateDistanceKm(activeEvent.latitude, activeEvent.longitude, station.lat, station.lon)
      )
    );
  }, [activeEvent, station]);

  // Seismological theoretical arrival times (Vp ~ 6.0 km/s, Vs ~ 3.5 km/s)
  const pArrivalSeconds = useMemo(() => (distanceKm / 6.0).toFixed(1), [distanceKm]);
  const sArrivalSeconds = useMemo(() => (distanceKm / 3.5).toFixed(1), [distanceKm]);
  const spInterval = useMemo(
    () => (parseFloat(sArrivalSeconds) - parseFloat(pArrivalSeconds)).toFixed(1),
    [sArrivalSeconds, pArrivalSeconds]
  );

  // Calculate approximate Peak Ground Acceleration (PGA) in gal (cm/s^2)
  const pgaGal = useMemo(() => {
    const mag = activeEvent?.magnitude ?? 4.5;
    // Standard attenuation estimation formula
    const pga = Math.pow(10, 0.5 * mag - 0.9 * Math.log10(distanceKm) - 0.0025 * distanceKm);
    return Math.max(0.2, pga * 9.81).toFixed(1);
  }, [activeEvent, distanceKm]);

  // Reset rupture simulation whenever activeEvent changes
  useEffect(() => {
    setIsSimulatingRupture(true);
  }, [activeEvent]);

  // Real-Time Waveform Generator (Architectural Stylus Paper Oscilloscope)
  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    const bufferLength = 400;
    const waveformHistory: number[] = new Array(bufferLength).fill(0);

    const mag = activeEvent?.magnitude ?? 4.0;
    const magFactor = Math.min(1, Math.max(0.2, (mag - 2.5) / 5.5));

    const render = () => {
      time += 0.05;

      // Realistic wave physics composition:
      // 1. Ambient microseism baseline noise
      let currentSample = (Math.random() - 0.5) * 2.5;

      if (isSimulatingRupture) {
        // Simulated P-wave arrival (high frequency packet)
        const pWave = Math.sin(time * 18) * Math.cos(time * 4) * (magFactor * 14);
        // Simulated S-wave arrival (larger amplitude shear tremor)
        const sWave = Math.sin(time * 7) * Math.sin(time * 2.2) * (magFactor * 38);
        // Deep coda reverberation
        const coda = Math.sin(time * 1.8) * (magFactor * 7);

        // Modulate with envelope
        const envelope = Math.max(0, Math.sin(time * 0.45));
        currentSample += (pWave * 0.4 + sWave + coda) * envelope;
      }

      waveformHistory.shift();
      waveformHistory.push(currentSample);

      // Render Oscilloscope on Swiss technical paper surface
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Technical Paper Graticule Grid (Light gray)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 0.75;
      const step = 20;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Zero-level baseline rule
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // 2. Technical Ink Stylus Waveform (Deep Navy, crisp, ZERO neon glow)
      ctx.strokeStyle = '#0f2f63';
      ctx.lineWidth = 1.35;
      ctx.shadowBlur = 0;

      ctx.beginPath();
      const midY = canvas.height / 2;
      const dx = canvas.width / bufferLength;

      for (let i = 0; i < bufferLength; i++) {
        const x = i * dx;
        const y = midY + waveformHistory[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 3. Live Leading Stylus Pen Needle Point
      const lastY = midY + waveformHistory[bufferLength - 1];
      ctx.fillStyle = '#0f2f63';
      ctx.beginPath();
      ctx.arc(canvas.width - 2, lastY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [isOpen, isMinimized, isSimulatingRupture, activeEvent, channel]);

  if (!isOpen) return null;

  return (
    <div
      data-lenis-prevent="true"
      onWheel={(e) => e.stopPropagation()}
      className={`fixed bottom-18 sm:bottom-20 right-3 sm:right-6 z-40 select-none pointer-events-auto transition-all duration-300 ${className}`}
    >
      <div className="w-[min(92vw,360px)] rounded-2xl overflow-hidden shadow-xl border border-neutral-200/90 bg-white/95 backdrop-blur-xl text-neutral-900 font-mono">
        {/* Header: Editorial Swiss Navbar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-50/90 border-b border-neutral-200/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0f2f63] text-white">
              <Activity className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-1.5 font-bold text-xs tracking-wider text-neutral-900 font-sans">
              <span>VIRTUAL SEISMOGRAM</span>
              <span className="px-1.5 py-0.5 rounded-full bg-neutral-200/80 text-[9px] text-neutral-700 font-mono font-medium">
                {channel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized((prev) => !prev)}
              className="p-1 rounded-md hover:bg-neutral-200/60 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              title={isMinimized ? 'Perbesar' : 'Kecilkan'}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-neutral-200/60 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
              title="Tutup Monitor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <div className="p-3 space-y-2.5 bg-white">
            {/* Station Telemetry Strip */}
            <div className="flex items-center justify-between text-[10px] text-neutral-500 border-b border-neutral-100 pb-2">
              <div>
                <span className="text-neutral-400 block text-[9px] tracking-wider font-mono">STATION ID</span>
                <span className="font-bold text-neutral-900 tracking-wide font-mono">
                  {station.code} · {station.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 block text-[9px] tracking-wider font-mono">EPICENTER DISTANCE</span>
                <span className="font-bold text-[#0f2f63] tabular-nums font-mono">~{distanceKm} km</span>
              </div>
            </div>

            {/* Oscilloscope Canvas Viewport */}
            <div className="relative w-full h-[110px] rounded-xl overflow-hidden bg-neutral-50 border border-neutral-200/90 shadow-inner">
              <canvas
                ref={canvasRef}
                width={330}
                height={110}
                className="w-full h-full block"
              />

              {/* Real-Time Telemetry Watermark */}
              <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1.5 text-[9px] text-neutral-600 font-mono">
                <Radio className="w-2.5 h-2.5 text-neutral-600" />
                <span>REC 100Hz · {channel}</span>
              </div>

              <div className="absolute top-2 right-2 pointer-events-none text-right font-mono text-[9px] text-neutral-600 tabular-nums">
                <span>PGA: {pgaGal} gal</span>
              </div>

              {/* Interactive Channel Picker Overlay */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1">
                {(['BHZ', 'BHN', 'BHE'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono transition-all cursor-pointer ${
                      channel === ch
                        ? 'bg-[#0f2f63] text-white shadow-xs'
                        : 'bg-white/80 hover:bg-white text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Re-trigger Waveform Rupture Button */}
              <button
                onClick={() => setIsSimulatingRupture((prev) => !prev)}
                title={isSimulatingRupture ? 'Jeda Simulasi' : 'Jalankan Simulasi'}
                className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 text-[9px] font-mono border border-neutral-200 shadow-2xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5 text-neutral-600" />
                <span>{isSimulatingRupture ? 'BURST' : 'BASELINE'}</span>
              </button>
            </div>

            {/* Wave Phase Timing Markers */}
            <div className="grid grid-cols-3 gap-2 text-center text-[9px] pt-0.5">
              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="block text-neutral-400 font-mono text-[8.5px] tracking-wider uppercase">P-ARRIVAL</span>
                <span className="font-bold text-neutral-900 tabular-nums font-mono text-xs mt-0.5 block">+{pArrivalSeconds}s</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="block text-neutral-400 font-mono text-[8.5px] tracking-wider uppercase">S-ARRIVAL</span>
                <span className="font-bold text-neutral-900 tabular-nums font-mono text-xs mt-0.5 block">+{sArrivalSeconds}s</span>
              </div>
              <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="block text-neutral-400 font-mono text-[8.5px] tracking-wider uppercase">S - P DELAY</span>
                <span className="font-bold text-[#0f2f63] tabular-nums font-mono text-xs mt-0.5 block">{spInterval}s</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
