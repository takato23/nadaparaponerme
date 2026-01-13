import React, { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from '../../src/config/runtime';
import { useConsentPreferences } from '../../src/hooks/useConsentPreferences';

interface AdSenseBannerProps {
  slot: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({ slot, className = '', style }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const consent = useConsentPreferences();
  const hasAdsConsent = !!consent?.ads;

  useEffect(() => {
    if (!ADSENSE_ENABLED || !ADSENSE_CLIENT_ID || !hasAdsConsent) return;
    if (document.querySelector('script[data-adsense="true"]')) return;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-adsense', 'true');
    document.head.appendChild(script);
  }, [hasAdsConsent]);

  useEffect(() => {
    if (!ADSENSE_ENABLED || !ADSENSE_CLIENT_ID || !hasAdsConsent) return;
    if (!containerRef.current) return;

    const w = window as typeof window & { adsbygoogle?: unknown[] };
    w.adsbygoogle = w.adsbygoogle || [];
    try {
      w.adsbygoogle.push({});
    } catch {
      // ignore ad load errors
    }
  }, [slot, hasAdsConsent]);

  if (!ADSENSE_ENABLED || !ADSENSE_CLIENT_ID || !hasAdsConsent) return null;

  return (
    <div ref={containerRef} className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSenseBanner;
