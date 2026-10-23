// Each scene keeps its own decoded image until its exit animation finishes.
// This also makes quick direction changes safe: a pending load cannot replace
// the latest selection, and interrupted animations continue from their position.
export function createHeroFocus({root,viewport,duration=1250}) {
  const sources=new Map();
  const layers=new Set();
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let active=null,selected=null,choice=null,version=0;
  const easing='cubic-bezier(.22,.75,.18,1)';

  function source(id) {
    if(!sources.has(id)) {
      const image=new Image();
      image.decoding='async';
      image.src='/assets/experience/hero-'+id+'-detail.webp';
      const ready=image.decode().then(()=>image).catch(error=>{sources.delete(id);throw error;});
      sources.set(id,ready);
    }
    return sources.get(id);
  }

  function remove(layer) {
    layer.getAnimations().forEach(animation=>animation.cancel());
    layers.delete(layer);
    layer.remove();
  }

  function animate(layer,frames,time,onFinish=()=>{}) {
    layer.style.willChange='transform,opacity';
    const animation=layer.animate(frames,{duration:time,easing,fill:'both'});
    animation.finished.then(()=>{
      const end=frames[frames.length-1];
      layer.style.opacity=String(end.opacity);
      layer.style.transform=end.transform;
      animation.cancel();
      layer.style.willChange='auto';
      onFinish();
    }).catch(()=>{/* A new navigation continues from the current visual frame. */});
  }

  function retire(layer,direction,enabled) {
    if(!enabled || motion.matches) { remove(layer);return; }
    const computed=getComputedStyle(layer);
    const start={opacity:Number(computed.opacity),transform:computed.transform};
    layer.getAnimations().forEach(animation=>animation.cancel());
    const distance=Math.min(300,viewport.clientWidth*.25);
    const end={opacity:0,transform:direction ? `translate3d(${-direction*distance}px,0,0) scale(.94)` : 'translate3d(0,24px,0) scale(.9)'};
    animate(layer,[start,end],duration*.72,()=>remove(layer));
  }

  async function select(id,{direction=1,animated=true}={}) {
    const request=++version;
    selected=id;
    choice=null;
    let image;
    try { image=await source(id); } catch {
      if(request===version) {
        root.classList.remove('has-focus-detail');
        layers.forEach(layer=>retire(layer,direction,animated));
        active=null;
      }
      return;
    }
    if(request!==version || selected!==id)return;
    const enteringFromOverview=!active;
    const layer=document.createElement('div');
    layer.className='ec-focus-layer';
    layer.dataset.category=id;
    layer.dataset.choice=String(choice??'');
    layer.setAttribute('aria-hidden','true');
    // Cloning a decoded, cached source never mutates a visible image's src.
    const photo=image.cloneNode();
    photo.className='ec-focus-view';photo.alt='';
    layer.append(photo);
    layer.style.opacity='0';
    viewport.append(layer);
    const enabled=animated&&!motion.matches;
    layers.forEach(outgoing=>retire(outgoing,direction,enabled));
    layers.add(layer);
    active=layer;
    root.dataset.focus=id;
    root.classList.add('has-focus-detail');
    if(enabled) {
      const distance=enteringFromOverview ? 65 : Math.min(360,viewport.clientWidth*.28);
      animate(layer,[
        {opacity:0,transform:`translate3d(${direction*distance}px,18px,0) scale(.9)`},
        {opacity:1,transform:'translate3d(0,0,0) scale(1)'}
      ],duration);
    } else {layer.style.opacity='1';layer.style.transform='none';}
  }

  function overview(animated=true) {
    ++version;selected=null;choice=null;active=null;
    root.classList.remove('has-focus-detail');
    layers.forEach(layer=>retire(layer,0,animated));
  }

  function selectChoice(value,animated=true) {
    choice=value;
    if(!active || active.dataset.category!==selected)return;
    const photo=active.querySelector('img');
    if(!animated)photo.style.transition='none';
    active.dataset.choice=String(value??'');
    if(!animated)requestAnimationFrame(()=>{photo.style.transition='';});
  }

  motion.addEventListener('change',()=>{
    if(!motion.matches)return;
    layers.forEach(layer=>{
      if(layer!==active)remove(layer);
      else {
        layer.getAnimations().forEach(animation=>animation.cancel());
        layer.style.opacity='1';layer.style.transform='none';layer.style.willChange='auto';
      }
    });
  });

  const preload=()=>['terrenos','casas','apartamentos','comercial'].forEach(id=>{source(id).catch(()=>{});});
  if('requestIdleCallback' in window)window.requestIdleCallback(preload,{timeout:1800});
  else setTimeout(preload,700);
  return {select,overview,selectChoice};
}
