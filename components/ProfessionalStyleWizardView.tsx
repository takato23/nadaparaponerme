/**
 * Professional Style Wizard
 *
 * Wizard de onboarding para capturar perfil profesional de estilismo:
 * - Morfología corporal
 * - Colorimetría personal
 * - Preferencias (loves/hates)
 */

import React, { useState } from 'react';
import type {
  ProfessionalProfile,
  BodyShape,
  ColorSeason,
  ContrastLevel,
  FitPreferences
} from '../types';

interface ProfessionalStyleWizardViewProps {
  onComplete: (profile: ProfessionalProfile) => void;
  onClose: () => void;
  existingProfile?: ProfessionalProfile;
}

const ProfessionalStyleWizardView: React.FC<ProfessionalStyleWizardViewProps> = ({
  onComplete,
  onClose,
  existingProfile
}) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Estados del wizard
  const [bodyShape, setBodyShape] = useState<BodyShape>(existingProfile?.morphology.body_shape || 'reloj_arena');
  const [fitPreferences, setFitPreferences] = useState<FitPreferences>(existingProfile?.morphology.fit_preferences || {
    tops: 'relaxed',
    bottoms: 'relaxed',
    dresses: 'relaxed'
  });
  const [heightCm, setHeightCm] = useState<number | undefined>(existingProfile?.morphology.height_cm);

  const [colorSeason, setColorSeason] = useState<ColorSeason>(existingProfile?.colorimetry.color_season || 'primavera_clara');
  const [contrastLevel, setContrastLevel] = useState<ContrastLevel>(existingProfile?.colorimetry.contrast_level || 'medio');
  const [undertone, setUndertone] = useState<'cool' | 'warm' | 'neutral' | 'olive'>(existingProfile?.colorimetry.undertone || 'warm');

  const [loves, setLoves] = useState<string[]>(existingProfile?.preferences.loves || []);
  const [hates, setHates] = useState<string[]>(existingProfile?.preferences.hates || []);

  // Opciones de preferencias comunes
  const commonLoves = [
    'cintura marcada', 'negro', 'colores vibrantes', 'estampados',
    'minimalista', 'oversized', 'vintage', 'denim', 'cuero',
    'rayas', 'flores', 'monocromo', 'bohemio', 'elegante'
  ];

  const commonHates = [
    'tiro bajo', 'muy ajustado', 'estampados florales', 'animal print',
    'colores neón', 'muy holgado', 'tacones altos', 'cortes rectos',
    'mangas largas', 'cuellos altos', 'transparencias'
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    const profile: ProfessionalProfile = {
      morphology: {
        body_shape: bodyShape,
        fit_preferences: fitPreferences,
        height_cm: heightCm
      },
      colorimetry: {
        color_season: colorSeason,
        contrast_level: contrastLevel,
        undertone: undertone
      },
      preferences: {
        loves,
        hates
      },
      completed_at: new Date().toISOString(),
      profile_completeness_score: 100
    };

    onComplete(profile);
  };

  const toggleLove = (item: string) => {
    setLoves(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const toggleHate = (item: string) => {
    setHates(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto liquid-glass rounded-3xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Perfil Profesional</h2>
            <p className="text-sm opacity-70 mt-1">
              Paso {step} de {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {/* Step 1: Introducción */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="flex justify-center mb-4"><span className="material-symbols-outlined text-6xl text-purple-400">auto_awesome</span></div>
                <h3 className="text-2xl font-bold mb-3">
                  ¡Mejoremos tus outfits!
                </h3>
                <p className="text-lg opacity-80 mb-6">
                  Con tu perfil profesional, la IA podrá generar outfits que:
                </p>
              </div>

              <div className="grid gap-4">
                <div className="liquid-glass p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-2xl text-purple-400">checkroom</span>
                    <div>
                      <h4 className="font-semibold mb-1">Favorezcan tu cuerpo</h4>
                      <p className="text-sm opacity-70">
                        Balance visual según tu morfología (triángulo, rectángulo, etc.)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="liquid-glass p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-2xl text-pink-400">palette</span>
                    <div>
                      <h4 className="font-semibold mb-1">Resalten tu tono de piel</h4>
                      <p className="text-sm opacity-70">
                        Colores armónicos según tu paleta estacional (primavera, verano, otoño, invierno)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="liquid-glass p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-2xl text-blue-400">psychology</span>
                    <div>
                      <h4 className="font-semibold mb-1">Explicaciones educativas</h4>
                      <p className="text-sm opacity-70">
                        Aprenderás por qué cada outfit te favorece (morfología + colorimetría)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm opacity-60 mt-6 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">timer</span> Toma solo 2-3 minutos completar tu perfil
              </p>
            </div>
          )}

          {/* Step 2: Morfología */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold mb-2">Tu morfología corporal</h3>
                <p className="text-sm opacity-70">
                  Seleccioná el tipo que mejor describe tu silueta. No hay tipos "mejores" o "peores", solo diferentes.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Triángulo */}
                <button
                  onClick={() => setBodyShape('triangulo')}
                  className={`p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${bodyShape === 'triangulo'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 hover:border-white/40'
                    }`}
                >
                  <div className="mb-2"><span className="material-symbols-outlined text-3xl">change_history</span></div>
                  <h4 className="font-semibold mb-1">Triángulo (Pera)</h4>
                  <p className="text-xs opacity-70">Cadera más ancha que hombros</p>
                </button>

                {/* Triángulo Invertido */}
                <button
                  onClick={() => setBodyShape('triangulo_invertido')}
                  className={`p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${bodyShape === 'triangulo_invertido'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 hover:border-white/40'
                    }`}
                >
                  <div className="mb-2 rotate-180 inline-block"><span className="material-symbols-outlined text-3xl">change_history</span></div>
                  <h4 className="font-semibold mb-1">Triángulo Invertido</h4>
                  <p className="text-xs opacity-70">Hombros más anchos que cadera</p>
                </button>

                {/* Rectángulo */}
                <button
                  onClick={() => setBodyShape('rectangulo')}
                  className={`p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${bodyShape === 'rectangulo'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 hover:border-white/40'
                    }`}
                >
                  <div className="mb-2"><span className="material-symbols-outlined text-3xl">crop_portrait</span></div>
                  <h4 className="font-semibold mb-1">Rectángulo</h4>
                  <p className="text-xs opacity-70">Hombros ≈ Cadera, sin cintura definida</p>
                </button>

                {/* Reloj de Arena */}
                <button
                  onClick={() => setBodyShape('reloj_arena')}
                  className={`p-4 rounded-xl border-2 transition-all text-left cursor-pointer ${bodyShape === 'reloj_arena'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 hover:border-white/40'
                    }`}
                >
                  <div className="mb-2"><span className="material-symbols-outlined text-3xl">hourglass_empty</span></div>
                  <h4 className="font-semibold mb-1">Reloj de Arena</h4>
                  <p className="text-xs opacity-70">Hombros ≈ Cadera, cintura marcada</p>
                </button>

                {/* Oval */}
                <button
                  onClick={() => setBodyShape('oval')}
                  className={`p-4 rounded-xl border-2 transition-all text-left md:col-span-2 cursor-pointer ${bodyShape === 'oval'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/20 hover:border-white/40'
                    }`}
                >
                  <div className="mb-2"><span className="material-symbols-outlined text-3xl">circle</span></div>
                  <h4 className="font-semibold mb-1">Oval</h4>
                  <p className="text-xs opacity-70">Sin definición marcada de cintura</p>
                </button>
              </div>

              {/* Fit Preferences */}
              <div className="pt-4 border-t border-white/10">
                <h4 className="font-semibold mb-3">Preferencias de fit</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm opacity-70 mb-1 block">Tops</label>
                    <select
                      value={fitPreferences.tops}
                      onChange={(e) => setFitPreferences({ ...fitPreferences, tops: e.target.value as any })}
                      className="w-full p-2 rounded-lg bg-white/10 border border-white/20"
                    >
                      <option value="fitted">Ajustado</option>
                      <option value="relaxed">Relajado</option>
                      <option value="structured">Estructurado</option>
                      <option value="oversized">Oversized</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm opacity-70 mb-1 block">Bottoms</label>
                    <select
                      value={fitPreferences.bottoms}
                      onChange={(e) => setFitPreferences({ ...fitPreferences, bottoms: e.target.value as any })}
                      className="w-full p-2 rounded-lg bg-white/10 border border-white/20"
                    >
                      <option value="fitted">Ajustado</option>
                      <option value="relaxed">Relajado</option>
                      <option value="wide-leg">Pierna ancha</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Colorimetría */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold mb-2">Tu paleta de colores</h3>
                <p className="text-sm opacity-70">
                  Seleccioná la estación que mejor describe los colores que te favorecen.
                </p>
              </div>

              {/* Undertone Test Rápido */}
              <div className="liquid-glass p-4 rounded-xl">
                <h4 className="font-semibold mb-2">Test rápido de undertone</h4>
                <p className="text-xs opacity-70 mb-3">
                  ¿Qué te queda mejor cerca del rostro?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setUndertone('warm')}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${undertone === 'warm'
                        ? 'border-yellow-500 bg-yellow-500/20'
                        : 'border-white/20 hover:border-white/40'
                      }`}
                  >
                    <div className="flex justify-center mb-1"><span className="material-symbols-outlined text-2xl text-yellow-500 mb-1">wb_sunny</span></div>
                    <div className="text-sm font-semibold">Dorado/Cálido</div>
                  </button>
                  <button
                    onClick={() => setUndertone('cool')}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${undertone === 'cool'
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-white/20 hover:border-white/40'
                      }`}
                  >
                    <div className="flex justify-center mb-1"><span className="material-symbols-outlined text-2xl text-blue-500 mb-1">ac_unit</span></div>
                    <div className="text-sm font-semibold">Plateado/Frío</div>
                  </button>
                </div>
              </div>

              {/* Paletas estacionales */}
              <div className="space-y-2">
                <label className="text-sm font-semibold opacity-90">Paleta estacional</label>
                <select
                  value={colorSeason}
                  onChange={(e) => setColorSeason(e.target.value as ColorSeason)}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20"
                >
                  <optgroup label="🌸 Primavera (Cálido)">
                    <option value="primavera_clara">Primavera Clara (Light Spring)</option>
                    <option value="primavera_brillante">Primavera Brillante (Bright Spring)</option>
                    <option value="primavera_calida">Primavera Cálida (Warm Spring)</option>
                  </optgroup>
                  <optgroup label="🌊 Verano (Frío)">
                    <option value="verano_claro">Verano Claro (Light Summer)</option>
                    <option value="verano_suave">Verano Suave (Soft Summer)</option>
                    <option value="verano_frio">Verano Frío (Cool Summer)</option>
                  </optgroup>
                  <optgroup label="🍂 Otoño (Cálido)">
                    <option value="otoño_suave">Otoño Suave (Soft Autumn)</option>
                    <option value="otoño_calido">Otoño Cálido (Warm Autumn)</option>
                    <option value="otoño_profundo">Otoño Profundo (Deep Autumn)</option>
                  </optgroup>
                  <optgroup label="❄️ Invierno (Frío)">
                    <option value="invierno_profundo">Invierno Profundo (Deep Winter)</option>
                    <option value="invierno_frio">Invierno Frío (Cool Winter)</option>
                    <option value="invierno_brillante">Invierno Brillante (Bright Winter)</option>
                  </optgroup>
                </select>
              </div>

              {/* Nivel de contraste */}
              <div className="space-y-2">
                <label className="text-sm font-semibold opacity-90">Nivel de contraste (piel vs pelo)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bajo', 'medio', 'alto'] as ContrastLevel[]).map(level => (
                    <button
                      key={level}
                      onClick={() => setContrastLevel(level)}
                      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${contrastLevel === level
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-white/20 hover:border-white/40'
                        }`}
                    >
                      <div className="text-sm font-semibold capitalize">{level}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Preferencias */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold mb-2">Tus preferencias</h3>
                <p className="text-sm opacity-70">
                  Ayudanos a personalizar tus outfits seleccionando lo que amás y evitás.
                </p>
              </div>

              {/* Loves */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-pink-400">favorite</span>
                  Me encanta
                </h4>
                <div className="flex flex-wrap gap-2">
                  {commonLoves.map(item => (
                    <button
                      key={item}
                      onClick={() => toggleLove(item)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer ${loves.includes(item)
                          ? 'bg-pink-500 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                        }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hates */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-400">block</span>
                  Prefiero evitar
                </h4>
                <div className="flex flex-wrap gap-2">
                  {commonHates.map(item => (
                    <button
                      key={item}
                      onClick={() => toggleHate(item)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all cursor-pointer ${hates.includes(item)
                          ? 'bg-red-500 text-white'
                          : 'bg-white/10 hover:bg-white/20'
                        }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Resumen */}
          {step === 5 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <div className="flex justify-center mb-4"><span className="material-symbols-outlined text-6xl text-pink-400">celebration</span></div>
                <h3 className="text-2xl font-bold mb-2">¡Tu perfil está listo!</h3>
                <p className="text-sm opacity-70">
                  Revisá los datos antes de confirmar
                </p>
              </div>

              <div className="space-y-4">
                <div className="liquid-glass p-4 rounded-xl">
                  <h4 className="font-semibold mb-2">Morfología</h4>
                  <p className="text-sm opacity-80">
                    {bodyShape === 'triangulo' && '🔻 Triángulo (Pera)'}
                    {bodyShape === 'triangulo_invertido' && '🔺 Triángulo Invertido'}
                    {bodyShape === 'rectangulo' && '⬜ Rectángulo'}
                    {bodyShape === 'reloj_arena' && '⏳ Reloj de Arena'}
                    {bodyShape === 'oval' && '⭕ Oval'}
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    Fit preferido: {fitPreferences.tops} (tops), {fitPreferences.bottoms} (bottoms)
                  </p>
                </div>

                <div className="liquid-glass p-4 rounded-xl">
                  <h4 className="font-semibold mb-2">Colorimetría</h4>
                  <p className="text-sm opacity-80 capitalize">
                    {colorSeason.replace('_', ' ')}
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    Undertone: {undertone} | Contraste: {contrastLevel}
                  </p>
                </div>

                {(loves.length > 0 || hates.length > 0) && (
                  <div className="liquid-glass p-4 rounded-xl">
                    <h4 className="font-semibold mb-2">Preferencias</h4>
                    {loves.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs opacity-60 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm text-pink-500">favorite</span> Me encanta:</p>
                        <p className="text-sm opacity-80">{loves.join(', ')}</p>
                      </div>
                    )}
                    {hates.length > 0 && (
                      <div>
                        <p className="text-xs opacity-60 mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm text-red-500">block</span> Evito:</p>
                        <p className="text-sm opacity-80">{hates.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-semibold"
            >
              Volver
            </button>
          )}

          {step < totalSteps && (
            <button
              onClick={handleNext}
              className="flex-1 p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg transition-all font-semibold"
            >
              Siguiente
            </button>
          )}

          {step === totalSteps && (
            <button
              onClick={handleComplete}
              className="flex-1 p-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg transition-all font-semibold"
            >
              Guardar Perfil
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalStyleWizardView;
