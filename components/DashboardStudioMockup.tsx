import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../src/routes';

export default function DashboardStudioMockup() {
    const navigate = useNavigate();

    const actions = [
        { title: 'Armario', desc: 'Prendas y looks guardados', icon: 'checkroom', onClick: () => navigate(ROUTES.CLOSET) },
        { title: 'Chat', desc: 'Asesoramiento IA 24/7', icon: 'forum', onClick: () => navigate(ROUTES.HOME) },
        { title: 'Tus Looks', desc: 'Ver lo que armamos', icon: 'photo_library', onClick: () => navigate(ROUTES.SAVED) },
        { title: 'Virtual Shop', desc: 'Inspiración y compras', icon: 'storefront', onClick: () => navigate(ROUTES.VIRTUAL_SHOPPING) },
    ];

    return (
        <div className="min-h-dvh bg-[#0d0d0d] text-white flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-[#ff4500] selection:text-white">
            {/* LEFT SIDE: MASSIVE TYPOGRAPHY (STUDIO) */}
            <div
                className="relative flex-1 p-6 sm:p-12 lg:p-20 flex flex-col justify-between group cursor-pointer overflow-hidden border-b lg:border-b-0 lg:border-r border-white/10 transition-colors hover:bg-white/5"
                onClick={() => navigate(ROUTES.STUDIO)}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-[#ff4500]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <header className="relative z-10 flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50 mb-2">Ojo de Loca</p>
                        <p className="text-sm text-white/70 max-w-xs leading-relaxed">
                            Generador IA de alta costura. Creá, mezclá y descubrí tu estilo sin límites.
                        </p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(ROUTES.HOME); }}
                        className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-black"
                    >
                        Volver
                    </button>
                </header>

                <div className="relative z-10 mt-20 lg:mt-0 flex-1 flex flex-col justify-end">
                    <h1 className="text-[15vw] lg:text-[18vw] font-black leading-[0.75] tracking-tighter text-white">
                        STU<br />DIO<span className="text-[#ff4500]">.</span>
                    </h1>
                    <div className="mt-8 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                        <span className="h-px w-12 bg-[#ff4500]"></span>
                        <span className="text-xs uppercase tracking-widest font-bold text-[#ff4500]">Entrar ahora</span>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: UTILITY TENSION */}
            <div className="w-full lg:w-[400px] xl:w-[480px] flex flex-col bg-[#050505]">
                <div className="p-6 sm:p-8 lg:p-12 flex-1 flex flex-col justify-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-10">Herramientas</p>

                    <div className="flex flex-col gap-6">
                        {actions.map((action, i) => (
                            <button
                                key={i}
                                onClick={action.onClick}
                                className="group flex items-start gap-5 text-left transition-transform hover:translate-x-2"
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/10 rounded-sm bg-white/5 text-white/70 group-hover:bg-[#ff4500] group-hover:text-white group-hover:border-[#ff4500] transition-colors">
                                    <span className="material-symbols-rounded text-xl">{action.icon}</span>
                                </div>
                                <div className="flex flex-col py-1">
                                    <span className="text-xl font-bold tracking-tight text-white/90 group-hover:text-white">{action.title}</span>
                                    <span className="text-sm text-white/40 mt-1">{action.desc}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* BOTTOM RIGHT: ACCENT OR STATS */}
                <div className="p-6 sm:p-8 lg:p-12 border-t border-white/10 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">Plan</p>
                        <p className="text-sm font-bold text-white">PRO TIER</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">Prendas</p>
                        <p className="text-sm font-bold text-white">124 items</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
