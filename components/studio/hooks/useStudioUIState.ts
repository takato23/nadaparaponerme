import { useCallback, useEffect, useState } from 'react';
import type { FilterStatus, GeneratedImageRecord } from '../photoshootStudio.types';

interface UseStudioUIStateParams {
  initialFilterStatus?: FilterStatus;
}

export function useStudioUIState({ initialFilterStatus = 'all' }: UseStudioUIStateParams = {}) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(initialFilterStatus);
  const [isMobile, setIsMobile] = useState(false);
  const [showResultsHint, setShowResultsHint] = useState(false);
  const [customScene, setCustomScene] = useState('');
  const [keepPose, setKeepPose] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GeneratedImageRecord | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const [activeSlotPicker, setActiveSlotPicker] = useState<string | null>(null);
  const [activeFitPicker, setActiveFitPicker] = useState<string | null>(null);
  const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);
  const [shakeButton, setShakeButton] = useState(false);
  const [isNewSessionResult, setIsNewSessionResult] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const triggerShake = useCallback(() => {
    setShakeButton(true);
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    setTimeout(() => setShakeButton(false), 500);
  }, []);

  return {
    filterStatus,
    setFilterStatus,
    isMobile,
    showResultsHint,
    setShowResultsHint,
    customScene,
    setCustomScene,
    keepPose,
    setKeepPose,
    selectedImage,
    setSelectedImage,
    compareMode,
    setCompareMode,
    comparePosition,
    setComparePosition,
    activeSlotPicker,
    setActiveSlotPicker,
    activeFitPicker,
    setActiveFitPicker,
    showCompatibilityWarning,
    setShowCompatibilityWarning,
    shakeButton,
    triggerShake,
    isNewSessionResult,
    setIsNewSessionResult,
  };
}
