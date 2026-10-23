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
 },{threshold:.01});
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
  state.video.play().catch(()=>{});
 }
 section.querySelectorAll('.eco-product').forEach(panel=>{
  const video=panel.querySelector('video');
  const state={panel,video,loaded:false,visible:false};
  video.muted=true;
  video.controls=false;
  video.disablePictureInPicture=true;
  video.disableRemotePlayback=true;
  states.push(state);observer.observe(panel);
 });
 document.addEventListener('visibilitychange',()=>states.forEach(update));
 reduced.addEventListener('change',()=>states.forEach(update));
}
