# 🌊 Liquid Morph Background - Guía de Uso

## ✨ ¿Qué es?

Un componente React que crea fondos líquidos animados con estética "Liquid Glass". Perfecto para agregar un toque premium y moderno a tu app sin comprometer la performance.

## 🎨 Preview del Demo

Para ver el demo interactivo:

### Opción 1: URL Directa
1. Asegurate que el dev server esté corriendo: `npm run dev`
2. Abrí la consola de tu navegador (F12)
3. Pegá este código en la consola:

```javascript
// Setear el estado para mostrar el demo
const event = new CustomEvent('showLiquidDemo');
window.dispatchEvent(event);
```

### Opción 2: Agregar Button Temporal
Agregá este código temporal a tu `HomeView.tsx` en las quick actions:

```tsx
<button
  onClick={() => {
    // @ts-ignore - temporal demo access
    if (window.setShowDemo) window.setShowDemo(true);
  }}
  className="glass-card p-6 hover:scale-105 transition-all"
>
  <div className="text-4xl mb-3">🌊</div>
  <h3 className="font-semibold mb-2">Liquid Demo</h3>
  <p className="text-sm text-text-secondary">Ver demo de fondos líquidos</p>
</button>
```

## 📦 Cómo Usar en tu App

### Uso Básico

```tsx
import { LiquidMorphBackground } from './components/LiquidMorphBackground';

export const MyView = () => {
  return (
    <div className="relative min-h-screen">
      {/* Background animado */}
      <LiquidMorphBackground />
      
      {/* Tu contenido */}
      <div className="relative z-10">
        {/* ... */}
      </div>
    </div>
  );
};
```

### Con Opciones Personalizadas

```tsx
<LiquidMorphBackground
  intensity={5}          // 1-10 (tamaño de blobs)
  blobCount={4}         // 2-8 (cantidad de blobs)
  speed={1}             // 0.5-2 (velocidad de animación)
  colorScheme="primary" // 'primary' | 'accent' | 'gradient' | 'purple'
  opacity={0.15}        // 0-1 (transparencia)
  blur={true}           // activar/desactivar blur
  zIndex={-1}           // posición en el stack
/>
```

## 🎯 Presets Recomendados

### Para HomeView (Sutil y Elegante)
```tsx
<LiquidMorphBackground
  intensity={4}
  blobCount={3}
  speed={0.7}
  colorScheme="primary"
  opacity={0.12}
  blur={true}
/>
```

### Para Workspace/Studio (Creativo)
```tsx
<LiquidMorphBackground
  intensity={7}
  blobCount={6}
  speed={1}
  colorScheme="gradient"
  opacity={0.2}
  blur={true}
/>
```

### Para Paywall/Landing (Alto Impacto)
```tsx
<LiquidMorphBackground
  intensity={6}
  blobCount={5}
  speed={1.2}
  colorScheme="accent"
  opacity={0.18}
  blur={true}
/>
```

### Para Settings/Profile (Único)
```tsx
<LiquidMorphBackground
  intensity={5}
  blobCount={4}
  speed={0.8}
  colorScheme="purple"
  opacity={0.15}
  blur={true}
/>
```

## 📋 Paletas de Color

El componente usa los colores de tu `tailwind.config.js`:

- **primary**: Tonos teal (#0D9488, #14B8A6, #2DD4BF)
- **accent**: Tonos rosados (#F472B6, #EC4899, #DB2777)
- **gradient**: Mezcla (Teal → Purple → Pink)
- **purple**: Tonos morados (#A78BFA, #9333EA, #7C3AED)

## ⚠️ Consideraciones

### ✅ Buenas Prácticas
- Usá opacity entre 0.1-0.2 para no competir con el contenido
- Mantené blur activado para un look más suave
- Menos blobs = mejor performance en mobile
- Evitá usar en vistas con grid densos (ej: Closet Grid)

### ❌ Dónde NO Usar
- Closet Grid (mucha info visual)
- Vistas con mucho texto para leer
- Forms complejos con muchos inputs

### ✅ Dónde SÍ Usar
- HomeView (hero section)
- Landing/Paywall
- Workspace/Creation Studio
- Profile/Settings
- Modals de bienvenida/onboarding

## 🚀 Performance

- Canvas-based (GPU accelerated)
- RequestAnimationFrame para smooth 60fps
- Resize listener debounced
- Cleanup automático en unmount

## 🎨 Personalización Avanzada

Si querés agregar tus propias paletas de colores, editá el objeto `colorPalettes` en `LiquidMorphBackground.tsx`:

```tsx
const colorPalettes = {
  primary: ['#0D9488', '#14B8A6', '#2DD4BF'],
  accent: ['#F472B6', '#EC4899', '#DB2777'],
  gradient: ['#0D9488', '#A78BFA', '#F472B6'],
  purple: ['#A78BFA', '#9333EA', '#7C3AED'],
  // Agregá tu paleta custom aquí
  sunset: ['#FF6B6B', '#FFD93D', '#6BCF7F'],
};
```

## 📝 To-Do / Ideas Futuras

- [ ] Modo "interactivo" (blobs siguen el cursor)
- [ ] Efecto de "repulsión" entre blobs (metaballs)
- [ ] Transiciones entre color schemes
- [ ] Variante con WebGL para efectos más complejos
- [ ] Sincronización con música (beat detection)

---

**Creado por**: Antigravity AI
**Fecha**: 2025-11-20
**Estilo**: Liquid Glass Premium 🌊✨
