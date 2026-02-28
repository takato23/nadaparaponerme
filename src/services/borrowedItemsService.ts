/**
 * Borrowed Items Service
 *
 * Handles all borrow-related operations with Supabase:
 * - Request to borrow items from friends
 * - Approve/decline borrow requests
 * - Track active borrows and loans
 * - Mark items as returned
 * - Create activity notifications
 */

import { supabase } from '../lib/supabase';
import type {
  BorrowedItem,
  BorrowedItemInsert,
  BorrowedItemWithDetails,
  BorrowStatus,
  Profile,
  ClothingItem
} from '../types/api';

// ===== TYPES =====

export interface BorrowRequest {
  id: string;
  item: {
    id: string;
    name: string;
    image_url: string;
    category: string;
  };
  requester: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  notes: string | null;
  created_at: string;
}

export interface ActiveBorrow {
  id: string;
  item: {
    id: string;
    name: string;
    image_url: string;
    category: string;
  };
  owner: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  borrowed_at: string | null;
  expected_return_date: string | null;
  notes: string | null;
}

export interface ActiveLoan {
  id: string;
  item: {
    id: string;
    name: string;
    image_url: string;
    category: string;
  };
  borrower: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  borrowed_at: string | null;
  expected_return_date: string | null;
  notes: string | null;
}

export interface BorrowRequestSent {
  id: string;
  item: {
    id: string;
    name: string;
    image_url: string;
    category: string;
  };
  owner: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  status: BorrowStatus;
  notes: string | null;
  created_at: string;
}

export interface ItemBorrowStatus {
  status: BorrowStatus | null;
  requestId: string | null;
}

const ACTIVE_BORROW_STATUSES: BorrowStatus[] = ['requested', 'approved', 'borrowed'];

type BorrowMutationError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
};

function mapBorrowRequestError(error: BorrowMutationError | null | undefined): string {
  if (!error) return 'Error al solicitar préstamo';

  const raw = `${error.message || ''} ${error.details || ''}`.toLowerCase();

  if (
    error.code === '23505' ||
    raw.includes('borrow_item_already_active') ||
    raw.includes('idx_borrowed_items_single_active_per_item')
  ) {
    return 'Esta prenda ya tiene una solicitud o préstamo activo';
  }

  if (error.code === '23514' || raw.includes('borrow_owner_mismatch')) {
    return 'La prenda ya no está disponible para préstamo';
  }

  if (error.code === '23503' || raw.includes('borrow_item_not_found')) {
    return 'La prenda no está disponible';
  }

  return 'Error al solicitar préstamo';
}

// ===== REQUEST TO BORROW =====

/**
 * Request to borrow an item from a friend
 */
export async function requestToBorrow(
  itemId: string,
  ownerId: string,
  notes?: string,
  expectedReturnDate?: string
): Promise<{ success: boolean; error?: string; borrowId?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { data: itemOwner, error: itemOwnerError } = await supabase
      .from('clothing_items')
      .select('user_id')
      .eq('id', itemId)
      .maybeSingle();

    if (itemOwnerError) {
      console.error('Error validating borrow item owner:', itemOwnerError);
      return { success: false, error: 'No se pudo validar la prenda' };
    }

    if (!itemOwner) {
      return { success: false, error: 'La prenda no está disponible' };
    }

    if (itemOwner.user_id !== ownerId) {
      return { success: false, error: 'La prenda ya no pertenece a esta amiga' };
    }

    if (user.id === ownerId) {
      return { success: false, error: 'No puedes pedir prestado tu propia prenda' };
    }

    // Check if there's already an active request for this item
    const { data: existing, error: existingError } = await supabase
      .from('borrowed_items')
      .select('id, status')
      .eq('clothing_item_id', itemId)
      .eq('borrower_id', user.id)
      .in('status', ACTIVE_BORROW_STATUSES)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error('Error checking existing borrow request:', existingError);
      return { success: false, error: 'No se pudo validar el estado de la solicitud' };
    }

    if (existing) {
      if (existing.status === 'requested') {
        return { success: false, error: 'Ya solicitaste esta prenda' };
      }
      if (existing.status === 'approved' || existing.status === 'borrowed') {
        return { success: false, error: 'Ya tienes esta prenda prestada' };
      }
    }

    // Create borrow request
    const insertData: BorrowedItemInsert = {
      clothing_item_id: itemId,
      owner_id: ownerId,
      borrower_id: user.id,
      status: 'requested',
      notes: notes || null,
      expected_return_date: expectedReturnDate || null
    };

    const { data: borrowData, error } = await supabase
      .from('borrowed_items')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Error creating borrow request:', error);
      return { success: false, error: mapBorrowRequestError(error) };
    }

    // Create activity notification for owner
    await createBorrowActivity(
      'borrow_request',
      ownerId,
      user.id,
      borrowData.id,
      { item_id: itemId, notes }
    );

    return { success: true, borrowId: borrowData.id };
  } catch (error) {
    console.error('Error in requestToBorrow:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Request to borrow multiple items at once
 */
export async function requestToBorrowMultiple(
  items: Array<{ itemId: string; ownerId: string }>,
  notes?: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const { itemId, ownerId } of items) {
      const result = await requestToBorrow(itemId, ownerId, notes);
      if (result.success) {
        successCount++;
      } else if (result.error) {
        errors.push(result.error);
      }
    }

    if (successCount === 0) {
      return { success: false, error: errors[0] || 'No se pudo solicitar ninguna prenda' };
    }

    return { success: true, count: successCount };
  } catch (error) {
    console.error('Error in requestToBorrowMultiple:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

// ===== APPROVE / DECLINE =====

/**
 * Approve a borrow request
 */
export async function approveBorrowRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verify ownership and get request details
    const { data: request, error: fetchError } = await supabase
      .from('borrowed_items')
      .select('id, owner_id, borrower_id, clothing_item_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (request.owner_id !== user.id) {
      return { success: false, error: 'Solo el dueño puede aprobar' };
    }

    if (request.status !== 'requested') {
      return { success: false, error: 'Esta solicitud ya fue procesada' };
    }

    // Update status to approved
    const { error } = await supabase
      .from('borrowed_items')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error approving borrow request:', error);
      return { success: false, error: 'Error al aprobar solicitud' };
    }

    // Create activity notification for borrower
    await createBorrowActivity(
      'borrow_approved',
      request.borrower_id,
      user.id,
      requestId,
      { item_id: request.clothing_item_id }
    );

    return { success: true };
  } catch (error) {
    console.error('Error in approveBorrowRequest:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Decline a borrow request
 */
export async function declineBorrowRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Verify ownership
    const { data: request, error: fetchError } = await supabase
      .from('borrowed_items')
      .select('id, owner_id, borrower_id, clothing_item_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    if (request.owner_id !== user.id) {
      return { success: false, error: 'Solo el dueño puede rechazar' };
    }

    if (request.status !== 'requested') {
      return { success: false, error: 'Esta solicitud ya fue procesada' };
    }

    // Update status to declined
    const { error } = await supabase
      .from('borrowed_items')
      .update({
        status: 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error declining borrow request:', error);
      return { success: false, error: 'Error al rechazar solicitud' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in declineBorrowRequest:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

// ===== MARK AS BORROWED / RETURNED =====

/**
 * Mark an approved item as physically borrowed (picked up)
 */
export async function markAsBorrowed(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { data: request } = await supabase
      .from('borrowed_items')
      .select('id, owner_id, borrower_id, status')
      .eq('id', requestId)
      .single();

    if (!request) {
      return { success: false, error: 'Solicitud no encontrada' };
    }

    // Either owner or borrower can mark as borrowed
    if (request.owner_id !== user.id && request.borrower_id !== user.id) {
      return { success: false, error: 'No tienes permiso' };
    }

    if (request.status !== 'approved') {
      return { success: false, error: 'Solo se pueden marcar items aprobados' };
    }

    const { error } = await supabase
      .from('borrowed_items')
      .update({
        status: 'borrowed',
        borrowed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error marking as borrowed:', error);
      return { success: false, error: 'Error al marcar como prestado' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in markAsBorrowed:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

/**
 * Mark a borrowed item as returned
 */
export async function markAsReturned(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { data: request } = await supabase
      .from('borrowed_items')
      .select('id, owner_id, borrower_id, status')
      .eq('id', requestId)
      .single();

    if (!request) {
      return { success: false, error: 'Préstamo no encontrado' };
    }

    // Either owner or borrower can mark as returned
    if (request.owner_id !== user.id && request.borrower_id !== user.id) {
      return { success: false, error: 'No tienes permiso' };
    }

    if (request.status !== 'borrowed' && request.status !== 'approved') {
      return { success: false, error: 'Este item no está prestado actualmente' };
    }

    const { error } = await supabase
      .from('borrowed_items')
      .update({
        status: 'returned',
        returned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error marking as returned:', error);
      return { success: false, error: 'Error al marcar como devuelto' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in markAsReturned:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

// ===== CANCEL REQUEST =====

/**
 * Cancel a pending borrow request (by borrower)
 */
export async function cancelBorrowRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    const { data, error } = await supabase
      .from('borrowed_items')
      .delete()
      .eq('id', requestId)
      .eq('borrower_id', user.id)
      .eq('status', 'requested')
      .select('id');

    if (error) {
      console.error('Error canceling borrow request:', error);
      return { success: false, error: 'Error al cancelar solicitud' };
    }

    if (!data || data.length === 0) {
      return { success: false, error: 'Solo puedes cancelar tus solicitudes pendientes' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in cancelBorrowRequest:', error);
    return { success: false, error: 'Error inesperado' };
  }
}

// ===== LISTING FUNCTIONS =====

/**
 * Get incoming borrow requests (requests from others for my items)
 */
export async function getIncomingBorrowRequests(): Promise<BorrowRequest[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: requests, error } = await supabase
      .from('borrowed_items')
      .select(`
        id,
        clothing_item_id,
        borrower_id,
        notes,
        created_at
      `)
      .eq('owner_id', user.id)
      .eq('status', 'requested')
      .order('created_at', { ascending: false });

    if (error || !requests || requests.length === 0) return [];

    // Get item details
    const itemIds = [...new Set(requests.map(r => r.clothing_item_id))];
    const { data: items } = await supabase
      .from('clothing_items')
      .select('id, name, image_url, category')
      .in('id', itemIds);

    // Get requester profiles
    const borrowerIds = [...new Set(requests.map(r => r.borrower_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', borrowerIds);

    return requests.map(r => ({
      id: r.id,
      item: items?.find(i => i.id === r.clothing_item_id) || {
        id: r.clothing_item_id,
        name: 'Item',
        image_url: '',
        category: 'top'
      },
      requester: profiles?.find(p => p.id === r.borrower_id) || {
        id: r.borrower_id,
        username: 'Usuario',
        display_name: null,
        avatar_url: null
      },
      notes: r.notes,
      created_at: r.created_at
    }));
  } catch (error) {
    console.error('Error in getIncomingBorrowRequests:', error);
    return [];
  }
}

/**
 * Get my sent borrow requests
 */
export async function getMyBorrowRequests(): Promise<BorrowRequestSent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: requests, error } = await supabase
      .from('borrowed_items')
      .select(`
        id,
        clothing_item_id,
        owner_id,
        status,
        notes,
        created_at
      `)
      .eq('borrower_id', user.id)
      .in('status', ['requested', 'approved', 'declined'])
      .order('created_at', { ascending: false });

    if (error || !requests || requests.length === 0) return [];

    // Get item details
    const itemIds = [...new Set(requests.map(r => r.clothing_item_id))];
    const { data: items } = await supabase
      .from('clothing_items')
      .select('id, name, image_url, category')
      .in('id', itemIds);

    // Get owner profiles
    const ownerIds = [...new Set(requests.map(r => r.owner_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ownerIds);

    return requests.map(r => ({
      id: r.id,
      item: items?.find(i => i.id === r.clothing_item_id) || {
        id: r.clothing_item_id,
        name: 'Item',
        image_url: '',
        category: 'top'
      },
      owner: profiles?.find(p => p.id === r.owner_id) || {
        id: r.owner_id,
        username: 'Usuario',
        display_name: null,
        avatar_url: null
      },
      status: r.status,
      notes: r.notes,
      created_at: r.created_at
    }));
  } catch (error) {
    console.error('Error in getMyBorrowRequests:', error);
    return [];
  }
}

/**
 * Get items I currently have borrowed (approved or borrowed status)
 */
export async function getActiveBorrows(): Promise<ActiveBorrow[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: borrows, error } = await supabase
      .from('borrowed_items')
      .select(`
        id,
        clothing_item_id,
        owner_id,
        borrowed_at,
        expected_return_date,
        notes
      `)
      .eq('borrower_id', user.id)
      .in('status', ['approved', 'borrowed'])
      .order('borrowed_at', { ascending: false });

    if (error || !borrows || borrows.length === 0) return [];

    // Get item details
    const itemIds = [...new Set(borrows.map(r => r.clothing_item_id))];
    const { data: items } = await supabase
      .from('clothing_items')
      .select('id, name, image_url, category')
      .in('id', itemIds);

    // Get owner profiles
    const ownerIds = [...new Set(borrows.map(r => r.owner_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ownerIds);

    return borrows.map(b => ({
      id: b.id,
      item: items?.find(i => i.id === b.clothing_item_id) || {
        id: b.clothing_item_id,
        name: 'Item',
        image_url: '',
        category: 'top'
      },
      owner: profiles?.find(p => p.id === b.owner_id) || {
        id: b.owner_id,
        username: 'Usuario',
        display_name: null,
        avatar_url: null
      },
      borrowed_at: b.borrowed_at,
      expected_return_date: b.expected_return_date,
      notes: b.notes
    }));
  } catch (error) {
    console.error('Error in getActiveBorrows:', error);
    return [];
  }
}

/**
 * Get items I've loaned to others (my items currently borrowed by others)
 */
export async function getActiveLoans(): Promise<ActiveLoan[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: loans, error } = await supabase
      .from('borrowed_items')
      .select(`
        id,
        clothing_item_id,
        borrower_id,
        borrowed_at,
        expected_return_date,
        notes
      `)
      .eq('owner_id', user.id)
      .in('status', ['approved', 'borrowed'])
      .order('borrowed_at', { ascending: false });

    if (error || !loans || loans.length === 0) return [];

    // Get item details
    const itemIds = [...new Set(loans.map(r => r.clothing_item_id))];
    const { data: items } = await supabase
      .from('clothing_items')
      .select('id, name, image_url, category')
      .in('id', itemIds);

    // Get borrower profiles
    const borrowerIds = [...new Set(loans.map(r => r.borrower_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', borrowerIds);

    return loans.map(l => ({
      id: l.id,
      item: items?.find(i => i.id === l.clothing_item_id) || {
        id: l.clothing_item_id,
        name: 'Item',
        image_url: '',
        category: 'top'
      },
      borrower: profiles?.find(p => p.id === l.borrower_id) || {
        id: l.borrower_id,
        username: 'Usuario',
        display_name: null,
        avatar_url: null
      },
      borrowed_at: l.borrowed_at,
      expected_return_date: l.expected_return_date,
      notes: l.notes
    }));
  } catch (error) {
    console.error('Error in getActiveLoans:', error);
    return [];
  }
}

/**
 * Get borrow history (all returned items)
 */
export async function getBorrowHistory(limit: number = 20): Promise<BorrowedItemWithDetails[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: history, error } = await supabase
      .from('borrowed_items')
      .select('*')
      .or(`owner_id.eq.${user.id},borrower_id.eq.${user.id}`)
      .eq('status', 'returned')
      .order('returned_at', { ascending: false })
      .limit(limit);

    if (error || !history) return [];

    return history;
  } catch (error) {
    console.error('Error in getBorrowHistory:', error);
    return [];
  }
}

// ===== COUNTS =====

/**
 * Get count of pending requests (for badges)
 */
export async function getPendingRequestsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('borrowed_items')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'requested');

    if (error) return 0;
    return count || 0;
  } catch (error) {
    console.error('Error in getPendingRequestsCount:', error);
    return 0;
  }
}

/**
 * Get count of active borrows (items I have)
 */
export async function getActiveBorrowsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('borrowed_items')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_id', user.id)
      .in('status', ['approved', 'borrowed']);

    if (error) return 0;
    return count || 0;
  } catch (error) {
    console.error('Error in getActiveBorrowsCount:', error);
    return 0;
  }
}

/**
 * Check if an item is already requested or borrowed by current user
 */
export async function getItemBorrowStatus(
  itemId: string
): Promise<{ status: BorrowStatus | null; requestId: string | null }> {
  const statuses = await getBorrowStatusesForItems([itemId]);
  return statuses[itemId] || { status: null, requestId: null };
}

/**
 * Get borrow status for multiple items in one round-trip
 */
export async function getBorrowStatusesForItems(
  itemIds: string[]
): Promise<Record<string, ItemBorrowStatus>> {
  const uniqueItemIds = [...new Set(itemIds.filter(Boolean))];
  const emptyResult = uniqueItemIds.reduce<Record<string, ItemBorrowStatus>>((acc, id) => {
    acc[id] = { status: null, requestId: null };
    return acc;
  }, {});

  if (uniqueItemIds.length === 0) {
    return {};
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return emptyResult;

    const { data, error } = await supabase
      .from('borrowed_items')
      .select('id, clothing_item_id, status, created_at')
      .eq('borrower_id', user.id)
      .in('clothing_item_id', uniqueItemIds)
      .in('status', ACTIVE_BORROW_STATUSES)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching borrow statuses for items:', error);
      return emptyResult;
    }

    const result = { ...emptyResult };

    for (const borrow of data || []) {
      if (!result[borrow.clothing_item_id]) {
        result[borrow.clothing_item_id] = { status: null, requestId: null };
      }

      if (!result[borrow.clothing_item_id].status) {
        result[borrow.clothing_item_id] = {
          status: borrow.status as BorrowStatus,
          requestId: borrow.id
        };
      }
    }

    return result;
  } catch (error) {
    console.error('Error in getBorrowStatusesForItems:', error);
    return emptyResult;
  }
}

// ===== ACTIVITY NOTIFICATIONS =====

/**
 * Create an activity feed entry for borrow events
 */
async function createBorrowActivity(
  activityType: 'borrow_request' | 'borrow_approved',
  userId: string,
  actorId: string,
  targetId: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase
      .from('activity_feed')
      .insert({
        user_id: userId,
        actor_id: actorId,
        activity_type: activityType,
        target_type: 'borrowed_item',
        target_id: targetId,
        metadata: metadata || {},
        is_read: false
      });
  } catch (error) {
    console.error('Error creating borrow activity:', error);
  }
}
