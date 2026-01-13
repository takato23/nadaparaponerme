/**
 * Weather Service (re-export from root services)
 * 
 * This module re-exports the weather service for unified imports.
 */

export {
    getCurrentWeather,
    getWeatherEmoji,
    getTempDescription,
    getUserCity,
    saveUserCity,
} from '../../services/weatherService';
