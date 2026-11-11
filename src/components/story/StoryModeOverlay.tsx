import React, { useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import Snap from 'lenis/snap';
import { StoryChapter } from '../../utils/storyAnalytics';
import { StoryPrologStage } from './StoryPrologStage';
import { StoryChapterCard } from './StoryChapterCard';
import { StoryProgressRail } from './StoryProgressRail';
import { Language } from '../../utils/i18n';

interface StoryModeOverlayProps {
  isOpen: boolean;
  chapters: StoryChapter[];
  activeStage: number;
  onStageChange: (stage: number) => void;
  onClose: () => void;
  totalQuakes: number;
  maxMag: string;
  activeVolcanoCount: number;
  hotspotCount: number;
  lang: Language;
}

const EASE_OUT_EXPO = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

export const StoryModeOverlay: React.FC<StoryModeOverlayProps> = ({
  isOpen,
  chapters,
  activeStage,
  onStageChange,
  onClose,
  totalQuakes,
  maxMag,
  activeVolcanoCount,
  hotspotCount,
  lang,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const snapRef = useRef<Snap | null>(null);

  const onStageChangeRef = useRef(onStageChange);
  onStageChangeRef.current = onStageChange;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const totalStages = chapters.length + 1; // 0 = Prolog, 1..4 = Chapters, 5 = Epilog

  const goToStage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(totalStages - 1, index));
      if (snapRef.current) {
        snapRef.current.currentSnapIndex = clamped;
      }
      if (lenisRef.current && wrapperRef.current) {
        const stageH = wrapperRef.current.clientHeight || window.innerHeight;
        lenisRef.current.scrollTo(Math.round(clamped * stageH), {
          duration: 0.85,
          easing: EASE_OUT_EXPO,
          force: true,
          lock: false,
        });
      }
      onStageChangeRef.current(clamped);
    },
    [totalStages]
  );

  // Scoped Lenis + Snap Engine mounted strictly on the Story Overlay wrapper
  useEffect(() => {
    if (!isOpen) return;
    const wrapper = wrapperRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      eventsTarget: wrapper,
      smoothWheel: true,
      syncTouch: true,
      syncTouchLerp: 0.085,
      duration: 0.85,
      easing: EASE_OUT_EXPO,
      autoRaf: true,
      overscroll: false,
    });
    lenisRef.current = lenis;

    const snap = new Snap(lenis, {
      type: 'lock',
      duration: 0.85,
      easing: EASE_OUT_EXPO,
      debounce: 45,
      onSnapStart: (item) => {
        if (typeof item.index === 'number') {
          onStageChangeRef.current(item.index);
        }
      },
    });
    snapRef.current = snap;

    let unsubscribers: Array<() => void> = [];
    const syncSnapPoints = () => {
      unsubscribers.forEach((u) => u());
      unsubscribers = [];
      const stageH = wrapper.clientHeight || window.innerHeight;
      for (let i = 0; i < totalStages; i++) {
        unsubscribers.push(snap.add(Math.round(i * stageH)));
      }
    };

    syncSnapPoints();
    snap.currentSnapIndex = 0;

    const ro = new ResizeObserver(() => {
      syncSnapPoints();
      lenis.resize();
    });
    ro.observe(wrapper);

    let lastReportedStage = 0;
    const handleScroll = ({ scroll }: { scroll: number }) => {
      const stageH = wrapper.clientHeight || window.innerHeight;
      if (stageH <= 0) return;
      const nextStage = Math.max(0, Math.min(totalStages - 1, Math.round(scroll / stageH)));
      if (nextStage !== lastReportedStage) {
        lastReportedStage = nextStage;
        snap.currentSnapIndex = nextStage;
        onStageChangeRef.current(nextStage);
      }
    };
    lenis.on('scroll', handleScroll);

    // Touch-swipe snap support (since lenis/snap skips touchmove events)
    let touchStartY = 0;
    let touchStartTime = 0;
    let touchSnapTimer: ReturnType<typeof setTimeout> | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement | null)?.closest('button, a')) return;
      touchStartY = e.touches[0]?.clientY ?? 0;
      touchStartTime = performance.now();
      if (touchSnapTimer) {
        clearTimeout(touchSnapTimer);
        touchSnapTimer = null;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if ((e.target as HTMLElement | null)?.closest('button, a')) return;
      const endY = e.changedTouches[0]?.clientY ?? touchStartY;
      const deltaY = endY - touchStartY;
      if (Math.abs(deltaY) < 12) return;

      const elapsed = performance.now() - touchStartTime;
      const stageH = wrapper.clientHeight || window.innerHeight;
      const currentIdx = snap.currentSnapIndex ?? Math.round(lenis.scroll / stageH);

      touchSnapTimer = setTimeout(() => {
        let targetIdx = Math.round(lenis.scroll / stageH);
        if (elapsed < 480 && Math.abs(deltaY) > 36) {
          targetIdx = Math.max(
            0,
            Math.min(totalStages - 1, currentIdx + (deltaY < 0 ? 1 : -1))
          );
        }
        goToStage(targetIdx);
      }, 90);
    };

    wrapper.addEventListener('touchstart', onTouchStart, { passive: true });
    wrapper.addEventListener('touchend', onTouchEnd, { passive: true });

    // Keyboard navigation (ArrowUp/ArrowDown/PageUp/PageDown/Escape)
    const onKeyDown = (e: KeyboardEvent) => {
      const curr = snap.currentSnapIndex ?? 0;
      if (e.key === 'Escape') {
        onCloseRef.current();
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToStage(curr + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToStage(curr - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      if (touchSnapTimer) clearTimeout(touchSnapTimer);
      window.removeEventListener('keydown', onKeyDown);
      wrapper.removeEventListener('touchstart', onTouchStart);
      wrapper.removeEventListener('touchend', onTouchEnd);
      lenis.off('scroll', handleScroll);
      ro.disconnect();
      unsubscribers.forEach((u) => u());
      snap.destroy();
      lenis.destroy();
      snapRef.current = null;
      lenisRef.current = null;
    };
  }, [isOpen, totalStages, goToStage]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-30 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'id' ? 'Mode Cerita Tektonik Nusantara' : 'Nusantara Tectonic Story Mode'}
    >
      {/* Scoped Lenis Smooth Scroll Wrapper */}
      <div
        ref={wrapperRef}
        className="w-full h-[100dvh] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y no-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <div ref={contentRef} className="w-full">
          {/* STAGE 00: PROLOG TYPOGRAPHIC */}
          <StoryPrologStage
            totalQuakes={totalQuakes}
            maxMag={maxMag}
            activeVolcanoCount={activeVolcanoCount}
            hotspotCount={hotspotCount}
            onBegin={() => goToStage(1)}
            onExit={onClose}
            isActive={activeStage === 0}
            lang={lang}
          />

          {/* STAGES 01-05: TECTONIC CHAPTERS & EPILOG */}
          {chapters.map((chapter, idx) => {
            const stageIdx = idx + 1;
            return (
              <StoryChapterCard
                key={chapter.id}
                chapter={chapter}
                stageIndex={stageIdx}
                isActive={activeStage === stageIdx}
                onNextStage={() => goToStage(stageIdx + 1)}
                onReplay={() => goToStage(0)}
                onExit={onClose}
                lang={lang}
              />
            );
          })}
        </div>
      </div>

      {/* Persistent Story Progress Rail & Quick Exit Controls */}
      <StoryProgressRail
        chapters={chapters}
        activeStage={activeStage}
        onSelectStage={goToStage}
        onExit={onClose}
        lang={lang}
      />
    </div>
  );
};
