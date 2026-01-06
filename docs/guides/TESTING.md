# 🧪 Guía de Testing - Features de "No Tengo Nada Para Ponerme"

## 🔧 Setup Inicial (Una sola vez)

### 1. Ejecutar Migrations en Supabase Dashboard

Ve a: https://supabase.com/dashboard/project/qpoojigxxswkpkfbrfiy/sql/new

**Migration 1: outfit_ratings (Feature 12)**
```sql
-- Migration: Outfit Rating System
CREATE TABLE IF NOT EXISTS outfit_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, outfit_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outfit_ratings_user_id ON outfit_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_ratings_outfit_id ON outfit_ratings(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_ratings_rating ON outfit_ratings(rating DESC);

-- RLS Policies
ALTER TABLE outfit_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ratings" ON outfit_ratings;
CREATE POLICY "Users can view their own ratings"
  ON outfit_ratings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own ratings" ON outfit_ratings;
CREATE POLICY "Users can create their own ratings"
  ON outfit_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON outfit_ratings;
CREATE POLICY "Users can update their own ratings"
  ON outfit_ratings FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON outfit_ratings;
CREATE POLICY "Users can delete their own ratings"
  ON outfit_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_outfit_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outfit_ratings_updated_at ON outfit_ratings;
CREATE TRIGGER outfit_ratings_updated_at
  BEFORE UPDATE ON outfit_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_outfit_ratings_updated_at();
```

### 2. Verificar que el servidor está corriendo
```bash
npm run dev
# Debería estar en http://localhost:3000
```

---

## 🎯 Testing de Feature 12: Outfit Rating System

### Flujo Completo de Testing

**1. Abrir la app**: http://localhost:3000

**2. Crear cuenta o iniciar sesión**:
   - Si es primera vez → Click en "Empezar" → Crear cuenta
   - Si ya tenés cuenta → Iniciar sesión

**3. Agregar prendas al armario**:
   - Ir a "Mi Armario" (bottom navigation)
   - Click en "+"
   - Subir foto de prenda o generar con AI
   - Repetir hasta tener al menos 6 prendas (2 tops, 2 bottoms, 2 shoes)

**4. Generar outfits**:
   - Ir a Home
   - Click en "Genera tu Fit"
   - Generar 3-4 outfits diferentes
   - Guardar cada outfit

**5. Testear Feature 12: Calificaciones**:

   **5.1. Abrir Vista de Calificaciones**
   - Ir a Home
   - Click en card "Calificaciones" (ícono de estrella ⭐)

   **5.2. Verificar Estado Inicial**
   ✅ Dashboard vacío (0 calificaciones)
   ✅ Grid muestra todos los outfits guardados sin rating

   **5.3. Calificar Primer Outfit**
   - Click en botón "Calificar" de un outfit
   - Seleccionar 5 estrellas (★★★★★)
   - Agregar nota: "Me encanta! Perfecto para el trabajo"
   - Click "Guardar Calificación"

   **Verificar**:
   ✅ Outfit muestra 5 estrellas
   ✅ Nota visible debajo de las estrellas
   ✅ Dashboard muestra: Promedio 5.0, Total 1 outfit

   **5.4. Calificar Más Outfits**
   - Calificar 2do outfit: 4 estrellas + nota
   - Calificar 3er outfit: 3 estrellas + nota
   - Calificar 4to outfit: 5 estrellas sin nota

   **Verificar Dashboard**:
   ✅ Promedio actualizado (ej: 4.3)
   ✅ Total outfits: 4
   ✅ "Mejor Outfit" muestra el de 5 estrellas
   ✅ "Peor Outfit" muestra el de 3 estrellas

   **5.5. Probar Filtros**
   - Filtrar por "⭐⭐⭐⭐⭐" → Ver solo outfits de 5 estrellas
   - Filtrar por "⭐⭐⭐" → Ver solo de 3 estrellas
   - Volver a "Todas las calificaciones"

   **Verificar**:
   ✅ Filtrado funciona correctamente
   ✅ Cantidad de outfits coincide

   **5.6. Probar Ordenamiento**
   - Ordenar por "Mayor calificación" → Ver de mayor a menor
   - Ordenar por "Más recientes" → Ver por fecha

   **Verificar**:
   ✅ Orden correcto en ambos casos

   **5.7. Editar Rating**
   - Click "Editar" en un outfit calificado
   - Cambiar de 4 a 5 estrellas
   - Modificar nota
   - Guardar

   **Verificar**:
   ✅ Rating actualizado (upsert automático)
   ✅ Dashboard actualizado con nuevo promedio
   ✅ Sin duplicados

   **5.8. Eliminar Rating**
   - Click botón "🗑️" en un outfit
   - Confirmar eliminación

   **Verificar**:
   ✅ Rating eliminado
   ✅ Dashboard actualizado
   ✅ Outfit vuelve a estado "Sin calificación"

   **5.9. Ver Outfit Completo**
   - Click botón "👁️" (ojo) en un outfit

   **Verificar**:
   ✅ Abre OutfitDetailView con outfit completo
   ✅ Muestra las 3 prendas (top, bottom, shoes)

---

## 📊 Checklist de Testing Completo

### ✅ Funcionalidad
- [ ] Dashboard de stats se renderiza correctamente
- [ ] Calificar outfit (1-5 estrellas)
- [ ] Agregar notas opcionales
- [ ] Editar rating existente (upsert)
- [ ] Eliminar rating
- [ ] Filtrar por rating específico
- [ ] Ordenar por fecha/rating
- [ ] Ver outfit completo

### ✅ UI/UX
- [ ] Estrellas interactivas con hover
- [ ] Loading states durante operaciones
- [ ] Mensajes de error claros
- [ ] Grid responsive (mobile/desktop)
- [ ] Dark mode funciona correctamente

### ✅ Persistencia
- [ ] Ratings persisten después de refresh
- [ ] Upsert automático sin duplicados
- [ ] Dashboard actualiza en tiempo real
- [ ] Sincronización con Supabase

### ✅ Performance
- [ ] Ratings cargan en <1s
- [ ] Operaciones async fluidas
- [ ] No degradación con 10+ outfits
- [ ] Stats calculadas instantáneamente

---

## 🐛 Problemas Comunes

**Error: "Usuario no autenticado"**
→ Cerrar sesión y volver a iniciar

**Error: "outfit_ratings table doesn't exist"**
→ Ejecutar migration en Supabase Dashboard (ver arriba)

**Outfits no aparecen**
→ Verificar que tenés outfits guardados primero

**Dashboard muestra 0**
→ Calificar al menos un outfit para ver stats

---

## 📝 Features Anteriores para Testear

### Feature 10: Lookbook Creator
- Home → "Lookbook Creator"
- Seleccionar tema (Oficina, Casual, etc.)
- Generar lookbook de 5-7 outfits
- Exportar a PNG
- Compartir

### Feature 11: Style Challenges
- Home → "Desafíos de Estilo"
- Seleccionar dificultad (Fácil/Medio/Difícil)
- Generar desafío personalizado
- Ver restricciones y puntos
- Marcar como completado/saltar

---

## 🎉 ¿Todo funciona?

Si completaste todos los checkpoints:
1. ✅ Feature 12 está funcionando perfectamente
2. 🎯 Proyecto al 75% de FASE 4
3. 🚀 Listo para Feature 13: AI Feedback Analyzer

¿Encontraste algún bug? → Anotalo y lo arreglamos!
