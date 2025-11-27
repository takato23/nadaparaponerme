import { useEffect, useCallback, useRef } from 'react';

type ModifierKey = 'ctrl' | 'alt' | 'shift' | 'meta';

interface ShortcutConfig {
    key: string; // The key to press (e.g., 'k', 'Escape', 'Enter')
    modifiers?: ModifierKey[]; // Required modifier keys
    action: () => void; // Function to execute
    description?: string; // For help modal
    preventDefault?: boolean; // Prevent default browser behavior
    enabled?: boolean; // Whether shortcut is active
    scope?: string; // Scope identifier (e.g., 'global', 'closet', 'modal')
}

interface UseKeyboardShortcutsOptions {
    enabled?: boolean;
    scope?: string;
}

/**
 * Hook for handling keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'k', modifiers: ['meta'], action: () => openSearch(), description: 'Buscar' },
 *   { key: 'Escape', action: () => closeModal() },
 *   { key: 'b', modifiers: ['meta'], action: () => addItem(), description: 'Agregar prenda' },
 * ]);
 */
export function useKeyboardShortcuts(
    shortcuts: ShortcutConfig[],
    options: UseKeyboardShortcutsOptions = {}
) {
    const { enabled = true, scope = 'global' } = options;
    const shortcutsRef = useRef(shortcuts);

    // Keep shortcuts ref updated
    useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (!enabled) return;

        // Don't trigger shortcuts when typing in inputs
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        for (const shortcut of shortcutsRef.current) {
            if (shortcut.enabled === false) continue;
            if (shortcut.scope && shortcut.scope !== scope) continue;

            // Check if the key matches
            const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase() ||
                event.code.toLowerCase() === `key${shortcut.key.toLowerCase()}`;

            if (!keyMatches) continue;

            // Check modifiers
            const modifiers = shortcut.modifiers || [];
            const ctrlRequired = modifiers.includes('ctrl');
            const altRequired = modifiers.includes('alt');
            const shiftRequired = modifiers.includes('shift');
            const metaRequired = modifiers.includes('meta');

            // On Mac, we accept both Cmd and Ctrl for 'meta'
            const metaPressed = event.metaKey || (navigator.platform.includes('Mac') ? false : event.ctrlKey);
            const ctrlPressed = event.ctrlKey && !navigator.platform.includes('Mac');

            const modifiersMatch =
                (ctrlRequired ? ctrlPressed : !ctrlPressed || metaRequired) &&
                (altRequired === event.altKey) &&
                (shiftRequired === event.shiftKey) &&
                (metaRequired ? metaPressed : !metaPressed || ctrlRequired);

            // Special case: if we require meta on Mac, accept Cmd; on Windows accept Ctrl
            const metaOrCtrlMatch = metaRequired ?
                (navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey) : true;

            if (keyMatches && modifiersMatch && metaOrCtrlMatch) {
                // Skip if in input and shortcut doesn't override
                if (isInput && shortcut.key !== 'Escape') continue;

                if (shortcut.preventDefault !== false) {
                    event.preventDefault();
                }
                shortcut.action();
                return;
            }
        }
    }, [enabled, scope]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

/**
 * Get the display string for a shortcut
 */
export function getShortcutDisplay(modifiers?: ModifierKey[], key?: string): string {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
    const parts: string[] = [];

    if (modifiers?.includes('ctrl')) {
        parts.push(isMac ? '⌃' : 'Ctrl');
    }
    if (modifiers?.includes('alt')) {
        parts.push(isMac ? '⌥' : 'Alt');
    }
    if (modifiers?.includes('shift')) {
        parts.push(isMac ? '⇧' : 'Shift');
    }
    if (modifiers?.includes('meta')) {
        parts.push(isMac ? '⌘' : 'Ctrl');
    }

    if (key) {
        // Format special keys
        const keyDisplay = {
            'escape': isMac ? 'Esc' : 'Esc',
            'enter': isMac ? '↵' : 'Enter',
            'arrowup': '↑',
            'arrowdown': '↓',
            'arrowleft': '←',
            'arrowright': '→',
            'backspace': isMac ? '⌫' : 'Backspace',
            'delete': isMac ? '⌦' : 'Del',
            'tab': '⇥',
            ' ': 'Space',
        }[key.toLowerCase()] || key.toUpperCase();

        parts.push(keyDisplay);
    }

    return parts.join(isMac ? '' : '+');
}

/**
 * Common shortcuts configuration
 */
export const COMMON_SHORTCUTS = {
    search: { key: 'k', modifiers: ['meta'] as ModifierKey[], description: 'Buscar' },
    addItem: { key: 'b', modifiers: ['meta'] as ModifierKey[], description: 'Agregar prenda' },
    generateOutfit: { key: 'g', modifiers: ['meta'] as ModifierKey[], description: 'Generar outfit' },
    close: { key: 'Escape', description: 'Cerrar' },
    save: { key: 's', modifiers: ['meta'] as ModifierKey[], description: 'Guardar' },
    undo: { key: 'z', modifiers: ['meta'] as ModifierKey[], description: 'Deshacer' },
    help: { key: '/', modifiers: ['meta'] as ModifierKey[], description: 'Ayuda' },
};

export default useKeyboardShortcuts;
