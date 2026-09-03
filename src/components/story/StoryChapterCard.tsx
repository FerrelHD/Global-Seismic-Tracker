import React from 'react';
import { StoryChapter } from '../../utils/storyAnalytics';
import { LiquidCard } from '../ui/liquid-glass';
import { MapPin, ArrowDown } from 'lucide-react';

interface StoryChapterCardProps {
  chapter: StoryChapter;
  isActive: boolean;
  onExploreClick?: () => void;
}

export const StoryChapterCard: React.FC<StoryChapterCardProps> = ({
  chapter,
  isActive,
  onExploreClick,
}) => {
  const isFinalChapter = chapter.id === 'chapter-5';

  return (
    <div
      className={`transition-all duration-700 ease-out w-full max-w-lg ${
        isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-25 translate-y-6 scale-[0.98]'
      }`}
    >
      <LiquidCard className="rounded-3xl p-6 sm:p-7 shadow-xl border border-white/80 select-none backdrop-blur-xl">
        {/* Chapter Header: Clean Swiss Monospaced Indicator */}
        <div
          className={`flex items-center justify-between gap-3 pb-3 border-b border-slate-100 transition-all duration-500 ease-out ${
            isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-2'
          }`}
          style={{ transitionDelay: isActive ? '60ms' : '0ms' }}
        >
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
            {chapter.badge.replace('//', '·')}
          </span>

          <span className="text-[10px] font-mono text-slate-400">
            {chapter.coordinates[0].toFixed(1)}°, {chapter.coordinates[1].toFixed(1)}°
          </span>
        </div>

        {/* Chapter Title & Subtitle */}
        <div
          className={`mt-4 transition-all duration-500 ease-out ${
            isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-3'
          }`}
          style={{ transitionDelay: isActive ? '120ms' : '0ms' }}
        >
          <h2 className="text-xl sm:text-2xl font-sans font-bold text-slate-900 tracking-tight leading-tight">
            {chapter.title}
          </h2>
          <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-xs font-mono">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{chapter.subtitle}</span>
          </div>
        </div>

        {/* Narrative Description */}
        <p
          className={`mt-3.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-normal transition-all duration-500 ease-out ${
            isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-3'
          }`}
          style={{ transitionDelay: isActive ? '180ms' : '0ms' }}
        >
          {chapter.description}
        </p>

        {/* Minimalist Key Metric Grid: Clean Hairlines without heavy nested boxes */}
        {chapter.stats && chapter.stats.length > 0 && (
          <div
            className={`grid grid-cols-3 gap-2 mt-5 py-3 border-t border-b border-slate-100 font-mono text-center transition-all duration-500 ease-out ${
              isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-3'
            }`}
            style={{ transitionDelay: isActive ? '240ms' : '0ms' }}
          >
            {chapter.stats.map((st, i) => (
              <div key={i} className="min-w-0">
                <span className="text-[8px] sm:text-[9px] text-slate-400 block font-medium uppercase tracking-wider truncate">
                  {st.label}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 block truncate">
                  {st.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Minimalist CTA on final chapter */}
        {isFinalChapter && onExploreClick && (
          <div
            className={`mt-5 pt-3 flex items-center justify-between transition-all duration-500 ease-out ${
              isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-2'
            }`}
            style={{ transitionDelay: isActive ? '300ms' : '0ms' }}
          >
            <span className="text-[11px] font-mono text-slate-400">
              Laboratory controls unlocked
            </span>
            <button
              onClick={onExploreClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-black text-white text-xs font-mono font-medium tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <span>ENTER VIEW</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </LiquidCard>
    </div>
  );
};
