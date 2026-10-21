/* ELEJEM · Etapa 5I · experiencia del área cliente (registro, acceso y solicitud).
   Capa progresiva: no cambia llamadas al servidor ni identificadores existentes. */
(function () {
  'use strict';
  if (window.ElejemUx5i) return;
  const $ = s => document.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // `state` es una constante global del portal (no vive en window).
  const portalState = () => { try { return typeof state !== 'undefined' ? state : null; } catch (_) { return null; } };
  const STEPS = ['Servicio', 'Detalles', 'Fotos', 'Asistente', 'Confirmar'];
  const svg = d => '<svg class="ux-ico" aria-hidden="true" viewBox="0 0 24 24">' + d + '</svg>';
  const ICONS = {
    home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    new: '<path d="M12 5v14M5 12h14"/>',
    tracking: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    whatsapp: '<path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3z"/>',
    account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };

  /* ---------- Utilidades de validación accesible ---------- */
  function msgFor(input) {
    let id = input.getAttribute('data-ux-msg');
    let el = id && document.getElementById(id);
    if (!el) {
      id = 'uxm-' + (input.id || input.name || Math.random().toString(36).slice(2));
      el = document.createElement('small');
      el.id = id; el.className = 'ux-field-msg'; el.setAttribute('aria-live', 'polite');
      (input.closest('.ux-pass') || input).insertAdjacentElement('afterend', el);
      input.setAttribute('data-ux-msg', id);
      const d = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (!d.includes(id)) input.setAttribute('aria-describedby', d.concat(id).join(' '));
    }
    return el;
  }
  function mark(input, error) {
    const el = msgFor(input);
    el.textContent = error || '';
    if (error) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    input.classList.toggle('ux-valid', !error && !!input.value.trim());
    return !error;
  }
  const digits = v => String(v || '').replace(/\D/g, '');
  const rules = {
    email: v => !v.trim() ? 'Indica tu correo electrónico.' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Revisa el correo: falta la @ o el dominio (ej. nombre@correo.com).'),
    phone: v => { const n = digits(v).length; return !v.trim() ? 'Indica un teléfono de contacto.' : (n >= 9 && n <= 15 ? '' : 'Revisa el teléfono: debe tener al menos 9 cifras (ej. 600 000 000).'); },
    name: v => v.trim().length < 3 ? 'Escribe tu nombre y apellido.' : '',
    postcode: v => !v.trim() || /^\d{5}$/.test(v.trim()) ? '' : 'El código postal tiene 5 cifras (ej. 28001).',
    city: v => v.trim().length < 2 ? 'Indica el municipio del servicio.' : '',
    description: v => v.trim().length < 10 ? 'Cuéntanos un poco más (al menos una frase) para poder valorarlo.' : '',
    password: v => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? '' : 'Mínimo 8 caracteres, con letras y números.'
  };

  /* ---------- Mostrar / ocultar contraseña ---------- */
  function passwordToggle(input) {
    if (!input || input.closest('.ux-pass')) return;
    const wrap = document.createElement('span');
    wrap.className = 'ux-pass';
    input.parentNode.insertBefore(wrap, input);
    wrap.append(input);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ux-pass-btn'; b.textContent = 'Mostrar';
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Mostrar contraseña');
    b.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.textContent = show ? 'Ocultar' : 'Mostrar';
      b.setAttribute('aria-pressed', String(show));
      b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
      input.focus({ preventScroll: true });
    });
    wrap.append(b);
  }

  /* ---------- Diálogo de cuenta (registro / acceso) ---------- */
  function enhanceAuthForm(dialog) {
    const form = dialog.querySelector('[data-form] form');
    if (!form || form.dataset.ux5i) return;
    form.dataset.ux5i = '1';
    form.noValidate = true; // mensajes propios en español, la comprobación final sigue en el código original
    const isRegister = !!form.querySelector('[name=repeat]');
    $$('[data-mode]', dialog).forEach(b => b.setAttribute('aria-pressed', String((b.dataset.mode === 'register') === isRegister)));
    const f = n => form.querySelector('[name=' + n + ']');
    if (f('phone')) { f('phone').setAttribute('inputmode', 'tel'); f('phone').setAttribute('placeholder', '600 000 000'); }
    if (f('email')) { f('email').setAttribute('inputmode', 'email'); f('email').setAttribute('autocapitalize', 'none'); f('email').setAttribute('spellcheck', 'false'); f('email').setAttribute('placeholder', 'nombre@correo.com'); }
    if (f('municipality')) f('municipality').setAttribute('autocomplete', 'address-level2');
    $$('input[type=password]', form).forEach(passwordToggle);

    // Lista de requisitos de contraseña que se va marcando mientras se escribe.
    let checklist = null;
    if (isRegister && f('password')) {
      const note = form.querySelector('.eq-notice');
      checklist = document.createElement('ul');
      checklist.className = 'ux-checklist'; checklist.id = 'uxPassRules';
      checklist.innerHTML = '<li data-r="len">8 caracteres o más</li><li data-r="abc">Al menos una letra</li><li data-r="num">Al menos un número</li><li data-r="eq">Las dos claves coinciden</li>';
      if (note) note.replaceWith(checklist); else f('password').closest('.es-grid').after(checklist);
      f('password').setAttribute('aria-describedby', 'uxPassRules');
    }
    const updateRules = () => {
      if (!checklist) return;
      const p = f('password').value, r = f('repeat') ? f('repeat').value : '';
      const ok = { len: p.length >= 8, abc: /[A-Za-z]/.test(p), num: /\d/.test(p), eq: !!p && p === r };
      $$('li', checklist).forEach(li => { li.classList.toggle('ok', ok[li.dataset.r]); li.setAttribute('aria-label', li.textContent + (ok[li.dataset.r] ? ': cumplido' : ': pendiente')); });
    };
    const check = input => {
      const n = input.name, v = input.value;
      if (n === 'email') return mark(input, rules.email(v));
      if (n === 'phone') return mark(input, rules.phone(v));
      if (n === 'full_name') return mark(input, rules.name(v));
      if (n === 'municipality') return mark(input, rules.city(v));
      if (n === 'password') return isRegister ? mark(input, rules.password(v)) : mark(input, v ? '' : 'Escribe tu contraseña.');
      if (n === 'repeat') return mark(input, v && v === f('password').value ? '' : 'Las claves no coinciden.');
      if (n === 'privacy') return mark(input, input.checked ? '' : 'Necesitamos tu aceptación para crear la cuenta.');
      return true;
    };
    form.addEventListener('input', e => { updateRules(); if (e.target.getAttribute('aria-invalid')) check(e.target); });
    form.addEventListener('focusout', e => { if (e.target.matches('input:not([type=checkbox])') && e.target.value) check(e.target); });
    form.addEventListener('change', e => { if (e.target.name === 'privacy') check(e.target); });
    // Antes del envío original: marcar todos los campos y llevar el foco al primero con error.
    form.addEventListener('submit', e => {
      const fields = $$('input[name]', form).filter(i => i.name !== 'address');
      const bad = fields.filter(i => !check(i));
      if (bad.length) {
        e.preventDefault(); e.stopImmediatePropagation();
        const err = form.querySelector('[data-error]');
        if (err) err.textContent = bad.length === 1 ? 'Revisa el campo marcado.' : 'Revisa los ' + bad.length + ' campos marcados.';
        bad[0].focus();
      }
    }, true);
    // Estado de carga del botón mientras el servidor responde.
    const submit = [...form.querySelectorAll('button')].filter(b => !b.type || b.type === 'submit').at(-1);
    if (submit) {
      submit.type = 'submit';
      new MutationObserver(() => { if (submit.disabled) submit.setAttribute('aria-busy', 'true'); else submit.removeAttribute('aria-busy'); })
        .observe(submit, { attributes: true, attributeFilter: ['disabled'] });
    }
    updateRules();
    const first = form.querySelector('input:not([type=checkbox])');
    if (first && dialog.open) setTimeout(() => first.focus({ preventScroll: true }), 30);
  }
  function watchDialog(d) {
    if (d.dataset.ux5i) return; d.dataset.ux5i = '1';
    const h = d.querySelector('h2'); if (h) { h.id = h.id || 'uxDlg' + Date.now(); d.setAttribute('aria-labelledby', h.id); }
    const slot = d.querySelector('[data-form]');
    if (slot) { new MutationObserver(() => enhanceAuthForm(d)).observe(slot, { childList: true }); enhanceAuthForm(d); }
    const close = d.querySelector('[data-close]'); if (close) close.setAttribute('aria-label', 'Cerrar');
  }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1 && n.matches('dialog.ec-dialog')) watchDialog(n); })))
    .observe(document.body, { childList: true });

  /* ---------- Asistente de solicitud ---------- */
  const status = $('#uxStepStatus');
  const announce = n => {
    $$('.progress i').forEach((i, idx) => { if (idx === n - 1) i.setAttribute('aria-current', 'step'); else i.removeAttribute('aria-current'); });
    if (status && n >= 1 && n <= STEPS.length) status.textContent = 'Paso ' + n + ' de ' + STEPS.length + ': ' + STEPS[n - 1];
  };
  function validateDetails() {
    const ok = [mark($('#city'), rules.city($('#city').value)), mark($('#postcode'), rules.postcode($('#postcode').value)), mark($('#description'), rules.description($('#description').value))];
    const firstBad = ['#city', '#postcode', '#description'].find((s, i) => !ok[i]);
    if (firstBad) { $(firstBad).focus(); return false; }
    return true;
  }
  if (typeof window.goStep === 'function') {
    const original = window.goStep;
    window.goStep = function (n) {
      const from = portalState() ? portalState().step : 0;
      if (from === 2 && n === 3 && !validateDetails()) return;
      original(n);
      announce(n);
      const step = $('#step' + n), h = step && step.querySelector('h1,h2');
      if (h && from && from !== n) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    };
    // Las funciones globales del portal resuelven goStep por nombre, así que este envoltorio se aplica a todos los botones.
    try { goStep = window.goStep; } catch (_) { /* entorno sin enlace global */ }
  }
  ['#city', '#postcode', '#description', '#customerName', '#customerPhone', '#customerEmail'].forEach(sel => {
    const el = $(sel); if (!el) return;
    const rule = { '#city': rules.city, '#postcode': rules.postcode, '#description': rules.description, '#customerName': rules.name, '#customerPhone': rules.phone, '#customerEmail': v => v.trim() ? rules.email(v) : '' }[sel];
    el.addEventListener('blur', () => { if (el.value || el.getAttribute('aria-invalid')) mark(el, rule(el.value)); });
    el.addEventListener('input', () => { if (el.getAttribute('aria-invalid')) mark(el, rule(el.value)); });
  });
  const postcode = $('#postcode');
  if (postcode) postcode.addEventListener('input', () => { const d = digits(postcode.value).slice(0, 5); if (d !== postcode.value) postcode.value = d; });
  // Contador de caracteres en la descripción.
  const desc = $('#description');
  if (desc) {
    const c = document.createElement('small'); c.className = 'ux-counter'; c.setAttribute('aria-hidden', 'true');
    const upd = () => { c.textContent = desc.value.length + ' / ' + (desc.maxLength > 0 ? desc.maxLength : 4000); };
    desc.insertAdjacentElement('afterend', c); desc.addEventListener('input', upd); upd();
  }
  // Paso 1: aviso cuando aún no se ha elegido servicio.
  const next1 = $('#step1 .next');
  if (next1) {
    const hint = document.createElement('small'); hint.className = 'ux-hint'; hint.id = 'uxStep1Hint'; hint.textContent = 'Elige una opción para continuar.';
    next1.parentNode.insertBefore(hint, next1); next1.setAttribute('aria-describedby', 'uxStep1Hint');
    new MutationObserver(() => { hint.hidden = !next1.disabled; }).observe(next1, { attributes: true, attributeFilter: ['disabled'] });
    hint.hidden = !next1.disabled;
  }
  $$('[data-service]').forEach(b => b.setAttribute('aria-pressed', String(b.classList.contains('selected'))));
  new MutationObserver(() => $$('[data-service]').forEach(b => b.setAttribute('aria-pressed', String(b.classList.contains('selected')))))
    .observe($('#serviceOptions') || document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // Fotos: zona de arrastre y recuento anunciado.
  const photos = $('#photos'), drop = photos && photos.closest('.upload');
  if (drop) {
    const count = document.createElement('p'); count.className = 'ux-photo-count'; count.setAttribute('role', 'status');
    drop.insertAdjacentElement('afterend', count);
    photos.addEventListener('change', () => { const n = photos.files.length; count.textContent = n ? n + (n === 1 ? ' fotografía lista' : ' fotografías listas') : ''; });
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('is-drag')));
    drop.addEventListener('drop', e => {
      e.preventDefault();
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      try { photos.files = e.dataTransfer.files; photos.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) { /* navegador sin soporte */ }
    });
  }
  // Envío final: marcar campos pendientes en lugar de solo mostrar un aviso breve.
  document.addEventListener('click', e => {
    if (!e.target.closest || !e.target.closest('#submitRequest')) return;
    const checks = [[$('#customerName'), rules.name], [$('#customerPhone'), rules.phone], [$('#customerEmail'), v => v.trim() ? rules.email(v) : '']];
    const bad = checks.filter(([el, r]) => el && !el.readOnly && !mark(el, r(el.value))).map(([el]) => el);
    const privacy = $('#privacy');
    if (privacy && !mark(privacy, privacy.checked ? '' : 'Marca la casilla para poder enviar la solicitud.')) bad.push(privacy);
    if (bad.length) { e.stopPropagation(); e.preventDefault(); bad[0].focus(); }
  }, true);

  /* ---------- Estados de carga (esqueleto) en Mis solicitudes ---------- */
  const list = $('#trackingList');
  if (list) {
    const sk = () => { const c = list.querySelector('.card'); const loading = list.children.length === 1 && /Cargando/.test(list.textContent); list.classList.toggle('ux-loading', loading); list.setAttribute('aria-busy', String(loading)); };
    new MutationObserver(sk).observe(list, { childList: true }); sk();
  }

  /* ---------- Iconos de navegación dibujados (sustituyen glifos de texto) ---------- */
  const iconize = () => $$('.rail button, .mobile-nav button').forEach(b => {
    const span = b.querySelector('span'); if (!span || span.dataset.ux) return;
    const key = b.dataset.view || (/whatsapp|contacto/i.test(b.id + b.textContent) ? 'whatsapp' : /cuenta/i.test(b.textContent) ? 'account' : '');
    if (!ICONS[key]) return;
    span.dataset.ux = '1'; span.setAttribute('aria-hidden', 'true'); span.innerHTML = svg(ICONS[key]);
  });
  iconize();
  const rail = $('.rail'); if (rail) new MutationObserver(iconize).observe(rail, { childList: true });

  /* ---------- Acceso del personal ---------- */
  passwordToggle($('#adminPassword'));

  announce(portalState() ? portalState().step || 1 : 1);
  window.ElejemUx5i = { rules, mark, validateDetails, passwordToggle, enhanceAuthForm };
})();
