# Manual SQL / Legacy scripts

Estos archivos **no** son migraciones automáticas de Supabase CLI.

Se movieron fuera de `supabase/migrations/` para evitar que `supabase migration list` los saltee silenciosamente y para reducir riesgos en deploy.

## Regla
- Todo cambio de esquema nuevo debe ir en `supabase/migrations/<timestamp>_name.sql`.
- Si un script es solo de auditoría, prueba o ejecución manual, queda en esta carpeta.

## Comando de validación
```bash
npm run db:check:migrations
```
Este comando falla si:
1. hay migraciones salteadas por nombre inválido,
2. hay desalineación entre migraciones locales y remotas.
