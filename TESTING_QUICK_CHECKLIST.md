# Quick Testing Checklist - AI Image Generation

## 🚀 Pre-Deploy: Critical Tests (30 min)

### Backend Verification
- [ ] Edge Function deployada: `supabase functions deploy generate-image`
- [ ] Secrets configurados: `supabase secrets list` → GEMINI_API_KEY presente
- [ ] CORS headers permiten tu dominio
- [ ] Database migrations aplicadas: `supabase db push`

### Frontend Verification
- [ ] Build exitoso sin errores: `npm run build`
- [ ] No console.errors en dev: `npm run dev` → open DevTools
- [ ] TypeScript check pasa: `tsc --noEmit` (si configurado)

### Happy Path Test (5 min)
1. [ ] Login → Home → Click "AI Fashion Designer"
2. [ ] Ingresar prompt: "remera blanca oversize estilo streetwear"
3. [ ] Seleccionar categoría "top" + estilo "streetwear"
4. [ ] Click "Generar Diseño con IA"
5. [ ] Esperar 10-15s → Imagen se genera exitosamente
6. [ ] Imagen es fotorrealista con fondo blanco
7. [ ] Click "Agregar al Armario" → Prenda guardada en closet

**Result**: ✅ Pass / ❌ Fail

---

## 🔥 Critical Tests (1 hour)

### Rate Limiting
- [ ] Generar 5 imágenes con usuario free
- [ ] Intentar generar 6ta → Bloqueado con error en español
- [ ] Error message claro: "Has alcanzado tu límite diario"
- [ ] Al día siguiente, puede generar de nuevo

### Error Handling
- [ ] Prompt vacío → Botón disabled
- [ ] Desconectar internet → Error de red claro
- [ ] API error → Mensaje amigable (no técnico)

### Mobile Testing
- [ ] Abrir en iPhone/Android (DevTools → Device toolbar)
- [ ] Modal responsive (no scroll horizontal)
- [ ] Botones táctiles funcionan correctamente
- [ ] Imagen se ve bien en mobile

### Security
- [ ] Network tab → Buscar "GEMINI_API_KEY" → No encontrado ✅
- [ ] API key solo en Edge Function env vars
- [ ] Storage URLs firmadas (si implementado)

---

## 📊 Performance Tests (30 min)

### Timing
- [ ] Generación completa <15s (medir 10 veces, calcular P95)
- [ ] UI no se congela durante generación
- [ ] Loading states visibles con mensajes de progreso

### Resources
- [ ] Memory usage <100MB (Chrome DevTools → Memory tab)
- [ ] Network payload <1MB por imagen
- [ ] Lighthouse score ≥90 (Audits tab)

---

## 🎨 UX Tests (15 min)

### Dark Mode
- [ ] Toggle dark mode → Modal se ve bien
- [ ] Imagen visible en ambos modos
- [ ] Textos legibles

### Accessibility
- [ ] Keyboard navigation: Tab → Enter funciona
- [ ] Botones tienen tamaño mínimo 44px (iOS)
- [ ] Error messages tienen contraste suficiente

---

## 🐛 Edge Cases (30 min)

### Prompts Especiales
- [ ] Emojis: "👗 vestido rojo ✨" → Funciona
- [ ] Tildes: "pantalón azul oscuro" → Funciona
- [ ] Inglés: "black leather jacket" → Funciona
- [ ] Muy corto: "remera" → Funciona (resultado genérico OK)

### Navegación
- [ ] Cerrar modal durante generación → Request cancelado
- [ ] Botón "Atrás" → Modal se cierra
- [ ] Múltiples tabs → No duplican requests

---

## ✅ Pass Criteria

**Minimum to deploy**:
- ✅ Happy path works 100%
- ✅ Rate limiting works
- ✅ Error messages en español
- ✅ API key nunca expuesto
- ✅ Mobile responsive
- ✅ Performance <15s

**If any critical test fails → DO NOT DEPLOY**

---

## 📝 Bug Report Template (Quick)

```
Bug #_: [Título]
Severity: Critical/High/Medium/Low
Steps: 1. ... 2. ... 3. ...
Expected: [...]
Actual: [...]
Browser/Device: [...]
```

---

## 🎯 Quick Commands

```bash
# Deploy Edge Function
supabase functions deploy generate-image

# Check secrets
supabase secrets list

# Build frontend
npm run build

# Run dev
npm run dev

# TypeScript check
tsc --noEmit

# Database migrations
supabase db push
```

---

## 📞 Quick Links

- **Full Testing Plan**: `/TESTING_AI_IMAGE_GENERATION.md`
- **Recommendations**: `/TESTING_RECOMMENDATIONS.md`
- **Feature Docs**: `/CHANGELOG.md` (Feature 20)
- **Code**: `components/AIFashionDesignerView.tsx`

---

**Time Required**: 2-3 hours total for all tests
**Owner**: QA Team
**Last Updated**: 2024-11-20
