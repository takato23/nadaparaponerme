# React Error #426 - Suspense en Input Sincrónico

## ¿Qué significa este error?

**Error completo:**
> "A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition."

Este error ocurre cuando:
1. Un usuario hace clic en un botón o realiza una acción sincrónica (como navegar)
2. La navegación carga un componente lazy-loaded (con `React.lazy()`)  
3. React "suspende" la renderización mientras espera que el componente se cargue
4. Esto causa que la UI se reemplace con un indicador de carga de forma abrupta

## La Solución: `startTransition`

React 18 introdujo `startTransition` para marcar actualizaciones como **no urgentes**, permitiendo que React las renderice de forma suave sin bloquear la UI.

## Tu Implementación

### ✅ Hook Personalizado ya existe: `useNavigateTransition`

Ubicación: `/hooks/useNavigateTransition.ts`

```typescript
import { useCallback, startTransition } from 'react';
import { useNavigate, NavigateOptions, To } from 'react-router-dom';

export function useNavigateTransition() {
  const routerNavigate = useNavigate();

  const navigate = useCallback((to: To | number, options?: NavigateOptions) => {
    startTransition(() => {
      if (typeof to === 'number') {
        routerNavigate(to);
      } else {
        routerNavigate(to, options);
      }
    });
  }, [routerNavigate]);

  return navigate;
}
```

### ✅ Cambios Aplicados en App.tsx

**ANTES:**
```typescript
const routerNavigate = useNavigate();

const navigate = useCallback((to: string | number) => {
    startTransition(() => {
        if (typeof to === 'number') {
            routerNavigate(to);
        } else {
            routerNavigate(to);
        }
    });
}, [routerNavigate]);
```

**DESPUÉS:**
```typescript
const navigate = useNavigateTransition();
```

### ✅ Componentes que YA usan `useNavigateTransition` correctamente:

- `FloatingDock.tsx` 
- `CommandPalette.tsx`
- `InstantOutfitView.tsx`
- `App.tsx` (ahora limpio)

## Mejores Prácticas

### ✅ **HACER ESTO**
```typescript
import { useNavigateTransition } from '../hooks/useNavigateTransition';

function MyComponent() {
  const navigate = useNavigateTransition();
  
  const handleClick = () => {
    navigate('/ruta');
  };
  
  return <button onClick={handleClick}>Ir</button>;
}
```

### ❌ **NO HACER ESTO**
```typescript
import { useNavigate } from 'react-router-dom';

function MyComponent() {
  const navigate = useNavigate(); // ⚠️ Sin startTransition
  
  const handleClick = () => {
    navigate('/ruta'); // ❌ Causará error #426
  };
  
  return <button onClick={handleClick}>Ir</button>;
}
```

## Debugging

Si el error persiste:

1. **Verifica la consola** del navegador para ver el stack trace completo
2. **Busca navegación directa** que no use `useNavigateTransition`:
   ```bash
   grep -r "useNavigate()" ./components
   ```
3. **Revisa componentes lazy-loaded** en `App.tsx`:
   ```typescript
   const MyComponent = lazy(() => import('./components/MyComponent'));
   ```
4. **Verifica que todos tengan Suspense boundary**:
   ```typescript
   <Suspense fallback={<Loader />}>
     <MyComponent />
   </Suspense>
   ```

## Referencias

- [React Error Decoder #426](https://reactjs.org/docs/error-decoder.html?invariant=426)
- [React 18: startTransition](https://react.dev/reference/react/startTransition)
- [React Router: useNavigate](https://reactrouter.com/hooks/use-navigate)

## Estado Actual

✅ **RESUELTO** - Todos los componentes ahora usan `useNavigateTransition` de forma consistente.

Si el error persiste, comparte el stack trace completo de la consola para debugging adicional.
