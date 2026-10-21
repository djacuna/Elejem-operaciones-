(function(){'use strict';
// Etapa 7C · Mejoras transversales: filtros rápidos por panel, contexto táctil y modo app (PWA/WebView).
const QUICK={personnel:{placeholder:'Buscar trabajador…',noun:'filas',items:'tbody tr, article'},notices:{placeholder:'Buscar en avisos…',noun:'avisos'},aftersales:{placeholder:'Buscar incidencia, garantía, código o cliente…',noun:'elementos'},materials:{placeholder:'Buscar material, referencia o proveedor…',noun:'materiales',items:'tbody tr, article'},inventory:{placeholder:'Buscar en inventario…',noun:'elementos',items:'tbody tr, article'},billing:{placeholder:'Buscar cobro, código o concepto…',noun:'elementos',items:'tbody tr, article'},availability:{placeholder:'Buscar técnico…',noun:'filas',items:'tbody tr, article'},sessions:{placeholder:'Buscar sesión o dispositivo…',noun:'sesiones',items:'tbody tr, article'}};
function enhance(id){const cfg=QUICK[id],K=window.ElejemKit,pane=window.ElejemNavigation?.pane(id);if(!cfg||!K||!pane||pane.hidden&&pane.dataset.opsPane!==id)return;K.quickFilter(pane,cfg);}
window.addEventListener('elejem:pane',e=>{document.documentElement.dataset.opsActive=e.detail.id;setTimeout(()=>enhance(e.detail.id),0);});
const html=document.documentElement;
const mqTouch=matchMedia('(hover: none), (pointer: coarse)');const setTouch=()=>html.classList.toggle('is-touch',mqTouch.matches);setTouch();mqTouch.addEventListener?.('change',setTouch);
if(matchMedia('(display-mode: standalone)').matches||navigator.standalone||/; wv\)|ElejemApp/i.test(navigator.userAgent))html.classList.add('is-app');
const net=()=>html.classList.toggle('is-offline',navigator.onLine===false);addEventListener('online',net);addEventListener('offline',net);net();
document.addEventListener('DOMContentLoaded',()=>{if(!document.querySelector('.ops7-offline')){const b=document.createElement('div');b.className='ops7-offline';b.setAttribute('role','status');b.textContent='Sin conexión: se muestran los datos ya cargados; los cambios se enviarán cuando vuelvas a tener red.';document.body.append(b);}});
window.ElejemOps7={enhance,QUICK};
})();
