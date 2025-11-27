import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getShortcutDisplay } from '../../hooks/useKeyboardShortcuts';

interface ShortcutItem {
    keys: string;
    description: string;
    category?: string;
}

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

const SHORTCUTS: ShortcutItem[] = [
    // Navigation
    { keys: '⌘K', description: 'Abrir búsqueda rápida', category: 'Navegación' },
    { keys: 'Esc', description: 'Cerrar modal / Volver', category: 'Navegación' },
    { keys: '/', description: 'Buscar en la página actual', category: 'Navegación' },

    // Actions
    { keys: '⌘B', description: 'Agregar nueva prenda', category: 'Acciones' },
    { keys: '⌘G', description: 'Generar outfit', category: 'Acciones' },
    { keys: '⌘S', description: 'Guardar cambios', category: 'Acciones' },
    { keys: '⌘Z', description: 'Deshacer última acción', category: 'Acciones' },

    // Quick Access
    { keys: '1', description: 'Ir a Inicio', category: 'Acceso Rápido' },
    { keys: '2', description: 'Ir a Armario', category: 'Acceso Rápido' },
    { keys: '3', description: 'Ir a Comunidad', category: 'Acceso Rápido' },
    { keys: '4', description: 'Ir a Perfil', category: 'Acceso Rápido' },

    // Help
    { keys: '⌘/', description: 'Mostrar atajos de teclado', category: 'Ayuda' },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

    // Group shortcuts by category
    const groupedShortcuts = SHORTCUTS.reduce((acc, shortcut) => {
        const category = shortcut.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(shortcut);
        return acc;
    }, {} as Record<string, ShortcutItem[]>);

    // Replace ⌘ with Ctrl on non-Mac
    const formatKeys = (keys: string) => {
        if (!isMac) {
            return keys
                .replace(/⌘/g, 'Ctrl+')
                .replace(/⌥/g, 'Alt+')
                .replace(/⇧/g, 'Shift+');
        }
        return keys;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="
                            w-full max-w-lg max-h-[80vh] overflow-hidden
                            bg-white dark:bg-gray-900
                            rounded-2xl
                            shadow-2xl
                            border border-gray-200 dark:border-gray-700
                        "
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary">keyboard</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                        Atajos de Teclado
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Navegá más rápido con el teclado
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <span className="material-symbols-outlined text-gray-500">close</span>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-6">
                            {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                                <div key={category}>
                                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                                        {category}
                                    </h3>
                                    <div className="space-y-2">
                                        {shortcuts.map((shortcut, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            >
                                                <span className="text-gray-700 dark:text-gray-300 text-sm">
                                                    {shortcut.description}
                                                </span>
                                                <kbd className="
                                                    px-2 py-1
                                                    bg-gray-100 dark:bg-gray-800
                                                    border border-gray-200 dark:border-gray-700
                                                    rounded-md
                                                    text-xs font-mono
                                                    text-gray-600 dark:text-gray-400
                                                    shadow-sm
                                                ">
                                                    {formatKeys(shortcut.keys)}
                                                </kbd>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Presioná <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Esc</kbd> para cerrar
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default KeyboardShortcutsHelp;
