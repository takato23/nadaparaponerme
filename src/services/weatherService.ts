
import type { WeatherData } from '../types';

// OpenWeatherMap API
// Free tier: 1,000 calls/day, perfect for our use case
const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || 'demo';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

/**
 * Get current weather for a city
 * Uses OpenWeatherMap API (free tier)
 */
export async function getCurrentWeather(city: string = 'Buenos Aires'): Promise<WeatherData> {
  try {
    const url = `${WEATHER_API_URL}?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=metric&lang=es`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('API key inválida. Configurá VITE_OPENWEATHER_API_KEY en .env.local');
      }
      throw new Error(`Error al obtener clima: ${response.status}`);
    }

    const data = await response.json();

    return {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      temp_min: Math.round(data.main.temp_min),
      temp_max: Math.round(data.main.temp_max),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      city: data.name,
      country: data.sys.country
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'No se pudo obtener el clima. Verificá tu conexión.'
    );
  }
}

/**
 * Get weather icon URL from OpenWeatherMap
 */
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Get appropriate emoji for weather condition
 */
export function getWeatherEmoji(condition: string): string {
  const emojiMap: Record<string, string> = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '🌫️',
    'Haze': '🌫️',
    'Dust': '🌫️',
    'Fog': '🌫️',
    'Sand': '🌫️',
    'Ash': '🌫️',
    'Squall': '💨',
    'Tornado': '🌪️'
  };

  return emojiMap[condition] || '🌤️';
}

/**
 * Determine season based on temperature
 */
export function getSeason(temp: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (temp >= 25) return 'summer';
  if (temp >= 15) return 'spring';
  if (temp >= 5) return 'autumn';
  return 'winter';
}

/**
 * Get temperature description in Spanish
 */
export function getTempDescription(temp: number): string {
  if (temp >= 30) return 'muy caluroso';
  if (temp >= 25) return 'caluroso';
  if (temp >= 20) return 'templado';
  if (temp >= 15) return 'fresco';
  if (temp >= 10) return 'frío';
  return 'muy frío';
}

/**
 * Save user's preferred city to localStorage
 */
export function saveUserCity(city: string): void {
  localStorage.setItem('ojodeloca-weather-city', city);
}

/**
 * Get user's preferred city from localStorage
 */
export function getUserCity(): string {
  return localStorage.getItem('ojodeloca-weather-city') || 'Buenos Aires';
}
