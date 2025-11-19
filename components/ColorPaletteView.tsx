
import React, { useState } from 'react';
import type { ClothingItem, ColorPaletteAnalysis } from '../types';
import { analyzeColorPalette } from '../src/services/aiService';
import Loader from './Loader';
import { Card } from './ui/Card';

interface ColorPaletteViewProps {
  closet: ClothingItem[];
  onClose: () => void;
}

const ColorPaletteView = ({ closet, onClose }: ColorPaletteViewProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ColorPaletteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (closet.length === 0) {
      setError('No hay prendas en el armario para analizar');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeColorPalette(closet);
      setAnalysis(result);
    } catch (err) {
      console.error('Error analyzing color palette:', err);
      setError(err instanceof Error ? err.message : 'Error al analizar la paleta de colores');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSchemeLabel = (scheme: string) => {
    const schemes: Record<string, string> = {
      monochromatic: 'Monocromático',
      complementary: 'Complementario',
      analogous: 'Análogo',
      triadic: 'Triádico',
      diverse: 'Diverso'
    };
    return schemes[scheme] || scheme;
  };

  const getSchemeIcon = (scheme: string) => {
    const icons: Record<string, string> = {
      monochromatic: 'palette',
      complementary: 'contrast',
      analogous: 'gradient',
      triadic: 'auto_awesome',
      diverse: 'colorize'
    };
    return icons[scheme] || 'palette';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-text-primary dark:text-gray-200">Paleta de Colores</h2>
            <p className="text-sm text-text-secondary dark:text-gray-400">Análisis cromático de tu armario</p>
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

          {/* Initial State */}
          {!analysis && !isAnalyzing && !error && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-5xl">palette</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-2">
                Descubre tu Paleta de Colores
              </h3>
              <p className="text-text-secondary dark:text-gray-400 mb-6 max-w-md mx-auto">
                Analizaremos los colores dominantes de tu armario y te sugeriremos mejoras para aumentar la versatilidad.
              </p>
              <button
                onClick={handleAnalyze}
                className="px-8 py-3 bg-primary text-white rounded-full font-semibold transition-transform active:scale-95 shadow-soft shadow-primary/30"
              >
                Analizar Paleta
              </button>
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="text-center py-12">
              <Loader />
              <p className="text-text-secondary dark:text-gray-400 mt-4">
                Analizando colores...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-5xl">error</span>
              </div>
              <h3 className="text-xl font-bold text-text-primary dark:text-gray-200 mb-2">
                Error al Analizar
              </h3>
              <p className="text-text-secondary dark:text-gray-400 mb-6">{error}</p>
              <button
                onClick={handleAnalyze}
                className="px-8 py-3 bg-primary text-white rounded-full font-semibold transition-transform active:scale-95"
              >
                Intentar de Nuevo
              </button>
            </div>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-6">

              {/* Versatility Score */}
              <Card variant="glass" padding="lg" rounded="2xl" className="text-center">
                <h3 className="text-sm font-medium text-text-secondary dark:text-gray-400 mb-2">
                  Puntuación de Versatilidad
                </h3>
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="transform -rotate-90 w-32 h-32">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - analysis.versatility_score / 100)}`}
                      className="text-primary transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-text-primary dark:text-gray-200">
                      {Math.round(analysis.versatility_score)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  {analysis.versatility_score >= 80 && 'Excelente balance de colores'}
                  {analysis.versatility_score >= 60 && analysis.versatility_score < 80 && 'Buen balance de colores'}
                  {analysis.versatility_score >= 40 && analysis.versatility_score < 60 && 'Balance moderado'}
                  {analysis.versatility_score < 40 && 'Oportunidad de mejora'}
                </p>
              </Card>

              {/* Dominant Colors */}
              <Card variant="glass" padding="lg" rounded="2xl">
                <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
                  Colores Dominantes
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analysis.dominant_colors.map((color, index) => (
                    <div key={index} className="text-center">
                      <div
                        className="w-20 h-20 mx-auto mb-2 rounded-full shadow-md border-4 border-white dark:border-gray-800"
                        style={{ backgroundColor: color.hex }}
                      />
                      <p className="text-sm font-semibold text-text-primary dark:text-gray-200">
                        {color.name}
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-400">
                        {Math.round(color.percentage)}%
                      </p>
                      <p className="text-xs text-text-secondary dark:text-gray-500 font-mono">
                        {color.hex}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Color Scheme */}
              <Card variant="glass" padding="lg" rounded="2xl">
                <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
                  Esquema Cromático
                </h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-3xl">
                      {getSchemeIcon(analysis.color_scheme)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-text-primary dark:text-gray-200">
                      {getSchemeLabel(analysis.color_scheme)}
                    </p>
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                      {analysis.color_scheme === 'monochromatic' && 'Variaciones de un mismo color'}
                      {analysis.color_scheme === 'complementary' && 'Colores opuestos que se equilibran'}
                      {analysis.color_scheme === 'analogous' && 'Colores adyacentes armoniosos'}
                      {analysis.color_scheme === 'triadic' && 'Tres colores equidistantes'}
                      {analysis.color_scheme === 'diverse' && 'Amplia variedad de colores'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Missing Colors */}
              {analysis.missing_colors.length > 0 && (
                <Card variant="glass" padding="lg" rounded="2xl">
                  <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
                    Colores Sugeridos
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {analysis.missing_colors.map((color, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm"
                      >
                        {color}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recommendations */}
              <Card variant="glass" padding="lg" rounded="2xl">
                <h3 className="text-lg font-bold text-text-primary dark:text-gray-200 mb-4">
                  Recomendaciones
                </h3>
                <p className="text-text-secondary dark:text-gray-400 leading-relaxed">
                  {analysis.recommendations}
                </p>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Card
                  variant="glass"
                  padding="none"
                  rounded="xl"
                  onClick={handleAnalyze}
                  className="flex-1 px-6 py-3 font-semibold transition-transform active:scale-95 text-text-primary dark:text-gray-200 cursor-pointer flex items-center justify-center"
                >
                  Analizar de Nuevo
                </Card>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold transition-transform active:scale-95"
                >
                  Cerrar
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ColorPaletteView;
