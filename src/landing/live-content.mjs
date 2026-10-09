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
    let index = 0;
    function showPhoto(delta = 0) {
      if (!photos.length) { gallery.hidden = true; return; }
      index = (index + delta + photos.length) % photos.length;
      image.src = photos[index].url;
      image.alt = photos[index].caption || item.title;
      $('[data-photo-count]').textContent = String(index+1).padStart(2,'0')+' / '+String(photos.length).padStart(2,'0');
    }
    showPhoto();
    for (const [selector,delta] of [['[data-photo-prev]',-1],['[data-photo-next]',1]]) {
      const button = $(selector);button.hidden = photos.length < 2;
      button.addEventListener('click',() => showPhoto(delta),{signal});
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
