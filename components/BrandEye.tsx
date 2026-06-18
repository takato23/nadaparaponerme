import React from 'react';

interface BrandEyeProps {
    className?: string;
}

/**
 * BrandEye — a lightweight, self-contained animated SVG eye logo.
 * Pure SVG/CSS (no Three.js) so it paints instantly on boot.
 * Matches the "Ojo de Loca" brand mark: outer eye shape, light iris, dark pupil.
 */
export default function BrandEye({ className }: BrandEyeProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            role="img"
            aria-label="Ojo de Loca"
            className={`brandeye-root${className ? ` ${className}` : ''}`}
        >
            <style>{`
                .brandeye-root {
                    overflow: visible;
                }
                @keyframes brandeye-blink {
                    0%, 92%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.06); }
                }
                @keyframes brandeye-drift {
                    0%, 100% { transform: translate(0px, 0px); }
                    25% { transform: translate(2.4px, -1.4px); }
                    55% { transform: translate(-2.2px, 1.2px); }
                    78% { transform: translate(1.4px, 1.6px); }
                }
                @keyframes brandeye-glow {
                    0%, 100% { opacity: 0.85; }
                    50% { opacity: 1; }
                }
                .brandeye-lid {
                    transform-box: fill-box;
                    transform-origin: center;
                    animation: brandeye-blink 4s ease-in-out infinite;
                }
                .brandeye-iris-group {
                    transform-box: fill-box;
                    transform-origin: center;
                    animation: brandeye-drift 7s ease-in-out infinite;
                }
                .brandeye-iris {
                    animation: brandeye-glow 3.4s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                    .brandeye-lid,
                    .brandeye-iris-group,
                    .brandeye-iris {
                        animation: none;
                    }
                }
            `}</style>

            <defs>
                <radialGradient id="brandeye-iris-grad" cx="42%" cy="38%" r="68%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="55%" stopColor="#F9F9F9" />
                    <stop offset="100%" stopColor="#D9D5E6" />
                </radialGradient>
                <radialGradient id="brandeye-outer-grad" cx="50%" cy="42%" r="70%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.82" />
                </radialGradient>
                <clipPath id="brandeye-clip">
                    <path d="M6 50 C 24 18, 76 18, 94 50 C 76 82, 24 82, 6 50 Z" />
                </clipPath>
            </defs>

            {/* Eyelid group — squashes to blink */}
            <g className="brandeye-lid">
                {/* Outer almond eye shape */}
                <path
                    d="M6 50 C 24 18, 76 18, 94 50 C 76 82, 24 82, 6 50 Z"
                    fill="url(#brandeye-outer-grad)"
                />

                <g clipPath="url(#brandeye-clip)">
                    {/* Iris + pupil drift together */}
                    <g className="brandeye-iris-group">
                        <circle
                            className="brandeye-iris"
                            cx="50"
                            cy="50"
                            r="22"
                            fill="url(#brandeye-iris-grad)"
                        />
                        <circle cx="50" cy="50" r="9.5" fill="currentColor" />
                        {/* Specular highlight for life */}
                        <circle cx="44" cy="44" r="3.4" fill="#FFFFFF" opacity="0.7" />
                        <circle cx="55" cy="55" r="1.4" fill="#FFFFFF" opacity="0.4" />
                    </g>
                </g>
            </g>
        </svg>
    );
}
