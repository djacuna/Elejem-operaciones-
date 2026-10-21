/* ELEJEM · Etapa 5J · Asistente para clientes.
   Triaje guiado por servicio, avisos de seguridad, respuestas basadas solo en lo que publica la web,
   memoria de la conversación en la sesión, opciones rápidas y paso a WhatsApp o teléfono.
   Se apoya en el asistente del servidor (ElejemBackend.askAssistant) para el texto libre y,
   si no responde, sigue funcionando por sí mismo. No envía nada: la solicitud se crea con el flujo de siempre. */
(function () {
  'use strict';
  const K = window.ElejemConocimiento || { faq: [], telefonoE164: '+', whatsapp: '', telefono: '', zona: 'Comunidad de Madrid' };
  const $ = s => document.querySelector(s);
  const st = () => { try { return state; } catch (_) { return window.state; } };
  if (!$('#messages') || !st()) return;
  const STORE = 'elejem_asistente_5j';
  const fast = () => !!window.__ASIST_FAST;
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svgI = (d, cls) => '<svg class="as-ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  const IC = {
    send: 'M4 12l16-8-6 16-2.5-6.5L4 12z',
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    chat: 'M4 5h16v11H9l-5 4V5z',
    warn: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.5',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    reset: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4'
  };

  /* ---------- Reglas ---------- */
  const DANGER = /humo|fuego|llama|incendi|chispa|chisporrot|quemad|olor a quemado|huele a quemado|derretid|cable pelado|cables? (al aire|suelto)|calambr|descarga|electrocu|me ha dado corriente|da corriente|(agua|inund|gotera|moja).{0,40}(enchufe|cuadro|luz|electric|cable|toma)|(enchufe|cuadro|luz|electric|cable|toma).{0,40}(agua|inund|gotera|mojad)|(muy )?calient|se calienta|ennegrecid/;
  const FIRE = /humo|fuego|llama|incendi/;
  const PRICE = /precio|cuanto (cuesta|vale|cobr|sale)|cuanto me (cuesta|costaria|sale)|tarifa|coste|costo|presupuesto aproximado|importe|euros|€|\bbarato|caro\b/;
  const ZONE = /zona|trabaj[aá]is en|vais a|ven[ií]s a|desplaz|cubr[ií]s|llegais|municipio|pueblo|fuera de madrid/;
  const HUMAN = /hablar con (una persona|alguien|un tecnico|un electricista|elejem)|persona real|llamad?me|quiero llamar|telefono|whatsapp|contactar|atencion humana/;
  const WHEN = /cuando (podeis|venis|vendr|pueden)|hoy mismo|esta tarde|cuanto tard|plazo|disponibilidad|horario/;
  const QWORD = /^(que|como|cuando|cuanto|cual|donde|por que|puedo|puede|se puede|hace falta|necesito|es necesari|teneis|haceis|trabajais|incluis|entregais|podeis)\b|\?/;

  const Q = {
    averia: [
      ['salta', '¿Salta alguna protección del cuadro cuando ocurre?', ['El diferencial', 'Un automático', 'El general', 'No salta nada', 'No lo sé']],
      ['alcance', '¿A qué parte afecta?', ['A toda la vivienda o local', 'A una zona o estancia', 'A un enchufe o aparato']],
      ['momento', '¿Cuándo pasa?', ['Al encender un aparato', 'Cuando llueve o hay humedad', 'Sin un patrón claro', 'Ha pasado una sola vez']],
      ['rearme', 'Si has intentado subir la protección, ¿qué ocurre? No lo fuerces si no sube.', ['Sube y aguanta', 'Sube y vuelve a saltar', 'No sube', 'No lo he probado']]
    ],
    emergencia: [
      ['fuego', '¿Ves humo o llamas en este momento?', ['Sí, ahora mismo', 'Ya no, pero lo hubo', 'No, es olor o calor']],
      ['corte', '¿Puedes bajar el interruptor general sin acercarte a la zona afectada?', ['Ya está cortado', 'Sí, puedo hacerlo', 'No es seguro acercarse']],
      ['elemento', '¿Qué elemento es?', ['Un enchufe', 'El cuadro eléctrico', 'Un cable o regleta', 'Un aparato', 'Una luminaria']]
    ],
    cargador: [
      ['plaza', '¿Dónde está la plaza?', ['Garaje comunitario', 'Vivienda unifamiliar', 'Parking de empresa o comercio']],
      ['equipo', '¿Tienes ya el cargador?', ['Ya lo tengo', 'Todavía no', 'Quiero que me aconsejéis']],
      ['distancia', 'Aproximadamente, ¿qué distancia hay desde el contador o el cuadro hasta la plaza?', ['Menos de 15 m', 'Entre 15 y 50 m', 'Más de 50 m', 'No lo sé']],
      ['potencia', '¿Sabes qué potencia tienes contratada?', ['Hasta 4,6 kW', 'Entre 4,6 y 6,9 kW', 'Más de 6,9 kW', 'No lo sé']]
    ],
    cuadro: [
      ['objetivo', '¿Qué buscas con el cuadro?', ['Sustituirlo', 'Ampliarlo', 'Resolver un fallo de una protección', 'Ordenarlo e identificarlo']],
      ['edad', '¿Qué antigüedad calculas que tiene?', ['Menos de 10 años', 'Entre 10 y 25 años', 'Más de 25 años', 'No lo sé']],
      ['diferencial', '¿Tiene interruptor diferencial?', ['Sí', 'No', 'No lo sé']]
    ],
    reforma: [
      ['alcance', '¿Qué alcance tiene la reforma?', ['Toda la vivienda', 'Algunas estancias', 'Un local u oficina']],
      ['estado', '¿En qué situación está el inmueble?', ['Hay obra en curso', 'Está habitado', 'Está vacío']],
      ['edad', '¿Sabes la antigüedad de la instalación actual?', ['Menos de 20 años', 'Más de 20 años', 'No lo sé']]
    ],
    local: [
      ['fase', '¿El local o la nave está funcionando o se prepara para una actividad nueva?', ['Está en funcionamiento', 'Nueva actividad', 'Está en obra']],
      ['actividad', '¿Qué actividad tiene o tendrá?', ['Hostelería', 'Comercio', 'Oficina', 'Taller o industria']],
      ['suministro', '¿Qué suministro tiene?', ['Monofásico', 'Trifásico', 'No lo sé']]
    ],
    boletin: [
      ['tramite', '¿Para qué lo necesitas?', ['Alta o reactivación', 'Aumento de potencia', 'Corregir deficiencias', 'Cambio de actividad']],
      ['inmueble', '¿De qué inmueble se trata?', ['Vivienda', 'Local o negocio', 'Comunidad']],
      ['quien', '¿Te lo ha pedido alguien?', ['La distribuidora', 'La comercializadora', 'La propiedad o el administrador', 'Nadie, es iniciativa mía']]
    ],
    menor: [
      ['que', '¿Qué hay que hacer?', ['Enchufes', 'Puntos de luz', 'Cambiar mecanismos', 'Conectar un aparato']],
      ['cuantos', '¿Cuántos puntos son, más o menos?', ['Uno', 'Entre 2 y 5', 'Más de 5']]
    ],
    otro: [
      ['inmueble', '¿En qué tipo de inmueble es?', ['Vivienda', 'Comunidad', 'Local u oficina', 'Nave']]
    ]
  };
  const PREF = ['preferencia', 'Última pregunta: ¿qué margen tienes para la visita? Es solo una preferencia; el equipo te confirmará la fecha.', ['Lo antes posible', 'Esta semana', 'Sin prisa']];
  const LABEL = { salta: 'Protección que salta', alcance: 'Alcance', momento: 'Cuándo ocurre', rearme: 'Al rearmar', fuego: 'Humo o llamas', corte: 'Suministro general', elemento: 'Elemento afectado', plaza: 'Plaza', equipo: 'Cargador', distancia: 'Distancia a la plaza', potencia: 'Potencia contratada', objetivo: 'Objetivo', edad: 'Antigüedad', diferencial: 'Diferencial', estado: 'Situación del inmueble', fase: 'Situación', actividad: 'Actividad', suministro: 'Suministro', tramite: 'Trámite', inmueble: 'Inmueble', quien: 'Lo solicita', que: 'Trabajo', cuantos: 'Puntos', preferencia: 'Margen para la visita', nota: 'Comentario' };

  const T = () => { const s = st(); if (!s.as5j || s.as5j.service !== s.service) s.as5j = { service: s.service, answers: {}, risk: false, fire: false, done: false, notes: [] }; return s.as5j; };
  const questions = svc => (Q[svc] || Q.otro).concat([PREF]);
  const pending = () => { const t = T(); return questions(st().service).find(q => !(q[0] in t.answers)); };

  /* ---------- Conocimiento de la web ---------- */
  const STOP = new Set('el la los las un una unos unas de del al a en y o que se es por para con mi me lo le su sus mas muy hay ya no si como cuando cuanto puedo puede tengo hace falta necesito'.split(' '));
  const toks = t => norm(t).replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.replace(/(es|s)$/, ''));
  const INDEX = K.faq.map(f => ({ f, q: new Set(toks(f.q)), a: new Set(toks(f.a)) }));
  function findFaq(text, svc) {
    const w = toks(text); if (w.length < 1) return null;
    let best = null, bs = 0;
    INDEX.forEach(it => { let s = 0; w.forEach(x => { if (it.q.has(x)) s += 2; else if (it.a.has(x)) s += 0.5; }); if (it.f.s === svc) s += 0.75; s = s / Math.max(2, w.length); if (s > bs) { bs = s; best = it.f; } });
    return bs >= 0.55 ? best : null;
  }

  /* ---------- Resumen y urgencia ---------- */
  function urgency() {
    const t = T(), a = t.answers, svc = st().service;
    if (t.fire || t.risk || svc === 'emergencia') return { level: 'alta', text: 'Prioridad alta: hay indicios de riesgo eléctrico.' };
    if ((svc === 'averia' && (/toda/i.test(a.alcance || '') || /no sube|vuelve a saltar/i.test(a.rearme || ''))) || /humedad|llueve/i.test(a.momento || '')) return { level: 'media', text: 'Conviene revisarlo pronto: el fallo afecta al uso normal de la instalación.' };
    return { level: 'normal', text: 'Prioridad normal.' };
  }
  function summaryLines() {
    const t = T(); const out = [];
    questions(st().service).forEach(q => { if (t.answers[q[0]] && t.answers[q[0]] !== '—') out.push(LABEL[q[0]] + ': ' + t.answers[q[0]]); });
    t.notes.slice(-3).forEach(n => out.push('Comentario: ' + n));
    return out;
  }
  const MARK = '— Resumen del asistente —';
  function applyToRequest() {
    const d = $('#description'); if (!d) return;
    const lines = summaryLines(), u = urgency();
    const block = MARK + '\n' + lines.map(l => '· ' + l).join('\n') + '\n· Urgencia orientativa: ' + u.level;
    const base = d.value.split(MARK)[0].trim();
    let v = (base ? base + '\n\n' : '') + block;
    const max = d.maxLength > 0 ? d.maxLength : 4000; if (v.length > max) v = v.slice(0, max);
    d.value = v; d.dispatchEvent(new Event('input', { bubbles: true }));
    T().applied = true; save();
  }

  /* ---------- Memoria de sesión ---------- */
  function save() { try { const s = st(); const f = {}; ['city', 'postcode', 'description'].forEach(id => { const el = $('#' + id); if (el) f[id] = el.value; }); sessionStorage.setItem(STORE, JSON.stringify({ service: s.service, chat: s.chat.slice(-40), as5j: s.as5j, fields: f })); } catch (_) { } }
  function restore() {
    try { const d = JSON.parse(sessionStorage.getItem(STORE) || 'null'); const s = st(); if (d && d.service === s.service && Array.isArray(d.chat) && d.chat.length) { s.chat = d.chat; s.as5j = d.as5j; Object.entries(d.fields || {}).forEach(([id, v]) => { const el = $('#' + id); if (el && !el.value && v) el.value = v; }); return true; } } catch (_) { }
    return false;
  }
  function clearMemory() { try { sessionStorage.removeItem(STORE); } catch (_) { } }

  /* ---------- Interfaz ---------- */
  const box = $('#messages');
  box.setAttribute('role', 'log'); box.setAttribute('aria-live', 'polite'); box.setAttribute('aria-relevant', 'additions'); box.setAttribute('aria-label', 'Conversación con el asistente'); box.tabIndex = 0;
  const card = box.closest('.chat-card'); if (card) card.classList.add('as5j');
  const online = card && card.querySelector('.online'); if (online) { online.innerHTML = '<i class="as-dot" aria-hidden="true"></i><span>Prepara tu solicitud contigo</span>'; online.classList.add('as-status'); }
  const head = card && card.querySelector('.chat-head');
  const title = head && head.querySelector('strong'); if (title) title.textContent = 'Asistente ELEJEM';
  if (head && !head.querySelector('.as-head-actions')) {
    const h = document.createElement('div'); h.className = 'as-head-actions';
    h.innerHTML = '<a class="as-icon-btn" data-as="tel" href="tel:' + K.telefonoE164 + '" aria-label="Llamar a ELEJEM">' + svgI(IC.phone) + '</a>' +
      '<a class="as-icon-btn" data-as="wa" target="_blank" rel="noopener" href="#" aria-label="Seguir por WhatsApp">' + svgI(IC.chat) + '</a>' +
      '<button type="button" class="as-icon-btn" data-as="reset" aria-label="Empezar de nuevo la conversación">' + svgI(IC.reset) + '</button>';
    head.appendChild(h);
    h.querySelector('[data-as=reset]').onclick = () => { if (!confirm('¿Empezar la conversación de nuevo? Se borran las respuestas de este paso.')) return; const s = st(); s.chat = []; s.as5j = null; clearMemory(); window.initChat(); };
    h.querySelector('[data-as=wa]').addEventListener('click', e => { e.currentTarget.href = waLink(); });
  }
  const voice = $('#voice'), sendBtn = $('#chatForm button[type=submit]');
  if (voice) voice.innerHTML = svgI(IC.mic);
  if (sendBtn) sendBtn.innerHTML = svgI(IC.send);
  const input = $('#chatInput'); if (input) { input.placeholder = 'Escribe aquí o elige una opción'; input.setAttribute('maxlength', '600'); }
  const ctx = $('.context-box');
  if (ctx && !$('#asProgress')) { const d = document.createElement('div'); d.id = 'asProgress'; d.className = 'as-progress'; ctx.insertBefore(d, ctx.querySelector('.notice')); }

  function waLink() {
    const s = st(), lines = summaryLines();
    const txt = 'Hola, os escribo desde el área de clientes de ELEJEM. Servicio: ' + serviceName() + '. Zona: ' + ([$('#city') && $('#city').value, $('#postcode') && $('#postcode').value].filter(Boolean).join(' ') || 'sin indicar') + '.' + (lines.length ? ' ' + lines.join('. ') + '.' : '') + (($('#description') && $('#description').value.split(MARK)[0].trim()) ? ' Detalle: ' + $('#description').value.split(MARK)[0].trim().slice(0, 300) : '');
    return 'https://wa.me/' + K.whatsapp + '?text=' + encodeURIComponent(txt);
  }
  function actionsHtml(list) {
    return '<div class="as-actions">' + list.map(a => {
      if (a === '112') return '<a class="as-act danger" href="tel:112">' + svgI(IC.phone) + 'Llamar al 112</a>';
      if (a === 'tel') return '<a class="as-act" href="tel:' + K.telefonoE164 + '">' + svgI(IC.phone) + 'Llamar a ELEJEM</a>';
      if (a === 'wa') return '<a class="as-act" data-wa target="_blank" rel="noopener" href="' + esc(waLink()) + '">' + svgI(IC.chat) + 'WhatsApp</a>';
      if (a === 'apply') return '<button type="button" class="as-act primary" data-apply>' + svgI(IC.check) + 'Añadir a mi solicitud y continuar</button>';
      if (a.startsWith('link:')) { const [, href, label] = a.split('|'); return '<a class="as-act ghost" href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + '</a>'; }
      return '';
    }).join('') + '</div>';
  }
  function render() {
    const s = st(); const last = s.chat.length - 1;
    box.innerHTML = s.chat.map((m, i) => {
      const role = m.role === 'user' ? 'user' : 'ai';
      let h = '<div class="msg ' + role + (m.kind ? ' as-' + m.kind : '') + '">';
      if (m.kind === 'safety') h += '<strong class="as-safety-title">' + svgI(IC.warn) + 'Primero, tu seguridad</strong>';
      h += esc(m.text).replace(/\n/g, '<br>');
      if (m.source) h += '<a class="as-source" href="' + esc(m.source.p) + '" target="_blank" rel="noopener">Fuente: ' + esc(m.source.t) + ' · elejem.com</a>';
      if (m.lines) h += '<ul class="as-summary">' + m.lines.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>';
      if (m.actions) h += actionsHtml(m.actions);
      h += '<span class="meta">' + (role === 'ai' ? 'Asistente ELEJEM' : 'Tú') + '</span></div>';
      if (i === last && role === 'ai' && m.chips && m.chips.length && !s.aiBusy) h += '<div class="as-chips" role="group" aria-label="Respuestas rápidas">' + m.chips.map(c => '<button type="button" class="as-chip" data-chip="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>';
      return h;
    }).join('') + (s.aiBusy ? '<div class="msg ai as-typing" aria-label="El asistente está escribiendo"><i></i><i></i><i></i><span class="as-sr">El asistente está escribiendo</span></div>' : '');
    box.scrollTop = box.scrollHeight;
    renderProgress(); save();
  }
  function renderProgress() {
    const p = $('#asProgress'); if (!p || !st().service) return;
    const qs = questions(st().service), t = T(), done = qs.filter(q => q[0] in t.answers).length, u = urgency();
    p.innerHTML = '<div class="context-row"><small>Preguntas</small><strong>' + done + ' de ' + qs.length + '</strong></div><div class="as-bar" role="progressbar" aria-label="Avance del asistente" aria-valuemin="0" aria-valuemax="' + qs.length + '" aria-valuenow="' + done + '"><i style="width:' + Math.round(done / qs.length * 100) + '%"></i></div>' +
      '<div class="context-row"><small>Urgencia orientativa</small><strong class="as-u-' + u.level + '">' + ({ alta: 'Alta', media: 'Media', normal: 'Normal' }[u.level]) + '</strong></div>';
  }
  box.addEventListener('click', e => {
    const chip = e.target.closest('[data-chip]'); if (chip) { handleUser(chip.dataset.chip, true); return; }
    if (e.target.closest('[data-apply]')) { applyToRequest(); if (typeof window.generateSummary === 'function') window.generateSummary(); }
    const wa = e.target.closest('[data-wa]'); if (wa) wa.href = waLink();
  });

  /* ---------- Motor de conversación ---------- */
  const say = (text, extra) => st().chat.push(Object.assign({ role: 'ai', text }, extra || {}));
  const wait = ms => new Promise(r => setTimeout(r, fast() ? 0 : ms));
  function askNext(prefix) {
    const q = pending(), t = T();
    if (q) { say((prefix ? prefix + ' ' : '') + q[1], { chips: q[2].concat(q[0] === 'preferencia' ? [] : ['Prefiero contarlo']) }); return; }
    if (!t.done) {
      t.done = true;
      const u = urgency();
      say((prefix ? prefix + ' ' : '') + 'Con esto el equipo ya tiene una idea clara. Esto es lo que he anotado:', { lines: summaryLines().concat(['Urgencia orientativa: ' + u.level]), actions: ['apply', 'wa'], chips: ['Tengo otra pregunta'] });
      say('Si lo ves bien, lo añado a la descripción y pasamos a confirmar. El diagnóstico y el presupuesto los prepara ELEJEM después de revisarlo; aquí no doy importes.');
    } else say((prefix ? prefix + ' ' : '') + '¿Algo más que quieras que el técnico sepa? Si no, puedes añadir el resumen y continuar.', { actions: ['apply'] });
  }
  function safety(text) {
    const t = T(); t.risk = true; if (FIRE.test(norm(text)) && !/ya no|no hay|sin humo|no veo/.test(norm(text))) t.fire = true;
    const msg = t.fire
      ? 'Si hay humo o llamas, sal de la zona y llama al 112. No uses agua sobre nada que tenga corriente. Si puedes llegar al cuadro sin pasar cerca, baja el interruptor general.'
      : 'No toques el elemento afectado ni retires tapas. Si puedes llegar al cuadro sin acercarte a la zona, baja el interruptor general y desconecta lo que esté enchufado ahí. Si notas calor, olor fuerte o chispas, aléjate.';
    say(msg, { kind: 'safety', actions: t.fire ? ['112', 'tel'] : ['tel', 'wa'] });
  }
  function local(text) {
    const n = norm(text), svc = st().service;
    if (PRICE.test(n)) {
      return { text: 'Por aquí no te puedo dar un precio, y tampoco quiero darte uno inventado. ELEJEM prepara el presupuesto según el alcance real, después de ver la información y, si hace falta, la instalación. Cuantos más datos y fotos dejes ahora, más ajustado y rápido saldrá.', actions: ['wa'] };
    }
    if (HUMAN.test(n)) return { text: 'Claro. Puedes llamar al ' + K.telefono + ' o escribir por WhatsApp; te preparo el mensaje con lo que ya me has contado para que no tengas que repetirlo.', actions: ['tel', 'wa'] };
    if (ZONE.test(n)) {
      const cp = (n.match(/\b\d{5}\b/) || [])[0];
      const out = cp && !/^28/.test(cp);
      return { text: 'ELEJEM trabaja en la ' + K.zona + '.' + (out ? ' El código postal ' + cp + ' no parece de la Comunidad de Madrid; déjalo indicado y el equipo te confirma si puede atenderlo.' : ' Indica tu municipio y código postal en la solicitud y el equipo lo tiene en cuenta al organizar la visita.') };
    }
    if (WHEN.test(n)) return { text: 'No te puedo prometer una hora desde aquí: el equipo revisa la solicitud y te contacta para concretar la visita. Si es urgente o hay riesgo, mejor llama directamente.', actions: ['tel'] };
    const f = QWORD.test(n) ? findFaq(text, svc) : null;
    if (f) return { text: f.a, source: { p: f.p, t: f.t } };
    return null;
  }
  async function remote(text) {
    const B = window.ElejemBackend;
    if (!B || typeof B.askAssistant !== 'function') return null;
    try {
      const s = st(), hist = s.chat.slice(0, -1).filter(m => !m.kind).slice(-8);
      const r = await B.askAssistant(text, hist, { service: s.service, service_name: serviceName(), municipality: $('#city') ? $('#city').value : '', postcode: $('#postcode') ? $('#postcode').value : '', triage: summaryLines(), risk: T().risk });
      if (!r || !r.reply || r.fallback || r.blocked) return null;
      if (/€|\d[\d.,]*\s*(eur|euros?)\b/i.test(r.reply)) return null; // nunca mostrar importes
      return { text: String(r.reply).slice(0, 900), urgent: !!r.urgent };
    } catch (_) { return null; }
  }
  async function handleUser(text, fromChip) {
    const s = st(); if (s.aiBusy) return;
    text = String(text || '').trim().slice(0, 600); if (!text) return;
    s.chat.push({ role: 'user', text }); s.aiBusy = true; render();
    const t = T(), n = norm(text), q = pending();
    try {
      await wait(380 + Math.min(700, text.length * 8));
      if (DANGER.test(n) && !/^(no|nada)\b/.test(n)) {
        if (q && !fromChip) t.answers[q[0]] = text.slice(0, 120);
        if (q && fromChip) t.answers[q[0]] = text;
        safety(text); askNext('Cuando estés en un sitio seguro, seguimos.'); return;
      }
      if (fromChip && text === 'Prefiero contarlo') { say('Adelante, cuéntamelo con tus palabras.'); if (q) t.answers[q[0]] = '—'; return; }
      if (fromChip && text === 'Tengo otra pregunta') { say('Dime. Puedo resolver dudas sobre cómo trabaja ELEJEM con lo que explica su web, o pasarte con el equipo.', { actions: ['tel', 'wa'] }); return; }
      if (fromChip && q && q[2].includes(text)) {
        t.answers[q[0]] = text;
        if (q[0] === 'fuego' && /^Sí/.test(text)) { t.fire = true; safety('humo'); }
        if (q[0] === 'corte' && /No es seguro/.test(text)) say('Bien hecho en no acercarte. No lo intentes; el equipo lo tendrá en cuenta.');
        if (q[0] === 'rearme' && /vuelve a saltar|No sube/.test(text)) say('No insistas en subirla: si vuelve a saltar, la protección está haciendo su trabajo. Desenchufa lo que había en esa zona y déjalo así hasta la revisión.');
        if (q[0] === 'potencia' && /No lo sé/.test(text)) say('Sin problema, aparece en la factura de la luz. Si puedes, adjunta una foto de la factura o del contador.');
        if (q[0] === 'diferencial' && text === 'No') { t.risk = true; say('Gracias. Un cuadro sin diferencial deja la instalación sin protección frente a derivaciones; lo marco para que el técnico lo priorice.'); }
        askNext(); return;
      }
      const l = local(text);
      if (l) { say(l.text, { source: l.source, actions: l.actions }); if (q) st().chat[st().chat.length - 1].chips = q[2]; return; }
      if (q) { t.answers[q[0]] = text.slice(0, 160); askNext('Anotado.'); return; }
      t.notes.push(text.slice(0, 200));
      const r = await remote(text);
      if (r) { say(r.text); if (r.urgent) safety(text); return; }
      say('Lo dejo anotado para el técnico. Si quieres, añade fotos de la zona o del cuadro; ayudan mucho a preparar la visita.', { actions: ['apply'] });
    } finally { s.aiBusy = false; render(); setTimeout(() => { if (!fromChip && input) input.focus(); }, 0); }
  }

  const INTRO = {
    averia: 'Vamos a acotar la avería con unas preguntas cortas. Si en algún momento ves humo, chispas o notas olor a quemado, dímelo y paramos.',
    emergencia: 'Lo primero es que estés a salvo. No toques la zona afectada. Si hay humo, fuego o riesgo inmediato, sal y llama al 112.',
    cargador: 'Para orientar el punto de recarga necesito cuatro datos rápidos. Si no sabes alguno, no pasa nada.',
    cuadro: 'Te hago tres preguntas sobre el cuadro y lo dejamos preparado para el técnico.',
    reforma: 'Cuéntame un poco el alcance de la reforma para que la propuesta se ajuste a lo que necesitas.',
    local: 'Un local o una nave depende mucho de la actividad. Te pregunto lo justo.',
    boletin: 'Antes de un boletín hay que revisar la instalación; con estas respuestas el técnico sabrá qué comprobar.',
    menor: 'Esto suele ser rápido de describir. Dos preguntas y listo.',
    otro: 'Cuéntame qué necesitas con tus palabras; te haré alguna pregunta si hace falta.'
  };
  window.renderChat = render;
  window.initChat = function () {
    const s = st();
    $('#ctxService').textContent = serviceName(); $('#ctxCity').textContent = ($('#city').value || 'Sin indicar'); $('#ctxPhotos').textContent = s.photos.length + ' archivo' + (s.photos.length === 1 ? '' : 's');
    if (!s.chat.length) restore();
    if (s.chat.length && s.as5j && s.as5j.service === s.service) return render();
    s.chat = []; s.as5j = null; T();
    const d = $('#description') ? $('#description').value.split(MARK)[0].trim() : '';
    if (d && DANGER.test(norm(d))) { say(INTRO[s.service] || INTRO.otro); safety(d); askNext('Por lo que has descrito, cuando estés a salvo seguimos.'); }
    else { say(INTRO[s.service] || INTRO.otro, s.service === 'emergencia' ? { kind: 'safety', actions: ['112', 'tel'] } : null); askNext(); }
    render();
  };
  window.aiReply = text => handleUser(text, false);
  const form = $('#chatForm');
  if (form) form.onsubmit = e => { e.preventDefault(); const v = input.value.trim(); if (!v || st().aiBusy) return; input.value = ''; handleUser(v, false); };

  // La prioridad de la solicitud tiene en cuenta los riesgos detectados por el asistente.
  if (typeof window.assessment === 'function') {
    const base = window.assessment;
    window.assessment = function () { const a = base(); const t = st().as5j; if (t && (t.risk || t.fire) && !a.risky) { a.risky = true; } return a; };
    try { assessment = window.assessment; } catch (_) { }
  }
  // Al cambiar de servicio se reinicia la conversación; tras enviar la solicitud se borra la memoria.
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-service],[data-start]')) { const s = st(); setTimeout(() => { if (s.as5j && s.as5j.service !== s.service) { s.chat = []; s.as5j = null; clearMemory(); } }, 0); } }, true);
  const ok = $('#success');
  if (ok) new MutationObserver(() => { if (!ok.classList.contains('hidden')) { const s = st(); clearMemory(); s.chat = []; s.as5j = null; } }).observe(ok, { attributes: true, attributeFilter: ['class'] });

  window.ElejemAsistente = { findFaq, local: t => local(t), urgency, summaryLines, waLink, handle: handleUser, applyToRequest, DANGER };
})();
