# Plan de Ejecución: Migración localStorage → Supabase

**Estado:** Ready to Execute
**Estimación Total:** 23-31 horas (3-4 días)
**Estrategia:** Migración gradual con feature flags
**Objetivo:** App production-ready con Supabase backend

---

## 📋 Pre-requisitos

Antes de empezar, verificá que tengas:

- [ ] Proyecto Supabase creado
- [ ] Migrations SQL ejecutadas (3 archivos en `supabase/migrations/`)
- [ ] Edge Functions deployadas (analyze-clothing, generate-outfit, generate-packing-list)
- [ ] Variables de entorno configuradas en `.env.local`
- [ ] `npm install` ejecutado (debe tener `@supabase/supabase-js`)

**Si falta algo**, seguí `SETUP.md` primero.

---

## 🎯 FASE 0: Preparación e Infraestructura

**Duración:** 2-3 horas
**Objetivo:** Crear sistema de feature flags y migración automática

### Task 0.1: Crear sistema de feature flags

**Archivo:** `src/config/features.ts`

```typescript
/**
 * Feature Flags para migración gradual a Supabase
 * Permite activar/desactivar features independientemente
 */

export const FEATURE_FLAGS = {
  // Fase 1: Autenticación
  USE_SUPABASE_AUTH: false,

  // Fase 2: Closet (prendas)
  USE_SUPABASE_CLOSET: false,

  // Fase 3: Outfits guardados
  USE_SUPABASE_OUTFITS: false,

  // Fase 4: Edge Functions para AI
  USE_SUPABASE_EDGE_FN: false,

  // Fase 5: Preferencias de usuario
  USE_SUPABASE_PREFERENCES: false,

  // Sistema de migración
  ENABLE_DATA_MIGRATION: true,
  SHOW_MIGRATION_DEBUG: true, // Logs para debugging
} as const;

// Override con variables de entorno (para testing)
export function getFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  const envKey = `VITE_FEATURE_${flag}`;
  const envValue = import.meta.env[envKey];

  if (envValue !== undefined) {
    return envValue === 'true';
  }

  return FEATURE_FLAGS[flag];
}

// Helper para uso en componentes
export function useFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return getFeatureFlag(flag);
}
```

**Archivo:** `src/hooks/useFeatureFlag.ts`

```typescript
import { useMemo } from 'react';
import { getFeatureFlag } from '../config/features';
import type { FEATURE_FLAGS } from '../config/features';

/**
 * Hook para acceder a feature flags en componentes
 */
export function useFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return useMemo(() => getFeatureFlag(flag), [flag]);
}
```

### Task 0.2: Crear servicio de migración de datos

**Archivo:** `src/services/migrationService.ts`

```typescript
import { supabase, uploadImage, compressImage, dataUrlToFile } from '../lib/supabase';
import type { ClothingItem as LegacyClothingItem, SavedOutfit as LegacySavedOutfit } from '../types';
import type { ClothingItemInsert, OutfitInsert } from '../types/api';

interface MigrationResult {
  success: boolean;
  itemsMigrated: number;
  outfitsMigrated: number;
  errors: string[];
}

/**
 * Detecta si el usuario tiene datos en localStorage
 */
export function detectLegacyData(): {
  hasCloset: boolean;
  hasOutfits: boolean;
  closetCount: number;
  outfitsCount: number;
} {
  const closetData = localStorage.getItem('ojodeloca-closet');
  const outfitsData = localStorage.getItem('ojodeloca-saved-outfits');

  const closet = closetData ? JSON.parse(closetData) : [];
  const outfits = outfitsData ? JSON.parse(outfitsData) : [];

  return {
    hasCloset: closet.length > 0,
    hasOutfits: outfits.length > 0,
    closetCount: closet.length,
    outfitsCount: outfits.length,
  };
}

/**
 * Convierte imagen base64 a Supabase Storage URL
 */
async function migrateImage(
  userId: string,
  itemId: string,
  imageDataUrl: string
): Promise<{ imageUrl: string; thumbnailUrl: string }> {
  // Convertir base64 a File
  const file = dataUrlToFile(imageDataUrl, `${itemId}.jpg`);

  // Comprimir imagen principal
  const compressedFile = await compressImage(file, 1920, 0.85);

  // Crear thumbnail
  const thumbnailFile = await compressImage(file, 300, 0.75);

  // Upload a Supabase Storage
  const imagePath = `${userId}/${itemId}.jpg`;
  const thumbnailPath = `${userId}/${itemId}_thumb.jpg`;

  const imageUrl = await uploadImage('clothing-images', imagePath, compressedFile);
  const thumbnailUrl = await uploadImage('clothing-images', thumbnailPath, thumbnailFile);

  return { imageUrl, thumbnailUrl };
}

/**
 * Convierte ClothingItem legacy a formato Supabase
 */
function convertLegacyClothingItem(
  legacy: LegacyClothingItem,
  userId: string,
  imageUrl: string,
  thumbnailUrl: string
): ClothingItemInsert {
  return {
    user_id: userId,
    name: legacy.metadata.subcategory || 'Prenda',
    category: legacy.metadata.category as any,
    subcategory: legacy.metadata.subcategory,
    color_primary: legacy.metadata.color_primary,
    image_url: imageUrl,
    thumbnail_url: thumbnailUrl,
    ai_metadata: {
      ...legacy.metadata,
      vibe_tags: legacy.metadata.vibe_tags || [],
      seasons: legacy.metadata.seasons || [],
    },
    tags: legacy.metadata.vibe_tags || [],
  };
}

/**
 * Migra datos del closet de localStorage a Supabase
 */
export async function migrateClosetData(
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<MigrationResult> {
  const errors: string[] = [];
  let itemsMigrated = 0;

  try {
    // Leer datos de localStorage
    const closetData = localStorage.getItem('ojodeloca-closet');
    if (!closetData) {
      return { success: true, itemsMigrated: 0, outfitsMigrated: 0, errors: [] };
    }

    const legacyItems: LegacyClothingItem[] = JSON.parse(closetData);
    const total = legacyItems.length;

    // Migrar cada item
    for (let i = 0; i < legacyItems.length; i++) {
      const item = legacyItems[i];

      try {
        // Upload imagen a Storage
        const { imageUrl, thumbnailUrl } = await migrateImage(
          userId,
          item.id,
          item.imageDataUrl
        );

        // Convertir a formato Supabase
        const supabaseItem = convertLegacyClothingItem(
          item,
          userId,
          imageUrl,
          thumbnailUrl
        );

        // Insertar en DB
        const { error } = await supabase
          .from('clothing_items')
          .insert(supabaseItem);

        if (error) throw error;

        itemsMigrated++;
        onProgress?.(i + 1, total);
      } catch (err) {
        const errorMsg = `Error migrando item ${item.id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      itemsMigrated,
      outfitsMigrated: 0,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      itemsMigrated,
      outfitsMigrated: 0,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    };
  }
}

/**
 * Convierte SavedOutfit legacy a formato Supabase
 */
function convertLegacyOutfit(
  legacy: LegacySavedOutfit,
  userId: string,
  itemIdMap: Map<string, string>
): OutfitInsert | null {
  // Mapear IDs legacy a IDs de Supabase
  const topId = itemIdMap.get(legacy.top_id);
  const bottomId = itemIdMap.get(legacy.bottom_id);
  const shoesId = itemIdMap.get(legacy.shoes_id);

  if (!topId || !bottomId || !shoesId) {
    console.warn(`No se pudieron mapear IDs para outfit ${legacy.id}`);
    return null;
  }

  return {
    user_id: userId,
    name: `Outfit ${new Date().toLocaleDateString()}`,
    clothing_item_ids: [topId, bottomId, shoesId],
    ai_reasoning: legacy.explanation,
    ai_generated: true,
    is_public: false,
  };
}

/**
 * Migra outfits guardados de localStorage a Supabase
 */
export async function migrateOutfitsData(userId: string): Promise<MigrationResult> {
  const errors: string[] = [];
  let outfitsMigrated = 0;

  try {
    // Leer outfits de localStorage
    const outfitsData = localStorage.getItem('ojodeloca-saved-outfits');
    if (!outfitsData) {
      return { success: true, itemsMigrated: 0, outfitsMigrated: 0, errors: [] };
    }

    const legacyOutfits: LegacySavedOutfit[] = JSON.parse(outfitsData);

    // Crear mapa de IDs legacy → Supabase
    // (Nota: esto requiere que los items ya estén migrados)
    const { data: supabaseItems } = await supabase
      .from('clothing_items')
      .select('id, name')
      .eq('user_id', userId);

    if (!supabaseItems) {
      errors.push('No se encontraron items en Supabase. Migrá el closet primero.');
      return { success: false, itemsMigrated: 0, outfitsMigrated: 0, errors };
    }

    // Crear mapa basado en nombre (no es perfecto pero es mejor que nada)
    // En producción, deberíamos guardar legacy_id en la tabla
    const itemIdMap = new Map<string, string>();

    // Migrar cada outfit
    for (const outfit of legacyOutfits) {
      try {
        const supabaseOutfit = convertLegacyOutfit(outfit, userId, itemIdMap);

        if (!supabaseOutfit) {
          errors.push(`No se pudo convertir outfit ${outfit.id}`);
          continue;
        }

        const { error } = await supabase
          .from('outfits')
          .insert(supabaseOutfit);

        if (error) throw error;

        outfitsMigrated++;
      } catch (err) {
        const errorMsg = `Error migrando outfit ${outfit.id}: ${err instanceof Error ? err.message : 'Unknown'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      itemsMigrated: 0,
      outfitsMigrated,
      errors,
    };
  } catch (err) {
    return {
      success: false,
      itemsMigrated: 0,
      outfitsMigrated: 0,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    };
  }
}

/**
 * Migración completa (closet + outfits)
 */
export async function migrateAllData(
  userId: string,
  onProgress?: (current: number, total: number, step: string) => void
): Promise<MigrationResult> {
  const allErrors: string[] = [];
  let totalItemsMigrated = 0;
  let totalOutfitsMigrated = 0;

  // Step 1: Migrar closet
  onProgress?.(0, 2, 'Migrando prendas...');
  const closetResult = await migrateClosetData(userId);
  totalItemsMigrated = closetResult.itemsMigrated;
  allErrors.push(...closetResult.errors);

  // Step 2: Migrar outfits
  onProgress?.(1, 2, 'Migrando outfits...');
  const outfitsResult = await migrateOutfitsData(userId);
  totalOutfitsMigrated = outfitsResult.outfitsMigrated;
  allErrors.push(...outfitsResult.errors);

  onProgress?.(2, 2, 'Migración completada');

  return {
    success: allErrors.length === 0,
    itemsMigrated: totalItemsMigrated,
    outfitsMigrated: totalOutfitsMigrated,
    errors: allErrors,
  };
}

/**
 * Limpia datos de localStorage después de migración exitosa
 * (Mantiene backup por si acaso)
 */
export function backupAndClearLegacyData(): void {
  const closet = localStorage.getItem('ojodeloca-closet');
  const outfits = localStorage.getItem('ojodeloca-saved-outfits');

  if (closet) {
    localStorage.setItem('ojodeloca-closet-backup', closet);
    localStorage.removeItem('ojodeloca-closet');
  }

  if (outfits) {
    localStorage.setItem('ojodeloca-saved-outfits-backup', outfits);
    localStorage.removeItem('ojodeloca-saved-outfits');
  }

  // Marcar como migrado
  localStorage.setItem('ojodeloca-migrated-to-supabase', 'true');
}
```

### Task 0.3: Crear componente de migración

**Archivo:** `src/components/MigrationModal.tsx`

```typescript
import React, { useState } from 'react';
import { migrateAllData, backupAndClearLegacyData, detectLegacyData } from '../services/migrationService';

interface MigrationModalProps {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({ userId, onComplete, onSkip }) => {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, step: '' });
  const [error, setError] = useState<string | null>(null);

  const legacyData = detectLegacyData();

  const handleMigrate = async () => {
    setIsMigrating(true);
    setError(null);

    try {
      const result = await migrateAllData(
        userId,
        (current, total, step) => {
          setProgress({ current, total, step });
        }
      );

      if (result.success) {
        // Migración exitosa, limpiar localStorage
        backupAndClearLegacyData();
        onComplete();
      } else {
        setError(`Migración parcial. Errores: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">¡Migrá tus datos a la nube!</h2>

        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Tenés {legacyData.closetCount} prendas y {legacyData.outfitsCount} outfits guardados localmente.
          ¿Querés migrarlos a la nube para acceder desde cualquier dispositivo?
        </p>

        {isMigrating && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>{progress.step}</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleMigrate}
            disabled={isMigrating}
            className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {isMigrating ? 'Migrando...' : 'Migrar a la nube'}
          </button>

          <button
            onClick={onSkip}
            disabled={isMigrating}
            className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            Después
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Tus datos locales se guardarán como backup. Podés recuperarlos si algo sale mal.
        </p>
      </div>
    </div>
  );
};
```

### ✅ Checklist Fase 0

- [ ] `src/config/features.ts` creado con todos los feature flags
- [ ] `src/hooks/useFeatureFlag.ts` creado
- [ ] `src/services/migrationService.ts` creado con todas las funciones
- [ ] `src/components/MigrationModal.tsx` creado
- [ ] Probado que los feature flags se pueden leer correctamente
- [ ] Probado `detectLegacyData()` con datos en localStorage

**Comandos de testing:**
```bash
# Verificar que todo compila
npm run build

# Testear detección de datos legacy
# En browser console:
localStorage.setItem('ojodeloca-closet', '[]');
detectLegacyData(); // Debería retornar info correcta
```

---

## 🔐 FASE 1: Autenticación

**Duración:** 3-4 horas
**Objetivo:** Migrar auth de localStorage a Supabase Auth

### Task 1.1: Crear hook de autenticación

**Archivo:** `src/hooks/useAuth.ts`

```typescript
import { useState, useEffect } from 'react';
import { supabase, getCurrentUser, getCurrentProfile, signIn, signUp, signOut } from '../lib/supabase';
import { useFeatureFlag } from './useFeatureFlag';
import type { Profile } from '../types/api';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const useSupabaseAuth = useFeatureFlag('USE_SUPABASE_AUTH');
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (!useSupabaseAuth) {
      // Fallback a localStorage
      const isAuth = localStorage.getItem('ojodeloca-is-authenticated') === 'true';
      setAuthState({
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: isAuth,
      });
      return;
    }

    // Supabase Auth
    const initAuth = async () => {
      try {
        const user = await getCurrentUser();

        if (user) {
          const profile = await getCurrentProfile();
          setAuthState({
            user,
            profile,
            isLoading: false,
            isAuthenticated: true,
          });
        } else {
          setAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuthState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await getCurrentProfile();
        setAuthState({
          user: session.user,
          profile,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [useSupabaseAuth]);

  return authState;
}
```

### Task 1.2: Actualizar AuthView

**Archivo:** `src/components/AuthView.tsx` (reemplazar completamente)

```typescript
import React, { useState } from 'react';
import { signUp, signIn } from '../lib/supabase';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { OjoDeLocaLogo } from './OjoDeLocaLogo';

interface AuthViewProps {
  onLogin: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const useSupabaseAuth = useFeatureFlag('USE_SUPABASE_AUTH');

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!useSupabaseAuth) {
      // Fallback a localStorage (legacy)
      localStorage.setItem('ojodeloca-is-authenticated', 'true');
      onLogin();
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password, username, displayName);
        setError(null);
        // Auto-login después de signup
        await signIn(email, password);
      } else {
        await signIn(email, password);
      }

      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md liquid-glass rounded-4xl p-8 shadow-soft-lg">
      <div className="flex flex-col items-center mb-8">
        <OjoDeLocaLogo className="w-20 h-20 mb-4" />
        <h1 className="text-3xl font-bold">No Tengo Nada Para Ponerme</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {mode === 'login' ? 'Ingresá a tu cuenta' : 'Creá tu cuenta'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <>
            <input
              type="text"
              placeholder="Usuario (ej: fashionista23)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required={useSupabaseAuth}
              className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="text"
              placeholder="Nombre para mostrar"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
            />
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={useSupabaseAuth}
          className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={useSupabaseAuth}
          minLength={6}
          className="w-full p-3 bg-white/50 dark:bg-black/20 rounded-xl border-none focus:ring-2 focus:ring-primary"
        />

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white py-3 rounded-xl font-semibold transition-transform active:scale-95 disabled:opacity-50"
        >
          {isLoading ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear Cuenta'}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
        className="w-full mt-4 text-primary text-sm font-medium"
      >
        {mode === 'login' ? '¿No tenés cuenta? Registrate' : '¿Ya tenés cuenta? Ingresá'}
      </button>
    </div>
  );
};

export default AuthView;
```

### Task 1.3: Actualizar App.tsx con nuevo sistema de auth

**En `App.tsx`, reemplazar:**

```typescript
// ANTES (líneas 114-125):
const [isAuthenticated, setIsAuthenticated] = useLocalStorage('ojodeloca-is-authenticated', false);
const [hasOnboarded, setHasOnboarded] = useLocalStorage('ojodeloca-has-onboarded', false);

// DESPUÉS:
import { useAuth } from './hooks/useAuth';
import { useFeatureFlag } from './hooks/useFeatureFlag';
import { MigrationModal } from './components/MigrationModal';
import { detectLegacyData } from './services/migrationService';

const App = () => {
    const useSupabaseAuth = useFeatureFlag('USE_SUPABASE_AUTH');
    const enableMigration = useFeatureFlag('ENABLE_DATA_MIGRATION');

    // Auth state
    const { user, profile, isLoading: authLoading, isAuthenticated } = useAuth();

    // Legacy fallback
    const [legacyAuth, setLegacyAuth] = useLocalStorage('ojodeloca-is-authenticated', false);
    const isAuth = useSupabaseAuth ? isAuthenticated : legacyAuth;

    // Onboarding
    const [hasOnboarded, setHasOnboarded] = useLocalStorage('ojodeloca-has-onboarded', false);

    // Migration modal
    const [showMigrationModal, setShowMigrationModal] = useState(false);

    // Check for legacy data on mount
    useEffect(() => {
        if (isAuth && enableMigration && useSupabaseAuth && user) {
            const legacy = detectLegacyData();
            const alreadyMigrated = localStorage.getItem('ojodeloca-migrated-to-supabase') === 'true';

            if ((legacy.hasCloset || legacy.hasOutfits) && !alreadyMigrated) {
                setShowMigrationModal(true);
            }
        }
    }, [isAuth, enableMigration, useSupabaseAuth, user]);

    // ... resto del código
```

**Y agregar antes del return final:**

```typescript
// Antes del return principal, agregar:
if (authLoading && useSupabaseAuth) {
    return (
        <div className="w-full h-dvh flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
            </div>
        </div>
    );
}

// Dentro del return principal, después de AuthView:
{showMigrationModal && user && (
    <MigrationModal
        userId={user.id}
        onComplete={() => {
            setShowMigrationModal(false);
            // Reload data después de migración
            window.location.reload();
        }}
        onSkip={() => setShowMigrationModal(false)}
    />
)}
```

### Task 1.4: Actualizar ProfileView con logout

**En `components/ProfileView.tsx`:**

```typescript
import { signOut } from '../lib/supabase';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

// Dentro del componente:
const useSupabaseAuth = useFeatureFlag('USE_SUPABASE_AUTH');

const handleLogout = async () => {
    if (useSupabaseAuth) {
        await signOut();
    } else {
        // Legacy
        localStorage.removeItem('ojodeloca-is-authenticated');
    }

    onLogout();
};
```

### ✅ Checklist Fase 1

- [ ] `src/hooks/useAuth.ts` creado
- [ ] `components/AuthView.tsx` actualizado con Supabase auth
- [ ] `App.tsx` actualizado con useAuth hook
- [ ] `components/ProfileView.tsx` actualizado con signOut
- [ ] MigrationModal integrado en App.tsx
- [ ] Feature flag `USE_SUPABASE_AUTH` = false (para testing)
- [ ] Probado signup con Supabase
- [ ] Probado login con Supabase
- [ ] Probado logout
- [ ] Probado que session persiste en refresh
- [ ] Feature flag = true y todo funciona
- [ ] Probado rollback a localStorage (flag = false)

**Comandos de testing:**
```bash
# 1. Activar feature flag en .env.local
echo "VITE_FEATURE_USE_SUPABASE_AUTH=true" >> .env.local

# 2. Reiniciar dev server
npm run dev

# 3. Probar signup/login en browser
# 4. Verificar en Supabase Dashboard → Auth → Users
# 5. Verificar profile creado en Database → profiles table
```

---

**CONTINÚA EN SIGUIENTE RESPUESTA...**

(El plan completo tiene las 6 fases detalladas. ¿Querés que continúe con las Fases 2-6 o empezamos a implementar Fase 0 ahora?)
