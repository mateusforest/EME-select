// Load the supplied loops only when their panels enter the visible page.
// User pauses survive scrolling, tab switches and navigation inside the site.
export function mountEcosystem(container){
 const section=container.querySelector('.eme-ecosystem');
 if(!section)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const connection=navigator.connection;
 const states=[];
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
   const state=states.find(item=>item.panel===entry.target);
   if(state){state.visible=entry.isIntersecting;update(state);}
  }
 },{threshold:.12});
 function load(state){
  if(state.loaded)return;
  state.loaded=true;
  state.video.querySelectorAll('source[data-src]').forEach(source=>{source.src=source.dataset.src;});
  state.video.load();
 }
 function update(state){
  if(!state.visible||document.hidden||!state.wantsPlay){state.video.pause();return;}
  load(state);
  state.video.play().catch(()=>{state.sync();});
 }
 section.querySelectorAll('.eco-product').forEach(panel=>{
  const video=panel.querySelector('video'),button=panel.querySelector('.eco-motion');
  const name=video.id==='video-eme'?'EME':'EME Spatial';
  const state={panel,video,button,loaded:false,visible:false,wantsPlay:!reduced.matches&&!connection?.saveData};
  state.sync=()=>{
   button.setAttribute('aria-label',`${video.paused?'Reproduzir':'Pausar'} vídeo do ${name}`);
   button.setAttribute('aria-pressed',String(!video.paused));
   button.querySelector('path').setAttribute('d',video.paused?'M8 5v14l11-7z':'M7 5h3v14H7zM14 5h3v14h-3z');
  };
  video.muted=true;
  button.hidden=false;
  video.addEventListener('play',state.sync);
  video.addEventListener('pause',state.sync);
  video.addEventListener('error',()=>{state.wantsPlay=false;button.hidden=true;});
  button.addEventListener('click',()=>{state.wantsPlay=video.paused;update(state);});
  states.push(state);state.sync();observer.observe(panel);
 });
 document.addEventListener('visibilitychange',()=>states.forEach(update));
 reduced.addEventListener('change',()=>{
  if(reduced.matches)states.forEach(state=>{state.wantsPlay=false;update(state);});
 });
}
