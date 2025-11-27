import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
    isOnline: boolean;
    wasOffline: boolean; // True if was offline and just came back online
    effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'; // Connection quality
    downlink?: number; // Mbps
    rtt?: number; // Round-trip time in ms
}

/**
 * Hook to monitor network connection status
 * Provides real-time online/offline detection with connection quality info
 */
export function useNetworkStatus(): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        wasOffline: false,
    });

    const updateNetworkInfo = useCallback(() => {
        const connection = (navigator as any).connection ||
            (navigator as any).mozConnection ||
            (navigator as any).webkitConnection;

        setStatus(prev => ({
            ...prev,
            isOnline: navigator.onLine,
            effectiveType: connection?.effectiveType,
            downlink: connection?.downlink,
            rtt: connection?.rtt,
        }));
    }, []);

    const handleOnline = useCallback(() => {
        setStatus(prev => ({
            ...prev,
            isOnline: true,
            wasOffline: !prev.isOnline, // Only true if we were offline
        }));
        updateNetworkInfo();

        // Reset wasOffline after a short delay
        setTimeout(() => {
            setStatus(prev => ({ ...prev, wasOffline: false }));
        }, 5000);
    }, [updateNetworkInfo]);

    const handleOffline = useCallback(() => {
        setStatus(prev => ({
            ...prev,
            isOnline: false,
            wasOffline: false,
        }));
    }, []);

    useEffect(() => {
        // Initial check
        updateNetworkInfo();

        // Listen for online/offline events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for connection changes (if supported)
        const connection = (navigator as any).connection ||
            (navigator as any).mozConnection ||
            (navigator as any).webkitConnection;

        if (connection) {
            connection.addEventListener('change', updateNetworkInfo);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (connection) {
                connection.removeEventListener('change', updateNetworkInfo);
            }
        };
    }, [handleOnline, handleOffline, updateNetworkInfo]);

    return status;
}

export default useNetworkStatus;
