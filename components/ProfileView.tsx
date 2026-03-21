import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useThemeContext } from '../contexts/ThemeContext';
import { Card } from './ui/Card';
import { clearToneCache } from '../src/services/aiToneHelper';
import { FaceReferenceUploader } from './FaceReferenceUploader';
import { getPendingRequestsCount, getActiveBorrowsCount } from '../src/services/borrowedItemsService';
import { getProfileVisibility, updateProfileVisibility, getProfileTokens } from '../src/services/profileService';
import { getFollowers, getFollowing, getProfileSocialSummary, type SocialProfilePreview } from '../src/services/socialService';
import ConfirmDeleteModal from './ui/ConfirmDeleteModal';
import { useConsentPreferences } from '../hooks/useConsentPreferences';
import { setConsentPreferences } from '../src/services/consentService';
import { isAdminUser } from '../src/services/accessControlService';
import type { ClothingItem, CommunityUser } from '../types';
import SocialNotificationsBell from './SocialNotificationsBell';
import SocialNotificationsPanel from './SocialNotificationsPanel';

export type AITone = 'concise' | 'balanced' | 'detailed';

type BetaInviteBatchResponse = {
    code: string;
    shareLink: string;
    maxUses: number;
    validDays: number;
    grantsPremium: boolean;
    grantsUnlimitedAI: boolean;
    quantity: number;
    invites: Array<{
        code: string;
        shareLink: string;
        maxUses: number;
        validDays: number;
        grantsPremium: boolean;
        grantsUnlimitedAI: boolean;
        expiresAt: string;
    }>;
};

type BetaTraceResponse = {
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
        account_created_at?: string | null;
        last_sign_in_at?: string | null;
        clothing_items_count?: number;
        outfits_count?: number;
        usage_events_count?: number;
        last_usage_at?: string | null;
        usage_state?: string;
    }>;
    summary: {
        total_invites: number;
        total_slots: number;
        used_slots: number;
        remaining_slots: number;
        claims: number;
        claimers: number;
        accounts_created: number;
        signed_in: number;
        active_users: number;
        active_last_7d: number;
        active_last_30d: number;
        closet_uploaders: number;
        look_savers: number;
        usage_event_users: number;
        total_clothing_items: number;
        total_outfits: number;
        total_usage_events: number;
        claim_rate: number;
        active_rate: number;
    };
};

type WaitlistResponse = {
    entries: Array<{
        id: string;
        email: string;
        instagram_handle: string | null;
        source: string;
        status: 'pending' | 'approved' | 'rejected';
        review_notes: string | null;
        approved_at: string | null;
        approved_by: string | null;
        activated_at: string | null;
        activated_user_id: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
        account_created?: boolean;
        account_created_at?: string | null;
        last_sign_in_at?: string | null;
        clothing_items_count?: number;
        outfits_count?: number;
        usage_events_count?: number;
        last_usage_at?: string | null;
        usage_state?: string;
    }>;
    counts: {
        pending: number;
        approved: number;
        rejected: number;
    };
    summary: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        activated: number;
        accounts_created: number;
        signed_in: number;
        active_users: number;
        active_last_7d: number;
        active_last_30d: number;
        closet_uploaders: number;
        look_savers: number;
        usage_event_users: number;
        total_clothing_items: number;
        total_outfits: number;
        total_usage_events: number;
        approval_rate: number;
        activation_rate: number;
        account_creation_rate: number;
        sign_in_rate: number;
        active_rate: number;
    };
};

const EMPTY_WAITLIST_ENTRIES: WaitlistResponse['entries'] = [];

type WaitlistApproveResponse = {
    success: boolean;
    status: string;
    processed: number;
    approved_count: number;
    failed_count: number;
    matched_user_id: string | null;
    access_granted: boolean;
    message: string;
    results: Array<{
        id: string;
        email?: string;
        success: boolean;
        status: string;
        matched_user_id: string | null;
        access_granted: boolean;
        message: string;
    }>;
};

type WaitlistRejectResponse = {
    success: boolean;
    status: string;
    processed: number;
    rejected_count: number;
    failed_count: number;
    message: string;
    results: Array<{
        id: string;
        success: boolean;
        status: string;
        message: string;
    }>;
};

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
    onOpenCommunity?: () => void;
    onOpenActivity?: () => void;
    onOpenStylistWithPrompt?: (prompt: string) => void;
    onOpenAestheticPlayground?: () => void;
    onOpenBorrowedItems?: () => void;
    onDeleteAccount?: () => Promise<void> | void;
    onLoadSampleData?: () => void;
    onCreateBetaInvite?: (options?: {
        quantity?: number;
        maxUses?: number;
        validDays?: number;
        grantsPremium?: boolean;
        grantsUnlimitedAI?: boolean;
        note?: string;
        prefix?: string;
    }) => Promise<BetaInviteBatchResponse>;
    onListBetaInviteClaims?: (code?: string) => Promise<BetaTraceResponse>;
    onListWaitlist?: (status?: 'pending' | 'approved' | 'rejected', search?: string) => Promise<WaitlistResponse>;
    onApproveWaitlistEntry?: (ids: string | string[], reviewNotes?: string) => Promise<WaitlistApproveResponse>;
    onRejectWaitlistEntry?: (ids: string | string[], reviewNotes?: string) => Promise<WaitlistRejectResponse>;
    onViewUserProfile?: (user: CommunityUser) => void;
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
    onOpenCommunity,
    onOpenActivity,
    onOpenStylistWithPrompt,
    onOpenAestheticPlayground,
    onOpenBorrowedItems,
    onDeleteAccount,
    onLoadSampleData,
    onCreateBetaInvite,
    onListBetaInviteClaims,
    onListWaitlist,
    onApproveWaitlistEntry,
    onRejectWaitlistEntry,
    onViewUserProfile
}: ProfileViewProps) => {
    const { theme, toggleTheme } = useThemeContext();
    const [pendingRequests, setPendingRequests] = useState(0);
    const [activeBorrows, setActiveBorrows] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [isPublicProfile, setIsPublicProfile] = useState<boolean | null>(null);
    const [tokensBalance, setTokensBalance] = useState<number | null>(null);
    const [socialSummary, setSocialSummary] = useState({ followers_count: 0, following_count: 0 });
    const [socialListOpen, setSocialListOpen] = useState(false);
    const [socialListType, setSocialListType] = useState<'followers' | 'following'>('followers');
    const [socialListLoading, setSocialListLoading] = useState(false);
    const [socialList, setSocialList] = useState<SocialProfilePreview[]>([]);
    const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
    const [isCreatingBetaInvite, setIsCreatingBetaInvite] = useState(false);
    const [isLoadingBetaTrace, setIsLoadingBetaTrace] = useState(false);
    const [betaTraceCodeFilter, setBetaTraceCodeFilter] = useState('');
    const [betaTraceError, setBetaTraceError] = useState<string | null>(null);
    const [betaTrace, setBetaTrace] = useState<BetaTraceResponse | null>(null);
    const [lastCreatedInvites, setLastCreatedInvites] = useState<BetaInviteBatchResponse['invites']>([]);
    const [inviteForm, setInviteForm] = useState({
        quantity: 1,
        maxUses: 1,
        validDays: 30,
        prefix: 'BETA',
        note: 'manual-admin',
        grantsPremium: true,
        grantsUnlimitedAI: true,
    });
    const [waitlistFilter, setWaitlistFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
    const [waitlistSearch, setWaitlistSearch] = useState('');
    const [waitlistError, setWaitlistError] = useState<string | null>(null);
    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistActionId, setWaitlistActionId] = useState<string | null>(null);
    const [waitlistData, setWaitlistData] = useState<WaitlistResponse | null>(null);
    const [selectedWaitlistIds, setSelectedWaitlistIds] = useState<string[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showManualLinksAdmin, setShowManualLinksAdmin] = useState(false);
    const consent = useConsentPreferences();
    const [consentDraft, setConsentDraft] = useState({ analytics: false, ads: false });
    const [avatarLoadError, setAvatarLoadError] = useState(false);
    const userIsAdmin = useMemo(() => isAdminUser(user), [user]);

    useEffect(() => {
        loadBorrowCounts();
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        let isActive = true;
        const loadData = async () => {
            try {
                const visibility = await getProfileVisibility(user.id);
                if (isActive) setIsPublicProfile(visibility);
            } catch {
                if (isActive) setIsPublicProfile(false);
            }

            try {
                const tokens = await getProfileTokens(user.id);
                if (isActive) setTokensBalance(tokens);
            } catch {
                if (isActive) setTokensBalance(null);
            }

            try {
                const summary = await getProfileSocialSummary(user.id, user.id);
                if (isActive) {
                    setSocialSummary({
                        followers_count: summary.followers_count,
                        following_count: summary.following_count,
                    });
                }
            } catch {
                if (isActive) {
                    setSocialSummary({ followers_count: 0, following_count: 0 });
                }
            }
        };
        loadData();
        return () => {
            isActive = false;
        };
    }, [user?.id]);

    const openSocialList = async (type: 'followers' | 'following') => {
        if (!user?.id) return;
        setSocialListType(type);
        setSocialListOpen(true);
        setSocialListLoading(true);
        try {
            const data = type === 'followers'
                ? await getFollowers(user.id, 80)
                : await getFollowing(user.id, 80);
            setSocialList(data);
        } finally {
            setSocialListLoading(false);
        }
    };

    const handleOpenUserProfile = (profile: SocialProfilePreview) => {
        if (!onViewUserProfile) return;
        onViewUserProfile({
            id: profile.id,
            name: profile.display_name || profile.username,
            username: profile.username,
            avatarUrl: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`,
            closet: [],
        });
        setSocialListOpen(false);
    };

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

    useEffect(() => {
        setAvatarLoadError(false);
    }, [user?.user_metadata?.avatar_url]);

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
    const formatPercent = (value?: number | null) => `${Math.round((Number(value || 0)) * 100)}%`;
    const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Sin dato';
    const currentWaitlistEntries = useMemo(
        () => waitlistData?.entries ?? EMPTY_WAITLIST_ENTRIES,
        [waitlistData?.entries]
    );
    const profileInitials = displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'U';

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
            const created = await onCreateBetaInvite(inviteForm);
            setLastCreatedInvites(created.invites);
            if (created.invites.length > 0) {
                const inviteLinks = created.invites.map((entry) => entry.shareLink).join('\n');
                try {
                    if (navigator?.clipboard?.writeText) {
                        await navigator.clipboard.writeText(inviteLinks);
                    }
                } catch {
                    // no-op
                }
            }
            if (onListBetaInviteClaims) {
                const trace = await onListBetaInviteClaims();
                setBetaTrace(trace);
            }
        } finally {
            setIsCreatingBetaInvite(false);
        }
    };

    const handleCopyLastInvites = async () => {
        if (lastCreatedInvites.length === 0 || !navigator?.clipboard?.writeText) return;
        await navigator.clipboard.writeText(lastCreatedInvites.map((entry) => entry.shareLink).join('\n'));
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

    const handleLoadWaitlist = async (status: 'pending' | 'approved' | 'rejected' = waitlistFilter, search: string = waitlistSearch) => {
        if (!onListWaitlist || waitlistLoading) return;
        setWaitlistLoading(true);
        setWaitlistError(null);
        try {
            const data = await onListWaitlist(status, search.trim() || undefined);
            setWaitlistData(data);
        } catch (error) {
            setWaitlistError(error instanceof Error ? error.message : 'No se pudo cargar la waitlist');
        } finally {
            setWaitlistLoading(false);
        }
    };

    const handleApproveWaitlist = async (id: string) => {
        if (!onApproveWaitlistEntry || waitlistActionId) return;
        setWaitlistActionId(id);
        setWaitlistError(null);
        try {
            await onApproveWaitlistEntry(id);
            setSelectedWaitlistIds((current) => current.filter((entryId) => entryId !== id));
            await handleLoadWaitlist();
        } catch (error) {
            setWaitlistError(error instanceof Error ? error.message : 'No se pudo aprobar el acceso');
        } finally {
            setWaitlistActionId(null);
        }
    };

    const handleRejectWaitlist = async (id: string) => {
        if (!onRejectWaitlistEntry || waitlistActionId) return;
        setWaitlistActionId(id);
        setWaitlistError(null);
        try {
            await onRejectWaitlistEntry(id);
            setSelectedWaitlistIds((current) => current.filter((entryId) => entryId !== id));
            await handleLoadWaitlist();
        } catch (error) {
            setWaitlistError(error instanceof Error ? error.message : 'No se pudo rechazar el acceso');
        } finally {
            setWaitlistActionId(null);
        }
    };

    const toggleWaitlistSelection = (id: string) => {
        setSelectedWaitlistIds((current) => (
            current.includes(id)
                ? current.filter((entryId) => entryId !== id)
                : [...current, id]
        ));
    };

    const handleToggleSelectAllWaitlist = () => {
        const pendingIds = currentWaitlistEntries
            .filter((entry) => entry.status === 'pending')
            .map((entry) => entry.id);
        setSelectedWaitlistIds((current) => (
            current.length === pendingIds.length ? [] : pendingIds
        ));
    };

    const handleBulkApproveWaitlist = async () => {
        if (!onApproveWaitlistEntry || selectedWaitlistIds.length === 0 || waitlistActionId) return;
        setWaitlistActionId('bulk-approve');
        setWaitlistError(null);
        try {
            await onApproveWaitlistEntry(selectedWaitlistIds);
            setSelectedWaitlistIds([]);
            await handleLoadWaitlist();
        } catch (error) {
            setWaitlistError(error instanceof Error ? error.message : 'No se pudo aprobar la selección');
        } finally {
            setWaitlistActionId(null);
        }
    };

    const handleBulkRejectWaitlist = async () => {
        if (!onRejectWaitlistEntry || selectedWaitlistIds.length === 0 || waitlistActionId) return;
        setWaitlistActionId('bulk-reject');
        setWaitlistError(null);
        try {
            await onRejectWaitlistEntry(selectedWaitlistIds);
            setSelectedWaitlistIds([]);
            await handleLoadWaitlist();
        } catch (error) {
            setWaitlistError(error instanceof Error ? error.message : 'No se pudo rechazar la selección');
        } finally {
            setWaitlistActionId(null);
        }
    };

    useEffect(() => {
        if (!userIsAdmin || !onListWaitlist || waitlistData) return;
        void handleLoadWaitlist('pending', '');
    }, [onListWaitlist, userIsAdmin, waitlistData]);

    useEffect(() => {
        setSelectedWaitlistIds((current) => {
            const next = current.filter((id) => currentWaitlistEntries.some((entry) => entry.id === id && entry.status === 'pending'));
            const didChange = next.length !== current.length || next.some((id, index) => id !== current[index]);
            return didChange ? next : current;
        });
    }, [currentWaitlistEntries]);

    return (
        <div className="relative h-full w-full overflow-y-auto animate-fade-in bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.62),_transparent_34%),linear-gradient(180deg,#f7f0e8_0%,#fbf8f4_38%,#f2ece4_100%)] p-6">
            <div className="noise-overlay opacity-[0.04]" />
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.72)_0%,_transparent_70%)] blur-3xl" />
            <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(154,212,192,0.18)_0%,_transparent_70%)] blur-3xl" />

            <div className="relative mx-auto max-w-4xl space-y-8">

                {/* Header Profile */}
                <div className="relative overflow-hidden rounded-[2.6rem] border border-white/70 bg-white/56 px-6 py-8 text-center shadow-[0_24px_70px_rgba(24,24,27,0.12)] backdrop-blur-[24px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_42%)]" />
                    <div className="absolute top-0 right-0 flex items-center gap-2 m-4">
                        <SocialNotificationsBell
                            onClick={() => setShowNotifications(true)}
                            className="relative rounded-full border border-white/50 bg-white/35 p-3 shadow-sm backdrop-blur-md transition-colors hover:bg-white/55"
                        />
                        <button
                            onClick={toggleTheme}
                            className="rounded-full border border-white/50 bg-white/35 p-3 shadow-sm backdrop-blur-md transition-colors hover:bg-white/55"
                        >
                            <span className="material-symbols-outlined text-gray-900 dark:text-white">
                                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>
                    </div>

                    <div className="relative z-10 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary p-1 shadow-[0_18px_36px_rgba(0,0,0,0.14)]">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                            {user?.user_metadata?.avatar_url && !avatarLoadError ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                    onError={() => setAvatarLoadError(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                                    <span className="text-3xl font-bold tracking-[0.08em] text-primary">
                                        {profileInitials}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="relative z-10 text-[11px] font-bold uppercase tracking-[0.28em] text-black/42">Perfil</p>
                    <h2 className="relative z-10 mt-3 text-4xl font-semibold tracking-[-0.04em] text-gray-900 dark:text-white">{displayName}</h2>
                    <p className="relative z-10 text-gray-500 dark:text-gray-400">@{displayName.toLowerCase().replace(/\s+/g, '_')}</p>
                    <div className="relative z-10 mt-4 flex items-center gap-6 text-sm">
                        <button
                            onClick={() => void openSocialList('followers')}
                            className="rounded-2xl border border-white/55 bg-white/36 px-4 py-3 text-center shadow-[0_10px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl transition hover:bg-white/56"
                        >
                            <p className="font-bold text-gray-900 dark:text-white">{socialSummary.followers_count}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Seguidores</p>
                        </button>
                        <button
                            onClick={() => void openSocialList('following')}
                            className="rounded-2xl border border-white/55 bg-white/36 px-4 py-3 text-center shadow-[0_10px_24px_rgba(0,0,0,0.05)] backdrop-blur-xl transition hover:bg-white/56"
                        >
                            <p className="font-bold text-gray-900 dark:text-white">{socialSummary.following_count}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Siguiendo</p>
                        </button>
                    </div>

                    <button
                        onClick={onLogout}
                        className="relative z-10 mt-5 rounded-full bg-[#171717] px-6 py-2.5 text-sm font-bold text-white shadow-[0_18px_34px_rgba(0,0,0,0.18)] transition hover:scale-[1.02]"
                    >
                        Cerrar Sesión
                    </button>
                </div>

                {userIsAdmin && (onListBetaInviteClaims || onListWaitlist) && (
                    <Card variant="glass" padding="md" rounded="2xl" className="space-y-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Beta Admin</p>
                            <div className="flex items-center gap-2">
                                {onListWaitlist && (
                                    <button
                                        onClick={() => void handleLoadWaitlist()}
                                        disabled={waitlistLoading}
                                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                                    >
                                        {waitlistLoading ? 'Cargando waitlist...' : 'Actualizar waitlist'}
                                    </button>
                                )}
                                {onListBetaInviteClaims && (
                                    <button
                                        onClick={handleLoadBetaTrace}
                                        disabled={isLoadingBetaTrace}
                                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                                    >
                                        Actualizar links manuales
                                    </button>
                                )}
                            </div>
                        </div>
                        {onListWaitlist && waitlistData?.summary && (
                            <div className="space-y-3">
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Funnel waitlist</p>
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                                    <div className="rounded-xl bg-white/70 border border-white/20 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Pendientes</p>
                                        <p className="text-lg font-bold text-gray-900">{waitlistData.summary.pending}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/70 border border-white/20 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Aprobadas</p>
                                        <p className="text-lg font-bold text-gray-900">{waitlistData.summary.approved}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/70 border border-white/20 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Cuenta creada</p>
                                        <p className="text-lg font-bold text-gray-900">{waitlistData.summary.accounts_created}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/70 border border-white/20 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Entraron</p>
                                        <p className="text-lg font-bold text-gray-900">{waitlistData.summary.signed_in}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/70 border border-white/20 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Activas 7d</p>
                                        <p className="text-lg font-bold text-gray-900">{waitlistData.summary.active_last_7d}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-emerald-700">Approval rate</p>
                                        <p className="text-base font-bold text-emerald-900">{formatPercent(waitlistData.summary.approval_rate)}</p>
                                    </div>
                                    <div className="rounded-xl bg-sky-50 border border-sky-100 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-sky-700">Account rate</p>
                                        <p className="text-base font-bold text-sky-900">{formatPercent(waitlistData.summary.account_creation_rate)}</p>
                                    </div>
                                    <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-violet-700">Sign-in rate</p>
                                        <p className="text-base font-bold text-violet-900">{formatPercent(waitlistData.summary.sign_in_rate)}</p>
                                    </div>
                                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                                        <p className="text-[10px] uppercase tracking-wide text-amber-700">Active rate</p>
                                        <p className="text-base font-bold text-amber-900">{formatPercent(waitlistData.summary.active_rate)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {onCreateBetaInvite && (
                            <div className="rounded-2xl border border-indigo-200/60 bg-white/80 px-4 py-4 shadow-[0_10px_24px_rgba(0,0,0,0.05)] space-y-4">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Invitaciones</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Podés generar una sola o varias. Sirve para tandas chicas y seguimiento en el panel.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Cantidad</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={50}
                                            value={inviteForm.quantity}
                                            onChange={(e) => setInviteForm((current) => ({ ...current, quantity: Math.max(1, Math.min(50, Number(e.target.value) || 1)) }))}
                                            className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Usos por link</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={200}
                                            value={inviteForm.maxUses}
                                            onChange={(e) => setInviteForm((current) => ({ ...current, maxUses: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))}
                                            className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Días</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={365}
                                            value={inviteForm.validDays}
                                            onChange={(e) => setInviteForm((current) => ({ ...current, validDays: Math.max(1, Math.min(365, Number(e.target.value) || 30)) }))}
                                            className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                                        />
                                    </label>
                                    <label className="space-y-1">
                                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Prefijo</span>
                                        <input
                                            type="text"
                                            value={inviteForm.prefix}
                                            onChange={(e) => setInviteForm((current) => ({ ...current, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'BETA' }))}
                                            className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                                        />
                                    </label>
                                </div>
                                <label className="space-y-1 block">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Nota interna</span>
                                    <input
                                        type="text"
                                        value={inviteForm.note}
                                        onChange={(e) => setInviteForm((current) => ({ ...current, note: e.target.value }))}
                                        className="w-full rounded-xl border border-white/30 bg-white px-3 py-2 text-sm text-gray-900 outline-none"
                                    />
                                </label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={inviteForm.grantsPremium}
                                            onChange={(e) => setInviteForm((current) => ({ ...current, grantsPremium: e.target.checked }))}
                                        />
                                        Premium
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={inviteForm.grantsUnlimitedAI}
                                            onChange={(e) => setInviteForm((current) => ({ ...current, grantsUnlimitedAI: e.target.checked }))}
                                        />
                                        AI ilimitada
                                    </label>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleCreateBetaInvite}
                                        disabled={isCreatingBetaInvite}
                                        className={`min-h-12 rounded-full px-6 py-3 text-sm font-bold transition-colors ${
                                            isCreatingBetaInvite
                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        }`}
                                    >
                                        {isCreatingBetaInvite ? 'Generando links...' : `Generar ${inviteForm.quantity} link${inviteForm.quantity === 1 ? '' : 's'}`}
                                    </button>
                                    {lastCreatedInvites.length > 0 && (
                                        <button
                                            onClick={() => void handleCopyLastInvites()}
                                            className="min-h-12 rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                                        >
                                            Copiar últimos links
                                        </button>
                                    )}
                                </div>
                                {lastCreatedInvites.length > 0 && (
                                    <div className="rounded-xl border border-white/20 bg-white/70 overflow-hidden">
                                        <div className="px-3 py-2 border-b border-white/20 text-xs font-semibold text-gray-600">
                                            Última tanda generada
                                        </div>
                                        <div className="max-h-44 overflow-y-auto divide-y divide-white/20">
                                            {lastCreatedInvites.map((invite) => (
                                                <div key={invite.code} className="px-3 py-2">
                                                    <p className="text-sm font-semibold text-gray-900">{invite.code}</p>
                                                    <p className="text-xs text-gray-500">{invite.maxUses} uso(s) • vence {formatDateTime(invite.expiresAt)}</p>
                                                    <p className="truncate text-xs text-indigo-700">{invite.shareLink}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {onListWaitlist && (
                            <>
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Pendientes</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{waitlistData?.counts?.pending || 0}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Aprobadas</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{waitlistData?.counts?.approved || 0}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Rechazadas</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{waitlistData?.counts?.rejected || 0}</p>
                                    </div>
                                    <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500">Vista</p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{waitlistFilter}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={handleToggleSelectAllWaitlist}
                                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                                    >
                                        {selectedWaitlistIds.length > 0 && selectedWaitlistIds.length === currentWaitlistEntries.filter((entry) => entry.status === 'pending').length
                                            ? 'Limpiar selección'
                                            : 'Seleccionar pendientes visibles'}
                                    </button>
                                    <button
                                        onClick={() => void handleBulkApproveWaitlist()}
                                        disabled={selectedWaitlistIds.length === 0 || waitlistActionId !== null}
                                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                                    >
                                        Aprobar selección ({selectedWaitlistIds.length})
                                    </button>
                                    <button
                                        onClick={() => void handleBulkRejectWaitlist()}
                                        disabled={selectedWaitlistIds.length === 0 || waitlistActionId !== null}
                                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                                    >
                                        Rechazar selección ({selectedWaitlistIds.length})
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/70 dark:bg-gray-900/60 px-3 py-2">
                                        {(['pending', 'approved', 'rejected'] as const).map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => {
                                                    setWaitlistFilter(status);
                                                    void handleLoadWaitlist(status, waitlistSearch);
                                                }}
                                                className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                                                    waitlistFilter === status
                                                        ? 'bg-gray-900 text-white'
                                                        : 'bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                                }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 bg-white/70 dark:bg-gray-900/60 border border-white/20 rounded-xl px-3 py-2 flex-1">
                                        <input
                                            type="text"
                                            value={waitlistSearch}
                                            onChange={(e) => setWaitlistSearch(e.target.value)}
                                            placeholder="Buscar por mail o IG"
                                            className="w-full bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
                                        />
                                        <button
                                            onClick={() => void handleLoadWaitlist()}
                                            disabled={waitlistLoading}
                                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                                        >
                                            Buscar
                                        </button>
                                    </div>
                                </div>

                                {waitlistError && (
                                    <p className="text-xs text-red-600 dark:text-red-400">{waitlistError}</p>
                                )}

                                <div className="rounded-xl border border-white/20 bg-white/60 dark:bg-gray-900/50 overflow-hidden">
                                    <div className="px-3 py-2 border-b border-white/20 text-xs font-semibold text-gray-600 dark:text-gray-300">
                                        Waitlist beta
                                    </div>
                                    <div className="max-h-72 overflow-y-auto divide-y divide-white/20">
                                        {(waitlistData?.entries || []).length === 0 && (
                                            <p className="px-3 py-3 text-xs text-gray-500 dark:text-gray-400">No hay personas en esta vista.</p>
                                        )}
                                        {(waitlistData?.entries || []).map((entry) => (
                                            <div key={entry.id} className="px-3 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    {entry.status === 'pending' ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedWaitlistIds.includes(entry.id)}
                                                            onChange={() => toggleWaitlistSelection(entry.id)}
                                                            className="mt-1 h-4 w-4 rounded border-gray-300"
                                                        />
                                                    ) : (
                                                        <div className="mt-1 h-4 w-4" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{entry.email}</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                                            {entry.instagram_handle ? `@${entry.instagram_handle}` : 'sin IG'} • {entry.source || 'instagram'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            {new Date(entry.created_at).toLocaleString()} • {entry.activated_at ? 'acceso activo' : entry.status}
                                                        </p>
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                                                entry.account_created ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                {entry.account_created ? 'Cuenta creada' : 'Sin cuenta'}
                                                            </span>
                                                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                                                entry.last_sign_in_at ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
                                                            }`}>
                                                                {entry.last_sign_in_at ? 'Hizo login' : 'Sin login'}
                                                            </span>
                                                            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                                                entry.usage_state === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                                {entry.usage_state === 'active' ? 'Usando app' : 'Todavía sin uso fuerte'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-[11px] text-gray-500">
                                                            Closet {entry.clothing_items_count || 0} • Outfits {entry.outfits_count || 0} • Eventos {entry.usage_events_count || 0}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500">
                                                            Último login: {formatDateTime(entry.last_sign_in_at)} • Último uso: {formatDateTime(entry.last_usage_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {entry.status === 'pending' && onApproveWaitlistEntry && (
                                                        <button
                                                            onClick={() => void handleApproveWaitlist(entry.id)}
                                                            disabled={waitlistActionId === entry.id}
                                                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50"
                                                        >
                                                            {waitlistActionId === entry.id ? 'Procesando...' : 'Aprobar'}
                                                        </button>
                                                    )}
                                                    {entry.status === 'pending' && onRejectWaitlistEntry && (
                                                        <button
                                                            onClick={() => void handleRejectWaitlist(entry.id)}
                                                            disabled={waitlistActionId === entry.id}
                                                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                                                        >
                                                            Rechazar
                                                        </button>
                                                    )}
                                                    {entry.status !== 'pending' && (
                                                        <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                                            {entry.status === 'approved' ? (entry.activated_at ? 'Aprobada + activa' : 'Aprobada') : 'Rechazada'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {onListBetaInviteClaims && (
                            <>
                                <div className="rounded-2xl border border-white/20 bg-white/70 dark:bg-gray-900/60 p-3">
                                    <button
                                        onClick={() => setShowManualLinksAdmin((value) => !value)}
                                        className="flex w-full items-center justify-between text-left"
                                    >
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Links manuales</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Solo rescates por privado. No usar para captación masiva.
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined text-gray-500">
                                            {showManualLinksAdmin ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </button>
                                </div>

                                {showManualLinksAdmin && (
                                    <>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Links manuales</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{betaTrace?.summary?.total_invites || 0}</p>
                                            </div>
                                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Claims</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">{betaTrace?.summary?.claims || 0}</p>
                                            </div>
                                            <div className="rounded-xl bg-white/70 dark:bg-gray-900/60 border border-white/20 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Filtro</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{betaTraceCodeFilter || 'Todos'}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                                            <div className="rounded-xl bg-white/70 border border-white/20 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Slots usados</p>
                                                <p className="text-base font-bold text-gray-900">{betaTrace?.summary?.used_slots || 0}/{betaTrace?.summary?.total_slots || 0}</p>
                                            </div>
                                            <div className="rounded-xl bg-white/70 border border-white/20 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Cuentas</p>
                                                <p className="text-base font-bold text-gray-900">{betaTrace?.summary?.accounts_created || 0}</p>
                                            </div>
                                            <div className="rounded-xl bg-white/70 border border-white/20 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Entraron</p>
                                                <p className="text-base font-bold text-gray-900">{betaTrace?.summary?.signed_in || 0}</p>
                                            </div>
                                            <div className="rounded-xl bg-white/70 border border-white/20 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Activas 7d</p>
                                                <p className="text-base font-bold text-gray-900">{betaTrace?.summary?.active_last_7d || 0}</p>
                                            </div>
                                            <div className="rounded-xl bg-white/70 border border-white/20 p-2">
                                                <p className="text-[10px] uppercase tracking-wide text-gray-500">Claim rate</p>
                                                <p className="text-base font-bold text-gray-900">{formatPercent(betaTrace?.summary?.claim_rate)}</p>
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
                                                Usos de links manuales
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
                                                        <p className="text-[11px] text-gray-500">
                                                            Login: {formatDateTime(claim.last_sign_in_at)} • Uso: {formatDateTime(claim.last_usage_at)}
                                                        </p>
                                                        <p className="text-[11px] text-gray-500">
                                                            Closet {claim.clothing_items_count || 0} • Outfits {claim.outfits_count || 0} • Eventos {claim.usage_events_count || 0}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
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

                <SocialNotificationsPanel
                    isOpen={showNotifications}
                    onClose={() => setShowNotifications(false)}
                />

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

                        {onOpenWeeklyPlanner && (
                            <Card variant="glass" padding="md" rounded="xl" onClick={onOpenWeeklyPlanner} className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <span className="material-symbols-outlined">calendar_month</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-800 dark:text-white">Planner semanal</p>
                                    <p className="text-xs text-gray-500">Ordená tus looks antes de necesitarlos</p>
                                </div>
                                <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                            </Card>
                        )}
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

                {(onOpenCommunity || onOpenActivity) && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-2">Comunidad</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {onOpenCommunity && (
                                <Card
                                    variant="glass"
                                    padding="md"
                                    rounded="xl"
                                    onClick={onOpenCommunity}
                                    className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer"
                                >
                                    <div className="p-2 bg-fuchsia-100 text-fuchsia-600 rounded-lg">
                                        <span className="material-symbols-outlined">groups</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-800 dark:text-white">Explorar comunidad</p>
                                        <p className="text-xs text-gray-500">Perfiles, amigas y armarios conectados</p>
                                    </div>
                                    <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                                </Card>
                            )}

                            {onOpenActivity && (
                                <Card
                                    variant="glass"
                                    padding="md"
                                    rounded="xl"
                                    onClick={onOpenActivity}
                                    className="w-full flex items-center gap-4 hover:bg-white/50 transition-colors cursor-pointer"
                                >
                                    <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                                        <span className="material-symbols-outlined">forum</span>
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-800 dark:text-white">Actividad y comentarios</p>
                                        <p className="text-xs text-gray-500">Likes, comentarios y movimiento del círculo</p>
                                    </div>
                                    <span className="material-symbols-outlined ml-auto text-gray-400">chevron_right</span>
                                </Card>
                            )}
                        </div>
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

            {socialListOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSocialListOpen(false)}
                    />
                    <div className="relative w-full md:max-w-md max-h-[80vh] bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {socialListType === 'followers' ? 'Seguidores' : 'Siguiendo'}
                            </h3>
                            <button
                                onClick={() => setSocialListOpen(false)}
                                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <span className="material-symbols-outlined text-base">close</span>
                            </button>
                        </div>

                        <div className="overflow-y-auto max-h-[65vh]">
                            {socialListLoading && (
                                <p className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
                            )}
                            {!socialListLoading && socialList.length === 0 && (
                                <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400">No hay usuarios para mostrar.</p>
                            )}
                            {!socialListLoading && socialList.map((profile) => (
                                <button
                                    key={profile.id}
                                    onClick={() => handleOpenUserProfile(profile)}
                                    className="w-full px-4 py-3 text-left flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                                >
                                    <img
                                        src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                                        alt={profile.display_name || profile.username}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                            {profile.display_name || profile.username}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{profile.username}</p>
                                    </div>
                                    <span className="material-symbols-outlined ml-auto text-gray-400 text-sm">chevron_right</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileView;
