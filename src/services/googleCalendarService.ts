/**
 * Google Calendar Service
 *
 * Handles Google Calendar API integration for event-based outfit suggestions.
 * Uses OAuth 2.0 tokens stored in localStorage and Gemini AI for event classification.
 *
 * Note: This is an MVP implementation. For production, implement proper OAuth flow
 * with backend token management and refresh logic.
 */

import type {
  GoogleCalendarEvent,
  GoogleCalendarConnection,
  CalendarEventType,
  OutfitSuggestionForEvent,
  ClothingItem,
  FitResult
} from '../../types';
import * as geminiService from './aiService';

const STORAGE_KEY = 'ojodeloca-google-calendar-connection';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// ===========================================
// CONNECTION MANAGEMENT
// ===========================================

/**
 * Get current Google Calendar connection status
 */
export function getConnection(): GoogleCalendarConnection {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { is_connected: false };
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error reading calendar connection:', error);
    return { is_connected: false };
  }
}

/**
 * Save Google Calendar connection (OAuth token + metadata)
 */
export function saveConnection(connection: GoogleCalendarConnection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
}

/**
 * Remove Google Calendar connection (disconnect)
 */
export function disconnectCalendar(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if access token is expired
 */
function isTokenExpired(connection: GoogleCalendarConnection): boolean {
  if (!connection.token_expiry) return true;
  const expiry = new Date(connection.token_expiry);
  const now = new Date();
  // Consider expired if within 5 minutes of expiry
  return now.getTime() >= expiry.getTime() - 5 * 60 * 1000;
}

// ===========================================
// GOOGLE CALENDAR API
// ===========================================

/**
 * Fetch upcoming calendar events (next 14 days)
 */
export async function fetchUpcomingEvents(): Promise<GoogleCalendarEvent[]> {
  const connection = getConnection();

  if (!connection.is_connected || !connection.access_token) {
    throw new Error('No estás conectado a Google Calendar. Conectá tu cuenta primero.');
  }

  if (isTokenExpired(connection)) {
    throw new Error('Tu sesión de Google Calendar expiró. Por favor, volvé a conectar tu cuenta.');
  }

  try {
    // Fetch events from next 14 days
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const url = new URL(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`);
    url.searchParams.append('timeMin', now.toISOString());
    url.searchParams.append('timeMax', twoWeeksFromNow.toISOString());
    url.searchParams.append('orderBy', 'startTime');
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('maxResults', '50');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Tu sesión de Google Calendar expiró. Por favor, volvé a conectar tu cuenta.');
      }
      throw new Error(`Error de Google Calendar API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform Google Calendar events to our format
    const events: GoogleCalendarEvent[] = (data.items || [])
      .filter((item: any) => item.start?.dateTime) // Only events with specific times
      .map((item: any) => ({
        id: item.id,
        summary: item.summary || 'Sin título',
        description: item.description,
        start: item.start.dateTime,
        end: item.end.dateTime,
        location: item.location,
      }));

    // Update last sync time
    connection.last_sync = new Date().toISOString();
    saveConnection(connection);

    return events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Ocurrió un error al cargar los eventos del calendario.');
  }
}

// ===========================================
// AI EVENT CLASSIFICATION
// ===========================================

/**
 * Classify event type using Gemini AI based on title, description, and location
 */
export async function classifyEventType(event: GoogleCalendarEvent): Promise<CalendarEventType> {
  try {
    const prompt = `Sos un experto en clasificar tipos de eventos sociales y laborales.

EVENTO:
Título: ${event.summary}
${event.description ? `Descripción: ${event.description}` : ''}
${event.location ? `Ubicación: ${event.location}` : ''}

INSTRUCCIONES:
Clasificá este evento en UNA de las siguientes categorías:
- work_meeting: Reuniones de trabajo, meetings, llamadas laborales
- presentation: Presentaciones formales, conferencias, charlas
- dinner_date: Cena romántica, date, cita
- casual_hangout: Salida casual con amigos, café, after office informal
- interview: Entrevista laboral, proceso de selección
- party: Fiesta, cumpleaños, celebración social
- workout: Ejercicio, gym, deporte, actividad física
- travel: Viaje, transporte, vuelo, traslado
- formal_event: Evento formal, gala, casamiento, evento corporativo formal
- other: Cualquier otro tipo que no encaje en las anteriores

Respondé SOLO con el nombre de la categoría (ej: "work_meeting").`;

    const result = await geminiService.generateContent(prompt);
    const classification = result.trim().toLowerCase().replace(/[^a-z_]/g, '');

    // Validate classification
    const validTypes: CalendarEventType[] = [
      'work_meeting', 'presentation', 'dinner_date', 'casual_hangout',
      'interview', 'party', 'workout', 'travel', 'formal_event', 'other'
    ];

    if (validTypes.includes(classification as CalendarEventType)) {
      return classification as CalendarEventType;
    }

    return 'other';
  } catch (error) {
    console.error('Error classifying event:', error);
    return 'other';
  }
}

/**
 * Generate outfit suggestion for a calendar event using Gemini AI
 */
export async function generateOutfitForEvent(
  event: GoogleCalendarEvent,
  eventType: CalendarEventType,
  closet: ClothingItem[]
): Promise<OutfitSuggestionForEvent> {
  if (closet.length < 5) {
    throw new Error('Necesitás al menos 5 prendas en tu armario para generar sugerencias.');
  }

  try {
    // Use existing generateOutfit with contextual prompt
    const contextPrompt = getEventContextPrompt(event, eventType);
    const fitResult = await geminiService.generateOutfit(contextPrompt, closet);

    // Generate reasoning specifically for this event
    const reasoning = await generateEventReasoning(event, eventType, fitResult);

    const suggestion: OutfitSuggestionForEvent = {
      event_id: event.id,
      event_summary: event.summary,
      event_date: event.start,
      event_type: eventType,
      suggested_outfit: fitResult,
      reasoning,
      dress_code_analysis: event.description ? extractDressCode(event.description) : undefined,
      confidence: calculateConfidence(eventType, closet.length),
    };

    return suggestion;
  } catch (error) {
    console.error('Error generating outfit for event:', error);
    throw error;
  }
}

/**
 * Get contextual prompt based on event type
 */
function getEventContextPrompt(event: GoogleCalendarEvent, eventType: CalendarEventType): string {
  const eventTypePrompts: Record<CalendarEventType, string> = {
    work_meeting: 'una reunión de trabajo profesional. Priorizá looks pulidos, formales pero cómodos. Colores neutros y siluetas profesionales.',
    presentation: 'una presentación formal importante. Necesito lucir profesional, confiado y memorable. Priorizá elegancia y formalidad.',
    dinner_date: 'una cena romántica especial. Buscá un look sofisticado, atractivo pero sin exagerar. Prioriza elegancia casual.',
    casual_hangout: 'una salida casual con amigos. Priorizá comodidad y estilo relajado. Casual chic.',
    interview: 'una entrevista laboral. Necesito lucir extremadamente profesional, pulido y confiable. Máxima formalidad.',
    party: 'una fiesta o evento social. Buscá un look festivo, divertido y con personalidad. Podés arriesgar más con el estilo.',
    workout: 'ejercicio o actividad física. Priorizá comodidad, funcionalidad y prendas deportivas.',
    travel: 'un viaje o traslado. Priorizá comodidad, practicidad y capas versátiles.',
    formal_event: 'un evento formal elegante. Necesito lucir impecable, sofisticado y apropiado para la ocasión. Máxima elegancia.',
    other: 'un evento. Sugerí un outfit versátil que funcione para distintas situaciones.',
  };

  return eventTypePrompts[eventType] || eventTypePrompts.other;
}

/**
 * Generate specific reasoning for why this outfit works for this event
 */
async function generateEventReasoning(
  event: GoogleCalendarEvent,
  eventType: CalendarEventType,
  fitResult: FitResult
): Promise<string> {
  try {
    const prompt = `Sos un estilista personal experto.

EVENTO:
Tipo: ${eventType}
Título: "${event.summary}"
${event.description ? `Descripción: ${event.description}` : ''}
${event.location ? `Ubicación: ${event.location}` : ''}

OUTFIT SUGERIDO:
${fitResult.explanation}

INSTRUCCIONES:
Explicá en 2-3 oraciones POR QUÉ este outfit es perfecto para este evento específico.
Mencioná el contexto del evento y cómo las prendas se adaptan a la ocasión.
Usá tono cercano (vos/tu) y español argentino.`;

    return await geminiService.generateContent(prompt);
  } catch (error) {
    console.error('Error generating event reasoning:', error);
    return fitResult.explanation;
  }
}

/**
 * Extract dress code from event description if mentioned
 */
function extractDressCode(description: string): string | undefined {
  const lowerDesc = description.toLowerCase();

  const dressCodeKeywords = [
    { keywords: ['formal', 'black tie', 'traje'], code: 'Formal' },
    { keywords: ['business', 'profesional', 'corporativo'], code: 'Business / Profesional' },
    { keywords: ['casual', 'informal', 'relajado'], code: 'Casual' },
    { keywords: ['smart casual', 'semi-formal'], code: 'Smart Casual' },
    { keywords: ['cocktail'], code: 'Cocktail' },
  ];

  for (const { keywords, code } of dressCodeKeywords) {
    if (keywords.some(keyword => lowerDesc.includes(keyword))) {
      return code;
    }
  }

  return undefined;
}

/**
 * Calculate confidence score based on event type clarity and closet size
 */
function calculateConfidence(eventType: CalendarEventType, closetSize: number): number {
  let baseConfidence = 70;

  // Higher confidence for clear event types
  if (['work_meeting', 'interview', 'formal_event', 'presentation'].includes(eventType)) {
    baseConfidence = 85;
  } else if (eventType === 'other') {
    baseConfidence = 60;
  }

  // Bonus for larger closet (more options)
  const closetBonus = Math.min((closetSize - 5) * 2, 15);

  return Math.min(baseConfidence + closetBonus, 95);
}

// ===========================================
// BATCH OPERATIONS
// ===========================================

/**
 * Generate outfit suggestions for multiple events
 */
export async function generateSuggestionsForEvents(
  events: GoogleCalendarEvent[],
  closet: ClothingItem[]
): Promise<OutfitSuggestionForEvent[]> {
  if (events.length === 0) {
    return [];
  }

  const suggestions: OutfitSuggestionForEvent[] = [];

  for (const event of events) {
    try {
      // Classify event type
      const eventType = await classifyEventType(event);

      // Update event with classified type
      event.event_type = eventType;

      // Generate outfit suggestion
      const suggestion = await generateOutfitForEvent(event, eventType, closet);
      suggestions.push(suggestion);

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error generating suggestion for event ${event.id}:`, error);
      // Continue with next event instead of failing completely
    }
  }

  return suggestions;
}

// ===========================================
// OAUTH HELPER (MVP SIMPLIFIED)
// ===========================================

/**
 * Connect Google Calendar using OAuth token from Google OAuth Playground
 *
 * For MVP: Users get token from https://developers.google.com/oauthplayground/
 * For production: Implement proper OAuth flow with backend
 */
export async function connectWithToken(
  accessToken: string,
  expiryDate?: string
): Promise<GoogleCalendarConnection> {
  try {
    // Validate token by fetching user's primary calendar info
    const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList/primary`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Token inválido o expirado. Verificá que el token sea correcto.');
    }

    const calendarInfo = await response.json();
    const userEmail = calendarInfo.id || 'Usuario de Google';

    const connection: GoogleCalendarConnection = {
      is_connected: true,
      user_email: userEmail,
      access_token: accessToken,
      token_expiry: expiryDate || new Date(Date.now() + 3600 * 1000).toISOString(),
      last_sync: undefined,
    };

    saveConnection(connection);
    return connection;
  } catch (error) {
    console.error('Error connecting to Google Calendar:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('No se pudo conectar con Google Calendar. Verificá el token.');
  }
}
