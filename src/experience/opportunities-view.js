import {renderPrice} from './price.js';
import {markOpportunity,brandOpportunities} from './opportunity-brand.js';
import {opportunityDefaults,opportunitiesFromQuery,opportunitiesHash,selectOpportunities} from './opportunities.js';
import {createIcons} from './icons.js';

export function createOpportunities({root,properties,assets,regions,getSaved,onOpen,onSave,onChange,onHome}){
 const page=root.querySelector('.eo-opportunities');
 const types=[['','Todos','layout-grid'],['Casa','Casas','house'],['Apartamento','Apartamentos','building-2'],['Terreno','Terrenos','land-plot'],['Comercial','Comercial','store']];
 let filters={...opportunityDefaults};
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const icon=name=>{const el=node('i');el.dataset.lucide=name;el.setAttribute('aria-hidden','true');return el;};
 const propertyLink=(p,cls,label)=>{const link=node('a',cls,label);link.href='#/imovel/'+p.id;link.dataset.opportunityProperty=p.id;return link;};
 const regionField=page.querySelector('.eo-region'),sortField=page.querySelector('.eo-sort');
 for(const region of regions){const option=node('option','',region.name+' · '+region.stateId.toUpperCase());option.value=region.id;regionField.append(option);}
 const photo=(p,eager=false)=>{const img=node('img');img.src=assets[p.cover];img.alt=p.photos[0].caption;img.width=p.photos[0].width;img.height=p.photos[0].height;img.loading=eager?'eager':'lazy';img.decoding='async';return img;};
 function render(){
  const items=selectOpportunities(properties,filters),saved=getSaved();
  const spotlight=page.querySelector('.eo-spotlight'),first=items[0];
  spotlight.hidden=!first;page.querySelector('.eo-hero').classList.toggle('eo-hero-empty',!first);
  if(first){
   spotlight.href='#/imovel/'+first.id;spotlight.dataset.opportunityProperty=first.id;spotlight.setAttribute('aria-label','Conhecer '+first.title);
   spotlight.querySelector('img').replaceWith(photo(first,true));
   spotlight.querySelector('.eo-spotlight-copy p').textContent=first.location;
   spotlight.querySelector('h2').textContent=first.title;
   renderPrice(spotlight.querySelector('.eo-spotlight-price'),first);markOpportunity(spotlight,first);
  }
  const typeList=page.querySelector('.eo-types');typeList.replaceChildren();
  for(const [type,label,glyph] of types){
   const count=selectOpportunities(properties,{...filters,type}).length;
   const button=node('button');button.type='button';button.dataset.opportunityType=type;button.setAttribute('aria-pressed',String(filters.type===type));
   button.setAttribute('aria-label',label+' · '+count+' '+(count===1?'imóvel':'imóveis'));
   button.append(icon(glyph),node('span','',label),node('small','',String(count)));typeList.append(button);
  }
  page.querySelector('.eo-count').textContent=items.length+' '+(items.length===1?'imóvel para conhecer':'imóveis para conhecer');
  page.querySelector('.eo-empty').hidden=items.length>0;
  const grid=page.querySelector('.eo-grid');grid.replaceChildren();
  for(const [index,p] of items.entries()){
   const card=node('article','eo-card');card.style.setProperty('--eo-order',String(Math.min(index,5)));
   const cover=propertyLink(p,'eo-card-photo');cover.setAttribute('aria-label','Conhecer '+p.title);cover.append(photo(p));
   const badge=node('span','eo-badge');badge.append(icon('gem'),document.createTextNode('Oportunidade'));
   const arrow=node('span','eo-card-arrow');arrow.append(icon('arrow-up-right'));cover.append(badge,arrow);
   const body=node('div','eo-card-body'),title=node('h3');title.append(propertyLink(p,'',p.title));
   const detail=node('p','eo-card-reason',p.lead),bottom=node('div','eo-card-bottom'),price=node('div');
   price.append(node('small','',p.operation==='alugar'?'Para alugar':'À venda'),renderPrice(node('strong'),p));
   const save=node('button','eo-save');save.type='button';save.dataset.opportunitySave=p.id;save.setAttribute('aria-pressed',String(saved.has(p.id)));save.setAttribute('aria-label',(saved.has(p.id)?'Remover dos salvos: ':'Salvar: ')+p.title);save.append(icon('heart'));
   bottom.append(price,save);
   body.append(node('p','eo-card-location',p.location),title,node('p','eo-card-facts',p.summary),detail,bottom);
   markOpportunity(cover,p);card.append(cover,body);grid.append(card);
  }
  regionField.value=filters.region;sortField.value=filters.sort;
  brandOpportunities(root);createIcons();
 }
 function change(){render();onChange();}
 regionField.addEventListener('change',()=>{filters.region=regionField.value;change();});
 sortField.addEventListener('change',()=>{filters.sort=sortField.value;change();});
 page.addEventListener('click',event=>{
  const target=event.target;
  const property=target.closest('[data-opportunity-property]');
  if(property&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&event.button===0){event.preventDefault();onOpen(property.dataset.opportunityProperty);return;}
  const save=target.closest('[data-opportunity-save]');
  if(save){const id=save.dataset.opportunitySave;onSave(id);render();page.querySelector('[data-opportunity-save="'+id+'"]').focus({preventScroll:true});return;}
  const type=target.closest('[data-opportunity-type]');
  if(type){filters.type=type.dataset.opportunityType;change();page.querySelector('[data-opportunity-type="'+filters.type+'"]').focus({preventScroll:true});return;}
  if(target.closest('.eo-clear')){filters={...opportunityDefaults};change();page.querySelector('#eme-opportunities-selection').focus({preventScroll:true});return;}
  if(target.closest('.eo-home')){onHome();return;}
  if(target.closest('.eo-explore')){const heading=page.querySelector('#eme-opportunities-selection');heading.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});heading.focus({preventScroll:true});}
 });
 return {page,render,hash:()=>opportunitiesHash(filters),show(query){if(query!==undefined)filters=opportunitiesFromQuery(query);render();page.hidden=false;}};
}
