/* ELEJEM · Etapa 10F · Ajustes de presentación comunes. No cambia IDs, data-* ni llamadas al backend.
   - Convierte el resumen del asistente de la descripción en una lista clave/valor legible.
   - Marca estados vacíos, grupos de botones-pestaña y títulos duplicados para el sistema de diseño (ui-10f.css). */
(function(){'use strict';
const EMPTY=/^(sin |todav[ií]a no|no hay|a[uú]n no|ninguna? |0 [a-záéíóú]+ ?·|selecciona una|pendiente$)/i;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function parseDesc(t){
  t=String(t||'').replace(/\s+/g,' ').trim();if(t.length<20)return null;
  let lead=t,rest='';const m=t.match(/^(.*?)\s*[—–-]{1,2}\s*Resumen del asistente\s*[—–-]{1,2}\s*·?\s*(.*)$/i);
  if(m){lead=m[1];rest=m[2]}else if((t.match(/ · [^·:]{2,40}: /g)||[]).length>=2){const i=t.indexOf(' · ');lead=t.slice(0,i);rest=t.slice(i+3)}else return null;
  const pairs=[],extra=[];rest.split(/\s+·\s+/).forEach(seg=>{seg=seg.trim().replace(/^·\s*/,'');if(!seg)return;const k=seg.indexOf(':');if(k>0&&k<48)pairs.push([seg.slice(0,k).trim(),seg.slice(k+1).trim()]);else extra.push(seg)});
  if(pairs.length<2)return null;return {lead:lead.trim(),pairs,extra};
}
function descriptions(root){
  root.querySelectorAll('h3').forEach(h=>{if(!/^\s*Descripci[oó]n\s*$/i.test(h.textContent))return;const p=h.nextElementSibling;if(!p||p.tagName!=='P'||p.classList.contains('u10-src'))return;
    const d=parseDesc(p.textContent);if(!d)return;const box=document.createElement('div');box.className='u10-desc';if(p.dataset.odSec)box.dataset.odSec=p.dataset.odSec;
    box.innerHTML=(d.lead?`<p>${esc(d.lead.charAt(0).toUpperCase()+d.lead.slice(1))}</p>`:'')+`<p class="u10-desc-h">Resumen del asistente</p><dl>${d.pairs.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`+(d.extra.length?`<p>${esc(d.extra.join(' · '))}</p>`:'');
    p.classList.add('u10-src');p.after(box);});
}
function empties(root){
  root.querySelectorAll('.ops-content p, .ops-content div, #caseDetail p, #caseDetail div, .view p').forEach(e=>{if(e.classList.contains('u10-empty')||e.children.length||e.closest('button,label,select,.od-bar,.u10-desc,.metric'))return;const t=e.textContent.trim();if(t&&t.length<90&&EMPTY.test(t)&&!/:/.test(t.slice(0,20)))e.classList.add('u10-empty')});
}
function groups(root){
  root.querySelectorAll('.ops-content div, .ops-content nav').forEach(g=>{if(g.classList.contains('u10-seg')||g.closest('#caseDetail,.od-bar,.admin-header'))return;const k=[...g.children];if(k.length<3||k.length>9)return;if(!k.every(c=>c.tagName==='BUTTON'&&c.classList.contains('btn')))return;
    const prim=k.filter(c=>c.classList.contains('primary')).length,txt=k.every(c=>c.textContent.trim().length<34);if(txt&&prim<=1)g.classList.add('u10-seg')});
}
function dups(){const h=document.querySelector('#adminWorkspace .admin-header h1');if(!h)return;const t=h.textContent.trim().toLowerCase();
  document.querySelectorAll('.ops-content>section:not([hidden])').forEach(s=>{const c=s.querySelector('h2, h3');if(c)c.classList.toggle('u10-dup',c.textContent.trim().toLowerCase()===t)})}
let q=0;function run(){q=0;try{const r=document.body;descriptions(r);empties(r);groups(r);dups()}catch(_){}}
function sched(){if(!q)q=requestAnimationFrame(run)}
const mo=new MutationObserver(sched);
function start(){run();mo.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ElejemUI10F={parseDesc};
})();
