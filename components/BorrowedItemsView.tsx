/**
 * BorrowedItemsView
 *
 * Complete borrow management interface with 4 tabs:
 * 1. Mis Préstamos - Items I have borrowed
 * 2. Solicitudes - Incoming requests for my items
 * 3. Enviadas - Requests I've sent
 * 4. Prestados - My items currently lent to others
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getActiveBorrows,
  getIncomingBorrowRequests,
  getMyBorrowRequests,
  getActiveLoans,
  approveBorrowRequest,
  declineBorrowRequest,
  markAsReturned,
  markAsBorrowed,
  cancelBorrowRequest,
  getPendingRequestsCount,
  type ActiveBorrow,
  type ActiveLoan,
  type BorrowRequest,
  type BorrowRequestSent
} from '../src/services/borrowedItemsService';
import { formatRelativeTime } from '../src/services/activityFeedService';

interface BorrowedItemsViewProps {
  onClose: () => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

type TabType = 'borrowed' | 'requests' | 'sent' | 'loaned';

export default function BorrowedItemsView({ onClose, onShowToast }: BorrowedItemsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('borrowed');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Data states
  const [activeBorrows, setActiveBorrows] = useState<ActiveBorrow[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<BorrowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<BorrowRequestSent[]>([]);
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [borrows, incoming, sent, loans, count] = await Promise.all([
        getActiveBorrows(),
        getIncomingBorrowRequests(),
        getMyBorrowRequests(),
        getActiveLoans(),
        getPendingRequestsCount()
      ]);

      setActiveBorrows(borrows);
      setIncomingRequests(incoming);
      setSentRequests(sent);
      setActiveLoans(loans);
      setPendingCount(count);
    } catch (error) {
      console.error('Error fetching borrow data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Action handlers
  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    const result = await approveBorrowRequest(requestId);
    if (result.success) {
      onShowToast?.('Solicitud aprobada', 'success');
      fetchData();
    } else {
      onShowToast?.(result.error || 'Error al aprobar', 'error');
    }
    setActionLoading(null);
  };

  const handleDecline = async (requestId: string) => {
    setActionLoading(requestId);
    const result = await declineBorrowRequest(requestId);
    if (result.success) {
      onShowToast?.('Solicitud rechazada', 'success');
      fetchData();
    } else {
      onShowToast?.(result.error || 'Error al rechazar', 'error');
    }
    setActionLoading(null);
  };

  const handleReturn = async (borrowId: string) => {
    setActionLoading(borrowId);
    const result = await markAsReturned(borrowId);
    if (result.success) {
      onShowToast?.('Marcado como devuelto', 'success');
      fetchData();
    } else {
      onShowToast?.(result.error || 'Error al marcar', 'error');
    }
    setActionLoading(null);
  };

  const handleMarkBorrowed = async (borrowId: string) => {
    setActionLoading(borrowId);
    const result = await markAsBorrowed(borrowId);
    if (result.success) {
      onShowToast?.('Marcado como recibido', 'success');
      fetchData();
    } else {
      onShowToast?.(result.error || 'Error al marcar', 'error');
    }
    setActionLoading(null);
  };

  const handleCancel = async (requestId: string) => {
    setActionLoading(requestId);
    const result = await cancelBorrowRequest(requestId);
    if (result.success) {
      onShowToast?.('Solicitud cancelada', 'success');
      fetchData();
    } else {
      onShowToast?.(result.error || 'Error al cancelar', 'error');
    }
    setActionLoading(null);
  };

  const tabs: { id: TabType; label: string; count: number; icon: string }[] = [
    { id: 'borrowed', label: 'Prestados', count: activeBorrows.length, icon: 'shopping_bag' },
    { id: 'requests', label: 'Solicitudes', count: pendingCount, icon: 'inbox' },
    { id: 'sent', label: 'Enviadas', count: sentRequests.filter(r => r.status === 'requested').length, icon: 'outbox' },
    { id: 'loaned', label: 'Mis items', count: activeLoans.length, icon: 'volunteer_activism' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full md:max-w-2xl md:rounded-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-rounded text-gray-600 dark:text-gray-300">arrow_back</span>
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Préstamos
            </h2>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className={`material-symbols-rounded text-gray-600 dark:text-gray-300 ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[80px] px-3 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.id
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="material-symbols-rounded text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id
                      ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {tab.count}
                  </span>
                )}
              </div>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Tab: Mis Préstamos (items I have) */}
              {activeTab === 'borrowed' && (
                <div className="space-y-3">
                  {activeBorrows.length === 0 ? (
                    <EmptyState
                      icon="shopping_bag"
                      title="No tenés prendas prestadas"
                      description="Pedí prestado a tus amigas para probar nuevos looks"
                    />
                  ) : (
                    activeBorrows.map(borrow => (
                      <BorrowCard
                        key={borrow.id}
                        imageUrl={borrow.item.image_url}
                        title={borrow.item.name}
                        subtitle={`De ${borrow.owner.display_name || borrow.owner.username}`}
                        avatarUrl={borrow.owner.avatar_url}
                        date={borrow.borrowed_at}
                        returnDate={borrow.expected_return_date}
                        actions={
                          <button
                            onClick={() => handleReturn(borrow.id)}
                            disabled={actionLoading === borrow.id}
                            className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === borrow.id ? 'Procesando...' : 'Devolver'}
                          </button>
                        }
                      />
                    ))
                  )}
                </div>
              )}

              {/* Tab: Solicitudes Recibidas */}
              {activeTab === 'requests' && (
                <div className="space-y-3">
                  {incomingRequests.length === 0 ? (
                    <EmptyState
                      icon="inbox"
                      title="No hay solicitudes pendientes"
                      description="Cuando alguien quiera prestarse algo tuyo, aparecerá acá"
                    />
                  ) : (
                    incomingRequests.map(request => (
                      <BorrowCard
                        key={request.id}
                        imageUrl={request.item.image_url}
                        title={request.item.name}
                        subtitle={`${request.requester.display_name || request.requester.username} quiere esta prenda`}
                        avatarUrl={request.requester.avatar_url}
                        date={request.created_at}
                        notes={request.notes}
                        actions={
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDecline(request.id)}
                              disabled={actionLoading === request.id}
                              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              Rechazar
                            </button>
                            <button
                              onClick={() => handleApprove(request.id)}
                              disabled={actionLoading === request.id}
                              className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === request.id ? '...' : 'Aprobar'}
                            </button>
                          </div>
                        }
                      />
                    ))
                  )}
                </div>
              )}

              {/* Tab: Solicitudes Enviadas */}
              {activeTab === 'sent' && (
                <div className="space-y-3">
                  {sentRequests.length === 0 ? (
                    <EmptyState
                      icon="outbox"
                      title="No enviaste solicitudes"
                      description="Explorá el armario de tus amigas y pedí lo que te guste"
                    />
                  ) : (
                    sentRequests.map(request => (
                      <BorrowCard
                        key={request.id}
                        imageUrl={request.item.image_url}
                        title={request.item.name}
                        subtitle={`De ${request.owner.display_name || request.owner.username}`}
                        avatarUrl={request.owner.avatar_url}
                        date={request.created_at}
                        status={request.status}
                        actions={
                          request.status === 'requested' ? (
                            <button
                              onClick={() => handleCancel(request.id)}
                              disabled={actionLoading === request.id}
                              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                          ) : request.status === 'approved' ? (
                            <button
                              onClick={() => handleMarkBorrowed(request.id)}
                              disabled={actionLoading === request.id}
                              className="px-3 py-1.5 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                            >
                              Ya lo tengo
                            </button>
                          ) : null
                        }
                      />
                    ))
                  )}
                </div>
              )}

              {/* Tab: Items que presté */}
              {activeTab === 'loaned' && (
                <div className="space-y-3">
                  {activeLoans.length === 0 ? (
                    <EmptyState
                      icon="volunteer_activism"
                      title="No prestaste nada"
                      description="Tus prendas prestadas a amigas aparecerán acá"
                    />
                  ) : (
                    activeLoans.map(loan => (
                      <BorrowCard
                        key={loan.id}
                        imageUrl={loan.item.image_url}
                        title={loan.item.name}
                        subtitle={`Lo tiene ${loan.borrower.display_name || loan.borrower.username}`}
                        avatarUrl={loan.borrower.avatar_url}
                        date={loan.borrowed_at}
                        returnDate={loan.expected_return_date}
                        actions={
                          <button
                            onClick={() => handleReturn(loan.id)}
                            disabled={actionLoading === loan.id}
                            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                          >
                            Me lo devolvió
                          </button>
                        }
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====

interface BorrowCardProps {
  imageUrl: string;
  title: string;
  subtitle: string;
  avatarUrl: string | null;
  date: string | null;
  returnDate?: string | null;
  notes?: string | null;
  status?: string;
  actions?: React.ReactNode;
}

function BorrowCard({
  imageUrl,
  title,
  subtitle,
  avatarUrl,
  date,
  returnDate,
  notes,
  status,
  actions
}: BorrowCardProps) {
  const statusLabels: Record<string, { label: string; color: string }> = {
    requested: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
    approved: { label: 'Aprobado', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    declined: { label: 'Rechazado', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    borrowed: { label: 'En préstamo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    returned: { label: 'Devuelto', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  };

  return (
    <div className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
      {/* Item image */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-rounded text-gray-400">checkroom</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-white truncate">{title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {avatarUrl && (
                <img src={avatarUrl} alt="" className="w-4 h-4 rounded-full" />
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</span>
            </div>
          </div>
          {status && statusLabels[status] && (
            <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${statusLabels[status].color}`}>
              {statusLabels[status].label}
            </span>
          )}
        </div>

        {/* Notes */}
        {notes && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic truncate">
            "{notes}"
          </p>
        )}

        {/* Date info */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
          {date && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-rounded text-sm">schedule</span>
              {formatRelativeTime(date)}
            </span>
          )}
          {returnDate && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-rounded text-sm">event</span>
              Devolver: {new Date(returnDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="mt-2 flex justify-end">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <span className="material-symbols-rounded text-3xl text-gray-400">{icon}</span>
      </div>
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">{description}</p>
    </div>
  );
}
