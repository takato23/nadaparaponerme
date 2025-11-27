import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for combining Tailwind CSS classes
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 *
 * @example
 * ```tsx
 * // Basic usage
 * cn('px-4 py-2', 'bg-blue-500')
 * // => 'px-4 py-2 bg-blue-500'
 *
 * // Conditional classes
 * cn('px-4', isActive && 'bg-blue-500', !isActive && 'bg-gray-500')
 * // => 'px-4 bg-blue-500' or 'px-4 bg-gray-500'
 *
 * // Override classes (tailwind-merge handles conflicts)
 * cn('px-4 py-2', 'px-8')
 * // => 'py-2 px-8' (px-4 is overridden by px-8)
 *
 * // With objects
 * cn('base-class', {
 *   'active-class': isActive,
 *   'disabled-class': isDisabled
 * })
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default cn;
