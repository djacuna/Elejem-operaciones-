/* ELEJEM · Etapa 10G · Gráficas ligeras del Dashboard (HTML/CSS + SVG, sin dependencias).
   Solo dibuja los datos que recibe; si no hay datos devuelve un estado vacío. Nunca inventa cifras. */
(function(){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
const int=v=>new Intl.NumberFormat('es-ES').format(num(v));
const pct=(a,t)=>t>0?Math.round(a/t*100):0;
const TONES=['gold','steel','sand','ok','danger','faint'];
function fig(title,body,o){o=o||{};return '<figure class="ec-chart'+(o.cls?' '+o.cls:'')+'"'+(o.id?' data-chart="'+esc(o.id)+'"':'')+'><figcaption><strong>'+esc(title)+'</strong>'+(o.sub?'<span>'+esc(o.sub)+'</span>':'')+'</figcaption>'+body+(o.note?'<p class="ec-note">'+esc(o.note)+'</p>':'')+'</figure>';}
function empty(title,text,o){return fig(title,'<p class="ec-empty">'+esc(text||'Sin datos en este periodo.')+'</p>',o);}
/* Barras horizontales: [{label,value,display,tone}] */
function bars(title,items,o){o=o||{};items=(items||[]).filter(i=>i&&i.label!=null);const max=Math.max(0,...items.map(i=>num(i.value)));
 if(!items.length||max<=0)return empty(title,o.empty,o);
 const rows=items.map((i,k)=>{const v=num(i.value),w=v>0?Math.max(2,v/max*100):0;return '<li><span class="ec-l">'+esc(i.label)+'</span><span class="ec-track" aria-hidden="true"><i class="ec-'+esc(i.tone||o.tone||'gold')+'" style="width:'+w.toFixed(1)+'%"></i></span><span class="ec-v">'+esc(i.display??int(v))+'</span></li>';}).join('');
 return fig(title,'<ul class="ec-bars">'+rows+'</ul>',o);}
/* Columnas verticales (evolución): [{label,value,display,extra}] */
function columns(title,items,o){o=o||{};items=items||[];const max=Math.max(0,...items.map(i=>num(i.value)));
 if(items.length<(o.min||1))return empty(title,o.few||o.empty,o);
 if(max<=0)return empty(title,o.empty,o);
 const many=items.length>6;
 const cols=items.map(i=>{const v=num(i.value),h=v>0?Math.max(3,v/max*100):0;return '<li title="'+esc(i.label+': '+(i.display??int(v)))+'"><span class="ec-cv">'+esc(i.short??i.display??int(v))+'</span><span class="ec-cbar" aria-hidden="true"><i style="height:'+h.toFixed(1)+'%"></i></span><span class="ec-cl">'+esc(i.label)+'</span>'+(i.extra?'<span class="ec-cx">'+esc(i.extra)+'</span>':'')+'</li>';}).join('');
 const sr='<table class="u10-sr"><caption>'+esc(title)+'</caption><tbody>'+items.map(i=>'<tr><th scope="row">'+esc(i.label)+'</th><td>'+esc(i.display??int(i.value))+'</td>'+(i.extra?'<td>'+esc(i.extra)+'</td>':'')+'</tr>').join('')+'</tbody></table>';
 return fig(title,'<ol class="ec-cols'+(many?' ec-many':'')+'" aria-hidden="true">'+cols+'</ol>'+sr,o);}
/* Anillo con leyenda: [{label,value,tone}] */
function donut(title,items,o){o=o||{};items=(items||[]).filter(i=>num(i.value)>0);const total=items.reduce((s,i)=>s+num(i.value),0);
 if(!total)return empty(title,o.empty,o);
 const R=42,C=2*Math.PI*R;let acc=0;
 const arcs=items.map((i,k)=>{const len=num(i.value)/total*C,gap=items.length>1?1.5:0;const s='<circle class="ec-s-'+esc(i.tone||TONES[k%TONES.length])+'" r="'+R+'" cx="50" cy="50" fill="none" stroke-width="14" stroke-dasharray="'+Math.max(0,len-gap).toFixed(2)+' '+(C-Math.max(0,len-gap)).toFixed(2)+'" stroke-dashoffset="'+(-acc).toFixed(2)+'"/>';acc+=len;return s;}).join('');
 const svg='<svg class="ec-ring" viewBox="0 0 100 100" width="120" height="120" role="img" aria-label="'+esc(title+': '+items.map(i=>i.label+' '+int(i.value)).join(', '))+'"><g transform="rotate(-90 50 50)"><circle r="'+R+'" cx="50" cy="50" fill="none" stroke-width="14" class="ec-s-base"/>'+arcs+'</g><text x="50" y="50" text-anchor="middle" dominant-baseline="central" class="ec-ring-t">'+esc(o.center??int(total))+'</text></svg>';
 const legend='<ul class="ec-legend">'+items.map((i,k)=>'<li><i class="ec-'+esc(i.tone||TONES[k%TONES.length])+'" aria-hidden="true"></i><span>'+esc(i.label)+'</span><b>'+esc(i.display??int(i.value))+'</b><small>'+pct(num(i.value),total)+' %</small></li>').join('')+'</ul>';
 return fig(title,'<div class="ec-donut">'+svg+legend+'</div>',o);}
/* Barra apilada (reparto de un total): [{label,value,tone}] */
function meter(title,items,o){o=o||{};items=items||[];const total=items.reduce((s,i)=>s+num(i.value),0);
 if(!total)return empty(title,o.empty,o);
 const seg=items.filter(i=>num(i.value)>0).map((i,k)=>'<i class="ec-'+esc(i.tone||TONES[k%TONES.length])+'" style="width:'+(num(i.value)/total*100).toFixed(2)+'%"></i>').join('');
 const legend='<ul class="ec-legend ec-inline">'+items.map((i,k)=>'<li><i class="ec-'+esc(i.tone||TONES[k%TONES.length])+'" aria-hidden="true"></i><span>'+esc(i.label)+'</span><b>'+esc(i.display??int(i.value))+'</b><small>'+pct(num(i.value),total)+' %</small></li>').join('')+'</ul>';
 return fig(title,'<div class="ec-meter" aria-hidden="true">'+seg+'</div>'+legend,o);}
/* Periodo actual frente al anterior: [{label,a,b,fa,fb}] */
function pairs(title,items,o){o=o||{};items=(items||[]).filter(i=>i&&i.a!=null);if(!items.length||items.every(i=>!num(i.a)&&!num(i.b)))return empty(title,o.empty,o);
 const rows=items.map(i=>{const m=Math.max(num(i.a),num(i.b),0);const w=v=>m>0&&num(v)>0?Math.max(2,num(v)/m*100):0;
  return '<li><span class="ec-l">'+esc(i.label)+'</span><span class="ec-pair"><span class="ec-track" aria-hidden="true"><i class="ec-gold" style="width:'+w(i.a).toFixed(1)+'%"></i></span><span class="ec-v">'+esc(i.fa??int(i.a))+'</span><span class="ec-track ec-thin" aria-hidden="true"><i class="ec-steel" style="width:'+w(i.b).toFixed(1)+'%"></i></span><span class="ec-v ec-muted">'+(i.b==null?'—':esc(i.fb??int(i.b)))+'</span></span></li>';}).join('');
 const legend='<ul class="ec-legend ec-inline"><li><i class="ec-gold" aria-hidden="true"></i><span>'+esc(o.aLabel||'Periodo elegido')+'</span></li><li><i class="ec-steel" aria-hidden="true"></i><span>'+esc(o.bLabel||'Periodo anterior')+'</span></li></ul>';
 return fig(title,legend+'<ul class="ec-bars ec-pairs">'+rows+'</ul>',o);}
window.ElejemCharts={bars,columns,donut,meter,pairs,empty,esc,int};
})();
