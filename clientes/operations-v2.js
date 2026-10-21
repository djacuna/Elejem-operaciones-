(function () {
  'use strict';
  function quoteText(q){return ({sin_presupuesto:'Todavía no se ha enviado ningún presupuesto',enviado:'Presupuesto enviado al cliente, pendiente de respuesta',aceptado:'Presupuesto aceptado por el cliente',rechazado:'Presupuesto rechazado por el cliente',caducado:'Presupuesto caducado sin respuesta'})[q]||'Presupuesto: '+(ElejemWorkflow.quoteLabels[q]||'sin datos');}

  let sourceFilter = 'web';let initializedRole=null;
  let statusFilter = 'all';
  let searchTerm = '';
  let sortMode = 'newest';

  const $ops = selector => document.querySelector(selector);
  const $$ops = selector => [...document.querySelectorAll(selector)];
  const finalStatuses = ['finalizada', 'cancelada'];

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function localDate(value) {
    if (!value) return 'Sin programar';
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  }

  function datetimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function ageInfo(order) {
    if (finalStatuses.includes(order.status)) {
      return { tone: order.status === 'cancelada' ? 'red' : 'green', label: statusLabels[order.status] || order.status };
    }
    const days = Math.max(0, Math.floor((Date.now() - new Date(order.created_at).getTime()) / 86400000));
    if (days <= 2) return { tone: 'green', label: days === 0 ? 'Hoy' : days + (days === 1 ? ' día' : ' días') };
    if (days <= 6) return { tone: 'amber', label: days + ' días' };
    return { tone: 'red', label: days + ' días · revisar' };
  }

  function quoteRemaining(order) {
    if (!order.quote_expires_at || ElejemWorkflow.quoteState(order) === 'aceptado' || ElejemWorkflow.quoteState(order) === 'rechazado') return null;
    const ms = new Date(order.quote_expires_at).getTime() - Date.now();
    if (ms <= 0) return 'Vencido';
    const days = Math.ceil(ms / 86400000);
    return days + (days === 1 ? ' día restante' : ' días restantes');
  }

  function currentRows() {
    const rows = adminCases.filter(order => {
      const sourceMatches = sourceFilter==='all'||(order.source || 'web') === sourceFilter;
      const statusMatches = statusFilter === 'all' || (statusFilter === 'alta' ? order.priority !== 'normal' : order.status === statusFilter);
      const haystack = [order.public_code, order.customer_name, order.customer_phone, order.customer_email, order.municipality, order.postcode, order.title, order.description].join(' ').toLocaleLowerCase('es');
      return sourceMatches && statusMatches && (!searchTerm || haystack.includes(searchTerm));
    });
    return rows.sort((a, b) => {
      if (sortMode === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortMode === 'priority') return Number(b.priority !== 'normal') - Number(a.priority !== 'normal') || new Date(b.created_at) - new Date(a.created_at);
      if (sortMode === 'visit') return (a.visit_scheduled_at ? new Date(a.visit_scheduled_at) : Infinity) - (b.visit_scheduled_at ? new Date(b.visit_scheduled_at) : Infinity);
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  renderCases = function (rows,options={}) {
    const role=window.ElejemStaffSession?.role;if(role!==initializedRole){initializedRole=role;sourceFilter=role==='technician'?'all':'web';$$ops('[data-source-filter]').forEach(b=>b.classList.toggle('active',b.dataset.sourceFilter===sourceFilter));}rows=rows||currentRows();
    const list = $ops('#caseList');
    const panel = $ops('#caseDetail');
    if(!options.preservePanel){panel.classList.remove('open');
    panel.innerHTML = '<p style="color:var(--muted);margin:0">Selecciona una orden para ver y gestionar sus detalles.</p>';}
    const summary = $ops('#opsResultSummary');
    if (summary) summary.textContent = `${rows.length} ${rows.length === 1 ? 'orden encontrada' : 'órdenes encontradas'}${searchTerm ? ' para “' + searchTerm + '”' : ''}`;
    if (!rows.length) {
      list.innerHTML = '<div style="padding:28px;color:var(--muted)">No hay órdenes en esta bandeja y filtro.</div>';
      return;
    }
    list.innerHTML = rows.map((order, index) => {
      const age = ageInfo(order);
      return `<div class="case" data-case="${index}"><div class="case-id">${escapeHtml(order.public_code)}</div><div class="case-title">${escapeHtml(services.find(s => s.id === order.service_type)?.name || order.title || 'Servicio eléctrico')}<small>${escapeHtml(order.municipality)} · ${escapeHtml(order.customer_name)}</small></div><span class="age-chip ${age.tone}">${age.label}</span><strong>${escapeHtml(statusLabels[order.status] || order.status)}</strong></div>`;
    }).join('');
    $$ops('[data-case]').forEach(element => element.onclick = () => {
      $$ops('[data-case]').forEach(other => other.classList.remove('active'));
      element.classList.add('active');
      renderCase(rows[Number(element.dataset.case)]);
    });
  };

  renderAdminMetrics = function () {
    const active = adminCases.filter(order => !finalStatuses.includes(order.status));
    const overdue = active.filter(order => ageInfo(order).tone === 'red').length;
    const expiring = adminCases.filter(order => ElejemWorkflow.quoteState(order) === 'enviado').length;
    const visits = active.filter(order => order.visit_scheduled_at).length;
    $ops('#adminMetrics').innerHTML = `<div class="metric"><small>Órdenes activas</small><strong>${active.length}</strong></div><div class="metric"><small>Atención requerida</small><strong style="color:${overdue ? 'var(--red)' : 'inherit'}">${overdue}</strong></div><div class="metric"><small>Visitas programadas</small><strong>${visits}</strong></div><div class="metric"><small>${window.ElejemStaffSession?.role==='technician'?'Tareas de ejecución':'Presupuestos vigentes'}</small><strong>${window.ElejemStaffSession?.role==='technician'?active.filter(o=>o.assignment_task==='ejecucion').length:expiring}</strong></div>`;
    if ($ops('#webOrderCount')) $ops('#webOrderCount').textContent = adminCases.filter(order => (order.source || 'web') === 'web').length;
    if ($ops('#internalOrderCount')) $ops('#internalOrderCount').textContent = adminCases.filter(order => order.source === 'internal').length;
  };

  renderCase = async function (order) {
    if (!order) return;
    const panel = $ops('#caseDetail');
    const age = ageInfo(order);
    const fieldOnly=window.ElejemStaffSession?.role==='technician';
    const remaining = fieldOnly?null:quoteRemaining(order);
    const quoteState = ElejemWorkflow.quoteState(order);
    const allowed = ElejemWorkflow.allowed(order.status, order);
    const trackingUrl = window.ElejemArea ? ElejemArea.portalUrl({ seguimiento: order.tracking_token }) : `${location.origin}${location.pathname}?seguimiento=${order.tracking_token}`;
    panel.classList.add('open');
    panel.dataset.orderId = order.id;
    panel.innerHTML = `<button class="btn ghost" id="closeCase" style="float:right">Cerrar</button><span class="badge ${order.priority === 'normal' ? 'normal' : 'high'}">${escapeHtml(({normal:'Prioridad normal',alta:'Prioridad alta',emergencia:'Emergencia'})[order.priority] || 'Prioridad normal')}</span> <span class="age-chip ${age.tone}">${age.label}</span><h2>${escapeHtml(order.public_code)}</h2><p style="color:var(--muted)">${escapeHtml(services.find(s => s.id === order.service_type)?.name || order.title || 'Servicio eléctrico')} · ${order.source === 'internal' ? 'Orden interna' : 'Solicitud web'}</p><div class="ops-meta"><div><small>Alta</small><strong>${localDate(order.created_at)}</strong></div><div><small>Última actualización</small><strong>${localDate(order.updated_at)}</strong></div></div><div class="context-row"><small>Cliente</small><strong>${escapeHtml(order.customer_name)}</strong></div><div class="context-row"><small>Teléfono</small><strong>${escapeHtml(order.customer_phone)}</strong></div><div class="context-row"><small>Correo</small><strong>${escapeHtml(order.customer_email || 'No indicado')}</strong></div><div class="context-row"><small>Ubicación</small><strong>${escapeHtml(order.address || '')}${order.address ? ' · ' : ''}${escapeHtml(order.municipality)}${order.postcode ? ' · ' + escapeHtml(order.postcode) : ''}</strong></div><div class="ops-contact-actions"><a class="btn secondary" href="tel:${escapeHtml(order.customer_phone)}">Llamar</a><a class="btn secondary" href="mailto:${escapeHtml(order.customer_email || 'support@example.invalid')}?subject=${encodeURIComponent('Orden ' + order.public_code)}">Correo</a></div><div class="divider"></div><h3>Descripción</h3><p style="color:#c4cfda;font-size:14px">${escapeHtml(order.description)}</p>${order.source === 'web' && !fieldOnly ? `<h3>Valoración preliminar</h3><p style="color:#c4cfda;font-size:14px">${escapeHtml(order.ai_preliminary_assessment || 'Pendiente')}</p>` : ''}<h3>Notas internas</h3><textarea id="adminNotes" placeholder="Acuerdos, materiales, accesos o recordatorios del equipo…">${escapeHtml(order.internal_notes || '')}</textarea>${!fieldOnly&&order.field_notes?`<h3>Observaciones del técnico</h3><p style="white-space:pre-wrap">${escapeHtml(order.field_notes)}</p>`:''}<h3>Fotografías</h3><div class="photos" id="adminPhotos"><div class="photo-placeholder">Cargando…</div></div><div class="field"><label>Fecha de visita</label><input id="adminVisit" type="datetime-local" value="${datetimeLocal(order.visit_scheduled_at)}"></div><div class="field"><label>Estado del trabajo</label><select id="adminStatus">${Object.entries(statusLabels).filter(([value]) => allowed.includes(value)).map(([value, label]) => `<option value="${value}" ${value === order.status ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${fieldOnly?'':`<div class="ops-note"><strong>${escapeHtml(quoteText(quoteState))}</strong></div>`}<div class="field"><label>Motivo de cancelación</label><textarea id="adminCancelReason" placeholder="Obligatorio al cancelar">${escapeHtml(order.cancelled_reason || '')}</textarea></div>${remaining ? `<div class="ops-note">Vigencia del presupuesto: <span class="countdown">${remaining}</span><br><small>Vence: ${localDate(order.quote_expires_at)}</small></div>` : ''}${order.cancelled_reason ? `<div class="ops-note" style="border-color:var(--red)"><strong>Motivo de cancelación</strong><br>${escapeHtml(order.cancelled_reason)}</div>` : ''}<button class="btn primary" id="savePlanning" style="width:100%;margin-top:12px">Guardar planificación y estado</button><button class="btn secondary" id="sendQuote" style="width:100%;margin-top:8px">Registrar presupuesto externo · 7 días</button><button class="btn secondary" id="copyTracking" style="width:100%;margin-top:8px">Copiar enlace de seguimiento</button><a class="btn secondary" href="https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent('Hola ' + order.customer_name + ', puedes consultar la orden ' + order.public_code + (fieldOnly?' de ELEJEM.':' de ELEJEM aquí: '+trackingUrl))}" target="_blank" rel="noopener" style="width:100%;margin-top:8px">Enviar seguimiento por WhatsApp</a><h3>Historial de gestión</h3><div id="orderAudit" aria-live="polite">Cargando historial…</div>${finalStatuses.includes(order.status) ? '<button class="btn danger" id="deleteCase" style="width:100%;margin-top:8px">Eliminar orden</button>' : ''}`;
    ElejemQuotes.mountStaff(order,panel);
    ElejemReports.mountStaff(order,panel);
    ElejemWorkforce.mountSite(order,panel);
    $ops('#closeCase').onclick = () => panel.classList.remove('open');
    $ops('#savePlanning').onclick = async () => {
      const nextStatus = $ops('#adminStatus').value;
      const visitValue = $ops('#adminVisit').value;
      const changes = { status: nextStatus, visit_scheduled_at: visitValue ? new Date(visitValue).toISOString() : null };
      changes.internal_notes = $ops('#adminNotes').value.trim() || null;
      if (nextStatus === 'cancelada') {
        changes.cancelled_reason = $ops('#adminCancelReason').value.trim();
        if (!changes.cancelled_reason) { toast('Indica el motivo de cancelación.'); return; }
      }
      try {
        const updated = await ElejemBackend.updateRequestDetails(order.id, changes, order.workflow_version);
        Object.assign(order, updated);
        toast('Planificación actualizada');
        renderAdminMetrics();
        renderCases();
      } catch (error) { toast(error.message); }
    };
    $ops('#sendQuote').disabled = !['en_revision', 'visita_programada', 'presupuestada'].includes(order.status) || quoteState === 'aceptado';
    $ops('#sendQuote').onclick = async () => {
      try {
        const updated = await ElejemBackend.updateRequestDetails(order.id, { send_quote: true }, order.workflow_version);
        Object.assign(order, updated);
        toast('Presupuesto registrado con vigencia de 7 días');
        renderAdminMetrics();
        renderCases();
      } catch (error) { toast(error.message); }
    };
    $ops('#copyTracking').onclick = async () => {
      try { await navigator.clipboard.writeText(trackingUrl); toast('Enlace de seguimiento copiado'); }
      catch (_) { prompt('Copia este enlace:', trackingUrl); }
    };
    if ($ops('#deleteCase')) $ops('#deleteCase').onclick = async () => {
      if (!confirm('¿Eliminar definitivamente ' + order.public_code + '?')) return;
      try {
        await ElejemBackend.deleteRequest(order.id);
        adminCases = adminCases.filter(item => item.id !== order.id);
        renderAdminMetrics(); renderCases(); toast('Orden eliminada');
      } catch (error) { toast(error.message); }
    };
    if (window.ElejemHistory) ElejemHistory.load($ops('#orderAudit'), order);
    else ElejemBackend.listOrderAudit(order.id).then(events => {
      if (panel.dataset.orderId !== order.id || !$ops('#orderAudit')) return;
      $ops('#orderAudit').innerHTML = events.length ? events.map(event => {
        const before = event.previous_values || {};
        const after = event.new_values || {};
        const stateChange = before.status !== after.status && after.status;
        const title = event.action === 'INSERT' ? 'Orden registrada' : stateChange ? `${statusLabels[before.status] || 'Sin estado'} → ${statusLabels[after.status] || 'Nuevo estado'}` : 'Orden actualizada';
        return `<div class="ops-note"><strong>${escapeHtml(title)}</strong><br><small>${escapeHtml(localDate(event.occurred_at))} · ${event.actor_kind === 'system' || !event.actor_id ? 'Sistema' : event.actor_kind === 'customer' ? 'Cliente' : 'Personal de ELEJEM'}</small></div>`;
      }).join('') : '<p>Todavía no hay movimientos en esta orden.</p>';
    }).catch(() => {
      if (panel.dataset.orderId === order.id && $ops('#orderAudit')) $ops('#orderAudit').textContent = 'No se pudo cargar el historial. Inténtalo de nuevo.';
    });
    if(window.ElejemStaff)ElejemStaff.mountOrder(order,panel);
    try {
      const photos = await ElejemBackend.listRequestPhotos(order.id);
      $ops('#adminPhotos').innerHTML = photos.length ? photos.map(photo => `<button type="button" data-admin-photo><img src="${photo.url}" alt="${escapeHtml(photo.file_name)}"></button>`).join('') : '<div class="photo-placeholder">Sin fotos</div>';
    } catch (_) { $ops('#adminPhotos').innerHTML = '<div class="photo-placeholder">No disponibles</div>'; }
  };

  function openInternalModal() {
    $ops('#internalOrderModal').hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeInternalModal() {
    $ops('#internalOrderModal').hidden = true;
    document.body.style.overflow = '';
  }

  $ops('#internalService').innerHTML = services.map(service => `<option value="${service.id}">${escapeHtml(service.name)}</option>`).join('');
  $ops('#newInternalOrder').onclick = openInternalModal;
  $ops('#closeInternalOrder').onclick = closeInternalModal;
  $ops('#internalPhotos').onchange = event => { $ops('#internalPhotoCount').textContent = `${event.target.files.length} fotografía(s) seleccionada(s)`; };
  $ops('#internalOrderForm').onsubmit = async event => {
    event.preventDefault();
    const submit = event.submitter;
    submit.disabled = true;
    submit.textContent = 'Creando orden…';
    const serviceId = $ops('#internalService').value;
    const service = services.find(item => item.id === serviceId);
    try {
      const order = await ElejemBackend.createInternalRequest({
        service_type: serviceId, title: service?.name || 'Servicio eléctrico',
        description: $ops('#internalDescription').value.trim(), municipality: $ops('#internalCity').value.trim(), postcode: $ops('#internalPostcode').value.trim() || null,
        assigned_to:$ops('#internalTechnician')?.value||null,assignment_task:'visita_presupuesto',
        customer_name: $ops('#internalName').value.trim(), customer_phone: $ops('#internalPhone').value.trim(), customer_email: $ops('#internalEmail').value.trim() || null,
        priority: $ops('#internalPriority').value, status: $ops('#internalVisit').value ? 'visita_programada' : 'nueva', internal_notes: $ops('#internalNotes').value.trim() || null,
        visit_scheduled_at: $ops('#internalVisit').value ? new Date($ops('#internalVisit').value).toISOString() : null,
        ai_preliminary_assessment: 'Orden registrada directamente por el equipo de ELEJEM.', ai_risk_detected: $ops('#internalPriority').value !== 'normal'
      }, [...$ops('#internalPhotos').files]);
      adminCases.unshift(order);
      sourceFilter = 'internal'; statusFilter = 'all';
      $$ops('[data-source-filter]').forEach(button => button.classList.toggle('active', button.dataset.sourceFilter === sourceFilter));
      $$ops('[data-admin-filter]').forEach(button => button.classList.toggle('active', button.dataset.adminFilter === 'all'));
      event.target.reset(); $ops('#internalCity').value = 'Madrid'; $ops('#internalPhotoCount').textContent = '';
      closeInternalModal(); renderAdminMetrics(); renderCases();
      toast(order.warnings?.length ? 'Orden creada; revisa algún adjunto' : `Orden ${order.public_code} creada`);
    } catch (error) { toast(error.message); }
    finally { submit.disabled = false; submit.textContent = 'Crear orden y número de seguimiento'; }
  };

  $$ops('[data-source-filter]').forEach(button => button.onclick = () => {
    sourceFilter = button.dataset.sourceFilter;
    $$ops('[data-source-filter]').forEach(other => other.classList.toggle('active', other === button));
    renderCases();
  });
  $$ops('[data-admin-filter]').forEach(button => button.onclick = () => {
    statusFilter = button.dataset.adminFilter;
    $$ops('[data-admin-filter]').forEach(other => other.classList.toggle('active', other === button));
    renderCases();
  });
  $ops('#adminSearch').oninput = event => {
    searchTerm = event.target.value.trim().toLocaleLowerCase('es');
    renderCases();
  };
  $ops('#adminSort').onchange = event => {
    sortMode = event.target.value;
    renderCases();
  };

  async function renderSharedTracking(token) {
    showView('tracking',{skipLoadTracking:true});
    const box = $ops('#trackingList');
    box.innerHTML = '<div class="card"><p style="color:var(--muted);margin:0">Consultando la orden…</p></div>';
    try {
      const order = await ElejemBackend.getTrackedOrder(token);
      if (!order) throw new Error('El enlace de seguimiento no es válido');
      const fieldOnly=window.ElejemStaffSession?.role==='technician';
    const remaining = fieldOnly?null:quoteRemaining(order);
      box.innerHTML = `<article class="card"><span class="badge ${order.status === 'cancelada' ? 'high' : 'normal'}">${escapeHtml(statusLabels[order.status] || order.status)}</span><h2 style="margin:14px 0 3px">${escapeHtml(order.public_code)}</h2><p style="color:var(--muted)">${escapeHtml(services.find(s => s.id === order.service_type)?.name || order.title)} · ${escapeHtml(order.municipality)}</p>${order.visit_scheduled_at ? `<div class="ops-note"><strong>Visita programada</strong><br>${localDate(order.visit_scheduled_at)}</div>` : '<div class="ops-note">La fecha de visita todavía no ha sido programada.</div>'}${remaining ? `<div class="ops-note"><strong>${escapeHtml(quoteText(ElejemWorkflow.quoteState(order)))}</strong><br><span class="countdown">${remaining}</span> · hasta ${localDate(order.quote_expires_at)}</div>` : ''}${order.cancelled_reason ? `<div class="ops-note" style="border-color:var(--red)"><strong>Orden cancelada</strong><br>${escapeHtml(order.cancelled_reason)}</div>` : ''}<div data-request-quote></div><a class="btn secondary" href="https://wa.me/?text=${encodeURIComponent('Hola ELEJEM, consulto la orden ' + order.public_code)}" target="_blank" rel="noopener">Consultar por WhatsApp</a></article>`;
      ElejemQuotes.mountRequestQuote(box.querySelector('[data-request-quote]'),null,token);
    } catch (error) { box.innerHTML = `<div class="card"><h2>No pudimos abrir la orden</h2><p style="color:var(--muted)">${escapeHtml(error.message)}</p></div>`; }
  }

  const trackingToken = new URLSearchParams(location.search).get('seguimiento');
  if (trackingToken) renderSharedTracking(trackingToken);
})();
