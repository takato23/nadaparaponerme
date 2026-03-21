# Migración: Style Challenges Table

## Problema

Si ves el error:
```
Could not find the table 'public.style_challenges' in the schema cache
```

Significa que la tabla `style_challenges` no existe en tu base de datos de Supabase.

## Solución

Tienes dos opciones para crear la tabla:

### Opción 1: Aplicar solo la migración de Style Challenges (Recomendado)

Si ya tienes las otras tablas creadas, ejecuta solo esta migración:

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard/project/qpoojigxxswkpkfbrfiy/sql/new
2. Abre el archivo `supabase/migrations/apply_style_challenges.sql`
3. Copia y pega todo el contenido en el SQL Editor de Supabase
4. Ejecuta el script (Run)
5. Deberías ver el mensaje: "✅ Tabla style_challenges creada correctamente!"

### Opción 2: Ejecutar el setup completo

Si prefieres ejecutar todo el setup desde cero:

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard/project/qpoojigxxswkpkfbrfiy/sql/new
2. Abre el archivo `supabase/SETUP_COMPLETE.sql`
3. Copia y pega todo el contenido en el SQL Editor de Supabase
4. Ejecuta el script (Run)

**Nota:** El archivo `SETUP_COMPLETE.sql` ahora incluye la creación de la tabla `style_challenges`.

## Verificación

Después de ejecutar la migración, puedes verificar que la tabla fue creada correctamente:

1. Ve a la sección "Table Editor" en Supabase
2. Deberías ver la tabla `style_challenges` en la lista
3. La tabla debería tener las siguientes columnas:
   - id (UUID)
   - user_id (UUID)
   - type (TEXT)
   - difficulty (TEXT)
   - title (TEXT)
   - description (TEXT)
   - constraints (JSONB)
   - required_items (JSONB)
   - duration_days (INTEGER)
   - points_reward (INTEGER)
   - status (TEXT)
   - outfit_id (UUID)
   - created_at (TIMESTAMPTZ)
   - completed_at (TIMESTAMPTZ)
   - updated_at (TIMESTAMPTZ)

## Después de la migración

Una vez que la tabla esté creada:

1. Recarga la aplicación en el navegador
2. Los errores relacionados con `style_challenges` deberían desaparecer
3. La funcionalidad de "Style Challenges" debería funcionar correctamente

## Notas

- La migración es idempotente (usa `IF NOT EXISTS`), por lo que puedes ejecutarla varias veces sin problemas
- Las políticas RLS (Row Level Security) están configuradas para que los usuarios solo puedan ver y modificar sus propios desafíos
- Los triggers están configurados para actualizar automáticamente los timestamps `updated_at` y `completed_at`





