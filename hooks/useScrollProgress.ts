import { useState, useEffect } from 'react';

export const useScrollProgress = () => {
    const [scroll, setScroll] = useState({
        y: 0,
        progress: 0,
    });

    useEffect(() => {
        const handleScroll = () => {
            const y = window.scrollY;
            const height = document.documentElement.scrollHeight - window.innerHeight;
            const progress = height > 0 ? y / height : 0;

            setScroll({ y, progress });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initial check

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return scroll;
};
