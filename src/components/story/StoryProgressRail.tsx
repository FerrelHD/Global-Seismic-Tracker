import React from 'react';
import { StoryChapter } from '../../utils/storyAnalytics';

interface StoryProgressRailProps {
  chapters: StoryChapter[];
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
  visible: boolean;
}

export const StoryProgressRail: React.FC<StoryProgressRailProps> = ({
  chapters,
  activeChapterIndex,
  onSelectChapter,
  visible,
}) => {
  if (!visible) return null;

  return (
    <aside
      aria-label="Story Chapter Rail"
      className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-end gap-3 select-none pointer-events-auto animate-in fade-in duration-500"
    >
      <div className="flex flex-col items-center gap-2 py-3 px-2 rounded-full bg-white/70 backdrop-blur-md border border-white/80 shadow-lg">
        {chapters.map((ch, idx) => {
          const isActive = idx === activeChapterIndex;
          return (
            <button
              key={ch.id}
              onClick={() => onSelectChapter(idx)}
              title={`${ch.title} (${ch.subtitle})`}
              className="group relative flex items-center justify-center p-1.5 cursor-pointer focus:outline-none"
            >
              {/* Tooltip Label on Hover */}
              <span className="absolute right-8 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-[10px] tracking-wider whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-md">
                {ch.title}
              </span>

              {/* Step indicator dot */}
              <div
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? 'w-2.5 h-6 bg-blue-600 shadow-sm'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400 group-hover:scale-125'
                }`}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
};
