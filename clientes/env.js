// OSS edition: no production credentials and no implicit connection to a live tenant.
(function () {
  'use strict';
  const cfg = window.ELEJEM_CONFIG || {};
  const url = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl || '') ? cfg.supabaseUrl.replace(/\/$/, '') : '';
  const key = /^sb_publishable_[a-zA-Z0-9_\-]+$/.test(cfg.supabaseKey || '') ? cfg.supabaseKey : '';
  window.ELEJEM_ENV = Object.freeze({
    name: cfg.environment || 'desarrollo',
    supabaseUrl: url,
    supabaseKey: key,
    missing: !(url && key),
    isProduction: false
  });
  if (!(url && key)) console.warn('ELEJEM OSS: configure su propio proyecto Supabase; la instancia de producción no está incluida.');
})();