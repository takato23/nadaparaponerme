# 🧪 PRUEBAS RECOMENDADAS: PERFIL PROFESIONAL

## Objetivo
Validar que el sistema profesional funciona correctamente según las especificaciones.

---

## ✅ PRUEBA 1: Outfit Formal

**Prompt**: "Outfit para una entrevista de trabajo importante"

**Qué esperar**:
- ✅ Formalidad detectada: 4/5
- ✅ Elimina prendas deportivas/casuales
- ✅ Sección "Tu Cuerpo": Explica cómo el outfit balancea tu silueta
- ✅ Sección "Tus Colores": Explica armonía cromática con tu paleta
- ✅ Sección "El Mood": Explica por qué es apropiado para entrevista

**Validación**:
- [ ] Aparece la sección "¿Por qué te favorece?"
- [ ] Las 3 sub-secciones tienen contenido específico
- [ ] No sugiere sneakers ni ropa deportiva
- [ ] Los colores mencionados están en tu paleta estacional

---

## ✅ PRUEBA 2: Outfit Casual

**Prompt**: "Look relajado para tomar café con amigos"

**Qué esperar**:
- ✅ Formalidad detectada: 2/5
- ✅ Permite prendas casuales
- ✅ Explicación de morfología más relajada
- ✅ Colores pueden ser más vibrantes (según tu paleta)

**Validación**:
- [ ] El outfit es casual pero coordinado
- [ ] La explicación menciona "casual" o "relajado"
- [ ] Respeta tu tipo de cuerpo
- [ ] Los colores siguen siendo armónicos

---

## ✅ PRUEBA 3: Outfit con Restricción

**Prompt**: "Outfit para cena elegante"

**Qué esperar**:
- ✅ Formalidad detectada: 4-5/5
- ✅ No sugiere prendas de tu lista "Hates"
- ✅ Explicación detallada de elegancia
- ✅ Mood color elegante de fondo

**Validación**:
- [ ] No incluye prendas que marcaste en "Hates"
- [ ] La explicación es más sofisticada
- [ ] El mood del outfit es "elegante"

---

## ✅ PRUEBA 4: Comparación Sin Perfil

**Objetivo**: Ver la diferencia entre con/sin perfil profesional

**Pasos**:
1. Genera un outfit (con perfil)
2. Observa las explicaciones educativas
3. Ve a "Perfil Profesional" → Wizard
4. (Opcional) Nota mental de las diferencias

**Qué observar**:
- ✅ **Con perfil**: Sección "¿Por qué te favorece?" con 3 explicaciones
- ✅ **Con perfil**: Mood color de fondo sutil
- ✅ **Con perfil**: Explicaciones personalizadas a tu morfología/paleta

---

## 🐛 REPORTE DE ISSUES

Si algo no funciona como esperado, anota:

### Issue Template:
```
**Qué probaste**: [Prompt usado]
**Qué esperabas**: [Comportamiento esperado]
**Qué obtuviste**: [Comportamiento actual]
**Captura de pantalla**: [Si es posible]
```

---

## 📊 VALIDACIÓN COMPLETA

### Checklist de Funcionalidades:

**Wizard de Onboarding**:
- [ ] Se abre correctamente
- [ ] 5 pasos funcionan
- [ ] Se guarda el perfil
- [ ] Toast de confirmación aparece

**Generación de Outfits**:
- [ ] Usa el perfil automáticamente
- [ ] Respeta morfología (equilibra silueta)
- [ ] Respeta colorimetría (colores armónicos)
- [ ] Filtra prendas incompatibles (hates, clima, formalidad)

**Explicaciones Educativas**:
- [ ] Sección "¿Por qué te favorece?" aparece
- [ ] Sub-sección "Tu Cuerpo" es específica
- [ ] Sub-sección "Tus Colores" es específica
- [ ] Sub-sección "El Mood" es específica
- [ ] Mood color de fondo aparece (sutil)

**Persistencia**:
- [ ] El perfil se guarda en localStorage
- [ ] Al recargar la página, el perfil sigue ahí
- [ ] La tarjeta muestra ✅ cuando está completo
- [ ] Se puede editar re-abriendo el wizard

---

## 🎯 SIGUIENTE NIVEL (Opcional)

Si todo funciona bien, puedes probar:

### Prueba Avanzada 1: Diferentes Morfologías
- Edita tu perfil y cambia el tipo de cuerpo
- Genera el mismo outfit
- Observa cómo cambian las explicaciones

### Prueba Avanzada 2: Diferentes Paletas
- Edita tu perfil y cambia la paleta estacional
- Genera un nuevo outfit
- Observa si los colores sugeridos cambian

### Prueba Avanzada 3: Preferencias Estrictas
- Añade muchas cosas a tu lista "Hates"
- Intenta generar un outfit
- Verifica que ninguna prenda de "Hates" aparece

---

## ✅ RESULTADO ESPERADO

Si todas las pruebas pasan:
- ✅ El sistema profesional está funcionando correctamente
- ✅ Implementación completa según recomendaiconesdemiamiga.md
- ✅ Listo para uso real

Si alguna prueba falla:
- Anota el issue específico
- Compártelo para debugging
- Se puede ajustar fácilmente
