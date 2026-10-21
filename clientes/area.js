(function(){'use strict';
// Etapa 7D · Detección de área por dominio. operaciones.* → centro de operaciones; clientes.* → portal; www/elejem.com/clientes → modo heredado (?area=gestion).
const L=window.location,h=L.hostname.toLowerCase(),q=new URLSearchParams(L.search);
const OPS=/^operaciones\./.test(h),CLI=/^clientes\./.test(h),SUB=OPS||CLI,base=SUB?h.replace(/^(operaciones|clientes)\./,''):h.replace(/^www\./,'');
const SITE=SUB?'https://www.'+base+'/':new URL('../',L.href).href;
// 10A (A04) · Lista explícita: «vista» solo es de cliente con estos valores; las vistas internas (mi-dia, agenda…) se quedan en operaciones.
const CUSTOMER_KEYS=['seguimiento','presupuesto','parte','pago','servicio','resena'],CUSTOMER_VIEWS=['seguimiento','solicitud','cuenta','mis-solicitudes'],STAFF_VIEWS=['mi-dia','agenda','ordenes'];
const customerLink=()=>CUSTOMER_KEYS.some(k=>q.has(k))||(q.has('vista')&&CUSTOMER_VIEWS.includes(q.get('vista')));
function portalUrl(params){const u=SUB?new URL('https://clientes.'+base+'/'):new URL('./',L.href.split('#')[0]);if(!SUB)u.search='';Object.entries(params||{}).forEach(([k,v])=>v!=null&&u.searchParams.set(k,v));return u.href;}
function opsUrl(){return SUB?'https://operaciones.'+base+'/':new URL('./?area=gestion',L.href).href;}
// Redirecciones entre subdominios (conservan parámetros y hash).
let redirect=null;
if(CLI&&q.get('area')==='gestion'){const p=new URLSearchParams(L.search);p.delete('area');redirect='https://operaciones.'+base+'/'+(p.toString()?'?'+p:'')+L.hash;}
else if(OPS&&customerLink()){const p=new URLSearchParams(L.search);p.delete('area');redirect='https://clientes.'+base+'/'+(p.toString()?'?'+p:'')+L.hash;}
const staff=!redirect&&(OPS||(!CLI&&q.get('area')==='gestion'));
if(redirect)L.replace(redirect);
const area={staff,host:OPS?'operaciones':CLI?'clientes':'legacy',subdomain:SUB,base,site:SITE,portalUrl,opsUrl,redirecting:!!redirect,redirectTo:redirect,staffViews:STAFF_VIEWS};
window.ElejemArea=area;
// Manifest PWA propio del centro de operaciones.
if(staff){const m=document.querySelector('link[rel="manifest"]');if(m)m.setAttribute('href','manifest-operaciones.webmanifest');const t=document.querySelector('meta[name="theme-color"]');if(t)t.setAttribute('content','#0c0e12');document.title='Centro de operaciones · ELEJEM';const ai=document.querySelector('link[rel="apple-touch-icon"]');if(ai)ai.setAttribute('href','assets/placeholder.svg');}
const c=document.querySelector('link[rel="canonical"]');if(c&&!staff)c.setAttribute('href',SUB?'https://clientes.'+base+'/':c.getAttribute('href'));
// En subdominio, los enlaces «../página.html» van a la web principal.
if(SUB)document.addEventListener('click',e=>{const a=e.target.closest?.('a[href^="../"]');if(a)a.setAttribute('href',new URL(a.getAttribute('href').replace(/^(\.\.\/)+/,''),SITE).href);},true);
})();
