import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../src/routes';
import type { ClothingItem } from '../../types';

interface StudioHubViewProps {
  closet?: ClothingItem[];
}

const palette = {
  '--studio-night': '#0b0b12',
  '--studio-ink': '#f8f5f0',
  '--studio-ink-muted': 'rgba(248, 245, 240, 0.7)',
  '--studio-cyan': '#3ee7c9',
  '--studio-amber': '#f7c78f',
  '--studio-violet': '#a68bff',
  '--studio-rose': '#ff7dcf'
} as React.CSSProperties;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.12 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

export default function StudioHubView({ closet = [] }: StudioHubViewProps) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const total = closet.length;
    const virtual = closet.filter((item) => item.status === 'virtual' || item.status === 'wishlist').length;
    const owned = closet.filter((item) => !item.status || item.status === 'owned').length;
    return { total, virtual, owned };
  }, [closet]);

  const rooms = [
    {
      id: 'armario',
      kicker: 'Armario digital',
      title: 'Sala Origen',
      description:
        'Digitaliza tu guardarropa y combinalo en tiempo real. Todo lo que ves aca se convierte en look.',
      glow: 'rgba(62, 231, 201, 0.35)',
      portal: 'rgba(62, 231, 201, 0.8)',
      border: 'rgba(62, 231, 201, 0.4)',
      actions: [
        {
          label: 'Entrar al Armario',
          helper: 'Organiza, clasifica y combina',
          icon: 'checkroom',
          onClick: () => navigate(ROUTES.CLOSET)
        },
        {
          label: 'Subir prendas en lote',
          helper: 'Carga rapida con IA',
          icon: 'cloud_upload',
          onClick: () => navigate(ROUTES.BULK_UPLOAD)
        }
      ],
      stats: [
        { label: 'Prendas', value: stats.total },
        { label: 'Propias', value: stats.owned },
        { label: 'Virtuales', value: stats.virtual }
      ]
    },
    {
      id: 'probador',
      kicker: 'Probador IA',
      title: 'Portal Ultra',
      description:
        'Prueba looks sobre tu gemelo digital sin tocar tu cuerpo. La tela cambia, vos no.',
      glow: 'rgba(166, 139, 255, 0.35)',
      portal: 'rgba(255, 125, 207, 0.8)',
      border: 'rgba(166, 139, 255, 0.5)',
      actions: [
        {
          label: 'Espejo Virtual',
          helper: 'Prueba instantanea 1:1',
          icon: 'auto_awesome',
          onClick: () => navigate(ROUTES.STUDIO_MIRROR)
        },
        {
          label: 'Estudio Fotografico',
          helper: 'Sesiones editoriales AI',
          icon: 'photo_camera',
          onClick: () => navigate(ROUTES.STUDIO_PHOTOSHOOT)
        }
      ],
      stats: [
        { label: 'Modo', value: 'Realista' },
        { label: 'FX', value: 'Ultra' },
        { label: 'Control', value: 'Total' }
      ]
    },
    {
      id: 'prestamos',
      kicker: 'Prestamos y tienda',
      title: 'Sala Social',
      description:
        'Proba prendas prestadas y wishlist sin comprar. Movimiento social con cero friccion.',
      glow: 'rgba(247, 199, 143, 0.35)',
      portal: 'rgba(247, 199, 143, 0.85)',
      border: 'rgba(247, 199, 143, 0.5)',
      actions: [
        {
          label: 'Amigos y prestamos',
          helper: 'Armarios compartidos',
          icon: 'diversity_3',
          onClick: () => navigate(ROUTES.COMMUNITY)
        },
        {
          label: 'Tienda y wishlist',
          helper: 'Proba antes de comprar',
          icon: 'shopping_bag',
          onClick: () => navigate(ROUTES.VIRTUAL_SHOPPING)
        }
      ],
      stats: [
        { label: 'Network', value: 'Abierto' },
        { label: 'Wishlist', value: 'Activa' },
        { label: 'Descubrimiento', value: 'En vivo' }
      ]
    }
  ];

  const handleScrollToPortals = () => {
    if (typeof window === 'undefined') return;
    const section = document.getElementById('studio-portals');
    section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen relative overflow-hidden text-white font-display" style={palette}>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(1000px circle at 10% 10%, rgba(62, 231, 201, 0.18), transparent 60%),
            radial-gradient(900px circle at 90% 15%, rgba(166, 139, 255, 0.25), transparent 55%),
            radial-gradient(1200px circle at 50% 90%, rgba(247, 199, 143, 0.2), transparent 60%),
            linear-gradient(180deg, #08080f 0%, #0e1019 45%, #121725 100%)
          `
        }}
      />
      <div className="noise-overlay" />

      <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.12)_0%,_transparent_70%)] blur-2xl animate-float" />
      <div className="absolute -right-16 bottom-12 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.08)_0%,_transparent_70%)] blur-3xl animate-float" />

      <div className="relative z-10">
        <motion.section
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="max-w-6xl mx-auto px-6 pt-16 pb-10"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/15 bg-white/10 backdrop-blur-xl text-xs uppercase tracking-[0.35em] text-white/70">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            Studio Hub
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-6 text-4xl md:text-6xl font-serif font-bold leading-tight text-[color:var(--studio-ink)]"
          >
            Tres universos, un solo espejo.
          </motion.h1>
          <motion.p variants={itemVariants} className="mt-4 max-w-2xl text-base md:text-lg text-[color:var(--studio-ink-muted)]">
            Bienvenida al escenario donde tu armario, tu gemelo digital y tu red social se conectan. Elige un portal, crea un look y movete entre mundos sin perder tu identidad.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleScrollToPortals}
              className="px-6 py-3 rounded-2xl bg-white text-black font-semibold shadow-xl hover:shadow-2xl transition-all"
            >
              Explorar portales
            </button>
            <button
              onClick={() => navigate(ROUTES.CLOSET)}
              className="px-6 py-3 rounded-2xl border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 transition-all"
            >
              Entrar al Armario
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Armario vivo', value: `${stats.total} prendas` },
              { label: 'Virtuales listas', value: `${stats.virtual} looks` },
              { label: 'Edicion premium', value: 'Activa' }
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">{stat.label}</p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--studio-ink)]">{stat.value}</p>
              </div>
            ))}
          </motion.div>
        </motion.section>

        <section id="studio-portals" className="max-w-6xl mx-auto px-6 pb-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-10%' }} variants={containerVariants}>
            <motion.div variants={itemVariants} className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Mapa del studio</p>
                <h2 className="mt-2 text-2xl md:text-3xl font-serif font-semibold text-[color:var(--studio-ink)]">
                  Elegi tu sala, cambia tu realidad.
                </h2>
              </div>
              <div className="hidden md:flex items-center gap-2 text-white/60 text-sm">
                <span className="material-symbols-outlined text-base">timeline</span>
                Ruta inmersiva 01
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <motion.div
                  key={room.id}
                  variants={itemVariants}
                  className="group relative"
                  style={{ perspective: '1200px' }}
                >
                  <div
                    className="absolute inset-0 rounded-[2.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"
                    style={{ background: `radial-gradient(circle at 20% 0%, ${room.glow}, transparent 60%)` }}
                  />
                  <motion.div
                    className="relative rounded-[2.5rem] border bg-white/5 backdrop-blur-2xl p-6 overflow-hidden transform-gpu"
                    style={{ borderColor: room.border, transformStyle: 'preserve-3d' }}
                    whileHover={{ y: -6, rotateX: 3, rotateY: -3 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="absolute -top-10 -right-6 h-32 w-32 rounded-full opacity-70 blur-2xl" style={{ background: room.glow }} />
                    <div className="absolute right-6 top-6 h-24 w-24 rounded-full border border-white/15 bg-white/5 backdrop-blur-xl">
                      <div
                        className="absolute inset-3 rounded-full border border-white/25"
                        style={{ boxShadow: `0 0 30px ${room.portal}` }}
                      />
                      <div
                        className="absolute inset-6 rounded-full"
                        style={{ background: `radial-gradient(circle, ${room.portal} 0%, transparent 70%)` }}
                      />
                    </div>

                    <div className="relative">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">{room.kicker}</p>
                      <h3 className="mt-2 text-2xl font-serif font-semibold text-[color:var(--studio-ink)]">
                        {room.title}
                      </h3>
                      <p className="mt-3 text-sm text-white/70 leading-relaxed">{room.description}</p>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {room.stats.map((stat) => (
                        <div key={stat.label} className="rounded-2xl bg-black/30 border border-white/10 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{stat.label}</p>
                          <p className="mt-1 text-sm font-semibold text-white">{stat.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 space-y-3">
                      {room.actions.map((action) => (
                        <button
                          key={action.label}
                          onClick={action.onClick}
                          className="w-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left hover:bg-white/15 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-lg">{action.icon}</span>
                            <div>
                              <p className="text-sm font-semibold text-[color:var(--studio-ink)]">{action.label}</p>
                              <p className="text-xs text-white/60">{action.helper}</p>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-sm text-white/50">arrow_forward_ios</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl p-8 flex flex-col lg:flex-row gap-8 items-center">
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Modo presentacion</p>
              <h3 className="mt-2 text-2xl md:text-3xl font-serif font-semibold text-[color:var(--studio-ink)]">
                Presenta el recorrido completo en minutos.
              </h3>
              <p className="mt-3 text-sm text-white/70">
                Empeza en el Armario, salta al Probador IA y termina en la Sala Social. Tres escenas, un solo relato.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(ROUTES.CLOSET)}
                className="px-5 py-3 rounded-2xl bg-white text-black font-semibold shadow-xl hover:shadow-2xl transition-all"
              >
                Iniciar recorrido
              </button>
              <button
                onClick={() => navigate(ROUTES.STUDIO_MIRROR)}
                className="px-5 py-3 rounded-2xl border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 transition-all"
              >
                Ir directo al espejo
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
