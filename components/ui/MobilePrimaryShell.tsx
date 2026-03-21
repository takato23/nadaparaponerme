import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import type { MobilePrimaryTab } from '../../src/navigation/mobilePrimaryTabs';
import {
  MOBILE_PRIMARY_TABS,
  applyProgressResistance,
  getPrimaryTabIndex,
  resolveSnapTargetIndex,
} from '../../src/navigation/mobilePrimaryTabs';

interface MobilePrimaryShellProps {
  activePath: string;
  onNavigate: (path: string) => void;
  renderPanel: (tab: MobilePrimaryTab) => React.ReactNode;
  reduceMotion?: boolean;
  tabs?: MobilePrimaryTab[];
}

type DragGestureState = {
  pointerId: number;
  source: 'content' | 'dock';
  mode: 'pending' | 'dragging';
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocityPxPerMs: number;
  unitWidth: number;
};

const CONTENT_DRAG_THRESHOLD = 14;
const CLICK_SUPPRESSION_MS = 180;

const shellSpring = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.34,
};

function ShellPanelFallback() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center px-6">
      <div className="flex items-center gap-3 rounded-3xl border border-white/50 bg-white/72 px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/72 dark:text-slate-100">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[color:var(--studio-rose,#f5a7a3)]" />
        Cargando panel...
      </div>
    </div>
  );
}

export function MobilePrimaryShell({
  activePath,
  onNavigate,
  renderPanel,
  reduceMotion = false,
  tabs = MOBILE_PRIMARY_TABS,
}: MobilePrimaryShellProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const releaseAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const dragStateRef = useRef<DragGestureState | null>(null);
  const suppressClicksUntilRef = useRef(0);
  const scrollPositionsRef = useRef<Record<string, number>>({});

  const activeIndex = useMemo(() => {
    const explicitIndex = tabs.findIndex((tab) => tab.path === activePath);
    if (explicitIndex >= 0) {
      return explicitIndex;
    }

    const sharedIndex = getPrimaryTabIndex(activePath);
    return Math.min(sharedIndex, tabs.length - 1);
  }, [activePath, tabs]);

  const progress = useMotionValue(activeIndex);
  const trackX = useTransform(progress, (value) => `${value * (-100 / tabs.length)}%`);
  const maxIndex = tabs.length - 1;

  const [isDragging, setIsDragging] = useState(false);
  const activeTabId = tabs[activeIndex]?.id;

  const stopReleaseAnimation = useCallback(() => {
    if (releaseAnimationRef.current) {
      releaseAnimationRef.current.stop();
      releaseAnimationRef.current = null;
    }
  }, []);

  const animateToIndex = useCallback((nextIndex: number) => {
    stopReleaseAnimation();

    if (reduceMotion) {
      releaseAnimationRef.current = animate(progress, nextIndex, {
        duration: 0.16,
        ease: [0.22, 1, 0.36, 1],
      });
      return;
    }

    releaseAnimationRef.current = animate(progress, nextIndex, shellSpring);
  }, [progress, reduceMotion, stopReleaseAnimation]);

  const commitToIndex = useCallback((nextIndex: number) => {
    const clampedIndex = Math.min(maxIndex, Math.max(0, nextIndex));
    const targetTab = tabs[clampedIndex];
    if (!targetTab) {
      animateToIndex(activeIndex);
      return;
    }

    if (targetTab.path === activePath) {
      animateToIndex(clampedIndex);
      return;
    }

    onNavigate(targetTab.path);
  }, [activeIndex, activePath, animateToIndex, maxIndex, onNavigate, tabs]);

  useEffect(() => {
    if (dragStateRef.current?.mode === 'dragging') {
      return;
    }

    animateToIndex(activeIndex);
  }, [activeIndex, animateToIndex]);

  useEffect(() => () => stopReleaseAnimation(), [stopReleaseAnimation]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !activeTabId) return;

    const nextScrollTop = scrollPositionsRef.current[activeTabId] ?? 0;
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTo({ top: nextScrollTop, behavior: 'auto' });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeTabId]);

  const finishGesture = useCallback((clientX: number, timeStamp: number, cancelled = false) => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;

    if (!dragState || dragState.mode !== 'dragging') {
      setIsDragging(false);
      animateToIndex(activeIndex);
      return;
    }

    const elapsed = Math.max(timeStamp - dragState.lastTime, 1);
    const tailVelocity = (clientX - dragState.lastX) / elapsed;
    const velocityPxPerMs = Number.isFinite(tailVelocity) ? tailVelocity : dragState.velocityPxPerMs;
    const currentProgress = progress.get();

    setIsDragging(false);
    suppressClicksUntilRef.current = Date.now() + CLICK_SUPPRESSION_MS;

    if (cancelled) {
      animateToIndex(activeIndex);
      return;
    }

    const targetIndex = resolveSnapTargetIndex({
      committedIndex: activeIndex,
      progress: currentProgress,
      velocityPxPerMs,
      unitWidth: dragState.unitWidth,
      maxIndex,
    });

    commitToIndex(targetIndex);
  }, [activeIndex, animateToIndex, commitToIndex, maxIndex, progress]);

  const handleContentPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      source: 'content',
      mode: 'pending',
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocityPxPerMs: 0,
      unitWidth: Math.max(viewport.clientWidth, 1),
    };
  }, []);

  const handleContentPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || dragState.source !== 'content') {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const dt = Math.max(event.timeStamp - dragState.lastTime, 1);

    dragState.velocityPxPerMs = (event.clientX - dragState.lastX) / dt;
    dragState.lastX = event.clientX;
    dragState.lastTime = event.timeStamp;

    if (dragState.mode === 'pending') {
      const horizontalDistance = Math.abs(dx);
      const verticalDistance = Math.abs(dy);

      if (verticalDistance > horizontalDistance + 6) {
        dragStateRef.current = null;
        return;
      }

      if (horizontalDistance < CONTENT_DRAG_THRESHOLD || horizontalDistance <= verticalDistance + 4) {
        return;
      }

      dragState.mode = 'dragging';
      setIsDragging(true);
      stopReleaseAnimation();
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const nextProgress = applyProgressResistance(activeIndex - (dx / dragState.unitWidth), 0, maxIndex);
    progress.set(nextProgress);

    if (event.cancelable) {
      event.preventDefault();
    }
  }, [activeIndex, maxIndex, progress, stopReleaseAnimation]);

  const handleContentPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || dragState.source !== 'content') {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (dragState.mode === 'pending') {
      dragStateRef.current = null;
      return;
    }

    finishGesture(event.clientX, event.timeStamp);
  }, [finishGesture]);

  const handleContentPointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId || dragState.source !== 'content') {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishGesture(event.clientX, event.timeStamp, true);
  }, [finishGesture]);

  const handleContentClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressClicksUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const handleViewportScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!activeTabId) return;
    scrollPositionsRef.current[activeTabId] = event.currentTarget.scrollTop;
  }, [activeTabId]);

  return (
    <div
      data-testid="mobile-primary-shell"
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
    >
      <div
        ref={viewportRef}
        data-testid="mobile-primary-shell-viewport"
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y"
        onScroll={handleViewportScroll}
        onPointerDown={handleContentPointerDown}
        onPointerMove={handleContentPointerMove}
        onPointerUp={handleContentPointerEnd}
        onPointerCancel={handleContentPointerCancel}
        onClickCapture={handleContentClickCapture}
      >
        <motion.div
          className="flex min-h-full w-[500%] touch-pan-y"
          style={{ x: trackX }}
        >
          {tabs.map((tab, index) => {
            const shouldMount = activeIndex === index;

            return (
              <section
                key={tab.id}
                aria-hidden={activeIndex !== index}
                aria-label={tab.label}
                className="min-h-full w-1/5 min-w-0 flex-none"
                data-active-panel={activeIndex === index ? 'true' : 'false'}
                style={{ pointerEvents: isDragging ? 'none' : 'auto' }}
              >
                {shouldMount ? (
                  <Suspense fallback={<ShellPanelFallback />}>
                    {renderPanel(tab)}
                  </Suspense>
                ) : (
                  <div className="min-h-full" />
                )}
              </section>
            );
          })}
        </motion.div>
      </div>
    </div >
  );
}

export default MobilePrimaryShell;
