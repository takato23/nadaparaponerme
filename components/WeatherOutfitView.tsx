
import React, { useState, useEffect, useMemo } from 'react';
import type { ClothingItem, WeatherData, WeatherOutfitResult } from '../types';
import { getCurrentWeather, getWeatherEmoji, getTempDescription, getUserCity, saveUserCity } from '../src/services/weatherService';
import Loader from './Loader';
import { getCreditStatus } from '../src/services/usageTrackingService';
import { useAIGeneration } from '../contexts/AIGenerationContext';
import {
  clearShortcutRequestId,
  persistShortcutRequestId,
  readShortcutRequestId,
} from '../src/services/homeShortcutPersistence';

interface WeatherOutfitViewProps {
  closet: ClothingItem[];
  onClose: () => void;
  onViewOutfit: (topId: string, bottomId: string, shoesId: string) => void;
}

const WeatherOutfitView = ({ closet, onClose, onViewOutfit }: WeatherOutfitViewProps) => {
  const {
    activeRequest,
    queue,
    completedRequests,
    enqueueOutfitGeneration,
    clearCompletedRequest,
    retryRequest,
  } = useAIGeneration();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState(getUserCity());
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState(city);
  const [requestId, setRequestId] = useState<string | null>(() => readShortcutRequestId('weather-look'));

  // Credits status
  const creditsStatus = useMemo(() => getCreditStatus(), [requestId, completedRequests.length]);

  const request = useMemo(() => {
    if (!requestId) return null;
    if (activeRequest?.id === requestId) return activeRequest;
    return queue.find((item) => item.id === requestId) ?? completedRequests.find((item) => item.id === requestId) ?? null;
  }, [activeRequest, completedRequests, queue, requestId]);

  const isGeneratingOutfit =
    request?.type === 'outfit' && (request.status === 'queued' || request.status === 'processing' || request.status === 'retrying');
  const generationError = request?.type === 'outfit' && request.status === 'failed' ? request.error || 'Error al generar outfit' : null;
  const outfitResult = useMemo<WeatherOutfitResult | null>(() => {
    if (request?.type !== 'outfit' || request.status !== 'completed' || !request.result || !weather) return null;

    return {
      outfit: {
        top_id: request.result.top_id,
        bottom_id: request.result.bottom_id,
        shoes_id: request.result.shoes_id,
      },
      explanation: request.result.explanation,
      weather_context: `${weather.description} · ${weather.temp}°C en ${weather.city}`,
    };
  }, [request, weather]);

  // Load weather on mount
  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    setIsLoadingWeather(true);
    setError(null);

    try {
      const weatherData = await getCurrentWeather(city);
      setWeather(weatherData);
    } catch (err) {
      console.error('Error loading weather:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el clima');
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleGenerateOutfit = async () => {
    if (!weather || closet.length === 0) return;

    if (request?.status === 'completed' || request?.status === 'failed') {
      clearCompletedRequest(request.id);
    }

    const nextRequestId = enqueueOutfitGeneration({
      closet,
      occasion: 'vestirme hoy según el clima actual',
      style: 'usable, coherente, fácil de armar y con criterio',
      weather: `${weather.city}, ${weather.country}. ${weather.temp}°C, sensación ${weather.feels_like}°C, ${weather.description}. Mín ${weather.temp_min}°C, máx ${weather.temp_max}°C.`,
    });

    setRequestId(nextRequestId);
    persistShortcutRequestId('weather-look', nextRequestId);
  };

  const clearCurrentRequest = () => {
    if (request?.status === 'completed' || request?.status === 'failed') {
      clearCompletedRequest(request.id);
    }
    clearShortcutRequestId('weather-look');
    setRequestId(null);
  };

  const handleChangeCity = async () => {
    if (!cityInput.trim()) return;

    saveUserCity(cityInput);
    setCity(cityInput);
    setIsEditingCity(false);
    clearCurrentRequest();

    // Reload weather with new city
    setIsLoadingWeather(true);
    setError(null);

    try {
      const weatherData = await getCurrentWeather(cityInput);
      setWeather(weatherData);
    } catch (err) {
      console.error('Error loading weather:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar el clima');
    } finally {
      setIsLoadingWeather(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">Outfit del Día</h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">Basado en el clima actual</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Credits Indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${creditsStatus.remaining <= 2
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-gray-100 dark:bg-gray-800'
              }`}>
              <span className="material-symbols-rounded text-gray-500 text-sm">toll</span>
              <span className={`text-xs font-medium ${creditsStatus.remaining <= 2 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
                }`}>
                {creditsStatus.limit === -1 ? '∞' : `${creditsStatus.remaining}/${creditsStatus.limit}`}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>

          {/* Loading State */}
          {isLoadingWeather && (
            <div className="text-center py-12">
              <Loader />
              <p className="text-text-secondary dark:text-gray-400 mt-4">
                Cargando clima...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoadingWeather && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-2">
                Error
              </h3>
              <p className="text-text-secondary dark:text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
              <button
                onClick={loadWeather}
                className="px-6 py-3 bg-primary text-white rounded-full font-semibold transition-transform active:scale-95"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Weather Data */}
          {weather && !isLoadingWeather && (
            <>
              {/* Weather Card */}
              <div className="p-6 liquid-glass rounded-2xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl">{getWeatherEmoji(weather.condition)}</span>
                    <div>
                      {isEditingCity ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={cityInput}
                            onChange={(e) => setCityInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleChangeCity()}
                            className="px-3 py-1 liquid-glass rounded-lg text-sm text-text-primary dark:text-gray-200"
                            placeholder="Ciudad"
                            autoFocus
                          />
                          <button
                            onClick={handleChangeCity}
                            className="px-3 py-1 bg-primary text-white rounded-lg text-sm"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditingCity(true)}
                          className="text-left group"
                        >
                          <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 group-hover:text-primary transition-colors">
                            {weather.city}, {weather.country}
                          </h3>
                          <p className="text-sm text-text-secondary dark:text-gray-400 capitalize">
                            {weather.description}
                          </p>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold text-text-primary dark:text-gray-200">
                      {weather.temp}°C
                    </p>
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                      Sensación {weather.feels_like}°C
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="text-center">
                    <p className="text-xs text-text-secondary dark:text-gray-400">Mínima</p>
                    <p className="text-lg font-semibold text-text-primary dark:text-gray-200">
                      {weather.temp_min}°C
                    </p>
                  </div>
                  <div className="text-center px-4 border-x border-gray-200 dark:border-gray-800">
                    <p className="text-xs text-text-secondary dark:text-gray-400">Clima</p>
                    <p className="text-lg font-semibold text-text-primary dark:text-gray-200 capitalize">
                      {getTempDescription(weather.temp)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-text-secondary dark:text-gray-400">Máxima</p>
                    <p className="text-lg font-semibold text-text-primary dark:text-gray-200">
                      {weather.temp_max}°C
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Outfit Button */}
              {!outfitResult && (
                <div className="text-center">
                  <button
                    onClick={handleGenerateOutfit}
                    disabled={isGeneratingOutfit || closet.length === 0}
                    className="px-8 py-3 bg-primary text-white rounded-full font-semibold transition-transform active:scale-95 shadow-soft shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingOutfit ? 'Generando...' : 'Generar Outfit para Este Clima'}
                  </button>
                  {closet.length === 0 && (
                    <p className="text-sm text-text-secondary dark:text-gray-400 mt-2">
                      Agregá prendas a tu armario para generar outfits
                    </p>
                  )}
                  {closet.length > 0 && (
                    <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
                      Si cerrás el modal, la generación sigue en segundo plano.
                    </p>
                  )}
                </div>
              )}

              {/* Generating State */}
              {isGeneratingOutfit && (
                <div className="text-center py-8">
                  <Loader />
                  <p className="text-text-secondary dark:text-gray-400 mt-4">
                    Creando tu outfit perfecto...
                  </p>
                  <p className="mt-2 text-sm text-text-secondary dark:text-gray-500">
                    Podés cerrar este modal y volver después.
                  </p>
                </div>
              )}

              {generationError && !isGeneratingOutfit && (
                <div className="space-y-3 rounded-2xl bg-red-50 p-5 dark:bg-red-900/20">
                  <p className="font-semibold text-red-700 dark:text-red-300">No pude generar el outfit para este clima.</p>
                  <p className="text-sm text-red-600 dark:text-red-200">{generationError}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => request && retryRequest(request.id)}
                      className="flex-1 rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-transform active:scale-95"
                    >
                      Reintentar
                    </button>
                    <button
                      type="button"
                      onClick={clearCurrentRequest}
                      className="flex-1 rounded-xl liquid-glass px-4 py-3 font-semibold text-text-primary transition-transform active:scale-95 dark:text-gray-200"
                    >
                      Empezar de nuevo
                    </button>
                  </div>
                </div>
              )}

              {/* Outfit Result */}
              {outfitResult && !isGeneratingOutfit && (
                <div className="space-y-4">
                  {/* Weather Context */}
                  <div className="p-4 bg-primary/10 rounded-xl">
                    <p className="text-sm font-semibold text-primary">
                      {outfitResult.weather_context}
                    </p>
                  </div>

                  {/* Explanation */}
                  <div className="p-6 liquid-glass rounded-2xl">
                    <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">checkroom</span>
                      Tu Outfit del Día
                    </h3>
                    <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                      {outfitResult.explanation}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={clearCurrentRequest}
                      className="flex-1 px-6 py-3 liquid-glass rounded-xl font-semibold transition-transform active:scale-95 text-text-primary dark:text-gray-200"
                    >
                      Generar Otro
                    </button>
                    <button
                      onClick={() => {
                        onViewOutfit(
                          outfitResult.outfit.top_id,
                          outfitResult.outfit.bottom_id,
                          outfitResult.outfit.shoes_id
                        );
                        onClose();
                      }}
                      className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">visibility</span>
                      Ver Outfit
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default WeatherOutfitView;
