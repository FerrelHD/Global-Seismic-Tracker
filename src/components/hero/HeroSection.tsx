import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

interface HeroSectionProps {
  onExploreClick: () => void;
  onDirectClick: () => void;
  exitProgress?: number; // 0 (fully visible) to 1 (fully dissolved)
  totalEvents?: number;
  isReady?: boolean;
  onIntroComplete?: () => void;
}

const TELEMETRY_PHASES = [
  'CALIBRATING NUSANTARA CRUSTAL ARRAY',
  'INGESTING REALTIME USGS & BMKG TELEMETRY',
  'MAPPING SUBDUCTION: SUNDA & BANDA SLABS',
  '2,200 CRUSTAL STATIONS SYNCHRONIZED',
];

const SCRAMBLE_COORDS = [
  'GNSS JKT01 · 6.1754° S, 106.8272° E · LOCKED',
  'SUMATRA MEGATHRUST · 0.7893° S, 99.9213° E · ACTIVE',
  'PALU-KORO FAULT · 0.8917° S, 119.8707° E · SYNCED',
  'BANDA DETACHMENT · 4.5612° S, 129.9142° E · RESOLVED',
  'JAVA TRENCH ARRAY · 8.4521° S, 115.3429° E · ONLINE',
];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onDirectClick,
  exitProgress = 0,
  totalEvents = 2200,
  isReady = false,
  onIntroComplete,
}) => {
  const dissolveOpacity = Math.max(0, 1 - exitProgress * 1.5);
  const dissolveBlur = exitProgress * 10;
  const dissolveTranslateY = exitProgress * 36;

  // Single-Line to Two-Line Kinetic Typographic Morph Refs & State
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  const [introPhase, setIntroPhase] = useState<'measuring' | 'loading' | 'docking' | 'settled'>('measuring');
  const [introOffset1, setIntroOffset1] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [introOffset2, setIntroOffset2] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [introScale, setIntroScale] = useState<number>(1);
  const [hudTopPx, setHudTopPx] = useState<number>(360);
  const [introProgress, setIntroProgress] = useState(0);
  const [coordIndex, setCoordIndex] = useState(0);

  const onIntroCompleteRef = useRef(onIntroComplete);
  useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  }, [onIntroComplete]);

  // Synchronously compute the single-line centered coordinates before paint
  const measureCenterOffset = useCallback(() => {
    if (!row1Ref.current || !row2Ref.current) return;
    const rect1 = row1Ref.current.getBoundingClientRect();
    const rect2 = row2Ref.current.getBoundingClientRect();

    // Spacing between the 2 words when aligned horizontally on 1 single line
    const gap = window.innerWidth >= 640 ? 20 : 10;
    const totalLineWidth = rect1.width + gap + rect2.width;

    // Responsive scaling for narrow viewports
    const availableWidth = window.innerWidth - 32;
    const scale = Math.min(1, availableWidth / Math.max(1, totalLineWidth));
    setIntroScale(scale);

    const targetCenterX = window.innerWidth / 2;
    const targetCenterY = Math.max(30, window.innerHeight / 2 - 40);

    // Left coordinate for the single line
    const lineStartLeft = targetCenterX - (totalLineWidth * scale) / 2;

    const targetLeft1 = lineStartLeft;
    const targetLeft2 = lineStartLeft + (rect1.width + gap) * scale;

    const deltaX1 = targetLeft1 - rect1.left;
    const deltaY1 = targetCenterY - rect1.top;

    const deltaX2 = targetLeft2 - rect2.left;
    const deltaY2 = targetCenterY - rect2.top;

    setIntroOffset1({ x: deltaX1, y: deltaY1 });
    setIntroOffset2({ x: deltaX2, y: deltaY2 });
    setHudTopPx(targetCenterY + Math.max(rect1.height, rect2.height) * scale + 24);
  }, []);

  useLayoutEffect(() => {
    measureCenterOffset();
    setIntroPhase('loading');
  }, [measureCenterOffset]);

  // Handle viewport resize during loading
  useEffect(() => {
    if (introPhase !== 'loading') return;
    const handleResize = () => {
      measureCenterOffset();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [introPhase, measureCenterOffset]);

  // Docking transition from single centered line to two-line top-left
  const triggerDocking = useCallback(() => {
    setIntroPhase('docking');
    if (onIntroCompleteRef.current) {
      onIntroCompleteRef.current();
    }
    setTimeout(() => {
      setIntroPhase('settled');
    }, 1200);
  }, []);

  // Handle skip by clicking anywhere or pressing key
  const handleSkip = useCallback(() => {
    if (introPhase === 'loading') {
      setIntroProgress(100);
      triggerDocking();
    }
  }, [introPhase, triggerDocking]);

  // Progress animation & telemetry ticker
  useEffect(() => {
    if (introPhase !== 'loading') return;

    const startTime = performance.now();
    const duration = 1100;
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t * t * t * (t * (t * 6 - 15) + 10);
      const currentP = Math.min(100, Math.round(eased * 100));
      setIntroProgress(currentP);

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setIntroProgress(100);
        setTimeout(() => {
          triggerDocking();
        }, 120);
      }
    };

    rafId = requestAnimationFrame(tick);

    const coordInterval = setInterval(() => {
      setCoordIndex((prev) => (prev + 1) % SCRAMBLE_COORDS.length);
    }, 140);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Escape', 'Enter', ' '].includes(e.key)) {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      clearInterval(coordInterval);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [introPhase, triggerDocking, handleSkip]);

  // Live time ticker
  const [timeStr, setTimeStr] = useState('');
  const [timeZoneStr, setTimeZoneStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      const offsetMinutes = -now.getTimezoneOffset();
      const offsetHours = offsetMinutes / 60;
      const sign = offsetHours >= 0 ? '+' : '';
      setTimeZoneStr(`GMT${sign}${offsetHours}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isHeroReady = isReady || introPhase === 'docking' || introPhase === 'settled';

  const phaseIndex = Math.min(
    TELEMETRY_PHASES.length - 1,
    Math.floor((introProgress / 100) * TELEMETRY_PHASES.length)
  );
  const activeTelemetryPhase = TELEMETRY_PHASES[phaseIndex];

  return (
    <section
      id="hero-section"
      className="relative z-30 min-h-screen w-full select-none pointer-events-none overflow-hidden"
    >
      {/* Full-Screen Transparent Skip Catcher during Intro */}
      {introPhase === 'loading' && (
        <div
          onClick={handleSkip}
          className="fixed inset-0 z-[130] cursor-pointer pointer-events-auto"
          title="Click anywhere to enter"
        />
      )}

      {/* AWWWARDS EDITORIAL TELEMETRY HUD (Dissolves in center when docking begins) */}
      {introPhase !== 'settled' && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[140] flex flex-col items-center select-none text-center px-4 w-full max-w-sm ${
            introPhase === 'docking' ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
          style={{
            top: `${hudTopPx}px`,
            opacity: introPhase === 'docking' ? 0 : 1,
            transform: introPhase === 'docking' ? 'translate3d(0, 16px, 0)' : 'translate3d(0, 0, 0)',
            transition: 'opacity 350ms cubic-bezier(0.16, 1, 0.3, 1), transform 350ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="flex flex-col items-center w-full px-5 py-3.5 rounded-2xl bg-white/92 backdrop-blur-md border border-slate-200/80 shadow-sm">
            {/* 1. Precision Status Chip */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/95 border border-slate-200/90 text-[10px] sm:text-[11px] font-mono tracking-[0.2em] uppercase text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
              <span className="font-semibold">{activeTelemetryPhase}</span>
            </div>

            {/* 2. Precision 2px Progress Rail + Tabular Counter */}
            <div className="flex items-center gap-3.5 mt-3 w-full max-w-[260px]">
              <div className="flex-1 h-[2px] bg-slate-200 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-slate-900 rounded-full transition-all ease-out"
                  style={{
                    width: `${introProgress}%`,
                    transitionDuration: '60ms',
                  }}
                />
              </div>
              <span className="font-mono text-xs font-bold tracking-widest tabular-nums text-slate-900 w-11 text-right">
                {String(introProgress).padStart(3, '0')}%
              </span>
            </div>

            {/* 3. Live Geodetic Scrambler Coordinates */}
            <p className="mt-2.5 font-mono text-[9px] sm:text-[10px] text-slate-500 tracking-wider uppercase">
              CRUSTAL ARRAY // {SCRAMBLE_COORDS[coordIndex]}
            </p>

            {/* 4. Editorial Tap to Skip Notice */}
            <p className="mt-2 font-mono text-[8.5px] tracking-[0.25em] text-slate-400 uppercase">
              CLICK ANYWHERE TO ENTER
            </p>
          </div>
        </div>
      )}

      {/* Container with Scroll-Driven Kinetic Blur & Dissolve Exit */}
      <div
        style={{
          opacity: dissolveOpacity,
          filter: `blur(${dissolveBlur}px)`,
          transform: `translate3d(0, -${dissolveTranslateY}px, 0)`,
          willChange: 'opacity, filter, transform',
        }}
        className="relative w-full min-h-screen flex flex-col justify-between p-5 sm:p-8 md:p-10 lg:p-14 pointer-events-none"
      >
        {/* TOP ROW: Left Headline + Right Live Time Telemetry */}
        <div className="w-full flex items-start justify-between pt-16 sm:pt-20 lg:pt-24 z-30">
          {/* 1. TOP-LEFT: Oversized Editorial Headline with Kinetic Typographic Morph */}
          <div className="max-w-xs sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-[820px] pointer-events-none">
            {/* Eyebrow badge */}
            <div
              className={`inline-flex items-center gap-2 mb-3 text-[10px] sm:text-xs font-mono font-medium tracking-[0.22em] text-slate-500 uppercase transition-all duration-700 ease-out ${
                isHeroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <span>TECTONIC SURVEILLANCE // GLOBAL PULSE</span>
            </div>

            {/* Giant Title Lines with FLIP Kinematics (1 Horizontal Line Centered -> 2 Lines Stacked Top-Left) */}
            <h1 className="text-[clamp(1.35rem,6.2vw,3.75rem)] font-sans font-black text-slate-950 tracking-tight leading-[0.92] uppercase pointer-events-none">
              {/* Row 1: INDONESIAN CRUSTAL */}
              <div
                ref={row1Ref}
                style={{
                  transform:
                    introPhase === 'loading'
                      ? `translate3d(${introOffset1.x}px, ${introOffset1.y}px, 0) scale(${introScale})`
                      : introPhase === 'docking'
                      ? 'translate3d(0, 0, 0) scale(1)'
                      : undefined,
                  transition:
                    introPhase === 'docking'
                      ? 'transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)'
                      : 'none',
                  transformOrigin: 'left center',
                  willChange: 'transform',
                  opacity: introPhase === 'measuring' ? 0 : 1,
                }}
                className="overflow-hidden pb-[0.08em] block whitespace-nowrap w-fit"
              >
                <span
                  className="block transition-transform duration-900 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: introPhase === 'measuring' ? 'translate3d(0, 115%, 0)' : 'translate3d(0, 0, 0)',
                  }}
                >
                  INDONESIAN CRUSTAL
                </span>
              </div>

              {/* Row 2: OBSERVATORY */}
              <div
                ref={row2Ref}
                style={{
                  transform:
                    introPhase === 'loading'
                      ? `translate3d(${introOffset2.x}px, ${introOffset2.y}px, 0) scale(${introScale})`
                      : introPhase === 'docking'
                      ? 'translate3d(0, 0, 0) scale(1)'
                      : undefined,
                  transition:
                    introPhase === 'docking'
                      ? 'transform 1100ms cubic-bezier(0.16, 1, 0.3, 1)'
                      : 'none',
                  transformOrigin: 'left center',
                  willChange: 'transform',
                  opacity: introPhase === 'measuring' ? 0 : 1,
                }}
                className="overflow-hidden pb-[0.08em] block whitespace-nowrap w-fit"
              >
                <span
                  className="block transition-transform duration-900 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    transform: introPhase === 'measuring' ? 'translate3d(0, 115%, 0)' : 'translate3d(0, 0, 0)',
                    transitionDelay: '80ms',
                  }}
                >
                  OBSERVATORY
                </span>
              </div>
            </h1>

            {/* Editorial Fast Travel Text Links */}
            <div
              className={`flex items-center gap-3.5 mt-5 sm:mt-6 font-mono text-xs sm:text-sm tracking-widest select-none pointer-events-auto transition-all duration-700 delay-500 ease-out ${
                isHeroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
            >
              <button
                onClick={onExploreClick}
                className="group flex items-center gap-1 font-bold text-slate-950 hover:opacity-75 transition-opacity cursor-pointer uppercase underline underline-offset-4 decoration-2"
              >
                <span>STORIES</span>
                <span className="text-xs transition-transform duration-200 group-hover:translate-x-1">→</span>
              </button>
              <span className="text-slate-300 font-normal">/</span>
              <button
                onClick={onDirectClick}
                className="text-slate-500 hover:text-slate-950 hover:underline underline-offset-4 decoration-2 transition-all cursor-pointer font-medium uppercase"
              >
                OBSERVATORY
              </button>
            </div>
          </div>

          {/* 2. TOP-RIGHT: Live Time & Geodetic Stream Readout */}
          <div
            className={`hidden sm:flex flex-col items-end text-right font-mono text-[10px] sm:text-[11px] tracking-wider text-slate-500 z-30 pt-1 transition-all duration-700 delay-350 ease-out ${
              isHeroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">LOCAL TIME:</span>
              <span className="font-bold text-slate-900 tabular-nums">{timeStr || '00:00:00'}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-400 font-medium">TIME ZONE:</span>
              <span className="font-medium text-slate-700">{timeZoneStr}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-white/90 border border-slate-200/90 shadow-2xs text-[9.5px] text-slate-700 font-semibold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>USGS & BMKG TELEMETRY</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Stacked Tagline + Narrative Paragraph */}
        <div className="w-full flex flex-col sm:flex-row items-end justify-between gap-4 z-30 pb-6 sm:pb-8">
          {/* Bottom-Left Stacked Tagline */}
          <div className="overflow-hidden">
            <div
              className={`font-sans font-extrabold uppercase text-xl sm:text-2xl text-slate-950 tracking-tight leading-none transition-transform duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isHeroReady ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
              }`}
              style={{ transitionDelay: '450ms' }}
            >
              <div>MONITOR LIVE,</div>
              <div className="text-slate-500">DECODE THE SLAB.</div>
            </div>
          </div>

          {/* Bottom-Right Editorial Narrative */}
          <div className="max-w-[280px] sm:max-w-xs md:max-w-sm text-left">
            <p
              className={`text-[9px] sm:text-[10px] lg:text-[11px] font-mono leading-relaxed text-slate-600 uppercase tracking-wide transition-all duration-800 ease-out ${
                isHeroReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
              }`}
              style={{ transitionDelay: '550ms' }}
            >
              INDONESIAN SEISMIC OBSERVATORY MONITORS CRUSTAL DISPLACEMENTS ACROSS THE NUSANTARA ARCHIPELAGO,
              WHERE THE INDO-AUSTRALIAN, EURASIAN, AND PACIFIC PLATES CONVERGE IN HIGH-ENERGY PLANETARY COLLISION.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
