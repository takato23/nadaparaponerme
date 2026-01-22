import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    ArrowRight,
    Check,
    Star,
    User,
    Palette,
    Shirt,
    Target,
    Heart,
    Briefcase,
    PartyPopper,
    Fingerprint,
} from 'lucide-react';
import { triggerHaptic, hapticSuccess, hapticCommitment, hapticTap } from '../services/hapticService';
import { getCurrentSubscription, getSubscriptionPlan, upgradeSubscription } from '../services/paymentService';
import { PAYMENTS_ENABLED, V1_SAFE_MODE } from '../config/runtime';
import { useAuth } from '../hooks/useAuth';
import { ROUTES } from '../routes';

// Types
type OnboardingStep = 'welcome' | 'body_shape' | 'color_season' | 'style_goals' | 'commitment' | 'analyzing' | 'paywall';

const BODY_SHAPES = [
    { id: 'hourglass', label: 'Reloj de Arena', image: '/images/onboarding/hourglass.png' },
    { id: 'triangle', label: 'Triángulo', image: '/images/onboarding/triangle.png' },
    { id: 'inverted_triangle', label: 'Triángulo Invertido', image: '/images/onboarding/inverted_triangle.png' },
    { id: 'rectangle', label: 'Rectángulo', image: '/images/onboarding/rectangle.png' },
    { id: 'oval', label: 'Oval', image: '/images/onboarding/oval.png' }
];

const SEASONS = [
    { id: 'spring', label: 'Primavera', colors: ['#ff9a9e', '#fad0c4', '#a18cd1'] },
    { id: 'summer', label: 'Verano', colors: ['#a1c4fd', '#c2e9fb', '#fbc2eb'] },
    { id: 'autumn', label: 'Otoño', colors: ['#d4fc79', '#96e6a1', '#84fab0'] },
    { id: 'winter', label: 'Invierno', colors: ['#000000', '#434343', '#00416A'] },
];

const STYLE_GOALS = [
    { id: 'confidence', label: 'Sentirme más segura', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { id: 'professional', label: 'Verme más profesional', icon: Briefcase, color: 'from-blue-500 to-indigo-500' },
    { id: 'trendy', label: 'Estar a la moda', icon: Star, color: 'from-purple-500 to-pink-500' },
    { id: 'express', label: 'Expresar mi personalidad', icon: PartyPopper, color: 'from-orange-500 to-yellow-500' },
    { id: 'optimize', label: 'Optimizar mi armario', icon: Target, color: 'from-green-500 to-teal-500' },
];

export const OnboardingStylistFlow = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const isAuthenticated = !!user;
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [formData, setFormData] = useState({
        bodyShape: '',
        colorSeason: '',
        goals: [] as string[]
    });
    const [progress, setProgress] = useState(0);
    const [commitmentActive, setCommitmentActive] = useState(false);
    const [ripples, setRipples] = useState<number[]>([]);
    const [isUpgrading, setIsUpgrading] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const proPlan = getSubscriptionPlan('pro');
    const proPriceArs = proPlan?.price_monthly_ars ?? 0;
    const formattedProPrice = proPriceArs === 0 ? 'Gratis' : `$${proPriceArs.toLocaleString('es-AR')}`;
    const paymentsDisabled = V1_SAFE_MODE && !PAYMENTS_ENABLED;

    // Fake "Analyzing" Logic - Progress increment
    useEffect(() => {
        if (step !== 'analyzing') return;

        // Reset progress when entering analyzing step
        setProgress(0);

        const interval = setInterval(() => {
            setProgress(prev => {
                const next = prev + 2;
                if (next >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return next;
            });
        }, 60);

        return () => clearInterval(interval);
    }, [step]);

    // Separate effect to handle transition to paywall when progress completes
    useEffect(() => {
        if (step === 'analyzing' && progress >= 100) {
            // Small delay to show 100% briefly
            const timeout = setTimeout(() => {
                hapticSuccess();
                setStep('paywall');
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [step, progress]);

    const handleNext = () => {
        hapticTap();
        setStep((current) => {
            if (current === 'welcome') return 'body_shape';
            if (current === 'body_shape') return 'color_season';
            if (current === 'color_season') return 'style_goals';
            if (current === 'style_goals') return 'commitment';
            if (current === 'commitment') return 'analyzing';
            return current;
        });
    };

    const updateForm = (key: string, value: unknown) => {
        hapticTap();
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const toggleGoal = (goalId: string) => {
        hapticTap();
        setFormData(prev => ({
            ...prev,
            goals: prev.goals.includes(goalId)
                ? prev.goals.filter(g => g !== goalId)
                : [...prev.goals, goalId]
        }));
    };

    // Commitment ritual handler
    const handleCommitmentPress = useCallback(() => {
        if (commitmentActive) return;

        setCommitmentActive(true);
        hapticCommitment();

        // Create ripple effect
        const newRipple = Date.now();
        setRipples(prev => [...prev, newRipple]);

        // Clean up ripple after animation
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r !== newRipple));
        }, 1000);

        // Transition after commitment animation
        setTimeout(() => {
            triggerHaptic('success');
            handleNext();
        }, 800);
    }, [commitmentActive]);

    const handleUpgrade = async () => {
        if (isUpgrading) return;

        if (loading) return;
        if (!isAuthenticated) {
            setActionError(null);
            setActionMessage(null);
            navigate('/?auth=login');
            return;
        }

        if (paymentsDisabled) {
            setActionMessage(null);
            setActionError('Pagos desactivados durante la V1 (beta). Próximamente vas a poder hacer upgrade.');
            return;
        }

        try {
            setIsUpgrading(true);
            setActionError(null);
            setActionMessage(null);
            await upgradeSubscription('pro');
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Error al procesar el pago.');
            setActionMessage(null);
            setIsUpgrading(false);
        }
    };

    const handleContinueFree = () => {
        setActionError(null);
        setActionMessage(null);
        if (isAuthenticated) {
            navigate(ROUTES.HOME);
            return;
        }
        navigate('/?auth=signup');
    };

    const handleLogin = () => {
        setActionError(null);
        setActionMessage(null);
        navigate('/?auth=login');
    };

    const handleRestorePurchases = async () => {
        if (isRestoring) return;

        try {
            setIsRestoring(true);
            setActionError(null);
            setActionMessage(null);

            const subscription = await getCurrentSubscription();
            if (!subscription) {
                setActionError('Necesitás iniciar sesión para restaurar compras.');
                return;
            }

            if (subscription.tier === 'free') {
                setActionError('No encontramos compras activas. Si ya pagaste, intentá de nuevo en unos minutos.');
                return;
            }

            setActionMessage(`Plan ${subscription.tier.toUpperCase()} restaurado.`);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'No pudimos restaurar las compras.');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-neutral-900 text-white flex flex-col items-center justify-center overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]" />
            </div>

            {/* Progress indicator */}
            <div className="absolute top-6 left-0 right-0 px-6">
                <div className="max-w-md mx-auto">
                    <div className="flex gap-1">
                        {['welcome', 'body_shape', 'color_season', 'style_goals', 'commitment'].map((s, i) => {
                            const stepOrder = ['welcome', 'body_shape', 'color_season', 'style_goals', 'commitment'];
                            const currentIndex = stepOrder.indexOf(step);
                            const isActive = i <= currentIndex && step !== 'analyzing' && step !== 'paywall';
                            return (
                                <div
                                    key={s}
                                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${isActive ? 'bg-purple-500' : 'bg-white/10'
                                        }`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="w-full max-w-md p-6 relative z-10">
                <AnimatePresence mode="wait">

                    {/* STEP 1: WELCOME */}
                    {step === 'welcome' && (
                        <motion.div
                            key="welcome"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center space-y-8"
                        >
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/20">
                                    <Sparkles className="w-10 h-10 text-white" />
                                </div>
                            </div>

                            <div>
                                <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                    Tu Asesor de Imagen IA
                                </h1>
                                <p className="text-gray-400 text-lg">
                                    Descubre qué ponerte según tu cuerpo, colores y ocasión. Deja de adivinar.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <FeatureRow icon={<User />} text="Morfología personalizada" />
                                <FeatureRow icon={<Palette />} text="Colorimetría Personalizada" />
                                <FeatureRow icon={<Shirt />} text="Outfits Infalibles" />
                            </div>

                            <button
                                onClick={handleNext}
                                className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-2 group"
                            >
                                Crear mi perfil
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 2: BODY SHAPE */}
                    {step === 'body_shape' && (
                        <WizardStep
                            title="¿Cómo describirías tu cuerpo?"
                            subtitle="Esto nos ayuda a equilibrar tus proporciones visualmente."
                            onNext={handleNext}
                            canProceed={!!formData.bodyShape}
                        >
                            <div className="grid grid-cols-2 gap-4">
                                {BODY_SHAPES.map((shape) => {
                                    return (
                                        <button
                                            key={shape.id}
                                            onClick={() => updateForm('bodyShape', shape.id)}
                                            className={`relative overflow-hidden group transition-all duration-300 rounded-2xl border-2 flex flex-col items-center cursor-pointer ${formData.bodyShape === shape.id
                                                ? 'border-purple-500 shadow-xl shadow-purple-500/20 scale-[1.02]'
                                                : 'border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="w-full aspect-[3/4] relative bg-white p-4">
                                                <img
                                                    src={shape.image}
                                                    alt={shape.label}
                                                    className="w-full h-full object-contain mix-blend-multiply opacity-90 group-hover:opacity-100 transition-opacity"
                                                />
                                            </div>
                                            <div className={`w-full p-3 text-center transition-colors ${formData.bodyShape === shape.id
                                                ? 'bg-purple-500/10 text-white font-bold'
                                                : 'text-gray-300'
                                                }`}>
                                                <span className="text-sm">{shape.label}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </WizardStep>
                    )}

                    {/* STEP 3: COLOR SEASON */}
                    {step === 'color_season' && (
                        <WizardStep
                            title="¿Qué colores sientes que te iluminan?"
                            subtitle="Determinaremos tu estación cromática."
                            onNext={handleNext}
                            canProceed={!!formData.colorSeason}
                        >
                            <div className="grid grid-cols-1 gap-4">
                                {SEASONS.map((season) => (
                                    <button
                                        key={season.id}
                                        onClick={() => updateForm('colorSeason', season.id)}
                                        className={`p-4 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${formData.colorSeason === season.id
                                            ? 'border-purple-500 bg-purple-500/10'
                                            : 'border-white/10 hover:border-white/30 bg-white/5'
                                            }`}
                                    >
                                        <span className="font-medium">{season.label}</span>
                                        <div className="flex gap-2">
                                            {season.colors.map(c => (
                                                <div key={c} className="w-6 h-6 rounded-full" style={{ backgroundColor: c }} />
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </WizardStep>
                    )}

                    {/* STEP 4: STYLE GOALS */}
                    {step === 'style_goals' && (
                        <WizardStep
                            title="¿Cuál es tu objetivo principal?"
                            subtitle="Seleccioná los que más resuenen contigo."
                            onNext={handleNext}
                            canProceed={formData.goals.length > 0}
                        >
                            <div className="space-y-3">
                                {STYLE_GOALS.map((goal) => {
                                    const Icon = goal.icon;
                                    const isSelected = formData.goals.includes(goal.id);
                                    return (
                                        <button
                                            key={goal.id}
                                            onClick={() => toggleGoal(goal.id)}
                                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 cursor-pointer ${isSelected
                                                ? 'border-purple-500 bg-purple-500/10'
                                                : 'border-white/10 hover:border-white/30 bg-white/5'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${goal.color} flex items-center justify-center`}>
                                                <Icon className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="font-medium flex-1 text-left">{goal.label}</span>
                                            {isSelected && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center"
                                                >
                                                    <Check className="w-4 h-4 text-white" />
                                                </motion.div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </WizardStep>
                    )}

                    {/* STEP 5: COMMITMENT RITUAL */}
                    {step === 'commitment' && (
                        <motion.div
                            key="commitment"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="text-center py-8"
                        >
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold mb-3">
                                    Tu perfil inicial está listo
                                </h2>
                                <p className="text-gray-400">
                                    Toca el círculo para guardar tu perfil y entrar
                                </p>
                            </div>

                            {/* Commitment Circle */}
                            <div className="relative w-48 h-48 mx-auto mb-8">
                                {/* Ripple effects */}
                                {ripples.map((ripple) => (
                                    <motion.div
                                        key={ripple}
                                        initial={{ scale: 0.8, opacity: 0.8 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        className="absolute inset-0 rounded-full border-2 border-purple-500"
                                    />
                                ))}

                                {/* Pulsing outer ring */}
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        opacity: [0.5, 0.8, 0.5]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30"
                                />

                                {/* Main circle button */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleCommitmentPress}
                                    disabled={commitmentActive}
                                    className={`absolute inset-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex flex-col items-center justify-center shadow-2xl shadow-purple-500/50 transition-all ${commitmentActive ? 'opacity-50' : 'cursor-pointer hover:shadow-purple-500/70'
                                        }`}
                                >
                                    <Fingerprint className="w-12 h-12 text-white mb-2" />
                                    <span className="text-white font-bold text-sm">
                                        {commitmentActive ? 'Guardando...' : 'Toca para continuar'}
                                    </span>
                                </motion.button>
                            </div>

                            <p className="text-sm text-gray-500">
                                Al activar, aceptás que la IA analice tu perfil de estilo
                            </p>
                        </motion.div>
                    )}

                    {/* STEP 6: ANALYZING */}
                    {step === 'analyzing' && (
                        <motion.div
                            key="analyzing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-20"
                        >
                            <div className="relative w-32 h-32 mx-auto mb-8">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle
                                        className="text-gray-700 stroke-current"
                                        strokeWidth="8"
                                        cx="50" cy="50" r="40"
                                        fill="transparent"
                                    />
                                    <circle
                                        className="text-purple-500 progress-ring__circle stroke-current transition-all duration-300"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        cx="50" cy="50" r="40"
                                        fill="transparent"
                                        strokeDasharray={`${progress * 2.51} 251.2`}
                                        transform="rotate(-90 50 50)"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold">{progress}%</span>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Procesando tu perfil...</h2>
                            <p className="text-gray-400 animate-pulse">
                                {progress < 30 ? "Procesando tus respuestas..." :
                                    progress < 60 ? "Armando tu paleta de color..." :
                                        "Preparando recomendaciones iniciales..."}
                            </p>
                        </motion.div>
                    )}

                    {/* STEP 7: PAYWALL */}
                    {step === 'paywall' && (
                        <motion.div
                            key="paywall"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-neutral-800 rounded-3xl p-8 border border-white/10 shadow-2xl"
                        >
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
                                    <Check className="w-4 h-4" />
                                    Perfil guardado
                                </div>
                                <h2 className="text-3xl font-bold mb-2">Tu perfil está listo</h2>
                                <p className="text-gray-400">
                                    Con tu perfil armado, podés seguir gratis o desbloquear el plan Pro cuando quieras.
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-purple-900/50 to-neutral-900 border border-purple-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-purple-500 text-xs font-bold px-3 py-1 rounded-bl-xl text-white">
                                    RECOMENDADO
                                </div>
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Plan Stylist Pro</h3>
                                        <p className="text-purple-200 text-sm">Acceso ilimitado a tu IA personal</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-3xl font-bold text-white">{formattedProPrice}</span>
                                        {proPriceArs > 0 && (
                                            <span className="text-gray-400 text-sm">/mes</span>
                                        )}
                                    </div>
                                </div>
                                <ul className="space-y-3 mb-6">
                                    <CheckItem text="Perfil de cuerpo y color completo" />
                                    <CheckItem text="Outfits Ilimitados Diarios" />
                                    <CheckItem text="Asistente de Compras Inteligente" />
                                </ul>
                                <div className="space-y-3">
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={isUpgrading || isRestoring || loading || paymentsDisabled}
                                        className={`w-full py-3 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/25 ${isUpgrading || isRestoring || loading || paymentsDisabled
                                            ? 'bg-purple-400 cursor-not-allowed opacity-80'
                                            : 'bg-purple-500 hover:bg-purple-600'
                                            }`}
                                    >
                                        {isUpgrading ? 'Procesando...' : 'Desbloquear Mi Plan'}
                                    </button>
                                    <button
                                        onClick={handleContinueFree}
                                        disabled={isUpgrading || isRestoring}
                                        className={`w-full py-3 rounded-xl font-bold transition-all ${isUpgrading || isRestoring
                                            ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                            : 'bg-white text-black hover:bg-gray-100'
                                            }`}
                                    >
                                        Continuar gratis
                                    </button>
                                    {!isAuthenticated && (
                                        <button
                                            onClick={handleLogin}
                                            disabled={isUpgrading || isRestoring}
                                            className={`w-full text-sm transition-colors ${isUpgrading || isRestoring
                                                ? 'text-gray-600 cursor-not-allowed'
                                                : 'text-gray-400 hover:text-white'
                                                }`}
                                        >
                                            Ya tengo cuenta
                                        </button>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleRestorePurchases}
                                disabled={isUpgrading || isRestoring}
                                className={`w-full text-sm transition-colors ${isUpgrading || isRestoring
                                    ? 'text-gray-600 cursor-not-allowed'
                                    : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                {isRestoring ? 'Restaurando...' : 'Restaurar Compras'}
                            </button>

                            {(actionError || actionMessage) && (
                                <p
                                    className={`mt-4 text-xs text-center ${actionError ? 'text-red-400' : 'text-green-400'
                                        }`}
                                >
                                    {actionError || actionMessage}
                                </p>
                            )}
                            {paymentsDisabled && !actionError && (
                                <p className="mt-4 text-xs text-center text-amber-300">
                                    Pagos desactivados por el modo beta.
                                </p>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
};

// Sub-components for cleaner code
const FeatureRow = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
        <div className="text-purple-400">{icon}</div>
        <span className="font-medium">{text}</span>
    </div>
);

interface WizardStepProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    onNext: () => void;
    canProceed: boolean;
}

const WizardStep = ({ title, subtitle, children, onNext, canProceed }: WizardStepProps) => (
    <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
    >
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-gray-400">{subtitle}</p>
        </div>
        <div className="mb-8 max-h-[50vh] overflow-y-auto pr-2">
            {children}
        </div>
        <button
            onClick={onNext}
            disabled={!canProceed}
            className={`w-full py-4 font-bold text-lg rounded-xl transition-all flex items-center justify-center gap-2 ${canProceed
                ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
        >
            Continuar
            <ArrowRight className="w-5 h-5" />
        </button>
    </motion.div>
);

const CheckItem = ({ text }: { text: string }) => (
    <li className="flex items-center gap-3 text-sm text-gray-300">
        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-green-400" />
        </div>
        {text}
    </li>
);
