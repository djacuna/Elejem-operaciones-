# Coding agent guidelines (Codex and other tools)

Project: ELEJEM Operations community snapshot, a static browser frontend plus an **independent mock demo**.

1. Never connect tests to the commercial ELEJEM deployment or its real Supabase project. Use synthetic data and isolated test services.
2. Do not add secrets, tokens, personal data, screenshots from real customer accounts, or credential-bearing `.env` files to the repository.
3. Preserve isolation between production-facing source snapshots and the open-source demo. Demo code must be independent, with no network/API access.
4. Do not claim missing database schema, Edge Functions, policies or a production-ready SaaS are implemented; document gaps explicitly.
5. Changes involving users, roles, tenants or file access must be verified with dedicated authorization tests once the backend is available. Never assume client-side checks are sufficient.
6. Run `python3 scripts/check_snapshot.py` and `node --check` on every modified JavaScript file; expand tests for new behavior.
7. Review pull requests for accessibility, dependency risk, edge cases, licensing, and unintended outbound connections.
8. Keep tasks small, documented and auditable, and do not silently change deployment settings.

This file documents maintenance expectations; it is not a grant of repository access.
