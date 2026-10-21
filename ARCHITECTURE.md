# Architecture

## Current state
The deployed web export places customer and operations frontend files under `clientes/`. The operations UI is accessed via the `?area=gestion` mode, with a legacy entry in `operaciones/`. Production deployment uses a Supabase backend for authentication, data and server-side functions, but those sources are NOT part of the current export.

## OSS direction (not implemented)
A configurable multi-tenant shared core with isolated customer organisations, modular vertical extensions, scoped RBAC/RLS, per-organisation workflows and optional integrations. These are roadmap goals, not claims of an operational, audited SaaS framework.

## Critical blockers
Reproducible schema, data migrations, RLS and authorization tests, Edge Functions, neutral demo data, documentation, and CI must be provided before describing the application as independently deployable.
