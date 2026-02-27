import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { ChangeEvent, Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ClothingItem, ClothingSlot, SlotSelection } from '../../../types';

interface UseQuickTryOnParams {
  setSlotSelections: Dispatch<SetStateAction<Map<ClothingSlot, SlotSelection>>>;
}

interface UseQuickTryOnResult {
  quickItems: ClothingItem[];
  isUploadingQuickItem: boolean;
  showQuickItemCategoryPicker: string | null;
  setShowQuickItemCategoryPicker: Dispatch<SetStateAction<string | null>>;
  quickItemInputRef: MutableRefObject<HTMLInputElement | null>;
  backItemInputRef: MutableRefObject<HTMLInputElement | null>;
  uploadingBackForItemId: string | null;
  setUploadingBackForItemId: Dispatch<SetStateAction<string | null>>;
  handleQuickItemUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleBackItemUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  confirmQuickItemCategory: (tempId: string, category: string) => void;
  removeQuickItem: (itemId: string) => void;
}

export function useQuickTryOn({ setSlotSelections }: UseQuickTryOnParams): UseQuickTryOnResult {
  const [quickItems, setQuickItems] = useState<ClothingItem[]>([]);
  const [isUploadingQuickItem, setIsUploadingQuickItem] = useState(false);
  const [showQuickItemCategoryPicker, setShowQuickItemCategoryPicker] = useState<string | null>(null);
  const [uploadingBackForItemId, setUploadingBackForItemId] = useState<string | null>(null);

  const quickItemInputRef = useRef<HTMLInputElement>(null);
  const backItemInputRef = useRef<HTMLInputElement>(null);

  const handleQuickItemUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingQuickItem(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });

      const tempId = `quick_${Date.now()}`;
      setShowQuickItemCategoryPicker(tempId);
      sessionStorage.setItem(`quick-item-${tempId}`, dataUrl);
    } catch {
      toast.error('Error al cargar la imagen');
    } finally {
      setIsUploadingQuickItem(false);
      if (quickItemInputRef.current) {
        quickItemInputRef.current.value = '';
      }
    }
  }, []);

  const handleBackItemUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !uploadingBackForItemId) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string;

        setQuickItems((prev) =>
          prev.map((item) => {
            if (item.id === uploadingBackForItemId) {
              return { ...item, backImageDataUrl: result };
            }
            return item;
          }),
        );

        toast.success('Vista trasera agregada');
        setUploadingBackForItemId(null);

        if (backItemInputRef.current) {
          backItemInputRef.current.value = '';
        }
      };

      reader.readAsDataURL(file);
    },
    [uploadingBackForItemId],
  );

  const confirmQuickItemCategory = useCallback((tempId: string, category: string) => {
    const dataUrl = sessionStorage.getItem(`quick-item-${tempId}`);
    if (!dataUrl) return;

    const newQuickItem: ClothingItem = {
      id: tempId,
      imageDataUrl: dataUrl,
      status: 'quick' as any,
      metadata: {
        category: category as any,
        subcategory: 'Prenda de internet',
        color_primary: 'desconocido',
        vibe_tags: ['quick-try-on'],
        seasons: ['all'],
      },
    };

    setQuickItems((prev) => [newQuickItem, ...prev]);
    setShowQuickItemCategoryPicker(null);
    sessionStorage.removeItem(`quick-item-${tempId}`);
    toast.success('Prenda agregada para probar', { icon: '✨' });
  }, []);

  const removeQuickItem = useCallback(
    (itemId: string) => {
      setQuickItems((prev) => prev.filter((item) => item.id !== itemId));
      setSlotSelections((prev) => {
        const next = new Map(prev);
        for (const [slot, selection] of next) {
          if (selection.itemId === itemId) {
            next.delete(slot);
          }
        }
        return next;
      });
    },
    [setSlotSelections],
  );

  return {
    quickItems,
    isUploadingQuickItem,
    showQuickItemCategoryPicker,
    setShowQuickItemCategoryPicker,
    quickItemInputRef,
    backItemInputRef,
    uploadingBackForItemId,
    setUploadingBackForItemId,
    handleQuickItemUpload,
    handleBackItemUpload,
    confirmQuickItemCategory,
    removeQuickItem,
  };
}
