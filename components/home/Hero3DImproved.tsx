import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface Hero3DProps {
  displayName: string;
  avatarUrl?: string;
  closetLength: number;
  totalOutfits: number;
  daysActive: number;
}

/**
 * Hero3D Mejorado
 * - Soporte táctil para dispositivos móviles
 * - Rendimiento optimizado con throttling
 * - Accesibilidad mejorada
 * - Versión simplificada para móvil (respeta prefers-reduced-motion)
 */
export function Hero3DImproved({
  displayName,
  avatarUrl,
  closetLength,
  totalOutfits,
  daysActive
}: Hero3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detectar móvil y preferencias de movimiento reducido
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    const checkMotion = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    };

    checkMobile();
    checkMotion();

    window.addEventListener('resize', checkMobile);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', checkMotion);

    return () => {
      window.removeEventListener('resize', checkMobile);
      motionQuery.removeEventListener('change', checkMotion);
    };
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Springs más suaves para mejor rendimiento
  const mouseX = useSpring(x, { stiffness: 100, damping: 20, mass: 0.5 });
  const mouseY = useSpring(y, { stiffness: 100, damping: 20, mass: 0.5 });

  // Rotación más sutil en móvil
  const maxRotation = isMobile ? 8 : 15;
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [`${maxRotation}deg`, `-${maxRotation}deg`]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [`-${maxRotation}deg`, `${maxRotation}deg`]);

  // Throttle para mejor rendimiento
  const lastUpdate = useRef(0);
  const throttleMs = 16; // ~60fps

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const now = Date.now();
    if (now - lastUpdate.current < throttleMs) return;
    lastUpdate.current = now;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const xPct = (clientX - rect.left) / rect.width - 0.5;
    const yPct = (clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  }, [x, y]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMove(e.clientX, e.clientY);
  }, [handleMove]);

  // Soporte táctil
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  }, [handleMove]);

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  // Stats con mejor formato
  const stats = [
    { icon: 'checkroom', value: closetLength, label: 'prendas', color: 'from-emerald-400 to-teal-500' },
    { icon: 'auto_awesome', value: totalOutfits, label: 'outfits', color: 'from-violet-400 to-purple-500' },
    { icon: 'local_fire_department', value: daysActive, label: 'días', color: 'from-orange-400 to-red-500' },
  ];

  // Versión sin animación 3D para accesibilidad
  if (prefersReducedMotion) {
    return (
      <div
        className="relative w-full max-w-3xl mx-auto rounded-2xl md:rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 shadow-2xl overflow-hidden"
        role="banner"
        aria-label={`Panel de bienvenida para ${displayName}`}
      >
        <div className="p-6 md:p-8 flex flex-col items-center text-center">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-secondary p-1 mb-4 md:mb-6 shadow-lg">
            <img
              src={avatarUrl || "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800"}
              alt={`Avatar de ${displayName}`}
              className="w-full h-full rounded-full object-cover border-2 border-white"
            />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
            Hola, {displayName}
          </h2>
          <p className="text-gray-400 text-base md:text-lg mb-6">
            ¿Qué nos ponemos hoy?
          </p>
          <div className="flex flex-wrap gap-3 justify-center" role="list" aria-label="Estadísticas del usuario">
            {stats.map(stat => (
              <div
                key={stat.icon}
                className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-bold flex items-center gap-2"
                role="listitem"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden="true">{stat.icon}</span>
                <span>{stat.value} {stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className="relative w-full max-w-3xl mx-auto aspect-auto min-h-[380px] md:min-h-0 md:aspect-[16/9] rounded-2xl md:rounded-[2.5rem] bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-sm border border-white/10 shadow-2xl cursor-pointer group overflow-hidden"
      role="banner"
      aria-label={`Panel de bienvenida interactivo para ${displayName}. Mueve el cursor o desliza para ver el efecto 3D.`}
      tabIndex={0}
    >
      {/* Background con gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-50" />

      {/* Inner frame con profundidad */}
      <motion.div
        style={{ transform: "translateZ(20px)" }}
        className="absolute inset-3 md:inset-4 rounded-xl md:rounded-[2rem] border border-white/5 overflow-hidden pointer-events-none"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-30" />
      </motion.div>

      {/* Content Layer */}
      <motion.div
        style={{ transform: "translateZ(50px)" }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 md:p-8"
      >
        {/* Avatar con anillo gradiente */}
        <motion.div
          className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary to-secondary p-0.5 md:p-1 mb-3 md:mb-6 shadow-glow-accent shrink-0"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <img
            src={avatarUrl || "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800"}
            alt={`Avatar de ${displayName}`}
            className="w-full h-full rounded-full object-cover border-2 border-white"
          />
        </motion.div>

        {/* Saludo */}
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2 tracking-tight">
          Hola, {displayName}
        </h2>
        <p className="text-gray-400 text-sm md:text-lg mb-4 md:mb-6">
          ¿Qué nos ponemos hoy?
        </p>

        {/* Stats con gradientes individuales */}
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center" role="list" aria-label="Tus estadísticas">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.icon}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.2 }}
              className="relative px-3 md:px-4 py-1.5 md:py-2 rounded-xl overflow-hidden"
              role="listitem"
            >
              {/* Gradiente de fondo */}
              <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-20`} />
              <div className="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10" />

              <div className="relative z-10 flex items-center gap-1.5 md:gap-2 text-white">
                <span className="material-symbols-outlined text-base md:text-lg" aria-hidden="true">
                  {stat.icon}
                </span>
                <span className="text-xs md:text-sm font-bold">
                  {stat.value}
                </span>
                <span className="text-xs md:text-sm opacity-70 hidden sm:inline">
                  {stat.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Elementos flotantes con profundidad - más sutiles */}
      <motion.div
        style={{ transform: "translateZ(80px)" }}
        className="absolute top-6 md:top-10 right-6 md:right-8 w-8 md:w-12 h-8 md:h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 blur-xl opacity-30"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        style={{ transform: "translateZ(60px)" }}
        className="absolute bottom-6 md:bottom-10 left-6 md:left-8 w-10 md:w-16 h-10 md:h-16 rounded-full bg-gradient-to-br from-primary to-secondary blur-2xl opacity-25"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.25, 0.35, 0.25],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Reflejo de vidrio en hover */}
      <motion.div
        style={{ transform: "translateZ(1px)" }}
        className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
      />

      {/* Indicador táctil para móvil */}
      {isMobile && (
        <motion.div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/40 text-xs flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <span className="material-symbols-outlined text-sm">swipe</span>
          <span>Desliza para efecto 3D</span>
        </motion.div>
      )}
    </motion.div>
  );
}
