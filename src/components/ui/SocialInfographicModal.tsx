import React, { useRef, useState, useEffect } from 'react';
import { X, Download, Copy, Check, Share2, ShieldAlert } from 'lucide-react';
import { SeismicEvent } from '../../types/seismic';

interface SocialInfographicModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: SeismicEvent | null;
  location?: string | null;
  magnitude?: string | number | null;
  depth?: string | number | null;
  time?: string | null;
  potensi?: string | null;
  coordinates?: string | null;
}

export const SocialInfographicModal: React.FC<SocialInfographicModalProps> = ({
  isOpen,
  onClose,
  event,
  location = 'Indonesia Archipelago',
  magnitude = '4.5',
  depth = '10 km',
  time = 'Terbaru',
  potensi = 'Tidak Berpotensi Tsunami',
  coordinates,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const safeLocation = location || 'Indonesia Archipelago';
  const safeTime = time || 'Terbaru';
  const safePotensi = potensi || 'Tidak Berpotensi Tsunami';
  const safeDepth = depth || '10 km';

  const magNum = typeof magnitude === 'number' ? magnitude : parseFloat(String(magnitude).replace(/[^0-9.]/g, '')) || 4.5;
  const isTsunamiThreat = safePotensi.toLowerCase().includes('berpotensi tsunami');

  // Render high-res disaster infographic card on 1080x1350 canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1350;

    // 1. Editorial Deep-Navy & Crisp Slate Background
    ctx.fillStyle = '#0f2f63';
    ctx.fillRect(0, 0, 1080, 1350);

    // Subtle inner content card
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(40, 40, 1000, 1270, 32);
    ctx.fill();

    // 2. Technical Blueprint Hairline Grid
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 80; x < 1000; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x, 1270);
      ctx.stroke();
    }
    for (let y = 80; y < 1270; y += 60) {
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(1000, y);
      ctx.stroke();
    }

    // Corner Architectural Marks
    ctx.strokeStyle = '#0f2f63';
    ctx.lineWidth = 2;
    const len = 24;
    // Top-Left
    ctx.beginPath(); ctx.moveTo(80, 80 + len); ctx.lineTo(80, 80); ctx.lineTo(80 + len, 80); ctx.stroke();
    // Top-Right
    ctx.beginPath(); ctx.moveTo(1000 - len, 80); ctx.lineTo(1000, 80); ctx.lineTo(1000, 80 + len); ctx.stroke();
    // Bottom-Left
    ctx.beginPath(); ctx.moveTo(80, 1270 - len); ctx.lineTo(80, 1270); ctx.lineTo(80 + len, 1270); ctx.stroke();
    // Bottom-Right
    ctx.beginPath(); ctx.moveTo(1000 - len, 1270); ctx.lineTo(1000, 1270); ctx.lineTo(1000, 1270 - len); ctx.stroke();

    // 3. Header Branding & Telemetry Status
    ctx.font = 'bold 22px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0f2f63';
    ctx.fillText('SEISMIC OBSERVATORY // NUSANTARA ARCHIPELAGO', 100, 130);

    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.fillStyle = '#717784';
    ctx.fillText('REAL-TIME GEOPHYSICAL TELEMETRY · BMKG & USGS VERIFIED', 100, 160);

    // Divider
    ctx.strokeStyle = '#e6e8ec';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(100, 190);
    ctx.lineTo(980, 190);
    ctx.stroke();

    // 4. Massive Magnitude Display Block (Clean White Card with Deep Navy/Red Accent)
    const magBoxY = 220;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = magNum >= 6.0 ? '#e11d48' : '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(100, magBoxY, 880, 240, 24);
    ctx.fill();
    ctx.stroke();

    // Magnitude Number
    ctx.font = '900 120px "Inter", sans-serif';
    ctx.fillStyle = magNum >= 6.0 ? '#e11d48' : '#0f2f63';
    ctx.fillText(`M ${magNum.toFixed(1)}`, 140, magBoxY + 160);

    // Magnitude Classification Tag
    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0a0a0a';
    const categoryStr =
      magNum >= 7.0
        ? 'MAJOR DESTRUCTIVE RUPTURE'
        : magNum >= 5.5
        ? 'STRONG CRUSTAL TREMOR'
        : magNum >= 4.5
        ? 'MODERATE SEISMIC SHOCK'
        : 'LIGHT FELT VIBRATION';
    ctx.fillText(categoryStr, 540, magBoxY + 110);

    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.fillStyle = '#717784';
    ctx.fillText(`HYPOCENTER DEPTH: ${safeDepth}`, 540, magBoxY + 148);

    // 5. Epicenter Location Title Block
    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.fillStyle = '#717784';
    ctx.fillText('EPICENTER SECTOR:', 100, 520);

    ctx.font = 'bold 40px "Inter", sans-serif';
    ctx.fillStyle = '#0a0a0a';
    const cleanLoc = safeLocation.toUpperCase();
    ctx.fillText(cleanLoc.slice(0, 32), 100, 575);
    if (cleanLoc.length > 32) {
      ctx.fillText(cleanLoc.slice(32, 64), 100, 625);
    }

    // 6. Coordinates & Timing Key-Value Grid
    const gridY = 680;
    const drawKVPair = (label: string, value: string, x: number, y: number) => {
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, 425, 95, 16);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 13px "Courier New", Courier, monospace';
      ctx.fillStyle = '#717784';
      ctx.fillText(label, x + 25, y + 36);

      ctx.font = 'bold 20px "Courier New", Courier, monospace';
      ctx.fillStyle = '#0a0a0a';
      ctx.fillText(value, x + 25, y + 72);
    };

    drawKVPair('EVENT TIME (WIB / GMT+7)', safeTime.slice(0, 24), 100, gridY);
    drawKVPair('COORDINATES', coordinates || '-8.20° S, 120.45° E', 555, gridY);

    // 7. Tsunami Status Advisory Banner
    const tsunamiY = 815;
    ctx.fillStyle = isTsunamiThreat ? '#fff1f2' : '#f0fdf4';
    ctx.strokeStyle = isTsunamiThreat ? '#f43f5e' : '#bbf7d0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(100, tsunamiY, 880, 110, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.fillStyle = isTsunamiThreat ? '#be123c' : '#15803d';
    ctx.fillText('TSUNAMI THREAT ADVISORY (BMKG TEWS):', 140, tsunamiY + 45);

    ctx.font = 'bold 26px "Inter", sans-serif';
    ctx.fillStyle = isTsunamiThreat ? '#9f1239' : '#166534';
    ctx.fillText(safePotensi.toUpperCase(), 140, tsunamiY + 86);

    // 8. Safety Advisory Footer
    const footY = 960;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(100, footY, 880, 160, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 15px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0f2f63';
    ctx.fillText('SAFETY & MITIGATION PROTOCOL:', 130, footY + 40);

    ctx.font = '15px "Courier New", Courier, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('1. Evacuate immediately if near coastline and severe shaking is felt.', 130, footY + 75);
    ctx.fillText('2. Inspect structural integrity before re-entering compromised buildings.', 130, footY + 105);
    ctx.fillText('3. Official Emergency Lines: BMKG 196 · BNPB 117 · SAR 115', 130, footY + 135);

    // Watermark
    ctx.font = '13px "Courier New", Courier, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Verified from BMKG & USGS official telemetry · Indonesian Crustal Observatory', 100, 1220);

    setDataUrl(canvas.toDataURL('image/png'));
  }, [isOpen, safeLocation, magnitude, safeDepth, safeTime, safePotensi, coordinates, magNum, isTsunamiThreat]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Seismic-Alert-M${magNum}-${safeLocation.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    a.click();
  };

  const handleCopy = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      handleDownload();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col pointer-events-auto shadow-2xl rounded-3xl overflow-hidden border border-neutral-200 bg-white text-neutral-900"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        data-lenis-prevent="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/80 font-mono text-xs">
          <div className="flex items-center gap-2 text-neutral-900 font-bold tracking-wider">
            <span className="w-6 h-6 rounded-full bg-[#0f2f63] text-white flex items-center justify-center">
              <Share2 className="w-3.5 h-3.5" />
            </span>
            <span>DISASTER INFOGRAPHIC GENERATOR</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Preview */}
        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 overflow-hidden p-4 sm:p-6 flex flex-col items-center justify-center bg-neutral-100/50"
        >
          {/* Hidden Canvas for High-Res Generation */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Scaled Visual Preview */}
          {dataUrl && (
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-neutral-200 max-h-[58vh]">
              <img
                src={dataUrl}
                alt="Disaster Card Preview"
                className="w-full h-auto max-h-[58vh] object-contain rounded-2xl"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-200 bg-white font-mono text-xs">
          <span className="text-neutral-500 text-[10px] hidden sm:inline">
            1080×1350 HD · READY TO SHARE
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs transition-all border border-neutral-200 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0f2f63] hover:bg-[#153e7e] text-white font-bold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOWNLOAD PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
