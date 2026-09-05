import React from 'react';
import { StoryChapter } from '../../utils/storyAnalytics';
import { LiquidCard } from '../ui/liquid-glass';
import { MapPin, ArrowDown, Compass, Activity } from 'lucide-react';
import { useLanguage } from '../../utils/i18n';

interface StoryChapterCardProps {
  chapter: StoryChapter;
  isActive: boolean;
  onExploreClick?: () => void;
  onFocusSector?: (coords: [number, number]) => void;
}

export const StoryChapterCard: React.FC<StoryChapterCardProps> = ({
  chapter,
  isActive,
  onExploreClick,
  onFocusSector,
}) => {
  const { t } = useLanguage();
  const isFinalChapter = chapter.id === 'chapter-5';

  return (
    <div
      className={`transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] w-full max-w-lg rounded-3xl overflow-hidden isolate ${
        isActive
          ? 'opacity-100 translate-y-0 scale-100 shadow-2xl hover:-translate-y-1.5'
          : 'opacity-70 translate-y-2 scale-[0.98] hover:opacity-95 hover:-translate-y-0.5'
      }`}
    >
      <LiquidCard className="rounded-3xl p-5 sm:p-7 shadow-2xl select-none backdrop-blur-2xl relative overflow-hidden bg-white/90 transition-shadow duration-300 hover:shadow-3xl">
        {/* Subtle Technical Corner Crosshairs (No Art Style) */}
        <span className="absolute top-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
          ┌
        </span>
        <span className="absolute top-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
          ┐
        </span>
        <span className="absolute bottom-3 left-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
          └
        </span>
        <span className="absolute bottom-3 right-3 text-slate-300 font-mono text-xs select-none pointer-events-none">
          ┘
        </span>

        {/* Large Ghost Watermark Chapter Number in Background */}
        <div className="absolute top-3 right-6 text-6xl sm:text-7xl font-mono font-black text-slate-900/[0.06] select-none pointer-events-none tracking-tighter">
          {chapter.chapterNumber}
        </div>

        {/* Chapter Header: Clean Swiss Monospaced Indicator + Status Beacon */}
        <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 relative z-10">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                isActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="text-[10px] font-mono tracking-widest text-slate-600 uppercase font-bold">
              {chapter.badge.replace('//', '·')}
            </span>
          </div>

          <span className="text-[10px] font-mono font-medium text-slate-500">
            {Math.abs(chapter.coordinates[0]).toFixed(1)}°{chapter.coordinates[0] >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(chapter.coordinates[1]).toFixed(1)}°{chapter.coordinates[1] >= 0 ? 'E' : 'W'}
          </span>
        </div>

        {/* Plate Boundary Chip Tag */}
        {chapter.plateTag && (
          <div className="mt-3.5 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-mono font-semibold tracking-widest uppercase">
              <Activity className="w-2.5 h-2.5 text-slate-500" />
              <span>{chapter.plateTag}</span>
            </div>
          </div>
        )}

        {/* Chapter Title & Subtitle */}
        <div className="mt-3 relative z-10">
          <h2 className="text-xl sm:text-2xl font-sans font-black text-slate-950 tracking-tight leading-tight uppercase">
            {chapter.title}
          </h2>
          <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-xs font-mono">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate uppercase">{chapter.subtitle}</span>
          </div>
        </div>

        {/* Narrative Description (English) */}
        <p className="mt-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed font-sans font-normal relative z-10">
          {chapter.description}
        </p>

        {/* Instrument Cluster Metric Grid: Clean Hairlines */}
        {chapter.stats && chapter.stats.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-5 py-3 border-t border-b border-slate-100 font-mono text-center relative z-10">
            {chapter.stats.map((st, i) => (
              <div key={i} className="min-w-0">
                <span className="text-[8px] sm:text-[9px] text-slate-400 block font-medium uppercase tracking-wider truncate">
                  {st.label}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-950 mt-0.5 block truncate">
                  {st.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="mt-4 pt-1 flex items-center justify-between relative z-10">
          {/* Quick Focus Sector Button */}
          {onFocusSector && !isFinalChapter ? (
            <button
              onClick={() => onFocusSector(chapter.coordinates)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] font-mono font-semibold tracking-wider transition-colors cursor-pointer border border-slate-200"
            >
              <Compass className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.focusSector}</span>
            </button>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
              {isFinalChapter ? t.laboratoryUnlocked : t.sectorMonitored}
            </span>
          )}

          {isFinalChapter && onExploreClick && (
            <button
              onClick={onExploreClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0f2f63] hover:bg-[#153e7e] text-white text-xs font-mono font-semibold tracking-wider transition-colors cursor-pointer"
            >
              <span>{t.exploreObservatory}</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </LiquidCard>
    </div>
  );
};
