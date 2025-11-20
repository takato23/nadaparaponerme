import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
    glass: {
        blur: number;
        opacity: number;
        saturation: number;
        radius: number;
    };
    updateGlass: (key: keyof ThemeContextType['glass'], value: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [glass, setGlass] = useState({
        blur: 20,
        opacity: 0.2,
        saturation: 150,
        radius: 24,
    });

    const updateGlass = (key: keyof typeof glass, value: number) => {
        setGlass(prev => ({ ...prev, [key]: value }));
    };

    // Apply CSS variables for global usage
    useEffect(() => {
        document.documentElement.style.setProperty('--glass-blur', `${glass.blur}px`);
        document.documentElement.style.setProperty('--glass-opacity', `${glass.opacity}`);
        document.documentElement.style.setProperty('--glass-saturation', `${glass.saturation}%`);
        document.documentElement.style.setProperty('--glass-radius', `${glass.radius}px`);
    }, [glass]);

    return (
        <ThemeContext.Provider value={{ glass, updateGlass }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
