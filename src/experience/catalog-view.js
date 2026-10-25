import {renderPrice} from './price.js';
import {markOpportunity} from './opportunity-brand.js';
import {catalogDefaults,catalogFromQuery,catalogHash,selectCatalog} from './catalog.js';
import {createIcons} from './icons.js';
import {searchFilters} from './search-query.js';
export function createCatalog({root,properties,assets,regions,getSaved,onOpen,onSave,onChange,onHome}) {
  const page=root.querySelector('.el-catalog'),form=page.querySelector('.el-filters');
  let filters={...catalogDefaults};
  let searchPhrase='';
  const heading=page.querySelector('h1'),intro=page.querySelector('.el-heading>p:last-child'),originalHeading=heading.innerHTML,originalIntro=intro.textContent;
  const loading=document.createElement('div');loading.className='el-search-loading';loading.hidden=true;loading.setAttribute('role','status');loading.innerHTML='<span class="el-search-orbit" aria-hidden="true">M</span><h2>Encontrando seu próximo lugar.</h2><p>Consultando os imóveis da coleção…</p>';page.querySelector('.el-layout').before(loading);
  function setSearch(phrase){searchPhrase=phrase;page.classList.toggle('is-search-page',!!phrase);if(phrase){heading.textContent='Sua busca. Novas possibilidades.';intro.textContent='Você procurou: “'+phrase+'”';}else{heading.innerHTML=originalHeading;intro.textContent=originalIntro;}}
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const icon=name=>{const el=node('i');el.dataset.lucide=name;el.setAttribute('aria-hidden','true');return el;};
  const option=(value,label)=>{const el=node('option','',label);el.value=value;return el;};
  const field=name=>form.elements.namedItem(name);
  const states=[...new Map([['rs','Rio Grande do Sul'],['sc','Santa Catarina'],...regions.map(r=>[r.stateId,r.stateName])]).entries()];
  states.forEach(([value,label])=>field('state').append(option(value,label)));
  const types=[...new Set(['Casa','Apartamento','Terreno','Comercial',...properties.map(p=>p.type)])];
  types.forEach(type=>field('type').append(option(type,type)));
  function regionOptions(selected='') {
    field('region').replaceChildren(option('','Todas as regiões'),...regions.filter(r=>!field('state').value||r.stateId===field('state').value).map(r=>option(r.id,r.name)));
    field('region').value=selected;
  }
  field('state').addEventListener('change',()=>regionOptions());
  function populate() {
    if(filters.region&&!regions.some(r=>r.id===filters.region))filters.region='';
    for(const key of Object.keys(catalogDefaults)) if(field(key)) {
      if(key==='saved')field(key).checked=filters.saved;
      else field(key).value=filters[key];
    }
    regionOptions(filters.region);
    page.querySelector('.el-sort').value=filters.sort;
  }
  function render() {
    const saved=getSaved(),items=selectCatalog(properties,filters,saved,regions),grid=page.querySelector('.el-grid');
    grid.replaceChildren();
    page.querySelector('.el-count').textContent=items.length+' '+(items.length===1?'imóvel selecionado':'imóveis selecionados');
    page.querySelector('.el-empty').hidden=items.length>0;
    for(const p of items) {
      const card=node('article','el-card');
      const link=node('a','el-card-photo');link.href='#/imovel/'+p.id;link.dataset.catalogProperty=p.id;link.setAttribute('aria-label','Conhecer '+p.title);
      const image=node('img');image.src=assets[p.cover];image.alt=p.photos[0].caption;image.loading='lazy';image.decoding='async';image.width=p.photos[0].width;image.height=p.photos[0].height;
      const arrow=node('span','er-card-arrow');arrow.append(icon('arrow-up-right'));link.append(image,arrow);
      markOpportunity(link,p);
      const location=node('p','el-card-location',p.location);
      const title=node('h2'),titleLink=node('a','',p.title);titleLink.href=link.href;titleLink.dataset.catalogProperty=p.id;title.append(titleLink);
      const facts=node('p','el-card-facts',p.summary),bottom=node('div','el-card-bottom');
      const price=node('div');price.append(node('small','',p.operation==='alugar'?'Para alugar':'À venda'),renderPrice(node('strong'),p));
      const save=node('button','er-save');save.type='button';save.dataset.catalogSave=p.id;save.setAttribute('aria-label',(saved.has(p.id)?'Remover dos salvos: ':'Salvar: ')+p.title);save.setAttribute('aria-pressed',String(saved.has(p.id)));save.append(icon('heart'));bottom.append(price,save);
      card.append(link,location,title,facts,bottom);grid.append(card);
    }
    const applied=page.querySelector('.el-active-filters');applied.replaceChildren();
    const labels={q:filters.q,operation:filters.operation==='alugar'?'Alugar':'Comprar',type:filters.type,state:states.find(s=>s[0]===filters.state)?.[1],region:regions.find(r=>r.id===filters.region)?.name,min:'A partir de R$ '+Number(filters.min).toLocaleString('pt-BR'),max:'Até R$ '+Number(filters.max).toLocaleString('pt-BR'),area:filters.area+' m² ou mais',beds:filters.beds+' quartos ou mais',parking:filters.parking+' vagas ou mais',saved:'Imóveis salvos'};
    for(const [key,label] of Object.entries(labels)) if(filters[key]) {
      const chip=node('button','el-filter-chip',label||filters[key]);chip.type='button';chip.dataset.removeFilter=key;chip.setAttribute('aria-label','Remover filtro: '+(label||filters[key]));chip.append(icon('x'));applied.append(chip);
    }
    createIcons();
  }
  function apply() {
    const error=page.querySelector('.el-filter-error');error.hidden=true;
    if(!form.reportValidity())return;
    if(field('min').value&&field('max').value&&Number(field('min').value)>Number(field('max').value)) {error.textContent='O valor máximo deve ser maior ou igual ao mínimo.';error.hidden=false;field('max').focus();return;}
    const values=Object.fromEntries(new FormData(form));
    filters={...filters,...values,saved:field('saved').checked};
    render();onChange();
    if(matchMedia('(max-width:760px)').matches) {page.querySelector('.el-filter-panel').open=false;page.querySelector('.el-results').scrollIntoView({block:'start'});}
  }
  page.querySelector('.el-apply').addEventListener('click',apply);
  form.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();apply();}});
  page.querySelector('.el-sort').addEventListener('change',event=>{filters.sort=event.target.value;render();onChange();});
  page.addEventListener('click',event=>{
    const link=event.target.closest('[data-catalog-property]');
    if(link&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&event.button===0){event.preventDefault();onOpen(link.dataset.catalogProperty);return;}
    const save=event.target.closest('[data-catalog-save]');
    if(save){onSave(save.dataset.catalogSave);render();(page.querySelector('[data-catalog-save="'+save.dataset.catalogSave+'"]')||page.querySelector('h1')).focus({preventScroll:true});return;}
    if(event.target.closest('.el-home')){onHome();return;}
    if(event.target.closest('.el-clear')){filters={...catalogDefaults};populate();page.querySelector('.el-filter-error').hidden=true;render();onChange();return;}
    const chip=event.target.closest('[data-remove-filter]');
    if(chip){const key=chip.dataset.removeFilter;filters[key]=catalogDefaults[key];if(key==='state')filters.region='';populate();render();onChange();page.querySelector('#eme-catalog-title').focus({preventScroll:true});}
  });
  const mobile=matchMedia('(max-width:760px)');
  page.querySelector('.el-filter-panel').open=!mobile.matches;
  mobile.addEventListener('change',event=>{page.querySelector('.el-filter-panel').open=!event.matches;});
  return {page,render,isSearch:()=>!!searchPhrase,busy(value,error=''){loading.hidden=!value&&!error;loading.classList.toggle('has-error',!!error);loading.querySelector('h2').textContent=error?'Não foi possível atualizar a busca.':'Encontrando seu próximo lugar.';loading.querySelector('p').textContent=error||'Consultando os imóveis da coleção…';page.querySelector('.el-layout').hidden=value||!!error;page.setAttribute('aria-busy',String(value));},hash:()=>{const hash=catalogHash(filters);return searchPhrase?hash.replace('#/colecao','#/busca')+(hash.includes('?')?'&':'?')+'busca='+encodeURIComponent(searchPhrase):hash;},show(query){if(query!==undefined){const phrase=typeof query==='string'?new URLSearchParams(query).get('busca'):query.searchPhrase;setSearch(phrase||'');filters=typeof query==='string'?catalogFromQuery(query):{...catalogDefaults,...query};if(phrase&&typeof query!=='string')filters=searchFilters(phrase,regions);}populate();render();page.hidden=false;}};
}
