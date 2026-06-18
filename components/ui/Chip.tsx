import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Props for {@link Chip}.
 */
export interface ChipProps {
  /** Visible label */
  label: string;
  /** Selected (active) state */
  selected?: boolean;
  /** Called when the chip body is clicked */
  onClick?: () => void;
  /** When provided, renders a small remove (close) button */
  onRemove?: () => void;
  /** Optional Material Symbols icon name shown before the label */
  icon?: string;
  /** Custom class names */
  className?: string;
}

/**
 * Chip
 *
 * A rounded, tappable pill used for tags, filters, and selectable options.
 * Mirrors the inline chip pattern used across the app but adds icon and
 * removable support.
 *
 * @example
 * ```tsx
 * <Chip label="Verano" icon="wb_sunny" selected={isSelected} onClick={toggle} />
 * <Chip label="Casual" onRemove={() => remove('Casual')} />
 * ```
 */
export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onClick,
  onRemove,
  icon,
  className
}) => {
  const isInteractive = typeof onClick === 'function';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5',
        'text-sm font-medium',
        'transition-transform active:scale-95',
        selected
          ? 'bg-primary text-white shadow-soft'
          : 'bg-gray-100 text-text-secondary dark:bg-gray-800 dark:text-gray-300',
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!isInteractive}
        aria-pressed={isInteractive ? selected : undefined}
        className={cn(
          'inline-flex min-h-[28px] items-center gap-1.5 touch-manipulation select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full',
          isInteractive ? 'cursor-pointer' : 'cursor-default'
        )}
      >
        {icon && (
          <span className="material-symbols-outlined text-base leading-none">
            {icon}
          </span>
        )}
        <span>{label}</span>
      </button>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Quitar ${label}`}
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            'touch-manipulation transition-colors',
            selected
              ? 'text-white/80 hover:bg-white/20 hover:text-white'
              : 'text-text-secondary hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          )}
        >
          <span className="material-symbols-outlined text-base leading-none">
            close
          </span>
        </button>
      )}
    </span>
  );
};

Chip.displayName = 'Chip';

export default Chip;
