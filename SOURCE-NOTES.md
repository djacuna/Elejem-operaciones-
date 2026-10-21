# Source provenance

The candidate release derives from the server export supplied by the project owner on 21 October 2026. The static resources under `clientes/` include the operations UI and shared customer UI; the legacy `operaciones/` directory redirects into it.

This is not a complete source checkout of the project's backend. The provided export does not include Supabase database schema migrations, security policies or Edge Functions. An OSS candidate removes production-specific settings, branding assets and direct backend connections. Deployment fidelity and legal rights to third-party portions still require verification.
