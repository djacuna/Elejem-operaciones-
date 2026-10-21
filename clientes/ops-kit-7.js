(function(){'use strict';
// Etapa 7 · Kit de búsqueda y filtros del centro de operaciones (instantáneo, sin acentos, táctil).
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const tokens=q=>norm(q).split(' ').filter(Boolean);
const match=(hay,q)=>{const t=Array.isArray(q)?q:tokens(q),h=norm(hay);return t.every(x=>h.includes(x));};
const debounce=(fn,ms=180)=>{let t;const d=(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms);};d.flush=(...a)=>{clearTimeout(t);fn(...a);};return d;};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function highlight(text,q){const t=tokens(q);let s=esc(text);if(!t.length)return s;const plain=norm(text);if(plain.length!==String(text).length)return s;const marks=new Array(plain.length).fill(false);t.forEach(x=>{let i=plain.indexOf(x);while(i>-1){for(let k=i;k<i+x.length;k++)marks[k]=true;i=plain.indexOf(x,i+1);}});let out='',on=false;[...String(text)].forEach((c,i)=>{if(marks[i]&&!on){out+='<mark>';on=true;}if(!marks[i]&&on){out+='</mark>';on=false;}out+=esc(c);});return out+(on?'</mark>':'');}
// Barra de búsqueda: input + chips (grupos de filtros exclusivos) + contador.
function searchBar(o={}){const box=document.createElement('div');box.className='ok7-search';box.setAttribute('role','search');
 box.innerHTML='<div class="ok7-field"><span class="ok7-ico" aria-hidden="true">⌕</span><input type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" aria-label="'+esc(o.label||'Buscar')+'" placeholder="'+esc(o.placeholder||'Buscar…')+'" data-ok7-q><button type="button" class="ok7-clear" data-ok7-clear aria-label="Borrar búsqueda" hidden>×</button></div>'+(o.groups||[]).map(g=>'<div class="ok7-chips" role="group" aria-label="'+esc(g.label)+'" data-ok7-group="'+esc(g.key)+'">'+g.options.map((op,i)=>'<button type="button" class="ok7-chip" data-value="'+esc(op.value)+'" aria-pressed="'+(op.value===(g.value??g.options[0].value))+'">'+esc(op.label)+'<span class="ok7-n" data-ok7-n></span></button>').join('')+'</div>').join('')+'<p class="ok7-count" role="status" aria-live="polite" data-ok7-count></p>';
 const input=box.querySelector('input'),clear=box.querySelector('[data-ok7-clear]');
 const state=()=>{const s={q:input.value};box.querySelectorAll('[data-ok7-group]').forEach(g=>s[g.dataset.ok7Group]=g.querySelector('[aria-pressed="true"]')?.dataset.value??'');return s;};
 const emit=debounce(()=>o.onChange?.(state()),o.delay??120);
 input.addEventListener('input',()=>{clear.hidden=!input.value;emit();});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'&&input.value){input.value='';clear.hidden=true;emit.flush();e.stopPropagation();}if(e.key==='Enter'){e.preventDefault();emit.flush();o.onEnter?.(state());}});
 clear.onclick=()=>{input.value='';clear.hidden=true;emit.flush();input.focus();};
 box.querySelectorAll('[data-ok7-group]').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('.ok7-chip');if(!b)return;g.querySelectorAll('.ok7-chip').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));emit.flush();}));
 box.state=state;box.input=input;
 box.setCount=(n,total,noun='resultados')=>{box.querySelector('[data-ok7-count]').textContent=n===total?total+' '+noun:n+' de '+total+' '+noun;};
 box.setChipCounts=(key,counts)=>{box.querySelectorAll('[data-ok7-group="'+key+'"] .ok7-chip').forEach(b=>{const n=counts[b.dataset.value];b.querySelector('[data-ok7-n]').textContent=n==null?'':' '+n;});};
 return box;}
// Filtro rápido genérico para paneles que pintan listas en el cliente.
function quickFilter(pane,o={}){if(!pane||pane.querySelector('.ok7-search[data-ok7-quick]'))return null;const sel=o.items||'article, .ev4-card, .eq-card, tbody tr';
 const bar=searchBar({placeholder:o.placeholder||'Filtrar en este panel…',label:o.label||'Filtrar panel',onChange:apply});bar.dataset.ok7Quick='1';
 const h=pane.querySelector(o.anchor||'h2,h3');if(h)h.after(bar);else pane.prepend(bar);
 function apply(){const q=tokens(bar.input.value),list=[...pane.querySelectorAll(sel)].filter(x=>!bar.contains(x)&&!x.closest('dialog,.ok7-skip'));let n=0;list.forEach(x=>{const ok=!q.length||match(x.textContent,q);x.hidden=!ok;if(ok)n++;});bar.hidden=list.length<(o.min??3)&&!q.length;if(q.length)bar.setCount(n,list.length,o.noun||'elementos');else bar.querySelector('[data-ok7-count]').textContent='';}
 const mo=new MutationObserver(debounce(()=>{mo.disconnect();apply();mo.observe(pane,{childList:true,subtree:true});},60));mo.observe(pane,{childList:true,subtree:true});apply();return bar;}
// Atajo «/» para enfocar la búsqueda del panel visible (escritorio).
document.addEventListener('keydown',e=>{if(e.key!=='/'||e.ctrlKey||e.metaKey||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable)return;const inp=[...document.querySelectorAll('.ok7-search input')].find(x=>x.offsetParent!==null);if(inp){e.preventDefault();inp.focus();}});
window.ElejemKit={norm,tokens,match,debounce,highlight,searchBar,quickFilter,esc};
})();
