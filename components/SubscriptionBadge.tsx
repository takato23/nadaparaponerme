import { useMemo } from 'react';
import { useBillingSummary } from '../hooks/useBillingSummary';
import { getBucketSummary } from '../src/services/billingCatalogService';

interface SubscriptionBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export function SubscriptionBadge({ className = '', showDetails = false }: SubscriptionBadgeProps) {
  const { data, isLoading } = useBillingSummary();
  const kumbiUsage = useMemo(() => getBucketSummary(data, 'kumbi_messages'), [data]);
  const shoppingUsage = useMemo(() => getBucketSummary(data, 'shopping_grounded_searches'), [data]);
  const planCode = data?.current?.plan?.code || 'free';
  const planName = data?.current?.plan?.display_name || 'Free';

  if (isLoading || !kumbiUsage) return null;

  const limit = kumbiUsage.monthly_limit;
  const used = kumbiUsage.used;
  const percentage = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isNearLimit = limit !== -1 && percentage >= 80;
  const isAtLimit = limit !== -1 && used >= limit;

  const colorClass = isAtLimit
    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
    : isNearLimit
      ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
      : 'bg-green-500/10 text-green-600 dark:text-green-400';

  if (!showDetails) {
    return (
      <div className={className}>
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${colorClass}`}>
          <span className="material-symbols-outlined text-base">forum</span>
          <span className="font-medium">{limit === -1 ? '∞' : `${used}/${limit}`}</span>
          {isAtLimit && <span className="text-xs">!</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={`liquid-glass rounded-xl p-4 ${colorClass}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">forum</span>
            <span className="font-semibold">{planName}</span>
          </div>
          {isAtLimit && <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">Límite alcanzado</span>}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Mensajes de Kumbi:</span>
            <span className="font-bold">{limit === -1 ? 'Ilimitados' : `${used} / ${limit}`}</span>
          </div>

          {shoppingUsage && (
            <div className="flex justify-between text-sm">
              <span>Shopping real:</span>
              <span className="font-bold">
                {shoppingUsage.monthly_limit === -1 ? 'Ilimitado' : `${shoppingUsage.used} / ${shoppingUsage.monthly_limit}`}
              </span>
            </div>
          )}

          {limit !== -1 && (
            <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          )}
        </div>

        <p className="text-xs opacity-80 mt-2">
          {planCode === 'free'
            ? 'El shopping real con links y precios está disponible en Plus/Pro.'
            : 'Los buckets se reinician al inicio del próximo ciclo.'}
        </p>
      </div>
    </div>
  );
}

export function useRefreshSubscription() {
  return { refreshKey: 0, refresh: () => undefined };
}
