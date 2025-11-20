import React, { useState } from 'react';
import { motion } from 'framer-motion';

type WeatherType = 'sunny' | 'rainy' | 'frosty';

const WeatherCard = () => {
    const [weather, setWeather] = useState<WeatherType>('sunny');

    const getBackground = () => {
        switch (weather) {
            case 'sunny': return 'bg-gradient-to-br from-orange-300 via-yellow-200 to-sky-300';
            case 'rainy': return 'bg-gradient-to-b from-gray-800 to-gray-900';
            case 'frosty': return 'bg-gradient-to-br from-blue-100 via-white to-blue-200';
        }
    };

    return (
        <div className={`relative w-full overflow-hidden rounded-3xl transition-colors duration-1000 ${getBackground()} shadow-soft-lg`}>

            {/* Weather Effects */}
            {weather === 'rainy' && (
                <div className="absolute inset-0 pointer-events-none opacity-50 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/8c/Rain_animation.gif')] bg-cover mix-blend-overlay"></div>
            )}
            {weather === 'sunny' && (
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/30 rounded-full blur-[80px] pointer-events-none"></div>
            )}

            <div className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Weather Info */}
                <div className="text-center md:text-left text-white drop-shadow-md">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                        <span className="material-symbols-outlined text-3xl">
                            {weather === 'sunny' ? 'wb_sunny' : weather === 'rainy' ? 'water_drop' : 'ac_unit'}
                        </span>
                        <span className="text-lg font-medium opacity-90">Buenos Aires</span>
                    </div>
                    <h2 className="text-5xl font-bold mb-2">24°C</h2>
                    <p className="font-medium opacity-90">
                        {weather === 'sunny' ? 'Soleado' : weather === 'rainy' ? 'Lluvioso' : 'Helado'}
                    </p>
                </div>

                {/* Glass Panel Stats */}
                <motion.div
                    className={`
                        p-4 rounded-2xl border border-white/20 shadow-lg backdrop-blur-md
                        ${weather === 'frosty' ? 'bg-white/40' : 'bg-white/10'}
                        w-full md:w-auto min-w-[200px]
                    `}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                >
                    <div className="flex justify-between text-white text-sm gap-4">
                        <div className="flex flex-col items-center">
                            <span className="material-symbols-outlined mb-1">air</span>
                            <span className="font-bold">12 km/h</span>
                            <span className="text-xs opacity-70">Viento</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="material-symbols-outlined mb-1">water_drop</span>
                            <span className="font-bold">48%</span>
                            <span className="text-xs opacity-70">Humedad</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="material-symbols-outlined mb-1">visibility</span>
                            <span className="font-bold">10 km</span>
                            <span className="text-xs opacity-70">Visibilidad</span>
                        </div>
                    </div>
                </motion.div>

                {/* Controls (Hidden in production, visible for demo/prototype feel) */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity bg-black/20 p-1 rounded-full backdrop-blur-sm">
                    {['sunny', 'rainy', 'frosty'].map((w) => (
                        <button
                            key={w}
                            onClick={() => setWeather(w as any)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${weather === w ? 'bg-white text-black shadow-sm' : 'text-white hover:bg-white/20'}`}
                            title={w}
                        >
                            {w[0].toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeatherCard;
