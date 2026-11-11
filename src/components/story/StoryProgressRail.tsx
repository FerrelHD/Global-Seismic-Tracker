import React from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
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
  const totalStages = chapters.length + 1; // 0 (Prolog) + 5 chapters (4 tectonic + 1 epilog)

  const stageItems = [
    { index: 0, code: '00', label: lang === 'id' ? 'PROLOG' : 'PROLOGUE' },
    ...chapters.map((ch, idx) => ({
      index: idx + 1,
      code: ch.chapterNumber,
      label: ch.title.replace(/^The\s+/i, '').replace(/^Sistem\s+/i, '').toUpperCase(),
    })),
  ];

  const handlePrev = () => onSelectStage(Math.max(0, activeStage - 1));
  const handleNext = () => onSelectStage(Math.min(totalStages - 1, activeStage + 1));

  return (
    <>
      {/* Desktop Right-Hand Swiss Editorial Stepper Rail */}
      <aside
        aria-label={lang === 'id' ? 'Navigasi Bab Cerita Tektonik' : 'Tectonic Story Chapter Navigation'}
        className="fixed right-4 lg:right-7 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-end gap-2 select-none pointer-events-auto"
      >
        {/* Step Up */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={activeStage <= 0}
          title={lang === 'id' ? 'Bab Sebelumnya' : 'Previous Chapter'}
          className="p-1.5 rounded-full bg-white/90 hover:bg-white border border-slate-200/90 text-slate-600 hover:text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        {/* Chapter Dots & Labels */}
        <div className="flex flex-col items-end gap-1.5 py-2.5 px-2.5 rounded-2xl bg-white/85 backdrop-blur-xl border border-slate-200/80 shadow-lg">
          {stageItems.map((item) => {
            const isActive = item.index === activeStage;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => onSelectStage(item.index)}
                className="group flex items-center gap-2.5 py-1 px-1 cursor-pointer focus:outline-none"
                title={item.label}
              >
                <span
                  className={`font-mono text-[9.5px] tracking-widest uppercase transition-all duration-200 max-w-[130px] truncate ${
                    isActive
                      ? 'text-slate-950 font-bold opacity-100 translate-x-0'
                      : 'text-slate-400 font-medium opacity-75 group-hover:opacity-100 group-hover:text-slate-800'
                  }`}
                >
                  {item.label}
                </span>

                <span
                  className={`flex items-center justify-center rounded-full font-mono text-[9px] font-bold transition-all duration-300 ${
                    isActive
                      ? 'w-6 h-6 bg-[#0f2f63] text-white shadow-xs scale-105'
                      : 'w-5 h-5 bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-900'
                  }`}
                >
                  {item.code}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step Down */}
        <button
          type="button"
          onClick={handleNext}
          disabled={activeStage >= totalStages - 1}
          title={lang === 'id' ? 'Bab Berikutnya' : 'Next Chapter'}
          className="p-1.5 rounded-full bg-white/90 hover:bg-white border border-slate-200/90 text-slate-600 hover:text-slate-950 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {/* Quick Exit Button */}
        <button
          type="button"
          onClick={onExit}
          className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-mono text-[9.5px] font-bold tracking-wider uppercase shadow-md transition-all cursor-pointer active:scale-95"
        >
          <X className="w-3 h-3" />
          <span>{lang === 'id' ? 'PETA LIVE' : 'LIVE MAP'}</span>
        </button>
      </aside>

      {/* Mobile Bottom Floating Navigation & Exit Pill */}
      <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,12px))] left-1/2 -translate-x-1/2 z-40 flex md:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/92 backdrop-blur-xl border border-slate-200/90 shadow-xl select-none pointer-events-auto">
        <button
          type="button"
          onClick={handlePrev}
          disabled={activeStage <= 0}
          aria-label="Previous Stage"
          className="p-1.5 rounded-full bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer active:scale-95"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {stageItems.map((item) => {
            const isActive = item.index === activeStage;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => onSelectStage(item.index)}
                aria-label={item.label}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive ? 'w-5 bg-[#0f2f63]' : 'w-1.5 bg-slate-300'
                }`}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={activeStage >= totalStages - 1}
          aria-label="Next Stage"
          className="p-1.5 rounded-full bg-slate-100 text-slate-700 disabled:opacity-30 cursor-pointer active:scale-95"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-slate-200 mx-0.5" />

        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0f2f63] text-white font-mono text-[9.5px] font-bold tracking-wider uppercase cursor-pointer active:scale-95"
        >
          <X className="w-3 h-3" />
          <span>{lang === 'id' ? 'PETA' : 'MAP'}</span>
        </button>
      </div>
    </>
  );
};
