import React from 'react';

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
  const isInteractive = exitProgress < 0.6;

  return (
    <section
      id="hero-section"
      className="relative min-h-screen w-full select-none pointer-events-none overflow-hidden"
    >
      {/* Container with Scroll-Driven Kinetic Blur & Dissolve Exit */}
      <div
        style={{
          opacity: dissolveOpacity,
          filter: `blur(${dissolveBlur}px)`,
          transform: `translate3d(0, -${dissolveTranslateY}px, 0)`,
          willChange: 'opacity, filter, transform',
        }}
        className="relative w-full min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 pointer-events-none"
      >
        {/* 1. TOP-LEFT ANCHOR: Large Editorial Headline Overlapping the Globe's Top-Left Rim */}
        <div className="max-w-md sm:max-w-xl lg:max-w-2xl z-20 pt-16 sm:pt-20 pointer-events-none">
          {/* Mask-Reveal Editorial Headline with font-black tracking */}
          <div className="overflow-hidden">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-sans font-black text-slate-950 tracking-tight leading-[0.98] animate-mask-reveal-1 uppercase">
              GLOBAL SEISMIC
            </h1>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-sans font-black text-slate-950 tracking-tight leading-[0.98] animate-mask-reveal-2 uppercase">
              OBSERVATORY
            </h1>
          </div>
          <div className="overflow-hidden">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-sans font-black text-slate-400 tracking-tight leading-[0.98] animate-mask-reveal-3 uppercase">
              AROUND THE GLOBE
            </h1>
          </div>

          {/* Typographic Text Links (No Art 'ALL / UPCOMING' Style) */}
          <div className="flex items-center gap-3 mt-6 sm:mt-8 font-mono text-xs sm:text-sm tracking-widest select-none pointer-events-auto">
            <button
              onClick={onExploreClick}
              className="underline underline-offset-4 decoration-1 font-semibold text-slate-950 hover:opacity-75 transition-opacity cursor-pointer"
            >
              STORIES
            </button>
            <span className="text-slate-400 font-normal">/</span>
            <button
              onClick={onDirectClick}
              className="text-slate-500 hover:text-slate-950 hover:underline underline-offset-4 decoration-1 transition-all cursor-pointer font-medium"
            >
              OBSERVATORY
            </button>
          </div>
        </div>

        {/* 2. BOTTOM ROW: Bottom-Right Editorial Paragraph (Bottom-Left is dedicated to LAT/LON telemetry) */}
        <div className="w-full flex justify-end z-20 pt-8">
          {/* Bottom-Right Editorial Narrative (Authentic No Art Style) */}
          <div className="max-w-sm sm:max-w-md text-right">
            <p className="text-[10px] sm:text-[11px] font-mono leading-relaxed text-slate-600 uppercase tracking-wide">
              GLOBAL SEISMIC OBSERVATORY MONITORS TECTONIC PLATES FROM FAULT TO FAULT,
              BRINGING REAL-TIME CRUSTAL TELEMETRY TO RESEARCHERS ACROSS THE WORLD.
              EACH DISPLACEMENT ADDS ITS OWN ENERGY, SHAPED BY PLANETARY GEODETICS.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
