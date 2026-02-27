import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useThemeContext } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { clearToneCache } from '../src/services/aiToneHelper';
import { FaceReferenceUploader } from './FaceReferenceUploader';
import { getPendingRequestsCount, getActiveBorrowsCount } from '../src/services/borrowedItemsService';
import { getProfileVisibility, updateProfileVisibility, getProfileTokens } from '../src/services/profileService';
import ConfirmDeleteModal from './ui/ConfirmDeleteModal';
import { useConsentPreferences } from '../hooks/useConsentPreferences';
import { setConsentPreferences } from '../src/services/consentService';
import { isAdminUser } from '../src/services/accessControlService';
import type { ClothingItem } from '../types';

export type AITone = 'concise' | 'balanced' | 'detailed';

interface ProfileViewProps {
    user: any;
    closet: ClothingItem[];
    stats: {
        totalItems: number;
        totalOutfits: number;
        favoriteBrand: string;
        mostWornColor: string;
    };
    onLogout: () => void;
    onOpenAnalytics?: () => void;
    onOpenColorPalette?: () => void;
    onOpenTopVersatile?: () => void;
    onOpenWeeklyPlanner?: () => void;
    onOpenAestheticPlayground?: () => void;
    onOpenBorrowedItems?: () => void;
    onDeleteAccount?: () => Promise<void> | void;
    onLoadSampleData?: () => void;
    onCreateBetaInvite?: () => Promise<void> | void;
    onListBetaInviteClaims?: (code?: string) => Promise<{
        invites: Array<{
            code: string;
            max_uses: number;
            uses_count: number;
            expires_at: string | null;
            revoked_at: string | null;
            created_by: string | null;
            created_at: string;
        }>;
        claims: Array<{
            code: string;
            user_id: string;
            claimed_at: string;
            source: string;
            email: string | null;
            username: string | null;
            display_name: string | null;
        }>;
    }>;
}

const ProfileView = ({
    user,
    closet,
    stats,
    onLogout,
    onOpenAnalytics,
    onOpenColorPalette,
    onOpenTopVersatile,
    onOpenWeeklyPlanner,
    onOpenAestheticPlayground,
    onOpenBorrowedItems,
    onDeleteAccount,
    onLoadSampleData,
    onCreateBetaInvite,
    onListBetaInviteClaims
}: ProfileViewProps) => {
    const { theme, toggleTheme } = useThemeContext();
    const [pendingRequests, setPendingRequests] = useState(0);
    const [activeBorrows, setActiveBorrows] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isPublicProfile, setIsPublicProfile] = useState<boolean | null>(null);
    const [tokensBalance, setTokensBalance] = useState<number | null>(null);
    const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
    const [isCreatingBetaInvite, setIsCreatingBetaInvite] = useState(false);
    const [isLoadingBetaTrace, setIsLoadingBetaTrace] = useState(false);
    const [betaTraceCodeFilter, setBetaTraceCodeFilter] = useState('');
    const [betaTraceError, setBetaTraceError] = useState<string | null>(null);
    const [betaTrace, setBetaTrace] = useState<Awaited<ReturnType<NonNullable<ProfileViewProps['onListBetaInviteClaims']>>> | null>(null);
    const consent = useConsentPreferences();
    const [consentDraft, setConsentDraft] = useState({ analytics: false, ads: false });
    const userIsAdmin = useMemo(() => isAdminUser(user), [user]);

    useEffect(() => {
        loadBorrowCounts();
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        let isActive = true;
        const loadData = async () => {
            const [visibility, tokens] = await Promise.all([
                getProfileVisibility(user.id),
                getProfileTokens(user.id)
            ]);
            if (isActive) {
                setIsPublicProfile(visibility);
                setTokensBalance(tokens);
            }
        };
        loadData();
        return () => {
            isActive = false;
        };
    }, [user?.id]);

    const loadBorrowCounts = async () => {
        const [pending, active] = await Promise.all([
            getPendingRequestsCount(),
            getActiveBorrowsCount()
        ]);
        setPendingRequests(pending);
        setActiveBorrows(active);
    };

    // Calculate real color stats from closet
    const colorStats = useMemo(() => {
        const colors: Record<string, number> = {};
        closet.forEach(item => {
            const color = item.metadata.color_primary;
            colors[color] = (colors[color] || 0) + 1;
        });

        const sorted = Object.entries(colors)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 4);

        const max = sorted[0]?.[1] || 1;

        // Map common color names to hex codes for visualization
        const colorMap: Record<string, string> = {
            'Negro': '#000000',
            'Blanco': '#ffffff',
            'Azul': '#3b82f6',
            'Rojo': '#ef4444',
            'Verde': '#10b981',
            'Amarillo': '#eab308',
            'Rosa': '#ec4899',
            'Gris': '#6b7280',
            'Beige': '#d6d3d1',
            'Marrón': '#78350f',
            'Naranja': '#f97316',
            'Violeta': '#8b5cf6'
        };

        return sorted.map(([label, count]) => ({
            label,
            count,
            height: `${(count / max) * 100}%`,
            color: colorMap[label] || '#cbd5e1' // Default to slate-300
        }));
    }, [closet]);

    // AI Tone preference
    const [aiTone, setAITone] = useState<AITone>(() => {
        const stored = localStorage.getItem('ojodeloca-ai-tone');
        return (stored as AITone) || 'balanced';
    });

    useEffect(() => {
        localStorage.setItem('ojodeloca-ai-tone', aiTone);
        clearToneCache();
    }, [aiTone]);

    useEffect(() => {
        if (consent) {
            setConsentDraft({ analytics: consent.analytics, ads: consent.ads });
        }
    }, [consent]);

    const handleConfirmDelete = async () => {
        if (!onDeleteAccount) return;
        setIsDeletingAccount(true);
        let success = false;
        try {
            await onDeleteAccount();
            success = true;
        } finally {
            setIsDeletingAccount(false);
            if (success) {
                setShowDeleteModal(false);
            }
        }
    };

    const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Usuario';
    const username = user?.user_metadata?.username || displayName.toLowerCase().replace(/\s+/g, '_');

    const handleTogglePublicProfile = async () => {
        if (!user?.id || isPublicProfile === null || isUpdatingVisibility) return;
        const nextValue = !isPublicProfile;
        setIsPublicProfile(nextValue);
        setIsUpdatingVisibility(true);
        try {
            await updateProfileVisibility(user.id, nextValue);
        } catch (error) {
            console.error('Failed to update profile visibility:', error);
            setIsPublicProfile(!nextValue);
        } finally {
            setIsUpdatingVisibility(false);
        }
    };

    const handleCreateBetaInvite = async () => {
        if (!onCreateBetaInvite || isCreatingBetaInvite) return;
        setIsCreatingBetaInvite(true);
        try {
            await onCreateBetaInvite();
            if (onListBetaInviteClaims) {
                const trace = await onListBetaInviteClaims();
                setBetaTrace(trace);
            }
        } finally {
            setIsCreatingBetaInvite(false);
        }
    };

    const handleLoadBetaTrace = async () => {
        if (!onListBetaInviteClaims || isLoadingBetaTrace) return;
        setIsLoadingBetaTrace(true);
        setBetaTraceError(null);
        try {
            const trace = await onListBetaInviteClaims(betaTraceCodeFilter.trim() || undefined);
            setBetaTrace(trace);
        } catch (error) {
            setBetaTraceError(error instanceof Error ? error.message : 'No se pudo cargar la trazabilidad');
        } finally {
            setIsLoadingBetaTrace(false);
        }
    };

    const handleApplyInviteFilter = async (code: string) => {
        const normalized = String(code || '').trim().toUpperCase();
        setBetaTraceCodeFilter(normalized);
        if (!onListBetaInviteClaims || isLoadingBetaTrace) return;
        setIsLoadingBetaTrace(true);
        setBetaTraceError(null);
        try {
            const trace = await onListBetaInviteClaims(normalized || undefined);
            setBetaTrace(trace);
        } catch (error) {
            setBetaTraceError(error instanceof Error ? error.message : 'No se pudo cargar la trazabilidad');
        } finally {
            setIsLoadingBetaTrace(false);
        }
    };

    return (
        <div className="w-full h-full overflow-y-auto p-6 animate-fade-in">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header Profile */}
                <div className="flex flex-col items-center text-center relative">
                    <div className="absolute top-0 right-0">
                        <button
                            onClick={toggleTheme}
                            className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-sm hover:bg-white/20 transition-colors"
                        >
                            <span className="material-symbols-outlined dark:text-white">
                                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                    </div>

                    <div className="w-24 h-24 mb-4 rounded-full bg-gradient-to-br from-primary to-secondary p-1 shadow-lg">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                            {user?.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt="User avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                                    <span className="text-3xl font-bold text-primary">
                                        {displayName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
                    <p className="text-gray-500 dark:text-gray-400">@{displayName.toLowerCase().replace(/\s+/g, '_')}</p>

                    <button
                        onClick={onLogout}
                        className="mt-4 px-6 py-2 rounded-full bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                    {userIsAdmin && onCreateBetaInvite && (
                        <div className="mt-3 w-full max-w-xl">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <button
                                    onClick={handleCreateBetaInvite}
                                    disabled={isCreatingBetaInvite}
                                    className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${
                                        isCreatingBetaInvite
                                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                    }`}
                                >
                                    {isCreatingBetaInvite ? 'Generando link beta...' : 'Generar link beta (10 usos)'}
                                </button>
                                {userIsAdmin && onListBetaInviteClaims && (
                                    <button
                                        onClick={handleLoadBetaTrace}
                                        disabled={isLoadingBetaTrace}
                                        className={`px-6 py-2 rounded-full text-sm font-bold transition-colors ${
                                            isLoadingBetaTrace
                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        {isLoadingBetaTrace ? 'Cargando trazabilidad...' : 'Ver trazabilidad'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {userIsAdmin && onListBetaInviteClaims && (
                    <Card variant="glass" padding="md" rounded="2xl" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Beta Admin</p>
                            <button
                                onClick={handleLoadBetaTrace}
                                disabled={isLoadingBetaTrace}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                            >
                                Actualizar
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Links</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{betaTrace?.invites?.length || 0}</p>
                            </div>
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Claims</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{betaTrace?.claims?.length || 0}</p>
                            </div>
                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Filtro</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{betaTraceCodeFilter || 'Todos'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-white/70 dark:bg-gray-900/60 border border-white/20 rounded-xl px-3 py-2">
                            <input
                                type="text"
                                value={betaTraceCodeFilter}
                                onChange={(e) => setBetaTraceCodeFilter(e.target.value.toUpperCase())}
                                placeholder="Filtrar por código (ej: BETA-ABCD)"
                                className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                            />
                            <button
                                onClick={handleLoadBetaTrace}
                                disabled={isLoadingBetaTrace}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50"
                            >
                                Buscar
                            </button>
                        </div>

                        {betaTraceError && (
                            <p className="text-xs text-red-600 dark:text-red-400">{betaTraceError}</p>
                        )}

                        <div className="rounded-xl border border-white/20 bg-white/60 dark:bg-gray-900/50 overflow-hidden">
                            <div className="px-3 py-2 border-b border-white/20 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Links y cupos
                            </div>
                            <div className="max-h-44 overflow-y-auto divide-y divide-white/20">
                                {(betaTrace?.invites || []).length === 0 && (
                                    <p className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">Sin links cargados.</p>
                                )}
                                {(betaTrace?.invites || []).map((invite) => {
                                    const remaining = Math.max(0, Number(invite.max_uses || 0) - Number(invite.uses_count || 0));
                                    return (
                                        <div key={invite.code} className="px-3 py-2 flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{invite.code}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {invite.uses_count}/{invite.max_uses} usados • {remaining} restantes
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleApplyInviteFilter(invite.code)}
                                                className="px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            >
                                                Ver claims
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/20 bg-white/60 dark:bg-gray-900/50 overflow-hidden">
                            <div className="px-3 py-2 border-b border-white/20 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                Aceptaciones
                            </div>
                            <div className="max-h-56 overflow-y-auto divide-y divide-white/20">
                                {(betaTrace?.claims || []).length === 0 && (
                                    <p className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">Todavía no hay aceptaciones.</p>
                                )}
                                {(betaTrace?.claims || []).map((claim, idx) => (
                                    <div key={`${claim.code}-${claim.user_id}-${claim.claimed_at}-${idx}`} className="px-3 py-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {claim.display_name || claim.username || claim.email || claim.user_id}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            {claim.code} • {claim.email || 'sin email visible'}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(claim.claimed_at).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Profile visibility */}
                <Card variant="glass" padding="md" rounded="2xl" className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Perfil público</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Si está activo, podrán encontrarte como @{username}
                        </p>
                    </div>
                    <button
                        onClick={handleTogglePublicProfile}
                        disabled={isPublicProfile === null || isUpdatingVisibility}
                        className={`relative w-14 h-8 rounded-full transition-colors ${isPublicProfile ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                            } ${isUpdatingVisibility ? 'opacity-60 cursor-not-allowed' : ''}`}
                        aria-pressed={Boolean(isPublicProfile)}
                        aria-label="Alternar perfil público"
                    >
                        <span
                            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${isPublicProfile ? 'translate-x-6' : 'translate-x-0'
                                }`}
                        />
                    </button>
                </Card>

                {/* Fast Overview - Stats Grid (Moved to top for visibility) */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center relative overflow-hidden group border-amber-200/50 dark:border-amber-900/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-300/10 to-amber-500/10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-3xl font-bold text-amber-500 flex items-center justify-center gap-1 drop-shadow-sm">
                            {tokensBalance ?? '-'} <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>diamond</span>
                        </p>
                        <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 uppercase font-black tracking-widest mt-1">Gemas AI</p>
                    </div>
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-3xl font-bold text-primary">{stats.totalItems}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Prendas</p>
                    </div>
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-3xl font-bold text-secondary">{stats.totalOutfits}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Outfits</p>
                    </div>
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-xl font-bold text-gray-800 dark:text-white truncate">{stats.favoriteBrand || '-'}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Marca Fav</p>
                    </div>
                    <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-2xl border border-white/10 text-center">
                        <p className="text-xl font-bold text-gray-800 dark:text-white truncate">{stats.mostWornColor || '-'}</p>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Color Top</p>
                    </div>
                </div>

                {/* Visual Analytics - Color Chart */}
                <div className="flex flex-col gap-6">
                    <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-soft-lg border border-white/20 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">palette</span>
                            Colores Más Usados
                        </h3>

                        {colorStats.length > 0 ? (
                            <div className="flex items-end justify-between h-40 gap-4 px-2">
                                {colorStats.map((bar, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 w-full">
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: bar.height }}
                                            transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
                                            className="w-full rounded-t-xl relative overflow-hidden group shadow-sm"
                                            style={{
                                                backgroundColor: bar.color,
                                                border: bar.color === '#ffffff' ? '1px solid #e5e7eb' : 'none'
                                            }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
                                        </motion.div>
                                        <span className="text-xs font-medium text-gray-500 truncate w-full text-center">{bar.label}</span>
                                        <span className="text-xs text-gray-400">{bar.count}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
                                No hay datos suficientes
                            </div>
                        )}
                    </div>
                </div>

                {/* Visual Identity Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2">Identidad Visual</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Face Reference */}
                        <div className="md:col-span-2">
                            <FaceReferenceUploader compact />
                        </div>

                        {/* Color Palette */}
                        <Card variant="glass" padding="md" rounded="xl" onClick={onOpenColorPalette} className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <span className="material-symbols-outlined">palette</span>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-800 dark:text-white">Paleta de Colores</p>
                                <p className="text-xs text-gray-500">Gestiona tus colores preferidos</p>
                            </div>
                            <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                        </Card>

                        {/* Top Versatile */}
                        <Card variant="glass" padding="md" rounded="xl" onClick={onOpenTopVersatile} className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer">
                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                <span className="material-symbols-outlined">star</span>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-800 dark:text-white">Top Versátiles</p>
                                <p className="text-xs text-gray-500">Tus prendas más combinables</p>
                            </div>
                            <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                        </Card>
                    </div>
                </div>

                {/* Management Section */}
                {(onOpenBorrowedItems) && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2">Gestión</h3>

                        {onOpenBorrowedItems && (
                            <Card
                                variant="glass"
                                padding="md"
                                rounded="xl"
                                onClick={onOpenBorrowedItems}
                                className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer"
                            >
                                <div className="p-2 bg-teal-100 text-teal-600 rounded-lg relative">
                                    <span className="material-symbols-outlined">swap_horiz</span>
                                    {pendingRequests > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                            {pendingRequests}
                                        </span>
                                    )}
                                </div>
                                <div className="text-left flex-1">
                                    <p className="font-bold text-gray-800 dark:text-white">Gestionar Préstamos</p>
                                    <p className="text-xs text-gray-500">
                                        {activeBorrows > 0
                                            ? `${activeBorrows} ${activeBorrows === 1 ? 'prenda prestada' : 'prendas prestadas'}`
                                            : 'Solicitudes y devoluciones'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {pendingRequests > 0 && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                                            {pendingRequests} nueva{pendingRequests > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                </div>
                            </Card>
                        )}

                        {onLoadSampleData && closet.length === 0 && (
                            <Card variant="glass" padding="md" rounded="xl" onClick={onLoadSampleData} className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer border border-blue-100 dark:border-blue-900/30">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                    <span className="material-symbols-outlined">dataset</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-800 dark:text-white">Cargar Datos de Ejemplo</p>
                                    <p className="text-xs text-gray-500">Agrega prendas para probar la app</p>
                                </div>
                                <span className="material-symbols-outlined ml-auto text-gray-400">add_circle</span>
                            </Card>
                        )}
                    </div>
                )}

                {/* AI & Preferences Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2">IA y Preferencias</h3>

                    <div className="grid grid-cols-1 gap-4">
                        {/* AI Tone Settings */}
                        <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-xl border border-white/10">
                            <p className="text-sm font-bold text-gray-800 dark:text-white mb-3 text-left">Tono de la IA</p>
                            <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                                {(['concise', 'balanced', 'detailed'] as AITone[]).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setAITone(t)}
                                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${aiTone === t
                                            ? 'bg-white dark:bg-gray-700 shadow-sm text-primary'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        {t === 'concise' ? 'Conciso' : t === 'balanced' ? 'Balance' : 'Detalle'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Privacy & Ads */}
                        <div className="bg-white/40 dark:bg-gray-800/40 p-4 rounded-xl border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Analytics</p>
                                    <p className="text-xs text-gray-500">Medición básica de uso</p>
                                </div>
                                <button
                                    onClick={() => setConsentDraft(prev => ({ ...prev, analytics: !prev.analytics }))}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${consentDraft.analytics ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                        }`}
                                >
                                    {consentDraft.analytics ? 'Activado' : 'Desactivado'}
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white">Anuncios</p>
                                    <p className="text-xs text-gray-500">AdSense para planes Free</p>
                                </div>
                                <button
                                    onClick={() => setConsentDraft(prev => ({ ...prev, ads: !prev.ads }))}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${consentDraft.ads ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                        }`}
                                >
                                    {consentDraft.ads ? 'Activado' : 'Desactivado'}
                                </button>
                            </div>
                            <button
                                onClick={() => setConsentPreferences(consentDraft)}
                                className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition"
                            >
                                Guardar preferencias
                            </button>
                        </div>
                    </div>
                </div>

                {/* Account Actions */}
                {onDeleteAccount && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2">Cuenta</h3>
                        <Card
                            variant="glass"
                            padding="md"
                            rounded="xl"
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center gap-4 hover:bg-red-50/60 dark:hover:bg-red-900/20 transition-colors cursor-pointer border border-red-100/70 dark:border-red-900/40"
                        >
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                <span className="material-symbols-outlined">delete_forever</span>
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-red-600 dark:text-red-400">Eliminar cuenta</p>
                                <p className="text-xs text-gray-500">Borra tus datos y cierra sesión</p>
                            </div>
                            <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                        </Card>
                    </div>
                )}
            </div>

            <ConfirmDeleteModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleConfirmDelete}
                itemName="tu cuenta"
                itemType="cuenta"
                isLoading={isDeletingAccount}
                warningMessage="Se eliminarán tus datos en la app, se revocará tu sesión y no podrás recuperar tu historial."
            />
        </div>
    );
};

export default ProfileView;
