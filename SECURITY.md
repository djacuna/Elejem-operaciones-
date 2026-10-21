# Security policy

This open-source source export is incomplete and not certified for production use.

Do not expose personal information, authentication tokens, secret API keys, service-role credentials or real tenant data through GitHub Issues. Use a private security report where GitHub Private Vulnerability Reporting is enabled, or contact a maintainer through a non-public channel.

Each deployment must use its own backend. Enforce RLS and role/tenant isolation on every exposed data table and verify Storage and Edge Functions authorization. Supabase publishable keys are permitted in browser code but do not replace authorization controls. Never ship a `service_role` key or `sb_secret_` to browsers.
