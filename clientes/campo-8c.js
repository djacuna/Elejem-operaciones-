(function(){'use strict';
// Etapa 8C · Puntos 45-47. Modo campo para el técnico (Android/PWA): «Mi día», lectura sin conexión y cola de cambios con resolución de conflictos.
// Solo en operaciones. Los datos se guardan en IndexedDB de ESTE dispositivo, separados por usuario, y se borran al cerrar sesión.
if(!window.ElejemArea?.staff)return;
const B=window.ElejemBackend;if(!B)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>window.ElejemStaffSession?.id||null;
// --- Almacén: IndexedDB; si no hay o falla, respaldo en memoria marcado como TEMPORAL (A03: nunca se presenta como guardado persistente).
const mem=new Map();let dbp=null;
function db(){if(!('indexedDB' in window)||!window.indexedDB)return Promise.resolve(null);return dbp||(dbp=new Promise(res=>{try{const r=indexedDB.open('elejem-campo',1);r.onupgradeneeded=()=>{r.result.createObjectStore('kv');};r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);r.onblocked=()=>res(null);}catch{res(null);}}));}
async function get(k){const d=await db();if(!d)return mem.get(k);return new Promise(res=>{try{const t=d.transaction('kv').objectStore('kv').get(k);t.onsuccess=()=>res(t.result);t.onerror=()=>res(mem.get(k));}catch{res(mem.get(k));}});}
// put() resuelve true solo cuando la transacción hace commit; rechaza en error/abort (cuota, modo privado…).
async function put(k,v){const d=await db();if(!d){mem.set(k,v);return false;}return new Promise((res,rej)=>{try{const t=d.transaction('kv','readwrite');t.oncomplete=()=>res(true);const fail=e=>rej(e?.target?.error||new Error('Error de almacenamiento'));t.onerror=fail;t.onabort=fail;t.objectStore('kv').put(v,k);}catch(e){rej(e);}});}
async function del(k){const d=await db();if(!d){mem.delete(k);return;}return new Promise(res=>{try{const t=d.transaction('kv','readwrite');t.oncomplete=t.onerror=t.onabort=()=>res();t.objectStore('kv').delete(k);}catch{res();}});}
const KU=(u,n)=>'u:'+u+':'+n,K=n=>KU(uid()||'sin-sesion',n);
// Límites de la cola (A03): evita llenar la cuota del móvil con fotos.
const LIM={items:60,photo:12*1024*1024,photos:80*1024*1024};
const isNet=e=>navigator.onLine===false||e instanceof TypeError||/Failed to fetch|NetworkError|Load failed|sin conexión/i.test(e?.message||'');
// --- 46 · Lectura sin conexión: instantánea de órdenes y agenda (últimos datos vistos).
function cacheRead(name,fn,keyOf){return async function(...a){const k=K('snap:'+name+':'+keyOf(a));try{const r=await fn.apply(this,a);put(k,{at:Date.now(),data:r});state.stale=null;return r;}catch(e){if(!isNet(e))throw e;const s=await get(k);if(!s)throw new Error('Sin conexión y sin datos guardados en este móvil.');state.stale=s.at;paint();return s.data;}};}
const rawGet=B.getReport;
B.listAllRequests=cacheRead('orders',B.listAllRequests,()=> 'all');
B.agendaList=cacheRead('agenda',B.agendaList,a=>[a[0],a[1],a[2]||'',a[3]||0,a[4]?1:0].join('|'));
B.getReport=cacheRead('report',B.getReport,a=>a[0]||'x');
// --- 47 · Cola de cambios. Guardados del parte (uno por orden, el último) y fotos.
const state={queue:[],stale:null,syncing:false,owner:null,loading:null,volatile:false};
// A01 · La cola pertenece a un usuario (owner). Solo se carga cuando la identidad está validada/restaurada; se fusiona con lo persistido.
async function saveQ(){if(!state.owner)throw new Error('Sin sesión de personal: no se puede guardar en el móvil.');
 try{const ok=await put(KU(state.owner,'outbox'),state.queue);state.volatile=!ok;}catch(e){state.volatile=true;mem.set(KU(state.owner,'outbox'),state.queue);paint();throw e;}paint();return !state.volatile;}
function merge(a,b){const m=new Map();[...(a||[]),...(b||[])].forEach(q=>{if(q&&q.id&&!m.has(q.id))m.set(q.id,q);});return [...m.values()];}
async function load(user){user=user||uid();if(!user){state.owner=null;state.queue=[];paint();return;}
 if(state.owner===user&&!state.loading)return; // ya cargada
 const run=(async()=>{const stored=(await get(KU(user,'outbox')))||[];const keep=state.owner===user?state.queue:[];state.owner=user;state.queue=merge(stored,keep);if(keep.length)await saveQ().catch(()=>{});paint();})();
 state.loading=run;try{await run;}finally{state.loading=null;}}
async function ready(){if(state.loading)await state.loading;const u=uid();if(!u)throw new Error('Sin sesión de personal.');if(state.owner!==u)await load(u);}
async function enqueue(item){await ready();if(state.queue.length>=LIM.items)throw new Error('Límite de '+LIM.items+' cambios sin conexión alcanzado: sincroniza o descarta antes de seguir.');
 if(item.kind==='foto'){const sz=item.blob?.size||0,tot=state.queue.reduce((t,q)=>t+(q.blob?.size||0),0);if(sz>LIM.photo)throw new Error('Foto demasiado grande para guardarla sin conexión (máx. 12 MB).');if(tot+sz>LIM.photos)throw new Error('Límite de fotos sin conexión alcanzado (80 MB). Sincroniza antes de seguir.');}
 item.id=item.id||Date.now().toString(36)+Math.random().toString(36).slice(2,7);item.owner=state.owner;
 if(item.kind==='parte'){const i=state.queue.findIndex(q=>q.kind==='parte'&&q.request===item.request&&q.status!=='conflicto');if(i>=0){item.base=state.queue[i].base;state.queue[i]=item;}else state.queue.push(item);}else state.queue.push(item);
 let persistent=false;try{persistent=await saveQ();}catch(e){persistent=false;}
 if(!persistent)window.toast?.('Atención: no se ha podido guardar en el móvil (almacenamiento lleno o modo privado). El cambio está solo en memoria: no cierres la app y exporta los pendientes.');
 return persistent;}
const origAction=B.reportAction;
B.reportAction=async function(id,version,action,data){if(action!=='guardar')return origAction.apply(this,arguments);
 if(navigator.onLine!==false){try{return await origAction.apply(this,arguments);}catch(e){if(!isNet(e))throw e;}}
 const persistent=await enqueue({kind:'parte',request:id,base:version,data,at:Date.now(),status:'pendiente'});if(persistent)window.toast?.('Sin conexión: parte guardado en el móvil; se enviará al volver la red');return {version,queued:true,persistent};};
const origPhoto=B.uploadReportPhoto;
B.uploadReportPhoto=async function(rep,blob,stage,caption){if(navigator.onLine!==false){try{return await origPhoto.apply(this,arguments);}catch(e){if(!isNet(e))throw e;}}
 const persistent=await enqueue({kind:'foto',request:rep.request_id,report:rep.id,blob,stage,caption:caption||'',at:Date.now(),status:'pendiente'});if(persistent)window.toast?.('Foto guardada en el móvil; se subirá al volver la red');return {queued:true,persistent};};
// A02 · Apertura sin red: identidad mínima validada en línea (id, rol, nombre, hora), válida 72 h. Sin contraseñas.
// Solo permite VER los últimos datos guardados y encolar; el servidor vuelve a comprobar permisos al sincronizar.
const IDK='elejem-ops-identity',IDTTL=72*3600e3,SESSK='elejem_supabase_staff_session_v1';
const origCtx=B.staffContext,origReady=B.workflowReady;
function savedIdentity(){try{const s=JSON.parse(localStorage.getItem(IDK)||'null');if(!s||!s.id||Date.now()-s.at>IDTTL||!localStorage.getItem(SESSK))return null;return s;}catch{return null;}}
if(origCtx)B.staffContext=async function(){try{const p=await origCtx.apply(this,arguments);if(p&&p.id){try{localStorage.setItem(IDK,JSON.stringify({id:p.id,role:p.role,full_name:p.full_name||p.name||'',username:p.username||'',at:Date.now()}));}catch{}}state.offlineBoot=false;return p;}
 catch(e){if(!isNet(e))throw e;const s=savedIdentity();if(!s)throw new Error('Sin conexión: abre la app con red al menos una vez (validez 72 h) para usarla sin conexión.');
  const p={id:s.id,role:s.role,full_name:s.full_name,username:s.username,offline:true,validated_at:s.at};window.ElejemStaffSession=p;state.offlineBoot=true;window.dispatchEvent(new CustomEvent('elejem:staff-session',{detail:p}));paint();return p;}};
if(origReady)B.workflowReady=async function(){if(navigator.onLine===false&&savedIdentity())return true;const r=await origReady.apply(this,arguments);if(!r&&state.offlineBoot&&savedIdentity())return true;return r;};
addEventListener('elejem:staff-session',e=>{const u=e.detail?.id;if(u&&u!==state.owner)load(u).then(sync).catch(()=>{});});
// Exportación segura de pendientes (A03): JSON de partes; las fotos solo se cuentan.
function exportQ(){const data={exported_at:new Date().toISOString(),user:state.owner,items:state.queue.map(q=>q.kind==='parte'?{kind:q.kind,request:q.request,base:q.base,at:q.at,status:q.status,data:q.data}:{kind:q.kind,request:q.request,stage:q.stage,at:q.at,status:q.status,size:q.blob?.size||0})};
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));a.download='elejem-pendientes-'+Date.now()+'.json';document.body.append(a);a.click();a.remove();return data;}
const same=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const EDITABLE=['pendiente','en_curso','pausado'];
// Reglas de conflicto: si el parte no cambió en el servidor se aplica; si cambió pero el contenido coincide se descarta en silencio;
// si cambió y difiere, o ya no es editable, se marca «conflicto» y decide la persona (nunca se pisa sin preguntar).
async function syncOne(q){if(q.kind==='parte'){const cur=await origGet(q.request);if(!cur)throw new Error('El parte ya no existe');
  const server={description:cur.description||'',incidents:cur.incidents||'',materials:cur.materials||[]};
  if(same({description:q.data.description,incidents:q.data.incidents,materials:q.data.materials},server))return 'hecho';
  if(cur.version!==q.base||(cur.state&&!EDITABLE.includes(cur.state))){q.status='conflicto';q.server={version:cur.version,state:cur.state,...server};return 'conflicto';}
  await origAction(q.request,cur.version,'guardar',q.data);return 'hecho';}
 if(q.kind==='foto'){const cur=await origGet(q.request);if(!cur||cur.id!==q.report){q.status='conflicto';q.server={state:cur?.state||'sin parte'};return 'conflicto';}await origPhoto(cur,q.blob,q.stage,q.caption);return 'hecho';}
 return 'hecho';}
const origGet=(id)=>rawGet(id,null,null);
async function sync(){if(state.loading)await state.loading;if(!state.owner||state.owner!==uid()||state.syncing||navigator.onLine===false||!state.queue.some(q=>q.status==='pendiente'))return;state.syncing=true;paint();let ok=0;
 try{for(const q of state.queue.filter(x=>x.status==='pendiente')){try{const r=await syncOne(q);if(r==='hecho'){state.queue=state.queue.filter(x=>x!==q);ok++;}}catch(e){if(isNet(e))break;q.status='conflicto';q.server={error:String(e.message||e).slice(0,200)};}}}
 finally{state.syncing=false;await saveQ().catch(()=>{});paint();if(ok)window.toast?.(ok+' cambio'+(ok>1?'s':'')+' sincronizado'+(ok>1?'s':''));window.dispatchEvent(new CustomEvent('elejem:sync',{detail:{ok,pending:state.queue.length}}));}}
async function resolve(id,choice){const q=state.queue.find(x=>x.id===id);if(!q)return;
 if(choice==='descartar'){state.queue=state.queue.filter(x=>x!==q);}
 else if(choice==='mia'){if(q.kind==='parte'&&q.server?.version!=null){if(q.server.state&&!EDITABLE.includes(q.server.state))throw new Error('El parte ya no se puede editar (estado: '+q.server.state+'). Pide reabrirlo o descarta.');q.base=q.server.version;}q.status='pendiente';delete q.server;}
 await saveQ().catch(()=>{});paint();await sync();}
// --- UI: chip de estado + hoja de pendientes/conflictos.
let chip,sheet;
function paint(){if(!document.body)return;if(!chip){chip=document.createElement('button');chip.type='button';chip.className='cp8-chip';chip.setAttribute('aria-live','polite');chip.onclick=openSheet;document.body.append(chip);}
 const p=state.queue.filter(q=>q.status==='pendiente').length,c=state.queue.filter(q=>q.status==='conflicto').length;
 const parts=[];if(state.offlineBoot)parts.push('Sin conexión · identidad de '+new Date(savedIdentity()?.at||Date.now()).toLocaleDateString('es-ES'));if(state.volatile)parts.push('⚠ Guardado solo temporal');if(state.stale)parts.push('Datos de las '+new Date(state.stale).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));if(state.syncing)parts.push('Sincronizando…');else if(p)parts.push(p+' pendiente'+(p>1?'s':''));if(c)parts.push(c+' conflicto'+(c>1?'s':''));
 chip.hidden=!parts.length;chip.textContent=parts.join(' · ');chip.classList.toggle('has-conflict',!!c||state.volatile);if(sheet?.open)renderSheet();}
function renderSheet(){const rows=state.queue.map(q=>'<article class="ev4-card cp8-item" data-q="'+esc(q.id)+'"><strong>'+(q.kind==='parte'?'Parte de trabajo':'Foto ('+esc(q.stage)+')')+'</strong><p class="ev4-muted">Guardado en el móvil '+new Date(q.at).toLocaleString('es-ES')+' · '+(q.status==='conflicto'?'<b class="cp8-bad">Conflicto</b>':'Pendiente de enviar')+'</p>'+
 (q.status==='conflicto'?(q.server?.error?'<p class="eq-error">'+esc(q.server.error)+'</p>':'')+(q.kind==='parte'&&q.server?.description!=null?'<div class="cp8-diff"><div><h5>En el servidor'+(q.server.state?' · '+esc((window.ElejemTextos?ElejemTextos.label('none',q.server.state):q.server.state)):'')+'</h5><p>'+esc(q.server.description)+'</p><p class="ev4-muted">'+esc(q.server.incidents)+'</p></div><div><h5>Tu versión</h5><p>'+esc(q.data.description)+'</p><p class="ev4-muted">'+esc(q.data.incidents)+'</p></div></div>':'')+'<div class="eq-actions"><button class="btn primary" data-r="mia">Usar mi versión</button><button class="btn secondary" data-r="descartar">Descartar la mía</button></div>':'<div class="eq-actions"><button class="btn secondary" data-r="descartar">Descartar</button></div>')+'</article>').join('');
 sheet.querySelector('[data-body]').innerHTML=rows||'<p>No hay cambios pendientes. Todo está sincronizado.</p>';
 sheet.querySelectorAll('[data-r]').forEach(b=>b.onclick=async()=>{const id=b.closest('[data-q]').dataset.q;if(b.dataset.r==='descartar'&&!confirm('¿Descartar este cambio guardado en el móvil?'))return;try{await resolve(id,b.dataset.r);}catch(e){window.toast?.(e.message);}});}
function openSheet(){if(!sheet){sheet=document.createElement('dialog');sheet.className='cp8-sheet';sheet.setAttribute('aria-label','Cambios sin conexión');sheet.innerHTML='<h3>Cambios sin conexión</h3><div data-body></div><div class="eq-actions"><button class="btn secondary" data-sync>Sincronizar ahora</button><button class="btn ghost" data-export>Exportar pendientes</button><button class="btn" data-close>Cerrar</button></div>';sheet.querySelector('[data-close]').onclick=()=>sheet.close?sheet.close():sheet.removeAttribute('open');sheet.querySelector('[data-sync]').onclick=sync;sheet.querySelector('[data-export]').onclick=exportQ;document.body.append(sheet);}
 renderSheet();sheet.showModal?sheet.showModal():sheet.setAttribute('open','');}
// --- 45 · «Mi día» del técnico, arriba de la agenda. Botones grandes para el móvil.
const dayStr=d=>d.toLocaleDateString('sv-SE');
async function mountDay(){const pane=window.ElejemNavigation?.pane('agenda');if(!pane||!['technician','operator'].includes(window.ElejemStaffSession?.role))return;let box=pane.querySelector('[data-mi-dia]');if(!box){box=document.createElement('section');box.className='cp8-day';box.dataset.miDia='';pane.prepend(box);}
 box.innerHTML='<h3>Mi día</h3><p class="ev4-muted">Cargando visitas de hoy…</p>';const t=dayStr(new Date());
 try{const r=await B.agendaList(t,t,null,0,false);const items=(r?.items||[]).filter(e=>e.state!=='cancelada');
  box.innerHTML='<h3>Mi día <small>'+new Date().toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'})+'</small></h3>'+(items.length?'<ol class="cp8-visits">'+items.map(e=>'<li><button type="button" class="cp8-visit" data-open="'+esc(e.request_id)+'"><time>'+esc(new Date(e.start_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}))+'</time><span><strong>'+esc(e.customer_name||'Cliente')+'</strong><small>'+esc([e.public_code,e.municipality,e.task].filter(Boolean).join(' · '))+'</small></span><b aria-hidden="true">›</b></button></li>').join('')+'</ol>':'<p>No tienes visitas hoy.</p>');
  box.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>window.ElejemNavigation?.openOrder?.(b.dataset.open));}
 catch(e){box.innerHTML='<h3>Mi día</h3><p class="eq-error">'+esc(e.message)+'</p>';}}
addEventListener('elejem:pane',e=>{if(e.detail.id==='agenda')setTimeout(mountDay,0);});
addEventListener('online',()=>{state.stale=null;paint();sync();});addEventListener('offline',paint);
// Al cerrar sesión se borran instantáneas y cola de este usuario (avisando si hay cambios sin enviar).
const origOut=B.signOut;B.signOut=async function(){if(state.queue.length&&!confirm('Hay '+state.queue.length+' cambio(s) sin enviar en este móvil. Si cierras sesión se perderán. ¿Continuar?'))return;const d=await db();const pre=KU(state.owner||uid()||'sin-sesion','');try{localStorage.removeItem(IDK);}catch{}if(d){await new Promise(res=>{const st=d.transaction('kv','readwrite').objectStore('kv');const rq=st.getAllKeys();rq.onsuccess=()=>{rq.result.filter(k=>String(k).startsWith(pre)).forEach(k=>st.delete(k));res();};rq.onerror=()=>res();});}else[...mem.keys()].filter(k=>k.startsWith(pre)).forEach(k=>mem.delete(k));state.queue=[];state.owner=null;state.volatile=false;state.offlineBoot=false;paint();return origOut.apply(this,arguments);};
document.addEventListener('DOMContentLoaded',()=>{if(uid())load().then(sync).catch(()=>{});const v=new URLSearchParams(location.search).get('vista');if(v==='mi-dia')setTimeout(()=>window.ElejemNavigation?.select?.('agenda'),300);});
window.ElejemCampo={state,sync,resolve,load,mountDay,openSheet,exportQ,LIM,_store:{get,put,del}};
})();
