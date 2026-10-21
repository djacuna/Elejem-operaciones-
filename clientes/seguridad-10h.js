/* ELEJEM · Etapa 10H · Seguridad en lenguaje claro.
   - Comprobación de seguridad: explica cada aviso en español, sin nombres internos (el detalle técnico se copia para el soporte).
   - Registro de actividad: quién, qué pasó y sobre qué, sin códigos.
   - Permisos: por rol, agrupados por área, con interruptores, confirmación de cambios delicados y estado de guardado.
     La edición usa elejem_permission_set (migración 70). Si aún no está activa, la pantalla queda en modo consulta. */
(function(){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const B=()=>window.ElejemBackend;
const fmt=v=>v?new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)):'';
const ROLES=[['admin','Administrador','Acceso completo, incluidos Usuarios y Seguridad.'],['operator','Operativo','Gestiona órdenes, agenda, clientes, economía y equipo. No entra en Usuarios ni Seguridad.'],['technician','Técnico','Ve sus tareas asignadas, su agenda, su jornada y su disponibilidad. No ve importes.'],['customer','Cliente','Ve sus solicitudes, presupuestos, cobros y facturas en el área de clientes.']];
const ROLE=Object.fromEntries(ROLES.map(r=>[r[0],r[1]]));
const SCOPE={all:'Todo',assigned:'Solo sus órdenes asignadas',own:'Solo lo suyo'};
// Catálogo de permisos editables (mismo catálogo cerrado que valida el servidor en la migración 70).
const AREAS=[
 ['economia','Economía',[
  ['billing','read','Ver cobros','Consultar la cartera de cobros y los pagos de cada orden.',0,['admin','operator','technician','customer']],
  ['billing','write','Crear cobros y anotar pagos','Crear cobros previstos y registrar los pagos recibidos.',1,['admin','operator']],
  ['billing','void','Anular cobros y pagos','Deshacer un cobro o un pago ya registrado.',1,['admin','operator']],
  ['billing','pay','Pagar online','Pagar sus cobros desde el área de clientes cuando el pago online esté activo.',0,['customer']],
  ['invoice','read','Ver facturas','Consultar las facturas emitidas y los borradores.',0,['admin','operator','technician','customer']],
  ['invoice','issue','Emitir facturas','Crear y emitir facturas. Una factura emitida ya no se puede borrar.',1,['admin','operator']],
  ['invoice','void','Rectificar facturas','Preparar facturas rectificativas.',1,['admin','operator']],
  ['payment_settings','write','Cambiar los ajustes de facturación','Razón social, NIF, series y pago online.',1,['admin','operator']]]],
 ['ordenes','Órdenes',[
  ['stalled','read','Ver trabajos parados','Lista de órdenes que llevan tiempo sin avanzar.',0,['admin','operator','technician']],
  ['file','read','Abrir fotos y documentos','Ver fotografías, partes y documentos de las órdenes.',0,['admin','operator','technician','customer']]]],
 ['ia','Asistente IA',[
  ['ai','query','Hacer consultas al asistente','Preguntar al asistente sobre las órdenes.',0,['admin','operator','technician']],
  ['ai','summary','Pedir el resumen de una orden','Resumen automático del expediente.',0,['admin','operator','technician']],
  ['ai','draft_quote','Preparar borradores de presupuesto','El borrador siempre lo revisa una persona antes de enviarlo.',0,['admin','operator']],
  ['ai','insights','Ver el análisis del negocio','Indicadores y observaciones sobre la actividad.',0,['admin','operator']],
  ['ai_settings','write','Configurar el asistente','Activar o desactivar el asistente y sus límites.',1,['admin','operator']]]],
 ['control','Seguridad y control',[
  ['audit','read','Ver el registro de actividad','Quién hizo cada cambio y cuándo.',0,['admin','operator']],
  ['security','read','Ver la comprobación de seguridad','Avisos de configuración y accesos bloqueados.',0,['admin','operator']],
  ['rate_limits','read','Ver bloqueos por exceso de intentos','Accesos frenados por repetirse demasiadas veces.',0,['admin','operator']],
  ['permissions','read','Ver los permisos','Consultar esta pantalla.',0,['admin','operator']],
  ['permissions','write','Cambiar permisos','Asignar y retirar permisos a cada rol.',1,['admin']],
  ['sessions','manage_own','Gestionar sus propias sesiones','Ver y cerrar sus sesiones abiertas en otros dispositivos.',0,['admin','operator','technician','customer']],
  ['sessions','revoke_any','Cerrar la sesión de cualquier usuario','Expulsar a alguien de todos sus dispositivos.',1,['admin','operator']]]]];
const ITEMS=AREAS.flatMap(a=>a[2].map(i=>({area:a[0],resource:i[0],action:i[1],name:i[2],desc:i[3],danger:!!i[4],roles:i[5]})));
const key=(r,res,act)=>r+'|'+res+'|'+act;
const LOCK=new Set(['admin|permissions|read','admin|permissions|write','admin|security|read','admin|audit|read']);
const defScope=(role,it)=>role==='customer'||(it.resource==='sessions'&&it.action==='manage_own')?'own':role==='technician'&&['ai','file','stalled','billing','invoice'].includes(it.resource)?'assigned':'all';
const itemName=(res,act)=>ITEMS.find(i=>i.resource===res&&i.action===act)?.name||'Permiso interno';

/* ---------- Comprobación de seguridad ---------- */
const KIND={tabla_sin_rls:['Una tabla de datos no tiene activada la protección por usuario','Cualquier persona con sesión podría llegar a leerla. Hay que activar la protección.'],
 tabla_anon:['Hay datos accesibles sin iniciar sesión','Alguien sin cuenta podría consultarlos. Hay que retirar ese acceso.'],
 definer_sin_search_path:['Una función interna necesita un ajuste de seguridad','Es una corrección técnica que no afecta al uso diario.'],
 funcion_anon:['Una función se puede usar sin iniciar sesión','Si no es una función pública a propósito, hay que cerrarla.'],
 bucket_publico:['Una carpeta de archivos es pública','Los archivos de esa carpeta se pueden abrir con el enlace, sin sesión.'],
 tabla_privada_con_permisos:['Una tabla privada tiene accesos sin reglas','Conviene revisar quién puede leerla.']};
const SEV={alta:'Importante',media:'A revisar',baja:'Informativo'};
const BUCKET={client_report_anon:'Avisos de errores enviados desde la web',client_report_global:'Avisos de errores enviados desde la web (total)',login:'Intentos de entrada',staff_login:'Intentos de entrada del personal',assistant:'Consultas al asistente',ai:'Consultas al asistente IA',checkout:'Intentos de pago online',review:'Solicitudes de reseña',salud:'Informes de salud de la app'};
async function informe(){
 const d=await B().rpc('elejem_security_report',{});const issues=d.issues||[];const groups={};
 issues.forEach(i=>{const k=i.kind||'otro';(groups[k]=groups[k]||{sev:i.severity,n:0}).n++;if(i.severity==='alta')groups[k].sev='alta';});
 const rl=(d.rate_limits||[]).filter(r=>+r.blocked>0),blocked=rl.reduce((n,r)=>n+(+r.blocked||0),0);
 const tech=issues.map(i=>[i.severity,i.kind,i.object,i.detail].join(' | ')).join('\n');
 window.__s10Tech=tech;
 return '<div class="s10-sum'+(issues.length?' warn':' ok')+'"><strong>'+(issues.length?esc(issues.length===1?'Hay 1 aviso de seguridad':'Hay '+issues.length+' avisos de seguridad'):'Todo en orden')+'</strong><span>'+(issues.length?'Revísalos con el soporte técnico. El uso diario no se ve afectado.':'No se han encontrado datos expuestos, accesos sin sesión ni carpetas públicas.')+'</span></div>'+
  '<div class="s10-kpis"><div><b>'+esc(d.audit_denied_7d||0)+'</b><span>accesos denegados en 7 días</span></div><div><b>'+esc(blocked)+'</b><span>bloqueos por exceso de intentos</span></div><div><b>'+esc(fmt(d.generated_at)||'Ahora')+'</b><span>última comprobación</span></div></div>'+
  (Object.keys(groups).length?'<div class="s10-issues">'+Object.entries(groups).map(([k,g])=>{const t=KIND[k]||['Otro aviso de configuración','Revísalo con el soporte técnico.'];return'<article class="ev4-card s10-issue"><span class="s10-chip '+(g.sev==='alta'?'hi':'')+'">'+esc(SEV[g.sev]||'A revisar')+'</span><strong>'+esc(t[0])+(g.n>1?' ('+g.n+')':'')+'</strong><p>'+esc(t[1])+'</p></article>';}).join('')+'</div><div class="ev4-actions"><button class="btn secondary" type="button" data-s10-copy>Copiar detalle para el soporte técnico</button><span class="ev4-muted" data-s10-copied role="status"></span></div>':'')+
  (rl.length?'<h3>Bloqueos por exceso de intentos</h3><ul class="s10-plain">'+rl.map(r=>'<li>'+esc(BUCKET[r.bucket]||'Otros límites de uso')+': <strong>'+esc(r.blocked)+'</strong></li>').join('')+'</ul>':'');
}
/* ---------- Registro de actividad ---------- */
const RES={request:'Orden',charge:'Cobro',payment:'Pago',invoice:'Factura',staff_member:'Personal',staff_account:'Cuenta de usuario',file:'Archivo',session:'Sesión',quote:'Presupuesto',quote_draft:'Borrador de presupuesto',ai_job:'Asistente IA',billing_settings:'Ajustes de facturación',health:'Salud de la app',business_report:'Informe de negocio',review:'Reseña',tag:'Etiqueta',template:'Plantilla',permission:'Permisos'};
const ACT={INSERT:'Orden registrada',UPDATE:'Orden actualizada',DELETE:'Orden eliminada',asignacion:'Técnico asignado',visita_iniciar:'Visita iniciada',visita_pausar:'Visita pausada',pausa_visita:'Visita pausada al cerrar la jornada',
 personal_alta:'Alta de personal',personal_cambio_rol:'Cambio de rol o de estado',cuenta_retirada:'Acceso retirado',cuenta_reactivada:'Acceso reactivado',presupuesto_estado:'Cambio de estado del presupuesto',
 cobro_creado:'Cobro creado',cobro_anulado:'Cobro anulado',pago_registrado:'Pago registrado',pago_anulado:'Pago anulado',factura_borrador:'Borrador de factura',factura_emitida:'Factura emitida',factura_descartada:'Borrador de factura descartado',factura_rectificativa_borrador:'Borrador de factura rectificativa',
 ajustes_facturacion:'Ajustes de facturación cambiados',ajustes_salud:'Ajustes de alertas cambiados',archivo_firmado:'Archivo abierto',archivo_denegado:'Intento de abrir un archivo sin permiso',ia_consulta:'Consulta al asistente',ia_resumen:'Resumen de una orden',ia_borrador_presupuesto:'Borrador de presupuesto con asistente',
 sesiones_cerradas:'Sesiones cerradas',sesiones_forzadas:'Sesiones cerradas por administración',business_report:'Informe de negocio',review_received:'Reseña recibida',lead_source:'Origen de la solicitud registrado',request_tags:'Etiquetas de la orden',tag_save:'Etiqueta guardada',template_save:'Plantilla guardada',
 permiso_asignado:'Permiso asignado',permiso_retirado:'Permiso retirado',permiso_alcance:'Alcance de permiso cambiado'};
const OUT={ok:'Correcto',denegado:'Denegado',error:'Con error'};
const STL={nueva:'Recibida',en_revision:'En revisión',visita_programada:'Visita programada',presupuestada:'Presupuestada',aceptada:'Aceptada',en_ejecucion:'En ejecución',finalizada:'Finalizada',cancelada:'Cancelada',borrador:'Borrador',enviado:'Enviado',aceptado:'Aceptado',rechazado:'Rechazado',caducado:'Caducado',emitido:'Emitido'};
const human=c=>{c=String(c||'');if(ACT[c])return ACT[c];if(/^[a-z_]+$/.test(c)){const t=c.replace(/_/g,' ');return t.charAt(0).toUpperCase()+t.slice(1);}return'Acción registrada';};
function who(a){if(a.actor)return a.actor;const r=a.actor_role;if(r==='customer')return'Cliente';if(ROLE[r])return ROLE[r];if(r==='staff')return'Personal de ELEJEM';return'Sistema';}
function about(a){const d=a.detail||{},res=RES[a.resource]||'Registro';
 if(a.resource==='permission'&&d.role)return(ROLE[d.role]||'Rol')+' · '+itemName(d.resource,d.action);
 if(a.resource==='staff_member'&&Array.isArray(d.role))return'Rol: '+(ROLE[d.role[0]]||'—')+' → '+(ROLE[d.role[1]]||'—');
 if(a.resource==='staff_member'&&d.role)return'Rol: '+(ROLE[d.role]||'—');
 if(a.resource==='staff_account'&&d.username)return'Usuario '+d.username;
 if(a.resource==='quote'&&(d.from||d.to))return(d.quote_number?'Presupuesto '+d.quote_number+' · ':'')+(STL[d.from]||'—')+' → '+(STL[d.to]||'—');
 return(a.public_code?a.public_code:res);}
async function auditoria(ctx){
 const d=await B().rpc('elejem_audit_list',{p_resource:ctx.aud||null,p_actor:null,p_from:null,p_to:null,p_offset:ctx.offset||0});const items=d.items||[],off=ctx.offset||0,total=d.total||0;
 return'<div class="ev4-tabs u10-seg">'+[['','Todo'],['request','Órdenes'],['charge','Cobros'],['invoice','Facturas'],['staff_member','Personal'],['file','Archivos'],['session','Sesiones'],['permission','Permisos']].map(([k,v])=>'<button class="btn '+(k===(ctx.aud||'')?'primary':'secondary')+'" data-aud="'+k+'" aria-pressed="'+(k===(ctx.aud||''))+'">'+esc(v)+'</button>').join('')+'</div><p class="ev4-muted">Últimos 30 días. Este registro no se puede modificar ni borrar.</p>'+
 (items.length?'<div class="s10-audit" role="table" aria-label="Registro de actividad"><div class="s10-row s10-head" role="row"><span role="columnheader">Cuándo</span><span role="columnheader">Quién</span><span role="columnheader">Qué pasó</span><span role="columnheader">Sobre</span><span role="columnheader">Resultado</span></div>'+items.map(a=>'<div class="s10-row'+(a.outcome&&a.outcome!=='ok'?' bad':'')+'" role="row"><span role="cell" data-l="Cuándo">'+esc(fmt(a.occurred_at))+'</span><span role="cell" data-l="Quién">'+esc(who(a))+'</span><span role="cell" data-l="Qué pasó"><strong>'+esc(human(a.action))+'</strong></span><span role="cell" data-l="Sobre">'+esc(about(a))+'</span><span role="cell" data-l="Resultado"><span class="s10-chip '+(a.outcome&&a.outcome!=='ok'?'hi':'ok')+'">'+esc(OUT[a.outcome]||'Correcto')+'</span></span></div>').join('')+'</div>':'<p class="u10-empty">No hay actividad registrada en este periodo con ese filtro.</p>')+
 (total>40?'<div class="ev4-actions"><button class="btn secondary" data-page="-40"'+(off?'':' disabled')+'>Anterior</button><span>'+(off+1)+'–'+Math.min(off+40,total)+' de '+total+'</span><button class="btn secondary" data-page="40"'+(off+40<total?'':' disabled')+'>Siguiente</button></div>':'');
}
/* ---------- Permisos ---------- */
let state={role:'admin',matrix:[],pending:new Map(),editable:null,people:[],status:'idle',msg:''};
const cur=(r,res,act)=>{const k=key(r,res,act);if(state.pending.has(k))return state.pending.get(k);return state.matrix.find(p=>p.role===r&&p.resource===res&&p.action===act)?.scope||null;};
const orig=(r,res,act)=>state.matrix.find(p=>p.role===r&&p.resource===res&&p.action===act)?.scope||null;
function describeChange(k,sc){const [r,res,act]=k.split('|');const n=itemName(res,act);return(sc?'Dar a '+ROLE[r]+': «'+n+'»'+(sc!=='all'?' ('+SCOPE[sc].toLowerCase()+')':''):'Quitar a '+ROLE[r]+': «'+n+'»');}
function isDanger(k,sc){const [r,res,act]=k.split('|');const it=ITEMS.find(i=>i.resource===res&&i.action===act);return(sc&&it?.danger)||(sc&&r==='customer')||(!sc&&r==='admin');}
async function permisos(body){
 body.innerHTML='<p class="ev4-muted">Cargando permisos…</p>';
 const [m,ed,dir]=await Promise.all([B().rpc('elejem_permissions_matrix',{}),B().permissionsEditable?B().permissionsEditable().catch(()=>null):Promise.resolve(null),B().staffDirectory?B().staffDirectory().catch(()=>[]):Promise.resolve([])]);
 state.matrix=Array.isArray(m)?m:[];state.editable=ed;state.people=dir||[];if(state.status!=='error')state.status='idle';
 draw(body);return null;
}
function draw(body){
 const ro=state.editable!==true,r=state.role,role=ROLES.find(x=>x[0]===r);const people=state.people.filter(p=>p.role===r&&p.active!==false).map(p=>{const f=p.profile||{};return[f.first_name,f.last_name].filter(Boolean).join(' ')||p.name||p.username;});
 const n=state.pending.size;
 body.innerHTML=(ro?'<p class="s10-banner">'+(state.editable===null?'Puedes consultar los permisos. La edición se activará cuando se aplique la actualización pendiente del servidor.':'Solo administración puede cambiar los permisos.')+'</p>':'')+
 '<div class="u10-seg s10-roles" role="tablist" aria-label="Rol">'+ROLES.map(x=>'<button type="button" role="tab" class="btn '+(x[0]===r?'primary':'secondary')+'" aria-selected="'+(x[0]===r)+'" data-p10-role="'+x[0]+'">'+esc(x[1])+'</button>').join('')+'</div>'+
 '<div class="s10-roleinfo"><p><strong>'+esc(role[1])+'.</strong> '+esc(role[2])+'</p>'+(r!=='customer'?'<p class="ev4-muted">'+(people.length?'Personas con este rol: '+esc(people.join(', '))+'.':'Ahora mismo nadie tiene este rol.')+' Para cambiar lo que puede hacer una persona concreta, cambia su rol en <button type="button" class="s10-link" data-p10-users>Usuarios</button>.</p>':'')+'</div>'+
 AREAS.map(([aid,aname])=>{const list=ITEMS.filter(i=>i.area===aid&&i.roles.includes(r));if(!list.length)return'';return'<section class="s10-area" aria-label="'+esc(aname)+'"><h3>'+esc(aname)+'</h3>'+list.map(it=>{const k=key(r,it.resource,it.action),sc=cur(r,it.resource,it.action),lock=LOCK.has(k),changed=state.pending.has(k);const scopeSel=r==='technician'&&sc&&['ai','file','stalled','billing','invoice'].includes(it.resource);
  return'<div class="s10-perm'+(changed?' changed':'')+'"><label class="s10-switch"><input type="checkbox" data-p10-k="'+esc(k)+'"'+(sc?' checked':'')+(ro||lock?' disabled':'')+'><span aria-hidden="true"></span><b>'+esc(it.name)+(it.danger?' <em class="s10-chip hi">Delicado</em>':'')+'</b></label><p>'+esc(it.desc)+(lock?' <span class="ev4-muted">El administrador siempre lo conserva.</span>':'')+'</p>'+(scopeSel?'<label class="s10-scope">Alcance<select data-p10-scope="'+esc(k)+'"'+(ro?' disabled':'')+'><option value="assigned"'+(sc==='assigned'?' selected':'')+'>Solo sus órdenes asignadas</option><option value="all"'+(sc==='all'?' selected':'')+'>Todas las órdenes</option></select></label>':(sc&&sc!=='all'?'<p class="ev4-muted s10-scope-t">Alcance: '+esc(SCOPE[sc].toLowerCase())+'</p>':''))+'</div>';}).join('')+'</section>';}).join('')+
 '<details class="s10-fixed"><summary>Lo que depende solo del rol</summary><p>Estas capacidades no se cambian aquí, sino eligiendo el rol de cada persona en Usuarios:</p><ul><li><strong>Órdenes y agenda:</strong> Administración y Operaciones ven y planifican todas; el técnico solo las suyas.</li><li><strong>Clientes y postventa:</strong> Administración y Operaciones.</li><li><strong>Personal (equipo, jornadas y ausencias):</strong> Administración y Operaciones; cada técnico ve su propia jornada y disponibilidad.</li><li><strong>Usuarios y Seguridad:</strong> solo Administración.</li></ul></details>'+
 (ro?'':'<div class="s10-savebar" data-p10-bar><span data-p10-status role="status" class="'+(state.status==='error'?'err':n?'pend':'ok')+'">'+esc(state.status==='saving'?'Guardando…':state.status==='error'?state.msg:n?(n===1?'1 cambio sin guardar':n+' cambios sin guardar'):state.status==='saved'?'Cambios guardados':'Todo guardado')+'</span><button type="button" class="btn ghost" data-p10-undo'+(n&&state.status!=='saving'?'':' disabled')+'>Descartar</button><button type="button" class="btn primary" data-p10-save'+(n&&state.status!=='saving'?'':' disabled')+'>Guardar cambios</button></div>');
 wire(body);
}
function set(k,sc){const [r,res,act]=k.split('|');if(sc===orig(r,res,act))state.pending.delete(k);else state.pending.set(k,sc);if(state.status!=='saving')state.status='idle';}
function wire(body){
 body.querySelectorAll('[data-p10-role]').forEach(b=>b.onclick=()=>{state.role=b.dataset.p10Role;draw(body);body.querySelector('[data-p10-role="'+state.role+'"]')?.focus();});
 const u=body.querySelector('[data-p10-users]');if(u)u.onclick=()=>window.ElejemNavigation?.select('users');
 body.querySelectorAll('[data-p10-k]').forEach(c=>c.onchange=()=>{const k=c.dataset.p10K,[r,res,act]=k.split('|'),it=ITEMS.find(i=>i.resource===res&&i.action===act);set(k,c.checked?(orig(r,res,act)||defScope(r,it)):null);draw(body);body.querySelector('[data-p10-k="'+CSS.escape(k)+'"]')?.focus();});
 body.querySelectorAll('[data-p10-scope]').forEach(s=>s.onchange=()=>{set(s.dataset.p10Scope,s.value);draw(body);});
 const undo=body.querySelector('[data-p10-undo]');if(undo)undo.onclick=()=>{state.pending.clear();state.status='idle';draw(body);};
 const save=body.querySelector('[data-p10-save]');if(save)save.onclick=()=>commit(body);
}
async function commit(body){
 const changes=[...state.pending.entries()];if(!changes.length)return;
 const risky=changes.filter(([k,sc])=>isDanger(k,sc));
 if(risky.length&&!confirm('Vas a hacer cambios delicados:\n\n'+risky.map(([k,sc])=>'• '+describeChange(k,sc)).join('\n')+'\n\n¿Guardar?'))return;
 state.status='saving';draw(body);
 try{const r=await B().permissionSet(changes.map(([k,sc])=>{const [role,resource,action]=k.split('|');return{role,resource,action,scope:sc};}));
  state.matrix=Array.isArray(r?.matrix)?r.matrix:state.matrix.filter(p=>!state.pending.has(key(p.role,p.resource,p.action))).concat(changes.filter(c=>c[1]).map(([k,sc])=>{const [role,resource,action]=k.split('|');return{role,resource,action,scope:sc};}));
  state.pending.clear();state.status='saved';window.toast?.('Permisos guardados');
 }catch(e){state.status='error';state.msg=e.missing?'La edición de permisos aún no está activada en el servidor. No se ha cambiado nada.':'No se guardó: '+(e.message||'inténtalo de nuevo.');if(e.missing)state.editable=null;}
 draw(body);
}
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-s10-copy]');if(!b)return;const t='ELEJEM · Comprobación de seguridad '+new Date().toISOString()+'\n'+(window.__s10Tech||'');const done=()=>{const s=b.parentElement.querySelector('[data-s10-copied]');if(s)s.textContent='Copiado. Pégalo en el mensaje al soporte.';};if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t).then(done,()=>prompt('Copia este texto:',t));else{prompt('Copia este texto:',t);}});
window.ElejemSecurity10h={informe,auditoria,permisos,_state:()=>state,ITEMS,ROLE};
})();
