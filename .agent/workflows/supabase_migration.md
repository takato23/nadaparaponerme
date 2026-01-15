---
description: Manage Supabase migrations and update types.
---
# Supabase Migration Workflow

1.  **Create Migration**:
    *   Ask for a descriptive name for the migration.
    *   Run:
    ```bash
    supabase migration new <migration_name>
    ```

2.  **Edit Migration**:
    *   The user or agent should edit the generated SQL file in `supabase/migrations`.

3.  **Apply Migration (Local)**:
    *   Apply the changes to the local instance:
    ```bash
    supabase db reset # OR supabase migration up
    ```
    *(Note: `db reset` is destructive to local data, use with caution. `migration up` is safer for applying new changes.)*

4.  **Update Types**:
    *   Regenerate the TypeScript types:
    ```bash
    supabase gen types typescript --local > types/supabase.ts
    ```
