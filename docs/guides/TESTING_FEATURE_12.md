# 🧪 Testing Feature 12: Outfit Rating System

## ✅ Objetivo
Validar que el sistema de calificación de outfits funciona correctamente sin necesidad de generar imágenes con IA.

---

## 📋 Checklist de Testing

### Paso 1: Agregar Prendas al Armario (15 min)
- [ ] Abrir http://localhost:3000
- [ ] Iniciar sesión con tu cuenta
- [ ] Ir a "Mi Armario"
- [ ] Tocar botón "+"
- [ ] **Importante**: Usar "Subir Foto" (NO "Crear con IA")
- [ ] Subir 3-5 tops (remeras, camisas, etc.)
- [ ] Subir 3-5 bottoms (pantalones, shorts, polleras)
- [ ] Subir 2-3 zapatos
- [ ] Verificar que cada prenda se guarda correctamente
- [ ] Verificar que la metadata se extrae automáticamente

**Resultado esperado**: Armario con al menos 10 prendas variadas.

---

### Paso 2: Generar Outfits (10 min)
- [ ] Volver al Home
- [ ] Tocar "Estilista IA"
- [ ] Describir ocasión: "casual para ir a trabajar"
- [ ] Esperar que la IA genere combinaciones
- [ ] **Guardar el outfit** generado
- [ ] Repetir con otra ocasión: "salir de noche"
- [ ] Guardar ese outfit también
- [ ] Repetir 2-3 veces más con diferentes ocasiones

**Resultado esperado**: Al menos 4-5 outfits guardados.

---

### Paso 3: Calificar Outfits (15 min)

#### 3.1 Vista Principal de Calificaciones
- [ ] Volver al Home
- [ ] Tocar botón "Calificaciones" ⭐
- [ ] Verificar que aparece el **Dashboard** con:
  - [ ] Promedio de calificaciones (debe ser 0 inicialmente)
  - [ ] Total de calificaciones (debe ser 0)
  - [ ] Distribución por estrellas (todos en 0)
- [ ] Verificar que aparece la **lista de outfits guardados**

#### 3.2 Calificar Primer Outfit
- [ ] Tocar un outfit de la lista
- [ ] Verificar que aparece la vista de calificación
- [ ] Tocar las **estrellas interactivas** (hover debe cambiar color)
- [ ] Seleccionar **5 estrellas**
- [ ] Agregar notas: "Me encantó esta combinación, muy cómoda"
- [ ] Tocar "Guardar Calificación"
- [ ] Verificar que vuelve a la lista
- [ ] Verificar que el outfit ahora muestra **5 estrellas**

#### 3.3 Calificar Más Outfits
- [ ] Calificar segundo outfit con **3 estrellas** y notas
- [ ] Calificar tercer outfit con **4 estrellas** sin notas
- [ ] Calificar cuarto outfit con **2 estrellas** y notas
- [ ] Calificar quinto outfit con **5 estrellas** y notas

#### 3.4 Verificar Dashboard Actualizado
- [ ] Volver a la vista de Dashboard
- [ ] Verificar que **Promedio** se calcula correctamente
  - Ejemplo: (5+3+4+2+5)/5 = 3.8
- [ ] Verificar que **Total de calificaciones** = 5
- [ ] Verificar **Distribución**:
  - [ ] 5 estrellas: 2 outfits
  - [ ] 4 estrellas: 1 outfit
  - [ ] 3 estrellas: 1 outfit
  - [ ] 2 estrellas: 1 outfit
- [ ] Verificar que muestra **Mejor outfit** (uno de los 5 estrellas)
- [ ] Verificar que muestra **Peor outfit** (el de 2 estrellas)

---

### Paso 4: Filtros y Ordenamiento (10 min)

#### 4.1 Filtrar por Rating
- [ ] En la lista de outfits, tocar filtro "Todos"
- [ ] Seleccionar **"5 estrellas"**
- [ ] Verificar que solo muestra outfits con 5 estrellas
- [ ] Cambiar a **"3 estrellas"**
- [ ] Verificar que solo muestra outfits con 3 estrellas
- [ ] Volver a **"Todos"** y verificar que muestra todos

#### 4.2 Ordenar
- [ ] Tocar botón de ordenamiento
- [ ] Seleccionar **"Por fecha"** (más reciente primero)
- [ ] Verificar que el último outfit calificado aparece primero
- [ ] Cambiar a **"Por rating"** (más alto primero)
- [ ] Verificar que los outfits con 5 estrellas aparecen primero
- [ ] Cambiar a **"Por rating"** (más bajo primero)
- [ ] Verificar que el outfit con 2 estrellas aparece primero

---

### Paso 5: Editar Calificación (5 min)
- [ ] Tocar un outfit que ya calificaste
- [ ] Cambiar la calificación (ej: de 3 a 4 estrellas)
- [ ] Modificar las notas
- [ ] Guardar
- [ ] Verificar que se actualizó correctamente
- [ ] Verificar que el Dashboard se actualiza automáticamente

---

### Paso 6: Borrar Calificación (5 min)
- [ ] Tocar un outfit calificado
- [ ] Tocar botón "Eliminar Calificación"
- [ ] Confirmar eliminación
- [ ] Verificar que la calificación desaparece
- [ ] Verificar que el Dashboard se actualiza automáticamente
- [ ] Verificar que el outfit sigue en la lista pero sin calificación

---

### Paso 7: Ver Detalle de Outfit (5 min)
- [ ] En la lista de calificaciones, tocar un outfit
- [ ] Verificar que muestra:
  - [ ] Imagen del outfit (si tiene)
  - [ ] Prendas que lo componen
  - [ ] Calificación actual (estrellas)
  - [ ] Notas (si tiene)
  - [ ] Fecha de creación
  - [ ] Fecha de última calificación
- [ ] Tocar botón "Ver Outfit Completo"
- [ ] Verificar que navega correctamente a la vista de detalle

---

### Paso 8: Persistencia (5 min)
- [ ] Recargar la página (F5 o Cmd+R)
- [ ] Iniciar sesión nuevamente si es necesario
- [ ] Ir a "Calificaciones"
- [ ] Verificar que todas las calificaciones siguen ahí
- [ ] Verificar que el Dashboard muestra los mismos números
- [ ] Verificar que los filtros y ordenamiento funcionan igual

---

## ✅ Criterios de Éxito

### Must-Have (Obligatorio)
✅ Puedo calificar outfits con 1-5 estrellas
✅ Puedo agregar notas a las calificaciones
✅ Dashboard muestra promedio correcto
✅ Dashboard muestra distribución correcta
✅ Puedo editar calificaciones existentes (upsert)
✅ Puedo filtrar por rating
✅ Puedo ordenar por fecha/rating
✅ Calificaciones persisten después de recargar
✅ RLS funciona (solo veo mis propias calificaciones)

### Nice-to-Have (Deseable)
✅ Animaciones suaves en las estrellas
✅ Dashboard muestra mejor/peor outfit
✅ Puedo ver detalle completo del outfit
✅ Puedo borrar calificaciones
✅ Errores muestran mensajes claros en español

---

## 🐛 Bugs Conocidos / Issues a Reportar

Si encontrás problemas, anotá:
- **Descripción**: Qué pasó
- **Pasos para reproducir**: Qué hiciste antes del error
- **Resultado esperado**: Qué esperabas que pase
- **Resultado actual**: Qué pasó realmente
- **Screenshots**: Si es posible

---

## 🔧 Solución de Problemas

### "No veo el botón de Calificaciones"
→ Verificá que ejecutaste `SETUP_COMPLETE.sql` en Supabase

### "Error al guardar calificación"
→ Verificá que estás autenticado (mirá la consola del navegador)

### "No veo mis calificaciones"
→ Verificá RLS policies en Supabase (debería estar habilitado)

### "Promedio se calcula mal"
→ Abrí la consola del navegador y buscá errores en `ratingService.ts`

---

## 📊 Métricas de Rendimiento

### Tiempos esperados:
- Cargar lista de calificaciones: < 500ms
- Guardar calificación: < 1s
- Actualizar dashboard: < 300ms
- Filtrar/ordenar: instantáneo (< 100ms)

### Tamaño de base de datos:
- 100 outfits calificados = ~50KB
- 1000 outfits calificados = ~500KB

---

## ✨ Próximas Mejoras (Feature 13+)

- [ ] Estadísticas más avanzadas (gráficos)
- [ ] Comparar outfits lado a lado
- [ ] Exportar calificaciones a CSV
- [ ] Compartir outfits mejor calificados en comunidad
- [ ] Notificaciones de outfits poco usados
- [ ] Sugerencias basadas en calificaciones históricas
