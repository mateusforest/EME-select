// Load the supplied loops only when their panels enter the visible page.
// Decorative videos run silently on screen, without player controls.
export function mountEcosystem(container){
 const section=container.querySelector('.eme-ecosystem');
 if(!section)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const states=[];
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
   const state=states.find(item=>item.panel===entry.target);
   if(state){state.visible=entry.isIntersecting;update(state);}
  }
 },{threshold:.01,rootMargin:'120px 0px'});
 function load(state){
  if(state.loaded)return;
  state.loaded=true;
  state.video.querySelectorAll('source[data-src]').forEach(source=>{source.src=source.dataset.src;});
  state.video.load();
 }
 function update(state){
  if(!state.visible||document.hidden||reduced.matches){state.video.pause();return;}
  load(state);
  // Browsers may block playback in low-power mode; the poster remains visible.
  if(state.video.paused)state.video.play().catch(()=>{});
 }
 section.querySelectorAll('.eco-product').forEach(panel=>{
  const video=panel.querySelector('video');
  const state={panel,video,loaded:false,visible:false};
  video.muted=true;
  video.defaultMuted=true;
  video.autoplay=true;
  video.playsInline=true;
  video.setAttribute('muted','');
  video.setAttribute('playsinline','');
  video.setAttribute('webkit-playsinline','');
  video.controls=false;
  video.disablePictureInPicture=true;
  video.disableRemotePlayback=true;
  video.addEventListener('loadeddata',()=>update(state));
  states.push(state);observer.observe(panel);
 });
 document.addEventListener('visibilitychange',()=>states.forEach(update));
 window.addEventListener('pageshow',()=>states.forEach(update));
 // Retry a browser-blocked autoplay on a normal navigation gesture, without player UI.
 document.addEventListener('touchend',()=>states.forEach(update),{passive:true});
 document.addEventListener('pointerup',()=>states.forEach(update),{passive:true});
 reduced.addEventListener('change',()=>states.forEach(update));
}
