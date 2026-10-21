(function () {
  'use strict';

  // OSS: require explicit per-installation configuration. Never fall back to ELEJEM production.
  const ENV = window.ELEJEM_ENV || {};
  const SUPABASE_URL = ENV.supabaseUrl || 'https://entorno-sin-configurar.invalid';
  const SUPABASE_KEY = ENV.supabaseKey || 'sin-clave';
  const STAFF_MODE=(window.ElejemArea?window.ElejemArea.staff:new URLSearchParams(location.search).get('area')==='gestion');
  const SESSION_KEY = STAFF_MODE?'elejem_supabase_staff_session_v1':'elejem_supabase_session_v1';

  function readSession() {
    try { let session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');if(!session&&STAFF_MODE){const previous=JSON.parse(localStorage.getItem('elejem_supabase_session_v1')||'null');if(previous?.user&&!previous.user.is_anonymous){session=previous;localStorage.setItem(SESSION_KEY,JSON.stringify(session));}}return session; }
    catch (_) { return null; }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  async function authRequest(path, body) {
    const response = await fetch(SUPABASE_URL + path, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.msg || data.message || data.error_description || 'No se pudo iniciar la sesión segura');
    return data;
  }

  async function getSession() {
    let session = readSession();
    const now = Math.floor(Date.now() / 1000);
    if (session && session.access_token && session.expires_at > now + 60) return session;
    if (session && session.refresh_token) {
      try {
        const refreshed = await authRequest('/auth/v1/token?grant_type=refresh_token', { refresh_token: session.refresh_token });
        return saveSession({ ...refreshed, expires_at: now + refreshed.expires_in });
      } catch (_) { localStorage.removeItem(SESSION_KEY); }
    }
    const created = await authRequest('/auth/v1/signup', {});
    return saveSession({ ...created, expires_at: now + created.expires_in });
  }

  // 10H · Errores comprensibles: el servidor responde a veces en inglés o con códigos técnicos. El mensaje original
  // se conserva en error.technical (y el código en error.code) para el soporte, pero en pantalla solo se ve español claro.
  function friendlyError(data, status) {
    const raw = String((data && (data.message || data.msg || data.error_description || data.error)) || '');
    const code = String((data && data.code) || '');
    const missing = code === 'PGRST202' || /could not find the function|schema cache/i.test(raw);
    let text = raw;
    if (code === 'network') text = 'No hay conexión con ELEJEM. Revisa la conexión a internet e inténtalo de nuevo.';
    else if (missing) text = 'Esta función todavía no está activada en el servidor.';
    else if (/jwt|jws|token is expired|invalid claim|not authenticated/i.test(raw) || status === 401) text = 'Tu sesión ha caducado. Vuelve a entrar para continuar.';
    else if (code === '42501' && !/[áéíóúñ¿]|acceso|permiso|solo /i.test(raw)) text = 'No tienes permiso para hacer esta acción.';
    else if (/permission denied|row-level security|violates row-level/i.test(raw)) text = 'No tienes permiso para hacer esta acción.';
    else if (code === '23505' || /duplicate key/i.test(raw)) text = 'Ya existe un registro con esos datos.';
    else if (code === '23514' || code === '23502' || /violates (check|not-null)|value too long/i.test(raw)) text = 'Revisa los campos obligatorios y la longitud de los datos.';
    else if (code === '23503' || /foreign key/i.test(raw)) text = 'Este dato está relacionado con otros registros y no se puede cambiar así.';
    else if (code === '40001' || /could not serialize|deadlock/i.test(raw)) text = 'Otra persona estaba guardando a la vez. Inténtalo de nuevo.';
    else if (code === '57014' || /statement timeout|canceling statement/i.test(raw)) text = 'El servidor ha tardado demasiado. Inténtalo de nuevo en unos segundos.';
    else if (code === '22P02' || /invalid input syntax/i.test(raw)) text = 'Alguno de los datos no tiene el formato correcto.';
    else if (status === 429 || /rate limit|too many requests/i.test(raw)) text = 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.';
    else if (status >= 500 && (!raw || /^[\x00-\x7F]*$/.test(raw))) text = 'El servidor no ha podido completar la operación. Inténtalo de nuevo.';
    else if (!raw) text = 'No se pudo conectar con ELEJEM. Inténtalo de nuevo.';
    else if (/^[A-Za-z0-9 ,.'"():_\-\/]+$/.test(raw) && /\b(the|of|is|not|for|function|column|relation|null|invalid|failed|unknown)\b/i.test(raw)) text = 'No se pudo completar la operación. Si se repite, avisa al soporte técnico.';
    const err = new Error(text);
    err.code = code || (status ? 'http_' + status : ''); err.technical = raw; err.missing = missing; err.status = status;
    return err;
  }
  window.ElejemFriendlyError = friendlyError;

  async function api(path, options) {
    const session = await getSession();
    let response;
    try {
      response = await fetch(SUPABASE_URL + path, {
        ...options,
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + session.access_token,
          'Content-Type': 'application/json',
          ...(options && options.headers ? options.headers : {})
        }
      });
    } catch (_) { throw friendlyError({ code: 'network' }, 0); }
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = null; }
    if (!response.ok) throw friendlyError(data || {}, response.status);
    return data;
  }

  async function askAssistant(message, history, context) {
    const session = await getSession();
    const response = await fetch(SUPABASE_URL + '/functions/v1/elejem-assistant', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, history: (history || []).slice(-6).map(item => ({ role: item.role === 'user' ? 'user' : 'assistant', content: item.text })), context: context || null })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok && !data.reply) throw new Error(data.error || 'El asistente no está disponible en este momento');
    return data;
  }

  async function customerEndpoint(body,authenticated=false){const session=authenticated?await getSession():null;const response=await fetch(SUPABASE_URL+'/functions/v1/elejem-customer',{method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify(body),cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'No se pudo acceder al perfil de cliente.');saveSession(data.session);window.ElejemCustomer=data.customer;window.ElejemStaffSession=null;return data.customer;}
  async function registerCustomer(data){const current=await getSession();if(!current.user?.is_anonymous){const anon=await authRequest('/auth/v1/signup',{});saveSession({...anon,expires_at:Math.floor(Date.now()/1000)+anon.expires_in});}return customerEndpoint({action:'register',...data},true);}
  const signInCustomer=(email,password)=>customerEndpoint({action:'login',email,password});
  async function customerContext(){const profile=await api('/rest/v1/rpc/elejem_customer_context',{method:'POST',body:'{}'});window.ElejemCustomer=profile;return profile;}
  const requirements=(id,version,items,notes,submit)=>api('/rest/v1/rpc/elejem_requirements',{method:'POST',body:JSON.stringify({p_request:id,p_version:version??null,p_items:items??null,p_notes:notes??null,p_submit:!!submit})});

  async function createRequest(payload, photos, messages) {
    const customer=await customerContext();if(!customer)throw new Error('Regístrate o inicia sesión para enviar la solicitud.');
    const session = await getSession();
    const rows = await api('/rest/v1/requests?select=*', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ ...payload, source:'web', customer_id: session.user.id })
    });
    const request = rows[0];

    const warnings = [];
    if(window.ElejemCustomerLocation){const gps=window.ElejemCustomerLocation;try{await api('/rest/v1/rpc/elejem_customer_location',{method:'POST',body:JSON.stringify({p_request:request.id,p_home:gps.at_home,p_consent:!!gps.location,p_location:gps.location||null})});}catch(_){warnings.push('ubicación');}}
    // 9B · Punto 54: procedencia (no bloquea la solicitud si falla).
    try{const ls=window.ElejemLeadSource;const via=(messages||[]).some(m=>m.role==='ai'||m.role==='assistant')?'asistente':'web';await api('/rest/v1/rpc/elejem_lead_source_set',{method:'POST',body:JSON.stringify({p_request:request.id,p_data:{...(ls||{}),via}})});}catch(_){}
    const clientMessages = (messages || []).filter(item => item.role === 'user');
    if (clientMessages.length) {
      try { await api('/rest/v1/request_messages', {
        method: 'POST',
        body: JSON.stringify(clientMessages.map(item => ({
          request_id: request.id,
          sender: 'client',
          message: item.text,
          created_by: session.user.id
        })))
      }); } catch (_) { warnings.push('conversación'); }
    }

    for (const file of photos || []) {
      try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = request.id + '/' + crypto.randomUUID() + '-' + safeName;
      const upload = await fetch(SUPABASE_URL + '/storage/v1/object/request-photos/' + encodeURI(path), {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + session.access_token,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'false'
        },
        body: file
      });
      if (!upload.ok) {
        const problem = await upload.json().catch(() => ({}));
        throw new Error(problem.message || 'La solicitud se guardó, pero una fotografía no pudo subirse');
      }
      await api('/rest/v1/request_files', {
        method: 'POST',
        body: JSON.stringify({
          request_id: request.id,
          uploaded_by: session.user.id,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size
        })
      });
      } catch (_) { warnings.push('fotografía'); }
    }
    request.warnings = [...new Set(warnings)];
    return request;
  }

  async function listOwnRequests() {
    return api('/rest/v1/requests?select=id,public_code,service_type,title,municipality,priority,status,source,created_at,visit_scheduled_at,quote_sent_at,quote_expires_at,cancelled_reason,tracking_token&order=created_at.desc', { method: 'GET' });
  }

  async function staffEndpoint(data,auth=false){const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json'};if(auth){const session=await getSession();headers.Authorization='Bearer '+session.access_token;}const response=await fetch(SUPABASE_URL+'/functions/v1/elejem-staff',{method:'POST',headers,body:JSON.stringify(data),cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'No se pudo completar el acceso de personal');return result;}
  async function signInStaff(username,password){const result=await staffEndpoint({action:'login',username,password});window.ElejemStaffSession=result.staff;const saved=await saveSession(result.session);staffSessionEvent(result.staff);return saved;}
  async function staffContext(){const profile=await api('/rest/v1/rpc/elejem_staff_context',{method:'POST',body:'{}'});window.ElejemStaffSession=profile;staffSessionEvent(profile);return profile;}
  // 10A · Evento de identidad validada: el modo campo carga la cola offline de ESTE usuario solo cuando se conoce (A01).
  function staffSessionEvent(p){if(p&&p.id)try{window.dispatchEvent(new CustomEvent('elejem:staff-session',{detail:p}));}catch(_){}}
  async function staffDirectory(){const users=await api('/rest/v1/rpc/elejem_staff_directory',{method:'POST',body:'{}'});window.ElejemStaffDirectory=users;return users;}
  const createStaff=data=>staffEndpoint({action:'create',...data},true);
  const updateStaff=(id,role,active,name,username)=>api('/rest/v1/rpc/elejem_staff_edit',{method:'POST',body:JSON.stringify({p_id:id,p_role:role,p_active:active,p_name:name,p_username:username})});
  const changePassword=(password,current_password,target_id)=>staffEndpoint({action:'password',password,current_password,target_id},true);
  const saveStaffProfile=(id,profile)=>api('/rest/v1/rpc/elejem_staff_profile_save',{method:'POST',body:JSON.stringify({p_id:id,p_profile:profile})});
  const deleteStaff=target_id=>staffEndpoint({action:'delete',target_id},true);
  const assignOrder=(id,version,worker,task,visit)=>api('/rest/v1/rpc/elejem_assign_order',{method:'POST',body:JSON.stringify({p_request:id,p_version:version,p_worker:worker,p_task:task,p_visit:visit})});
  async function visitAction(id,version,action,location){if(action==='iniciar')location=await captureTaskLocation();return reportRPC('elejem_visit_action',{p_request:id,p_version:version,p_action:action,p_location:location},true);}

  async function signOut() {
    const session = readSession();
    if (session && session.access_token) await fetch(SUPABASE_URL + '/auth/v1/logout', { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + session.access_token } }).catch(() => {});
    localStorage.removeItem(SESSION_KEY);window.ElejemCustomer=null;window.ElejemStaffSession=null;
  }

  async function listAllRequests() {
    if(window.ElejemStaffSession?.role==='technician')return api('/rest/v1/rpc/elejem_field_requests',{method:'POST',body:'{}'});
    if(window.ElejemStaffSession?.role!=='technician')await api('/rest/v1/rpc/elejem_expire_quotes', { method: 'POST', body: '{}' }).catch(() => null);
    return api('/rest/v1/requests?select=id,public_code,service_type,title,description,municipality,address,postcode,customer_name,customer_phone,customer_email,priority,status,source,internal_notes,field_notes,visit_scheduled_at,quote_sent_at,quote_expires_at,cancelled_reason,tracking_token,quote_status,workflow_version,assigned_to,assignment_task,created_by_staff,ai_preliminary_assessment,ai_risk_detected,created_at,updated_at&order=created_at.desc', { method: 'GET' });
  }

  async function isStaff() {
    return api('/rest/v1/rpc/elejem_is_staff', { method: 'POST', body: '{}' });
  }

  async function workflowReady() {
    try {
      const info = await api('/rest/v1/rpc/elejem_workflow_info', { method: 'POST', body: '{}' });
      return info && info.version === 1;
    } catch (_) { return false; }
  }

  async function updateRequestStatus(id, status, previousStatus, expectedVersion) {
    return updateRequestDetails(id, { status }, expectedVersion);
  }

  // 10H · Historial con nombres. Usa elejem_order_history (migración 69) si está activa; si no, lee el historial
  // como antes y resuelve los nombres con el directorio de personal. Nunca muestra identificadores internos.
  let historyRpc = true, directoryCache = null;
  async function orderHistory(id, order) {
    if (historyRpc) {
      try { const rows = await api('/rest/v1/rpc/elejem_order_history', { method: 'POST', body: JSON.stringify({ p_request: id }) }); return { rows: rows || [], resolved: true }; }
      catch (e) { if (!e.missing) throw e; historyRpc = false; }
    }
    const rows = await listOrderAudit(id) || [];
    if (!directoryCache) { try { directoryCache = await staffDirectory(); } catch (_) { directoryCache = []; } }
    const names = {};
    (directoryCache || []).forEach(s => { const p = s.profile || {}; const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim(); names[s.id || s.user_id] = full || s.name || p.email || s.username || 'Personal de ELEJEM'; });
    return { resolved: false, rows: rows.map(e => {
      const id2 = e.actor_id; let actor_name, actor_role;
      if (id2 && names[id2]) { actor_name = names[id2]; actor_role = 'staff'; }
      else if (e.actor_kind === 'customer' || (order && id2 && order.customer_id === id2)) { actor_name = 'Cliente' + (order && order.customer_name ? ' · ' + order.customer_name : ''); actor_role = 'customer'; }
      else if (!id2 || e.actor_kind === 'system') { actor_name = 'Sistema'; actor_role = 'system'; }
      else { actor_name = 'Personal de ELEJEM'; actor_role = 'staff'; }
      return { ...e, actor_name, actor_role, names };
    }) };
  }
  const permissionsEditable = async () => { try { return !!(await api('/rest/v1/rpc/elejem_permissions_editable', { method: 'POST', body: '{}' })); } catch (e) { if (e.missing) return null; throw e; } };
  const permissionSet = changes => api('/rest/v1/rpc/elejem_permission_set', { method: 'POST', body: JSON.stringify({ p_changes: changes }) });

  async function listOrderAudit(id) {
    return api('/rest/v1/elejem_order_audit?select=id,occurred_at,actor_id,actor_kind,action,previous_values,new_values&request_id=eq.' + encodeURIComponent(id) + '&order=id.desc&limit=30', { method: 'GET' });
  }

  async function uploadRequestPhotos(request, photos, session) {
    const warnings = [];
    for (const file of photos || []) {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = request.id + '/' + crypto.randomUUID() + '-' + safeName;
        const upload = await fetch(SUPABASE_URL + '/storage/v1/object/request-photos/' + encodeURI(path), {
          method: 'POST',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
          body: file
        });
        if (!upload.ok) {
          const problem = await upload.json().catch(() => ({}));
          throw new Error(problem.message || 'No se pudo subir una fotografía');
        }
        await api('/rest/v1/request_files', { method: 'POST', body: JSON.stringify({ request_id: request.id, uploaded_by: session.user.id, storage_path: path, file_name: file.name, mime_type: file.type || null, file_size: file.size }) });
      } catch (_) { warnings.push(file.name); }
    }
    return warnings;
  }

  async function createInternalRequest(payload, photos) {
    const {assigned_to,assignment_task,...fields}=payload;
    const session = await getSession();
    const rows = await api('/rest/v1/requests?select=*', {
      method: 'POST', headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ ...fields, source: 'internal', customer_id: session.user.id, created_by_staff: session.user.id })
    });
    let request = rows[0];
    request.warnings = await uploadRequestPhotos(request, photos, session);
    if(assigned_to){const warnings=request.warnings;try{request=await assignOrder(request.id,request.workflow_version,assigned_to,assignment_task||'visita_presupuesto',request.visit_scheduled_at||null);request.warnings=warnings;}catch(e){request.warnings=[...warnings,'Asignación pendiente: '+e.message];}}
    return request;
  }

  async function updateRequestDetails(id, changes, expectedVersion) {
    if(window.ElejemStaffSession?.role==='technician'){const safe=await api('/rest/v1/rpc/elejem_field_note',{method:'POST',body:JSON.stringify({p_request:id,p_version:expectedVersion,p_note:changes.internal_notes||null})});return safe;}
    if (!Number.isInteger(expectedVersion)) throw new Error('Recarga el panel para obtener la versión actual de la orden.');
    const rows = await api('/rest/v1/rpc/elejem_update_order', {
      method: 'POST',
      body: JSON.stringify({ p_id: id, p_expected_version: expectedVersion, p_changes: changes })
    });
    if (!rows || !rows[0]) throw new Error('La orden no se pudo actualizar. Recarga el panel.');
    return rows[0];
  }

  async function getTrackedOrder(token) {
    if (await workflowReady()) {
      return api('/rest/v1/rpc/elejem_track_order_v3', { method: 'POST', body: JSON.stringify({ p_token: token }) });
    }
    const rows = await api('/rest/v1/rpc/elejem_track_order', { method: 'POST', body: JSON.stringify({ p_token: token }) });
    return rows && rows[0] ? rows[0] : null;
  }

  async function listRequestPhotos(requestId) {
    const files = await api('/rest/v1/request_files?select=storage_path,file_name,mime_type&request_id=eq.' + encodeURIComponent(requestId), { method: 'GET' });
    const session = await getSession();
    for (const file of files) {
      const objectPath = String(file.storage_path || '').split('/').map(encodeURIComponent).join('/');
      const response = await fetch(SUPABASE_URL + '/storage/v1/object/authenticated/request-photos/' + objectPath, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + session.access_token },
        cache: 'no-store'
      });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        throw new Error(problem.message || 'No se pudo descargar la fotografía');
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error('La fotografía está vacía');
      file.url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('No se pudo preparar la fotografía para mostrarla'));
        reader.readAsDataURL(blob);
      });
    }
    return files;
  }

  async function deleteRequest(id){const rows=await api('/rest/v1/requests?id=eq.'+encodeURIComponent(id)+'&select=workflow_version',{method:'GET'});if(!rows?.[0])throw Error('Orden no disponible');const result=await api('/rest/v1/rpc/elejem_delete_request',{method:'POST',body:JSON.stringify({p_id:id,p_version:rows[0].workflow_version})});const session=await getSession();for(const path of result.paths||[])await fetch(SUPABASE_URL+'/storage/v1/object/request-photos/'+String(path).split('/').map(encodeURIComponent).join('/'),{method:'DELETE',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token}}).catch(()=>null);}



  async function listQuotes(id) {
    return api('/rest/v1/quotes?select=*&'+(id?'request_id=eq.'+encodeURIComponent(id)+'&':'')+'order=version.desc', {method:'GET'});
  }
  async function saveQuote(payload) {
    return api('/rest/v1/rpc/elejem_save_quote', {method:'POST',body:JSON.stringify(payload)});
  }
  async function publicQuote(token) {
    const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/elejem_quote_public', {method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token}),cache:'no-store'});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'No se pudo abrir el presupuesto');return data;
  }
  async function respondQuote(token,action,note) {
    const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/elejem_respond_quote', {method:'POST',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:token,p_action:action,p_note:note||''}),cache:'no-store'});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'No se pudo registrar la respuesta');return data;
  }


  async function reportRPC(name,data,privateSession=false) {
    const options={method:'POST',body:JSON.stringify(data)};
    if(privateSession){const result=await api('/rest/v1/rpc/'+name,options);if(result?.error)throw new Error(result.error);return result;}
    const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{...options,headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},cache:'no-store'});
    const result=await response.json();if(!response.ok||result?.error)throw new Error(result.message||result.error||'No se pudo actualizar el parte');return result;
  }
  const getReport=(id,tracking,token)=>reportRPC('elejem_get_report',{p_request:id||null,p_tracking:tracking||null,p_token:token||null},!!id&&!tracking&&!token);
  async function captureLocation(){if(!navigator.geolocation)throw new Error('Este dispositivo no permite comprobar la ubicación. Usa un móvil con GPS.');return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,captured_at:new Date(p.timestamp).toISOString()}),()=>reject(new Error('No se pudo obtener el GPS. Permite la ubicación precisa y vuelve a intentar.')),{enableHighAccuracy:true,maximumAge:0,timeout:20000}));}
  async function captureTaskLocation(){let timer;try{return await Promise.race([captureLocation(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('GPS timeout')),20000);})]);}catch(e){return {error:'unavailable'};}finally{clearTimeout(timer);}}
  async function reportAction(id,version,action,data){const payload={...(data||{})};if(action==='iniciar')payload.location=await captureTaskLocation();return reportRPC('elejem_work_report_action',{p_request:id,p_version:version,p_action:action,p_data:payload},true);}
  const workforce=(action,data)=>reportRPC('elejem_workforce',{p_action:action,p_data:data||{}},true);
  const signReport=(rep,name,signature,consent,reason,staff)=>reportRPC('elejem_sign_report',{p_token:rep.response_token,p_version:rep.version,p_name:name,p_signature:signature,p_consent:consent,p_reason:reason||null},!!staff);

  async function requestQuote(id,trackingToken) {
    const path='/rest/v1/rpc/elejem_request_quote';
    const options={method:'POST',body:JSON.stringify({p_request:id||null,p_tracking:trackingToken||null})};
    if(!trackingToken)return api(path,options);
    const response=await fetch(SUPABASE_URL+path,{...options,headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},cache:'no-store'});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'No se pudo cargar el presupuesto');return data;
  }

  async function quotePDF(id,token,filename,download=true) {
    const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json'};
    if(!token){const session=await getSession();headers.Authorization='Bearer '+session.access_token;}
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);
    let response;
    try{response=await fetch(SUPABASE_URL+'/functions/v1/elejem-quote-pdf',{method:'POST',headers,body:JSON.stringify(token?{token}:{quote_id:id}),signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timeout);}
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'No se pudo descargar el PDF. Vuelve a intentarlo.');}
    const blob=await response.blob();
    if(!blob.size||!response.headers.get('Content-Type')?.includes('application/pdf'))throw new Error('Documento PDF no válido.');
    if(download){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=String(filename||'presupuesto.pdf').replace(/[^a-zA-Z0-9._-]/g,'_');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
    return {size:blob.size,sha256:response.headers.get('X-Document-SHA256')};
  }
  async function reportPDF(id,token,filename,download=true,internal=false) {
    const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json'};
    if(!token){const session=await getSession();headers.Authorization='Bearer '+session.access_token;}
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),45000);
    let response;
    try{response=await fetch(SUPABASE_URL+'/functions/v1/elejem-report-pdf',{method:'POST',headers,body:JSON.stringify(token?{token}:{report_id:id,internal}),signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timeout);}
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'No se pudo descargar el PDF. Vuelve a intentarlo.');}
    const blob=await response.blob();
    if(!blob.size||!response.headers.get('Content-Type')?.includes('application/pdf'))throw new Error('Documento PDF no válido.');
    if(download){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=String(filename||'parte.pdf').replace(/[^a-zA-Z0-9._-]/g,'_');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
    return {size:blob.size,sha256:response.headers.get('X-Document-SHA256')};
  }

  const agendaList=(from,to,worker=null,offset=0,history=false)=>api('/rest/v1/rpc/elejem_agenda_list',{method:'POST',body:JSON.stringify({p_from:from,p_to:to,p_worker:worker,p_offset:offset,p_history:history})});
  const agendaSave=(id,version,request,requestVersion,worker,task,start,end,note,reason='')=>api('/rest/v1/rpc/elejem_agenda_save',{method:'POST',body:JSON.stringify({p_id:id,p_version:version,p_request:request,p_request_version:requestVersion,p_worker:worker,p_task:task,p_start:start,p_end:end,p_note:note,p_overlap_reason:reason})});
  const agendaCancel=(id,version,reason)=>api('/rest/v1/rpc/elejem_agenda_cancel',{method:'POST',body:JSON.stringify({p_id:id,p_version:version,p_reason:reason})});
  const dashboard=(from,to,offset=0,filter='all')=>api('/rest/v1/rpc/elejem_dashboard',{method:'POST',body:JSON.stringify({p_from:from,p_to:to,p_offset:offset,p_filter:filter})});
  const jobProfitability=request=>api('/rest/v1/rpc/elejem_job_profitability',{method:'POST',body:JSON.stringify({p_request:request})});
  const jobExpenseAction=(request,revision,action,data)=>api('/rest/v1/rpc/elejem_job_expense_action',{method:'POST',body:JSON.stringify({p_request:request,p_revision:revision,p_action:action,p_data:data})});
  const inventoryList=(query='',offset=0)=>api('/rest/v1/rpc/elejem_inventory_list',{method:'POST',body:JSON.stringify({p_query:query,p_offset:offset})});
  const inventoryHistory=material=>api('/rest/v1/rpc/elejem_inventory_history',{method:'POST',body:JSON.stringify({p_material:material})});
  const inventoryMove=(material,version,kind,quantity,reason,key)=>api('/rest/v1/rpc/elejem_inventory_move',{method:'POST',body:JSON.stringify({p_material:material,p_version:version,p_kind:kind,p_quantity:quantity,p_reason:reason,p_key:key})});
  const materialPick=(request,query='')=>api('/rest/v1/rpc/elejem_material_pick',{method:'POST',body:JSON.stringify({p_request:request,p_query:query})});
  const consumptionCosts=request=>api('/rest/v1/rpc/elejem_consumption_costs',{method:'POST',body:JSON.stringify({p_request:request})});
  const consumptionValue=(request,version,line,cost)=>api('/rest/v1/rpc/elejem_consumption_value',{method:'POST',body:JSON.stringify({p_request:request,p_version:version,p_line:line,p_cost:cost})});
  const materialsList=(query='',active=true,offset=0)=>api('/rest/v1/rpc/elejem_materials_list',{method:'POST',body:JSON.stringify({p_query:query,p_active:active,p_offset:offset})});
  const materialSave=(id,version,data)=>api('/rest/v1/rpc/elejem_material_save',{method:'POST',body:JSON.stringify({p_id:id,p_version:version,p_data:data})});
  const reportPhotoAction=(id,version,action,data)=>reportRPC('elejem_report_photo_action',{p_report:id,p_version:version,p_action:action,p_data:data},true);
  async function uploadReportPhoto(rep,blob,stage,caption){const p=await reportPhotoAction(rep.id,rep.version,'reserve',{size:blob.size,stage,caption});const session=await getSession();try{const uploaded=await fetch(SUPABASE_URL+'/storage/v1/object/elejem-report-photos/'+p.path,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'image/jpeg','x-upsert':'false'},body:blob});if(!uploaded.ok)throw Error('No se pudo subir la fotografía.');const result=await reportPhotoAction(rep.id,rep.version,'ready',{id:p.id});rep.version=result.version;}catch(e){try{const removed=await reportPhotoAction(rep.id,rep.version,'remove',{id:p.id});rep.version=removed.version;}catch{}throw e;}}
  async function reportPhotos(request,tracking,token){const headers={apikey:SUPABASE_KEY,'Content-Type':'application/json'};if(!tracking&&!token){const session=await getSession();headers.Authorization='Bearer '+session.access_token;}const response=await fetch(SUPABASE_URL+'/functions/v1/elejem-report-photos',{method:'POST',headers,body:JSON.stringify({request_id:request||null,tracking:tracking||null,token:token||null}),cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'No pudimos cargar las fotos.');return data;}
  // Etapas 4-5 (puntos 13-25): llamada RPC genérica autorizada por sesión; las funciones validan rol y sesión en servidor.
  const rpc=(name,body)=>{if(!/^elejem_[a-z0-9_]+$/.test(name))throw new Error('Operación no válida');return api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body||{})});};
  window.ElejemBackend = { config:Object.freeze({url:SUPABASE_URL,key:SUPABASE_KEY}),rpc,agendaList,agendaSave,agendaCancel,dashboard,jobProfitability,jobExpenseAction,inventoryList,inventoryHistory,inventoryMove,materialPick,consumptionCosts,consumptionValue,materialsList,materialSave,reportPhotoAction,uploadReportPhoto,reportPhotos,registerCustomer, signInCustomer, customerContext, requirements, staffContext, staffDirectory, createStaff, updateStaff, saveStaffProfile, changePassword, deleteStaff, assignOrder, visitAction, workforce, captureLocation, getReport, reportAction, signReport, reportPDF, requestQuote, quotePDF, listQuotes, saveQuote, publicQuote, respondQuote, workflowReady, listOrderAudit, orderHistory, permissionsEditable, permissionSet, getSession, askAssistant, createRequest, createInternalRequest, listOwnRequests, getTrackedOrder, signInStaff, signOut, listAllRequests, isStaff, updateRequestStatus, updateRequestDetails, listRequestPhotos, deleteRequest };
})();
