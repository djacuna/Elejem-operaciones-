/* ELEJEM · Etapa 10H · Textos comprensibles para todo el centro de operaciones y el área de clientes.
   Traduce a español claro los valores internos (estados, tipos, métodos, roles) y, como red de seguridad,
   evita que en pantalla aparezcan identificadores internos, «null», «undefined» o «[object Object]». */
(function(){'use strict';
const T={
 service:{averia:'Avería eléctrica',emergencia:'Emergencia eléctrica',cargador:'Cargador eléctrico',reforma:'Reforma eléctrica',cuadro:'Cuadro eléctrico',local:'Local o nave',boletin:'Boletín y adecuación',menor:'Trabajo eléctrico menor',otro:'Otro servicio eléctrico'},
 priority:{normal:'Normal',alta:'Alta',emergencia:'Emergencia'},
 role:{admin:'Administrador',operator:'Operativo',technician:'Técnico',customer:'Cliente'},
 payMethod:{transferencia:'Transferencia',efectivo:'Efectivo',tarjeta_tpv:'Tarjeta (TPV)',bizum:'Bizum',online:'Pago online'},
 invoiceState:{borrador:'Borrador',emitida:'Emitida',descartada:'Descartada'},
 fiscal:{no_enviada:'sin enviar',retenida:'retenido (envío fiscal desactivado)',pendiente:'pendiente',aceptada:'aceptado por Hacienda',rechazada:'rechazado por Hacienda'},
 aiState:{retenido:'Retenida (asistente desactivado)',pendiente:'Pendiente',procesando:'En proceso',listo:'Lista',error:'No se pudo completar',cancelado:'Cancelada',pendiente_revision:'Pendiente de revisión',aprobado:'Aprobado',descartado:'Descartado'},
 aiKind:{clasificacion:'Clasificación de solicitud',consulta:'Consulta',borrador_presupuesto:'Borrador de presupuesto',resumen:'Resumen de orden',analisis:'Análisis del negocio',estancados:'Trabajos parados'},
 scope:{all:'todas las órdenes',assigned:'solo tus órdenes asignadas',own:'solo lo tuyo'},
 shift:{trabajando:'Trabajando',descanso:'En descanso',cerrada:'Jornada cerrada'},
 missing:{codigo_postal_madrid:'código postal de Madrid',descripcion_breve:'descripción más detallada',direccion:'dirección',email:'correo electrónico'},
 risk:{riesgo_electrico:'posible riesgo eléctrico'},
 task:{visita_presupuesto:'Visita para presupuesto',ejecucion:'Ejecución del trabajo'},
 channel:{email:'Correo',correo:'Correo',sms:'SMS',whatsapp:'WhatsApp',push:'Notificación en el móvil',app:'Notificación en la app'}
};
const pick=(map,v,fb)=>v==null||v===''?(fb??''):(T[map]&&T[map][v])||(fb!==undefined?fb:String(v).replace(/_/g,' ').replace(/^./,c=>c.toUpperCase()));
const label=(map,v,fb)=>pick(map,v,fb);
/* Red de seguridad: textos visibles sin identificadores internos ni valores vacíos técnicos. */
const UUID=/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,JUNK=/^(null|undefined|NaN|\[object Object\])$/;
const TECH=/Cannot read propert|is not a function|is not defined|is not iterable|Failed to fetch|NetworkError|Unexpected token|Unexpected end of JSON|TypeError|ReferenceError|SyntaxError|Load failed|reading '[a-z_]+'/;
const SKIP=/^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|CODE|PRE|NOSCRIPT)$/;
function clean(node){
 if(!node)return;const w=document.createTreeWalker(node,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||SKIP.test(p.tagName)||p.closest('[contenteditable],[data-raw]'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
 const list=[];while(w.nextNode())list.push(w.currentNode);
 for(const n of list){const v=n.nodeValue;if(!v||v.length<4&&!/N/.test(v))continue;const t=v.trim();
  if(JUNK.test(t)){n.nodeValue=v.replace(t,'—');continue;}
  if(TECH.test(v)){n.nodeValue='No se pudo cargar esta parte. Vuelve a intentarlo en unos segundos; si se repite, avisa al soporte técnico.';continue;}
  if(UUID.test(v)){UUID.lastIndex=0;n.nodeValue=v.replace(/\s*(·|-|:)?\s*\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,'').replace(/\s*·\s*$/,'')||'—';}
  UUID.lastIndex=0;
  if(/\b(undefined|null)\b/.test(v)&&/( · |: )(undefined|null)\b|^(undefined|null) · /.test(v))n.nodeValue=v.replace(/\b(undefined|null)\b/g,'—');
 }
}
let queued=false;const roots=()=>[document.querySelector('#adminWorkspace'),document.querySelector('#tracking'),document.querySelector('#ev4-portal'),document.querySelector('main')].filter(Boolean);
function schedule(){if(queued)return;queued=true;const run=()=>{queued=false;roots().forEach(clean);};if(window.requestIdleCallback)window.requestIdleCallback(run,{timeout:400});else setTimeout(run,120);}
if(window.MutationObserver){const mo=new MutationObserver(schedule);const start=()=>{mo.observe(document.body,{childList:true,subtree:true,characterData:true});schedule();};if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});}
window.ElejemTextos={T,label,clean};
})();
