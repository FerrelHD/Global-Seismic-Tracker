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

    // 1. Dark Blueprint Geological Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1350);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.6, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1350);

    // 2. Technical Blueprint Crosshatch Grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
    ctx.lineWidth = 1;
    for (let x = 60; x < 1080; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 60);
      ctx.lineTo(x, 1290);
      ctx.stroke();
    }
    for (let y = 60; y < 1350; y += 60) {
      ctx.beginPath();
      ctx.moveTo(60, y);
      ctx.lineTo(1020, y);
      ctx.stroke();
    }

    // Precision Corner Marks
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    const len = 30;
    // Top-Left
    ctx.beginPath(); ctx.moveTo(60, 60 + len); ctx.lineTo(60, 60); ctx.lineTo(60 + len, 60); ctx.stroke();
    // Top-Right
    ctx.beginPath(); ctx.moveTo(1020 - len, 60); ctx.lineTo(1020, 60); ctx.lineTo(1020, 60 + len); ctx.stroke();
    // Bottom-Left
    ctx.beginPath(); ctx.moveTo(60, 1290 - len); ctx.lineTo(60, 1290); ctx.lineTo(60 + len, 1290); ctx.stroke();
    // Bottom-Right
    ctx.beginPath(); ctx.moveTo(1020 - len, 1290); ctx.lineTo(1020, 1290); ctx.lineTo(1020, 1290 - len); ctx.stroke();

    // 3. Header Branding & Telemetry Status
    ctx.font = 'bold 26px "Courier New", Courier, monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('GLOBAL SEISMIC TRACKER // NUSANTARA OBSERVATORY', 100, 140);

    ctx.font = '18px "Courier New", Courier, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('REAL-TIME GEOPHYSICAL ALERT TELEMETRY · BMKG & USGS SYNC', 100, 175);

    // Divider
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 210);
    ctx.lineTo(980, 210);
    ctx.stroke();

    // 4. Massive Magnitude Display Block
    const magBoxY = 250;
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = isTsunamiThreat ? '#f43f5e' : '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(100, magBoxY, 880, 280, 24);
    ctx.fill();
    ctx.stroke();

    // Ambient glow inside magnitude box
    const glowGrad = ctx.createRadialGradient(280, magBoxY + 140, 10, 280, magBoxY + 140, 320);
    glowGrad.addColorStop(0, magNum >= 5.5 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(100, magBoxY, 880, 280);

    // Magnitude Number
    ctx.font = '900 130px "Inter", sans-serif';
    ctx.fillStyle = magNum >= 5.5 ? '#f43f5e' : '#38bdf8';
    ctx.fillText(`M ${magNum.toFixed(1)}`, 140, magBoxY + 185);

    // Magnitude Classification Tag
    ctx.font = 'bold 22px "Courier New", Courier, monospace';
    ctx.fillStyle = '#94a3b8';
    const categoryStr =
      magNum >= 7.0
        ? 'MAJOR DESTRUCTIVE RUPTURE'
        : magNum >= 5.5
        ? 'STRONG CRUSTAL TREMOR'
        : magNum >= 4.5
        ? 'MODERATE SEISMIC SHOCK'
        : 'LIGHT FELT VIBRATION';
    ctx.fillText(categoryStr, 580, magBoxY + 130);

    ctx.font = '18px "Courier New", Courier, monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`KEDALAMAN: ${safeDepth}`, 580, magBoxY + 175);

    // 5. Epicenter Location Title Block
    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('PUSAT GEMPA BUMI (EPICENTER SECTOR):', 100, 590);

    ctx.font = 'bold 44px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    // Wrap text if location is long
    const cleanLoc = safeLocation.toUpperCase();
    ctx.fillText(cleanLoc.slice(0, 32), 100, 650);
    if (cleanLoc.length > 32) {
      ctx.fillText(cleanLoc.slice(32, 64), 100, 705);
    }

    // 6. Coordinates & Timing Key-Value Grid
    const gridY = 770;
    const drawKVPair = (label: string, value: string, x: number, y: number) => {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, 425, 95, 16);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 15px "Courier New", Courier, monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(label, x + 25, y + 36);

      ctx.font = 'bold 22px "Courier New", Courier, monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(value, x + 25, y + 72);
    };

    drawKVPair('WAKTU KEJADIAN (WIB / GMT+7)', safeTime.slice(0, 24), 100, gridY);
    drawKVPair('KOORDINAT GEOGRAFIS', coordinates || '-8.20° S, 120.45° E', 555, gridY);

    // 7. Tsunami Status Advisory Banner
    const tsunamiY = 895;
    ctx.fillStyle = isTsunamiThreat ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = isTsunamiThreat ? '#ef4444' : '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(100, tsunamiY, 880, 110, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 20px "Courier New", Courier, monospace';
    ctx.fillStyle = isTsunamiThreat ? '#fca5a5' : '#6ee7b7';
    ctx.fillText('STATUS PERINGATAN TSUNAMI (BMKG TEWS):', 140, tsunamiY + 45);

    ctx.font = 'bold 30px "Inter", sans-serif';
    ctx.fillStyle = isTsunamiThreat ? '#ffffff' : '#a7f3d0';
    ctx.fillText(safePotensi.toUpperCase(), 140, tsunamiY + 88);

    // 8. Safety Advisory & Emergency Hotlines Footer
    const footY = 1040;
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(100, footY, 880, 160, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 16px "Courier New", Courier, monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('TINDAKAN KESELAMATAN & MITIGASI:', 130, footY + 40);

    ctx.font = '16px "Courier New", Courier, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('1. Hindari bangunan retak atau struktur yang berpotensi roboh.', 130, footY + 75);
    ctx.fillText('2. Jika di daerah pantai dan terasa gempa kuat, segera evakuasi ke tempat tinggi.', 130, footY + 105);
    ctx.fillText('3. Kontak Darurat: Call Center BMKG 196 · BNPB 117 · SAR 115', 130, footY + 135);

    // Watermark
    ctx.font = '14px "Courier New", Courier, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('Diverifikasi dari data resmi BMKG & USGS · global-seismic-tracker.web.app', 100, 1260);

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col pointer-events-auto shadow-2xl rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-900 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950 font-mono text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider">
            <Share2 className="w-4 h-4" />
            <span>DISASTER INFOGRAPHIC CARD GENERATOR</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
          {/* Hidden Canvas for High-Res Generation */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Scaled Visual Preview */}
          {dataUrl && (
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-700 max-h-[58vh]">
              <img
                src={dataUrl}
                alt="Disaster Card Preview"
                className="w-full h-auto max-h-[58vh] object-contain rounded-2xl"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-slate-950 font-mono text-xs">
          <span className="text-slate-500 text-[10px] hidden sm:inline">
            FORMAT 1080×1350 HD · READY TO SHARE
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-all border border-slate-700 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'TERSALIN KE CLIPBOARD' : 'SALIN GAMBAR'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>UNDUH PNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
