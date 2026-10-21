# ELEJEM Operations — Community Source Snapshot

**Experimental open-source preparation based on the ELEJEM server export of 21 October 2026. This is NOT a standalone production-ready release.**

## Included
Static HTML, CSS and JavaScript for the shared customer portal and operations dashboard; operational modules cover requests, work orders, planning, CRM, quotes, reporting and profitability. Production Supabase credentials and endpoint references are **not** included in the OSS copy.

## Limitations
The actual PostgreSQL schema, Supabase RLS policies, Edge Functions, migrations, demo data, and build pipeline are **not** in this export. No functional production system can be reconstructed from the frontend alone. Do not connect this code to real ELEJEM customer data or its production backend.

## Local setup
1. Copy `clientes/config.example.js` to `clientes/config.js`.
2. Populate it with the URL and **publishable key** of your OWN Supabase test project, not another organization's live backend. Never place `service_role`, `sb_secret_`, or other server secrets in browser scripts.
3. Update the script reference from `config.example.js` to `config.js` in `clientes/index.html`.
4. Start a local static HTTP server from the repository root, e.g. `python3 -m http.server 8080`.
5. Open `http://localhost:8080/clientes/?area=gestion` to inspect the interface. Features requiring the missing backend will not be operational.

## Licensing and assets
Software source is made available under [GNU AGPL v3](LICENSE), without warranty. ELEJEM names and logos are trademarks of their respective owners, with no trademark permission granted by the source license. The planned community export substitutes original photos and brand artwork with neutral placeholders.

See [ARCHITECTURE.md](ARCHITECTURE.md), [ROADMAP.md](ROADMAP.md), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [SOURCE-NOTES.md](SOURCE-NOTES.md).
