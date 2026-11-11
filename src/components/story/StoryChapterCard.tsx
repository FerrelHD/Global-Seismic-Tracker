import React from 'react';
import { StoryChapter } from '../../utils/storyAnalytics';
import { LiquidCard } from '../ui/liquid-glass';
import { MapPin, ArrowDown, ArrowUp, ArrowRight, Activity, X } from 'lucide-react';
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

const ACCENT_DOT_MAP: Record<StoryChapter['vectorType'], string> = {
  sunda: 'bg-rose-500',
  palu: 'bg-amber-500',
  banda: 'bg-[#0f2f63]',
  papua: 'bg-blue-600',
  epilog: 'bg-emerald-500',
};

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
  const accentDot = ACCENT_DOT_MAP[chapter.vectorType] || 'bg-rose-500';

  return (
    <section
      data-story-stage={stageIndex}
      className="h-[100dvh] w-full flex flex-col justify-end sm:justify-center pt-16 sm:pt-20 pb-[max(4.5rem,env(safe-area-inset-bottom,18px))] sm:pb-10 px-3 sm:px-8 lg:px-14 relative pointer-events-none select-none"
    >
      {/* Mobile-only top-to-bottom subtle scrim over lower half so map stays clear in upper 42% */}
      <div
        className="fixed inset-x-0 bottom-0 h-[56dvh] bg-gradient-to-t from-white/95 via-white/75 to-transparent pointer-events-none sm:hidden -z-10"
        aria-hidden="true"
      />

      <div
        className={`pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] w-full sm:max-w-[465px] lg:max-w-[500px] ${
          isActive
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-45 translate-y-4 scale-[0.97]'
        }`}
      >
        <LiquidCard
          interactive={false}
          className="rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl border border-white/90 bg-white/92 backdrop-blur-2xl relative overflow-hidden"
        >
          {/* Subtle Technical Corner Crosshairs */}
          <span className="hidden sm:inline absolute top-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
            ┌
          </span>
          <span className="hidden sm:inline absolute top-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
            ┐
          </span>
          <span className="hidden sm:inline absolute bottom-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
            └
          </span>
          <span className="hidden sm:inline absolute bottom-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
            ┘
          </span>

          {/* Ghost Watermark Chapter Number */}
          <div className="absolute top-2.5 right-4 sm:right-6 text-5xl sm:text-7xl font-mono font-black text-slate-900/[0.06] select-none pointer-events-none tracking-tighter">
            {chapter.chapterNumber}
          </div>

          {/* 1. Chapter Header Row */}
          <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-slate-100 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${accentDot} ${
                  isActive ? 'animate-pulse' : ''
                }`}
              />
              <span className="text-[9.5px] sm:text-[10px] font-mono tracking-widest text-slate-600 uppercase font-bold truncate">
                {chapter.badge.replace('//', '·')}
              </span>
            </div>

            <span className="text-[9.5px] sm:text-[10px] font-mono font-medium text-slate-400 shrink-0 tabular-nums">
              {Math.abs(chapter.coordinates[0]).toFixed(1)}°
              {chapter.coordinates[0] >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(chapter.coordinates[1]).toFixed(1)}°
              {chapter.coordinates[1] >= 0 ? 'E' : 'W'}
            </span>
          </div>

          {/* 2. Plate Boundary Chip */}
          {chapter.plateTag && (
            <div className="mt-2.5 sm:mt-3 relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-slate-700 text-[8.5px] sm:text-[9px] font-mono font-bold tracking-wider uppercase max-w-full">
                <Activity className="w-2.5 h-2.5 text-[#0f2f63] shrink-0" />
                <span className="truncate">{chapter.plateTag}</span>
              </div>
            </div>
          )}

          {/* 3. Editorial Title & Subtitle */}
          <div className="mt-2 sm:mt-2.5 relative z-10">
            <h3 className="font-sans font-black text-lg sm:text-2xl text-slate-950 tracking-tight uppercase leading-tight">
              {chapter.title}
            </h3>
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-mono text-slate-500 mt-0.5">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{chapter.subtitle}</span>
            </div>
          </div>

          {/* 4. Geological Narrative */}
          <p className="mt-2 sm:mt-3 text-[11.5px] sm:text-[13px] font-sans text-slate-600 leading-relaxed line-clamp-4 sm:line-clamp-none relative z-10">
            {chapter.description}
          </p>

          {/* 5. 3-Column Technical Telemetry Grid */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3 sm:mt-4 relative z-10">
            {chapter.stats.map((stat) => (
              <div
                key={stat.label}
                className="px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl bg-slate-50/95 border border-slate-200/70 min-w-0"
              >
                <div className="text-[7.5px] sm:text-[8.5px] font-mono text-slate-400 uppercase tracking-wider truncate">
                  {stat.label}
                </div>
                <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-900 mt-0.5 truncate tabular-nums">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* 6. Live Regional Corridor Telemetry Bar */}
          <div className="mt-2.5 sm:mt-3 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200/70 flex items-center justify-between gap-2 font-mono text-[9px] sm:text-[10px] text-slate-700 relative z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-slate-500 uppercase truncate">
                {isId ? 'RADAR KORIDOR:' : 'CORRIDOR LIVE:'}
              </span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900 shrink-0 tabular-nums">
              <span>
                {chapter.liveMetrics.quakeCount} {isId ? 'GEMPA' : 'QUAKES'}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-rose-700">{chapter.liveMetrics.maxMag}</span>
              <span className="hidden sm:inline text-slate-300">·</span>
              <span className="hidden sm:inline text-orange-700">
                {chapter.liveMetrics.volcanoCount} {isId ? 'GUNUNG' : 'VOLC'}
              </span>
            </div>
          </div>

          {/* 7. Bottom Controls */}
          <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-2 relative z-10 font-mono">
            {isEpilog ? (
              <>
                <button
                  type="button"
                  onClick={onReplay}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase border border-slate-200/80 transition-all cursor-pointer active:scale-95"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>{isId ? 'ULANGI' : 'REPLAY'}</span>
                </button>

                <button
                  type="button"
                  onClick={onExit}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0f2f63] hover:bg-[#153e7e] text-white text-[10.5px] sm:text-xs font-bold tracking-wider uppercase shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <span>
                    {isId ? 'BUKA PETA OBSERVATORIUM LIVE' : 'ENTER LIVE OBSERVATORY MAP'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase border border-slate-200/80 transition-all cursor-pointer active:scale-95"
                >
                  <X className="w-3 h-3" />
                  <span>{isId ? 'PETA LIVE' : 'LIVE MAP'}</span>
                </button>

                <button
                  type="button"
                  onClick={onNextStage}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-[10.5px] sm:text-[11px] font-bold tracking-wider uppercase shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <span>
                    {stageIndex === 4
                      ? isId
                        ? 'KE EPILOG'
                        : 'TO EPILOGUE'
                      : isId
                      ? 'BAB BERIKUTNYA'
                      : 'NEXT CHAPTER'}
                  </span>
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </LiquidCard>
      </div>
    </section>
  );
};
