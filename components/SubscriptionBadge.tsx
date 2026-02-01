import { useState, useEffect } from 'react';
import { getUserUsageMetrics, getUserSubscription, formatUsage, getUsagePercentage, type UsageMetrics, type Subscription } from '../services/subscriptionService';

interface SubscriptionBadgeProps {
  className?: string;
  showDetails?: boolean;
}

export function SubscriptionBadge({ className = '', showDetails = false }: SubscriptionBadgeProps) {
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  async function loadSubscriptionData() {
    try {
      const [usageData, subData] = await Promise.all([
        getUserUsageMetrics(),
        getUserSubscription()
      ]);
      setUsage(usageData);
      setSubscription(subData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !usage || !subscription) {
    return null;
  }

  const usagePercentage = getUsagePercentage(usage.ai_generations_used, usage.ai_generations_limit);
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  // Color scheme based on usage
  const colorClass = isAtLimit
    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
    : isNearLimit
    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
    : 'bg-green-500/10 text-green-600 dark:text-green-400';

  return (
    <div className={`${className}`}>
      {showDetails ? (
        // Detailed view
        <div className={`liquid-glass rounded-xl p-4 ${colorClass}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              <span className="font-semibold">
                {subscription.tier === 'free' && 'Plan Gratis'}
                {subscription.tier === 'pro' && 'Plan Pro'}
                {subscription.tier === 'premium' && 'Plan Premium'}
              </span>
            </div>
            {isAtLimit && (
              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                Limite alcanzado
              </span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Creditos IA:</span>
              <span className="font-bold">
                {formatUsage(usage.ai_generations_used, usage.ai_generations_limit)}
              </span>
            </div>

            {/* Progress bar */}
            {usage.ai_generations_limit !== -1 && (
              <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isAtLimit
                      ? 'bg-red-500'
                      : isNearLimit
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, usagePercentage)}%` }}
                />
              </div>
            )}

            {isNearLimit && !isAtLimit && (
              <p className="text-xs opacity-80 mt-2">
                ⚠️ Te quedan pocos créditos este mes
              </p>
            )}

            {isAtLimit && (
              <p className="text-xs opacity-80 mt-2">
                Upgradea tu plan para obtener mas creditos
              </p>
            )}
          </div>
        </div>
      ) : (
        // Compact badge view
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${colorClass}`}>
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          <span className="font-medium">
            {formatUsage(usage.ai_generations_used, usage.ai_generations_limit)}
          </span>
          {isAtLimit && <span className="text-xs">!</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to refresh subscription badge
 * Call this after successful outfit generation
 */
export function useRefreshSubscription() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(prev => prev + 1);

  return { refreshKey, refresh };
}
