import React from 'react';
import { StoryChapter } from '../../utils/storyAnalytics';
import { Language } from '../../utils/i18n';

interface StoryChapterCardProps {
  chapter: StoryChapter;
  stageIndex: number;
  isActive: boolean;
  onNextStage: () => void;
  onReplay: () => void;
  onExit: () => void;
  lang: Language;
}

export const StoryChapterCard: React.FC<StoryChapterCardProps> = ({
  chapter,
  stageIndex,
  isActive,
  onNextStage,
  onReplay,
  onExit,
  lang,
}) => {
  const isId = lang === 'id';
  const isEpilog = chapter.vectorType === 'epilog';

  const coordText = `${Math.abs(chapter.coordinates[0]).toFixed(1)}°${
    chapter.coordinates[0] >= 0 ? 'N' : 'S'
  }, ${Math.abs(chapter.coordinates[1]).toFixed(1)}°${
    chapter.coordinates[1] >= 0 ? 'E' : 'W'
  }`;

  return (
    <section
      data-story-stage={stageIndex}
      className="h-[100dvh] w-full flex flex-col justify-end story-split:justify-center pt-14 sm:pt-20 story-split:pt-24 short:pt-14 pb-[max(4.75rem,env(safe-area-inset-bottom,20px))] story-split:pb-10 short:pb-3 px-4 sm:px-8 lg:px-14 relative pointer-events-none select-none overflow-hidden"
    >
      {/* Side-split directional scrim for desktop & landscape mobile */}
      <div
        className="hidden story-split:block absolute inset-y-0 left-0 w-[62%] lg:w-[54%] bg-gradient-to-r from-white via-white/90 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Portrait mobile & portrait tablet bottom paper scrim leaving upper map unobstructed */}
      <div
        className="story-split:hidden absolute inset-x-0 bottom-0 h-[62dvh] sm:h-[56dvh] bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <article
        className={`relative z-10 pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] w-full sm:max-w-[560px] sm:mx-auto story-split:mx-0 story-split:max-w-[400px] lg:max-w-[470px] max-h-full overflow-y-auto no-scrollbar ${
          isActive
            ? 'opacity-100 translate-y-0'
            : 'opacity-25 translate-y-5'
        }`}
      >
        {/* 1. Bare Typographic Chapter Index & Coordinates */}
        <div className="border-t border-slate-900/20 pt-2 sm:pt-3 short:pt-2 flex items-baseline justify-between gap-3">
          <div className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-widest text-slate-700 uppercase truncate">
            <span className="text-[#0f2f63] font-bold mr-2 tabular-nums">
              {chapter.chapterNumber}
            </span>
            <span>{chapter.badge}</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500 shrink-0 tabular-nums">
            {coordText}
          </span>
        </div>

        {/* 2. Asymmetric Focal Datum (for Tectonic Chapters 01-04) */}
        {!isEpilog ? (
          <div className="mt-2.5 sm:mt-4 story-split:mt-5 short:mt-2 flex items-baseline justify-between gap-4 border-b border-slate-900/12 pb-2 sm:pb-3.5 short:pb-1.5">
            <div className="flex items-baseline gap-1.5 font-sans">
              <span className="text-2xl sm:text-4xl lg:text-5xl short:text-2xl font-black tracking-tight text-[#0f2f63] tabular-nums leading-none">
                {chapter.focalMetric.value}
              </span>
              <span className="font-mono text-[11px] sm:text-sm short:text-xs font-semibold text-slate-600">
                {chapter.focalMetric.unit}
              </span>
            </div>
            <span className="font-mono text-[9.5px] sm:text-[10.5px] text-slate-500 text-right leading-tight max-w-[160px]">
              {chapter.focalMetric.label}
            </span>
          </div>
        ) : (
          <div className="mt-2.5 sm:mt-4 story-split:mt-5 short:mt-2 border-b border-slate-900/12 pb-2 sm:pb-3 short:pb-1.5">
            <span className="font-mono text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#0f2f63] uppercase">
              {chapter.plateTag}
            </span>
          </div>
        )}

        {/* 3. Title & Geological Context */}
        <div className="mt-2.5 sm:mt-3.5 short:mt-2">
          <h3 className="font-sans font-black text-lg sm:text-2xl lg:text-3xl short:text-lg text-slate-950 tracking-[-0.025em] leading-[1.05]">
            {chapter.title}
          </h3>
          <p className="font-mono text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
            {isEpilog ? chapter.subtitle : chapter.plateTag || chapter.subtitle}
          </p>
        </div>

        {/* 4. Narrative Body */}
        <p className="mt-2 sm:mt-3 short:mt-1.5 text-xs sm:text-[14px] short:text-xs font-sans text-slate-700 leading-relaxed short:leading-snug max-w-[52ch] line-clamp-3 sm:line-clamp-none short:line-clamp-2">
          {chapter.description}
        </p>

        {/* 5. Hairline Technical & Live Corridor Specification Table */}
        <dl className="mt-2.5 sm:mt-4 story-split:mt-5 short:mt-2 border-t border-b border-slate-900/12 divide-y divide-slate-900/10 font-mono text-[10px] sm:text-xs">
          {chapter.stats.map((stat) => (
            <div key={stat.label} className="py-1.5 sm:py-2 short:py-1 flex items-center justify-between gap-4">
              <dt className="text-slate-500 uppercase tracking-wide text-[9px] sm:text-[10.5px]">
                {stat.label}
              </dt>
              <dd className="font-semibold text-slate-950 text-right tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}

          {!isEpilog && (
            <div className="py-1.5 sm:py-2 short:py-1 flex items-center justify-between gap-4">
              <dt className="text-slate-500 uppercase tracking-wide text-[9px] sm:text-[10.5px]">
                {isId ? 'Terpantau saat ini' : 'Live in corridor'}
              </dt>
              <dd className="font-semibold text-[#0f2f63] text-right tabular-nums">
                {chapter.liveMetrics.quakeCount} {isId ? 'gempa' : 'quakes'} ·{' '}
                {chapter.liveMetrics.maxMag}
                {chapter.liveMetrics.volcanoCount > 0
                  ? ` · ${chapter.liveMetrics.volcanoCount} ${isId ? 'gunung' : 'volc'}`
                  : ''}
              </dd>
            </div>
          )}
        </dl>

        {/* 6. Editorial Action Controls (44px tap target, crisp radius) */}
        <div className="mt-3 sm:mt-4 story-split:mt-5 short:mt-2.5 flex flex-wrap items-center gap-2.5 sm:gap-3 font-mono">
          {isEpilog ? (
            <>
              <button
                type="button"
                onClick={onExit}
                className="min-h-[44px] short:min-h-[38px] px-4 sm:px-5 py-2 rounded-md bg-[#0f2f63] hover:bg-[#153e7e] text-white text-[11px] sm:text-xs font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] focus-visible:ring-offset-2"
              >
                {isId ? 'Buka peta observatorium' : 'Open observatory map'}
              </button>

              <button
                type="button"
                onClick={onReplay}
                className="min-h-[44px] short:min-h-[38px] px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-medium text-slate-700 hover:text-slate-950 underline underline-offset-4 decoration-slate-400 hover:decoration-slate-950 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] focus-visible:ring-offset-2 rounded-md"
              >
                {isId ? 'Ulangi dari awal' : 'Replay story'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onNextStage}
                className="min-h-[44px] short:min-h-[38px] px-4 sm:px-5 py-2 rounded-md bg-slate-950 hover:bg-slate-800 text-white text-[11px] sm:text-xs font-semibold tracking-wider uppercase transition-all duration-150 cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
              >
                {stageIndex === 4
                  ? isId
                    ? 'Ke epilog'
                    : 'To epilogue'
                  : isId
                  ? 'Bab berikutnya'
                  : 'Next chapter'}
              </button>

              <button
                type="button"
                onClick={onExit}
                className="min-h-[44px] short:min-h-[38px] px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-medium text-slate-600 hover:text-slate-950 underline underline-offset-4 decoration-slate-300 hover:decoration-slate-950 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] focus-visible:ring-offset-2 rounded-md"
              >
                {isId ? 'Keluar ke peta' : 'Exit to map'}
              </button>
            </>
          )}
        </div>
      </article>
    </section>
  );
};
