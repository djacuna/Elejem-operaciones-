(function(){
  const params=new URLSearchParams(location.search);
  if((window.ElejemArea?window.ElejemArea.staff:params.get('area')==='gestion'))return;
  const service=params.get('servicio');
  if(service&&services.some(s=>s.id===service)){start(service);goStep(2)}
  else if(params.get('vista')==='seguimiento')showView('tracking');
  else if(params.get('vista')==='solicitud')start('otro');
  const footer=document.createElement('footer');footer.className='portal-footer';
  footer.innerHTML='<a href="../index.html">Volver a elejem.com</a><a href="../privacidad.html">Privacidad</a><a href="../cookies.html">Cookies</a>';
  document.querySelector('.main').appendChild(footer);
})();
