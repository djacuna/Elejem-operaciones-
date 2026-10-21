# ELEJEM Operations - open-source community preview

![Status: experimental](https://img.shields.io/badge/status-experimental-orange) ![License: AGPL--3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)

An experimental open-source snapshot of a service-operations platform for electrical maintenance and other field-service teams. The application aims to cover customer requests, work orders, scheduling, budgets, inventory, reporting and profitability in one configurable workspace.

**Maintainer:** [@djacuna](https://github.com/djacuna)  
**License:** GNU AGPL-3.0 (see [LICENSE](LICENSE))  
**Source:** a curated frontend export from 21 October 2026, not a complete standalone backend release.

> **Read before deploying.** This is an early source release, not a production-ready standalone system. Its original database schema, Supabase Edge Functions, SQL migrations and role/RLS tests have **not** been published. Do not use it with live customer records.

## Try the demo without credentials

The [standalone demo](demo/) uses **entirely fictional data**, runs in the browser without a database, and supports order-status changes, filtering and navigation between operations, customers and budgets.

Run from a local clone with:

```bash
python3 -m http.server 8080
```

Then open **http://localhost:8080/demo/**. Changes exist only in memory and reset on reload. The demo is a simplified illustration, **not** the actual operations portal.

## What's available

- `clientes/` - exported customer/operations web frontend (HTML, CSS, browser JavaScript).
- `operaciones/` - compatibility entry pointing at the operations area of the shared frontend.
- `demo/` - self-contained synthetic interactive preview, with no backend and no third-party scripts.
- `scripts/check_snapshot.py` - simple repository checks against hard-coded production endpoints and obvious secrets.
- `.github/workflows/oss-checks.yml` - automated JS syntax and snapshot checks on pushes and pull requests.
- `ROADMAP.md`, `ARCHITECTURE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SOURCE-NOTES.md` - scope, expectations and policies.

## Evaluate the exported frontend locally

1. Copy `clientes/config.example.js` to `clientes/config.js`.
2. Provide the URL and **publishable** key of an isolated **test** Supabase project you administer; **do not** use the actual ELEJEM production project.
3. Change the script reference in `clientes/index.html` from `config.example.js` to `config.js`.
4. Run `python3 -m http.server 8080` and open `http://localhost:8080/clientes/?area=gestion`.

The operations frontend will **not function fully** without the unpublished backend. Never put any service-role secret or OpenAI key into browser files. The publishable key is not authorization: appropriate RLS, permissions and secure server functions are essential.

## Project direction

Our objective is a reusable, multi-tenant and configuration-first open-source operations core: roles per organization, structured work orders, configurable flows, industry modules and external integrations. This **describes the roadmap**, not functionality independently verified or delivered in this preview. The project currently has no verified community adoption or published installable backend.

## Collaboration

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or a pull request. See the [roadmap](ROADMAP.md), [security policy](SECURITY.md), [architecture](ARCHITECTURE.md) and [source notes](SOURCE-NOTES.md). Issues track concrete tasks and maintainer work; pull requests should include reproducible tests and avoid production data.

Run the static checks with `python3 scripts/check_snapshot.py`, and (with Node 22+) run `node --check` on edited JavaScript files.

## Copyright, licensing and trademarks

The maintainers offer the software portions of this repository under GNU AGPL-3.0, **without warranty**. The names ELEJEM and other brand marks are not licensed as trademarks. Original photographs and corporate artwork have been excluded or replaced with generic placeholders in the OSS snapshot. Contributors must confirm that submitted material can be redistributed under the project's license.

This repository is independent of the live commercial ELEJEM site. Publishing it does not authorize access to any production service, account or database.
