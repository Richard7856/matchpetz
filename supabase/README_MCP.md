# Crear tablas con el MCP de Supabase

Si en Cursor tienes el MCP de Supabase conectado al proyecto **mascotas** (con `list_tables` y `execute_sql`):

1. **Comprobar tablas:** usa **list_tables** para ver si ya existen `profiles` y `alerts`.

2. **Crear tablas:** usa **execute_sql** y pega todo el contenido de:
   - `migrations/001_initial_schema_one_block.sql`

   Si `execute_sql` solo acepta una sentencia a la vez, puedes usar en su lugar **apply_migration** con el archivo:
   - `migrations/001_initial_schema.sql`

3. **Verificar:** vuelve a llamar **list_tables** y deberías ver `profiles` y `alerts`.
