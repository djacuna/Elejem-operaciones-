(function(){'use strict';
// Etapa 9B · Punto 54. Procedencia de la solicitud en el portal de clientes: lee lo que trae la URL desde www (ld_*) o utm_* /
// dominio de referencia si se entra directamente. Solo en memoria; se quita de la barra de direcciones y se envía al crear la solicitud.
if(window.ElejemArea?.staff)return;
const DNT=navigator.doNotTrack==='1'||window.doNotTrack==='1'||navigator.globalPrivacyControl===true;
const q=new URLSearchParams(location.search);const clean=(v,n)=>String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_').replace(/[^a-z0-9._-]/g,'').slice(0,n);
let ref='';try{const h=new URL(document.referrer).hostname.toLowerCase();if(!/(^|\.)elejem\.com$/.test(h))ref=h;}catch{}
const data={referrer_host:clean(q.get('ld_ref')||ref,120),source:clean(q.get('ld_src')||q.get('utm_source'),60),medium:clean(q.get('ld_med')||q.get('utm_medium'),40),campaign:clean(q.get('ld_camp')||q.get('utm_campaign'),80),landing:String(q.get('ld_land')||'').toLowerCase().replace(/[^a-z0-9._/-]/g,'').slice(0,120)};
const keys=['ld_ref','ld_src','ld_med','ld_camp','ld_land','utm_source','utm_medium','utm_campaign','utm_term','utm_content'];
if(keys.some(k=>q.has(k))){keys.forEach(k=>q.delete(k));const s=q.toString();try{history.replaceState(history.state,'',location.pathname+(s?'?'+s:'')+location.hash);}catch{}}
window.ElejemLeadSource=DNT?null:Object.freeze(data);
})();
