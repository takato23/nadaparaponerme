/**
 * CalendarSyncView Component
 *
 * Manages Google Calendar integration for event-based outfit suggestions.
 * Handles OAuth connection, event fetching, AI classification, and outfit generation.
 *
 * Flow:
 * 1. Show connection status (connected/disconnected)
 * 2. If disconnected → token input form
 * 3. If connected → fetch events → generate suggestions
 * 4. Display events with outfit suggestions
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  ClothingItem,
  GoogleCalendarConnection,
  GoogleCalendarEvent,
  OutfitSuggestionForEvent,
  CalendarEventType,
} from '../types';
import * as calendarService from '../src/services/googleCalendarService';
import Loader from './Loader';

interface CalendarSyncViewProps {
  closet: ClothingItem[];
  onClose: () => void;
  onViewOutfit: (suggestion: OutfitSuggestionForEvent) => void;
}

type ViewStep = 'connection' | 'loading_events' | 'generating_suggestions' | 'results';

const CalendarSyncView = ({ closet, onClose, onViewOutfit }: CalendarSyncViewProps) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('connection');
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [suggestions, setSuggestions] = useState<OutfitSuggestionForEvent[]>([]);
  const [error, setError] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  const handleGenerateSuggestions = useCallback(async (eventsToProcess: GoogleCalendarEvent[]) => {
    try {
      if (closet.length < 5) {
        setError('Necesitás al menos 5 prendas en tu armario para generar sugerencias.');
        setCurrentStep('connection');
        setIsConnecting(false);
        return;
      }

      const generatedSuggestions = await calendarService.generateSuggestionsForEvents(
        eventsToProcess,
        closet
      );

      setSuggestions(generatedSuggestions);
      setCurrentStep('results');
      setIsConnecting(false);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al generar sugerencias';
      setError(errorMessage);
      setCurrentStep('connection');
      setIsConnecting(false);
    }
  }, [closet]);

  const handleFetchEvents = useCallback(async () => {
    setError('');
    setCurrentStep('loading_events');
    setIsConnecting(true);

    try {
      const fetchedEvents = await calendarService.fetchUpcomingEvents();

      if (fetchedEvents.length === 0) {
        setError('No tenés eventos en los próximos 14 días.');
        setCurrentStep('connection');
        setIsConnecting(false);
        return;
      }

      setEvents(fetchedEvents);
      setCurrentStep('generating_suggestions');

      // Generate outfit suggestions for all events
      await handleGenerateSuggestions(fetchedEvents);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al cargar eventos';
      setError(errorMessage);
      setCurrentStep('connection');
      setIsConnecting(false);
    }
  }, [handleGenerateSuggestions]);

  // Load connection status on mount
  useEffect(() => {
    const existingConnection = calendarService.getConnection();
    setConnection(existingConnection);

    if (existingConnection.is_connected) {
      // Auto-fetch events if already connected
      handleFetchEvents();
    }
  }, [handleFetchEvents]);

  // ===== CONNECTION HANDLERS =====

  const handleConnect = async () => {
    if (!tokenInput.trim()) {
      setError('Por favor ingresá un access token válido.');
      return;
    }

    setError('');
    setIsConnecting(true);

    try {
      const newConnection = await calendarService.connectWithToken(tokenInput);
      setConnection(newConnection);
      setTokenInput(''); // Clear input

      // Auto-fetch events after successful connection
      setTimeout(() => {
        handleFetchEvents();
      }, 500);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Error al conectar con Google Calendar';
      setError(errorMessage);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    calendarService.disconnectCalendar();
    setConnection(null);
    setEvents([]);
    setSuggestions([]);
    setCurrentStep('connection');
    setError('');
  };

  // ===== EVENT FETCHING & SUGGESTIONS =====

  // ===== HELPER FUNCTIONS =====

  const getEventTypeLabel = (type: CalendarEventType): string => {
    const labels: Record<CalendarEventType, string> = {
      work_meeting: 'Reunión de Trabajo',
      presentation: 'Presentación',
      dinner_date: 'Cena Romántica',
      casual_hangout: 'Salida Casual',
      interview: 'Entrevista',
      party: 'Fiesta',
      workout: 'Ejercicio',
      travel: 'Viaje',
      formal_event: 'Evento Formal',
      other: 'Otro',
    };
    return labels[type] || 'Otro';
  };

  const getEventTypeIcon = (type: CalendarEventType): string => {
    const icons: Record<CalendarEventType, string> = {
      work_meeting: 'work',
      presentation: 'presentation',
      dinner_date: 'restaurant',
      casual_hangout: 'coffee',
      interview: 'badge',
      party: 'celebration',
      workout: 'fitness_center',
      travel: 'flight',
      formal_event: 'theater_comedy',
      other: 'event',
    };
    return icons[type] || 'event';
  };

  const formatEventDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';

    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatEventTime = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ===== RENDER FUNCTIONS =====

  const renderConnectionStep = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-5xl">event_available</span>
        </div>
        <h2 className="text-3xl font-bold text-text-primary dark:text-gray-200 mb-2">
          Sincronización de Calendario
        </h2>
        <p className="text-text-secondary dark:text-gray-400 max-w-md mx-auto">
          Conectá tu Google Calendar para recibir sugerencias de outfits basadas en tus próximos eventos
        </p>
      </div>

      {/* Connection Status */}
      {connection?.is_connected ? (
        <div className="liquid-glass p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
              </div>
              <div>
                <p className="font-bold text-text-primary dark:text-gray-200">Conectado</p>
                <p className="text-sm text-text-secondary dark:text-gray-400">{connection.user_email}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors text-sm font-medium"
            >
              Desconectar
            </button>
          </div>

          {connection.last_sync && (
            <p className="text-xs text-text-secondary dark:text-gray-500 text-center">
              Última sincronización: {new Date(connection.last_sync).toLocaleString('es-AR')}
            </p>
          )}

          <button
            onClick={handleFetchEvents}
            disabled={isConnecting}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                Cargando eventos...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">calendar_today</span>
                Ver Próximos Eventos
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="liquid-glass p-6 rounded-3xl space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary dark:text-gray-200">
              Access Token de Google Calendar
            </label>
            <p className="text-xs text-text-secondary dark:text-gray-400 mb-2">
              Obtené tu token desde{' '}
              <a
                href="https://developers.google.com/oauthplayground/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Google OAuth Playground
              </a>
              {' '}(Scope: https://www.googleapis.com/auth/calendar.readonly)
            </p>
            <textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Pegá tu access token aquí..."
              className="w-full h-32 px-4 py-3 rounded-xl bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary text-text-primary dark:text-gray-200 resize-none"
            />
          </div>

          <button
            onClick={handleConnect}
            disabled={isConnecting || !tokenInput.trim()}
            className="w-full py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-bold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                Conectando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">link</span>
                Conectar Google Calendar
              </>
            )}
          </button>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-xl">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              <strong>Nota:</strong> Esta es una implementación MVP. Para obtener tu token:
              <br />
              1. Andá a Google OAuth Playground
              <br />
              2. Seleccioná el scope "Google Calendar API v3" → ".../auth/calendar.readonly"
              <br />
              3. Autorizá y obtené el Access Token
              <br />
              4. Pegalo en el campo de arriba
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 rounded-xl">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">error</span>
            {error}
          </p>
        </div>
      )}
    </div>
  );

  const renderLoadingEventsStep = () => (
    <div className="text-center space-y-6 animate-fade-in">
      <Loader />
      <p className="text-text-secondary dark:text-gray-400">Cargando tus próximos eventos...</p>
    </div>
  );

  const renderGeneratingSuggestionsStep = () => (
    <div className="text-center space-y-6 animate-fade-in">
      <Loader />
      <div className="space-y-2">
        <p className="text-lg font-bold text-text-primary dark:text-gray-200">
          Generando sugerencias con IA
        </p>
        <p className="text-text-secondary dark:text-gray-400">
          Analizando {events.length} eventos y creando outfits personalizados...
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
        {events.slice(0, 5).map((event, idx) => (
          <div
            key={idx}
            className="px-3 py-1 bg-primary/10 rounded-full text-xs text-primary animate-pulse"
            style={{ animationDelay: `${idx * 200}ms` }}
          >
            {event.summary}
          </div>
        ))}
        {events.length > 5 && (
          <div className="px-3 py-1 bg-primary/10 rounded-full text-xs text-primary">
            +{events.length - 5} más
          </div>
        )}
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-text-primary dark:text-gray-200 mb-2">
          Tus Próximos Eventos
        </h2>
        <p className="text-text-secondary dark:text-gray-400">
          {suggestions.length} eventos con sugerencias de outfits personalizadas
        </p>
      </div>

      {/* Suggestions List */}
      <div className="space-y-4">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.event_id}
            className="liquid-glass p-4 rounded-3xl space-y-3 hover:shadow-lg transition-shadow"
          >
            {/* Event Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-xl">
                    {getEventTypeIcon(suggestion.event_type)}
                  </span>
                  <span className="text-xs font-medium text-primary">
                    {getEventTypeLabel(suggestion.event_type)}
                  </span>
                </div>
                <h3 className="font-bold text-text-primary dark:text-gray-200 text-lg">
                  {suggestion.event_summary}
                </h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary dark:text-gray-400">
                  <span>{formatEventDate(suggestion.event_date)}</span>
                  <span>•</span>
                  <span>{formatEventTime(suggestion.event_date)}</span>
                </div>
              </div>

              {/* Confidence Badge */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{suggestion.confidence}%</span>
                </div>
                <span className="text-xs text-text-secondary dark:text-gray-500 mt-1">confianza</span>
              </div>
            </div>

            {/* Dress Code (if available) */}
            {suggestion.dress_code_analysis && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg">
                <span className="material-symbols-outlined text-purple-500 text-sm">style</span>
                <span className="text-xs text-purple-600 dark:text-purple-400">
                  Dress code: {suggestion.dress_code_analysis}
                </span>
              </div>
            )}

            {/* Reasoning */}
            <p className="text-sm text-text-secondary dark:text-gray-400 leading-relaxed">
              {suggestion.reasoning}
            </p>

            {/* View Outfit Button */}
            <button
              onClick={() => onViewOutfit(suggestion)}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">checkroom</span>
              Ver Outfit Sugerido
            </button>
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <button
        onClick={handleFetchEvents}
        className="w-full py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-text-primary dark:text-gray-200 rounded-2xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined">refresh</span>
        Actualizar Eventos
      </button>
    </div>
  );

  // ===== MAIN RENDER =====

  return (
    <div className="fixed inset-0 bg-background dark:bg-dark-background z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="mb-6 w-12 h-12 rounded-full liquid-glass flex items-center justify-center hover:shadow-lg transition-shadow"
        >
          <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
        </button>

        {/* Content */}
        {currentStep === 'connection' && renderConnectionStep()}
        {currentStep === 'loading_events' && renderLoadingEventsStep()}
        {currentStep === 'generating_suggestions' && renderGeneratingSuggestionsStep()}
        {currentStep === 'results' && renderResultsStep()}
      </div>
    </div>
  );
};

export default CalendarSyncView;
