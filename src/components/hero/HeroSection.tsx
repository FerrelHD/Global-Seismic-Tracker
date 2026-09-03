import React, { useState, useEffect } from 'react';

interface HeroSectionProps {
  onExploreClick: () => void;
  onDirectClick: () => void;
  exitProgress?: number; // 0 (fully visible) to 1 (fully dissolved)
  totalEvents?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onDirectClick,
  exitProgress = 0,
  totalEvents = 2200,
}) => {
  const dissolveOpacity = Math.max(0, 1 - exitProgress * 1.5);
  const dissolveBlur = exitProgress * 10;
  const dissolveTranslateY = exitProgress * 36;

  // Live time ticker matching the reference
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
      setTimeZoneStr(`GMT${sign}${offsetHours} (UTC${sign}${offsetHours})`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="hero-section"
      className="relative z-30 min-h-screen w-full select-none pointer-events-none overflow-hidden"
    >
      {/* Container with Scroll-Driven Kinetic Blur & Dissolve Exit */}
      <div
        style={{
          opacity: dissolveOpacity,
          filter: `blur(${dissolveBlur}px)`,
          transform: `translate3d(0, -${dissolveTranslateY}px, 0)`,
          willChange: 'opacity, filter, transform',
        }}
        className="relative w-full min-h-screen flex flex-col justify-between p-5 sm:p-8 md:p-10 lg:p-12 pointer-events-none"
      >
        {/* TOP ROW: Left Headline + Right Live Time Telemetry */}
        <div className="w-full flex items-start justify-between pt-16 sm:pt-20 lg:pt-22 z-30">
          {/* 1. TOP-LEFT: Large Editorial Headline (No Art Typography) */}
          <div className="max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-[580px] 2xl:max-w-[620px] pointer-events-none">
            <div className="overflow-hidden">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] xl:text-[4rem] 2xl:text-[4.35rem] font-sans font-black text-slate-950 tracking-tight leading-[0.92] uppercase">
                INDONESIAN
              </h1>
            </div>
            <div className="overflow-hidden">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] xl:text-[4rem] 2xl:text-[4.35rem] font-sans font-black text-slate-950 tracking-tight leading-[0.92] uppercase">
                CRUSTAL
              </h1>
            </div>
            <div className="overflow-hidden">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] xl:text-[4rem] 2xl:text-[4.35rem] font-sans font-black text-slate-950 tracking-tight leading-[0.92] uppercase">
                OBSERVATORY
              </h1>
            </div>

            {/* Typographic Text Links (ALL / UPCOMING Style) */}
            <div className="flex items-center gap-3.5 mt-4 sm:mt-6 font-mono text-xs sm:text-sm tracking-widest select-none pointer-events-auto">
              <button
                onClick={onExploreClick}
                className="underline underline-offset-4 decoration-2 font-bold text-slate-950 hover:opacity-75 transition-opacity cursor-pointer uppercase"
              >
                STORIES
              </button>
              <span className="text-slate-400 font-normal">/</span>
              <button
                onClick={onDirectClick}
                className="text-slate-500 hover:text-slate-950 hover:underline underline-offset-4 decoration-2 transition-all cursor-pointer font-medium uppercase"
              >
                OBSERVATORY
              </button>
            </div>
          </div>

          {/* 2. TOP-RIGHT: Live Time & Geodetic Stream Readout (Ref: LOCAL TIME / TIME ZONE) */}
          <div className="hidden sm:flex flex-col items-end text-right font-mono text-[10px] sm:text-[11px] tracking-wider text-slate-500 z-30 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">LOCAL TIME:</span>
              <span className="font-bold text-slate-900 tabular-nums">{timeStr || '00:00:00'}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-slate-400 font-medium">TIME ZONE:</span>
              <span className="font-medium text-slate-700">{timeZoneStr}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[9px] text-slate-600 font-semibold tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>BMKG & USGS HYBRID FEED</span>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Bottom-Right Editorial Paragraph (Bottom-Left is dedicated to LAT/LON telemetry) */}
        <div className="w-full flex justify-end z-30 pb-6 sm:pb-8">
          {/* Bottom-Right Editorial Narrative (Left-aligned within its container, authentic No Art style) */}
          <div className="max-w-[280px] sm:max-w-xs md:max-w-sm text-left">
            <p className="text-[9px] sm:text-[10px] lg:text-[11px] font-mono leading-relaxed text-slate-600 uppercase tracking-wide">
              INDONESIAN SEISMIC OBSERVATORY MONITORS CRUSTAL DISPLACEMENTS ACROSS THE NUSANTARA ARCHIPELAGO,
              WHERE THE INDO-AUSTRALIAN, EURASIAN, AND PACIFIC PLATES CONVERGE IN HIGH-ENERGY PLANETARY COLLISION.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

