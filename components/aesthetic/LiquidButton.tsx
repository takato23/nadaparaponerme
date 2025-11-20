import React from 'react';

interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
}

export const LiquidButton: React.FC<LiquidButtonProps> = ({ children, className = '', ...props }) => {
    return (
        <div className="relative group inline-block">
            {/* SVG Filter Definition - Should be defined once globally ideally, but here for portability */}
            <svg className="absolute w-0 h-0">
                <defs>
                    <filter id="goo-effect">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
                        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <button
                className={`relative z-10 px-8 py-4 bg-primary text-white font-bold rounded-full transition-transform group-hover:scale-105 active:scale-95 ${className}`}
                {...props}
            >
                {children}
            </button>

            {/* Liquid Blobs */}
            <div
                className="absolute inset-0 bg-primary rounded-full -z-10 group-hover:animate-pulse opacity-70"
                style={{ filter: 'url(#goo-effect)' }}
            >
                <span className="absolute top-0 left-1/4 w-6 h-6 bg-primary rounded-full animate-[ping_2s_ease-in-out_infinite]"></span>
                <span className="absolute bottom-0 right-1/4 w-4 h-4 bg-primary rounded-full animate-[ping_2.5s_ease-in-out_infinite_0.5s]"></span>
                <span className="absolute top-1/2 left-1/2 w-8 h-8 bg-primary rounded-full animate-[ping_3s_ease-in-out_infinite_1s] -translate-x-1/2 -translate-y-1/2"></span>
            </div>
        </div>
    );
};
