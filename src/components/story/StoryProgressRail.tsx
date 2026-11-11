import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { StoryChapter } from '../../utils/storyAnalytics';
import { Language } from '../../utils/i18n';

interface StoryProgressRailProps {
  chapters: StoryChapter[];
  activeStage: number; // 0 = Prolog, 1..4 = Chapters, 5 = Epilog
  onSelectStage: (stage: number) => void;
  onExit: () => void;
  lang: Language;
}

export const StoryProgressRail: React.FC<StoryProgressRailProps> = ({
  chapters,
  activeStage,
  onSelectStage,
  onExit,
  lang,
}) => {
  const isId = lang === 'id';
  const totalStages = chapters.length + 1;

  const stageItems = [
    { index: 0, code: '00', label: isId ? 'Prolog' : 'Prologue' },
    ...chapters.map((ch, idx) => ({
      index: idx + 1,
      code: ch.chapterNumber,
      label: ch.title.replace(/^The\s+/i, '').replace(/^Sistem\s+/i, ''),
    })),
  ];

  const handlePrev = () => onSelectStage(Math.max(0, activeStage - 1));
  const handleNext = () => onSelectStage(Math.min(totalStages - 1, activeStage + 1));

  return (
    <>
      {/* Desktop: Bare Vertical Architectural Survey Ruler (Zero Card Container) */}
      <aside
        aria-label={isId ? 'Indeks bab cerita tektonik' : 'Tectonic story chapter index'}
        className="fixed right-5 lg:right-8 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-5 select-none pointer-events-auto"
      >
        <div className="flex flex-col items-end gap-0.5">
          {stageItems.map((item) => {
            const isActive = item.index === activeStage;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => onSelectStage(item.index)}
                aria-current={isActive ? 'step' : undefined}
                className="group flex items-center gap-3 py-1.5 pl-2 pr-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] rounded-sm"
                title={`${item.code} ${item.label}`}
              >
                <span
                  className={`font-mono text-[10px] tracking-wider uppercase transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'text-slate-950 font-bold opacity-100 translate-x-0 bg-white/85 px-1.5 py-0.5 rounded-xs'
                      : 'text-slate-600 font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-x-1 group-hover:translate-x-0 bg-white/85 px-1.5 py-0.5 rounded-xs'
                  }`}
                >
                  <span className={isActive ? 'text-[#0f2f63] mr-1.5' : 'text-slate-400 mr-1.5'}>
                    {item.code}
                  </span>
                  {item.label}
                </span>

                <span
                  className={`block transition-all duration-300 ${
                    isActive
                      ? 'w-7 h-[2px] bg-[#0f2f63]'
                      : 'w-3 h-[1.5px] bg-slate-900/25 group-hover:w-5 group-hover:bg-slate-900/70'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Minimal Step & Exit Controls */}
        <div className="flex items-center gap-1 font-mono">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeStage <= 0}
            aria-label={isId ? 'Bab sebelumnya' : 'Previous chapter'}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-white/95 border border-slate-900/15 text-slate-700 hover:text-slate-950 hover:border-slate-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63]"
          >
            <ChevronUp className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={activeStage >= totalStages - 1}
            aria-label={isId ? 'Bab berikutnya' : 'Next chapter'}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-white/95 border border-slate-900/15 text-slate-700 hover:text-slate-950 hover:border-slate-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63]"
          >
            <ChevronDown className="w-4 h-4" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={onExit}
            className="h-8 px-2.5 rounded-md bg-[#0f2f63] hover:bg-[#153e7e] text-white text-[10px] font-semibold tracking-wider uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63] focus-visible:ring-offset-2"
          >
            {isId ? 'Peta' : 'Map'}
          </button>
        </div>
      </aside>

      {/* Mobile: Sharp Architectural Bottom Index Bar */}
      <nav
        aria-label={isId ? 'Navigasi bab mobile' : 'Mobile chapter navigation'}
        className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,12px))] inset-x-4 z-40 flex md:hidden items-center justify-between gap-2 px-2 py-1 rounded-md bg-white/95 border border-slate-900/15 shadow-sm select-none pointer-events-auto"
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrev}
            disabled={activeStage <= 0}
            aria-label={isId ? 'Bab sebelumnya' : 'Previous chapter'}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-sm text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63]"
          >
            <ChevronUp className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={activeStage >= totalStages - 1}
            aria-label={isId ? 'Bab berikutnya' : 'Next chapter'}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-sm text-slate-800 hover:bg-slate-100 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63]"
          >
            <ChevronDown className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Hairline Ruler Ticks */}
        <div className="flex items-center gap-1.5 px-1">
          {stageItems.map((item) => {
            const isActive = item.index === activeStage;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => onSelectStage(item.index)}
                aria-label={`${item.code} ${item.label}`}
                aria-current={isActive ? 'step' : undefined}
                className="py-3 px-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0f2f63]"
              >
                <span
                  className={`block h-[2px] transition-all duration-300 ${
                    isActive ? 'w-5 bg-[#0f2f63]' : 'w-2 bg-slate-900/20'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onExit}
          className="min-h-[40px] px-3 rounded-sm bg-[#0f2f63] hover:bg-[#153e7e] text-white font-mono text-[10.5px] font-semibold tracking-wider uppercase cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2f63]"
        >
          {isId ? 'Peta' : 'Map'}
        </button>
      </nav>
    </>
  );
};
