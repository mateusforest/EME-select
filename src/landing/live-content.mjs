import {createPhotoCache} from '../photo-cache.mjs';
import {propertyPhotos} from './published-search.mjs';

export function hydrateLanding(root, properties, signal) {
  const $ = selector => root.querySelector(selector);
  const item = properties.find(p => p.isIllustrative === false);
  const propertyArticle = $('.ef-property');
  if (!item) {
    propertyArticle.hidden = true;
    const empty = document.createElement('p');
    empty.textContent = 'Novos imóveis estão a caminho. Converse com a EME sobre o que você procura.';
    propertyArticle.after(empty);
  } else {
    const photos = propertyPhotos(item);
    const image = $('[data-property-photo]');
    const gallery = $('.ef-property-gallery');
    let index = 0, requested = 0, version = 0, animation;
    const cache = createPhotoCache();
    const incoming = image.cloneNode(false); incoming.removeAttribute('data-property-photo');
    incoming.removeAttribute('src'); incoming.alt = ''; incoming.setAttribute('aria-hidden','true'); incoming.hidden = true;
    gallery.append(incoming);
    const status = document.createElement('span'); status.className = 'ef-gallery-status'; status.setAttribute('role','status'); status.hidden = true; gallery.append(status);
    async function showPhoto(delta = 0) {
      if (!photos.length) { gallery.hidden = true; return; }
      requested = (requested + delta + photos.length) % photos.length;
      const next = requested, ticket = ++version;
      animation?.cancel(); incoming.hidden = true; status.hidden = true;
      gallery.setAttribute('aria-busy','true');
      try {
        const source = await cache.load(photos[next].url);
        if (signal.aborted || ticket !== version) return;
        incoming.src = source; await incoming.decode();
        if (signal.aborted || ticket !== version) return;
        if (delta && !matchMedia('(prefers-reduced-motion: reduce)').matches && incoming.animate) {
          incoming.hidden = false;
          animation = incoming.animate([{opacity:0},{opacity:1}],{duration:220,easing:'ease-out',fill:'forwards'});
          await animation.finished.catch(() => undefined);
        }
        if (signal.aborted || ticket !== version) return;
        image.src = source; image.alt = photos[next].caption || item.title;
        incoming.hidden = true; animation?.cancel(); index = next;
        $('[data-photo-count]').textContent = String(index+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0');
        for (const offset of [1,-1]) void cache.load(photos[(index+offset+photos.length)%photos.length].url).catch(() => undefined);
      } catch {
        if (signal.aborted || ticket !== version) return;
        requested = index; incoming.hidden = true; status.textContent = 'Não foi possível carregar a foto. Tente novamente.'; status.hidden = false;
      } finally {if (ticket === version) gallery.setAttribute('aria-busy','false');}
    }
    void showPhoto();
    signal.addEventListener('abort',() => {version++; animation?.cancel(); cache.dispose(); incoming.remove(); status.remove();},{once:true});
    for (const [selector,delta] of [['[data-photo-prev]',-1],['[data-photo-next]',1]]) {
      const button = $(selector);button.hidden = photos.length < 2;
      button.addEventListener('click',() => void showPhoto(delta),{signal});
    }
    $('.ef-property-copy .ef-kicker').textContent = item.location;
    $('.ef-property-copy h3').textContent = item.title.toLocaleLowerCase('pt-BR').replace(/^./,c => c.toUpperCase());
    $('.ef-property-copy>p:not(.ef-kicker)').textContent = (item.tags || []).slice(0,3).join(' · ') || item.description.split(/\n/)[0];
    $('.ef-photo-tag').textContent = (item.operation === 'alugar' ? 'Para locação' : 'À venda') + ' · ' + item.type;
    const facts = $('.ef-facts');facts.replaceChildren();
    for (const [name,value] of [['Área informada',Number.isFinite(item.area) && item.area > 0 ? item.area.toLocaleString('pt-BR')+' m²':null],['Dormitórios',item.bedrooms],['Garagem',item.parking == null ? null : item.parking+' vagas']]) {
      if(value == null) continue;
      const pair=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=name;dd.textContent=String(value);pair.append(dt,dd);facts.append(pair);
    }
    $('.ef-property-price>span').textContent = item.operation === 'alugar' ? 'Aluguel mensal' : 'Valor de venda';
    $('.ef-property-price strong').textContent = Number.isFinite(item.price) && item.price > 0 ? item.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) : 'Consulte a equipe';
    $('.ef-property-copy .ef-button').href = '#/imovel/'+encodeURIComponent(item.id);
  }
  const people = $('.ef-people');
  people.querySelectorAll('details').forEach(node => node.remove());
  fetch('/api/public/people',{signal,cache:'no-store'}).then(r => {if(!r.ok)throw Error();return r.json();}).then(data => {
    if(signal.aborted || !Array.isArray(data.people))return;
    for(const person of data.people){
      const details=document.createElement('details'),summary=document.createElement('summary'),info=document.createElement('span'),name=document.createElement('strong'),role=document.createElement('small'),plus=document.createElement('span'),bio=document.createElement('p');
      name.textContent=person.name;role.textContent=person.role;plus.textContent='+';plus.setAttribute('aria-hidden','true');bio.textContent=person.bio || 'Converse com a equipe para conhecer mais.';
      info.append(name,role);summary.append(info,plus);details.append(summary,bio);people.append(details);
    }
  }).catch(() => {
    if(signal.aborted)return;
    const link=document.createElement('a');link.href='#ef-contato';link.textContent='Converse com a equipe';people.append(link);
  });
  root.addEventListener('click',event => {
    const link=event.target.closest('a[href^="#"]');
    const hash=link?.getAttribute('href');
    if(!hash || hash.startsWith('#/'))return;
    const target=hash==='#'+root.id ? root : root.querySelector(hash);
    if(!target)return;
    event.preventDefault();
    target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  },{signal});
}
