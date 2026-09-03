import React from 'react';
import { StoryChapter } from '../../utils/storyAnalytics';
import { LiquidCard } from '../ui/liquid-glass';
import { MapPin, ArrowDown, Compass, Activity } from 'lucide-react';

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
  const isFinalChapter = chapter.id === 'chapter-5';

  return (
    <div
      className={`transition-all duration-700 ease-out w-full max-w-lg ${
        isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-25 translate-y-6 scale-[0.98]'
      }`}
    >
      <LiquidCard className="rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/80 select-none backdrop-blur-2xl relative overflow-hidden">
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
        <div className="absolute top-3 right-6 text-6xl sm:text-7xl font-mono font-black text-slate-900/[0.04] select-none pointer-events-none tracking-tighter">
          {chapter.chapterNumber}
        </div>

        {/* Chapter Header: Clean Swiss Monospaced Indicator + Status Beacon */}
        <div
          className={`flex items-center justify-between gap-3 pb-3.5 border-b border-slate-100 transition-all duration-500 ease-out relative z-10 ${
            isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-2'
          }`}
          style={{ transitionDelay: isActive ? '60ms' : '0ms' }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">
              {chapter.badge.replace('//', '·')}
            </span>
          </div>

          <span className="text-[10px] font-mono font-medium text-slate-400">
            {Math.abs(chapter.coordinates[0]).toFixed(1)}°{chapter.coordinates[0] >= 0 ? 'N' : 'S'},{' '}
            {Math.abs(chapter.coordinates[1]).toFixed(1)}°{chapter.coordinates[1] >= 0 ? 'E' : 'W'}
          </span>
        </div>

        {/* Plate Boundary Chip Tag */}
        {chapter.plateTag && (
          <div
            className={`mt-3.5 transition-all duration-500 ease-out ${
              isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-2'
            }`}
            style={{ transitionDelay: isActive ? '90ms' : '0ms' }}
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-slate-700 text-[9px] font-mono font-semibold tracking-wider uppercase">
              <Activity className="w-2.5 h-2.5 text-slate-500" />
              <span>{chapter.plateTag}</span>
            </div>
          </div>
        )}

        {/* Chapter Title & Subtitle */}
        <div
          className={`mt-3 transition-all duration-500 ease-out relative z-10 ${
            isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-3'
          }`}
          style={{ transitionDelay: isActive ? '120ms' : '0ms' }}
        >
          <h2 className="text-xl sm:text-2xl font-sans font-black text-slate-950 tracking-tight leading-tight uppercase">
            {chapter.title}
          </h2>
          <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-xs font-mono">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate uppercase">{chapter.subtitle}</span>
          </div>
        </div>

        {/* Narrative Description (English) */}
        <p
          className={`mt-3.5 text-xs sm:text-sm text-slate-600 leading-relaxed font-sans font-normal transition-all duration-500 ease-out relative z-10 ${
            isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-3'
          }`}
          style={{ transitionDelay: isActive ? '180ms' : '0ms' }}
        >
          {chapter.description}
        </p>

        {/* Instrument Cluster Metric Grid: Clean Hairlines */}
        {chapter.stats && chapter.stats.length > 0 && (
          <div
            className={`grid grid-cols-3 gap-2 mt-5 py-3 border-t border-b border-slate-100 font-mono text-center transition-all duration-500 ease-out relative z-10 ${
              isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-3'
            }`}
            style={{ transitionDelay: isActive ? '240ms' : '0ms' }}
          >
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
        <div
          className={`mt-4 pt-1 flex items-center justify-between transition-all duration-500 ease-out relative z-10 ${
            isActive ? 'opacity-100 blur-none translate-y-0' : 'opacity-0 blur-sm translate-y-2'
          }`}
          style={{ transitionDelay: isActive ? '280ms' : '0ms' }}
        >
          {/* Quick Focus Sector Button */}
          {onFocusSector && !isFinalChapter ? (
            <button
              onClick={() => onFocusSector(chapter.coordinates)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 text-[11px] font-mono font-semibold tracking-wider transition-all cursor-pointer border border-slate-200/70"
            >
              <Compass className="w-3.5 h-3.5 text-slate-600" />
              <span>FOCUS SECTOR ⌖</span>
            </button>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">
              {isFinalChapter ? 'Laboratory Unlocked' : 'Sector Monitored'}
            </span>
          )}

          {isFinalChapter && onExploreClick && (
            <button
              onClick={onExploreClick}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950 hover:bg-black text-white text-xs font-mono font-semibold tracking-wider transition-all shadow-xs cursor-pointer"
            >
              <span>EXPLORE OBSERVATORY</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </LiquidCard>
    </div>
  );
};
