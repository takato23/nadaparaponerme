import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useNavigateTransition } from '../../hooks/useNavigateTransition';
import { useMatchMedia } from '../../src/hooks/useMatchMedia';
import type { MobilePrimaryTab } from '../../src/navigation/mobilePrimaryTabs';
import {
  MOBILE_PRIMARY_TABS,
  applyProgressResistance,
  getPrimaryTabIndex,
  isPrimaryTabRouteActive,
  resolveSnapTargetIndex,
} from '../../src/navigation/mobilePrimaryTabs';

interface DesktopNavItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  tourId?: string;
}

export interface FloatingDockGesturePayload {
  pointerId: number;
  clientX: number;
  clientY: number;
  timeStamp: number;
  progress: number;
  velocityPxPerMs: number;
  unitWidth: number;
  cancelled?: boolean;
}

interface FloatingDockProps {
  activePath?: string;
  forceHidden?: boolean;
  isDragging?: boolean;
  items?: MobilePrimaryTab[];
  onDragEnd?: (payload: FloatingDockGesturePayload) => void;
  onDragMove?: (payload: FloatingDockGesturePayload) => void;
  onDragStart?: (payload: FloatingDockGesturePayload) => void;
  onItemPress?: (item: MobilePrimaryTab, index: number) => void;
  progress?: MotionValue<number>;
}

type InternalDragState = {
  pointerId: number;
  mode: 'pending' | 'dragging';
  rect: DOMRect;
  itemWidth: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocityPxPerMs: number;
};

const DRAG_THRESHOLD = 12;
const CLICK_SUPPRESSION_MS = 180;
const STANDALONE_SPRING = {
  type: 'spring' as const,
  stiffness: 640,
  damping: 40,
  mass: 0.2,
};

function DesktopNavItem({ icon, label, isActive, onClick, tourId }: DesktopNavItemProps) {
  return (
    <button
      type="button"
      data-tour={tourId}
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left transition-all ${
        isActive
          ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] text-white shadow-[0_16px_36px_rgba(15,23,42,0.24)]'
          : 'text-slate-700 hover:bg-white/85 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
      }`}
    >
      <span
        className={`material-symbols-outlined text-[22px] ${
          isActive
            ? 'text-white'
            : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white'
        }`}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold tracking-[-0.01em]">{label}</span>
      {isActive && <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--studio-rose,#f5a7a3)]" />}
    </button>
  );
}

const getRailProgress = (clientX: number, rect: DOMRect, itemCount: number) => {
  const itemWidth = rect.width / itemCount;
  const rawProgress = ((clientX - rect.left) / itemWidth) - 0.5;
  return {
    itemWidth,
    progress: applyProgressResistance(rawProgress, 0, itemCount - 1),
  };
};

export function FloatingDock({
  activePath,
  forceHidden = false,
  isDragging,
  items = MOBILE_PRIMARY_TABS,
  onDragEnd,
  onDragMove,
  onDragStart,
  onItemPress,
  progress,
}: FloatingDockProps) {
  const navigate = useNavigateTransition();
  const location = useLocation();
  const compactDock = useMatchMedia('(max-width: 429px)');
  const desktopDock = useMatchMedia('(min-width: 1024px)');
  const canHover = useMatchMedia('(hover: hover)');

  const internalProgress = useMotionValue(0);
  const releaseAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const suppressClicksUntilRef = useRef(0);
  const dragStateRef = useRef<InternalDragState | null>(null);
  const pointerRailRef = useRef<HTMLDivElement>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [internalDragging, setInternalDragging] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const effectivePath = activePath ?? location.pathname;
  const activeIndex = useMemo(() => {
    const explicitIndex = items.findIndex((item) => item.path === effectivePath);
    if (explicitIndex >= 0) return explicitIndex;

    const sharedIndex = getPrimaryTabIndex(effectivePath);
    return Math.min(sharedIndex, items.length - 1);
  }, [effectivePath, items]);
  const effectiveProgress = progress ?? internalProgress;
  const dragging = isDragging ?? internalDragging;
  const controlledGesture = Boolean(progress && onDragStart && onDragMove && onDragEnd);
  const indicatorX = useTransform(effectiveProgress, (value) => `${value * 100}%`);

  useEffect(() => {
    internalProgress.set(activeIndex);
    setPreviewIndex(activeIndex);
  }, [activeIndex, internalProgress]);

  useEffect(() => {
    if (controlledGesture || dragging) {
      return;
    }

    if (releaseAnimationRef.current) {
      releaseAnimationRef.current.stop();
    }

    releaseAnimationRef.current = animate(internalProgress, activeIndex, STANDALONE_SPRING);
  }, [activeIndex, controlledGesture, dragging, internalProgress]);

  useEffect(() => {
    return () => {
      if (releaseAnimationRef.current) {
        releaseAnimationRef.current.stop();
      }
    };
  }, []);

  useMotionValueEvent(effectiveProgress, 'change', (value) => {
    const nextIndex = Math.min(items.length - 1, Math.max(0, Math.round(value)));
    setPreviewIndex((current) => (current === nextIndex ? current : nextIndex));
  });

  const stopReleaseAnimation = useCallback(() => {
    if (releaseAnimationRef.current) {
      releaseAnimationRef.current.stop();
      releaseAnimationRef.current = null;
    }
  }, []);

  const finishStandaloneDrag = useCallback((payload: FloatingDockGesturePayload) => {
    const targetIndex = resolveSnapTargetIndex({
      committedIndex: activeIndex,
      progress: payload.progress,
      velocityPxPerMs: payload.velocityPxPerMs,
      unitWidth: payload.unitWidth,
      maxIndex: items.length - 1,
    });
    const targetItem = items[targetIndex];

    setInternalDragging(false);
    suppressClicksUntilRef.current = Date.now() + CLICK_SUPPRESSION_MS;

    if (!targetItem || payload.cancelled) {
      releaseAnimationRef.current = animate(internalProgress, activeIndex, STANDALONE_SPRING);
      return;
    }

    if (isPrimaryTabRouteActive(location.pathname, targetItem.path)) {
      releaseAnimationRef.current = animate(internalProgress, targetIndex, STANDALONE_SPRING);
      return;
    }

    navigate(targetItem.path);
  }, [activeIndex, internalProgress, items, location.pathname, navigate]);

  const handleItemPress = useCallback((item: MobilePrimaryTab, index: number) => {
    if (Date.now() < suppressClicksUntilRef.current) {
      return;
    }

    if (onItemPress) {
      onItemPress(item, index);
      return;
    }

    if (!isPrimaryTabRouteActive(location.pathname, item.path)) {
      navigate(item.path);
      return;
    }

    stopReleaseAnimation();
    releaseAnimationRef.current = animate(internalProgress, index, STANDALONE_SPRING);
  }, [internalProgress, location.pathname, navigate, onItemPress, stopReleaseAnimation]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (desktopDock || (!event.isPrimary) || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const { itemWidth } = getRailProgress(event.clientX, rect, items.length);

    dragStateRef.current = {
      pointerId: event.pointerId,
      mode: 'pending',
      rect,
      itemWidth,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocityPxPerMs: 0,
    };

    setPressedIndex(previewIndex);
  }, [desktopDock, items.length, previewIndex]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    const dt = Math.max(event.timeStamp - dragState.lastTime, 1);
    dragState.velocityPxPerMs = (event.clientX - dragState.lastX) / dt;
    dragState.lastX = event.clientX;
    dragState.lastTime = event.timeStamp;

    if (dragState.mode === 'pending') {
      if (Math.abs(dy) > Math.abs(dx) + 6) {
        dragStateRef.current = null;
        setPressedIndex(null);
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        return;
      }

      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy) + 4) {
        return;
      }

      dragState.mode = 'dragging';
      stopReleaseAnimation();
      event.currentTarget.setPointerCapture(event.pointerId);

      if (controlledGesture && onDragStart) {
        const { progress: nextProgress } = getRailProgress(event.clientX, dragState.rect, items.length);
        onDragStart({
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          timeStamp: event.timeStamp,
          progress: nextProgress,
          velocityPxPerMs: dragState.velocityPxPerMs,
          unitWidth: dragState.itemWidth,
        });
      } else {
        setInternalDragging(true);
      }

      setPressedIndex(null);
    }

    const { progress: nextProgress } = getRailProgress(event.clientX, dragState.rect, items.length);

    if (controlledGesture && onDragMove) {
      onDragMove({
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        timeStamp: event.timeStamp,
        progress: nextProgress,
        velocityPxPerMs: dragState.velocityPxPerMs,
        unitWidth: dragState.itemWidth,
      });
    } else {
      internalProgress.set(nextProgress);
    }

    if (event.cancelable) {
      event.preventDefault();
    }
  }, [controlledGesture, internalProgress, items.length, onDragMove, onDragStart, stopReleaseAnimation]);

  const handlePointerFinish = useCallback((event: React.PointerEvent<HTMLDivElement>, cancelled = false) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    setPressedIndex(null);

    if (dragState.mode !== 'dragging') {
      return;
    }

    const elapsed = Math.max(event.timeStamp - dragState.lastTime, 1);
    const tailVelocityPxPerMs = (event.clientX - dragState.lastX) / elapsed;
    const velocityPxPerMs = Number.isFinite(tailVelocityPxPerMs) ? tailVelocityPxPerMs : dragState.velocityPxPerMs;
    const progressValue = controlledGesture ? (progress?.get() ?? activeIndex) : internalProgress.get();

    const payload: FloatingDockGesturePayload = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      timeStamp: event.timeStamp,
      progress: progressValue,
      velocityPxPerMs,
      unitWidth: dragState.itemWidth,
      cancelled,
    };

    if (controlledGesture && onDragEnd) {
      onDragEnd(payload);
      return;
    }

    finishStandaloneDrag(payload);
  }, [activeIndex, controlledGesture, finishStandaloneDrag, internalProgress, onDragEnd, progress]);

  const handlePointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    handlePointerFinish(event, true);
  }, [handlePointerFinish]);

  const handleClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() < suppressClicksUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  if (forceHidden) {
    return null;
  }

  const padX = compactDock ? 8 : 10;
  const padY = compactDock ? 7 : 8;
  const visualIndex = dragging ? previewIndex : activeIndex;

  return (
    <div
      data-testid="floating-dock"
      className={desktopDock
        ? 'fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4 pointer-events-none'
        : 'fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 pb-[max(0.9rem,calc(env(safe-area-inset-bottom)+0.15rem))] pt-2 pointer-events-none sm:px-4'}
    >
      {desktopDock ? (
        <nav
          data-testid="floating-dock-rail"
          aria-label="Navegacion principal desktop"
          className="pointer-events-auto flex items-center gap-2 rounded-[30px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.58))] px-3 py-2 shadow-[0_14px_36px_rgba(15,23,42,0.12)] backdrop-blur-[20px] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.66))]"
          data-tour="features"
        >
          {items.map((item) => (
            <DesktopNavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={isPrimaryTabRouteActive(effectivePath, item.path)}
              onClick={() => handleItemPress(item, items.findIndex((entry) => entry.id === item.id))}
              tourId={item.tourId}
            />
          ))}
        </nav>
      ) : (
        <div
          ref={pointerRailRef}
          data-testid="floating-dock-rail"
          className="pointer-events-auto relative w-full max-w-[min(92vw,34rem)] overflow-hidden rounded-[24px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.58))] shadow-[0_16px_36px_rgba(15,23,42,0.14)] backdrop-blur-[18px] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.68))]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerFinish}
          onPointerCancel={handlePointerCancel}
          onClickCapture={handleClickCapture}
          style={{
            padding: `${padY}px ${padX}px`,
            touchAction: 'none',
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 right-0 opacity-100"
          >
            <div
              className="absolute bottom-[8px] left-[10px] right-[10px] top-[8px] rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08))] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))]"
            />
          </div>

          <motion.div
            aria-hidden="true"
            data-testid="floating-dock-indicator"
            className="pointer-events-none absolute z-0 rounded-[18px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,0.66))] shadow-[0_10px_22px_rgba(15,23,42,0.12)] dark:border-white/12 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08))]"
            style={{
              top: padY,
              bottom: padY,
              left: padX,
              width: `calc((100% - ${padX * 2}px) / ${items.length})`,
              x: indicatorX,
              scaleX: dragging ? 1.035 : 1,
              scaleY: dragging ? 1.015 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: dragging ? 760 : 640,
              damping: dragging ? 46 : 40,
              mass: 0.2,
            }}
          >
            <div className="absolute inset-x-3 top-1.5 h-px rounded-full bg-white/90 dark:bg-white/10" />
            <div className="absolute inset-x-[22%] bottom-1.5 h-px rounded-full bg-slate-400/12 dark:bg-white/8" />
          </motion.div>

          <nav
            aria-label="Navegacion principal"
            className="relative z-10 flex items-stretch justify-between gap-1"
            data-tour="features"
          >
            {items.map((item, index) => {
              const isCommittedActive = activeIndex === index;
              const isVisualActive = visualIndex === index;
              const isPressed = pressedIndex === index;
              const isHovered = hoveredIndex === index && canHover;

              return (
                <div key={item.id} className="relative flex min-w-0 flex-1">
                  {index > 0 && (
                    <div className="pointer-events-none absolute inset-y-3 left-0 w-px bg-white/55 dark:bg-white/7" />
                  )}
                  <button
                    type="button"
                    aria-current={isCommittedActive ? 'page' : undefined}
                    data-tour={item.tourId}
                    data-active={isCommittedActive ? 'true' : 'false'}
                    data-dragging={dragging && isVisualActive ? 'true' : 'false'}
                    data-pressed={isPressed ? 'true' : 'false'}
                    data-hovered={isHovered ? 'true' : 'false'}
                    onClick={() => handleItemPress(item, index)}
                    onPointerDown={() => setPressedIndex(index)}
                    onPointerUp={() => setPressedIndex(null)}
                    onPointerLeave={() => {
                      setPressedIndex(null);
                      setHoveredIndex(null);
                    }}
                    onPointerEnter={() => {
                      if (canHover) {
                        setHoveredIndex(index);
                      }
                    }}
                    className={`relative flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[18px] px-1.5 py-2 text-center outline-none transition-[color,transform,opacity,background-color] duration-150 ${
                      isPressed
                        ? 'scale-[0.992] bg-white/20 dark:bg-white/6'
                        : isHovered
                          ? 'bg-white/14 dark:bg-white/4'
                          : ''
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined relative z-10 transition-colors duration-150 ${
                        compactDock ? 'text-[1.32rem]' : 'text-[1.46rem]'
                      } ${
                        isVisualActive
                          ? 'text-slate-950 dark:text-white'
                          : 'text-slate-500 dark:text-slate-300'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span
                      className={`relative z-10 truncate text-[11px] font-semibold tracking-[-0.01em] transition-colors duration-150 ${
                        isVisualActive
                          ? 'text-slate-950 dark:text-white'
                          : 'text-slate-500 dark:text-slate-300/90'
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}

export default FloatingDock;
