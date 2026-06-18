import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

/**
 * A single option within a {@link SegmentedControl}.
 */
export interface SegmentedOption<T extends string> {
  /** Stable value emitted via onChange when selected */
  value: T;
  /** Visible label */
  label: string;
  /** Optional Material Symbols icon name */
  icon?: string;
}

/**
 * Props for {@link SegmentedControl}.
 */
export interface SegmentedControlProps<T extends string> {
  /** Available segments */
  options: SegmentedOption<T>[];
  /** Currently selected value */
  value: T;
  /** Called when the user selects a different segment */
  onChange: (value: T) => void;
  /** Size preset */
  size?: 'sm' | 'md';
  /** Custom class names applied to the track */
  className?: string;
  /** Accessible label for the tablist */
  'aria-label'?: string;
}

const sizeStyles: Record<'sm' | 'md', { segment: string; text: string; icon: string }> = {
  sm: {
    segment: 'min-h-[34px] px-2.5 py-1',
    text: 'text-[13px]',
    icon: 'text-base'
  },
  md: {
    segment: 'min-h-[44px] px-3 py-2',
    text: 'text-[15px]',
    icon: 'text-lg'
  }
};

/**
 * SegmentedControl
 *
 * An iOS-style segmented control. The selected segment is rendered as an
 * elevated white pill that slides between positions using framer-motion's
 * shared layout animation (`layoutId`).
 *
 * @example
 * ```tsx
 * <SegmentedControl
 *   aria-label="Vista"
 *   options={[
 *     { value: 'grid', label: 'Cuadrícula', icon: 'grid_view' },
 *     { value: 'list', label: 'Lista', icon: 'view_list' },
 *   ]}
 *   value={view}
 *   onChange={setView}
 * />
 * ```
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  'aria-label': ariaLabel
}: SegmentedControlProps<T>): React.ReactElement {
  const styles = sizeStyles[size];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + delta + options.length) % options.length;
    const next = options[nextIndex];
    if (next) {
      onChange(next.value);
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex w-full items-stretch gap-1 rounded-2xl p-1',
        'bg-gray-100 dark:bg-gray-800',
        className
      )}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-xl',
              'touch-manipulation select-none font-medium',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              styles.segment,
              styles.text,
              isSelected
                ? 'font-semibold text-text-primary dark:text-white'
                : 'text-text-secondary dark:text-gray-400'
            )}
          >
            {isSelected && (
              <motion.span
                layoutId={`segmented-pill-${ariaLabel ?? 'default'}`}
                className="absolute inset-0 rounded-xl bg-white shadow-soft dark:bg-gray-700"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                style={{ zIndex: 0 }}
              />
            )}
            {option.icon && (
              <span
                className={cn(
                  'material-symbols-outlined relative z-10',
                  styles.icon
                )}
              >
                {option.icon}
              </span>
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

SegmentedControl.displayName = 'SegmentedControl';

export default SegmentedControl;
