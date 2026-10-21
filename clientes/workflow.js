(function (root) {
  'use strict';
  const transitions = {
    borrador: ['nueva', 'cancelada'],
    nueva: ['en_revision', 'informacion_pendiente', 'visita_programada', 'cancelada'],
    en_revision: ['informacion_pendiente', 'visita_programada', 'presupuestada', 'cancelada'],
    informacion_pendiente: ['en_revision', 'visita_programada', 'cancelada'],
    visita_programada: ['en_revision', 'informacion_pendiente', 'presupuestada', 'en_ejecucion', 'cancelada'],
    presupuestada: ['en_revision', 'aceptada', 'cancelada'],
    aceptada: ['visita_programada', 'en_ejecucion', 'cancelada'],
    en_ejecucion: ['finalizada', 'cancelada'],
    finalizada: [], cancelada: []
  };
  const quoteLabels = { sin_presupuesto: 'Sin presupuesto', enviado: 'Enviado', aceptado: 'Aceptado', rechazado: 'Rechazado', caducado: 'Caducado' };
  function allowed(status, order) {
    return [status, ...(transitions[status] || [])].filter(next =>
      !order || next === status || (next !== 'en_ejecucion' || quoteState(order) === 'aceptado') &&
      (next !== 'aceptada' || quoteState(order) === 'enviado'));
  }
  function quoteState(order, now = Date.now()) {
    if (order.quote_status) {
      if (order.quote_status === 'enviado' && order.quote_expires_at && new Date(order.quote_expires_at).getTime() <= now) return 'caducado';
      return order.quote_status;
    }
    if (['aceptada', 'en_ejecucion', 'finalizada'].includes(order.status) && order.quote_sent_at) return 'aceptado';
    if (!order.quote_sent_at) return 'sin_presupuesto';
    return order.quote_expires_at && new Date(order.quote_expires_at).getTime() <= now ? 'caducado' : 'enviado';
  }
  const api = { transitions, allowed, quoteState, quoteLabels };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ElejemWorkflow = api;
})(typeof window !== 'undefined' ? window : globalThis);
