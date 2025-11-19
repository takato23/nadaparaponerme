import React, { useState, useEffect } from 'react';
import type { ClothingItem, StyleChallenge, ChallengeDifficulty, SavedOutfit } from '../types';
import { generateStyleChallenge, type StyleChallengeGeneration } from '../src/services/aiService';
import * as challengeService from '../src/services/challengeService';
import Loader from './Loader';
import { EmptyState } from './ui/EmptyState';
import { Card } from './ui/Card';

interface StyleChallengesViewProps {
  closet: ClothingItem[];
  savedOutfits: SavedOutfit[];
  onClose: () => void;
  onViewOutfit?: (outfit: SavedOutfit) => void;
}

type ViewStep = 'list' | 'generating' | 'detail';

const StyleChallengesView = ({ closet, savedOutfits, onClose, onViewOutfit }: StyleChallengesViewProps) => {
  const [currentStep, setCurrentStep] = useState<ViewStep>('list');
  const [challenges, setChallenges] = useState<StyleChallenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<StyleChallenge | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    skipped: 0,
    totalPoints: 0,
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty>('medium');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load challenges on mount
  useEffect(() => {
    loadChallenges();
    loadStats();
  }, []);

  const loadChallenges = async () => {
    try {
      const allChallenges = await challengeService.getUserChallenges();
      setChallenges(allChallenges);
    } catch (err) {
      console.error('Error loading challenges:', err);
      setError('Error al cargar desafíos');
    }
  };

  const loadStats = async () => {
    try {
      const challengeStats = await challengeService.getChallengeStats();
      setStats(challengeStats);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleGenerateChallenge = async () => {
    if (closet.length < 10) {
      setError('Necesitas al menos 10 prendas en tu armario para generar desafíos');
      return;
    }

    setCurrentStep('generating');
    setError(null);

    try {
      const generatedChallenge = await generateStyleChallenge(closet, selectedDifficulty);

      const newChallenge = await challengeService.createChallenge({
        type: generatedChallenge.type,
        difficulty: generatedChallenge.difficulty,
        title: generatedChallenge.title,
        description: generatedChallenge.description,
        constraints: generatedChallenge.constraints,
        required_items: generatedChallenge.required_items || null,
        duration_days: generatedChallenge.duration_days,
        points_reward: generatedChallenge.points_reward,
        status: 'active',
      });

      await loadChallenges();
      await loadStats();
      setSelectedChallenge(newChallenge);
      setCurrentStep('detail');
    } catch (err) {
      console.error('Error generating challenge:', err);
      setError(err instanceof Error ? err.message : 'Error al generar desafío');
      setCurrentStep('list');
    }
  };

  const handleViewChallenge = (challenge: StyleChallenge) => {
    setSelectedChallenge(challenge);
    setCurrentStep('detail');
  };

  const handleCompleteChallenge = async (outfitId?: string) => {
    if (!selectedChallenge) return;

    try {
      await challengeService.completeChallenge(selectedChallenge.id, outfitId);
      await loadChallenges();
      await loadStats();
      setCurrentStep('list');
      setSelectedChallenge(null);
    } catch (err) {
      console.error('Error completing challenge:', err);
      setError('Error al completar desafío');
    }
  };

  const handleSkipChallenge = async () => {
    if (!selectedChallenge) return;

    try {
      await challengeService.skipChallenge(selectedChallenge.id);
      await loadChallenges();
      await loadStats();
      setCurrentStep('list');
      setSelectedChallenge(null);
    } catch (err) {
      console.error('Error skipping challenge:', err);
      setError('Error al saltar desafío');
    }
  };

  const getDifficultyColor = (difficulty: ChallengeDifficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'hard': return 'text-red-600 dark:text-red-400';
    }
  };

  const getDifficultyLabel = (difficulty: ChallengeDifficulty) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Medio';
      case 'hard': return 'Difícil';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'color': return 'palette';
      case 'style': return 'style';
      case 'occasion': return 'event';
      case 'seasonal': return 'wb_sunny';
      case 'creativity': return 'brush';
      case 'minimalist': return 'minimize';
      default: return 'auto_awesome';
    }
  };

  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">
              Desafíos de Estilo
            </h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">
              {currentStep === 'list' && `${stats.active} activos • ${stats.totalPoints} puntos ganados`}
              {currentStep === 'generating' && 'Generando desafío...'}
              {currentStep === 'detail' && selectedChallenge?.title}
            </p>
          </div>
          <Card
            variant="glass"
            padding="none"
            rounded="full"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-text-primary dark:text-gray-200">close</span>
          </Card>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: List View */}
          {currentStep === 'list' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card variant="glass" padding="md" rounded="xl" className="text-center">
                  <div className="text-3xl font-bold text-primary">{stats.active}</div>
                  <div className="text-sm text-text-secondary dark:text-gray-400">Activos</div>
                </Card>
                <Card variant="glass" padding="md" rounded="xl" className="text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
                  <div className="text-sm text-text-secondary dark:text-gray-400">Completados</div>
                </Card>
                <Card variant="glass" padding="md" rounded="xl" className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.totalPoints}</div>
                  <div className="text-sm text-text-secondary dark:text-gray-400">Puntos</div>
                </Card>
                <Card variant="glass" padding="md" rounded="xl" className="text-center">
                  <div className="text-3xl font-bold text-text-primary dark:text-gray-200">{stats.total}</div>
                  <div className="text-sm text-text-secondary dark:text-gray-400">Total</div>
                </Card>
              </div>

              {/* Generate New Challenge */}
              <Card variant="glass" padding="lg" rounded="2xl">
                <h3 className="font-bold text-text-primary dark:text-gray-200 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  Generar Nuevo Desafío
                </h3>
                <p className="text-sm text-text-secondary dark:text-gray-400 mb-4">
                  Genera un desafío personalizado basado en tu armario
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm text-text-secondary dark:text-gray-400">Dificultad:</label>
                  <Card variant="glass" padding="none" rounded="xl" className="flex-1">
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value as ChallengeDifficulty)}
                      className="w-full px-4 py-2 bg-transparent rounded-xl text-text-primary dark:text-gray-200"
                    >
                      <option value="easy">Fácil (10-30 puntos)</option>
                      <option value="medium">Medio (40-60 puntos)</option>
                      <option value="hard">Difícil (70-100 puntos)</option>
                    </select>
                  </Card>
                </div>
                <button
                  onClick={handleGenerateChallenge}
                  disabled={closet.length < 10}
                  className="w-full px-6 py-3 bg-primary text-white rounded-xl font-semibold transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generar Desafío
                </button>
                {closet.length < 10 && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                    Necesitas al menos 10 prendas en tu armario
                  </p>
                )}
              </Card>

              {/* Active Challenges */}
              {activeChallenges.length > 0 && (
                <div>
                  <h3 className="font-bold text-text-primary dark:text-gray-200 mb-3">
                    Desafíos Activos ({activeChallenges.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeChallenges.map((challenge) => (
                      <Card
                        key={challenge.id}
                        variant="glass"
                        padding="md"
                        rounded="xl"
                        onClick={() => handleViewChallenge(challenge)}
                        className="text-left transition-transform active:scale-95 cursor-pointer"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary">
                              {getTypeIcon(challenge.type)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-text-primary dark:text-gray-200 truncate">
                              {challenge.title}
                            </h4>
                            <p className={`text-sm font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                              {getDifficultyLabel(challenge.difficulty)} • {challenge.points_reward} pts
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-text-secondary dark:text-gray-400 line-clamp-2">
                          {challenge.description}
                        </p>
                        <div className="mt-2 text-xs text-text-secondary dark:text-gray-400">
                          {challenge.duration_days} {challenge.duration_days === 1 ? 'día' : 'días'}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Challenges */}
              {completedChallenges.length > 0 && (
                <div>
                  <h3 className="font-bold text-text-primary dark:text-gray-200 mb-3">
                    Completados ({completedChallenges.length})
                  </h3>
                  <div className="space-y-2">
                    {completedChallenges.map((challenge) => (
                      <Card
                        key={challenge.id}
                        variant="glass"
                        padding="sm"
                        rounded="xl"
                        onClick={() => handleViewChallenge(challenge)}
                        className="w-full text-left transition-transform active:scale-95 flex items-center gap-3 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                          check_circle
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-text-primary dark:text-gray-200 truncate">
                            {challenge.title}
                          </div>
                          <div className="text-xs text-text-secondary dark:text-gray-400">
                            +{challenge.points_reward} pts
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {challenges.length === 0 && (
                <EmptyState
                  icon="auto_awesome"
                  title="Sin Desafíos Aún"
                  description="Genera tu primer desafío de estilo para empezar"
                />
              )}
            </div>
          )}

          {/* Step 2: Generating */}
          {currentStep === 'generating' && (
            <div className="text-center py-12">
              <Loader />
              <p className="text-text-secondary dark:text-gray-400 mt-4 mb-2">
                Creando tu desafío personalizado...
              </p>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Analizando tu armario y generando restricciones
              </p>
            </div>
          )}

          {/* Step 3: Challenge Detail */}
          {currentStep === 'detail' && selectedChallenge && (
            <div className="space-y-6">
              {/* Challenge Header */}
              <Card variant="glass" padding="lg" rounded="2xl">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      {getTypeIcon(selectedChallenge.type)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-text-primary dark:text-gray-200 mb-2">
                      {selectedChallenge.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`font-medium ${getDifficultyColor(selectedChallenge.difficulty)}`}>
                        {getDifficultyLabel(selectedChallenge.difficulty)}
                      </span>
                      <span className="text-text-secondary dark:text-gray-400">•</span>
                      <span className="text-text-secondary dark:text-gray-400">
                        {selectedChallenge.duration_days} {selectedChallenge.duration_days === 1 ? 'día' : 'días'}
                      </span>
                      <span className="text-text-secondary dark:text-gray-400">•</span>
                      <span className="font-medium text-yellow-600 dark:text-yellow-400">
                        {selectedChallenge.points_reward} puntos
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-text-primary dark:text-gray-200 leading-relaxed">
                  {selectedChallenge.description}
                </p>
              </Card>

              {/* Constraints */}
              <Card variant="glass" padding="lg" rounded="2xl">
                <h4 className="font-bold text-text-primary dark:text-gray-200 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">rule</span>
                  Restricciones
                </h4>
                <ul className="space-y-2">
                  {selectedChallenge.constraints.map((constraint, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-text-secondary dark:text-gray-400"
                    >
                      <span className="material-symbols-outlined text-primary text-sm mt-0.5">
                        check
                      </span>
                      <span>{constraint}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              {/* Required Items */}
              {selectedChallenge.required_items && selectedChallenge.required_items.length > 0 && (
                <Card variant="glass" padding="lg" rounded="2xl">
                  <h4 className="font-bold text-text-primary dark:text-gray-200 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                    Prendas Requeridas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedChallenge.required_items.map((item, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              {/* Actions */}
              {selectedChallenge.status === 'active' && (
                <div className="flex gap-3">
                  <Card
                    variant="glass"
                    padding="none"
                    rounded="xl"
                    onClick={() => setCurrentStep('list')}
                    className="flex-1 px-6 py-3 font-semibold transition-transform active:scale-95 text-text-primary dark:text-gray-200 cursor-pointer flex items-center justify-center"
                  >
                    Volver
                  </Card>
                  <Card
                    variant="glass"
                    padding="none"
                    rounded="xl"
                    onClick={() => handleSkipChallenge()}
                    className="flex-1 px-6 py-3 font-semibold transition-transform active:scale-95 text-text-secondary dark:text-gray-400 cursor-pointer flex items-center justify-center"
                  >
                    Saltar
                  </Card>
                  <button
                    onClick={() => handleCompleteChallenge()}
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold transition-transform active:scale-95"
                  >
                    Marcar Completo
                  </button>
                </div>
              )}

              {selectedChallenge.status === 'completed' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span className="font-medium">Desafío Completado - +{selectedChallenge.points_reward} puntos</span>
                  </div>
                  <Card
                    variant="glass"
                    padding="none"
                    rounded="xl"
                    onClick={() => setCurrentStep('list')}
                    className="w-full px-6 py-3 font-semibold transition-transform active:scale-95 text-text-primary dark:text-gray-200 cursor-pointer flex items-center justify-center"
                  >
                    Volver a Desafíos
                  </Card>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default StyleChallengesView;
