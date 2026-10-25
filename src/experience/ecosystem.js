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
 },{threshold:.01,rootMargin:'300px 0px'});
 function load(state){
  if(state.loaded)return;
  state.loaded=true;
  state.video.querySelectorAll('source[data-src]').forEach(source=>{source.src=source.dataset.src;});
  state.video.load();
 }
 function play(state){
  state.video.playbackRate=1.3;
  if(state.video.paused)state.video.play().catch(()=>state.panel.classList.remove('eco-is-playing'));
 }
 function update(state){
  if(!state.visible||document.hidden||reduced.matches){state.video.pause();return;}
  load(state);
  // Browsers may block playback in low-power mode; the poster remains visible.
  play(state);
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
  video.defaultPlaybackRate=1.3;
  video.playbackRate=1.3;
  const poster=document.createElement('img');
  poster.className='eco-poster';poster.src=video.poster;poster.alt='';poster.setAttribute('aria-hidden','true');
  video.parentElement.append(poster);
  video.addEventListener('playing',()=>panel.classList.add('eco-is-playing'));
  video.addEventListener('pause',()=>panel.classList.remove('eco-is-playing'));
  video.addEventListener('error',()=>panel.classList.remove('eco-is-playing'));
  video.addEventListener('loadedmetadata',()=>{
   video.playbackRate=1.3;
   const start=Number(video.dataset.start||0);
   if(start>0&&start<video.duration)video.currentTime=start;
  });
  video.addEventListener('loadeddata',()=>update(state));
  states.push(state);observer.observe(panel);
 });
 document.addEventListener('visibilitychange',()=>states.forEach(update));
 window.addEventListener('pageshow',()=>states.forEach(update));
 // Retry a browser-blocked autoplay on a normal navigation gesture, without player UI.
 function resumeOnGesture(){
  if(document.hidden||reduced.matches)return;
  states.filter(state=>state.loaded&&state.visible).forEach(play);
 }
 document.addEventListener('touchstart',resumeOnGesture,{passive:true});
 document.addEventListener('touchend',resumeOnGesture,{passive:true});
 document.addEventListener('pointerup',resumeOnGesture,{passive:true});
 reduced.addEventListener('change',()=>states.forEach(update));
}
