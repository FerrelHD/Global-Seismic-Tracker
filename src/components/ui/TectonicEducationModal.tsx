import React, { useEffect } from 'react';
import { X, BookOpen, MapPin, Activity, Compass } from 'lucide-react';
import { StoryChapter } from '../../utils/storyAnalytics';
import { Language } from '../../utils/i18n';

interface TectonicEducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: StoryChapter[];
  onFocusSector: (coords: [number, number]) => void;
  lang?: Language;
}

export const TectonicEducationModal: React.FC<TectonicEducationModalProps> = ({
  isOpen,
  onClose,
  chapters,
  onFocusSector,
  lang = 'id',
}) => {
  const tectonicZones = chapters;

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* 1. Header */}
        <div className="shrink-0 px-5 sm:px-7 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0f2f63] text-white flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-sm sm:text-base text-slate-950 tracking-tight uppercase">
                  {lang === 'id' ? 'ZONA TEKTONIK & SESAR AKTIF' : 'ACTIVE TECTONIC & FAULT SYSTEMS'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-mono text-[10px] font-semibold">
                  {tectonicZones.length} {lang === 'id' ? 'SEKTOR' : 'SECTORS'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                {lang === 'id'
                  ? 'Panduan Geodetik & Dinamika Lempeng Kepulauan Indonesia'
                  : 'Geodetic Guide & Plate Dynamics of the Indonesian Archipelago'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-slate-400 mr-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs text-slate-600 font-medium">
                ESC
              </kbd>
            </span>
            <button
              onClick={onClose}
              title={lang === 'id' ? 'Tutup panduan' : 'Close guide'}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Cards Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tectonicZones.map((chapter) => (
              <div
                key={chapter.id}
                className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all duration-200"
              >
                {/* Subtle Ghost Chapter Number */}
                <div className="absolute top-3 right-4 text-4xl font-mono font-black text-slate-900/[0.05] pointer-events-none select-none">
                  {chapter.chapterNumber}
                </div>

                <div>
                  {/* Category Chip & Coordinates */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                      {chapter.badge.replace('//', '·')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {Math.abs(chapter.coordinates[0]).toFixed(1)}°{chapter.coordinates[0] >= 0 ? 'N' : 'S'},{' '}
                      {Math.abs(chapter.coordinates[1]).toFixed(1)}°{chapter.coordinates[1] >= 0 ? 'E' : 'W'}
                    </span>
                  </div>

                  {/* Plate Boundary Tag */}
                  {chapter.plateTag && (
                    <div className="mt-2.5">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-mono font-bold tracking-wide uppercase">
                        <Activity className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                        <span className="truncate">{chapter.plateTag}</span>
                      </div>
                    </div>
                  )}

                  {/* Title & Subtitle */}
                  <h3 className="mt-2.5 text-base sm:text-lg font-sans font-bold text-slate-950 tracking-tight uppercase group-hover:text-blue-900 transition-colors">
                    {chapter.title}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{chapter.subtitle}</span>
                  </div>

                  {/* Scientific Narrative */}
                  <p className="mt-3 text-xs text-slate-600 font-sans leading-relaxed line-clamp-4">
                    {chapter.description}
                  </p>

                  {/* Stats Grid */}
                  {chapter.stats && chapter.stats.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3.5 pt-2.5 border-t border-slate-100 text-center font-mono">
                      {chapter.stats.map((st, i) => (
                        <div key={i} className="min-w-0">
                          <span className="text-[8.5px] text-slate-400 block uppercase tracking-wider truncate">
                            {st.label}
                          </span>
                          <span className="text-xs font-bold text-slate-950 mt-0.5 block truncate">
                            {st.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Focus Map Action Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={() => {
                      onFocusSector(chapter.coordinates);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-[#0f2f63] text-white text-[11px] font-mono font-semibold tracking-wider transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Compass className="w-3.5 h-3.5 text-slate-300" />
                    <span>{lang === 'id' ? 'Fokus ke Sektor ⌖' : 'Focus Sector ⌖'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Footer Bar */}
        <div className="shrink-0 px-5 sm:px-7 py-3 border-t border-slate-200/80 bg-slate-50/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>
            {lang === 'id'
              ? 'Rujukan Geodinamika: BMKG, PVMBG & PuSGeN Indonesia'
              : 'Geodynamic Reference: BMKG, PVMBG & Indonesian PuSGeN'}
          </span>
          <span className="text-slate-400">WGS 84 Datum</span>
        </div>
      </div>
    </div>
  );
};

