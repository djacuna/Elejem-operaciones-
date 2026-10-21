# ELEJEM — Operaciones

Repositorio privado para el panel de operaciones y el portal compartido de ELEJEM.

## Situación
- Fuente disponible: exportación de los archivos del servidor del 21/10/2026.
- El panel de operaciones comparte scripts, estilos y la aplicación de `clientes/`.
- La carpeta `operaciones/` del paquete contiene una redirección histórica.
- **Pendiente:** importar el código de la exportación preparada y recuperar por separado el código fuente del backend Supabase (migraciones, Edge Functions, RLS).

## Seguridad
Nunca subir secretos, archivos `.env`, claves privadas, copias de bases de datos ni datos reales de clientes. Las claves publicables del navegador no deben confundirse con claves privadas de servicio. Revisar cualquier archivo de configuración antes de publicar.

## Despliegue
Este repositorio no despliega a Hostinger automáticamente. Evitar conectar ramas de pruebas a la base de datos de producción.
