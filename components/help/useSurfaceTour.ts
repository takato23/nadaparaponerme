import { useEffect, useState } from 'react';

export function useSurfaceTour(storageKey: string) {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = window.localStorage.getItem(storageKey);
    if (!completed) {
      setShowTour(true);
    }
  }, [storageKey]);

  const completeTour = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, 'true');
    }
    setShowTour(false);
  };

  const skipTour = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, 'skipped');
    }
    setShowTour(false);
  };

  const resetTour = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    setShowTour(true);
  };

  return {
    showTour,
    completeTour,
    skipTour,
    resetTour,
  };
}

export default useSurfaceTour;
