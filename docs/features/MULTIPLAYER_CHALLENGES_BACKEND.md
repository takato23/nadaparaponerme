# Multiplayer Challenges - Backend Implementation

**Fecha**: 2025-01-16
**Feature**: #22 - Multiplayer Challenges (Desafíos Multiplayer)
**Tipo**: Backend Migration + Real-time Integration

---

## 📋 Resumen

Este documento describe la implementación completa del backend para el sistema de **Multiplayer Challenges** con Supabase, incluyendo base de datos real-time, voting system, y leaderboards.

## 🗂️ Archivos Creados

### 1. Migración SQL
**Archivo**: `supabase/migrations/20250116000009_multiplayer_challenges.sql`
**Tamaño**: 420+ líneas
**Descripción**: Esquema completo de base de datos con triggers, RLS, y real-time

**Tablas creadas**:
1. `challenges` - Desafíos con lifecycle management
2. `challenge_participants` - Relación many-to-many users ↔ challenges
3. `challenge_submissions` - Outfits submitted por participantes
4. `challenge_votes` - Sistema de votación (1 voto por usuario)
5. `user_challenge_stats` - Leaderboard stats (denormalized)
6. `challenge_achievements` - Achievements disponibles
7. `user_achievements` - Progress de achievements por usuario

**Features implementadas**:
- ✅ Row Level Security (RLS) policies completas
- ✅ Triggers automáticos para actualizar counters
- ✅ Real-time publication para voting y submissions
- ✅ Indexes optimizados para queries rápidas
- ✅ Helper functions para status updates y finalización
- ✅ Pre-populated achievements (6 tipos)

---

### 2. Servicio TypeScript
**Archivo**: `src/services/challengesService.ts`
**Tamaño**: 650+ líneas
**Descripción**: Cliente TypeScript completo para interactuar con Supabase

**Funciones principales**:
- `getChallenges()` - Listar challenges con filtros
- `getChallenge(id)` - Obtener challenge completo
- `createChallenge()` - Crear nuevo challenge
- `joinChallenge()` / `leaveChallenge()` - Participación
- `getChallengeSubmissions()` - Ver submissions
- `createSubmission()` - Enviar outfit
- `voteForSubmission()` / `removeVote()` - Votar
- `getLeaderboard()` - Top users por puntos
- `getUserStats()` - Stats de usuario específico
- `getAchievements()` / `getUserAchievements()` - Sistema de logros

**Real-time Subscriptions**:
- `subscribeToChallenge()` - Updates del challenge
- `subscribeToSubmissions()` - Voting en tiempo real
- `subscribeToLeaderboard()` - Leaderboard updates

**Validaciones**:
- `canJoinChallenge()` - Verifica eligibilidad
- `canSubmit()` - Verifica si puede enviar outfit
- `canVote()` - Verifica si puede votar

---

## 🚀 Pasos de Implementación

### Paso 1: Aplicar Migración SQL

**Opción A - Supabase Dashboard (Recomendado)**:
1. Abrir SQL Editor: https://supabase.com/dashboard/project/qpoojigxxswkpkfbrfiy/editor
2. Copiar contenido completo de `supabase/migrations/20250116000009_multiplayer_challenges.sql`
3. Pegar en el editor
4. Click en "Run" o ejecutar
5. Verificar que no hay errores

**Opción B - Supabase CLI** (requiere Docker + password):
```bash
# Asegurarse de que Docker esté corriendo
supabase db push

# Si pide password, ingresarlo
```

**Verificación**:
```sql
-- Verificar que las tablas fueron creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%challenge%';

-- Debería retornar:
-- challenges
-- challenge_participants
-- challenge_submissions
-- challenge_votes
-- challenge_achievements
-- user_achievements
-- user_challenge_stats
```

---

### Paso 2: Verificar RLS Policies

```sql
-- Ver todas las policies creadas
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE '%challenge%';

-- Debería haber ~15 policies
```

---

### Paso 3: Verificar Real-time Publication

```sql
-- Ver qué tablas tienen real-time habilitado
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- Debería incluir:
-- challenges
-- challenge_submissions
-- challenge_votes
-- user_challenge_stats
```

---

### Paso 4: Test Manual de Funciones

```sql
-- Test: Crear un challenge de prueba
SELECT create_challenge(
  'Test Challenge',
  'Desafío de prueba',
  'style_theme',
  'medium',
  '["minimalista", "monocromático"]',
  NOW(),
  NOW() + INTERVAL '7 days',
  NOW() + INTERVAL '8 days'
);

-- Test: Verificar que se creó
SELECT * FROM challenges ORDER BY created_at DESC LIMIT 1;

-- Test: Helper function para actualizar statuses
SELECT update_challenge_statuses();

-- Verificar que challenges pendientes pasaron a active si start_time <= NOW()
```

---

## 🔄 Integración con Frontend

### Opción 1: Migración Completa (Recomendado)

Actualizar `components/MultiplayerChallengesView.tsx` para usar el servicio real:

```typescript
import * as challengesService from '../src/services/challengesService';

// En lugar de:
// const challenges = generateMockChallenges();

// Usar:
useEffect(() => {
  async function loadChallenges() {
    const challenges = await challengesService.getChallenges({ status: statusFilter });
    setChallenges(challenges);
  }
  loadChallenges();
}, [statusFilter]);

// Real-time subscription:
useEffect(() => {
  const subscription = challengesService.subscribeToSubmissions(
    selectedChallenge.id,
    (updatedSubmissions) => {
      setSubmissions(updatedSubmissions);
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, [selectedChallenge]);
```

---

### Opción 2: Migración Gradual (Híbrido)

Mantener mock data pero agregar toggle para usar backend:

```typescript
const USE_SUPABASE = true; // Feature flag

useEffect(() => {
  if (USE_SUPABASE) {
    loadFromSupabase();
  } else {
    loadMockData();
  }
}, []);
```

---

## 📊 Queries Útiles

### Ver estadísticas del sistema

```sql
-- Challenges por status
SELECT status, COUNT(*) as count
FROM challenges
GROUP BY status;

-- Top 10 leaderboard
SELECT
  u.display_name,
  ucs.total_points,
  ucs.challenges_won,
  ucs.challenges_participated
FROM user_challenge_stats ucs
JOIN profiles u ON u.id = ucs.user_id
ORDER BY ucs.total_points DESC
LIMIT 10;

-- Challenges con más participación
SELECT
  c.title,
  c.participant_count,
  c.submission_count,
  c.status
FROM challenges c
ORDER BY c.participant_count DESC
LIMIT 10;

-- Submissions ganadoras
SELECT
  c.title as challenge,
  u.display_name as winner,
  cs.score as votes,
  cs.submitted_at
FROM challenge_submissions cs
JOIN challenges c ON c.id = cs.challenge_id
JOIN profiles u ON u.id = cs.user_id
WHERE cs.is_winner = true
ORDER BY cs.submitted_at DESC;
```

---

### Mantenimiento

```sql
-- Actualizar statuses de challenges (ejecutar periódicamente con cron)
SELECT update_challenge_statuses();

-- Limpiar challenges expirados (opcional)
DELETE FROM challenges
WHERE status = 'expired'
  AND created_at < NOW() - INTERVAL '30 days';

-- Recalcular global ranks (ejecutar después de muchos cambios)
UPDATE user_challenge_stats
SET global_rank = subquery.rank
FROM (
  SELECT
    user_id,
    ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
  FROM user_challenge_stats
) as subquery
WHERE user_challenge_stats.user_id = subquery.user_id;
```

---

## 🔐 Seguridad

### RLS Policies Implementadas

**Challenges**:
- ✅ Public challenges visibles para todos
- ✅ Private challenges solo para creator y participantes
- ✅ Solo el creator puede editar challenges
- ✅ Cualquier usuario autenticado puede crear challenges

**Participants**:
- ✅ Cualquiera puede ver participantes
- ✅ Solo usuarios autenticados pueden unirse
- ✅ Solo el usuario puede salirse de un challenge

**Submissions**:
- ✅ Submissions visibles para challenges públicos
- ✅ Solo participantes pueden enviar submissions
- ✅ Solo el owner puede editar su submission

**Votes**:
- ✅ Votos visibles para todos
- ✅ Solo usuarios autenticados pueden votar
- ✅ Solo durante fase de votación
- ✅ Solo el usuario puede borrar su voto

---

## 🎯 Próximos Pasos

### Funcionalidades Pendientes

1. **Cron Job para Status Updates**:
   - Configurar Supabase Edge Function o pg_cron
   - Ejecutar `update_challenge_statuses()` cada 5 minutos
   - Auto-completar challenges cuando voting_end_time pasa

2. **Push Notifications**:
   - Notificar cuando un challenge que sigues entra en voting
   - Notificar cuando eres el ganador
   - Notificar cuando alguien vota por tu submission

3. **Image Uploads para Challenges**:
   - Permitir custom banners para challenges
   - Almacenar en Supabase Storage
   - Agregar campo `banner_image_url` a tabla challenges

4. **Achievements Auto-unlock**:
   - Trigger function que verifica y desbloquea achievements
   - Ejecutar cuando user_challenge_stats cambia
   - Enviar notificación cuando se desbloquea

5. **Social Sharing**:
   - Generar imagen compartible de victoria
   - Links a redes sociales
   - OG tags para preview

---

## 🐛 Troubleshooting

### La migración falla

**Error**: "relation already exists"
- **Solución**: Algunas tablas ya existen. Borrar con `DROP TABLE IF EXISTS` y volver a ejecutar.

**Error**: "password authentication failed"
- **Solución**: Verificar credenciales en Supabase Dashboard > Settings > Database

---

### Real-time no funciona

**Verificar**:
1. ¿La tabla está en la publication?
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```

2. ¿El cliente tiene el canal correcto?
   ```typescript
   supabase.channel('challenge:${id}')
   ```

3. ¿RLS permite SELECT?
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'challenges';
   ```

---

### Queries lentas

**Verificar indexes**:
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE '%challenge%';
```

**Agregar index faltante**:
```sql
CREATE INDEX idx_missing ON table_name(column_name);
```

---

## 📚 Referencias

- **Supabase Real-time**: https://supabase.com/docs/guides/realtime
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Triggers**: https://www.postgresql.org/docs/current/sql-createtrigger.html
- **pg_cron**: https://supabase.com/docs/guides/database/extensions/pg_cron

---

## ✅ Checklist de Implementación

- [ ] **Migración aplicada** (SQL ejecutado sin errores)
- [ ] **Tablas verificadas** (7 tablas creadas)
- [ ] **RLS policies activas** (~15 policies)
- [ ] **Real-time habilitado** (4 tablas en publication)
- [ ] **Achievements pre-populated** (6 achievements)
- [ ] **Servicio TypeScript integrado** (frontend usando challengesService)
- [ ] **Real-time subscriptions funcionando** (voting en tiempo real)
- [ ] **Testing completo** (crear challenge, unirse, enviar, votar)
- [ ] **Cron job configurado** (update_challenge_statuses cada 5min)
- [ ] **Documentación actualizada** (CHANGELOG.md)

---

**Última actualización**: 2025-01-16
**Estado**: ✅ Backend completo - Listo para integración
**Siguiente**: Actualizar componente frontend para usar servicio real
