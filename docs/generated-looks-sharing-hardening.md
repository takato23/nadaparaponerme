# Generación de looks compartidos - Hardening (publicación/almacenamiento)

## Qué cambia

- `generated_looks.storage_path` como ruta física explícita de Storage.
- `storage` bucket `generated-looks` pasa a **no público**.
- Se elimina acceso global público a objetos `generated-looks`.
- `is_public` y `share_token` quedan consistentes por `CHECK` (`is_public = true` exige token válido).
- Se revocan filas públicas heredadas con token inválido o ausente.
- Se eliminan tokens con formato inválido que no correspondan al nuevo esquema (para evitar links antiguos reutilizables por accidente).
- El acceso público se sirve con endpoint privado:
  - `POST /functions/v1/shared-look`
  - valida `token`, verifica `is_public = true` y devuelve URL firmada (15 minutos).
- Se agrega `cleanup_orphaned_generated_looks_storage()` para limpieza eventual de objetos huérfanos.

## Aplicar

1. Ejecutar migration:
   - `supabase db push` (o el comando que uses para aplicar migrations en tu flujo).
2. Desplegar función edge:
   - `supabase functions deploy shared-look`
3. Verificar en DB:
   - `SELECT storage_path FROM generated_looks LIMIT 5;`
   - `SELECT name, public FROM storage.buckets WHERE id = 'generated-looks';`
4. Verificar limpieza inicial (opcional):
   - `SELECT * FROM cleanup_orphaned_generated_looks_storage(TRUE, 20);`
5. Verificar consistencia de compartición:
- `SELECT id, is_public, share_token FROM generated_looks WHERE is_public = true AND (share_token IS NULL OR share_token !~ '^[a-f0-9]{48}$');`
- `SELECT id, share_token FROM generated_looks WHERE share_token IS NOT NULL AND share_token !~ '^[a-f0-9]{48}$';`

## Rollback

1. En caso de incidentes, revertir migration (o editar en orden inverso en entorno limpio):
   - eliminar check de consistencia:
     - `ALTER TABLE generated_looks DROP CONSTRAINT IF EXISTS generated_looks_public_share_token_check;`
   - restaurar `public = true` del bucket:
     - `UPDATE storage.buckets SET public = true WHERE id = 'generated-looks';`
   - recrear política pública de storage si fuera necesaria:
     - recrear manualmente una política `SELECT` global con tu patrón habitual.
   - recrear política pública de `generated_looks` si fuera necesaria para tu producto:
     - `CREATE POLICY ... ON generated_looks FOR SELECT USING (is_public = true);`
2. Desplegar una versión previa de `shared-look` o deshabilitar endpoint si quieres forzar el camino privado anterior:
   - `supabase functions delete shared-look` (o dejarla sin impacto si ya no se usa).

## Validación manual recomendada

- Compartir: generar link y abrir `/look/{token}` desde navegador sin sesión.
- Desactivar: el mismo link debe devolver `410`/`404`.
- Recompartir: debe producir token nuevo.
- Guardado con falla de DB (simulada): no debe quedar archivo huérfano.
- La vista pública debe seguir mostrando look, fecha, imagen y CTA.
