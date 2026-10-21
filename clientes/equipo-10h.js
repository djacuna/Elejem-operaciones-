/* ELEJEM · Etapa 10H · «Equipo»: une Control de personal y Disponibilidad en una sola sección con pestañas.
   Fichajes · Horas trabajadas · Horas extra · Disponibilidad · Ausencias · Horario.
   Reutiliza los bloques existentes (mismos IDs y data-*): el informe de fichajes de workforce.js y la vista de
   disponibilidad de availability.js, que se coloca dentro de esta sección. Las horas por periodo se calculan con
   la misma consulta diaria que ya usa Fichajes (sin cambios en el servidor). */
(function(){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TABS=[['fichajes','Fichajes'],['horas','Horas trabajadas'],['extra','Horas extra'],['disponibilidad','Disponibilidad'],['ausencias','Ausencias'],['horario','Horario']];
const AV={disponibilidad:'carga',ausencias:'ausencias',horario:'horario'};
const KEY='elejem.equipo.tab';
let root=null,tab=null,cache=new Map(),period=null,loading=0;
const today=()=>window.ElejemUI?ElejemUI.today():new Date().toISOString().slice(0,10);
const addDays=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
const hm=n=>{n=Math.max(0,Math.round((n||0)/60));const h=Math.floor(n/60),m=n%60;return h?h+' h'+(m?' '+String(m).padStart(2,'0')+' min':''):m+' min';};
const dayName=d=>new Date(d+'T12:00:00Z').toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'});
function presets(){const t=today(),wd=(new Date(t+'T12:00:00Z').getUTCDay()+6)%7,m0=t.slice(0,8)+'01',pm=new Date(Date.UTC(+t.slice(0,4),+t.slice(5,7)-2,1)).toISOString().slice(0,10),pmEnd=addDays(m0,-1);
 return{semana:[addDays(t,-wd),t,'Esta semana'],mes:[m0,t,'Este mes'],anterior:[pm,pmEnd,'Mes anterior'],quince:[addDays(t,-13),t,'Últimos 14 días']};}
function build(pane){
 pane.classList.add('t10-pane');
 const wrap=document.createElement('div');wrap.className='t10';wrap.dataset.team='';
 wrap.innerHTML='<div class="t10-head"><p class="ev4-muted">Fichajes, horas, disponibilidad y ausencias del equipo en un solo sitio.</p><div class="t10-quick"><button type="button" class="btn primary" data-team-add>+ Registrar ausencia</button><button type="button" class="btn secondary" data-team-go="horario">Horario de referencia</button></div></div>'+
  '<div class="u10-seg t10-tabs" role="tablist" aria-label="Apartados de Equipo">'+TABS.map(([k,v])=>'<button type="button" role="tab" class="btn secondary" id="t10-tab-'+k+'" aria-controls="t10-panel-'+k+'" aria-selected="false" data-team-tab="'+k+'">'+esc(v)+'</button>').join('')+'</div>'+
  '<div class="t10-panel" role="tabpanel" id="t10-panel-fichajes" aria-labelledby="t10-tab-fichajes" data-team-panel="fichajes" hidden><div data-team-slot="fichajes"></div></div>'+
  '<div class="t10-panel" role="tabpanel" id="t10-panel-horas" aria-labelledby="t10-tab-horas" data-team-panel="horas" hidden></div>'+
  '<div class="t10-panel" role="tabpanel" id="t10-panel-extra" aria-labelledby="t10-tab-extra" data-team-panel="extra" hidden></div>'+
  '<div class="t10-panel" role="tabpanel" id="t10-panel-av" data-team-panel="av" hidden><div data-team-slot="av"></div></div>';
 pane.prepend(wrap);
 // Bloques existentes dentro de sus pestañas (se mueven, no se copian: conservan IDs, data-* y eventos).
 const admin=pane.querySelector(':scope>[data-admin]')||document.querySelector('[data-admin]');if(admin)wrap.querySelector('[data-team-slot="fichajes"]').append(admin);
 const av=document.querySelector('#ops-availability');if(av)wrap.querySelector('[data-team-slot="av"]').append(av);
 const tabs=[...wrap.querySelectorAll('[data-team-tab]')];
 tabs.forEach((b,i)=>{b.onclick=()=>show(b.dataset.teamTab,true);b.onkeydown=e=>{const k={ArrowRight:1,ArrowLeft:-1}[e.key];if(k||e.key==='Home'||e.key==='End'){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+k+tabs.length)%tabs.length;tabs[n].focus();show(tabs[n].dataset.teamTab,true);}};});
 wrap.querySelector('[data-team-add]').onclick=()=>{show('ausencias',true);setTimeout(()=>{const f=document.querySelector('[data-absence]');f?.scrollIntoView({block:'start',behavior:'smooth'});f?.querySelector('select,input')?.focus();},60);};
 wrap.querySelector('[data-team-go]').onclick=()=>show('horario',true);
 return wrap;
}
function ensure(){const pane=window.ElejemNavigation?.pane('personnel');if(!pane)return null;if(!root||!pane.contains(root))root=build(pane);else{const av=document.querySelector('#ops-availability');const slot=root.querySelector('[data-team-slot="av"]');if(av&&!slot.contains(av))slot.append(av);const admin=document.querySelector('[data-admin]');const fs=root.querySelector('[data-team-slot="fichajes"]');if(admin&&!fs.contains(admin))fs.append(admin);}return root;}
let avReady=false;
function show(k,user){if(!ensure())return;if(!TABS.some(t=>t[0]===k))k='fichajes';tab=k;try{localStorage.setItem(KEY,k);}catch(_){}
 root.querySelectorAll('[data-team-tab]').forEach(b=>{const on=b.dataset.teamTab===k;b.setAttribute('aria-selected',String(on));b.classList.toggle('primary',on);b.classList.toggle('secondary',!on);b.tabIndex=on?0:-1;});
 const avKey=AV[k];root.querySelectorAll('[data-team-panel]').forEach(p=>p.hidden=p.dataset.teamPanel!==(avKey?'av':k));
 const av=document.querySelector('#ops-availability');if(av){av.hidden=!avKey;av.dataset.avShow=avKey||'';const t=av.querySelector('[data-av-title]');if(t)t.textContent={carga:'Disponibilidad y carga',ausencias:'Ausencias',horario:'Horario de referencia'}[avKey]||'Disponibilidad';}
 if(avKey&&!avReady){avReady=true;window.ElejemAvailability?.onSelect();}
 if(k==='horas'||k==='extra')drawPeriod(k);
 if(k==='fichajes'&&user)window.ElejemWorkforce?.refreshAdmin?.();
}
function onSelect(want){if(!ensure())return;let k=want;if(!k){try{k=localStorage.getItem(KEY);}catch(_){}}show(k||'fichajes');if(!want)return;root.querySelector('[data-team-tab="'+k+'"]')?.focus({preventScroll:true});}
// Al volver a Equipo, la navegación oculta todos los paneles: se vuelve a mostrar la disponibilidad si su pestaña está activa.
addEventListener('elejem:pane',e=>{if(e.detail.id==='personnel'&&tab&&AV[tab]){const av=document.querySelector('#ops-availability');if(av)av.hidden=false;}});
/* ---------- Horas trabajadas y horas extra por periodo ---------- */
function periodForm(k){const P=presets();if(!period)period={from:P.semana[0],to:P.semana[1],preset:'semana',worker:''};
 return'<div class="t10-filters"><div class="u10-seg" role="group" aria-label="Periodo">'+Object.entries(P).map(([id,v])=>'<button type="button" class="btn '+(period.preset===id?'primary':'secondary')+'" aria-pressed="'+(period.preset===id)+'" data-t10-preset="'+id+'">'+esc(v[2])+'</button>').join('')+'</div><div class="ev4-toolbar"><label>Desde<input type="date" data-t10-from value="'+esc(period.from)+'" max="'+today()+'"></label><label>Hasta<input type="date" data-t10-to value="'+esc(period.to)+'" max="'+today()+'"></label><label>Persona<select data-t10-worker><option value="">Todo el equipo</option></select></label><button type="button" class="btn secondary" data-t10-load>Consultar</button></div></div><p class="ev4-muted" data-t10-progress role="status"></p><p class="eq-error" data-t10-error role="alert"></p><div data-t10-out></div>';}
async function fetchDays(days,onStep){const out={},todo=days.filter(d=>!(cache.has(d)&&d<today()));let done=days.length-todo.length;onStep(done);
 const work=async()=>{while(todo.length){const d=todo.shift();const r=await ElejemBackend.workforce('resumen_admin',{day:d});cache.set(d,r?.staff||[]);done++;onStep(done);}};
 await Promise.all([work(),work(),work(),work()]);days.forEach(d=>out[d]=cache.get(d)||[]);return out;}
async function drawPeriod(k){const panel=root.querySelector('[data-team-panel="'+k+'"]');panel.innerHTML=(k==='extra'?'<p class="ev4-muted t10-note">Se cuentan como horas extra las que pasan de 8 h de trabajo efectivo en un día, según los fichajes reales. La autorización previa de horas extra está retirada del sistema.</p>':'<p class="ev4-muted t10-note">Tiempo efectivo descontando pausas, tiempo dedicado a órdenes y descansos, por persona.</p>')+periodForm(k);
 panel.querySelectorAll('[data-t10-preset]').forEach(b=>b.onclick=()=>{const v=presets()[b.dataset.t10Preset];period={...period,from:v[0],to:v[1],preset:b.dataset.t10Preset};drawPeriod(k);});
 panel.querySelector('[data-t10-from]').onchange=e=>{period={...period,from:e.target.value,preset:''};};panel.querySelector('[data-t10-to]').onchange=e=>{period={...period,to:e.target.value,preset:''};};
 panel.querySelector('[data-t10-worker]').onchange=e=>{period={...period,worker:e.target.value};render(k,panel);};
 panel.querySelector('[data-t10-load]').onclick=()=>{period={...period,from:panel.querySelector('[data-t10-from]').value,to:panel.querySelector('[data-t10-to]').value};drawPeriod(k);};
 await compute(k,panel);}
let last=null;
async function compute(k,panel){const err=panel.querySelector('[data-t10-error]'),prog=panel.querySelector('[data-t10-progress]');let {from,to}=period;if(!from||!to||from>to){err.textContent='Elige un periodo válido: la fecha «Desde» debe ser anterior a «Hasta».';return;}if(to>today())to=today();
 const days=[];for(let d=from;d<=to&&days.length<62;d=addDays(d,1))days.push(d);if(days.length>=62&&days[days.length-1]<to)err.textContent='Se muestran como máximo 62 días. Acorta el periodo para ver el resto.';
 const my=++loading;panel.querySelector('[data-t10-out]').innerHTML='<p class="ev4-muted">Calculando…</p>';
 try{const data=await fetchDays(days,n=>{if(my===loading)prog.textContent=n<days.length?'Calculando '+n+' de '+days.length+' días…':'';});if(my!==loading||!panel.isConnected)return;
  const people=new Map();for(const d of days)for(const p of data[d]){if(!people.has(p.id))people.set(p.id,{id:p.id,name:p.name,role:p.role,days:[]});const s=p.summary||{};if(s.shift)people.get(p.id).days.push({day:d,work:+s.work_seconds||0,job:+s.job_seconds||0,rest:+s.break_seconds||0,over:+s.over_reference_seconds||Math.max(0,(+s.work_seconds||0)-28800),allow:p.allowance&&p.allowance.extra_minutes?p.allowance:null});}
  last={days,people:[...people.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name),'es'))};
  const sel=panel.querySelector('[data-t10-worker]');sel.innerHTML='<option value="">Todo el equipo</option>'+last.people.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('');sel.value=last.people.some(p=>p.id===period.worker)?period.worker:'';
  render(k,panel);
 }catch(e){if(my===loading){prog.textContent='';err.textContent=e.message||'No se pudieron calcular las horas.';panel.querySelector('[data-t10-out]').innerHTML='';}}}
function render(k,panel){if(!last)return;const out=panel.querySelector('[data-t10-out]'),w=period.worker,list=last.people.filter(p=>!w||p.id===w);
 const sum=(p,f)=>p.days.reduce((n,d)=>n+d[f],0);const all=f=>list.reduce((n,p)=>n+sum(p,f),0);
 if(k==='horas'){const max=Math.max(1,...list.map(p=>sum(p,'work')));
  out.innerHTML='<div class="ew-totals t10-kpis"><div><strong>'+hm(all('work'))+'</strong><span>tiempo efectivo</span></div><div><strong>'+hm(all('job'))+'</strong><span>en órdenes</span></div><div><strong>'+hm(all('rest'))+'</strong><span>descansos</span></div><div><strong>'+list.reduce((n,p)=>n+p.days.length,0)+'</strong><span>jornadas fichadas</span></div></div>'+
  (list.some(p=>p.days.length)?'<div class="t10-bars">'+list.map(p=>{const t=sum(p,'work');return'<div class="t10-bar"><div class="t10-bar-h"><strong>'+esc(p.name)+'</strong><span>'+hm(t)+' · '+p.days.length+(p.days.length===1?' día':' días')+(p.days.length?' · media '+hm(t/p.days.length)+'/día':'')+'</span></div><div class="t10-track" role="img" aria-label="'+esc(p.name+': '+hm(t))+'"><i style="width:'+Math.round(100*t/max)+'%"></i><b style="width:'+Math.round(100*sum(p,'job')/max)+'%"></b></div><small>En órdenes '+hm(sum(p,'job'))+' · descansos '+hm(sum(p,'rest'))+(sum(p,'over')?' · por encima de 8 h: '+hm(sum(p,'over')):'')+'</small></div>';}).join('')+'</div><p class="ev4-muted t10-legend"><i></i> Tiempo efectivo <b></b> En órdenes</p><div class="ev4-actions"><button type="button" class="btn ghost" data-t10-csv>Exportar a Excel (CSV)</button></div>':'<p class="u10-empty">Nadie ha fichado en este periodo'+(w?' con este filtro':'')+'.</p>');}
 else{const rows=list.flatMap(p=>p.days.filter(d=>d.over>=60||d.allow).map(d=>({...d,name:p.name}))).sort((a,b)=>b.day.localeCompare(a.day));
  out.innerHTML='<div class="ew-totals t10-kpis"><div><strong>'+hm(all('over'))+'</strong><span>horas extra en el periodo</span></div><div><strong>'+new Set(rows.map(r=>r.name)).size+'</strong><span>'+(new Set(rows.map(r=>r.name)).size===1?'persona':'personas')+' con horas extra</span></div><div><strong>'+rows.length+'</strong><span>'+(rows.length===1?'día':'días')+' con horas extra</span></div></div>'+
  (rows.length?'<div class="eq-table-wrap"><table class="eq-table ew-table"><thead><tr><th>Día</th><th>Persona</th><th>Tiempo efectivo</th><th>Horas extra</th></tr></thead><tbody>'+rows.map(r=>'<tr><td data-l="Día">'+esc(dayName(r.day))+'</td><td data-l="Persona"><strong>'+esc(r.name)+'</strong></td><td data-l="Tiempo efectivo">'+hm(r.work)+'</td><td data-l="Horas extra"><strong>'+hm(r.over)+'</strong>'+(r.allow?'<br><small>Ampliación anotada: '+hm(r.allow.extra_minutes*60)+(r.allow.reason?' · '+esc(r.allow.reason):'')+'</small>':'')+'</td></tr>').join('')+'</tbody></table></div><div class="ev4-actions"><button type="button" class="btn ghost" data-t10-csv>Exportar a Excel (CSV)</button></div>':'<p class="u10-empty">No hay horas extra en este periodo'+(w?' para esta persona':'')+'. Nadie ha pasado de 8 h efectivas en un día.</p>');}
 const b=out.querySelector('[data-t10-csv]');if(b)b.onclick=()=>csv(k,list);}
function csv(k,list){const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';const min=s=>Math.round(s/60);
 const rows=k==='horas'?[['Persona','Días fichados','Tiempo efectivo (min)','En órdenes (min)','Descansos (min)','Por encima de 8 h (min)'],...list.map(p=>[p.name,p.days.length,min(p.days.reduce((n,d)=>n+d.work,0)),min(p.days.reduce((n,d)=>n+d.job,0)),min(p.days.reduce((n,d)=>n+d.rest,0)),min(p.days.reduce((n,d)=>n+d.over,0))])]
  :[['Día','Persona','Tiempo efectivo (min)','Horas extra (min)'],...list.flatMap(p=>p.days.filter(d=>d.over>=60).map(d=>[d.day,p.name,min(d.work),min(d.over)]))];
 const url=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ELEJEM-'+(k==='horas'?'horas-trabajadas':'horas-extra')+'-'+period.from+'_'+period.to+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
window.ElejemEquipo={onSelect,show,_period:()=>period};
})();
