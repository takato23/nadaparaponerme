import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Reusable EmptyState component
 * Used when there's no data to display in a view
 */
export function EmptyState({
  icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-12 px-6 ${className}`}>
      {emoji && <div className="text-6xl mb-4">{emoji}</div>}
      {icon && !emoji && (
        <span className="material-symbols-outlined text-6xl mb-4 text-gray-400 dark:text-gray-600">
          {icon}
        </span>
      )}

      <h3 className="text-xl font-semibold mb-2 text-text-primary dark:text-gray-200">
        {title}
      </h3>

      {description && (
        <p className="text-text-secondary dark:text-gray-400 mb-6 max-w-md">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-semibold
                     transition-transform active:scale-95 shadow-soft shadow-primary/30
                     hover:shadow-lg"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Common empty states as presets
 */
export const EmptyStates = {
  NoClosetItems: () => (
    <EmptyState
      emoji="👔"
      title="Tu armario está vacío"
      description="Agregá tu primera prenda para comenzar a crear outfits increíbles"
    />
  ),

  NoOutfits: () => (
    <EmptyState
      emoji="✨"
      title="No tenés outfits guardados"
      description="Generá tu primer outfit y guardalo para usarlo más tarde"
    />
  ),

  NoSearchResults: () => (
    <EmptyState
      icon="search_off"
      title="No se encontraron resultados"
      description="Probá con otros términos de búsqueda"
    />
  ),

  NoActivity: () => (
    <EmptyState
      emoji="📭"
      title="No hay actividad reciente"
      description="Cuando tus amigos compartan outfits, aparecerán acá"
    />
  ),

  NoChallenges: () => (
    <EmptyState
      emoji="🎯"
      title="No hay desafíos activos"
      description="Creá un nuevo desafío de estilo para comenzar"
    />
  ),

  NoPackingLists: () => (
    <EmptyState
      emoji="🧳"
      title="No hay listas de viaje"
      description="Creá tu primera lista inteligente para tu próximo viaje"
    />
  )
};
