import { useState, useCallback, useRef, useEffect } from 'react';

interface UndoableAction<T> {
    id: string;
    type: string;
    data: T;
    timestamp: number;
    description: string;
}

interface UndoState<T> {
    pendingAction: UndoableAction<T> | null;
    timeRemaining: number;
}

interface UseUndoActionOptions {
    timeout?: number; // Time in ms before action becomes permanent (default: 5000)
    onUndo?: () => void; // Callback when action is undone
    onConfirm?: () => void; // Callback when action is confirmed (timeout expires)
}

/**
 * Hook for undoable actions with timer
 *
 * @example
 * const { executeAction, undoAction, pendingAction, timeRemaining } = useUndoAction({
 *   timeout: 5000,
 *   onUndo: () => toast.success('Acción deshecha'),
 *   onConfirm: () => permanentlyDelete(item),
 * });
 *
 * // To delete with undo option:
 * executeAction({
 *   type: 'delete',
 *   data: itemToDelete,
 *   description: 'Prenda eliminada',
 * });
 */
export function useUndoAction<T = any>(options: UseUndoActionOptions = {}) {
    const { timeout = 5000, onUndo, onConfirm } = options;

    const [state, setState] = useState<UndoState<T>>({
        pendingAction: null,
        timeRemaining: 0,
    });

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const onConfirmRef = useRef(onConfirm);
    const onUndoRef = useRef(onUndo);

    // Keep refs updated
    useEffect(() => {
        onConfirmRef.current = onConfirm;
        onUndoRef.current = onUndo;
    }, [onConfirm, onUndo]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const clearTimers = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const executeAction = useCallback((action: Omit<UndoableAction<T>, 'id' | 'timestamp'>) => {
        // Clear any existing pending action
        clearTimers();

        const newAction: UndoableAction<T> = {
            ...action,
            id: `action_${Date.now()}`,
            timestamp: Date.now(),
        };

        setState({
            pendingAction: newAction,
            timeRemaining: timeout,
        });

        // Start countdown interval
        intervalRef.current = setInterval(() => {
            setState(prev => ({
                ...prev,
                timeRemaining: Math.max(0, prev.timeRemaining - 100),
            }));
        }, 100);

        // Set timeout for confirmation
        timerRef.current = setTimeout(() => {
            clearTimers();
            setState({ pendingAction: null, timeRemaining: 0 });
            onConfirmRef.current?.();
        }, timeout);

        return newAction.id;
    }, [timeout, clearTimers]);

    const undoAction = useCallback(() => {
        if (!state.pendingAction) return false;

        clearTimers();
        const actionToUndo = state.pendingAction;
        setState({ pendingAction: null, timeRemaining: 0 });
        onUndoRef.current?.();

        return actionToUndo;
    }, [state.pendingAction, clearTimers]);

    const confirmAction = useCallback(() => {
        if (!state.pendingAction) return;

        clearTimers();
        setState({ pendingAction: null, timeRemaining: 0 });
        onConfirmRef.current?.();
    }, [state.pendingAction, clearTimers]);

    return {
        executeAction,
        undoAction,
        confirmAction,
        pendingAction: state.pendingAction,
        timeRemaining: state.timeRemaining,
        hasUndoablePending: state.pendingAction !== null,
        progress: state.pendingAction ? (state.timeRemaining / timeout) * 100 : 0,
    };
}

export default useUndoAction;
