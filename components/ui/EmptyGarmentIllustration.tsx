import React from 'react';

interface EmptyGarmentIllustrationProps {
  className?: string;
}

/**
 * EmptyGarmentIllustration
 *
 * Lightweight, theme-aware empty-state artwork for the "add garment" flow:
 * a clothes hanger inside a dashed photo frame with an "add" badge.
 * Pure inline SVG — crisp at any size, no external asset, adapts to dark mode
 * via Tailwind `stroke-*` / `fill-*` utilities and the app's `primary` color.
 */
export const EmptyGarmentIllustration: React.FC<EmptyGarmentIllustrationProps> = ({ className }) => (
  <svg viewBox="0 0 160 160" fill="none" role="img" aria-hidden="true" className={className}>
    {/* soft halo */}
    <circle cx="80" cy="84" r="60" className="fill-primary/10" />

    {/* dashed photo frame */}
    <g transform="rotate(-6 80 86)">
      <rect
        x="40"
        y="46"
        width="80"
        height="80"
        rx="18"
        className="stroke-gray-300 dark:stroke-gray-600"
        strokeWidth="3"
        strokeDasharray="7 9"
        strokeLinecap="round"
      />
    </g>

    {/* clothes hanger */}
    <g className="stroke-primary" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M58 96 L80 76 L102 96" />
      <path d="M56 96 H104" />
      <path d="M80 76 c0 -6 5 -8 8 -5 c2 2 1 5 -2 6" />
    </g>

    {/* add badge */}
    <circle cx="112" cy="120" r="15" className="fill-primary" />
    <path d="M112 113 V127 M105 120 H119" className="stroke-white" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export default EmptyGarmentIllustration;
