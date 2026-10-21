/* ELEJEM · Etapa 10H · Historial de la orden en español claro.
   Cada movimiento muestra quién lo hizo (nombre del trabajador, «Cliente» o «Sistema») y qué cambió, sin identificadores internos. */
(function(){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ST={borrador:'Borrador',nueva:'Recibida',en_revision:'En revisión',informacion_pendiente:'Información pendiente',visita_programada:'Visita programada',presupuestada:'Presupuestada',aceptada:'Aceptada',en_ejecucion:'En ejecución',finalizada:'Finalizada',cancelada:'Cancelada'};
const QT={sin_presupuesto:'Sin presupuesto',enviado:'Enviado al cliente',aceptado:'Aceptado por el cliente',rechazado:'Rechazado por el cliente',caducado:'Caducado'};
const TASK={visita_presupuesto:'visita para presupuesto',ejecucion:'ejecución del trabajo'};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const when=v=>{if(!v)return'';const d=new Date(v);if(isNaN(d))return'';return new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);};
const dur=s=>{s=Math.max(0,Math.round(+s||0));const h=Math.floor(s/3600),m=Math.round(s%3600/60);return h?h+' h'+(m?' '+m+' min':''):m+' min';};
const st=s=>{let L=null;try{L=typeof statusLabels!=='undefined'?statusLabels:null;}catch(_){}return(L&&L[s])||ST[s]||'';};
function person(id,names){if(!id)return'';const n=names&&names[id];return n||(UUID.test(id)?'un técnico':String(id));}
function describe(e,order){
 const b=e.previous_values||{},a=e.new_values||{},names=e.names||{},lines=[];let title='';
 const isCustomer=e.actor_role==='customer'||e.actor_kind==='customer';
 if(e.action==='INSERT'){title=isCustomer?'Solicitud enviada por el cliente':'Orden registrada';if(a.status&&a.status!=='nueva'&&st(a.status))lines.push('Estado inicial: '+st(a.status));if(a.assigned_to)lines.push('Asignada a '+person(a.assigned_to,names));if(a.visit_scheduled_at)lines.push('Visita prevista: '+when(a.visit_scheduled_at));return{title,lines};}
 if(e.action==='DELETE')return{title:'Orden eliminada',lines};
 if(e.action==='asignacion'){title='Técnico asignado';const who=a.assigned_to||a.technician;if(who)lines.push(person(who,names)+(a.task&&TASK[a.task]?' · '+TASK[a.task]:''));else if(a.task&&TASK[a.task])lines.push('Tarea: '+TASK[a.task]);return{title,lines};}
 if(e.action==='visita_iniciar'){title='Visita iniciada';if(a.technician)lines.push('Técnico: '+person(a.technician,names));lines.push('Ubicación registrada al empezar, si el móvil la permitió.');return{title,lines};}
 if(e.action==='visita_pausar'||e.action==='pausa_visita'){title=e.action==='pausa_visita'?'Visita pausada al cerrar la jornada':'Visita pausada';if(a.technician)lines.push('Técnico: '+person(a.technician,names));if(a.seconds)lines.push('Tiempo de visita: '+dur(a.seconds));if(a.reason)lines.push('Motivo: '+String(a.reason));return{title,lines};}
 if(a.status&&b.status!==a.status)title=(st(b.status)||'Sin estado')+' → '+(st(a.status)||'Nuevo estado');
 if('assigned_to' in a&&a.assigned_to!==b.assigned_to)lines.push(a.assigned_to?'Asignada a '+person(a.assigned_to,names):'Se quitó el técnico asignado');
 if('visit_scheduled_at' in a&&a.visit_scheduled_at!==b.visit_scheduled_at)lines.push(a.visit_scheduled_at?'Visita programada: '+when(a.visit_scheduled_at):'Se quitó la fecha de visita');
 if(a.quote_status&&a.quote_status!==b.quote_status&&!(a.quote_status==='sin_presupuesto'&&!b.quote_status))lines.push('Presupuesto: '+(QT[a.quote_status]||'actualizado'));
 if(a.quote_expires_at&&a.quote_expires_at!==b.quote_expires_at)lines.push('El presupuesto vence el '+when(a.quote_expires_at));
 if(a.cancelled_reason&&a.cancelled_reason!==b.cancelled_reason)lines.push('Motivo de cancelación: '+String(a.cancelled_reason));
 if('internal_notes' in a&&a.internal_notes!==b.internal_notes)lines.push('Notas internas actualizadas');
 if(!title)title=lines.length?(lines.length===1&&/^Visita programada/.test(lines[0])?'Visita programada':'Orden actualizada'):'Orden actualizada';
 return{title,lines};
}
function actor(e){
 const n=String(e.actor_name||'').trim();
 if(n&&!UUID.test(n)&&!/^Usuario [0-9a-f]/i.test(n))return n;
 if(e.actor_kind==='customer')return'Cliente';if(!e.actor_id||e.actor_kind==='system')return'Sistema';return'Personal de ELEJEM';
}
function render(rows,order){
 if(!rows||!rows.length)return'<p class="u10-empty">Todavía no hay movimientos en esta orden. Se registrarán a partir del próximo cambio.</p>';
 return'<ol class="h10-list">'+rows.map(e=>{const d=describe(e,order),who=actor(e),kind=e.actor_role||(e.actor_kind==='customer'?'customer':(!e.actor_id||e.actor_kind==='system')?'system':'staff');
  return'<li class="h10-item ops-note" data-h10-kind="'+esc(kind)+'"><strong class="h10-title">'+esc(d.title)+'</strong><small class="h10-meta"><time datetime="'+esc(e.occurred_at||'')+'">'+esc(when(e.occurred_at))+'</time> · <span class="h10-who">'+esc(who)+'</span></small>'+(d.lines.length?'<ul class="h10-lines">'+d.lines.map(l=>'<li>'+esc(l)+'</li>').join('')+'</ul>':'')+'</li>';}).join('')+'</ol>';
}
// Respaldo en el propio navegador: pone nombre a cada movimiento con el directorio del personal.
let dirCache=null;
async function resolveLocal(rows,order){
 if(!dirCache){try{dirCache=(await window.ElejemBackend.staffDirectory())||[];}catch(_){dirCache=[];}}
 const names={};dirCache.forEach(s=>{const p=s.profile||{};const full=[p.first_name,p.last_name].filter(Boolean).join(' ').trim();names[s.id||s.user_id]=full||s.name||p.email||s.username||'Personal de ELEJEM';});
 return rows.map(e=>{const id=e.actor_id;let n;
  if(e.actor_name)n=e.actor_name;else if(id&&names[id])n=names[id];else if(e.actor_kind==='customer'||(order&&id&&order.customer_id===id))n='Cliente'+(order&&order.customer_name?' · '+order.customer_name:'');else if(!id||e.actor_kind==='system')n='Sistema';else n='Personal de ELEJEM';
  return {...e,actor_name:n,names:e.names||names};});
}
async function load(box,order){
 if(!box)return;box.setAttribute('aria-busy','true');
 try{const B=window.ElejemBackend;let res;
  if(typeof B.orderHistory==='function')res=await B.orderHistory(order.id,order);
  if(!res||!Array.isArray(res.rows))res={rows:await resolveLocal((await B.listOrderAudit(order.id))||[],order)};
  if(!box.isConnected)return;box.innerHTML=render((res&&res.rows)||(Array.isArray(res)?res:[]),order);
 }catch(e){if(box.isConnected)box.innerHTML='<p class="eq-error">No se pudo cargar el historial. '+esc(e.message||'')+'</p>';}
 finally{box.removeAttribute('aria-busy');}
}
window.ElejemHistory={render,describe,load,actor};
})();
