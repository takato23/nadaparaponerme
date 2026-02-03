import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import type { ClothingItem, ClothingItemMetadata } from '../types';
import Loader from './Loader';
import MetadataEditModal from './MetadataEditModal';
import { compressDataUrl, formatFileSize, type CompressionResult } from '../src/utils/imageCompression';
import { addClothingItem, getClothingItems } from '../src/services/closetService';

interface BulkUploadViewProps {
  onClose: () => void;
  onAddItemsLocal: (items: ClothingItem[]) => void;
  onClosetSync: (items: ClothingItem[]) => void;
  useSupabaseCloset: boolean;
}

interface UploadItem {
  id: string;
  file: File;
  imageDataUrl: string;
  originalDataUrl?: string; // Original uncompressed data URL
  compressionMetrics?: CompressionResult;
  status: 'pending' | 'analyzing' | 'success' | 'error';
  metadata?: ClothingItemMetadata;
  error?: string;
  progress?: number;
}

const MAX_FILES = 30;
const CONCURRENT_ANALYSIS = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BATCH_SIZE = 5; // Analyze 5 images per batch (optimal for Gemini)

export default function BulkUploadView({ onClose, onAddItemsLocal, onClosetSync, useSupabaseCloset }: BulkUploadViewProps) {
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingItem, setEditingItem] = useState<UploadItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Debug: Log cuando cambia uploadItems
  React.useEffect(() => {
    console.log('📸 Upload items changed:', uploadItems.length, uploadItems);
  }, [uploadItems]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Validate file count
    if (uploadItems.length + files.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} fotos por sesión`);
      return;
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file sizes and types
    const validFiles = files.filter(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} es demasiado grande (máx 10MB)`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} no es una imagen válida`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Convert files to data URLs and compress
    const fileReaderPromises = validFiles.map(file => {
      return new Promise<UploadItem>(async (resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const originalDataUrl = event.target?.result as string;
          if (originalDataUrl) {
            try {
              console.log(`📷 File read: ${file.name}, original size: ${formatFileSize(file.size)}`);

              // Compress image for AI analysis
              const compressionResult = await compressDataUrl(originalDataUrl, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.85,
              });

              console.log(`⚡ Compressed: ${formatFileSize(compressionResult.originalSize)} → ${formatFileSize(compressionResult.compressedSize)} (${compressionResult.compressionRatio}% reduction)`);
              console.log(`📐 Dimensions: ${compressionResult.dimensions.width}x${compressionResult.dimensions.height}`);
              console.log(`⏱️ Compression time: ${compressionResult.processingTime}ms`);

              resolve({
                id: `${Date.now()}-${Math.random()}`,
                file,
                imageDataUrl: compressionResult.compressedDataUrl, // Use compressed for AI
                originalDataUrl, // Keep original for display if needed
                compressionMetrics: compressionResult,
                status: 'pending',
              });
            } catch (error) {
              console.error(`❌ Compression failed for ${file.name}, using original:`, error);
              // Fallback to original if compression fails
              resolve({
                id: `${Date.now()}-${Math.random()}`,
                file,
                imageDataUrl: originalDataUrl,
                status: 'pending',
              });
            }
          } else {
            reject(new Error('Failed to read file'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
    });

    try {
      const newItems = await Promise.all(fileReaderPromises);
      setUploadItems(prev => {
        const updated = [...prev, ...newItems];
        console.log(`✅ Loaded ${newItems.length} images successfully. Total: ${updated.length}`);
        return updated;
      });

      // Limpiar el input para permitir reseleccionar el mismo archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error loading images:', error);
      toast.error('Error al cargar algunas imágenes');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const removeItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  const handleEditItem = (item: UploadItem) => {
    if (item.status === 'success' && item.metadata) {
      setEditingItem(item);
    }
  };

  const handleSaveMetadata = (updatedMetadata: ClothingItemMetadata) => {
    if (editingItem) {
      setUploadItems(prev => prev.map(i =>
        i.id === editingItem.id
          ? { ...i, metadata: updatedMetadata }
          : i
      ));
      setEditingItem(null);
    }
  };

  const startBulkAnalysis = async () => {
    setIsProcessing(true);

    const pendingItems = uploadItems.filter(item => item.status === 'pending');
    console.log(`🚀 Starting bulk analysis for ${pendingItems.length} items`);
    console.log(`📦 Using batch processing: ${BATCH_SIZE} images per batch`);

    // Import AI services
    const { analyzeBatchClothingItems, analyzeClothingItem } = await import('../src/services/aiService');

    // Split items into batches
    const batches: UploadItem[][] = [];
    for (let i = 0; i < pendingItems.length; i += BATCH_SIZE) {
      batches.push(pendingItems.slice(i, i + BATCH_SIZE));
    }

    console.log(`📦 Created ${batches.length} batches of max ${BATCH_SIZE} items each`);

    // Process each batch sequentially
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchIds = batch.map(item => item.id);

      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)...`);

      // Set all items in batch to analyzing
      setUploadItems(prev => prev.map(i =>
        batchIds.includes(i.id) ? { ...i, status: 'analyzing', progress: 0 } : i
      ));

      // Progress simulation for batch
      const progressInterval = setInterval(() => {
        setUploadItems(prev => prev.map(i => {
          if (batchIds.includes(i.id) && i.status === 'analyzing') {
            const newProgress = Math.min((i.progress || 0) + 10, 90);
            return { ...i, progress: newProgress };
          }
          return i;
        }));
      }, 500);

      try {
        // Try batch analysis first
        const imageDataUrls = batch.map(item => item.imageDataUrl);
        console.log(`🧠 Calling batch AI analysis for ${batch.length} images...`);

        const batchStartTime = performance.now();
        const metadataArray = await analyzeBatchClothingItems(imageDataUrls);
        const batchTime = performance.now() - batchStartTime;

        console.log(`✅ Batch analysis successful: ${batch.length} images in ${Math.round(batchTime)}ms (${Math.round(batchTime / batch.length)}ms per image)`);
        console.log(`💰 Cost savings: ~${Math.round(((batch.length - 1) / batch.length) * 100)}% vs individual calls`);

        clearInterval(progressInterval);

        // Update items with results
        setUploadItems(prev => prev.map(i => {
          const batchItemIndex = batchIds.indexOf(i.id);
          if (batchItemIndex !== -1 && metadataArray[batchItemIndex]) {
            return {
              ...i,
              status: 'success',
              metadata: metadataArray[batchItemIndex],
              progress: 100
            };
          }
          return i;
        }));

      } catch (batchError) {
        console.error(`❌ Batch analysis failed, falling back to individual analysis:`, batchError);
        clearInterval(progressInterval);

        // Fallback: analyze each item individually with retry
        for (const item of batch) {
          await analyzeItemIndividually(item, analyzeClothingItem);
        }
      }

      // Small delay between batches to avoid rate limits
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting 1s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🎉 Bulk analysis complete!`);
    setIsProcessing(false);
  };

  // Helper function for individual analysis with retry (fallback)
  const analyzeItemIndividually = async (item: UploadItem, analyzeClothingItem: any, retryCount = 0) => {
    const MAX_RETRIES = 3;

    try {
      console.log(`📝 Analyzing item individually: ${item.id} (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);

      // Update status to analyzing
      setUploadItems(prev => prev.map(i =>
        i.id === item.id ? { ...i, status: 'analyzing', progress: 0 } : i
      ));

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadItems(prev => prev.map(i => {
          if (i.id === item.id && i.status === 'analyzing') {
            const newProgress = Math.min((i.progress || 0) + 10, 90);
            return { ...i, progress: newProgress };
          }
          return i;
        }));
      }, 500);

      const metadata = await analyzeClothingItem(item.imageDataUrl);
      console.log(`✅ Individual analysis complete for item: ${item.id}`, metadata);

      clearInterval(progressInterval);

      // Update with success
      setUploadItems(prev => prev.map(i =>
        i.id === item.id
          ? { ...i, status: 'success', metadata, progress: 100 }
          : i
      ));
    } catch (error) {
      console.error(`❌ Error analyzing item ${item.id} (attempt ${retryCount + 1}):`, error);

      // Retry logic
      if (retryCount < MAX_RETRIES) {
        console.log(`🔄 Retrying item ${item.id} in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return analyzeItemIndividually(item, analyzeClothingItem, retryCount + 1);
      }

      // Max retries reached
      setUploadItems(prev => prev.map(i =>
        i.id === item.id
          ? { ...i, status: 'error', error: `Error después de ${MAX_RETRIES + 1} intentos`, progress: 0 }
          : i
      ));
    }
  };

  const handleSaveAll = async () => {
    const successItems = uploadItems.filter(item => item.status === 'success' && item.metadata);

    if (successItems.length === 0) {
      toast('No hay items procesados exitosamente', { icon: '⚠️' });
      return;
    }

    if (useSupabaseCloset) {
      setIsSaving(true);
      try {
        for (const item of successItems) {
          const source = item.originalDataUrl || item.imageDataUrl;
          const blob = await fetch(source).then(r => r.blob());
          const file = new File([blob], `${item.id}.jpg`, { type: blob.type || 'image/jpeg' });
          await addClothingItem(file, item.metadata!);
        }

        const updatedCloset = await getClothingItems();
        onClosetSync(updatedCloset);
        onClose();
      } catch (error) {
        console.error('Error saving items to Supabase:', error);
        toast.error('Error al guardar prendas. Intentá nuevamente.');
      } finally {
        setIsSaving(false);
      }

      return;
    }

    onAddItemsLocal(
      successItems.map(item => ({
        id: item.id,
        imageDataUrl: item.imageDataUrl,
        metadata: item.metadata!,
      }))
    );
    onClose();
  };

  const successCount = uploadItems.filter(i => i.status === 'success').length;
  const errorCount = uploadItems.filter(i => i.status === 'error').length;
  const pendingCount = uploadItems.filter(i => i.status === 'pending').length;
  const analyzingCount = uploadItems.filter(i => i.status === 'analyzing').length;
  const totalProcessed = successCount + errorCount;
  const totalItems = uploadItems.length;
  const progressPercentage = totalItems > 0 ? (totalProcessed / totalItems) * 100 : 0;

  // Calculate total compression savings
  const totalCompressionMetrics = uploadItems.reduce((acc, item) => {
    if (item.compressionMetrics) {
      acc.originalSize += item.compressionMetrics.originalSize;
      acc.compressedSize += item.compressionMetrics.compressedSize;
      acc.savedBytes += (item.compressionMetrics.originalSize - item.compressionMetrics.compressedSize);
    }
    return acc;
  }, { originalSize: 0, compressedSize: 0, savedBytes: 0 });

  const averageCompressionRatio = totalCompressionMetrics.originalSize > 0
    ? Math.round((totalCompressionMetrics.savedBytes / totalCompressionMetrics.originalSize) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="liquid-glass rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Carga Múltiple</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {uploadItems.length} de {MAX_FILES} fotos
              {successCount > 0 && ` • ${successCount} analizadas`}
              {errorCount > 0 && ` • ${errorCount} errores`}
              {averageCompressionRatio > 0 && (
                <span className="text-green-600 dark:text-green-400">
                  {' '}• ⚡ {averageCompressionRatio}% comprimido ({formatFileSize(totalCompressionMetrics.savedBytes)} ahorrados)
                </span>
              )}
            </p>

            {/* Global Progress Bar */}
            {isProcessing && totalItems > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Procesando {analyzingCount} fotos...</span>
                  <span>{totalProcessed} / {totalItems}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            disabled={isProcessing}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {uploadItems.length === 0 ? (
            <div
              className={`text-center py-12 border-2 border-dashed rounded-3xl transition-colors ${isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 dark:border-gray-700'
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-primary">
                  {isDragging ? 'download' : 'add_photo_alternate'}
                </span>
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {isDragging ? 'Suelta las fotos aquí' : 'Selecciona tus fotos'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {isDragging
                  ? `Hasta ${MAX_FILES} prendas a la vez`
                  : 'Arrastra fotos aquí o haz click para seleccionar'
                }
              </p>
              {!isDragging && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:scale-105 transition-transform"
                >
                  Seleccionar Fotos
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {uploadItems.map(item => {
                console.log('🖼️ Rendering item:', item.id, 'URL length:', item.imageDataUrl?.length);
                const isClickable = item.status === 'success' && item.metadata;
                return (
                  <div
                    key={item.id}
                    className={`relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''
                      }`}
                    onClick={() => isClickable && handleEditItem(item)}
                  >
                    {item.imageDataUrl ? (
                      <img
                        src={item.imageDataUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.error('❌ Image failed to load:', item.id);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => console.log('✅ Image loaded successfully:', item.id)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined text-4xl">broken_image</span>
                      </div>
                    )}

                    {/* Status Overlay - solo visible cuando hay estado activo */}
                    {item.status !== 'success' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        {item.status === 'pending' && (
                          <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                            <span className="text-white text-xs font-medium">Pendiente</span>
                          </div>
                        )}
                        {item.status === 'analyzing' && (
                          <div className="text-center">
                            <Loader size="small" />
                            <p className="text-white text-xs mt-2 font-bold">{item.progress}%</p>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="bg-red-500 rounded-full p-2">
                            <span className="material-symbols-outlined text-white">error</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Success Badge - esquina superior izquierda */}
                    {item.status === 'success' && (
                      <div className="absolute top-2 left-2 bg-green-500 rounded-full p-1.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-white text-sm">check</span>
                      </div>
                    )}

                    {/* Edit indicator - centro cuando hover */}
                    {item.status === 'success' && (
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                        <div className="bg-white/90 dark:bg-black/90 rounded-full px-4 py-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary">edit</span>
                          <span className="text-sm font-semibold">Editar</span>
                        </div>
                      </div>
                    )}

                    {/* Remove Button */}
                    {!isProcessing && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:scale-110 transition-transform"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}

                    {/* Metadata Preview */}
                    {item.status === 'success' && item.metadata && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-white text-xs font-medium truncate">
                          {item.metadata.subcategory}
                        </p>
                        <p className="text-white/70 text-xs truncate">
                          {item.metadata.color_primary}
                        </p>
                        {item.compressionMetrics && (
                          <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">compress</span>
                            {item.compressionMetrics.compressionRatio}% • {item.compressionMetrics.dimensions.width}×{item.compressionMetrics.dimensions.height}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add More Button */}
              {uploadItems.length < MAX_FILES && !isProcessing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-400 block mb-2">
                      add
                    </span>
                    <span className="text-sm text-gray-500">Agregar más</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {uploadItems.length > 0 && (
          <div className="border-t border-white/10 p-6 space-y-3">
            {pendingCount > 0 && !isProcessing && (
              <button
                onClick={startBulkAnalysis}
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                Analizar {pendingCount} {pendingCount === 1 ? 'Foto' : 'Fotos'}
              </button>
            )}

            {isProcessing && (
              <div className="text-center py-4">
                <Loader />
                <p className="text-sm text-gray-500 mt-2">
                  Analizando {uploadItems.filter(i => i.status === 'analyzing').length} fotos...
                </p>
              </div>
            )}

            {successCount > 0 && !isProcessing && (
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span className="material-symbols-outlined">save</span>
                {isSaving ? 'Guardando...' : `Guardar ${successCount} ${successCount === 1 ? 'Prenda' : 'Prendas'}`}
              </button>
            )}

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full bg-white/10 font-bold py-4 rounded-2xl hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Procesando...' : 'Cancelar'}
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Metadata Edit Modal */}
      {editingItem && editingItem.metadata && (
        <MetadataEditModal
          imageDataUrl={editingItem.originalDataUrl || editingItem.imageDataUrl} // Use original for display
          metadata={editingItem.metadata}
          onSave={handleSaveMetadata}
          onCancel={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}
