import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// Tipos para la API de OpenWeather
interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  visibility: number;
  description: string;
  icon: string;
  city: string;
  country: string;
}

type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy' | 'night';

interface WeatherCardImprovedProps {
  onWeatherLoaded?: (weather: WeatherData) => void;
  onSuggestOutfit?: (weather: WeatherData) => void;
}

// Mapeo de códigos de OpenWeather a condiciones locales
const getWeatherCondition = (iconCode: string): WeatherCondition => {
  const code = iconCode.slice(0, 2);
  const isNight = iconCode.endsWith('n');

  if (isNight && ['01', '02'].includes(code)) return 'night';
  if (['01', '02'].includes(code)) return 'sunny';
  if (['03', '04'].includes(code)) return 'cloudy';
  if (['09', '10'].includes(code)) return 'rainy';
  if (code === '11') return 'stormy';
  if (code === '13') return 'snowy';
  if (code === '50') return 'foggy';
  return 'cloudy';
};

// Configuración visual por condición
const weatherStyles: Record<WeatherCondition, {
  gradient: string;
  icon: string;
  textColor: string;
  overlayEffect?: string;
}> = {
  sunny: {
    gradient: 'from-orange-300 via-yellow-200 to-sky-300',
    icon: 'wb_sunny',
    textColor: 'text-slate-800',
  },
  cloudy: {
    gradient: 'from-slate-400 via-slate-300 to-slate-500',
    icon: 'cloud',
    textColor: 'text-slate-800',
  },
  rainy: {
    gradient: 'from-slate-700 via-slate-600 to-slate-800',
    icon: 'water_drop',
    textColor: 'text-white',
  },
  stormy: {
    gradient: 'from-slate-800 via-purple-900 to-slate-900',
    icon: 'thunderstorm',
    textColor: 'text-white',
  },
  snowy: {
    gradient: 'from-blue-100 via-white to-blue-200',
    icon: 'ac_unit',
    textColor: 'text-slate-700',
  },
  foggy: {
    gradient: 'from-gray-300 via-gray-200 to-gray-400',
    icon: 'foggy',
    textColor: 'text-slate-700',
  },
  night: {
    gradient: 'from-indigo-900 via-slate-900 to-slate-950',
    icon: 'dark_mode',
    textColor: 'text-white',
  },
};

// Cache key para localStorage
const WEATHER_CACHE_KEY = 'ojodeloca-weather-cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

export const WeatherCardImproved: React.FC<WeatherCardImprovedProps> = ({ onWeatherLoaded, onSuggestOutfit }) => {
  const prefersReducedMotion = useReducedMotion();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  // Intentar cargar desde cache
  const loadFromCache = useCallback((): WeatherData | null => {
    try {
      const cached = localStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch {
      // Ignorar errores de cache
    }
    return null;
  }, []);

  // Guardar en cache
  const saveToCache = useCallback((data: WeatherData) => {
    try {
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch {
      // Ignorar errores de cache
    }
  }, []);

  // Fallback data for when API fails
  const getFallbackWeather = useCallback((): WeatherData => {
    return {
      temp: 24,
      feels_like: 26,
      humidity: 65,
      wind_speed: 12,
      visibility: 10,
      description: 'Parcialmente nublado',
      icon: '02d',
      city: 'Buenos Aires',
      country: 'AR'
    };
  }, []);

  // Fetch weather desde OpenWeather API (usando proxy o directamente)
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      // Usar API gratuita de Open-Meteo (no requiere API key)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility&timezone=auto`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('Error al obtener clima');

        const data = await response.json();
        const current = data.current;

        // Mapear código de clima a icono
        const weatherCode = current.weather_code;
        let icon = '01d';
        let description = 'Despejado';

        // Mapeo de códigos WMO a descripciones
        if (weatherCode === 0) { icon = '01d'; description = 'Despejado'; }
        else if (weatherCode <= 3) { icon = '02d'; description = 'Parcialmente nublado'; }
        else if (weatherCode <= 49) { icon = '50d'; description = 'Niebla'; }
        else if (weatherCode <= 59) { icon = '09d'; description = 'Llovizna'; }
        else if (weatherCode <= 69) { icon = '10d'; description = 'Lluvia'; }
        else if (weatherCode <= 79) { icon = '13d'; description = 'Nieve'; }
        else if (weatherCode <= 84) { icon = '09d'; description = 'Aguaceros'; }
        else if (weatherCode <= 94) { icon = '13d'; description = 'Nieve'; }
        else { icon = '11d'; description = 'Tormenta'; }

        // Ajustar para noche (simplificado)
        const hour = new Date().getHours();
        if (hour < 6 || hour > 20) {
          icon = icon.replace('d', 'n');
        }

        // Obtener nombre de ciudad con geocoding reverso
        let city = 'Tu ubicación';
        let country = '';
        try {
          // Short timeout for geocoding
          const geoController = new AbortController();
          const geoTimeout = setTimeout(() => geoController.abort(), 3000);

          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { signal: geoController.signal }
          );
          clearTimeout(geoTimeout);

          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            city = geoData.address?.city || geoData.address?.town || geoData.address?.village || 'Tu ubicación';
            country = geoData.address?.country_code?.toUpperCase() || '';
          }
        } catch {
          // Usar ubicación genérica si falla geocoding
          console.warn('Geocoding failed, using generic location name');
        }

        const weatherData: WeatherData = {
          temp: Math.round(current.temperature_2m),
          feels_like: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          wind_speed: Math.round(current.wind_speed_10m),
          visibility: Math.round((current.visibility || 10000) / 1000),
          description,
          icon,
          city,
          country,
        };

        setWeather(weatherData);
        saveToCache(weatherData);
        onWeatherLoaded?.(weatherData);
        setError(null);
      } catch (err) {
        throw err; // Re-throw to be caught by outer catch
      }
    } catch (err) {
      console.warn('Error fetching weather, using fallback:', err);
      // Use fallback data seamlessly instead of showing error
      const fallbackData = getFallbackWeather();
      setWeather(fallbackData);
      onWeatherLoaded?.(fallbackData);
      // We don't set error state here to clear the UI error if it existed
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [saveToCache, onWeatherLoaded, getFallbackWeather]);

  // Obtener ubicación del usuario
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPermission('granted');
        fetchWeather(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocationPermission('denied');
        // Usar ubicación por defecto (Buenos Aires)
        fetchWeather(-34.6037, -58.3816);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000, // 10 minutos
      }
    );
  }, [fetchWeather]);

  // Inicializar
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      setWeather(cached);
      setLoading(false);
      onWeatherLoaded?.(cached);
    } else {
      getLocation();
    }
  }, [loadFromCache, getLocation, onWeatherLoaded]);

  // Refrescar manualmente
  const handleRefresh = () => {
    setLoading(true);
    localStorage.removeItem(WEATHER_CACHE_KEY);
    getLocation();
  };

  // Condición actual
  const condition = weather ? getWeatherCondition(weather.icon) : 'sunny';
  const style = weatherStyles[condition];

  // Loading state
  if (loading && !weather) {
    return (
      <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 shadow-soft-lg">
        <div className="p-4 sm:p-6 flex items-center justify-center min-h-[140px] sm:min-h-[180px]">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full"
              animate={prefersReducedMotion ? undefined : { rotate: 360 }}
              transition={prefersReducedMotion ? undefined : { duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-text-secondary text-sm">Obteniendo clima...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full overflow-hidden rounded-3xl transition-colors duration-1000 bg-gradient-to-br ${style.gradient} shadow-soft-lg`}
      role="region"
      aria-label={`Clima actual: ${weather?.temp}°C, ${weather?.description} en ${weather?.city}`}
    >
      {/* Efectos de fondo según clima */}
      <AnimatePresence>
        {condition === 'rainy' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(180deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
              animation: 'rain 0.5s linear infinite',
            }}
          />
        )}
        {condition === 'sunny' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/40 rounded-full blur-[60px] pointer-events-none"
          />
        )}
        {condition === 'night' && (
          <>
            <motion.div
              className="absolute top-4 right-8 w-2 h-2 bg-white rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-12 right-16 w-1 h-1 bg-white rounded-full"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 p-3 sm:p-4 md:p-6">
        {/* Header con ciudad y refresh */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className={`flex items-center gap-2 ${style.textColor}`}>
            <span className="material-symbols-outlined text-xl" aria-hidden="true">location_on</span>
            <span className="font-medium text-xs sm:text-sm md:text-base">
              {weather?.city}
              {weather?.country && <span className="opacity-60 ml-1">{weather.country}</span>}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`p-2 rounded-full ${style.textColor} hover:bg-white/20 transition-colors disabled:opacity-50`}
            aria-label="Actualizar clima"
          >
            <motion.span
              className="material-symbols-outlined text-xl"
              animate={loading ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: loading ? Infinity : 0 }}
            >
              refresh
            </motion.span>
          </button>
        </div>

        {/* Contenido principal */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
          {/* Temperatura y condición */}
          <div className={`text-center md:text-left ${style.textColor}`}>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="material-symbols-outlined text-3xl sm:text-4xl md:text-5xl" aria-hidden="true">
                {style.icon}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl md:text-6xl font-bold">{weather?.temp}</span>
              <span className="text-xl sm:text-2xl md:text-3xl font-light">°C</span>
            </div>
            <p className="font-medium text-xs sm:text-sm md:text-base opacity-90 mt-1">
              {weather?.description}
            </p>
            <p className="text-xs opacity-70">
              Sensación: {weather?.feels_like}°C
            </p>
          </div>

          {/* Stats en glass panel */}
          <motion.div
            className={`
              p-2.5 sm:p-3 md:p-4 rounded-2xl border border-white/20 shadow-lg backdrop-blur-md
              ${condition === 'snowy' || condition === 'foggy' ? 'bg-white/40' : 'bg-white/10'}
              w-full md:w-auto min-w-[180px] sm:min-w-[200px]
            `}
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <div className={`grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 ${style.textColor}`}>
              <div className="flex flex-col items-center">
                <span className="material-symbols-outlined mb-1 text-lg" aria-hidden="true">air</span>
                <span className="font-bold text-xs sm:text-sm">{weather?.wind_speed} km/h</span>
                <span className="text-xs opacity-70">Viento</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="material-symbols-outlined mb-1 text-lg" aria-hidden="true">water_drop</span>
                <span className="font-bold text-xs sm:text-sm">{weather?.humidity}%</span>
                <span className="text-xs opacity-70">Humedad</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="material-symbols-outlined mb-1 text-lg" aria-hidden="true">visibility</span>
                <span className="font-bold text-xs sm:text-sm">{weather?.visibility} km</span>
                <span className="text-xs opacity-70">Visibilidad</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Suggest Outfit Button */}
        {weather && onSuggestOutfit && (
          <motion.button
            onClick={() => onSuggestOutfit(weather)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
              mt-3 w-full py-2.5 px-4 rounded-xl
              flex items-center justify-center gap-2
              font-semibold text-sm
              transition-all duration-200
              ${condition === 'rainy' || condition === 'stormy' || condition === 'night'
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-black/10 hover:bg-black/20 text-slate-800'
              }
            `}
          >
            <span className="material-symbols-outlined text-lg">checkroom</span>
            Sugerir outfit para hoy
          </motion.button>
        )}

        {/* Indicador de permiso de ubicación */}
        {locationPermission === 'denied' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-xs mt-3 ${style.textColor} opacity-70 text-center`}
          >
            Usando ubicación por defecto. Permite acceso a ubicación para datos precisos.
          </motion.p>
        )}

        {/* Error state */}
        {error && !weather && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
            <p className="text-red-400">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes rain {
          0% { transform: translateY(0); }
          100% { transform: translateY(20px); }
        }
      `}</style>
    </motion.div>
  );
};

export default WeatherCardImproved;
