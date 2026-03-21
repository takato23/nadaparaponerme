import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface SurfaceTourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  position: TourPosition;
}

interface SurfaceTourProps {
  steps: SurfaceTourStep[];
  introTitle: string;
  introDescription: string;
  introIcon?: string;
  ctaLabel?: string;
  dismissLabel?: string;
  targetAttribute?: string;
  dockTooltipOnDesktop?: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const TOUR_VIEWPORT_PADDING = 12;
const TOUR_TOOLTIP_GAP = 14;
const TOUR_TOOLTIP_MAX_WIDTH = 380;
const TOUR_TOOLTIP_ESTIMATED_HEIGHT = 290;
const TOUR_HIGHLIGHT_PADDING = 4;
const MOBILE_BREAKPOINT = 768;
const MOBILE_TOUR_SHEET_HEIGHT = 340;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isMobileViewport = (): boolean => (
  typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
);

const getHighlightRadius = (targetRect: DOMRect | null): number => {
  if (!targetRect) return 24;
  const size = Math.min(targetRect.width, targetRect.height);
  return clamp(Math.round(size * 0.22), 16, 28);
};

const getScrollableAncestors = (element: HTMLElement): Array<HTMLElement | Window> => {
  const scrollableAncestors: Array<HTMLElement | Window> = [window];
  let parent = element.parentElement;

  while (parent) {
    const styles = window.getComputedStyle(parent);
    const overflowY = styles.overflowY;
    const overflow = styles.overflow;
    const canScroll = /(auto|scroll|overlay)/.test(overflowY) || /(auto|scroll|overlay)/.test(overflow);

    if (canScroll && parent.scrollHeight > parent.clientHeight) {
      scrollableAncestors.unshift(parent);
    }

    parent = parent.parentElement;
  }

  return scrollableAncestors;
};

const isVisibleTarget = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  return rect.width > 0
    && rect.height > 0
    && styles.display !== 'none'
    && styles.visibility !== 'hidden'
    && styles.opacity !== '0';
};

const resolveTourTarget = (target: string, attribute: string): HTMLElement | null => {
  const selector = `[${attribute}="${target}"]`;
  const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return matches.find((element) => isVisibleTarget(element)) ?? document.getElementById(target);
};

const buildTooltipStyle = (
  targetRect: DOMRect | null,
  position: TourPosition,
  dockTooltipOnDesktop: boolean,
): React.CSSProperties => {
  if (typeof window === 'undefined') {
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const tooltipWidth = Math.min(TOUR_TOOLTIP_MAX_WIDTH, window.innerWidth - TOUR_VIEWPORT_PADDING * 2);
  const isDesktopDocked = dockTooltipOnDesktop && window.innerWidth >= 1024;
  const isMobile = isMobileViewport();

  if (isDesktopDocked) {
    return {
      position: 'fixed',
      width: `${tooltipWidth}px`,
      maxWidth: `calc(100vw - ${TOUR_VIEWPORT_PADDING * 2}px)`,
      right: `${Math.max(TOUR_VIEWPORT_PADDING, 24)}px`,
      bottom: `${Math.max(TOUR_VIEWPORT_PADDING, 24)}px`,
    };
  }

  if (!targetRect || position === 'center') {
    return {
      position: 'fixed',
      width: `${tooltipWidth}px`,
      maxWidth: `calc(100vw - ${TOUR_VIEWPORT_PADDING * 2}px)`,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  if (isMobile) {
    return {
      position: 'fixed',
      width: `${tooltipWidth}px`,
      maxWidth: `calc(100vw - ${TOUR_VIEWPORT_PADDING * 2}px)`,
      left: '50%',
      bottom: `${Math.max(TOUR_VIEWPORT_PADDING, 20)}px`,
      transform: 'translateX(-50%)',
      maxHeight: `min(${MOBILE_TOUR_SHEET_HEIGHT}px, calc(100dvh - ${TOUR_VIEWPORT_PADDING * 2}px))`,
    };
  }

  const minLeft = TOUR_VIEWPORT_PADDING;
  const maxLeft = Math.max(minLeft, window.innerWidth - tooltipWidth - TOUR_VIEWPORT_PADDING);
  const minTop = TOUR_VIEWPORT_PADDING;
  const maxTop = Math.max(minTop, window.innerHeight - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_VIEWPORT_PADDING);

  let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  let top = targetRect.bottom + TOUR_TOOLTIP_GAP;

  if (position === 'top') {
    top = targetRect.top - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_TOOLTIP_GAP;
  }
  if (position === 'left') {
    left = targetRect.left - tooltipWidth - TOUR_TOOLTIP_GAP;
    top = targetRect.top + targetRect.height / 2 - TOUR_TOOLTIP_ESTIMATED_HEIGHT / 2;
  }
  if (position === 'right') {
    left = targetRect.right + TOUR_TOOLTIP_GAP;
    top = targetRect.top + targetRect.height / 2 - TOUR_TOOLTIP_ESTIMATED_HEIGHT / 2;
  }

  if (position === 'top' && top < minTop) {
    top = targetRect.bottom + TOUR_TOOLTIP_GAP;
  } else if (position === 'bottom' && top > maxTop) {
    top = targetRect.top - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_TOOLTIP_GAP;
  }

  if (position === 'left' && left < minLeft) {
    left = targetRect.right + TOUR_TOOLTIP_GAP;
  } else if (position === 'right' && left > maxLeft) {
    left = targetRect.left - tooltipWidth - TOUR_TOOLTIP_GAP;
  }

  return {
    position: 'fixed',
    width: `${tooltipWidth}px`,
    maxWidth: `calc(100vw - ${TOUR_VIEWPORT_PADDING * 2}px)`,
    left: `${clamp(left, minLeft, maxLeft)}px`,
    top: `${clamp(top, minTop, maxTop)}px`,
  };
};

export function SurfaceTour({
  steps,
  introTitle,
  introDescription,
  introIcon = '✨',
  ctaLabel = 'Sí, mostrame',
  dismissLabel = 'No, ya sé usarlo',
  targetAttribute = 'data-surface-tour',
  dockTooltipOnDesktop = false,
  onComplete,
  onSkip,
}: SurfaceTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showInitialModal, setShowInitialModal] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const activeSteps = useMemo(
    () => steps.filter((surfaceStep) => resolveTourTarget(surfaceStep.target, targetAttribute)),
    [steps, targetAttribute],
  );

  const step = activeSteps[currentStep];
  const isLastStep = currentStep === activeSteps.length - 1;
  const highlightRadius = useMemo(() => getHighlightRadius(targetRect), [targetRect]);
  const tooltipStyle = useMemo(
    () => buildTooltipStyle(targetRect, step?.position || 'center', dockTooltipOnDesktop),
    [dockTooltipOnDesktop, step?.position, targetRect],
  );

  useEffect(() => {
    if (!step || showInitialModal) {
      setTargetRect(null);
      return;
    }

    let frameId: number | null = null;
    let scrollTimeoutId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const updateTargetRect = () => {
      const targetElement = resolveTourTarget(step.target, targetAttribute);
      if (!targetElement) {
        setTargetRect(null);
        return;
      }
      setTargetRect(targetElement.getBoundingClientRect());
    };

    const ensureTargetInView = () => {
      const targetElement = resolveTourTarget(step.target, targetAttribute);
      if (!targetElement) {
        setTargetRect(null);
        return;
      }

      const viewportPadding = dockTooltipOnDesktop && window.innerWidth >= 1024 ? 32 : 24;
      const scrollParents = getScrollableAncestors(targetElement);
      const mobileOffset = isMobileViewport()
        ? Math.max(220, Math.min(window.innerHeight * 0.42, MOBILE_TOUR_SHEET_HEIGHT))
        : 0;

      scrollParents.forEach((parent) => {
        if (parent === window) {
          const rect = targetElement.getBoundingClientRect();
          const availableTop = viewportPadding;
          const availableBottom = window.innerHeight - viewportPadding - mobileOffset;
          let desiredTop: number | null = null;

          if (rect.top < availableTop) {
            desiredTop = Math.max(0, window.scrollY + rect.top - availableTop);
          } else if (rect.bottom > availableBottom) {
            desiredTop = Math.max(0, window.scrollY + (rect.bottom - availableBottom));
          }

          if (desiredTop !== null && Math.abs(desiredTop - window.scrollY) > 1) {
            window.scrollTo({ top: desiredTop, behavior: 'auto' });
          }
          return;
        }

        const parentRect = parent.getBoundingClientRect();
        const rect = targetElement.getBoundingClientRect();
        const availableTop = parentRect.top + viewportPadding;
        const availableBottom = parentRect.bottom - viewportPadding - mobileOffset;
        let desiredTop: number | null = null;

        if (rect.top < availableTop) {
          desiredTop = parent.scrollTop + (rect.top - availableTop);
        } else if (rect.bottom > availableBottom) {
          desiredTop = parent.scrollTop + (rect.bottom - availableBottom);
        }

        if (desiredTop !== null && Math.abs(desiredTop - parent.scrollTop) > 1) {
          parent.scrollTo({ top: Math.max(0, desiredTop), behavior: 'auto' });
        }
      });

      scrollTimeoutId = window.setTimeout(() => {
        frameId = window.requestAnimationFrame(() => {
          updateTargetRect();
          window.requestAnimationFrame(updateTargetRect);
        });
      }, 80);

      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(updateTargetRect);
        resizeObserver.observe(targetElement);
      }
    };

    const handleViewportChange = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(updateTargetRect);
    };

    ensureTargetInView();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (scrollTimeoutId !== null) {
        window.clearTimeout(scrollTimeoutId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [dockTooltipOnDesktop, showInitialModal, step, targetAttribute]);

  useEffect(() => {
    if (showInitialModal || !isMobileViewport()) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showInitialModal]);

  if (activeSteps.length === 0 || typeof document === 'undefined') {
    return null;
  }

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const introModal = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
          style={{
            maxHeight: 'calc(100dvh - 1.5rem)',
            paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-3xl">
              <span>{introIcon}</span>
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">{introTitle}</h2>
            <p className="mb-6 text-sm text-gray-600">{introDescription}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowInitialModal(false)}
                className="w-full rounded-xl bg-[#1b1a17] px-4 py-3 font-semibold text-white transition hover:bg-[#2a2925]"
              >
                {ctaLabel}
              </button>
              <button
                onClick={onSkip}
                className="w-full px-4 py-3 font-medium text-gray-500 transition hover:text-gray-700"
              >
                {dismissLabel}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (showInitialModal) {
    return createPortal(introModal, document.body);
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/35"
        onClick={onSkip}
      />

      {targetRect && (
        <motion.div
          key={`${step.id}-highlight`}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed z-[45] rounded-2xl border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
          style={{
            top: `${targetRect.top - TOUR_HIGHLIGHT_PADDING}px`,
            left: `${targetRect.left - TOUR_HIGHLIGHT_PADDING}px`,
            width: `${targetRect.width + TOUR_HIGHLIGHT_PADDING * 2}px`,
            height: `${targetRect.height + TOUR_HIGHLIGHT_PADDING * 2}px`,
            borderRadius: `${highlightRadius}px`,
          }}
        />
      )}

      <motion.div
        key={step.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed z-50"
        style={tooltipStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="overflow-y-auto rounded-[24px] bg-white p-5 shadow-2xl sm:rounded-2xl"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        >
          <div className="mb-4 flex justify-center gap-1.5">
            {activeSteps.map((tourStep, idx) => (
              <div
                key={tourStep.id}
                className={`h-2 w-2 rounded-full transition-colors ${idx === currentStep ? 'bg-[#1b1a17]' : 'bg-gray-200'}`}
              />
            ))}
          </div>

          <h3 className="mb-2 text-lg font-bold text-gray-900">{step.title}</h3>
          <p className="mb-4 text-sm text-gray-600">{step.description}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`rounded-lg px-4 py-2 font-medium transition ${currentStep === 0 ? 'cursor-not-allowed text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Anterior
            </button>

            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Saltar tour
            </button>

            <button
              onClick={handleNext}
              className="rounded-lg bg-[#1b1a17] px-4 py-2 font-medium text-white transition hover:bg-[#2a2925]"
            >
              {isLastStep ? 'Listo' : 'Siguiente'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

export default SurfaceTour;
