import React from 'react';

const OjoDeLocaLogo = ({ className }: { className?: string }) => (
    <svg 
        className={className}
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M50 90C77.6142 90 100 67.6142 100 40C100 12.3858 77.6142 -10 50 -10C22.3858 -10 0 12.3858 0 40C0 67.6142 22.3858 90 50 90Z" fill="currentColor"/>
        <circle cx="50" cy="40" r="20" fill="#F9F9F9"/>
        <circle cx="50" cy="40" r="8" fill="currentColor"/>
    </svg>
);

export default OjoDeLocaLogo;