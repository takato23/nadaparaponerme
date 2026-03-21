import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BillingSummaryPayload } from '../src/services/billingCatalogService';
import { fetchBillingSummary, persistBillingSummaryCache, readBillingSummaryCache } from '../src/services/billingCatalogService';

export function useBillingSummary() {
  const [data, setData] = useState<BillingSummaryPayload | null>(() => readBillingSummaryCache());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const next = await fetchBillingSummary();
      setData(next);
      persistBillingSummaryCache(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar billing-summary';
      if (message.includes('billing-summary disabled on localhost dev')) {
        setData(null);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const visiblePlans = useMemo(
    () => (data?.catalog || []).filter((plan) => plan.visible),
    [data],
  );

  return {
    data,
    visiblePlans,
    isLoading,
    error,
    refresh,
  };
}
