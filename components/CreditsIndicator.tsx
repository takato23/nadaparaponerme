import React, { useMemo } from 'react';
import { useBillingSummary } from '../hooks/useBillingSummary';
import { getBucketSummary } from '../src/services/billingCatalogService';

interface CreditsIndicatorProps {
  variant?: 'badge' | 'compact' | 'minimal';
  className?: string;
  onClick?: () => void;
}

export function CreditsIndicator({ variant = 'compact', className = '', onClick }: CreditsIndicatorProps) {
  const { data } = useBillingSummary();
  const kumbiUsage = useMemo(() => getBucketSummary(data, 'kumbi_messages'), [data]);

  if (!kumbiUsage) return null;

  const limit = kumbiUsage.monthly_limit;
  const used = kumbiUsage.used;
  const remaining = limit === -1 ? -1 : Math.max(0, limit - used - kumbiUsage.reserved);
  const percentUsed = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

  const getColor = () => {
    if (limit === -1) return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    if (remaining <= 3) return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' };
    if (percentUsed >= 70) return { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300', border: '' };
  };

  const colors = getColor();
  const isClickable = !!onClick;

  if (variant === 'minimal') {
    return (
      <button onClick={onClick} disabled={!isClickable} className={`flex items-center gap-1 ${colors.text} ${className} ${isClickable ? 'hover:opacity-80 cursor-pointer' : ''}`}>
        <span className="material-symbols-rounded text-sm">forum</span>
        <span className="text-xs font-semibold">{limit === -1 ? '∞' : remaining}</span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button onClick={onClick} disabled={!isClickable} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${colors.bg} ${remaining <= 3 ? `border ${colors.border}` : ''} ${className} ${isClickable ? 'hover:opacity-80 cursor-pointer transition-opacity' : ''}`}>
        <span className="material-symbols-rounded text-gray-500 dark:text-gray-400 text-sm">forum</span>
        <span className={`text-xs font-medium ${colors.text}`}>{limit === -1 ? '∞' : remaining}</span>
      </button>
    );
  }

  return (
    <button onClick={onClick} disabled={!isClickable} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} ${remaining <= 3 ? `border ${colors.border}` : ''} ${className} ${isClickable ? 'hover:opacity-80 cursor-pointer transition-opacity' : ''}`}>
      <span className="material-symbols-rounded text-gray-500 dark:text-gray-400">forum</span>
      <div className="flex flex-col items-start">
        <span className={`text-xs font-semibold ${colors.text}`}>{limit === -1 ? '∞' : `${used}/${limit}`}</span>
        <span className="text-xs text-gray-400">Kumbi</span>
      </div>
    </button>
  );
}

export function LowCreditsWarning() {
  const { data } = useBillingSummary();
  const kumbiUsage = useMemo(() => getBucketSummary(data, 'kumbi_messages'), [data]);

  if (!kumbiUsage || kumbiUsage.monthly_limit === -1) return null;

  const remaining = Math.max(0, kumbiUsage.monthly_limit - kumbiUsage.used - kumbiUsage.reserved);
  if (remaining > 5) return null;

  return (
    <p className="text-xs text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
      <span className="material-symbols-rounded text-sm">warning</span>
      Te quedan {remaining} mensajes de Kumbi este ciclo
    </p>
  );
}

export default CreditsIndicator;
