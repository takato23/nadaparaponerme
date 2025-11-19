/**
 * VIEW PREFERENCES HOOK
 *
 * Manages user preferences for closet visualization.
 * Provides:
 * - View mode (grid/list/masonry)
 * - Visual theme (density, card style, etc.)
 * - Responsive breakpoint detection
 * - Persistence of preferences
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  ViewMode,
  GridDensity,
  VisualTheme,
  ViewPreferences,
  Breakpoint,
  ResponsiveConfig
} from '../types/closet';
import useLocalStorage from './useLocalStorage';

// Default visual theme
const DEFAULT_VISUAL_THEME: VisualTheme = {
  gridGap: 'normal',
  cardStyle: 'glass',
  imageRatio: 'square',
  showVersatilityScore: false,
  showItemCount: true
};

// Default preferences
const DEFAULT_PREFERENCES: ViewPreferences = {
  mobile: {
    defaultView: 'grid',
    gridColumns: 2,
    enableGestures: true,
    stickyHeader: true,
    fabEnabled: true,
    pullToRefresh: true
  },
  desktop: {
    defaultView: 'grid',
    showSidebar: true,
    sidebarWidth: 300,
    gridColumns: 5,
    hoverEffects: true,
    keyboardShortcuts: true
  },
  shared: {
    visualTheme: DEFAULT_VISUAL_THEME,
    defaultSort: {
      property: 'date',
      direction: 'desc'
    },
    defaultFilters: undefined,
    showStats: true,
    autoSave: true
  }
};

interface UseViewPreferencesOptions {
  persistKey?: string;                 // LocalStorage key for persistence
}

export function useViewPreferences(
  options: UseViewPreferencesOptions = {}
) {
  const { persistKey = 'ojodeloca-view-preferences' } = options;

  // Persist preferences
  const [preferences, setPreferences] = useLocalStorage<ViewPreferences>(
    persistKey,
    DEFAULT_PREFERENCES
  );

  // Detect current breakpoint
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop';

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  });

  // Responsive config
  const responsiveConfig: ResponsiveConfig = useMemo(() => ({
    currentBreakpoint: breakpoint,
    breakpoints: {
      mobile: 768,
      tablet: 1024,
      desktop: 1024
    }
  }), [breakpoint]);

  // Update breakpoint on window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get current view mode based on breakpoint
  const currentViewMode = useMemo((): ViewMode => {
    if (breakpoint === 'mobile') {
      return preferences.mobile.defaultView;
    } else {
      return preferences.desktop.defaultView;
    }
  }, [breakpoint, preferences]);

  // Update functions
  const updatePreferences = useCallback((updates: Partial<ViewPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...updates
    }));
  }, [setPreferences]);

  const setViewMode = useCallback((mode: ViewMode) => {
    if (breakpoint === 'mobile') {
      setPreferences(prev => ({
        ...prev,
        mobile: {
          ...prev.mobile,
          defaultView: mode
        }
      }));
    } else {
      setPreferences(prev => ({
        ...prev,
        desktop: {
          ...prev.desktop,
          defaultView: mode
        }
      }));
    }
  }, [breakpoint, setPreferences]);

  const setGridDensity = useCallback((density: GridDensity) => {
    setPreferences(prev => ({
      ...prev,
      shared: {
        ...prev.shared,
        visualTheme: {
          ...prev.shared.visualTheme,
          gridGap: density
        }
      }
    }));
  }, [setPreferences]);

  const setCardStyle = useCallback((style: 'minimal' | 'glass' | 'bordered' | 'elevated') => {
    setPreferences(prev => ({
      ...prev,
      shared: {
        ...prev.shared,
        visualTheme: {
          ...prev.shared.visualTheme,
          cardStyle: style
        }
      }
    }));
  }, [setPreferences]);

  const setImageRatio = useCallback((ratio: 'square' | 'portrait' | 'auto') => {
    setPreferences(prev => ({
      ...prev,
      shared: {
        ...prev.shared,
        visualTheme: {
          ...prev.shared.visualTheme,
          imageRatio: ratio
        }
      }
    }));
  }, [setPreferences]);

  const toggleVersatilityScore = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      shared: {
        ...prev.shared,
        visualTheme: {
          ...prev.shared.visualTheme,
          showVersatilityScore: !prev.shared.visualTheme.showVersatilityScore
        }
      }
    }));
  }, [setPreferences]);

  const toggleItemCount = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      shared: {
        ...prev.shared,
        visualTheme: {
          ...prev.shared.visualTheme,
          showItemCount: !prev.shared.visualTheme.showItemCount
        }
      }
    }));
  }, [setPreferences]);

  const toggleSidebar = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      desktop: {
        ...prev.desktop,
        showSidebar: !prev.desktop.showSidebar
      }
    }));
  }, [setPreferences]);

  const setSidebarWidth = useCallback((width: number) => {
    setPreferences(prev => ({
      ...prev,
      desktop: {
        ...prev.desktop,
        sidebarWidth: Math.max(200, Math.min(400, width)) // Clamp between 200-400px
      }
    }));
  }, [setPreferences]);

  const setGridColumns = useCallback((columns: number) => {
    if (breakpoint === 'mobile') {
      setPreferences(prev => ({
        ...prev,
        mobile: {
          ...prev.mobile,
          gridColumns: Math.max(2, Math.min(3, columns)) as 2 | 3 // Mobile: 2-3 columns
        }
      }));
    } else {
      setPreferences(prev => ({
        ...prev,
        desktop: {
          ...prev.desktop,
          gridColumns: Math.max(3, Math.min(8, columns)) // Desktop: 3-8 columns
        }
      }));
    }
  }, [breakpoint, setPreferences]);

  const toggleGestures = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      mobile: {
        ...prev.mobile,
        enableGestures: !prev.mobile.enableGestures
      }
    }));
  }, [setPreferences]);

  const toggleStickyHeader = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      mobile: {
        ...prev.mobile,
        stickyHeader: !prev.mobile.stickyHeader
      }
    }));
  }, [setPreferences]);

  const toggleFAB = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      mobile: {
        ...prev.mobile,
        fabEnabled: !prev.mobile.fabEnabled
      }
    }));
  }, [setPreferences]);

  const togglePullToRefresh = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      mobile: {
        ...prev.mobile,
        pullToRefresh: !prev.mobile.pullToRefresh
      }
    }));
  }, [setPreferences]);

  const toggleHoverEffects = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      desktop: {
        ...prev.desktop,
        hoverEffects: !prev.desktop.hoverEffects
      }
    }));
  }, [setPreferences]);

  const toggleKeyboardShortcuts = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      desktop: {
        ...prev.desktop,
        keyboardShortcuts: !prev.desktop.keyboardShortcuts
      }
    }));
  }, [setPreferences]);

  const toggleStats = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      shared: {
        ...prev.shared,
        showStats: !prev.shared.showStats
      }
    }));
  }, [setPreferences]);

  const toggleAutoSave = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      shared: {
        ...prev.shared,
        autoSave: !prev.shared.autoSave
      }
    }));
  }, [setPreferences]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, [setPreferences]);

  // Get grid columns for current breakpoint
  const currentGridColumns = useMemo(() => {
    if (breakpoint === 'mobile') {
      return preferences.mobile.gridColumns;
    } else {
      return preferences.desktop.gridColumns;
    }
  }, [breakpoint, preferences]);

  // Calculate grid gap class
  const gridGapClass = useMemo(() => {
    const { gridGap } = preferences.shared.visualTheme;
    switch (gridGap) {
      case 'compact':
        return 'gap-2';
      case 'normal':
        return 'gap-3 sm:gap-4';
      case 'comfortable':
        return 'gap-4 sm:gap-6';
      default:
        return 'gap-3 sm:gap-4';
    }
  }, [preferences.shared.visualTheme.gridGap]);

  // Calculate card class
  const cardClass = useMemo(() => {
    const { cardStyle } = preferences.shared.visualTheme;
    switch (cardStyle) {
      case 'minimal':
        return 'bg-transparent border-none shadow-none';
      case 'glass':
        return 'liquid-glass';
      case 'bordered':
        return 'border-2 border-gray-200 dark:border-gray-700 shadow-sm';
      case 'elevated':
        return 'shadow-lg hover:shadow-xl bg-white dark:bg-gray-800';
      default:
        return 'liquid-glass';
    }
  }, [preferences.shared.visualTheme.cardStyle]);

  // Is mobile check
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  return {
    // State
    preferences,
    currentViewMode,
    currentGridColumns,
    breakpoint,
    responsiveConfig,

    // Update functions
    updatePreferences,
    setViewMode,
    setGridDensity,
    setCardStyle,
    setImageRatio,
    setGridColumns,
    setSidebarWidth,

    // Toggle functions
    toggleVersatilityScore,
    toggleItemCount,
    toggleSidebar,
    toggleGestures,
    toggleStickyHeader,
    toggleFAB,
    togglePullToRefresh,
    toggleHoverEffects,
    toggleKeyboardShortcuts,
    toggleStats,
    toggleAutoSave,

    // Reset
    resetToDefaults,

    // Computed values
    gridGapClass,
    cardClass,

    // Breakpoint checks
    isMobile,
    isTablet,
    isDesktop
  };
}

export default useViewPreferences;
