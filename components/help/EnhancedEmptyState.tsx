import React from 'react';
import { emptyStates, type EmptyStateContent } from '../../data/helpContent';

interface EnhancedEmptyStateProps {
  type: keyof typeof emptyStates | 'custom';
  customContent?: EmptyStateContent;
  onAction?: () => void;
  compact?: boolean;
}

const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  type,
  customContent,
  onAction,
  compact = false
}) => {
  const content = type === 'custom' ? customContent : emptyStates[type];

  if (!content) {
    return null;
  }

  return (
    <div className={`
      flex flex-col items-center justify-center text-center animate-fade-in
      ${compact ? 'py-8 px-4' : 'py-16 px-8'}
    `}>
      {/* Animated icon container */}
      <div className={`
        ${compact ? 'w-20 h-20 mb-4' : 'w-28 h-28 mb-6'}
        rounded-full bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10
        flex items-center justify-center
        shadow-lg shadow-primary/10
        relative overflow-hidden
      `}>
        {/* Animated ring */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping opacity-50" />
        <div className="absolute inset-2 rounded-full border border-dashed border-secondary/30 animate-spin" style={{ animationDuration: '20s' }} />

        {/* Icon */}
        <span className={`
          material-symbols-outlined text-primary relative z-10
          ${compact ? 'text-4xl' : 'text-5xl'}
          animate-bounce-slow
        `}>
          {content.icon}
        </span>
      </div>

      {/* Title */}
      <h2 className={`
        font-serif font-bold text-text-primary dark:text-gray-100 tracking-tight
        ${compact ? 'text-xl mb-2' : 'text-2xl md:text-3xl mb-3'}
      `}>
        {content.title}
      </h2>

      {/* Description */}
      <p className={`
        text-text-secondary dark:text-gray-400 font-medium leading-relaxed
        ${compact ? 'text-sm max-w-[250px]' : 'text-base max-w-[320px] md:max-w-[400px]'}
        mb-6
      `}>
        {content.description}
      </p>

      {/* Tips */}
      {content.tips && content.tips.length > 0 && !compact && (
        <div className="mb-6 max-w-md">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="material-symbols-outlined text-secondary text-lg">lightbulb</span>
            <span className="text-sm font-medium text-secondary">Tips</span>
          </div>
          <ul className="space-y-2">
            {content.tips.map((tip, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-text-secondary dark:text-gray-400"
              >
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action button */}
      {content.action && onAction && (
        <button
          onClick={onAction}
          className={`
            bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl
            shadow-lg shadow-primary/30
            transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95
            ${compact ? 'px-6 py-2.5 text-sm' : 'px-8 py-3.5 text-base'}
          `}
        >
          {content.action.label}
        </button>
      )}

      {/* Decorative elements */}
      {!compact && (
        <div className="flex gap-2 mt-8 text-xs text-text-secondary/50 uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-primary/50" />
            Empezá
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-secondary/50" />
            Explorá
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-accent/50" />
            Descubrí
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedEmptyState;

// Preset empty state components for common screens
export const EmptyCloset: React.FC<{ onAddItem: () => void; compact?: boolean }> = ({ onAddItem, compact }) => (
  <EnhancedEmptyState
    type="closet"
    onAction={onAddItem}
    compact={compact}
  />
);

export const EmptySavedOutfits: React.FC<{ onGenerate: () => void; compact?: boolean }> = ({ onGenerate, compact }) => (
  <EnhancedEmptyState
    type="saved-outfits"
    onAction={onGenerate}
    compact={compact}
  />
);

export const EmptyLookbooks: React.FC<{ onCreate: () => void; compact?: boolean }> = ({ onCreate, compact }) => (
  <EnhancedEmptyState
    type="lookbooks"
    onAction={onCreate}
    compact={compact}
  />
);

export const EmptySearchResults: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <EnhancedEmptyState
    type="search-results"
    compact={compact}
  />
);

export const EmptyActivityFeed: React.FC<{ onExplore: () => void; compact?: boolean }> = ({ onExplore, compact }) => (
  <EnhancedEmptyState
    type="activity-feed"
    onAction={onExplore}
    compact={compact}
  />
);

export const EmptyChallenges: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <EnhancedEmptyState
    type="challenges"
    compact={compact}
  />
);

export const EmptyGenerationHistory: React.FC<{ onDesign: () => void; compact?: boolean }> = ({ onDesign, compact }) => (
  <EnhancedEmptyState
    type="generation-history"
    onAction={onDesign}
    compact={compact}
  />
);

// Generic custom empty state
export const CustomEmptyState: React.FC<{
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tips?: string[];
  compact?: boolean;
}> = ({ icon, title, description, actionLabel, onAction, tips, compact }) => (
  <EnhancedEmptyState
    type="custom"
    customContent={{
      icon,
      title,
      description,
      action: actionLabel && onAction ? { label: actionLabel, handler: 'custom' } : undefined,
      tips
    }}
    onAction={onAction}
    compact={compact}
  />
);
