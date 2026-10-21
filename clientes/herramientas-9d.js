(function(){'use strict';
// Etapa 9D · 57 plantillas (rellenan borradores; nunca emiten ni envían), 58 búsqueda global (permisos en servidor),
// 59 etiquetas operativas (chips en la orden y filtro en la bandeja) y selector de procedencia (54) en la orden.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const role=()=>window.ElejemStaffSession?.role;const office=()=>['admin','operator'].includes(role());
const rpc=(n,b)=>window.ElejemBackend.rpc(n,b);
const KIND={presupuesto:'Presupuesto',parte:'Parte de trabajo',comunicacion:'Comunicación',informe:'Informe'};
const TYPE={orden:'Orden',cliente:'Cliente',presupuesto:'Presupuesto',parte:'Parte',material:'Material',plantilla:'Plantilla',etiqueta:'Etiqueta'};
const CHANNELS={buscador:'Buscador',pago:'Anuncio de pago',redes:'Redes sociales',whatsapp:'WhatsApp',telefono:'Teléfono',correo:'Correo',recomendacion:'Recomendación',referido_web:'Otra web',directo:'Directo',asistente:'Asistente',otro:'Otro',desconocido:'Desconocido'};
const debounce=(fn,ms)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};};
// ---------- 58 · Búsqueda global
let seq=0;
function mountSearch(){const content=document.querySelector('#adminWorkspace .ops-content'),bar=document.querySelector('#ops-navigation .ops-bar');if((!content&&!bar)||document.querySelector('[data-gs9]'))return;
 const box=document.createElement('div');box.className='gs9';box.dataset.gs9='';box.setAttribute('role','search');
 box.innerHTML='<label class="gs9-field"><span class="sr-only">Buscar en todo</span><input type="search" autocomplete="off" spellcheck="false" placeholder="Buscar orden, cliente, presupuesto…" aria-label="Buscar en todo (atajo /)" aria-controls="gs9-results" aria-expanded="false" role="combobox" aria-autocomplete="list"></label><div id="gs9-results" class="gs9-results" role="listbox" aria-label="Resultados" hidden></div><p class="sr-only" aria-live="polite" data-gs9-status></p>';
 if(content)content.prepend(box);else bar.append(box);
 const input=box.querySelector('input'),list=box.querySelector('[role=listbox]'),status=box.querySelector('[data-gs9-status]');let items=[],at=-1;
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');at=-1;input.removeAttribute('aria-activedescendant');};
 const paint=()=>{list.querySelectorAll('[role=option]').forEach((o,i)=>{o.setAttribute('aria-selected',String(i===at));if(i===at){input.setAttribute('aria-activedescendant',o.id);o.scrollIntoView?.({block:'nearest'});}});};
 const run=debounce(async()=>{const q=input.value.trim();const my=++seq;if(q.length<2){items=[];list.replaceChildren();close();return;}
  try{const r=await rpc('elejem_global_search',{p_q:q});if(my!==seq)return;items=r.items||[];
   list.innerHTML=items.length?items.map((x,i)=>'<div role="option" id="gs9-o'+i+'" data-i="'+i+'" aria-selected="false"><span class="gs9-type">'+esc(TYPE[x.type]||x.type)+'</span><strong>'+esc(x.title)+'</strong><small>'+esc(x.subtitle||'')+'</small></div>').join(''):'<p class="gs9-empty">Sin resultados para «'+esc(q)+'».</p>';
   list.hidden=false;input.setAttribute('aria-expanded','true');at=-1;status.textContent=items.length+' resultados';
   list.querySelectorAll('[role=option]').forEach(o=>o.onmousedown=e=>{e.preventDefault();go(items[+o.dataset.i]);});
  }catch(e){if(my===seq){list.innerHTML='<p class="gs9-empty">'+esc(e.message)+'</p>';list.hidden=false;}}},220);
 async function go(x){if(!x)return;close();input.blur();const N=window.ElejemNavigation;
  try{if(x.request_id)await N.openOrder(x.request_id);else if(x.type==='cliente')N.select('clients');else if(x.type==='material')N.select('materials');
   else if(x.type==='plantilla')N.select('templates');else if(x.type==='etiqueta'){N.select('operations');setTagFilter(x.id);}}catch(e){window.toast?.(e.message);}}
 input.addEventListener('input',run);
 input.addEventListener('keydown',e=>{const n=list.querySelectorAll('[role=option]').length;
  if(e.key==='ArrowDown'&&n){e.preventDefault();at=(at+1)%n;paint();}else if(e.key==='ArrowUp'&&n){e.preventDefault();at=(at-1+n)%n;paint();}
  else if(e.key==='Enter'){e.preventDefault();go(items[at<0?0:at]);}else if(e.key==='Escape'){if(!list.hidden){e.preventDefault();e.stopPropagation();close();}else input.value='';}});
 input.addEventListener('blur',()=>setTimeout(close,120));
 document.addEventListener('keydown',e=>{const t=e.target;if((e.key==='/'&&!/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)&&!t.isContentEditable)||(e.key.toLowerCase()==='k'&&(e.ctrlKey||e.metaKey))){e.preventDefault();input.focus();input.select();}});}
// ---------- 59 · Etiquetas
let tags=[],index=new Map(),filterTag=null,reqByCode=null;
async function loadTags(){try{[tags]=await Promise.all([rpc('elejem_tags_list',{})]);const ix=await rpc('elejem_request_tags_index',{});index=new Map(ix.map(r=>[r.public_code,r]));}catch(e){tags=[];index=new Map();}paintFilter();applyFilter();}
const chip=t=>'<span class="tg9 tg9-'+esc(t.color)+'">'+esc(t.name)+'</span>';
function paintFilter(){const pane=window.ElejemNavigation?.pane('operations');const list=document.querySelector('#caseList');if(!pane||!list)return;let f=pane.querySelector('[data-tg9-filter]');
 const act=tags.filter(t=>t.active);if(!act.length){f?.remove();return;}
 if(!f){f=document.createElement('div');f.className='tg9-filter';f.dataset.tg9Filter='';f.setAttribute('role','group');f.setAttribute('aria-label','Filtrar por etiqueta');list.before(f);}
 f.innerHTML='<span class="tg9-label">Etiquetas:</span>'+act.map(t=>'<button type="button" class="tg9 tg9-'+esc(t.color)+'" data-tag="'+esc(t.id)+'" aria-pressed="'+(filterTag===t.id)+'">'+esc(t.name)+'</button>').join('')+(filterTag?'<button type="button" class="btn ghost" data-tag="">Quitar filtro</button>':'');
 f.querySelectorAll('[data-tag]').forEach(b=>b.onclick=()=>setTagFilter(b.dataset.tag===filterTag?null:b.dataset.tag||null));}
function setTagFilter(id){filterTag=id||null;paintFilter();applyFilter();}
function applyFilter(){document.querySelectorAll('#caseList .case').forEach(c=>{const code=c.querySelector('.case-id')?.textContent.trim();const tg=index.get(code)?.tags||[];
 let s=c.querySelector('.tg9-row');if(tg.length){if(!s){s=document.createElement('span');s.className='tg9-row';c.querySelector('.case-title')?.append(s);}s.innerHTML=tg.map(chip).join('');}else s?.remove();
 c.hidden=!!filterTag&&!tg.some(t=>t.id===filterTag);});}
async function requestId(code){const hit=index.get(code);if(hit)return hit.request_id;if(!reqByCode){const rows=await window.ElejemBackend.listAllRequests();reqByCode=new Map(rows.map(r=>[r.public_code,r.id]));}return reqByCode.get(code);}
async function decorateDetail(panel){const code=panel.querySelector('h2')?.textContent.trim();if(!code||panel.querySelector('[data-tg9-detail]'))return;
 const sec=document.createElement('div');sec.className='tg9-detail';sec.dataset.tg9Detail='';panel.querySelector('.divider')?.before(sec)||panel.append(sec);
 const id=await requestId(code).catch(()=>null);if(!id){sec.remove();return;}
 const draw=async()=>{const cur=index.get(code)?.tags||[];
  let lead=null;if(office())lead=await rpc('elejem_lead_source_get',{p_request:id}).catch(()=>null);
  sec.innerHTML='<div class="context-row"><small>Etiquetas</small><span>'+(cur.length?cur.map(chip).join(' '):'<em>Sin etiquetas</em>')+'</span></div>'+
   (tags.some(t=>t.active)?'<details class="tg9-edit"><summary>Editar etiquetas</summary><fieldset><legend class="sr-only">Etiquetas de '+esc(code)+'</legend>'+tags.filter(t=>t.active).map(t=>'<label class="tg9-check"><input type="checkbox" value="'+esc(t.id)+'"'+(cur.some(c=>c.id===t.id)?' checked':'')+'> '+chip(t)+'</label>').join('')+'</fieldset><button type="button" class="btn secondary" data-tg9-save>Guardar etiquetas</button></details>':'')+
   (office()?'<div class="context-row"><small>Procedencia</small><span><select data-lead aria-label="Procedencia de la solicitud"><option value="">'+(lead?'':'Sin dato')+'</option>'+Object.entries(CHANNELS).map(([k,v])=>'<option value="'+k+'"'+(lead?.channel===k?' selected':'')+'>'+esc(v)+'</option>').join('')+'</select>'+(lead?.source?' <small>'+esc(lead.source)+(lead.campaign?' · '+esc(lead.campaign):'')+'</small>':'')+'</span></div>':'')+'<p class="eq-error" role="alert" data-tg9-err></p>';
  const save=sec.querySelector('[data-tg9-save]');if(save)save.onclick=async()=>{save.disabled=true;try{const ids=[...sec.querySelectorAll('input[type=checkbox]:checked')].map(i=>i.value);const r=await rpc('elejem_request_tags_set',{p_request:id,p_tags:ids});
   const tg=r[id]||[];if(tg.length)index.set(code,{request_id:id,public_code:code,tags:tg});else index.delete(code);applyFilter();window.toast?.('Etiquetas guardadas');draw();}catch(e){sec.querySelector('[data-tg9-err]').textContent=e.message;save.disabled=false;}};
  const ls=sec.querySelector('[data-lead]');if(ls)ls.onchange=async()=>{if(!ls.value)return;try{await rpc('elejem_lead_source_set',{p_request:id,p_data:{channel:ls.value}});window.toast?.('Procedencia guardada');}catch(e){sec.querySelector('[data-tg9-err]').textContent=e.message;}};};
 await draw();}
// ---------- 57 · Plantillas
let tplCache={};
async function templates(kind){if(!tplCache[kind])tplCache[kind]=await rpc('elejem_templates_list',{p_kind:kind,p_all:false});return tplCache[kind];}
function picker(kind,list,onPick){const w=document.createElement('div');w.className='tp9-pick';w.dataset.tp9=kind;
 w.innerHTML='<label>Usar plantilla <select><option value="">Elegir…</option>'+list.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('')+'</select></label><small>Rellena el borrador. Revísalo antes de guardar.</small>';
 w.querySelector('select').onchange=e=>{const t=list.find(x=>x.id===e.target.value);if(t)onPick(t);e.target.value='';};return w;}
const set=(el,v)=>{if(!el)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
function fillQuote(form,t){const b=t.body||{};const lines=form.querySelector('[data-lines]');
 const filled=[...lines.querySelectorAll('[data-k=description]')].some(i=>i.value.trim());if(filled&&!confirm('El presupuesto ya tiene partidas. ¿Añadir las de la plantilla al final?'))return;
 for(const it of b.items||[]){let empty=[...lines.querySelectorAll('.eq-line')].find(l=>!l.querySelector('[data-k=description]').value.trim());if(!empty){form.querySelector('[data-add]').click();empty=lines.querySelector('.eq-line:last-child');}
  set(empty.querySelector('[data-k=description]'),it.description);set(empty.querySelector('[data-k=quantity]'),it.quantity??1);if(it.unit_price!=null)set(empty.querySelector('[data-k=unit_price]'),it.unit_price);}
 const terms=form.querySelector('[name=terms]');if(b.terms)set(terms,terms.value.trim()?terms.value.trim()+'\n\n'+b.terms:b.terms);if(b.validity_days)set(form.querySelector('[name=days]'),b.validity_days);window.toast?.('Plantilla aplicada al borrador');}
function fillReport(root,t){const b=t.body||{};const add=(el,v)=>{if(el&&v)set(el,el.value.trim()?el.value.trim()+'\n'+v:v);};add(root.querySelector('[data-description]'),b.description);add(root.querySelector('[data-incidents]'),b.incidents);window.toast?.('Plantilla aplicada al parte');}
async function decorateEditors(){
 for(const form of document.querySelectorAll('form')){if(!form.querySelector('[data-lines]')||!form.querySelector('[name=terms]')||form.querySelector('[data-tp9]')||!office())continue;form.dataset.tp9Busy='1';
  const list=await templates('presupuesto').catch(()=>[]);if(list.length&&!form.querySelector('[data-tp9]'))form.prepend(picker('presupuesto',list,t=>fillQuote(form,t)));}
 for(const ta of document.querySelectorAll('textarea[data-description]')){const root=ta.closest('form,section,article,div');if(!root||root.querySelector('[data-tp9]'))continue;
  const list=await templates('parte').catch(()=>[]);if(list.length&&!root.querySelector('[data-tp9]'))ta.closest('label').before(picker('parte',list,t=>fillReport(root,t)));}}
async function mountTemplates(){const pane=window.ElejemNavigation?.pane('templates');if(!pane||!office())return;tplCache={};
 pane.innerHTML='<div class="es-box tp9-box"><h2>Plantillas</h2><p class="eq-notice">Las plantillas solo rellenan borradores de presupuestos y partes, o se copian para escribir un mensaje. Nunca emiten ni envían nada por sí solas. Variables en comunicaciones: {{nombre}}, {{codigo}}.</p><div class="ev4-actions" data-tp9-new>'+Object.entries(KIND).map(([k,v])=>'<button class="btn secondary" data-new="'+k+'">Nueva: '+esc(v)+'</button>').join('')+'</div><div data-tp9-list><p>Cargando…</p></div><p class="eq-error" role="alert" data-err></p></div>';
 pane.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>edit({kind:b.dataset.new,name:'',body:{},active:true}));
 const listEl=pane.querySelector('[data-tp9-list]');
 async function load(){try{const all=await rpc('elejem_templates_list',{p_kind:null,p_all:true});listEl.innerHTML=all.length?Object.entries(KIND).map(([k,v])=>{const g=all.filter(t=>t.kind===k);return g.length?'<h3>'+esc(v)+'</h3>'+g.map(t=>'<article class="ev4-card'+(t.active?'':' tp9-off')+'"><strong>'+esc(t.name)+'</strong>'+(t.active?'':' <small>(desactivada)</small>')+'<p class="ev4-muted">'+esc(preview(t))+'</p><div class="ev4-actions"><button class="btn ghost" data-edit="'+esc(t.id)+'">Editar</button>'+((k==='comunicacion'||k==='informe')?'<button class="btn ghost" data-copy="'+esc(t.id)+'">Copiar texto</button>':'')+'</div></article>').join(''):'';}).join(''):'<p>Aún no hay plantillas. Crea la primera con los botones de arriba.</p>';
  listEl.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(all.find(t=>t.id===b.dataset.edit)));
  listEl.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{const t=all.find(x=>x.id===b.dataset.copy);const txt=(t.body.subject?t.body.subject+'\n\n':'')+(t.body.text||'');try{await navigator.clipboard.writeText(txt);window.toast?.('Texto copiado. No se ha enviado nada.');}catch{window.prompt('Copia el texto:',txt);}});
 }catch(e){listEl.innerHTML='<p class="eq-error">'+esc(e.message)+'</p>';}}
 function preview(t){const b=t.body||{};if(t.kind==='presupuesto')return (b.items||[]).length+' partidas'+(b.description?' · '+b.description:'');if(t.kind==='parte')return b.description||'';return (b.subject?b.subject+' · ':'')+(b.text||'').slice(0,140);}
 function edit(t){const d=document.createElement('dialog');d.className='tp9-dialog';const b=t.body||{};
  const fields=t.kind==='presupuesto'?'<label>Descripción<textarea name="description" maxlength="2000">'+esc(b.description)+'</textarea></label><h4>Partidas</h4><p class="eq-notice">Una por línea: descripción ; cantidad ; precio (precio opcional)</p><textarea name="items" rows="6">'+esc((b.items||[]).map(i=>[i.description,i.quantity,i.unit_price??''].join(' ; ')).join('\n'))+'</textarea><label>Condiciones<textarea name="terms" maxlength="3000">'+esc(b.terms)+'</textarea></label><label>Validez (días)<input name="validity_days" type="number" min="1" max="90" value="'+esc(b.validity_days??'')+'"></label>'
   :t.kind==='parte'?'<label>Trabajo realizado<textarea name="description" maxlength="4000">'+esc(b.description)+'</textarea></label><label>Incidencias y observaciones<textarea name="incidents" maxlength="2000">'+esc(b.incidents)+'</textarea></label>'
   :t.kind==='comunicacion'?'<label>Asunto<input name="subject" maxlength="160" value="'+esc(b.subject)+'"></label><label>Texto<textarea name="text" rows="6" maxlength="3000">'+esc(b.text)+'</textarea></label>'
   :'<label>Texto<textarea name="text" rows="8" maxlength="6000">'+esc(b.text)+'</textarea></label>';
  d.innerHTML='<form method="dialog" class="es-grid"><h3>'+esc(KIND[t.kind])+': '+(t.id?'editar':'nueva')+'</h3><label>Nombre<input name="name" required minlength="2" maxlength="80" value="'+esc(t.name)+'"></label>'+fields+'<label class="eu7-switch"><input type="checkbox" name="active"'+(t.active!==false?' checked':'')+'> Activa</label><p class="eq-error" role="alert" data-err></p><div class="ev4-actions"><button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary" data-save>Guardar</button></div></form>';
  document.body.append(d);d.showModal?.();const f=d.querySelector('form');d.querySelector('[data-cancel]').onclick=()=>{d.close?.();d.remove();};
  f.onsubmit=async e=>{e.preventDefault();const v=Object.fromEntries(new FormData(f));let body;
   if(t.kind==='presupuesto')body={description:v.description,terms:v.terms,validity_days:v.validity_days||null,items:String(v.items||'').split('\n').map(l=>l.split(';').map(s=>s.trim())).filter(p=>p[0]).map(p=>({description:p[0],quantity:p[1]||'1',unit_price:p[2]||null}))};
   else if(t.kind==='parte')body={description:v.description,incidents:v.incidents};else if(t.kind==='comunicacion')body={subject:v.subject,text:v.text};else body={text:v.text};
   try{await rpc('elejem_template_save',{p_id:t.id||null,p_kind:t.kind,p_name:v.name,p_service:null,p_body:body,p_active:f.elements.active.checked,p_version:t.version??null});d.close?.();d.remove();window.toast?.('Plantilla guardada');load();}catch(err){f.querySelector('[data-err]').textContent=err.message;}};}
 load();}
// ---------- Montaje
function boot(){if(!window.ElejemArea?.staff&&!document.querySelector('#adminWorkspace'))return;
 addEventListener('elejem:pane',e=>{mountSearch();if(e.detail.id==='templates')mountTemplates();if(e.detail.id==='operations'){paintFilter();applyFilter();}});
 let pending=false;const mo=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame?requestAnimationFrame(tick):setTimeout(tick,0);});
 function tick(){pending=false;if(!window.ElejemStaffSession)return;applyFilter();const p=document.querySelector('#caseDetail.open');if(p)decorateDetail(p).catch(()=>{});decorateEditors().catch(()=>{});}
 const ws=document.querySelector('#adminWorkspace')||document.body;mo.observe(ws,{childList:true,subtree:true});
 addEventListener('elejem:staff-ready',()=>{mountSearch();loadTags();});
 let tries=0;const iv=setInterval(()=>{if(window.ElejemStaffSession&&document.querySelector('#ops-navigation')){clearInterval(iv);mountSearch();loadTags();}else if(++tries>120)clearInterval(iv);},500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.ElejemHerramientas={mountSearch,loadTags,setTagFilter,applyFilter,decorateDetail,decorateEditors,mountTemplates,fillQuote,fillReport,_state:()=>({tags,index,filterTag})};
})();
