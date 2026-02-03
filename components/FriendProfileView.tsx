import React, { useState, useEffect } from 'react';
import type { CommunityUser, ClothingItem, ActivityFeedItem } from '../types';
import ClosetGrid from './ClosetGrid';
import ActivityCard from './ActivityCard';
import { fetchActivityFeed } from '../src/services/activityFeedService';
import { isCloseFriend, toggleCloseFriend } from '../src/services/socialService';
import { requestToBorrowMultiple, getItemBorrowStatus } from '../src/services/borrowedItemsService';
import { Card } from './ui/Card';
import Loader from './Loader';

interface FriendProfileViewProps {
    friend: CommunityUser;
    onClose: () => void;
    onAddBorrowedItems: (items: ClothingItem[]) => void;
    onTryBorrowedItems: (items: ClothingItem[]) => void;
    onShowToast?: (message: string, type: 'success' | 'error') => void;
}

type Tab = 'activity' | 'closet' | 'stats';

const FriendProfileView = ({ friend, onClose, onAddBorrowedItems, onTryBorrowedItems, onShowToast }: FriendProfileViewProps) => {
    const [activeTab, setActiveTab] = useState<Tab>('activity');
    const [isCloseFriendStatus, setIsCloseFriendStatus] = useState(false);
    const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [isFollowing, setIsFollowing] = useState(true);
    const [showStyleMatch, setShowStyleMatch] = useState(false);

    const [selectedItems, setSelectedItems] = useState<ClothingItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Borrow request state
    const [showBorrowModal, setShowBorrowModal] = useState(false);
    const [borrowNotes, setBorrowNotes] = useState('');
    const [borrowLoading, setBorrowLoading] = useState(false);
    const [requestedItemIds, setRequestedItemIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        checkCloseFriendStatus();
        loadFriendActivity();
    }, [friend.id]);

    const checkCloseFriendStatus = async () => {
        const status = await isCloseFriend(friend.id);
        setIsCloseFriendStatus(status);
    };

    const loadFriendActivity = async () => {
        setLoadingActivities(true);
        try {
            const data = await fetchActivityFeed('all', 0, 20, friend.id);
            setActivities(data);
        } catch (error) {
            console.error('Failed to load friend activity:', error);
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleToggleCloseFriend = async () => {
        const newStatus = !isCloseFriendStatus;
        setIsCloseFriendStatus(newStatus);
        try {
            await toggleCloseFriend(friend.id, newStatus);
        } catch (error) {
            console.error('Failed to toggle close friend:', error);
            setIsCloseFriendStatus(!newStatus);
        }
    };

    const handleRequestBorrow = async () => {
        if (selectedItems.length === 0) return;

        setBorrowLoading(true);
        try {
            const items = selectedItems.map(item => ({
                itemId: item.id,
                ownerId: friend.id
            }));

            const result = await requestToBorrowMultiple(items, borrowNotes || undefined);

            if (result.success) {
                // Mark items as requested
                const newRequestedIds = new Set(requestedItemIds);
                selectedItems.forEach(item => newRequestedIds.add(item.id));
                setRequestedItemIds(newRequestedIds);

                // Clear selection
                setSelectedItems([]);
                setSelectedIds(new Set());
                setBorrowNotes('');
                setShowBorrowModal(false);

                onShowToast?.(`${result.count} ${result.count === 1 ? 'prenda solicitada' : 'prendas solicitadas'}`, 'success');
            } else {
                onShowToast?.(result.error || 'Error al solicitar', 'error');
            }
        } catch (error) {
            console.error('Error requesting borrow:', error);
            onShowToast?.('Error inesperado', 'error');
        } finally {
            setBorrowLoading(false);
        }
    };

    const handleItemClick = (id: string) => {
        const item = friend.closet.find(i => i.id === id);
        if (!item) return;

        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);

        const newSelectedItems = friend.closet.filter(i => newSelectedIds.has(i.id));
        setSelectedItems(newSelectedItems);
    };

    const modifiedCloset = friend.closet.map(item => ({
        ...item,
        imageDataUrl: selectedIds.has(item.id)
            ? `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><foreignObject width="100%" height="100%"><img src="${item.imageDataUrl}" style="width:100%;height:100%;object-fit:cover;filter:brightness(0.5)"/></foreignObject><circle cx="50" cy="50" r="20" fill="white"/><path d="M45 55 L35 45 L40 40 L45 45 L60 30 L65 35 Z" fill="%230D9488"/></svg>`
            : item.imageDataUrl
    }));

    const stats = {
        outfits: activities.filter(a => a.activity_type === 'outfit_shared').length,
        items: friend.closet.length,
        followers: Math.floor(Math.random() * 500) + 50,
    };

    const styleMatch = 87;
    const badges = [
        { icon: 'eco', label: 'Sostenible' },
        { icon: 'checkroom', label: 'Sustentable' },
        { icon: 'star', label: 'Viste bien' },
    ];

    const hasSelection = selectedItems.length > 0;

    return (
        // Desktop: Right sidebar | Mobile: Bottom sheet
        <div className="fixed inset-0 z-40 flex items-end md:items-center md:justify-end">
            {/* Overlay - Click to close */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* 
        Panel Container
        Mobile: Bottom sheet (max-h-[90vh], slide up from bottom)
        Desktop: Right sidebar (full height, slide in from right, max-w-md)
      */}
            <div className="relative w-full h-[90vh] md:h-full md:w-auto md:max-w-md bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 rounded-t-3xl md:rounded-l-3xl md:rounded-r-none shadow-2xl flex flex-col overflow-hidden animate-slide-up md:animate-slide-left">

                {/* Header */}
                <div className="sticky top-0 z-20 backdrop-blur-2xl bg-white/90 dark:bg-gray-950/90 border-b border-gray-200/60 dark:border-gray-800/60 rounded-t-3xl md:rounded-tl-3xl md:rounded-tr-none">
                    {/* Mobile Handle */}
                    <div className="md:hidden flex justify-center pt-2 pb-1">
                        <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3">
                        <button onClick={onClose} className="group p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                        <div className="flex flex-col items-center -my-1">
                            <h1 className="text-sm font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                                {friend.name}
                            </h1>
                            {isCloseFriendStatus && (
                                <span className="text-xs text-yellow-600 dark:text-yellow-500 font-medium flex items-center gap-0.5">
                                    <span className="material-symbols-oriented text-xs">star</span>
                                    Close Friend
                                </span>
                            )}
                        </div>
                        <button onClick={handleToggleCloseFriend} className={`p-1.5 rounded-xl transition-all active:scale-90 ${isCloseFriendStatus ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                            <span className="material-symbols-outlined text-xl">{isCloseFriendStatus ? 'star' : 'star_border'}</span>
                        </button>
                    </div>

                    {/* Compact Profile */}
                    <div className="px-4 pb-3">
                        <div className="flex items-start gap-3 mb-2">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-full blur-sm opacity-75"></div>
                                <img src={friend.avatarUrl} alt={friend.name} className="relative w-16 h-16 rounded-full object-cover border-2 border-white dark:border-gray-950" />
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full"></div>
                            </div>

                            <div className="flex-1 pt-1">
                                <div className="flex gap-4 mb-2">
                                    <div className="text-center">
                                        <div className="font-bold text-base bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">{stats.outfits}</div>
                                        <div className="text-xs font-medium text-text-secondary uppercase">outfits</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-base bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">{stats.followers}</div>
                                        <div className="text-xs font-medium text-text-secondary uppercase">seguidores</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-base bg-gradient-to-br from-primary to-purple-600 bg-clip-text text-transparent">{stats.items}</div>
                                        <div className="text-xs font-medium text-text-secondary uppercase">prendas</div>
                                    </div>
                                </div>

                                <div className="flex gap-1.5">
                                    <button className={`flex-1 py-1.5 px-2 rounded-lg font-semibold text-xs transition-all active:scale-95 ${isFollowing ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gradient-to-r from-primary to-purple-600 text-white'}`} onClick={() => setIsFollowing(!isFollowing)}>
                                        {isFollowing ? 'Siguiendo' : 'Seguir'}
                                    </button>
                                    <button className="flex-1 py-1.5 px-2 rounded-lg font-semibold text-xs bg-gray-100 dark:bg-gray-800 transition-all active:scale-95">Mensaje</button>
                                    <button className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 transition-all active:scale-95">
                                        <span className="material-symbols-outlined text-base">more_horiz</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div>
                                <p className="text-xs font-semibold">@{friend.username}</p>
                                <p className="text-xs text-text-secondary leading-snug">✨ Fashion enthusiast · 👗 Sustainable style</p>
                            </div>

                            {/* Style Match */}
                            <button onClick={() => setShowStyleMatch(!showStyleMatch)} className="w-full liquid-glass rounded-xl p-2.5 hover:shadow-md transition-all active:scale-98">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-sm">auto_awesome</span>
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-sm bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">{styleMatch}% Match</div>
                                            <div className="text-xs text-text-secondary">Alta compatibilidad</div>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-sm text-text-secondary">{showStyleMatch ? 'expand_less' : 'expand_more'}</span>
                                </div>
                                {showStyleMatch && (
                                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-secondary">Colores</span>
                                            <span className="font-semibold text-primary">92%</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-text-secondary">Estilo</span>
                                            <span className="font-semibold text-primary">85%</span>
                                        </div>
                                    </div>
                                )}
                            </button>

                            {/* Badges */}
                            <div className="flex gap-1.5 flex-wrap">
                                {badges.map((badge, i) => (
                                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:shadow-sm transition-all">
                                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-white text-xs">{badge.icon}</span>
                                        </div>
                                        <span className="text-xs font-semibold text-text-secondary">{badge.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-800">
                        {[
                            { key: 'activity', icon: 'grid_on', label: 'Feed' },
                            { key: 'closet', icon: 'checkroom', label: 'Armario' },
                            { key: 'stats', icon: 'analytics', label: 'Stats' },
                        ].map((tab) => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key as Tab)} className={`flex-1 py-2.5 text-xs font-bold relative transition-all ${activeTab === tab.key ? 'text-primary' : 'text-text-secondary'}`}>
                                <span className="flex flex-col items-center gap-0.5">
                                    <span className="material-symbols-outlined text-base">{tab.icon}</span>
                                    {tab.label}
                                </span>
                                {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto">
                    {activeTab === 'activity' && (
                        <div className="p-3 space-y-3 pb-20">
                            {loadingActivities ? (
                                <div className="flex justify-center py-12"><Loader /></div>
                            ) : activities.length > 0 ? (
                                activities.map(activity => <ActivityCard key={activity.id} activity={activity} onLike={() => { }} onComment={() => { }} onShare={() => { }} />)
                            ) : (
                                <div className="text-center py-16">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl text-gray-400">photo_library</span>
                                    </div>
                                    <h3 className="font-bold text-base mb-1">Sin actividad</h3>
                                    <p className="text-xs text-text-secondary">Cuando {friend.name} comparta, aparecerá aquí</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'closet' && (
                        <div className="p-2 pb-24">
                            {selectedItems.length > 0 && (
                                <div className="m-2 liquid-glass rounded-xl p-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-white text-sm">shopping_bag</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-xs">{selectedItems.length} {selectedItems.length === 1 ? 'prenda' : 'prendas'}</p>
                                                <p className="text-xs text-text-secondary">Seleccionadas</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setSelectedItems([]); setSelectedIds(new Set()); }} className="text-xs font-semibold text-primary">Limpiar</button>
                                    </div>
                                </div>
                            )}
                            <ClosetGrid items={modifiedCloset} onItemClick={handleItemClick} viewMode="grid" />
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="p-3 space-y-3 pb-20">
                            <Card variant="glass" padding="sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-base">palette</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Style DNA</h3>
                                        <p className="text-xs text-text-secondary">Análisis de estilo</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Minimalista', value: 85, color: 'from-blue-500 to-cyan-500' },
                                        { label: 'Casual', value: 72, color: 'from-green-500 to-emerald-500' },
                                        { label: 'Elegante', value: 68, color: 'from-purple-500 to-pink-500' },
                                    ].map((style, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-medium text-text-secondary">{style.label}</span>
                                                <span className="font-bold text-primary">{style.value}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className={`h-full bg-gradient-to-r ${style.color} rounded-full`} style={{ width: `${style.value}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card variant="glass" padding="sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-base">color_lens</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Paleta</h3>
                                        <p className="text-xs text-text-secondary">Colores favoritos</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    {[
                                        { color: 'bg-black', name: 'Negro' },
                                        { color: 'bg-white border-2 border-gray-300', name: 'Blanco' },
                                        { color: 'bg-blue-600', name: 'Azul' },
                                        { color: 'bg-gray-500', name: 'Gris' },
                                    ].map((color, i) => (
                                        <div key={i} className="flex-1 text-center">
                                            <div className={`w-10 h-10 mx-auto rounded-xl ${color.color} mb-1`}></div>
                                            <p className="text-xs font-semibold">{color.name}</p>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card variant="glass" padding="sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-base">trending_up</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">Actividad</h3>
                                        <p className="text-xs text-text-secondary">Últimos 30 días</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Posts', value: activities.length, icon: 'photo_camera' },
                                        { label: 'Likes', value: activities.reduce((s, a) => s + (a.likes_count || 0), 0), icon: 'favorite' },
                                    ].map((metric, i) => (
                                        <div key={i} className="liquid-glass rounded-xl p-2 text-center">
                                            <span className="material-symbols-outlined text-primary text-lg">{metric.icon}</span>
                                            <div className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">{metric.value}</div>
                                            <div className="text-xs font-medium text-text-secondary uppercase">{metric.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {activeTab === 'closet' && (
                    <div className="absolute bottom-4 left-4 right-4 z-30 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setShowBorrowModal(true)}
                                disabled={!hasSelection}
                                className={`py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${hasSelection
                                    ? 'bg-white text-text-primary shadow-md active:scale-95'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-base">swap_horiz</span>
                                Pedir prestado
                            </button>
                            <button
                                onClick={() => onTryBorrowedItems(selectedItems)}
                                disabled={!hasSelection}
                                className={`py-3 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-1.5 ${hasSelection
                                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-xl shadow-primary/40 active:scale-95'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-base">auto_awesome</span>
                                Probar ahora
                            </button>
                        </div>
                        {!hasSelection && (
                            <p className="text-xs text-center text-text-secondary">Selecciona prendas para probar.</p>
                        )}
                    </div>
                )}

                {/* Borrow Request Modal */}
                {showBorrowModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-4 shadow-xl animate-scale-in">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white">swap_horiz</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-base">Solicitar préstamo</h3>
                                    <p className="text-xs text-gray-500">{selectedItems.length} {selectedItems.length === 1 ? 'prenda' : 'prendas'} de {friend.name}</p>
                                </div>
                            </div>

                            {/* Selected items preview */}
                            <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
                                {selectedItems.slice(0, 4).map(item => (
                                    <img
                                        key={item.id}
                                        src={item.imageDataUrl}
                                        alt=""
                                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                                    />
                                ))}
                                {selectedItems.length > 4 && (
                                    <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-bold text-gray-500">+{selectedItems.length - 4}</span>
                                    </div>
                                )}
                            </div>

                            {/* Notes input */}
                            <div className="mb-4">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">
                                    Mensaje (opcional)
                                </label>
                                <textarea
                                    value={borrowNotes}
                                    onChange={(e) => setBorrowNotes(e.target.value)}
                                    placeholder="Ej: Lo necesito para un evento el sábado..."
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                    rows={2}
                                    maxLength={200}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowBorrowModal(false);
                                        setBorrowNotes('');
                                    }}
                                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleRequestBorrow}
                                    disabled={borrowLoading}
                                    className="flex-1 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    {borrowLoading ? (
                                        <span className="animate-spin">⏳</span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined text-base">send</span>
                                            Enviar solicitud
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FriendProfileView;
