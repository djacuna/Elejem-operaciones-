/* Etapa 10E · Vista de órdenes: cabecera fija con acciones, secciones por pestañas, lista densa,
   KPI como filtros, historial con nombres, atajos de teclado y detalle a pantalla completa en móvil.
   Solo reorganiza visualmente: no elimina ni sustituye controles, IDs ni llamadas existentes. */
(function(){
'use strict';
const SECS=[['resumen','Resumen'],['plan','Planificación'],['presupuesto','Presupuesto'],['fotos','Fotos y notas'],['ubicacion','Ubicación'],['historial','Historial']];
const NEXT={borrador:'Completa los datos y registra la orden.',nueva:'Revisa la solicitud y contacta con el cliente.',en_revision:'Programa la visita o registra el presupuesto.',informacion_pendiente:'Pide al cliente la información que falta.',visita_programada:'Confirma la visita y prepara el presupuesto.',presupuestada:'Haz seguimiento del presupuesto antes de que venza.',aceptada:'Planifica la ejecución y asigna técnico.',en_ejecucion:'Completa el parte de trabajo y las fotos.',finalizada:'Orden cerrada. Revisa el historial si hace falta.',cancelada:'Orden cancelada.'};
const H3={'descripción':'resumen','valoración preliminar':'resumen','notas internas':'fotos','observaciones del técnico':'fotos','fotografías':'fotos','historial de gestión':'historial'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cases=()=>{try{return typeof adminCases!=='undefined'&&Array.isArray(adminCases)?adminCases:[]}catch(_){return []}};
const labels=()=>{try{return typeof statusLabels!=='undefined'?statusLabels:{}}catch(_){return {}}};
const mobile=()=>matchMedia('(max-width:980px)').matches;
let active='resumen',lastOrder=null,staffNames=null;

function classify(el,cur){
  const id=el.id||'',cl=el.classList,t=el.tagName;
  if(cl.contains('od-bar')||cl.contains('od-tabs')||cl.contains('od-dock'))return null;
  if(['closeCase'].includes(id)||(t==='SPAN'&&(cl.contains('badge')||cl.contains('age-chip')))||t==='H2'||cl.contains('ops-meta'))return 'resumen';
  if(t==='H3'){const k=el.textContent.trim().toLowerCase();return H3[k]||cur;}
  if(cl.contains('context-row')||cl.contains('ops-contact-actions')||cl.contains('divider')||cl.contains('tg9-detail'))return 'resumen';
  if(id==='adminNotes'||id==='adminPhotos')return 'fotos';
  if(id==='copyTracking'||(t==='A'&&/wa\.me/.test(el.getAttribute('href')||'')))return 'resumen';
  if(cl.contains('field')||id==='savePlanning')return 'plan';
  if(id==='sendQuote'||cl.contains('eq-section'))return 'presupuesto';
  if(cl.contains('er-section'))return 'plan';
  if(id==='orderAudit'||id==='deleteCase')return 'historial';
  if(cl.contains('ew-site')||cl.contains('es-visita')||cl.contains('es-box'))return 'ubicacion';
  if(t==='P'&&cur==='resumen'&&!el.previousElementSibling?.matches('h3'))return 'resumen';
  return cur;
}
function order(panel){return cases().find(o=>o.id===panel.dataset.orderId)||null}
function bar(panel,o){
  const L=labels(),code=o?.public_code||panel.querySelector('h2')?.textContent||'Orden';
  const tel=panel.querySelector('.ops-contact-actions a[href^="tel:"]'),mail=panel.querySelector('.ops-contact-actions a[href^="mailto:"]'),wa=panel.querySelector('a[href*="wa.me"]');
  const pr=o?.priority||'normal',st=o?.status||'',PRL={normal:'Normal',alta:'Alta',urgente:'Urgente',emergencia:'Emergencia'},prl=PRL[pr]||(window.ElejemTextos?ElejemTextos.label('priority',pr):pr);
  const b=document.createElement('div');b.className='od-bar';b.setAttribute('role','region');b.setAttribute('aria-label','Orden '+code);
  b.innerHTML=`<div class="od-top"><button type="button" class="od-back" data-od-act="close" aria-label="Volver a la lista">‹<span> Órdenes</span></button><div class="od-id"><strong>${esc(code)}</strong><span class="od-chip st-${esc(st)}">${esc(L[st]||st||'—')}</span><span class="od-prio p-${pr==='normal'?'normal':'alta'}" title="Prioridad ${esc(prl.toLowerCase())}"><i></i>${esc(prl)}</span></div><button type="button" class="od-x" data-od-act="close" aria-label="Cerrar detalle">✕</button></div>`+
  `<div class="od-who"><span class="od-cust">${esc(o?.customer_name||'')}${o?.municipality?' · '+esc(o.municipality):''}</span>${NEXT[st]?`<span class="od-next" title="Siguiente paso: ${esc(NEXT[st])}"><span>Siguiente</span>${esc(NEXT[st])}</span>`:''}</div>`+
  `<div class="od-actions">${tel?`<a class="od-btn" href="${esc(tel.getAttribute('href'))}">Llamar</a>`:''}${wa?`<button type="button" class="od-btn" data-od-act="wa">WhatsApp</button>`:''}${mail?`<a class="od-btn" href="${esc(mail.getAttribute('href'))}">Correo</a>`:''}${panel.querySelector('#adminStatus')?`<button type="button" class="od-btn gold" data-od-act="status" aria-label="Cambiar estado" title="Cambiar estado">Estado</button>`:''}</div>`;
  b.onclick=e=>{const a=e.target.closest('[data-od-act]');if(!a)return;const k=a.dataset.odAct;
    if(k==='close'){panel.querySelector('#closeCase')?.click();panel.classList.remove('open');}
    if(k==='wa')wa?.click();
    if(k==='status'){show(panel,'plan');const s=panel.querySelector('#adminStatus');s?.focus();s?.scrollIntoView({block:'center',behavior:reduce()?'auto':'smooth'});}};
  return b;
}
const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function tabs(panel,present){
  const n=document.createElement('div');n.className='od-tabs';n.setAttribute('role','tablist');n.setAttribute('aria-label','Secciones de la orden');
  n.innerHTML=SECS.filter(([k])=>present.has(k)).map(([k,l])=>`<button type="button" role="tab" data-od-tab="${k}" id="od-tab-${k}" aria-selected="${k===active}" tabindex="${k===active?0:-1}">${l}</button>`).join('');
  n.onclick=e=>{const b=e.target.closest('[data-od-tab]');if(b)show(panel,b.dataset.odTab,true)};
  n.onkeydown=e=>{const bs=[...n.querySelectorAll('[data-od-tab]')],i=bs.indexOf(document.activeElement);if(i<0)return;let j=null;if(e.key==='ArrowRight')j=(i+1)%bs.length;if(e.key==='ArrowLeft')j=(i-1+bs.length)%bs.length;if(e.key==='Home')j=0;if(e.key==='End')j=bs.length-1;if(j!==null){e.preventDefault();bs[j].focus();show(panel,bs[j].dataset.odTab)}};
  return n;
}
function show(panel,k,scroll){
  if(!panel.querySelector(`[data-od-tab="${k}"]`))k='resumen';active=k;panel.dataset.odActive=k;
  panel.querySelectorAll('[data-od-tab]').forEach(b=>{const on=b.dataset.odTab===k;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;if(on&&b.scrollIntoView)b.scrollIntoView({block:'nearest',inline:'nearest'})});
  if(scroll){const t=panel.querySelector('.od-tabs');const top=t?t.offsetTop-(panel.querySelector('.od-bar')?.offsetHeight||0):0;if(panel.scrollTop>top)panel.scrollTop=Math.max(0,top);}
}
function decorate(panel){
  if(!panel.classList.contains('open')||!panel.dataset.orderId){document.documentElement.classList.remove('od-lock');delete panel.dataset.odActive;return}
  const o=order(panel);
  if(lastOrder!==panel.dataset.orderId){lastOrder=panel.dataset.orderId;active='resumen'}
  let cur='resumen';const present=new Set();
  for(const el of [...panel.children]){const s=el.dataset.odSec||classify(el,cur);if(!s)continue;el.dataset.odSec=s;cur=s;present.add(s);}
  panel.classList.add('od');
  if(!panel.querySelector(':scope>.od-bar')){panel.prepend(bar(panel,o));}
  const old=panel.querySelector(':scope>.od-tabs'),key=[...present].join();
  if(!old||old.dataset.k!==key){const t=tabs(panel,present);t.dataset.k=key;old?old.replaceWith(t):panel.querySelector(':scope>.od-bar').after(t)}
  // Etiquetas de sección visibles cuando se muestran todas (impresión / lectores)
  const ob=panel.querySelector(':scope>.od-bar');if(ob)panel.style.setProperty('--od-bar-h',ob.offsetHeight+'px');
  show(panel,active);
  document.documentElement.classList.toggle('od-lock',mobile());
  names(panel);
}
async function names(panel){
  const box=panel.querySelector('#orderAudit');if(!box||box.__od===box.innerHTML||!/Usuario /.test(box.textContent))return;box.__od=box.innerHTML;
  if(!staffNames){staffNames={};try{const list=await window.ElejemBackend?.staffDirectory?.();(list||[]).forEach(s=>{const id=s.user_id||s.id;if(id)staffNames[id]=s.name||s.full_name||s.username})}catch(_){}}
  box.querySelectorAll('small').forEach(sm=>{sm.innerHTML=sm.innerHTML.replace(/Usuario ([0-9a-zA-Z-]{2,})/g,(m,id)=>staffNames[id]?esc(staffNames[id]):'Usuario '+esc(id.length>12?id.slice(0,8)+'…':id))});box.__od=box.innerHTML;
}
function decorateList(){
  const list=document.getElementById('caseList');if(!list)return;const by=new Map(cases().map(o=>[o.public_code,o]));const L=labels();
  list.querySelectorAll('.case').forEach(r=>{if(r.dataset.od)return;r.dataset.od='1';const o=by.get(r.querySelector('.case-id')?.textContent.trim());
    r.tabIndex=0;r.setAttribute('role','button');
    if(o){const hi=o.priority&&o.priority!=='normal';r.classList.toggle('od-hi',!!hi);const d=document.createElement('i');d.className='od-dot'+(hi?' hi':'');d.title=hi?'Prioridad alta':'Prioridad normal';r.prepend(d);
      const s=[...r.children].find(e=>e.tagName==='STRONG');if(s){s.classList.add('od-chip','st-'+o.status)}r.setAttribute('aria-label',`${o.public_code}, ${L[o.status]||o.status}, ${o.customer_name||''}`)}
    r.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();r.click()}});});
}
function kpis(){
  const m=document.getElementById('adminMetrics');if(!m)return;m.classList.add('od-kpis');
  const map=['all','alta','visita_programada','presupuestada'];
  [...m.querySelectorAll('.metric')].forEach((x,i)=>{if(x.dataset.od)return;x.dataset.od='1';const f=map[i];if(!f)return;x.tabIndex=0;x.setAttribute('role','button');x.setAttribute('aria-label','Filtrar: '+x.querySelector('small')?.textContent);
    const go=()=>{document.querySelector(`[data-admin-filter="${f}"]`)?.click();m.querySelectorAll('.metric').forEach(y=>y.classList.toggle('od-on',y===x))};x.addEventListener('click',go);x.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}})});
}
function visible(el){return !!el&&el.offsetParent!==null}
function keys(e){
  if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;const typing=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const list=document.getElementById('caseList');if(!visible(list)||document.querySelector('dialog[open]'))return;const panel=document.getElementById('caseDetail');
  if(e.key==='Escape'){if(panel?.classList.contains('open')){if(typing)t.blur();panel.querySelector('#closeCase')?.click();panel.classList.remove('open');list.querySelector('.case.active')?.focus();e.preventDefault()}return}
  if(typing)return;
  if(e.key==='/'){const s=document.getElementById('adminSearch');if(s){e.preventDefault();s.focus();s.select?.()}return}
  if(e.key==='j'||e.key==='k'){const rows=[...list.querySelectorAll('.case')];if(!rows.length)return;let i=rows.findIndex(r=>r.classList.contains('active'));i=e.key==='j'?Math.min(rows.length-1,i+1):Math.max(0,i<0?0:i-1);e.preventDefault();rows[i].click();rows[i].focus({preventScroll:true});rows[i].scrollIntoView({block:'nearest'})}
}
function init(){
  const panel=document.getElementById('caseDetail'),list=document.getElementById('caseList'),m=document.getElementById('adminMetrics');if(!panel||!list)return;
  let q=false;const run=()=>{q=false;decorate(panel);decorateList();kpis()};const sched=()=>{if(!q){q=true;requestAnimationFrame(run)}};
  new MutationObserver(sched).observe(panel,{childList:true,attributes:true,attributeFilter:['class']});
  new MutationObserver(sched).observe(list,{childList:true});if(m)new MutationObserver(sched).observe(m,{childList:true});
  const audit=new MutationObserver(()=>names(panel));audit.observe(panel,{childList:true,subtree:true});
  document.addEventListener('keydown',keys);addEventListener('resize',sched);
  const hint=document.createElement('p');hint.className='od-hint';hint.innerHTML='Atajos: <kbd>j</kbd>/<kbd>k</kbd> navegar · <kbd>/</kbd> buscar · <kbd>Esc</kbd> cerrar';list.after(hint);
  sched();
}
window.ElejemOrdenes10E={decorate,classify,SECS};
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
