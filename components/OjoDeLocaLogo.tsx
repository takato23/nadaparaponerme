import React from 'react';

const OjoDeLocaLogo = ({ className }: { className?: string }) => (
    <img 
        src="/logo.png" 
        alt="Ojo de Loca Logo" 
        className={`${className} rounded-full object-cover`}
    />
);

export default OjoDeLocaLogo;