/**
 * Comprehensive Error Message System
 * Provides user-friendly, actionable error messages for all error scenarios
 */

export interface ErrorAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export interface ErrorMessage {
  title: string;
  message: string;
  actions: ErrorAction[];
  severity: 'error' | 'warning' | 'info';
  technical?: string; // Only shown in dev mode
  showDetails?: boolean; // If true, show expandable details
}

export type ErrorCategory =
  | 'ai_rate_limit'
  | 'ai_timeout'
  | 'ai_invalid_response'
  | 'ai_dark_image'
  | 'ai_no_items_found'
  | 'network_offline'
  | 'network_timeout'
  | 'network_server_error'
  | 'validation_bad_image'
  | 'validation_missing_data'
  | 'validation_file_too_large'
  | 'permission_camera_denied'
  | 'permission_storage_full'
  | 'supabase_auth'
  | 'supabase_database'
  | 'supabase_storage'
  | 'generic';

interface ErrorContext {
  retry?: () => void;
  goToPremium?: () => void;
  showPhotoGuide?: () => void;
  retakePhoto?: () => void;
  saveOffline?: () => void;
  contactSupport?: () => void;
  goToSettings?: () => void;
  goBack?: () => void;
  dismiss?: () => void;
}

/**
 * Get user-friendly error message based on error type and context
 */
export function getErrorMessage(
  error: Error | unknown,
  category?: ErrorCategory,
  context?: ErrorContext
): ErrorMessage {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorMessage = errorObj.message.toLowerCase();

  // Auto-detect category if not provided
  if (!category) {
    category = detectErrorCategory(errorMessage);
  }

  // Get base message configuration
  const config = getErrorConfig(category, errorMessage);

  // Build actions array with context
  const actions = buildActions(category, context);

  return {
    ...config,
    actions,
    technical: __DEV__ ? `${errorObj.name}: ${errorObj.message}\n${errorObj.stack || ''}` : undefined,
    showDetails: __DEV__ || config.severity === 'error',
  };
}

/**
 * Detect error category from error message
 */
function detectErrorCategory(errorMessage: string): ErrorCategory {
  // AI-related errors
  if (errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('resource_exhausted')) {
    return 'ai_rate_limit';
  }
  if (errorMessage.includes('timeout') || errorMessage.includes('deadline')) {
    return 'ai_timeout';
  }
  if (errorMessage.includes('oscura') || errorMessage.includes('dark') || errorMessage.includes('too dark')) {
    return 'ai_dark_image';
  }
  if (errorMessage.includes('no se encontró') || errorMessage.includes('no items') || errorMessage.includes('no hay prendas')) {
    return 'ai_no_items_found';
  }
  if (errorMessage.includes('invalid') || errorMessage.includes('parse') || errorMessage.includes('malformed')) {
    return 'ai_invalid_response';
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('offline') || errorMessage.includes('no internet')) {
    return 'network_offline';
  }
  if (errorMessage.includes('timeout')) {
    return 'network_timeout';
  }
  if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
    return 'network_server_error';
  }

  // Validation errors
  if (errorMessage.includes('invalid image') || errorMessage.includes('corrupt') || errorMessage.includes('formato')) {
    return 'validation_bad_image';
  }
  if (errorMessage.includes('too large') || errorMessage.includes('demasiado grande') || errorMessage.includes('exceeds')) {
    return 'validation_file_too_large';
  }
  if (errorMessage.includes('missing') || errorMessage.includes('required') || errorMessage.includes('falta')) {
    return 'validation_missing_data';
  }

  // Permission errors
  if (errorMessage.includes('camera') || errorMessage.includes('permission denied')) {
    return 'permission_camera_denied';
  }
  if (errorMessage.includes('storage full') || errorMessage.includes('quota') || errorMessage.includes('espacio')) {
    return 'permission_storage_full';
  }

  // Supabase errors
  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('not authenticated')) {
    return 'supabase_auth';
  }
  if (errorMessage.includes('database') || errorMessage.includes('postgres') || errorMessage.includes('query')) {
    return 'supabase_database';
  }
  if (errorMessage.includes('storage') || errorMessage.includes('bucket')) {
    return 'supabase_storage';
  }

  return 'generic';
}

/**
 * Get base error configuration for category
 */
function getErrorConfig(category: ErrorCategory, errorMessage: string): Omit<ErrorMessage, 'actions'> {
  switch (category) {
    case 'ai_rate_limit':
      return {
        title: 'Límite de Análisis Alcanzado',
        message: 'Alcanzaste el límite de análisis de la última hora. El servicio gratuito tiene un límite para garantizar acceso justo para todos. Esperá 30 minutos o upgradeá a Premium para análisis ilimitados.',
        severity: 'warning',
      };

    case 'ai_timeout':
      return {
        title: 'Análisis Demorado',
        message: 'El análisis está tardando más de lo esperado. Esto puede deberse a alta demanda en el servidor. Podés intentar de nuevo en unos minutos.',
        severity: 'warning',
      };

    case 'ai_dark_image':
      return {
        title: 'Foto Muy Oscura',
        message: 'La imagen está demasiado oscura para analizar los detalles de la prenda. Intentá tomar la foto con mejor iluminación natural o artificial.',
        severity: 'info',
      };

    case 'insufficient_funds': {
      const details = (originalError as any).details;
      return {
        title: 'Fondos Insuficientes',
        message: `No tenés suficiente saldo para completar la transacción. ${details ? `Saldo disponible: ${details.available_balance}.` : ''} Por favor, recargá tu cuenta.`,
        severity: 'error',
      };
    }

    case 'ai_no_items_found':
      return {
        title: 'No Hay Prendas Disponibles',
        message: 'No tenés suficientes prendas en tu closet para generar un outfit. Agregá más prendas primero.',
        severity: 'info',
      };

    case 'ai_invalid_response':
      return {
        title: 'Respuesta Inválida',
        message: 'El análisis de IA generó una respuesta que no pudimos procesar. Esto es un error temporal, por favor intentá de nuevo.',
        severity: 'error',
      };

    case 'network_offline':
      return {
        title: 'Sin Conexión',
        message: 'No pudimos conectar con el servidor. Verificá tu conexión a internet e intentá de nuevo.',
        severity: 'error',
      };

    case 'network_timeout':
      return {
        title: 'Tiempo de Espera Agotado',
        message: 'La conexión tardó demasiado en responder. Verificá tu conexión a internet e intentá de nuevo.',
        severity: 'warning',
      };

    case 'network_server_error':
      return {
        title: 'Error del Servidor',
        message: 'Nuestro servidor está experimentando problemas temporales. Estamos trabajando para solucionarlo. Intentá de nuevo en unos minutos.',
        severity: 'error',
      };

    case 'validation_bad_image':
      return {
        title: 'Imagen Inválida',
        message: 'El archivo seleccionado no es una imagen válida o está corrupto. Intentá con otra foto.',
        severity: 'error',
      };

    case 'validation_file_too_large':
      return {
        title: 'Archivo Muy Grande',
        message: 'La imagen es demasiado grande (máximo 10MB). Intentá comprimirla o usar una foto de menor resolución.',
        severity: 'warning',
      };

    case 'validation_missing_data':
      return {
        title: 'Datos Faltantes',
        message: 'Falta información requerida para completar esta acción. Verificá que completaste todos los campos necesarios.',
        severity: 'warning',
      };

    case 'permission_camera_denied':
      return {
        title: 'Acceso a Cámara Denegado',
        message: 'Necesitamos acceso a tu cámara para tomar fotos de tus prendas. Por favor habilitá el permiso en la configuración de tu navegador.',
        severity: 'warning',
      };

    case 'permission_storage_full':
      return {
        title: 'Almacenamiento Lleno',
        message: 'No hay suficiente espacio de almacenamiento disponible. Liberá espacio en tu dispositivo o eliminá prendas antiguas.',
        severity: 'warning',
      };

    case 'supabase_auth':
      return {
        title: 'Error de Autenticación',
        message: 'Tu sesión expiró o no tenés permisos para realizar esta acción. Por favor iniciá sesión de nuevo.',
        severity: 'error',
      };

    case 'supabase_database':
      return {
        title: 'Error de Base de Datos',
        message: 'Hubo un problema guardando o cargando tus datos. Verificá tu conexión e intentá de nuevo.',
        severity: 'error',
      };

    case 'supabase_storage':
      return {
        title: 'Error de Almacenamiento',
        message: 'No pudimos guardar la imagen. Verificá tu conexión y que tengás espacio disponible.',
        severity: 'error',
      };

    case 'generic':
    default:
      // Try to extract meaningful message from error
      const cleanMessage = errorMessage.replace(/^error:?\s*/i, '');
      return {
        title: 'Algo Salió Mal',
        message: cleanMessage.length > 10 && cleanMessage.length < 200
          ? cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1) + (cleanMessage.endsWith('.') ? '' : '.')
          : 'Ocurrió un error inesperado. Por favor intentá de nuevo.',
        severity: 'error',
      };
  }
}

/**
 * Build actions array based on category and context
 */
function buildActions(category: ErrorCategory, context?: ErrorContext): ErrorAction[] {
  const actions: ErrorAction[] = [];

  switch (category) {
    case 'ai_rate_limit':
      if (context?.goToPremium) {
        actions.push({
          label: 'Ver Premium',
          action: context.goToPremium,
          variant: 'primary',
        });
      }
      if (context?.dismiss) {
        actions.push({
          label: 'Entendido',
          action: context.dismiss,
          variant: 'ghost',
        });
      }
      break;

    case 'ai_dark_image':
      if (context?.showPhotoGuide) {
        actions.push({
          label: 'Ver Tips de Foto',
          action: context.showPhotoGuide,
          variant: 'secondary',
        });
      }
      if (context?.retakePhoto) {
        actions.push({
          label: 'Tomar Otra Foto',
          action: context.retakePhoto,
          variant: 'primary',
        });
      }
      break;

    case 'ai_no_items_found':
      if (context?.goBack) {
        actions.push({
          label: 'Agregar Prendas',
          action: context.goBack,
          variant: 'primary',
        });
      }
      break;

    case 'network_offline':
    case 'network_timeout':
    case 'network_server_error':
      if (context?.retry) {
        actions.push({
          label: 'Reintentar',
          action: context.retry,
          variant: 'primary',
        });
      }
      if (context?.saveOffline) {
        actions.push({
          label: 'Guardar para Después',
          action: context.saveOffline,
          variant: 'secondary',
        });
      }
      break;

    case 'validation_bad_image':
    case 'validation_file_too_large':
      if (context?.retakePhoto) {
        actions.push({
          label: 'Elegir Otra Imagen',
          action: context.retakePhoto,
          variant: 'primary',
        });
      }
      break;

    case 'permission_camera_denied':
      if (context?.goToSettings) {
        actions.push({
          label: 'Ir a Configuración',
          action: context.goToSettings,
          variant: 'primary',
        });
      }
      break;

    case 'supabase_auth':
      if (context?.goToSettings) {
        actions.push({
          label: 'Iniciar Sesión',
          action: context.goToSettings,
          variant: 'primary',
        });
      }
      break;

    case 'ai_timeout':
    case 'ai_invalid_response':
    case 'supabase_database':
    case 'supabase_storage':
    case 'generic':
    default:
      if (context?.retry) {
        actions.push({
          label: 'Reintentar',
          action: context.retry,
          variant: 'primary',
        });
      }
      if (context?.contactSupport) {
        actions.push({
          label: 'Reportar Problema',
          action: context.contactSupport,
          variant: 'secondary',
        });
      }
      break;
  }

  // Always add dismiss as fallback
  if (actions.length === 0 && context?.dismiss) {
    actions.push({
      label: 'Cerrar',
      action: context.dismiss,
      variant: 'ghost',
    });
  }

  return actions;
}

/**
 * Helper to check if running in development mode
 */
const __DEV__ = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Quick helper functions for common error scenarios
 */
export const ErrorMessages = {
  rateLimitReached: (goToPremium?: () => void) => getErrorMessage(
    new Error('Rate limit reached'),
    'ai_rate_limit',
    { goToPremium }
  ),

  darkImage: (retakePhoto?: () => void, showPhotoGuide?: () => void) => getErrorMessage(
    new Error('Image too dark'),
    'ai_dark_image',
    { retakePhoto, showPhotoGuide }
  ),

  noItemsFound: (goBack?: () => void) => getErrorMessage(
    new Error('No items found'),
    'ai_no_items_found',
    { goBack }
  ),

  networkError: (retry?: () => void, saveOffline?: () => void) => getErrorMessage(
    new Error('Network error'),
    'network_offline',
    { retry, saveOffline }
  ),

  authError: (goToSettings?: () => void) => getErrorMessage(
    new Error('Authentication failed'),
    'supabase_auth',
    { goToSettings }
  ),

  genericError: (error: Error | unknown, retry?: () => void) => getErrorMessage(
    error,
    undefined,
    { retry }
  ),
};
