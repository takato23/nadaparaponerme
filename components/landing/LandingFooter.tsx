import React from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';

export default function LandingFooter() {
    const { theme } = useThemeContext();
    const isDark = theme === 'dark';

    return (
        <footer className={`py-12 px-4 transition-colors duration-500 ${
            isDark ? 'bg-[#05060a] border-t border-white/5' : 'bg-slate-50 border-t border-slate-200'
        }`}>
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">👗</span>
                        <span className={`font-serif font-bold text-xl tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            Ojo de Loca
                        </span>
                    </div>
                    <p className={`text-sm max-w-xs text-center md:text-left ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                        Tu asistente personal de moda impulsado por inteligencia artificial. Hecho para las que nunca tienen qué ponerse.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-8">
                    <div className="flex flex-col gap-3 items-center md:items-start text-sm">
                        <h4 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Producto</h4>
                        <a href="#" className={`hover:text-primary transition-colors ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Características</a>
                        <a href="#" className={`hover:text-primary transition-colors ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Precio</a>
                        <a href="#" className={`hover:text-primary transition-colors ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>IA Stylist</a>
                    </div>
                    <div className="flex flex-col gap-3 items-center md:items-start text-sm">
                        <h4 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Compañía</h4>
                        <a href="#" className={`hover:text-primary transition-colors ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Sobre nosotros</a>
                        <a href="#" className={`hover:text-primary transition-colors ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Contacto</a>
                        <a href="#" className={`hover:text-primary transition-colors ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Blog</a>
                    </div>
                    <div className="flex flex-col gap-3 items-center md:items-start text-sm">
                        <h4 className={`font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>Legal</h4>
                        <a href="#" className={`hover:text-primary transition-colors ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Privacidad</a>
                        <a href="#" className={`hover:text-primary transition-colors ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>Términos</a>
                    </div>
                </div>
            </div>

            <div className={`max-w-6xl mx-auto mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs ${
                isDark ? 'border-t border-white/5 text-gray-600' : 'border-t border-slate-200 text-slate-500'
            }`}>
                <p>© 2025 Ojo de Loca. Todos los derechos reservados.</p>
                <div className="flex gap-6">
                    <a href="#" className={`transition-colors underline underline-offset-4 ${isDark ? 'hover:text-white' : 'hover:text-slate-800'}`}>Instagram</a>
                    <a href="#" className={`transition-colors underline underline-offset-4 ${isDark ? 'hover:text-white' : 'hover:text-slate-800'}`}>TikTok</a>
                    <a href="#" className={`transition-colors underline underline-offset-4 ${isDark ? 'hover:text-white' : 'hover:text-slate-800'}`}>Twitter</a>
                </div>
            </div>
        </footer>
    );
}
