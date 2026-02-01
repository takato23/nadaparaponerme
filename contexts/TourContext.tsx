/**
 * TourContext - Global state management for onboarding tours
 *
 * Manages:
 * - Whether to show the initial onboarding tour
 * - Feature-specific tour completion tracking
 * - First-time visit detection per feature
 */

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// Tour IDs for tracking
export type TourId =
    | 'main-onboarding'
    | 'closet-tour'
    | 'stylist-tour'
    | 'studio-tour'
    | 'community-tour';

interface TourContextType {
    // Main onboarding tour
    showMainTour: boolean;
    startMainTour: () => void;
    completeMainTour: () => void;
    skipMainTour: () => void;

    // Feature tours
    hasSeenTour: (tourId: TourId) => boolean;
    markTourAsSeen: (tourId: TourId) => void;
    resetTour: (tourId: TourId) => void;
    resetAllTours: () => void;

    // Current active tour
    activeTour: TourId | null;
    startTour: (tourId: TourId) => void;
    endTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const TOUR_STORAGE_KEY = 'ojodeloca-tours-seen';

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [showMainTour, setShowMainTour] = useState(false);
    const [activeTour, setActiveTour] = useState<TourId | null>(null);
    const [seenTours, setSeenTours] = useState<Set<TourId>>(() => {
        try {
            const stored = localStorage.getItem(TOUR_STORAGE_KEY);
            if (stored) {
                return new Set(JSON.parse(stored) as TourId[]);
            }
        } catch {
            // Ignore parse errors
        }
        return new Set();
    });

    // Persist seen tours to localStorage
    useEffect(() => {
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(Array.from(seenTours)));
    }, [seenTours]);

    // Check if user is new (no tours seen) and show main tour
    // NOTE: Auto-start logic moved to HomeView to ensure it only starts when authenticated
    /*
    useEffect(() => {
        if (seenTours.size === 0) {
            // Small delay to let the app load first
            const timer = setTimeout(() => {
                setShowMainTour(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);
    */

    const startMainTour = useCallback(() => {
        setShowMainTour(true);
    }, []);

    const completeMainTour = useCallback(() => {
        setShowMainTour(false);
        setSeenTours(prev => new Set([...prev, 'main-onboarding']));
    }, []);

    const skipMainTour = useCallback(() => {
        setShowMainTour(false);
        setSeenTours(prev => new Set([...prev, 'main-onboarding']));
    }, []);

    const hasSeenTour = useCallback((tourId: TourId) => {
        return seenTours.has(tourId);
    }, [seenTours]);

    const markTourAsSeen = useCallback((tourId: TourId) => {
        setSeenTours(prev => new Set([...prev, tourId]));
    }, []);

    const resetTour = useCallback((tourId: TourId) => {
        setSeenTours(prev => {
            const newSet = new Set(prev);
            newSet.delete(tourId);
            return newSet;
        });
    }, []);

    const resetAllTours = useCallback(() => {
        setSeenTours(new Set());
        localStorage.removeItem(TOUR_STORAGE_KEY);
    }, []);

    const startTour = useCallback((tourId: TourId) => {
        setActiveTour(tourId);
    }, []);

    const endTour = useCallback(() => {
        if (activeTour) {
            setSeenTours(prev => new Set([...prev, activeTour]));
        }
        setActiveTour(null);
    }, [activeTour]);

    return (
        <TourContext.Provider
            value={{
                showMainTour,
                startMainTour,
                completeMainTour,
                skipMainTour,
                hasSeenTour,
                markTourAsSeen,
                resetTour,
                resetAllTours,
                activeTour,
                startTour,
                endTour,
            }}
        >
            {children}
        </TourContext.Provider>
    );
};

export const useTour = (): TourContextType => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};

// Hook for first-time feature visits
export const useFirstVisit = (tourId: TourId) => {
    const { hasSeenTour, markTourAsSeen } = useTour();
    const isFirstVisit = !hasSeenTour(tourId);

    const markAsSeen = useCallback(() => {
        markTourAsSeen(tourId);
    }, [tourId, markTourAsSeen]);

    return { isFirstVisit, markAsSeen };
};
