import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { onboardingTourSteps, type OnboardingStep } from '../../data/helpContent';

interface OnboardingTourProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onAction?: (handler: string) => void;
}

const TOUR_VIEWPORT_PADDING = 12;
const TOUR_TOOLTIP_GAP = 14;
const TOUR_TOOLTIP_MAX_WIDTH = 380;
const TOUR_TOOLTIP_ESTIMATED_HEIGHT = 300;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const buildTooltipStyle = (
  highlightRect: DOMRect | null,
  position: OnboardingStep['position']
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

  if (!highlightRect || position === 'center') {
    return {
      position: 'fixed',
      width: `${tooltipWidth}px`,
      maxWidth: `calc(100vw - ${TOUR_VIEWPORT_PADDING * 2}px)`,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const minLeft = TOUR_VIEWPORT_PADDING;
  const maxLeft = Math.max(minLeft, window.innerWidth - tooltipWidth - TOUR_VIEWPORT_PADDING);
  const minTop = TOUR_VIEWPORT_PADDING;
  const maxTop = Math.max(minTop, window.innerHeight - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_VIEWPORT_PADDING);

  let left = highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2;
  let top = highlightRect.bottom + TOUR_TOOLTIP_GAP;

  if (position === 'top') {
    top = highlightRect.top - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_TOOLTIP_GAP;
  }
  if (position === 'left') {
    left = highlightRect.left - tooltipWidth - TOUR_TOOLTIP_GAP;
    top = highlightRect.top + highlightRect.height / 2 - TOUR_TOOLTIP_ESTIMATED_HEIGHT / 2;
  }
  if (position === 'right') {
    left = highlightRect.right + TOUR_TOOLTIP_GAP;
    top = highlightRect.top + highlightRect.height / 2 - TOUR_TOOLTIP_ESTIMATED_HEIGHT / 2;
  }

  if (position === 'top' && top < minTop) {
    top = highlightRect.bottom + TOUR_TOOLTIP_GAP;
  } else if (position === 'bottom' && top > maxTop) {
    top = highlightRect.top - TOUR_TOOLTIP_ESTIMATED_HEIGHT - TOUR_TOOLTIP_GAP;
  }

  if (position === 'left' && left < minLeft) {
    left = highlightRect.right + TOUR_TOOLTIP_GAP;
  } else if (position === 'right' && left > maxLeft) {
    left = highlightRect.left - tooltipWidth - TOUR_TOOLTIP_GAP;
  }

  return {
    position: 'fixed',
    width: `${tooltipWidth}px`,
    maxWidth: `calc(100vw - ${TOUR_VIEWPORT_PADDING * 2}px)`,
    left: `${clamp(left, minLeft, maxLeft)}px`,
    top: `${clamp(top, minTop, maxTop)}px`,
  };
};

const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onComplete,
  onSkip,
  onAction
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = onboardingTourSteps[currentStep];
  const isLastStep = currentStep === onboardingTourSteps.length - 1;
  const progress = ((currentStep + 1) / onboardingTourSteps.length) * 100;
  const tooltipStyle = useMemo(
    () => buildTooltipStyle(highlightRect, step.position),
    [highlightRect, step.position]
  );

  // Update highlight position when step changes
  useEffect(() => {
    if (!isOpen || !step?.targetSelector) {
      setHighlightRect(null);
      return;
    }

    let frameId: number | null = null;
    let scrollTimeoutId: number | null = null;
    let retryTimeoutId: number | null = null;
    let animationTimeoutId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const resolveTarget = () => document.querySelector<HTMLElement>(step.targetSelector!);

    const updateHighlight = () => {
      const element = resolveTarget();
      if (!element) {
        setHighlightRect(null);
        return;
      }
      setHighlightRect(element.getBoundingClientRect());
    };

    const syncTarget = () => {
      const element = resolveTarget();
      if (!element) {
        setHighlightRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      const viewportPadding = 24;
      const isOutsideViewport = rect.top < viewportPadding || rect.bottom > window.innerHeight - viewportPadding;

      if (isOutsideViewport) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: step.position === 'top' ? 'end' : 'center',
          inline: 'nearest',
        });
        scrollTimeoutId = window.setTimeout(() => {
          frameId = window.requestAnimationFrame(updateHighlight);
        }, 220);
      } else {
        setHighlightRect(rect);
      }

      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(updateHighlight);
        resizeObserver.observe(element);
      }
    };

    const handleViewportChange = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      frameId = window.requestAnimationFrame(updateHighlight);
    };

    setIsAnimating(true);
    syncTarget();
    retryTimeoutId = window.setTimeout(updateHighlight, 250);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    animationTimeoutId = window.setTimeout(() => setIsAnimating(false), 280);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (scrollTimeoutId !== null) {
        window.clearTimeout(scrollTimeoutId);
      }
      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId);
      }
      if (animationTimeoutId !== null) {
        window.clearTimeout(animationTimeoutId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, currentStep, step?.targetSelector, step?.position]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleAction = () => {
    if (step?.action?.handler) {
      if (step.action.handler === 'completeTour') {
        onComplete();
      } else if (onAction) {
        onAction(step.action.handler);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, onSkip]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop with spotlight */}
      <div className="absolute inset-0 bg-black/70 transition-all duration-300">
        {highlightRect && (
          <div
            className="absolute bg-transparent rounded-2xl ring-4 ring-primary ring-offset-4 ring-offset-transparent transition-all duration-300 ease-out"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)'
            }}
          />
        )}
      </div>

      {/* Tooltip Card */}
      <div
        className={`
          bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden
          transition-all duration-300 ease-out
          ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}
        style={tooltipStyle}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-slate-700">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center animate-bounce-slow">
            <span className="material-symbols-outlined text-primary text-3xl">
              {step.icon}
            </span>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 mb-4">
            {onboardingTourSteps.map((_, idx) => (
              <div
                key={idx}
                className={`
                  h-1.5 rounded-full transition-all duration-300
                  ${idx === currentStep
                    ? 'w-6 bg-primary'
                    : idx < currentStep
                      ? 'w-1.5 bg-primary/50'
                      : 'w-1.5 bg-gray-300 dark:bg-slate-600'
                  }
                `}
              />
            ))}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-text-primary dark:text-gray-100 text-center mb-2">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-text-secondary dark:text-gray-400 text-center leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          {/* Primary action */}
          {step.action ? (
            <button
              onClick={handleAction}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-98"
            >
              {step.action.label}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-98"
            >
              {isLastStep ? 'Empezar' : 'Siguiente'}
            </button>
          )}

          {/* Secondary actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors
                ${currentStep === 0
                  ? 'text-gray-300 dark:text-slate-600 cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-slate-800'
                }
              `}
            >
              Anterior
            </button>

            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Saltar tour
            </button>
          </div>
        </div>
      </div>

      {/* Keyboard hint */}
      <div className="fixed bottom-safe-4 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white/70 text-sm">
        <span>Usá</span>
        <kbd className="px-2 py-0.5 bg-white/20 rounded text-xs">←</kbd>
        <kbd className="px-2 py-0.5 bg-white/20 rounded text-xs">→</kbd>
        <span>para navegar</span>
        <span className="mx-2">|</span>
        <kbd className="px-2 py-0.5 bg-white/20 rounded text-xs">Esc</kbd>
        <span>para salir</span>
      </div>
    </div>
  );
};

export default OnboardingTour;
