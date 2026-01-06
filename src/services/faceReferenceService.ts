// Face Reference Service for Virtual Try-On Identity Preservation
// Manages user's face reference photos for Nano Banana Pro

import { supabase, compressImage } from '../lib/supabase';

// Helper to get current user
async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export interface FaceReference {
    id: string;
    user_id: string;
    image_url: string;
    label: string;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

const BUCKET_NAME = 'face-references';
const MAX_REFERENCES = 3;

/**
 * Get all face references for the current user
 */
export async function getFaceReferences(): Promise<FaceReference[]> {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('face_references')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching face references:', error);
        return [];
    }

    return data || [];
}

/**
 * Get the primary face reference for the current user
 */
export async function getPrimaryFaceReference(): Promise<FaceReference | null> {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('face_references')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

    if (error) {
        // If no primary, get the most recent one
        const { data: recent } = await supabase
            .from('face_references')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        return recent || null;
    }

    return data;
}

/**
 * Upload a new face reference photo
 */
export async function uploadFaceReference(
    imageFile: File | Blob,
    label: string = 'Principal',
    isPrimary: boolean = false
): Promise<FaceReference | null> {
    const user = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Check limit
    const existing = await getFaceReferences();
    if (existing.length >= MAX_REFERENCES) {
        throw new Error(`Máximo ${MAX_REFERENCES} fotos de referencia permitidas`);
    }

    // Compress image (compressImage takes: file, maxWidth, quality)
    const fileToCompress = imageFile instanceof File
        ? imageFile
        : new File([imageFile], 'face.jpg', { type: 'image/jpeg' });
    const compressedFile = await compressImage(fileToCompress, 1024, 0.85);

    // Generate unique filename
    const filename = `${user.id}/${Date.now()}_face.jpg`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, compressedFile, {
            contentType: 'image/jpeg',
            upsert: false
        });

    if (uploadError) {
        console.error('Error uploading face reference:', uploadError);
        throw new Error('Error al subir la imagen');
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filename);

    // If this is the first reference, make it primary
    const shouldBePrimary = isPrimary || existing.length === 0;

    // Insert record
    const { data, error } = await supabase
        .from('face_references')
        .insert({
            user_id: user.id,
            image_url: urlData.publicUrl,
            label,
            is_primary: shouldBePrimary
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating face reference record:', error);
        // Try to clean up uploaded file
        await supabase.storage.from(BUCKET_NAME).remove([filename]);
        throw new Error('Error al guardar la referencia');
    }

    return data;
}

/**
 * Delete a face reference
 */
export async function deleteFaceReference(id: string): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;

    // Get the reference to find the file path
    const { data: ref } = await supabase
        .from('face_references')
        .select('image_url')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (!ref) return false;

    // Delete from database
    const { error } = await supabase
        .from('face_references')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('Error deleting face reference:', error);
        return false;
    }

    // Try to delete from storage (extract path from URL)
    try {
        const url = new URL(ref.image_url);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(-2).join('/'); // user_id/filename
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
    } catch (e) {
        console.warn('Could not delete file from storage:', e);
    }

    return true;
}

/**
 * Set a face reference as primary
 */
export async function setPrimaryFaceReference(id: string): Promise<boolean> {
    const user = await getCurrentUser();
    if (!user) return false;

    const { error } = await supabase
        .from('face_references')
        .update({ is_primary: true })
        .eq('id', id)
        .eq('user_id', user.id);

    return !error;
}

/**
 * Get face reference image URLs for virtual try-on
 * Returns array of image URLs to use as identity anchors
 */
export async function getFaceReferenceUrls(): Promise<string[]> {
    const references = await getFaceReferences();

    // Return primary first, then others
    const sorted = references.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return 0;
    });

    return sorted.map(ref => ref.image_url);
}
