import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Props for {@link ListRow}.
 */
export interface ListRowProps {
  /** Leading content, e.g. an icon circle */
  leading?: React.ReactNode;
  /** Primary text */
  title: string;
  /** Secondary text rendered beneath the title */
  subtitle?: string;
  /** Trailing content, e.g. a value, switch, or badge */
  trailing?: React.ReactNode;
  /** When provided, the row becomes a full-width button */
  onClick?: () => void;
  /** Show a trailing chevron (only meaningful when clickable) */
  showChevron?: boolean;
  /** Style the title in a destructive (red) color */
  destructive?: boolean;
  /** Custom class names applied to the row */
  className?: string;
}

/**
 * Props for {@link ListGroup}.
 */
export interface ListGroupProps {
  /** Small uppercase caption rendered above the group */
  header?: string;
  /** Caption rendered below the group */
  footer?: string;
  /** ListRow children */
  children: React.ReactNode;
  /** Custom class names applied to the inset container */
  className?: string;
}

/**
 * ListRow
 *
 * A single row inside a {@link ListGroup}. Renders as a `<button>` when
 * `onClick` is provided, otherwise a static `<div>`.
 */
export const ListRow: React.FC<ListRowProps> = ({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  showChevron = false,
  destructive = false,
  className
}) => {
  const content = (
    <>
      {leading && (
        <span className="flex shrink-0 items-center justify-center">
          {leading}
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'truncate text-[16px] font-medium',
            destructive
              ? 'text-red-500 dark:text-red-400'
              : 'text-text-primary dark:text-white'
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="truncate text-[13px] text-text-secondary dark:text-gray-400">
            {subtitle}
          </span>
        )}
      </span>

      {trailing && (
        <span className="flex shrink-0 items-center text-text-secondary dark:text-gray-400">
          {trailing}
        </span>
      )}

      {onClick && showChevron && (
        <span className="material-symbols-outlined shrink-0 text-xl text-gray-400 dark:text-gray-500">
          chevron_right
        </span>
      )}
    </>
  );

  const baseRow = cn(
    'flex items-center gap-3 px-4 py-3 min-h-[44px]',
    'border-b border-black/5 dark:border-white/10 last:border-b-0',
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          baseRow,
          'w-full text-left touch-manipulation',
          'active:bg-black/5 dark:active:bg-white/5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40'
        )}
      >
        {content}
      </button>
    );
  }

  return <div className={baseRow}>{content}</div>;
};

ListRow.displayName = 'ListRow';

/**
 * ListGroup
 *
 * An iOS-style inset grouped container for {@link ListRow} children, with an
 * optional uppercase header caption and footer.
 *
 * @example
 * ```tsx
 * <ListGroup header="Cuenta" footer="Tu información es privada.">
 *   <ListRow title="Perfil" onClick={openProfile} showChevron />
 *   <ListRow title="Cerrar sesión" destructive onClick={logout} />
 * </ListGroup>
 * ```
 */
export const ListGroup: React.FC<ListGroupProps> = ({
  header,
  footer,
  children,
  className
}) => (
  <div className="w-full">
    {header && (
      <p className="px-4 pb-1.5 text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
        {header}
      </p>
    )}

    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white dark:bg-gray-800',
        'ring-1 ring-black/5 dark:ring-white/10',
        className
      )}
    >
      {children}
    </div>

    {footer && (
      <p className="px-4 pt-1.5 text-xs text-text-secondary dark:text-gray-400">
        {footer}
      </p>
    )}
  </div>
);

ListGroup.displayName = 'ListGroup';

export default ListGroup;
