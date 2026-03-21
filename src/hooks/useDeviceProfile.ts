import { useEffect, useMemo, useState } from 'react';
import { useMatchMedia } from './useMatchMedia';

export type DeviceCapabilityProfile = 'high' | 'medium' | 'low';

type DeviceSignals = {
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  saveData: boolean;
  prefersReducedMotion: boolean;
};

export type DeviceProfile = DeviceSignals & {
  profile: DeviceCapabilityProfile;
  shouldReduceMotion: boolean;
  shouldUseLiteEffects: boolean;
  shouldDisable3D: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
    addEventListener?: (event: 'change', listener: () => void) => void;
    removeEventListener?: (event: 'change', listener: () => void) => void;
  };
  deviceMemory?: number;
};

const DEFAULT_SIGNALS: DeviceSignals = {
  hardwareConcurrency: null,
  deviceMemory: null,
  saveData: false,
  prefersReducedMotion: false,
};

function getDeviceSignals(prefersReducedMotion: boolean): DeviceSignals {
  if (typeof navigator === 'undefined') {
    return {
      ...DEFAULT_SIGNALS,
      prefersReducedMotion,
    };
  }

  const navigatorInfo = navigator as NavigatorWithConnection;
  const coresRaw = navigatorInfo.hardwareConcurrency;
  const memoryRaw = navigatorInfo.deviceMemory;

  const hardwareConcurrency =
    typeof coresRaw === 'number' && Number.isFinite(coresRaw) && coresRaw > 0
      ? coresRaw
      : null;
  const deviceMemory =
    typeof memoryRaw === 'number' && Number.isFinite(memoryRaw) && memoryRaw > 0
      ? memoryRaw
      : null;

  return {
    hardwareConcurrency,
    deviceMemory,
    saveData: navigatorInfo.connection?.saveData === true,
    prefersReducedMotion,
  };
}

function classifyDeviceProfile(signals: DeviceSignals): DeviceCapabilityProfile {
  const { saveData, deviceMemory, hardwareConcurrency, prefersReducedMotion } = signals;

  if (saveData) return 'low';
  if (deviceMemory !== null && deviceMemory <= 2) return 'low';
  if (hardwareConcurrency !== null && hardwareConcurrency <= 2) return 'low';
  if (
    prefersReducedMotion &&
    ((deviceMemory !== null && deviceMemory <= 4) ||
      (hardwareConcurrency !== null && hardwareConcurrency <= 4))
  ) {
    return 'low';
  }

  if (deviceMemory !== null && deviceMemory <= 4) return 'medium';
  if (hardwareConcurrency !== null && hardwareConcurrency <= 4) return 'medium';
  if (prefersReducedMotion) return 'medium';

  if (deviceMemory !== null && hardwareConcurrency !== null) {
    if (deviceMemory >= 6 && hardwareConcurrency >= 8) {
      return 'high';
    }
    return 'medium';
  }

  if (deviceMemory !== null) {
    return deviceMemory >= 8 ? 'high' : 'medium';
  }

  if (hardwareConcurrency !== null) {
    return hardwareConcurrency >= 8 ? 'high' : 'medium';
  }

  return 'medium';
}

export function useDeviceProfile(): DeviceProfile {
  const prefersReducedMotion = useMatchMedia('(prefers-reduced-motion: reduce)');
  const [signals, setSignals] = useState<DeviceSignals>(() =>
    getDeviceSignals(prefersReducedMotion)
  );

  useEffect(() => {
    setSignals(getDeviceSignals(prefersReducedMotion));
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const navigatorInfo = navigator as NavigatorWithConnection;
    const connection = navigatorInfo.connection;
    if (!connection || typeof connection.addEventListener !== 'function') return;

    const handleConnectionChange = () => {
      setSignals(getDeviceSignals(prefersReducedMotion));
    };

    connection.addEventListener('change', handleConnectionChange);
    return () => {
      if (typeof connection.removeEventListener === 'function') {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [prefersReducedMotion]);

  return useMemo(() => {
    const profile = classifyDeviceProfile(signals);
    const shouldReduceMotion = profile === 'low' || signals.prefersReducedMotion;

    return {
      ...signals,
      profile,
      shouldReduceMotion,
      shouldUseLiteEffects: profile === 'low',
      shouldDisable3D: profile === 'low' || signals.saveData,
    };
  }, [signals]);
}

