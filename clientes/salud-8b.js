(function(){'use strict';
// Etapa 8B · Puntos 43 y 44. Errores de la app y analítica agregada SIN datos personales:
// no envía usuario, sesión, IP (la RPC no la guarda), cookies ni identificadores; no usa almacenamiento persistente para seguir a nadie.
// Se envía con la clave pública y rol anónimo, en lotes. Con «No rastrear»/GPC no se envía analítica (los errores sí, depurados).
const area=window.ElejemArea?.host||'desconocida',VERSION=(document.querySelector('script[src*="salud-8b.js"]')?.src.match(/v=([^&]+)/)||[])[1]||'';
const NO_TRACK=navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl===true;
const browser=(()=>{const u=navigator.userAgent;const m=u.match(/(Edg|OPR|SamsungBrowser|Firefox|Chrome|Safari)\/(\d+)/);return m?({Edg:'Edge',OPR:'Opera',SamsungBrowser:'Samsung'}[m[1]]||m[1])+' '+m[2]:'otro';})();
const scrub=s=>String(s??'').replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[correo]').replace(/\?[^\s"')]*/g,'?[…]').replace(/[A-Za-z0-9_\-]{24,}/g,'[token]').replace(/\+?\d[\d .-]{7,}\d/g,'[número]').slice(0,300);
const errors=[],events=[],seen=new Map();let timer=null,sent=0;
function cfg(){const c=window.ElejemBackend?.config;if(c&&/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(c.url))return c;return null;}
function schedule(ms=15000){if(!timer)timer=setTimeout(()=>{timer=null;flush();},ms);}
function report(kind,message,source,line){const m=scrub(message);if(!m)return;const key=kind+'|'+m+'|'+source;const n=(seen.get(key)||0)+1;seen.set(key,n);if(n>5||errors.length>=20)return;
 errors.push({kind,message:m,source:scrub(String(source||'').replace(/^https?:\/\/[^/]+/,'')).slice(0,200),line:Number.isInteger(line)?line:null});schedule(errors.length>=5?2000:15000);}
function track(name){if(NO_TRACK||!/^[a-z0-9_.:-]{2,48}$/.test(name)||events.length>=60)return;events.push(name);schedule();}
async function flush(useBeacon){const c=cfg();if(!c||(!errors.length&&!events.length)||sent>=40)return false;if(navigator.onLine===false){schedule(30000);return false;}
 const body=JSON.stringify({p_area:area,p_version:VERSION,p_browser:browser,p_errors:errors.splice(0,20),p_events:events.splice(0,60)});sent++;
 try{const r=await fetch(c.url+'/rest/v1/rpc/elejem_client_report',{method:'POST',keepalive:!!useBeacon,credentials:'omit',referrerPolicy:'no-referrer',headers:{apikey:c.key,'Content-Type':'application/json'},body});return r.ok;}catch{return false;}}
addEventListener('error',e=>{if(e.target&&e.target!==window&&(e.target.src||e.target.href)){report('recurso','No carga '+(e.target.tagName||'').toLowerCase(),e.target.src||e.target.href,null);return;}report('error',e.message||'Error',e.filename,e.lineno);},true);
addEventListener('unhandledrejection',e=>{const r=e.reason;report('promesa',r?.message||String(r||'Promesa rechazada'),r?.stack?.split('\n')[1]?.trim()||'',null);});
// Fallos de servidor de nuestra API (5xx) y de red cuando hay conexión.
const of=window.fetch;if(of)window.fetch=async function(input,init){const url=String(input?.url||input);const ours=cfg()&&url.startsWith(cfg().url)&&!url.includes('elejem_client_report');try{const r=await of.apply(this,arguments);if(ours&&r.status>=500)report('red','HTTP '+r.status,url.replace(cfg().url,'').split('?')[0],null);return r;}catch(err){if(ours&&navigator.onLine!==false&&err?.name!=='AbortError')report('red','Sin respuesta del servidor',url.replace(cfg().url,'').split('?')[0],null);throw err;}};
navigator.serviceWorker?.addEventListener?.('error',()=>report('sw','Error del service worker','sw.js',null));
addEventListener('elejem:pane',e=>track('vista:'+e.detail.id));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush(true);});
addEventListener('online',()=>schedule(3000));
document.addEventListener('DOMContentLoaded',()=>track(window.ElejemArea?.staff?'abre:operaciones':'abre:portal'));
// Panel de salud para administración (dentro de Seguridad).
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KINDS={error:'Fallo de la aplicación',promesa:'Fallo de la aplicación',red:'Fallo de conexión con el servidor',recurso:'Un archivo de la app no cargó',sw:'Fallo de la app instalada'};
const areaName=a=>({operaciones:'Centro de operaciones',clientes:'Área de clientes',gestion:'Centro de operaciones',portal:'Área de clientes',web:'Web pública',desconocida:'Sin identificar'}[a]||'Sin identificar');
const verName=v=>{const m=String(v||'').match(/^(\d{4})(\d\d)(\d\d)/);return m?'versión del '+(+m[3])+'/'+(+m[2])+'/'+m[1]:'versión sin identificar';};
const errTitle=e=>{if(e.kind==='recurso'||e.kind==='sw')return KINDS[e.kind];const m=String(e.message||'');if(/^[^a-z]*[áéíóúñÁÉÍÓÚÑ¿¡]|^(No |Sin |Error del)/.test(m)&&!/HTTP \d/.test(m))return m;if(/HTTP 5\d\d|Sin respuesta/.test(m))return'El servidor no respondió';return KINDS[e.kind]||'Fallo de la aplicación';};
const VIEW={orders:'Órdenes',operations:'Operativa',agenda:'Agenda',availability:'Disponibilidad',notices:'Avisos',clients:'Clientes',aftersales:'Postventa',shift:'Mi jornada',personnel:'Equipo',users:'Usuarios',security:'Seguridad',billing:'Cobros y facturas',dashboard:'Dashboard',profitability:'Rentabilidad',materials:'Materiales',inventory:'Inventario',profile:'Mi perfil',sessions:'Sesiones',ai:'Asistente IA',templates:'Plantillas',portal:'Portal del cliente'};
const useName=ev=>{const s=String(ev||''),[k,v]=s.split(':');const L=window.ElejemNavigation?.labels||{};if(k==='vista')return'Abrir '+(L[v]||VIEW[v]||'otra pantalla');if(k==='abre')return v==='operaciones'?'Entrar en el centro de operaciones':'Entrar en el área de clientes';return'Otra acción';};
async function mountHealth(){const pane=window.ElejemNavigation?.pane('security');if(!pane||window.ElejemStaffSession?.role!=='admin')return;let box=pane.querySelector('[data-salud]');if(!box){box=document.createElement('section');box.className='es-box sl8-box';box.dataset.salud='';pane.append(box);}
 box.innerHTML='<h3>Salud de la app</h3><p class="eq-notice">Errores y uso agregados, sin datos personales.</p><p>Cargando…</p>';
 try{const r=await ElejemBackend.rpc('elejem_health_report',{p_days:7});const s=r.settings||{};const max=Math.max(1,...(r.usage_by_day||[]).map(x=>x.hits));
  box.innerHTML='<h3>Salud de la app</h3><p class="eq-notice">Últimos '+r.days+' días · errores y uso agregados, sin usuarios ni IP.</p><div class="sl8-kpis"><div><strong>'+r.errors_total+'</strong><span>errores</span></div><div><strong>'+(r.top_errors||[]).length+'</strong><span>tipos distintos</span></div><div><strong>'+(r.usage||[]).reduce((n,u)=>n+u.hits,0)+'</strong><span>eventos de uso</span></div></div>'+
  '<h4>Uso diario (pantallas abiertas)</h4><div class="sl8-bars" role="img" aria-label="Uso diario">'+(r.usage_by_day||[]).map(d=>'<span title="'+esc(new Date(d.day+'T12:00:00Z').toLocaleDateString('es-ES',{day:'numeric',month:'short'}))+': '+d.hits+'" style="height:'+Math.round(100*d.hits/max)+'%"></span>').join('')+'</div>'+
  '<h4>Errores más frecuentes</h4>'+((r.top_errors||[]).length?'<div class="sl8-list">'+r.top_errors.map(e=>'<article class="ev4-card"><strong>'+esc(errTitle(e))+'</strong><p class="ev4-muted">'+esc(areaName(e.area))+' · '+e.hits+(e.hits===1?' vez':' veces')+' · '+esc(verName(e.version))+'</p></article>').join('')+'<div class="ev4-actions"><button type="button" class="btn ghost" data-salud-copy>Copiar detalle para el soporte técnico</button></div>'+'</div>':'<p>Sin errores registrados.</p>')+
  '<h4>Lo más usado</h4><ol class="sl8-top">'+(r.usage||[]).slice(0,12).map(u=>'<li>'+esc(useName(u.event))+' <small>('+esc(areaName(u.area))+')</small> · '+u.hits+'</li>').join('')+'</ol>'+
  '<details><summary>Ajustes de alertas</summary><form data-salud-form class="es-grid"><label>Errores/hora para alertar<input name="a" type="number" min="1" value="'+esc(s.alert_errors_per_hour)+'"></label><label>Repeticiones de un error nuevo<input name="n" type="number" min="1" value="'+esc(s.alert_new_fingerprint_hits)+'"></label><label>Conservar (días)<input name="r" type="number" min="7" max="400" value="'+esc(s.retention_days)+'"></label><label class="eu7-switch"><input name="an" type="checkbox"'+(s.analytics_enabled?' checked':'')+'> Registrar el uso de la app (sin datos personales)</label><button class="btn secondary">Guardar</button></form></details><p class="eq-error" data-salud-error role="alert"></p>';
  const cp=box.querySelector('[data-salud-copy]');if(cp)cp.onclick=()=>{const t=(r.top_errors||[]).map(e=>[e.kind,e.area,e.message,(e.source||'')+(e.line?':'+e.line:''),e.hits+'x',e.version].join(' | ')).join('\n');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t).then(()=>window.toast?.('Detalle copiado'),()=>prompt('Copia este texto:',t));else prompt('Copia este texto:',t);};
  const f=box.querySelector('[data-salud-form]');f.onsubmit=async e=>{e.preventDefault();try{await ElejemBackend.rpc('elejem_health_settings_save',{p_alert_errors:+f.elements.a.value,p_alert_new:+f.elements.n.value,p_retention:+f.elements.r.value,p_analytics:f.elements.an.checked});window.toast?.('Ajustes guardados');}catch(err){box.querySelector('[data-salud-error]').textContent=err.message;}};
 }catch(e){box.innerHTML='<h3>Salud de la app</h3><p class="eq-error">'+esc(e.message)+'</p>';}}
addEventListener('elejem:pane',e=>{if(e.detail.id==='security')setTimeout(mountHealth,0);});
window.ElejemSalud={report,track,flush,_state:()=>({errors:errors.slice(),events:events.slice(),NO_TRACK}),mountHealth,scrub};
})();
