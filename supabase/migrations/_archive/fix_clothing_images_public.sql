-- Cambiar el bucket clothing-images a público
UPDATE storage.buckets
SET public = true
WHERE id = 'clothing-images';

-- Las políticas RLS siguen protegiendo la escritura (solo el dueño puede subir/borrar)
-- Pero ahora cualquiera puede ver las imágenes con la URL pública
