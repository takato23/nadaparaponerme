import React, { useState, useEffect } from 'react';
import {
  migrateUserData,
  needsMigration,
  type MigrationProgress,
} from '../src/services/migrationService';
import { enableFeature } from '../src/config/features';

interface MigrationModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

const MigrationModal: React.FC<MigrationModalProps> = ({
  onComplete,
  onSkip,
}) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState<MigrationProgress>({
    phase: 'idle',
    current: 0,
    total: 0,
    message: '',
  });
  const [showMigration, setShowMigration] = useState(false);

  // Check if migration is needed on mount
  useEffect(() => {
    const checkMigration = async () => {
      const needed = await needsMigration();
      setShowMigration(needed);
      if (!needed) {
        onComplete(); // Auto-complete if no migration needed
      }
    };
    checkMigration();
  }, [onComplete]);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      await migrateUserData((progressUpdate) => {
        setProgress(progressUpdate);
      });

      // Enable Supabase features after successful migration
      enableFeature('useSupabaseCloset');
      enableFeature('useSupabaseOutfits');

      // Wait a bit to show completion message
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Migration failed:', error);
      setIsMigrating(false);
    }
  };

  const handleSkip = () => {
    setShowMigration(false);
    onSkip();
  };

  // Don't render if migration not needed
  if (!showMigration) {
    return null;
  }

  const getPhaseLabel = (phase: MigrationProgress['phase']): string => {
    switch (phase) {
      case 'idle':
        return 'Preparando migración...';
      case 'closet':
        return 'Migrando armario';
      case 'outfits':
        return 'Migrando outfits guardados';
      case 'complete':
        return '¡Completado!';
      case 'error':
        return 'Error en la migración';
      default:
        return '';
    }
  };

  const getPhaseIcon = (phase: MigrationProgress['phase']): string => {
    switch (phase) {
      case 'closet':
        return 'dresser';
      case 'outfits':
        return 'favorite';
      case 'complete':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'cloud_upload';
    }
  };

  const progressPercentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="liquid-glass rounded-3xl p-8 max-w-md w-full shadow-soft-lg">
        {!isMigrating ? (
          // Initial prompt
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-primary">
                  cloud_upload
                </span>
              </div>
              <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
                Migración a la nube
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Hemos mejorado la app con almacenamiento en la nube. ¿Querés
                migrar tus datos ahora?
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-xl">
                <span className="material-symbols-outlined text-primary mt-0.5">
                  check_circle
                </span>
                <div>
                  <p className="font-semibold text-sm text-text-primary dark:text-gray-200">
                    Tus datos en la nube
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Accedé desde cualquier dispositivo
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-xl">
                <span className="material-symbols-outlined text-primary mt-0.5">
                  security
                </span>
                <div>
                  <p className="font-semibold text-sm text-text-primary dark:text-gray-200">
                    Seguro y privado
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Tus prendas están protegidas
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-black/20 rounded-xl">
                <span className="material-symbols-outlined text-primary mt-0.5">
                  backup
                </span>
                <div>
                  <p className="font-semibold text-sm text-text-primary dark:text-gray-200">
                    Respaldo automático
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    No vas a perder tus datos
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 px-6 py-3 rounded-xl bg-gray-200/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 font-semibold transition-transform active:scale-95"
              >
                Después
              </button>
              <button
                onClick={handleMigrate}
                className="flex-1 px-6 py-3 rounded-xl bg-primary text-white font-semibold transition-transform active:scale-95 shadow-soft shadow-primary/30"
              >
                Migrar ahora
              </button>
            </div>
          </>
        ) : (
          // Migration in progress
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span
                  className={`material-symbols-outlined text-4xl ${
                    progress.phase === 'complete'
                      ? 'text-green-500'
                      : progress.phase === 'error'
                      ? 'text-red-500'
                      : 'text-primary'
                  }`}
                >
                  {getPhaseIcon(progress.phase)}
                </span>
              </div>
              <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-2">
                {getPhaseLabel(progress.phase)}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress.message}
              </p>
            </div>

            {progress.phase !== 'error' && progress.phase !== 'complete' && (
              <div className="mb-4">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
                  {progress.current} de {progress.total}
                </p>
              </div>
            )}

            {progress.phase === 'complete' && (
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cerrando automáticamente...
                </p>
              </div>
            )}

            {progress.phase === 'error' && (
              <button
                onClick={() => setIsMigrating(false)}
                className="w-full px-6 py-3 rounded-xl bg-red-500 text-white font-semibold transition-transform active:scale-95"
              >
                Reintentar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MigrationModal;
