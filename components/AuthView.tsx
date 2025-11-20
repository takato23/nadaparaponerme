import React, { useState, useEffect } from 'react';
import OjoDeLocaLogo from './OjoDeLocaLogo';
import { signIn, signUp } from '../src/services/authService';
import { motion, useMotionValue, useSpring, animate } from 'framer-motion';

interface AuthViewProps {
    onLogin: () => void;
}

// Blob paths (normalized roughly to 100x100 viewbox centered)
const blobPaths = [
    "M45.7,-75.3C58.9,-69.3,69.1,-58.1,76.3,-45.1C83.5,-32.1,87.7,-17.3,86.3,-2.9C84.9,11.5,77.9,25.5,69.2,38.3C60.5,51.1,50.1,62.7,37.7,69.8C25.3,76.9,10.9,79.5,-2.9,77.8C-16.7,76.1,-29.9,70.1,-41.6,62.3C-53.3,54.5,-63.5,44.9,-70.5,33.4C-77.5,21.9,-81.3,8.5,-79.8,-4.1C-78.3,-16.7,-71.5,-28.5,-62.5,-38.7C-53.5,-48.9,-42.3,-57.5,-30.3,-64.7C-18.3,-71.9,-5.5,-77.7,4.9,-75.3L45.7,-75.3Z",
    "M42.9,-72.6C55.3,-66.3,65.2,-55.1,72.2,-42.2C79.2,-29.3,83.3,-14.7,81.8,-0.9C80.3,12.9,73.2,25.9,64.8,37.9C56.4,49.9,46.7,60.9,35.1,67.5C23.5,74.1,10,76.3,-3.1,74.5C-16.2,72.7,-28.9,66.9,-40.2,59.2C-51.5,51.5,-61.4,41.9,-68.1,30.5C-74.8,19.1,-78.3,5.9,-76.8,-6.6C-75.3,-19.1,-68.8,-30.9,-59.9,-40.8C-51,-50.7,-39.7,-58.7,-28.1,-65.5C-16.5,-72.3,-4.6,-77.9,5.2,-75.3L42.9,-72.6Z",
    "M39.6,-69.5C51.1,-63.2,60.5,-52.4,67.3,-40.1C74.1,-27.8,78.3,-14,76.9,-0.8C75.5,12.4,68.5,25,60.5,36.4C52.5,47.8,43.5,58,32.6,64.3C21.7,70.6,8.9,73,-3.6,71.3C-16.1,69.6,-29.6,63.8,-40.6,56.2C-51.6,48.6,-60.1,39.2,-66.4,28.2C-72.7,17.2,-76.8,4.6,-75.3,-7.3C-73.8,-19.2,-66.7,-30.4,-57.9,-39.8C-49.1,-49.2,-38.6,-56.8,-27.6,-63.3C-16.6,-69.8,-5.1,-75.2,4.5,-72.8L39.6,-69.5Z"
];

const AuthView = ({ onLogin }: AuthViewProps) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');

    // Mouse interaction
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth spring animation for the blob position
    const springConfig = { damping: 25, stiffness: 150 };
    const blobX = useSpring(mouseX, springConfig);
    const blobY = useSpring(mouseY, springConfig);

    // Blob morphing state
    const [blobIndex, setBlobIndex] = useState(0);

    // Portal Scale (starts at 0, expands to 1, then expands to 20 on login)
    const portalScale = useMotionValue(0);

    useEffect(() => {
        // Entrance animation
        animate(portalScale, 1, { duration: 1.5, ease: "easeOut" });

        // Continuous morphing
        const interval = setInterval(() => {
            setBlobIndex((prev) => (prev + 1) % blobPaths.length);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY, currentTarget } = e;
        const { width, height } = currentTarget.getBoundingClientRect();
        const centerX = width / 2;
        const centerY = height / 2;

        // Calculate offset from center, normalized
        const offsetX = (clientX - centerX) / 10; // Divide to limit movement range
        const offsetY = (clientY - centerY) / 10;

        mouseX.set(offsetX);
        mouseY.set(offsetY);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        try {
            setLoading(true);

            if (isLoginView) {
                await signIn(email, password);
                // Success Animation: Expand the portal massively
                await animate(portalScale, 30, { duration: 1.5, ease: "easeInOut" });

                // Short delay
                await new Promise(resolve => setTimeout(resolve, 300));

                onLogin();
            } else {
                const fallbackName = name || username || email.split('@')[0];
                await signUp(email, password, fallbackName, username || undefined);
                setSuccessMessage('Revisa tu email para confirmar tu cuenta.');
                setLoading(false);
            }
        } catch (err) {
            console.error('Authentication error:', err);
            const message = err instanceof Error ? err.message : 'Error al autenticarse. Intentá nuevamente.';
            setError(message);
            setLoading(false);
        }
    };

    return (
        <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Fluid Portal Mask Container */}
            <div
                className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                style={{
                    mask: 'url(#fluid-portal-mask)',
                    WebkitMask: 'url(#fluid-portal-mask)',
                    maskMode: 'alpha',
                    WebkitMaskMode: 'alpha',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                    maskSize: '100% 100%',
                    WebkitMaskSize: '100% 100%',
                }}
            >
                {/* The Overlay - Light/Frosted Glass */}
                <div className="w-full h-full bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl"></div>
            </div>

            {/* SVG Definition for the Mask */}
            <svg width="0" height="0" className="absolute">
                <defs>
                    <mask id="fluid-portal-mask" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox">
                        <rect x="0" y="0" width="1" height="1" fill="white" />
                        <motion.g
                            style={{ x: blobX, y: blobY, scale: portalScale }}
                            transformOrigin="center"
                        >
                            {/* The Blob Hole - Black makes it transparent in the mask */}
                            <motion.path
                                d={blobPaths[blobIndex]}
                                fill="black"
                                animate={{ d: blobPaths[blobIndex] }}
                                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                                transform="translate(0.5, 0.5) scale(0.002)" // Scale down to fit 0-1 coordinate space
                            />
                        </motion.g>
                    </mask>
                </defs>
            </svg>

            {/* Decorative Liquid Ring (Visual only, sits on top) */}
            <motion.svg
                className="absolute z-30 pointer-events-none overflow-visible"
                viewBox="0 0 100 100"
                style={{
                    width: '100%',
                    height: '100%',
                    x: blobX,
                    y: blobY,
                    scale: portalScale
                }}
            >
                <motion.path
                    d={blobPaths[blobIndex]}
                    fill="none"
                    stroke="url(#liquid-gradient)"
                    strokeWidth="0.5"
                    filter="url(#glow)"
                    animate={{ d: blobPaths[blobIndex] }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                    transform="translate(50, 50) scale(0.2)" // Adjust scale to match the hole visual size
                />
                <defs>
                    <linearGradient id="liquid-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF9A9E" />
                        <stop offset="50%" stopColor="#FECFEF" />
                        <stop offset="100%" stopColor="#A0A0A0" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
            </motion.svg>

            {/* Login Form Container - Centered */}
            <div className="relative z-40 w-full max-w-md p-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/50 p-8 text-center"
                >
                    <div className="flex flex-col items-center mb-8">
                        <OjoDeLocaLogo className="w-16 h-16 text-black mb-4" />
                        <h1 className="text-3xl font-bold text-gray-900">
                            {isLoginView ? 'Bienvenido' : 'Crear Cuenta'}
                        </h1>
                        <p className="text-gray-500 mt-2">Tu laboratorio de estilo te espera.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-4">
                        {!isLoginView && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Nombre completo"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-4 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black/10 focus:border-black focus:outline-none transition-all"
                                />
                                <input
                                    type="text"
                                    placeholder="Usuario (opcional)"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full p-4 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black/10 focus:border-black focus:outline-none transition-all"
                                />
                            </>
                        )}
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-4 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black/10 focus:border-black focus:outline-none transition-all"
                        />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full p-4 bg-gray-50 text-gray-900 placeholder-gray-400 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-black/10 focus:border-black focus:outline-none transition-all"
                        />

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-red-600 text-sm text-center">{error}</p>
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <p className="text-emerald-600 text-sm text-center">{successMessage}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white font-bold py-4 px-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-4"
                        >
                            {loading ? 'Procesando...' : (isLoginView ? 'Entrar' : 'Unirse')}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => {
                                setIsLoginView(!isLoginView);
                                setError(null);
                                setSuccessMessage(null);
                            }}
                            className="text-sm text-gray-500 hover:text-black transition-colors"
                        >
                            {isLoginView ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AuthView;
