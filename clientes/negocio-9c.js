(function(){'use strict';
// Etapa 9C · Punto 55: página de reseña por enlace (?resena=token). La MISMA página para todos los clientes, sin pregunta previa
// de satisfacción ni estrellas. El enlace a Google solo aparece si administración lo ha configurado. El comentario es privado para ELEJEM.
// Punto 56: informes de negocio semanales y mensuales en Economía › Dashboard (solo oficina), con CSV e impresión. Sin envíos.
// 10G: el bloque se coloca en la pestaña Clientes del Dashboard ([data-edb-reports]) y avisa con «elejem:informe» para sus gráficas.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function anon(name,body){const c=window.ElejemBackend?.config;const r=await fetch(c.url+'/rest/v1/rpc/'+name,{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{apikey:c.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||'No se ha podido completar.');return d;}
async function reviewPage(token){for(const [n,c] of [['referrer','no-referrer'],['robots','noindex,nofollow']]){const m=document.createElement('meta');m.name=n;m.content=c;document.head.append(m);}
 window.showView?.('tracking',{skipLoadTracking:true});const box=document.querySelector('#trackingList');if(!box)return;
 box.innerHTML='<article class="card rv9-card"><h2>Tu opinión</h2><p>Cargando…</p></article>';
 let d;try{d=UUID.test(token)?await anon('elejem_review_public',{p_token:token,p_action:'ver'}):null;}catch(e){d=null;}
 if(!d){box.innerHTML='<article class="card rv9-card"><h2>Tu opinión</h2><p>Este enlace ya no está disponible. Si quieres comentarnos algo, escríbenos a support@example.invalid.</p></article>';return;}
 box.innerHTML='<article class="card rv9-card" data-review-page><h2>¿Qué tal ha ido '+esc(d.public_code)+'?</h2><p>Gracias por confiar en ELEJEM. Tu opinión, sea cual sea, nos ayuda a mejorar y a informar a otros clientes.</p>'+
  (d.review_url?'<p><a class="btn primary" data-google href="'+esc(d.review_url)+'" target="_blank" rel="noopener noreferrer">Dejar una reseña pública en Google</a></p><p class="eq-notice">Se abre la página de Google. Escribes tu reseña con tu cuenta y ELEJEM no la modifica.</p>':'')+
  '<form data-review-comment><label>'+(d.review_url?'Además, si quieres, un comentario privado para ELEJEM':'Comentario para ELEJEM')+'<textarea name="c" rows="4" maxlength="1000" required></textarea></label><button class="btn secondary">Enviar comentario</button><p class="eq-error" role="alert" data-err></p></form>'+(d.commented?'<p class="eq-notice">Ya nos enviaste un comentario. Si envías otro, sustituye al anterior.</p>':'')+'</article>';
 const g=box.querySelector('[data-google]');if(g)g.addEventListener('click',()=>{anon('elejem_review_public',{p_token:token,p_action:'clic'}).catch(()=>{});});
 const f=box.querySelector('[data-review-comment]');f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;try{await anon('elejem_review_public',{p_token:token,p_action:'comentario',p_comment:f.elements.c.value});f.innerHTML='<p class="eq-notice" data-thanks>Gracias. Hemos recibido tu comentario.</p>';}catch(err){f.querySelector('[data-err]').textContent=err.message;b.disabled=false;}};}
// ---- Informes de negocio (56)
const LBL={total:'Solicitudes',web:'Desde la web',oficina:'Creadas en oficina',urgentes:'Urgentes',canceladas:'Canceladas',emitidos:'Presupuestos emitidos',aceptados:'Presupuestos aceptados',importe_emitido:'Importe emitido (€)',importe_aceptado:'Importe aceptado (€)',finalizados:'Trabajos finalizados',solicitadas:'Reseñas solicitadas',abiertas:'Enlaces de reseña abiertos',clic:'Clic en Google',recibidas:'Reseñas recibidas'};
function rows(d){const out=[];const add=(sec,k,v)=>out.push([sec,LBL[k]||k,v]);
 for(const [k,v] of Object.entries(d.solicitudes||{}))add('Solicitudes',k,v);for(const [k,v] of Object.entries(d.presupuestos||{}))add('Presupuestos',k,v);
 add('Trabajos','finalizados',d.trabajos?.finalizados??0);add('Trabajos','Partes cerrados',d.partes_cerrados??0);for(const [k,v] of Object.entries(d.resenas||{}))add('Reseñas',k,v);
 for(const [k,v] of Object.entries(d.por_servicio||{}))add('Por servicio',k,v);for(const m of d.por_municipio||[])add('Por municipio',m.municipio,m.n);
 for(const [k,v] of Object.entries(d.por_canal||{}))add('Procedencia',k==='sin_dato'?'Sin dato':k,v);for(const [k,v] of Object.entries(d.web||{}))add('Web (medición anónima)',k,v);return out;}
const csvCell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return /[";\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
function csv(rep){return '\ufeff'+[['Sección','Concepto','Valor'],...rows(rep.data)].map(r=>r.map(csvCell).join(';')).join('\r\n');}
const fmtD=s=>{const [y,m,d]=String(s).split('-');return d+'/'+m+'/'+y;};
const lastDay=s=>{const t=new Date(s+'T12:00:00Z');t.setUTCDate(t.getUTCDate()-1);return t.toISOString().slice(0,10);};
let kind='semanal';
async function mountReports(id){const pane=window.ElejemNavigation?.pane('dashboard');const role=window.ElejemStaffSession?.role;if(!pane||!['admin','operator'].includes(role))return;
 let box=pane.querySelector('[data-informes]');const host=pane.querySelector('[data-edb-reports]')||pane;if(!box){box=document.createElement('section');box.className='es-box in9-box';box.dataset.informes='';host.append(box);}else if(box.parentElement!==host)host.append(box);
 box.innerHTML='<h3>Informes de negocio</h3><p>Cargando…</p>';
 try{const r=await ElejemBackend.rpc('elejem_business_reports',{p_kind:kind,p_id:id||null,p_regenerate:false});const rep=r.report;
  box.innerHTML='<h3>Informes de negocio</h3><p class="eq-notice">Se generan solos cada lunes (semana anterior) y cada día 1 (mes anterior). Solo totales: sin datos de clientes. No se envían por correo.</p>'+
   '<div class="ev4-actions" role="group" aria-label="Periodo"><button class="btn '+(kind==='semanal'?'primary':'secondary')+'" data-kind="semanal" aria-pressed="'+(kind==='semanal')+'">Semanales</button><button class="btn '+(kind==='mensual'?'primary':'secondary')+'" data-kind="mensual" aria-pressed="'+(kind==='mensual')+'">Mensuales</button>'+
   (r.list.length?'<label class="in9-pick">Periodo <select data-pick>'+r.list.map(x=>'<option value="'+esc(x.id)+'"'+(rep&&x.id===rep.id?' selected':'')+'>'+fmtD(x.period_start)+' – '+fmtD(lastDay(x.period_end))+'</option>').join('')+'</select></label>':'')+
   (role==='admin'?'<button class="btn ghost" data-regen>Generar el último periodo</button>':'')+'</div>'+
   (rep?'<div data-informe><table class="in9-table"><caption>Informe '+esc((window.ElejemTextos?ElejemTextos.label('none',rep.kind):rep.kind).toLowerCase())+' · '+fmtD(rep.period_start)+' – '+fmtD(lastDay(rep.period_end))+'</caption><thead><tr><th scope="col">Sección</th><th scope="col">Concepto</th><th scope="col">Valor</th></tr></thead><tbody>'+rows(rep.data).map(x=>'<tr><td>'+esc(x[0])+'</td><td>'+esc(x[1])+'</td><td>'+esc(/€/.test(x[1])?new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(x[2]):x[2])+'</td></tr>').join('')+'</tbody></table><div class="ev4-actions"><button class="btn secondary" data-csv>Descargar CSV</button><button class="btn secondary" data-print>Imprimir</button></div></div>':'<p>Aún no hay informes '+(kind==='semanal'?'semanales':'mensuales')+'.</p>')+'<p class="eq-error" role="alert" data-err></p>';
  dispatchEvent(new CustomEvent('elejem:informe',{detail:{report:rep||null,kind}}));
  box.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;mountReports();});
  const pick=box.querySelector('[data-pick]');if(pick)pick.onchange=()=>mountReports(pick.value);
  const rg=box.querySelector('[data-regen]');if(rg)rg.onclick=async()=>{rg.disabled=true;try{await ElejemBackend.rpc('elejem_business_reports',{p_kind:kind,p_id:rep?.id||null,p_regenerate:true});mountReports();}catch(e){box.querySelector('[data-err]').textContent=e.message;rg.disabled=false;}};
  const c=box.querySelector('[data-csv]');if(c)c.onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv(rep)],{type:'text/csv;charset=utf-8'}));a.download='elejem-informe-'+rep.kind+'-'+rep.period_start+'.csv';document.body.append(a);a.click();a.remove();};
  const pr=box.querySelector('[data-print]');if(pr)pr.onclick=()=>{document.body.classList.add('in9-printing');box.classList.add('in9-print');window.print();setTimeout(()=>{document.body.classList.remove('in9-printing');box.classList.remove('in9-print');},500);};
 }catch(e){box.innerHTML='<h3>Informes de negocio</h3><p class="eq-error">'+esc(e.message)+'</p>';dispatchEvent(new CustomEvent('elejem:informe',{detail:{error:e.message,kind}}));}}
addEventListener('elejem:pane',e=>{if(e.detail.id==='dashboard')setTimeout(()=>mountReports(),0);});
const t=new URLSearchParams(location.search).get('resena');if(t&&!window.ElejemArea?.staff){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>reviewPage(t));else reviewPage(t);}
window.ElejemNegocio={reviewPage,mountReports,csv,rows};
})();
