export function createPropertyLightbox({root,onChange}) {
  const dialog=document.createElement('dialog');
  dialog.id='eme-property-photos';dialog.className='ep-lightbox';
  dialog.setAttribute('aria-label','Fotos do imóvel em tela cheia');
  dialog.innerHTML=`<header class="epl-header"><div><span>FOTOS DO IMÓVEL</span><h2></h2></div><button type="button" class="epl-close" aria-label="Fechar fotos" autofocus>Fechar <span aria-hidden="true">×</span></button></header>
    <div class="epl-stage"><img alt="" draggable="false"><p class="epl-status" role="status"></p><button type="button" class="epl-prev" aria-label="Foto anterior">‹</button><button type="button" class="epl-next" aria-label="Próxima foto">›</button></div>
    <footer><div class="epl-caption" aria-live="polite"></div><div class="epl-thumbs" aria-label="Selecionar foto"></div><small>Deslize ou use as setas para navegar.</small></footer>`;
  root.append(dialog);
  const image=dialog.querySelector('.epl-stage img'),status=dialog.querySelector('.epl-status'),thumbs=dialog.querySelector('.epl-thumbs'),stage=dialog.querySelector('.epl-stage');
  let photos=[],index=0,origin=null,scrollerOverflow='',gesture=null;
  const scroller=root.querySelector('.ec-page-scroll');
  function select(next) {
    index=Math.max(0,Math.min(photos.length-1,next));
    const photo=photos[index];if(!photo)return;
    image.hidden=false;status.textContent='Carregando fotografia…';
    image.alt=photo.caption||photo.name;image.src=photo.src;
    dialog.querySelector('.epl-caption').textContent=`${index+1} / ${photos.length} · ${photo.name}`;
    dialog.querySelector('.epl-prev').disabled=index===0;
    dialog.querySelector('.epl-next').disabled=index===photos.length-1;
    [...thumbs.children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    thumbs.children[index]?.scrollIntoView({block:'nearest',inline:'nearest'});
    onChange(index);
  }
  image.onload=()=>{status.textContent='';};
  image.onerror=()=>{image.hidden=true;status.textContent='Não foi possível carregar esta foto. Selecione outra imagem ou tente novamente.';};
  dialog.querySelector('.epl-close').onclick=()=>dialog.close();
  dialog.querySelector('.epl-prev').onclick=()=>select(index-1);
  dialog.querySelector('.epl-next').onclick=()=>select(index+1);
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();
      select(event.key==='Home'?0:event.key==='End'?photos.length-1:index+(event.key==='ArrowRight'?1:-1));
    }
  });
  stage.addEventListener('pointerdown',event=>{
    if(event.target.closest('button'))return;
    gesture={x:event.clientX,y:event.clientY};stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointerup',event=>{
    if(!gesture)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.4)select(index+(dx<0?1:-1));
  });
  stage.addEventListener('pointercancel',()=>{gesture=null;});
  dialog.addEventListener('close',()=>{scroller.style.overflow=scrollerOverflow;origin?.focus({preventScroll:true});});
  window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();});
  return {open(data){
    if(!data.photos.length)return;
    photos=data.photos;origin=document.activeElement;
    dialog.querySelector('h2').textContent=data.title;
    thumbs.replaceChildren();
    photos.forEach((photo,i)=>{
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Ver foto ${i+1}: ${photo.name}`);
      const img=document.createElement('img');img.src=photo.src;img.alt='';img.loading='lazy';button.append(img);button.onclick=()=>select(i);thumbs.append(button);
    });
    scrollerOverflow=scroller.style.overflow;scroller.style.overflow='hidden';
    dialog.showModal();select(data.index);dialog.querySelector('.epl-close').focus();
  }};
}
