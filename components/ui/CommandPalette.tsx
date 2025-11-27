import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../src/routes';

interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon: string;
    shortcut?: string;
    action: () => void;
    category: 'navigation' | 'action' | 'feature' | 'settings';
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenCamera?: () => void;
    onOpenAddItem?: () => void;
    onOpenGenerateOutfit?: () => void;
    onOpenShortcutsHelp?: () => void;
}

export function CommandPalette({
    isOpen,
    onClose,
    onOpenCamera,
    onOpenAddItem,
    onOpenGenerateOutfit,
    onOpenShortcutsHelp,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Define all available commands
    const commands: CommandItem[] = useMemo(() => [
        // Navigation
        {
            id: 'nav-home',
            label: 'Ir a Inicio',
            icon: 'home',
            shortcut: '1',
            action: () => { navigate(ROUTES.HOME); onClose(); },
            category: 'navigation',
        },
        {
            id: 'nav-closet',
            label: 'Ir a Armario',
            icon: 'checkroom',
            shortcut: '2',
            action: () => { navigate(ROUTES.CLOSET); onClose(); },
            category: 'navigation',
        },
        {
            id: 'nav-community',
            label: 'Ir a Comunidad',
            icon: 'group',
            shortcut: '3',
            action: () => { navigate(ROUTES.COMMUNITY); onClose(); },
            category: 'navigation',
        },
        {
            id: 'nav-profile',
            label: 'Ir a Perfil',
            icon: 'person',
            shortcut: '4',
            action: () => { navigate(ROUTES.PROFILE); onClose(); },
            category: 'navigation',
        },

        // Actions
        {
            id: 'action-camera',
            label: 'Escanear prenda',
            description: 'Abrir cámara para analizar ropa',
            icon: 'photo_camera',
            action: () => { onOpenCamera?.(); onClose(); },
            category: 'action',
        },
        {
            id: 'action-add',
            label: 'Agregar prenda',
            description: 'Agregar nueva prenda al armario',
            icon: 'add_circle',
            shortcut: '⌘B',
            action: () => { onOpenAddItem?.(); onClose(); },
            category: 'action',
        },
        {
            id: 'action-generate',
            label: 'Generar outfit',
            description: 'Crear un outfit con IA',
            icon: 'auto_awesome',
            shortcut: '⌘G',
            action: () => { onOpenGenerateOutfit?.(); onClose(); },
            category: 'action',
        },

        // Features
        {
            id: 'feature-packer',
            label: 'Smart Packer',
            description: 'Planificar outfits para viaje',
            icon: 'luggage',
            action: () => { navigate(ROUTES.HOME); onClose(); },
            category: 'feature',
        },
        {
            id: 'feature-weather',
            label: 'Outfit por clima',
            description: 'Outfit según el clima de hoy',
            icon: 'cloud',
            action: () => { navigate(ROUTES.HOME); onClose(); },
            category: 'feature',
        },
        {
            id: 'feature-chat',
            label: 'Chat de moda',
            description: 'Hablar con asistente de moda',
            icon: 'chat',
            action: () => { navigate(ROUTES.HOME); onClose(); },
            category: 'feature',
        },

        // Settings
        {
            id: 'settings-shortcuts',
            label: 'Atajos de teclado',
            description: 'Ver todos los atajos',
            icon: 'keyboard',
            shortcut: '⌘/',
            action: () => { onOpenShortcutsHelp?.(); onClose(); },
            category: 'settings',
        },
    ], [navigate, onClose, onOpenCamera, onOpenAddItem, onOpenGenerateOutfit, onOpenShortcutsHelp]);

    // Filter commands based on query
    const filteredCommands = useMemo(() => {
        if (!query.trim()) return commands;

        const lowerQuery = query.toLowerCase();
        return commands.filter(cmd =>
            cmd.label.toLowerCase().includes(lowerQuery) ||
            cmd.description?.toLowerCase().includes(lowerQuery)
        );
    }, [commands, query]);

    // Group commands by category
    const groupedCommands = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {};
        filteredCommands.forEach(cmd => {
            if (!groups[cmd.category]) groups[cmd.category] = [];
            groups[cmd.category].push(cmd);
        });
        return groups;
    }, [filteredCommands]);

    const categoryLabels: Record<string, string> = {
        navigation: 'Navegación',
        action: 'Acciones',
        feature: 'Funciones',
        settings: 'Configuración',
    };

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev =>
                        prev < filteredCommands.length - 1 ? prev + 1 : 0
                    );
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev =>
                        prev > 0 ? prev - 1 : filteredCommands.length - 1
                    );
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (filteredCommands[selectedIndex]) {
                        filteredCommands[selectedIndex].action();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex, onClose]);

    // Reset selected index when filter changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
    const formatShortcut = (shortcut?: string) => {
        if (!shortcut) return null;
        if (!isMac) {
            return shortcut.replace(/⌘/g, 'Ctrl+');
        }
        return shortcut;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -10 }}
                        onClick={(e) => e.stopPropagation()}
                        className="
                            w-full max-w-xl
                            bg-white dark:bg-gray-900
                            rounded-2xl
                            shadow-2xl
                            border border-gray-200 dark:border-gray-700
                            overflow-hidden
                        "
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                            <span className="material-symbols-outlined text-gray-400">search</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar comandos..."
                                className="
                                    flex-grow
                                    bg-transparent
                                    text-gray-900 dark:text-white
                                    placeholder-gray-400
                                    outline-none
                                    text-lg
                                "
                            />
                            <kbd className="
                                px-2 py-1
                                bg-gray-100 dark:bg-gray-800
                                border border-gray-200 dark:border-gray-700
                                rounded-md
                                text-xs
                                text-gray-500
                            ">
                                Esc
                            </kbd>
                        </div>

                        {/* Results */}
                        <div className="max-h-[50vh] overflow-y-auto p-2">
                            {filteredCommands.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                                        search_off
                                    </span>
                                    <p>No se encontraron comandos</p>
                                </div>
                            ) : (
                                Object.entries(groupedCommands).map(([category, items]) => (
                                    <div key={category} className="mb-4">
                                        <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            {categoryLabels[category]}
                                        </div>
                                        {items.map((cmd) => {
                                            const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                                            const isSelected = globalIndex === selectedIndex;

                                            return (
                                                <button
                                                    key={cmd.id}
                                                    onClick={cmd.action}
                                                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                    className={`
                                                        w-full flex items-center gap-3 p-3 rounded-xl
                                                        transition-colors
                                                        ${isSelected
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                        }
                                                    `}
                                                >
                                                    <div className={`
                                                        w-10 h-10 rounded-xl flex items-center justify-center
                                                        ${isSelected
                                                            ? 'bg-primary/20'
                                                            : 'bg-gray-100 dark:bg-gray-800'
                                                        }
                                                    `}>
                                                        <span className={`material-symbols-outlined ${isSelected ? 'text-primary' : ''}`}>
                                                            {cmd.icon}
                                                        </span>
                                                    </div>

                                                    <div className="flex-grow text-left">
                                                        <div className="font-medium">{cmd.label}</div>
                                                        {cmd.description && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                {cmd.description}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {cmd.shortcut && (
                                                        <kbd className="
                                                            px-2 py-1
                                                            bg-gray-100 dark:bg-gray-800
                                                            border border-gray-200 dark:border-gray-700
                                                            rounded-md
                                                            text-xs font-mono
                                                            text-gray-500
                                                        ">
                                                            {formatShortcut(cmd.shortcut)}
                                                        </kbd>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                                    navegar
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                                    seleccionar
                                </span>
                            </div>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd>
                                cerrar
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default CommandPalette;
