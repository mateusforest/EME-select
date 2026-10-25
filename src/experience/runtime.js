import {renderPrice} from './price.js';
import {createHeaderVoice} from './header-voice.js';
import {defaultSiteContent} from '../../shared/portal-content.mjs';
import {mapProperties} from './properties.js';
import {createIcons} from './icons.js';
import {createCatalog} from './catalog-view.js';
import {createOpportunities} from './opportunities-view.js';
import {createHeroFocus} from './hero-motion.js';
import {createChatTransport} from './chat-client.js';
export function mountExperience(publishedProperties,assetMap,content=null){
const lucide={createIcons};
let routingReady=false;
let remembered={};try{remembered=JSON.parse(localStorage.getItem('eme-experience-preferences')||'{}');}catch{}
const experienceState={widgetState:{privateContent:{version:'eme-experience-4',...remembered}},setWidgetState:async value=>{const {savedIds,homeStateId}=value.privateContent;try{localStorage.setItem('eme-experience-preferences',JSON.stringify({savedIds,homeStateId}));}catch{}}};

(() => {
  const root = document.getElementById('eme-continuo');
  const hero = root.querySelector('.ec-hero');
  const viewport = root.querySelector('.ec-viewport');
  const world = root.querySelector('.ec-world');
  const focusScenes=createHeroFocus({root,viewport,duration:1250});
  const portals = [...root.querySelectorAll('.ec-portal')];
  const detail = root.querySelector('.ec-detail');
  const options = root.querySelector('.ec-options');
  const spaceFilters = root.querySelector('.ec-space-filters');
  const link = root.querySelector('.ec-collection');
  const status = root.querySelector('.ec-status');
  const previous = root.querySelector('.ec-prev');
  const next = root.querySelector('.ec-next');
  const position = root.querySelector('.ec-position');
  const categories = [
    {id:'terrenos',name:'Terrenos',description:'O espaço para o que você imagina.',x:.126,y:.68,zoom:2.05,width:.215,box:[.018,.63,.213,.13],label:[.128,.82],type:'Terreno urbano',choices:[
      {name:'Terrenos urbanos',type:'Terreno urbano',x:.126,y:.68,zoom:2.2},
      {name:'Lotes em condomínio',type:'Lote em condomínio',x:.13,y:.68,zoom:2.2}
    ]},
    {id:'casas',name:'Casas',description:'Arquitetura, conforto e espaço para viver do seu jeito.',x:.425,y:.573,zoom:1.42,width:.37,box:[.237,.37,.355,.41],label:[.425,.86],type:'Casa',choices:[
      {name:'Casas',type:'Casa',x:.425,y:.573,zoom:1.56},
      {name:'Casas em condomínio',type:'Condomínio horizontal',x:.44,y:.56,zoom:1.54}
    ]},
    {id:'apartamentos',name:'Apartamentos',description:'Uma nova perspectiva para a sua rotina.',x:.675,y:.465,zoom:1.6,width:.165,box:[.597,.205,.15,.51],label:[.675,.82],type:'Apartamento',choices:[
      {name:'Apartamentos',type:'Apartamento',x:.675,y:.47,zoom:1.74},
      {name:'Coberturas',type:'Cobertura',x:.676,y:.28,zoom:2.08}
    ]},
    {id:'comercial',name:'Comercial',description:'Um endereço para ideias, encontros e novos negócios.',x:.877,y:.563,zoom:1.72,width:.225,box:[.773,.41,.21,.31],label:[.878,.82],type:'Sala comercial',choices:[
      {name:'Salas comerciais',type:'Sala comercial',x:.878,y:.5,zoom:1.92},
      {name:'Lojas',type:'Loja',x:.875,y:.66,zoom:1.95},
      {name:'Edifícios comerciais',type:'Edifício corporativo',x:.877,y:.56,zoom:1.8}
    ]}
  ];
  const settings = {duration:1250,approach:1.1};
  const clamp = (v,min,max) => Math.max(min,Math.min(max,v));
  const categoryById = id => categories.find(item => item.id === id);
  let chosen = null, choice = null, focusIndex = 1;
  let W = 0, H = 0, BW = 0, BH = 0;
  let camera = {x:0,y:0,scale:1};
  let arrivalTimer = null, portalTimer = null, drag = null;
  let suppressUntil = 0;

  function save() {
    root.dispatchEvent(new CustomEvent('eme-hero-change',{detail:{version:'eme-continuo-1',chosen,choice,focusIndex}}));
  }

  function placeLabels() {
    portals.forEach((portal,index) => {
      const cat = categories[index];
      const [x,y,width,height] = cat.box;
      const left = camera.x + x*BW*camera.scale;
      const top = camera.y + y*BH*camera.scale;
      const labelX = camera.x + cat.label[0]*BW*camera.scale;
      const labelY = camera.y + cat.label[1]*BH*camera.scale;
      const halfLabel = cat.id === 'apartamentos' ? 64 : 48;
      const available = labelX >= halfLabel+10 && labelX <= W-halfLabel-10;
      portal.hidden = chosen !== null || !available;
      portal.style.left = left+'px';
      portal.style.top = top+'px';
      portal.style.width = width*BW*camera.scale+'px';
      portal.style.height = Math.max(height*BH*camera.scale,labelY-top+44)+'px';
      const label = portal.querySelector('.ec-portal-label');
      label.style.left = labelX-left+'px';
      label.style.top = labelY-top+'px';
    });
  }

  function positionSpaceFilters() {
    const cat = categoryById(chosen);
    spaceFilters.hidden = !cat;
    if (!cat || !W) return;
    const mobile = W <= 600;
    const leftEdge = mobile ? 20 : detail.offsetLeft + detail.offsetWidth + 22;
    const availableWidth = Math.max(180,W-leftEdge-20);
    const width = Math.min(cat.id === 'comercial' ? 360 : 290,availableWidth);
    spaceFilters.style.width = width+'px';
    const center = camera.x + cat.x*BW*camera.scale;
    const minBottom = mobile ? detail.offsetTop+detail.offsetHeight+spaceFilters.offsetHeight+34 : spaceFilters.offsetHeight+25;
    const x = clamp(center,leftEdge+width/2,W-width/2-20);
    const y = mobile ? clamp(detail.offsetTop+detail.offsetHeight+65,minBottom,H-330) : Math.max(100,H*.15);
    spaceFilters.style.left = x+'px';
    spaceFilters.style.top = y+'px';
  }

  function moveCamera(immediate = false) {
    root.dataset.focusChoice=String(choice??'');
    focusScenes.selectChoice(choice,!immediate);
    const cat = categoryById(chosen);
    if (!cat) {
      camera = W <= 600
        ? {x:W*.5-categories[focusIndex].x*BW,y:222,scale:1}
        : {x:(W-BW)/2,y:155,scale:1};
    } else {
      const point = choice === null ? cat : cat.choices[choice];
      let scale;
      if (W <= 600) {
        scale = Math.min(1.7,W*.81/(cat.width*BW));
        if (choice !== null) scale *= cat.id === 'apartamentos' && choice === 1 ? 1.16 : 1.06;
      } else scale = point.zoom;
      scale *= settings.approach;
      const targetX = W <= 600 ? .50 : .72;
      const targetY = W <= 600 ? (cat.id === 'apartamentos' && choice === 1 ? .64 : .72) : .57;
      camera = {x:W*targetX-point.x*BW*scale,y:H*targetY-point.y*BH*scale,scale};
    }
    if (immediate) root.classList.add('no-motion');
    world.style.transform = `translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`;
    placeLabels();
    positionSpaceFilters();
    if (immediate) requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('no-motion')));
  }

  function updateNavigation() {
    previous.disabled = focusIndex === 0;
    next.disabled = focusIndex === categories.length-1;
    previous.setAttribute('aria-label',focusIndex > 0 ? 'Explorar '+categories[focusIndex-1].name : 'Início dos espaços');
    next.setAttribute('aria-label',focusIndex < categories.length-1 ? 'Explorar '+categories[focusIndex+1].name : 'Fim dos espaços');
    position.innerHTML = chosen || W <= 600 ? `<em>0${focusIndex+1}</em> / 04` : 'EXPLORAR';
  }

  function updateLink() {
    const cat = categoryById(chosen);
    if (!cat) return;
    const item = choice === null ? cat : cat.choices[choice];
    link.href = 'https://www.emeselect.com/#/colecao?tipo='+encodeURIComponent(item.type);
    link.querySelector('span').textContent = choice === null
      ? (cat.id === 'comercial' ? 'Ver salas comerciais' : 'Explorar '+cat.name.toLowerCase())
      : 'Explorar '+item.name.toLowerCase();
  }

  function renderDetail() {
    const cat = categoryById(chosen);
    if (!cat) { detail.hidden = true; spaceFilters.hidden = true; return; }
    detail.hidden = false;
    detail.querySelector('h2').textContent = cat.name;
    detail.querySelector('.ec-description').textContent = cat.description;
    options.replaceChildren();
    cat.choices.forEach((item,index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ec-option cursor-interaction';
      button.dataset.choice = String(index);
      button.textContent = item.name;
      button.setAttribute('aria-pressed',String((choice ?? 0) === index));
      button.setAttribute('aria-label','Selecionar '+item.name);
      options.appendChild(button);
    });
    updateLink();
  }

  function selectCategory(id,animate = true) {
    const cat = categoryById(id);
    if (!cat) return;
    clearTimeout(arrivalTimer);
    clearTimeout(portalTimer);
    const direction=Math.sign(categories.indexOf(cat)-focusIndex)||1;
    chosen = id;
    focusScenes.select(id,{direction,animated:animate});
    choice = null;
    focusIndex = categories.indexOf(cat);
    root.classList.add('is-exploring');
    if (animate) detail.classList.add('is-arriving');
    renderDetail();
    moveCamera(!animate);
    updateNavigation();
    status.textContent = cat.name+'. '+cat.description;
    if (animate) arrivalTimer = setTimeout(() => detail.classList.remove('is-arriving'),190);
    else detail.classList.remove('is-arriving');
  }

  function overview(animate = true) {
    clearTimeout(arrivalTimer);
    clearTimeout(portalTimer);
    chosen = null;
    focusScenes.overview(animate);
    choice = null;
    root.classList.remove('is-exploring');
    detail.hidden = true;
    moveCamera(!animate);
    const layer = root.querySelector('.ec-portals');
    layer.style.opacity = animate ? '0' : '';
    if (animate) portalTimer = setTimeout(() => { layer.style.opacity = ''; },settings.duration*.6);
    updateNavigation();
    status.textContent = 'Visão geral dos espaços';
  }

  function resize() {
    if (!hero.clientWidth) return;
    if(W===hero.clientWidth && H===hero.clientHeight)return;
    const widthChanged=W!==hero.clientWidth;
    W = hero.clientWidth;
    H = hero.clientHeight;
    BW = W <= 600 ? 900 : Math.min(W*1.045,2172);
    BH = BW/3;
    world.style.width = BW+'px';
    world.style.height = BH+'px';
    moveCamera(widthChanged || !chosen);
    updateNavigation();
  }

  root.addEventListener('click',event => {
    if (Date.now() < suppressUntil) return;
    const portal = event.target.closest('[data-place]');
    if (portal) { selectCategory(portal.dataset.place); root.querySelector('.ec-back').focus({preventScroll:true}); save(); return; }
    if (event.target.closest('.ec-brand,.ec-back')) { overview(); root.querySelector('.ec-brand').focus({preventScroll:true}); save(); return; }
    if (event.target.closest('.ec-prev') && focusIndex > 0) { selectCategory(categories[focusIndex-1].id); save(); return; }
    if (event.target.closest('.ec-next') && focusIndex < categories.length-1) { selectCategory(categories[focusIndex+1].id); save(); return; }
    const option = event.target.closest('[data-choice]');
    if (option && chosen) {
      choice = Number(option.dataset.choice);
      options.querySelectorAll('[data-choice]').forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.choice) === choice)));
      updateLink();
      moveCamera();
      status.textContent = categoryById(chosen).choices[choice].name;
      save();
    }
  });

  root.addEventListener('keydown',event => {
    if (!event.target.closest('.ec-hero,.ec-brand') || root.dataset.page === 'property') return;
    if (event.key === 'Escape' && chosen) { overview(); save(); root.querySelector('.ec-brand').focus({preventScroll:true}); }
    if (event.key === 'ArrowRight' && focusIndex < categories.length-1) { event.preventDefault(); selectCategory(categories[focusIndex+1].id); save(); }
    if (event.key === 'ArrowLeft' && focusIndex > 0) { event.preventDefault(); selectCategory(categories[focusIndex-1].id); save(); }
  });

  hero.addEventListener('pointerdown',event => {
    if (event.target.closest('a,button')) return;
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
  });
  hero.addEventListener('pointermove',event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX-drag.x;
    const dy = event.clientY-drag.y;
    if (!drag.moved && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag = null; return; }
    if (Math.abs(dx) < 9) return;
    if (!drag.moved) { drag.moved = true; hero.setPointerCapture(event.pointerId); root.classList.add('is-dragging'); }
    world.style.transform = `translate(${camera.x+clamp(dx,-90,90)}px,${camera.y}px) scale(${camera.scale})`;
    viewport.style.setProperty('--hero-drag',clamp(dx,-90,90)+'px');
  });
  function finishDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX-drag.x;
    const moved = drag.moved;
    drag = null;
    root.classList.remove('is-dragging');
    viewport.style.setProperty('--hero-drag','0px');
    if (hero.hasPointerCapture(event.pointerId)) hero.releasePointerCapture(event.pointerId);
    if (moved) {
      suppressUntil = Date.now()+200;
      if (dx < -42 && focusIndex < categories.length-1) selectCategory(categories[focusIndex+1].id);
      else if (dx > 42 && focusIndex > 0) selectCategory(categories[focusIndex-1].id);
      else moveCamera();
      save();
    }
  }
  hero.addEventListener('pointerup',finishDrag);
  hero.addEventListener('pointercancel',finishDrag);

  function restore(snapshot) {
    const saved = snapshot?.privateContent?.hero;
    if (!saved || saved.version !== 'eme-continuo-1') return;
    const savedFocus = Number.isInteger(saved.focusIndex) ? clamp(saved.focusIndex,0,3) : 1;
    if ((saved.chosen??null) === chosen && (saved.choice??null) === choice && savedFocus === focusIndex) return;
    focusIndex = savedFocus;
    if (categoryById(saved.chosen)) {
      selectCategory(saved.chosen,false);
      if (Number.isInteger(saved.choice) && categoryById(chosen).choices[saved.choice]) {
        choice = saved.choice;
        renderDetail();
        moveCamera(true);
      }
    } else overview(false);
  }
  resize();
  overview(false);
  restore(experienceState?.widgetState);
  new ResizeObserver(resize).observe(hero);
  root.addEventListener('eme-highlights-layout',() => requestAnimationFrame(positionSpaceFilters));
  window.addEventListener('openai:set_globals',event => { if (event.detail?.globals?.widgetState) restore(event.detail.globals.widgetState); });

})();


(() => {
  const root = document.getElementById('eme-continuo');
  const assets = assetMap;
  const home = root.querySelector('.ec-home');
  const propertyPage = root.querySelector('.ec-property');
  const collection = root.querySelector('.ec-collection-section');
  const featured = root.querySelector('.ec-featured');
  const tabs = root.querySelector('.ec-property-tabs');
  const status = root.querySelector('.ec-status');
  const galleryImage = root.querySelector('.ep-photo');
  const chapters = root.querySelector('.ep-chapters');
  const properties = mapProperties(publishedProperties,assets);
  const byId = id => properties.find(property => property.id === id);
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let view = 'home';
  let featuredId = properties[0]?.id || '';
  let selectedId = properties[0]?.id || '';
  let photoIndex = 0;
  let filterType = null;
  let favoritesOnly = false;
  let savedIds = new Set();
  let heroState = {version:'eme-continuo-1',chosen:null,choice:null,focusIndex:1};
  let lastSignature = '';
  let changingPage = false;
  // State, city and locality are separate so new destinations can share a state or city.
  const siteContent=content||defaultSiteContent();
  const regions=siteContent.regions.filter(r=>r.enabled!==false);
  const regionStates=[...new Map(regions.map(r=>[r.stateId,{id:r.stateId,name:r.stateName}])).values()];
  for(const property of properties){
    property.opportunity=siteContent.opportunityIds===null||siteContent.opportunityIds.includes(property.id);
    const assigned=siteContent.regionAssignments[property.id];
    if(assigned)property.regionId=assigned;
  }
  const regionById = id => regions.find(region=>region.id === id);
  const regionState = region => regionStates.find(state=>state.id === region.stateId);
  const regionTypes = [{id:'',name:'Todos',icon:'layout-grid'},{id:'Casa',name:'Casas',icon:'house'},{id:'Apartamento',name:'Apartamentos',icon:'building-2'},{id:'Terreno',name:'Terrenos',icon:'land-plot'},{id:'Comercial',name:'Comercial',icon:'store'}];
  const regionPage = root.querySelector('.er-region');
  const regionPicker = root.querySelector('.er-nav-panel');
  const collectionToggle = root.querySelector('.er-collection-toggle');
  let regionId = regions[0]?.id||'';
  let regionType = '';
  let propertyOriginRegion = null;
  let propertyOriginCatalog = false;
  let propertyOriginOpportunities = false;
  let opportunitiesReturnScroll = 0;
  let catalogReturnScroll = 0;
  let regionReturnScroll = 0;
  let regionPickerOpener = collectionToggle;
  let homeStateId=regionStates[0]?.id||'rs';
  const catalog=createCatalog({root,properties,assets,regions,getSaved:()=>savedIds,
    onOpen:id=>openProperty(id),
    onSave:id=>{if(savedIds.has(id))savedIds.delete(id);else savedIds.add(id);updateFavorites();save();},
    onChange:()=>save(),onHome:()=>{showHome(null,true);save();}
  });
  const opportunities=createOpportunities({root,properties,assets,regions,getSaved:()=>savedIds,
    onOpen:id=>openProperty(id),
    onSave:id=>{if(savedIds.has(id))savedIds.delete(id);else savedIds.add(id);updateFavorites();status.textContent=savedIds.has(id)?'Imóvel salvo na sua seleção.':'Imóvel removido da sua seleção.';save();},
    onChange:()=>save(),onHome:()=>{showHome(null,true);save();}
  });
  function showOpportunities(query,{returning=false,persist=true}={}) {
    if(assistantMode&&!chatMinimized)minimizeChat(false);
    view='opportunities';root.dataset.page=view;home.hidden=true;propertyPage.hidden=true;regionPage.hidden=true;catalog.page.hidden=true;
    propertyOriginRegion=null;propertyOriginCatalog=false;propertyOriginOpportunities=false;setRegionPicker(false);
    root.querySelector('.ec-header').classList.remove('nav-open');root.querySelector('.ex-menu-toggle').setAttribute('aria-expanded','false');
    opportunities.show(query);
    root.querySelector('.ec-page-scroll').scrollTop=returning?opportunitiesReturnScroll:0;
    if(returning)(opportunities.page.querySelector('.eo-grid [data-opportunity-property="'+selectedId+'"]')||opportunities.page.querySelector('h1')).focus({preventScroll:true});
    else opportunities.page.querySelector('h1').focus({preventScroll:true});
    if(persist)save();
  }
  function showCatalog(query,{returning=false,persist=true}={}) {
    if(assistantMode&&!chatMinimized)minimizeChat(false);
    view='catalog';root.dataset.page=view;home.hidden=true;propertyPage.hidden=true;regionPage.hidden=true;opportunities.page.hidden=true;propertyOriginOpportunities=false;
    propertyOriginRegion=null;propertyOriginCatalog=false;setRegionPicker(false);
    root.querySelector('.ec-header').classList.remove('nav-open');root.querySelector('.ex-menu-toggle').setAttribute('aria-expanded','false');
    catalog.show(query);
    root.querySelector('.ec-page-scroll').scrollTop=returning?catalogReturnScroll:0;
    if(returning)catalog.page.querySelector('[data-catalog-property="'+selectedId+'"]')?.focus({preventScroll:true});
    else catalog.page.querySelector('h1').focus({preventScroll:true});
    if(persist)save();
  }
  function regionIcon(name) { const icon=element('i');icon.dataset.lucide=name;icon.setAttribute('aria-hidden','true');return icon; }
  function regionButton(className,text) { const button=element('button',className+' cursor-interaction',text);button.type='button';return button; }
  function regionalProperties(id=regionId,type=regionType) { return properties.filter(property=>property.regionId===id && (!type || (property.type===type || property.group===type))); }
  function setRegionPicker(open,opener=collectionToggle,focus=false) {
    if(open) regionPickerOpener=opener;
    regionPicker.hidden=!open;
    collectionToggle.setAttribute('aria-expanded',String(open));
    if(open) {
      const current=regionById(regionId);
      regionPicker.querySelectorAll('.er-state-group').forEach(group=>group.open=group.dataset.state===(view==='region'?current.stateId:homeStateId));
      if(focus) regionPicker.querySelector('.er-all-regions').focus({preventScroll:true});
    } else if(focus) regionPickerOpener.focus({preventScroll:true});
  }
  function regionPlaceCard(region) {
    const button=regionButton('er-place-card');button.dataset.regionId=region.id;
    button.setAttribute('aria-label','Explorar '+region.name+', '+regionState(region).name);
    const image=element('img');image.hidden=!assets[region.asset];if(assets[region.asset])image.src=assets[region.asset];image.alt=region.imageAlt;image.loading='lazy';
    const caption=element('span','er-place-caption'),copy=element('span');
    copy.append(element('small','',regionState(region).name),element('strong','',region.name));
    caption.append(copy,regionIcon('arrow-up-right'));button.append(image,caption);return button;
  }
  function renderRegionNavigation() {
    const list=regionPicker.querySelector('.er-state-list');list.replaceChildren();
    regionStates.forEach(state=>{
      const destinations=regions.filter(region=>region.stateId===state.id);
      if(!destinations.length) return;
      const group=element('details','er-state-group');group.dataset.state=state.id;
      const summary=element('summary','cursor-interaction');summary.append(element('span','',state.name),regionIcon('chevron-down'));
      group.append(summary);
      destinations.forEach(region=>{
        const button=regionButton('er-destination');button.dataset.regionId=region.id;
        const image=element('img');image.src=assets[region.asset];image.alt='';
        const label=element('span');label.append(element('strong','',region.name),element('small','',region.id==='vacaria' ? 'Casas e apartamentos' : region.city));
        button.append(image,label,regionIcon('arrow-up-right'));group.append(button);
      });list.append(group);
    });
    root.querySelector('.er-discovery')?.toggleAttribute('hidden',!regions.length);
    root.querySelector('.er-discovery-grid').replaceChildren(...regions.map(regionPlaceCard));
    icons();
  }
  function regionContactUrl() {
    const region=regionById(regionId);
    const type=regionTypes.find(type=>type.id===regionType)?.name || 'Todos os tipos';
    const message=['Olá, equipe EME Select! Gostaria de conversar sobre imóveis nesta região.','',
      'Região: '+region.name,'Cidade: '+region.city,'Estado: '+regionState(region).name,
      'Tipo de imóvel: '+(regionType ? type : 'Ainda estou explorando'),'',
      'Podemos conversar sobre o que procuro e as possibilidades da coleção?'].join('\n');
    return 'https://wa.me/5554991578029?text='+encodeURIComponent(message);
  }
  function renderRegionalProperties() {
    const region=regionById(regionId),all=regionalProperties(regionId,''),items=regionalProperties();
    const filters=regionPage.querySelector('.er-types');filters.replaceChildren();
    regionTypes.forEach(type=>{
      const button=regionButton('');button.dataset.regionType=type.id;button.setAttribute('aria-pressed',String(regionType===type.id));
      const count=type.id ? all.filter(property=>property.type===type.id||property.group===type.id).length : all.length;
      button.append(regionIcon(type.icon),element('span','',type.name),element('small','',String(count)));
      button.setAttribute('aria-label',type.name+' · '+count+' '+(count===1 ? 'imóvel' : 'imóveis'));filters.append(button);
    });
    regionPage.querySelector('.er-result-count').textContent=items.length ? items.length+' '+(items.length===1 ? 'imóvel selecionado' : 'imóveis selecionados') : 'Nenhum imóvel publicado nesta seleção';
    const grid=regionPage.querySelector('.er-property-grid');grid.replaceChildren();grid.style.setProperty('--er-columns',Math.min(3,Math.max(1,items.length)));grid.dataset.count=String(items.length);
    items.forEach((property,index)=>{
      const card=element('article','er-property-card');card.setAttribute('aria-label',property.title);
      const photo=regionButton('er-property-image');photo.dataset.regionProperty=property.id;photo.setAttribute('aria-label','Conhecer '+property.title);
      const image=element('img');image.src=assets[property.cover];image.alt=property.photos[0].caption;image.loading='lazy';photo.append(image);
      if(property.opportunity) { const tag=element('span','er-opportunity-tag');tag.append(regionIcon('gem'),document.createTextNode('Oportunidade'));photo.append(tag); }
      const arrow=element('span','er-card-arrow');arrow.append(regionIcon('arrow-up-right'));photo.append(arrow);
      const title=regionButton('er-property-title',property.title);title.dataset.regionProperty=property.id;
      const bottom=element('div','er-property-bottom'),saveButton=regionButton('er-save');
      saveButton.dataset.regionSave=property.id;saveButton.setAttribute('aria-label',(savedIds.has(property.id)?'Remover dos salvos: ':'Salvar: ')+property.title);saveButton.setAttribute('aria-pressed',String(savedIds.has(property.id)));saveButton.append(regionIcon('heart'));
      bottom.append(renderPrice(element('span'),property),saveButton);
      card.append(photo,element('p','er-property-location',property.type+' · '+property.location.split(' · ')[0]),title,element('p','er-property-facts',property.summary),bottom);grid.append(card);
    });
    const empty=regionPage.querySelector('.er-empty');empty.hidden=items.length>0;
    empty.querySelector('h3').textContent=all.length ? 'O lugar certo merece uma boa escolha.' : 'Conte o que você quer viver aqui.';
    empty.querySelector('.er-empty-copy').textContent=all.length ? 'Ainda não há imóveis deste tipo publicados em '+region.name+'. Explore os outros tipos ou conte à equipe o que você está buscando.' : 'Ainda não há imóveis publicados em '+region.name+'. Conte o que você procura para a equipe conhecer seus planos para esta região.';
    empty.querySelector('.er-reset-type').hidden=!regionType;
    regionPage.querySelectorAll('.er-contact-link').forEach(link=>link.href=regionContactUrl());
    icons();
  }
  function renderRegion() {
    const region=regionById(regionId),state=regionState(region);
    regionPage.setAttribute('aria-label','Imóveis em '+region.name);
    regionPage.dataset.region=region.id;
    regionPage.querySelector('.er-state-link').textContent=state.name;
    regionPage.querySelector('.er-breadcrumb-city').textContent=region.name;
    regionPage.querySelector('.er-state-label').textContent=state.name;
    regionPage.querySelector('#eme-region-title').textContent=region.name+'.';
    regionPage.querySelector('.er-municipality').textContent=region.id==='vacaria' ? 'A coleção EME Select na cidade' : region.context;
    const image=regionPage.querySelector('.er-landscape');image.src=assets[region.asset];image.alt=region.imageAlt;image.loading='eager';
    if(region.id==='praia-de-palmas'&&region.asset){image.srcset='/assets/experience/palmas-1200.webp 1200w, /assets/experience/palmas-2400.webp 2400w';image.sizes='(max-width:760px) 100vw, 65vw';}else{image.removeAttribute('srcset');image.removeAttribute('sizes');}
    regionPage.querySelector('.er-landmark').hidden=region.id!=='vacaria'||!region.asset;
    regionPage.querySelector('.er-hero-intro p').textContent=region.intro;
    regionPage.querySelector('#eme-region-selection-title').textContent=region.collectionTitle;
    regionPage.querySelector('.er-postcard-label').textContent=region.postcard;
    const credit=regionPage.querySelector('.er-photo-credits p');credit.replaceChildren();
    const source=element('a','',region.credit);source.href=region.source;source.target='_blank';source.rel='noopener noreferrer';
    const license=element('a','',region.license);license.href=region.licenseUrl;license.target='_blank';license.rel='noopener noreferrer';
    if(region.id==='vacaria'){credit.textContent='Composição visual com IA a partir da referência enviada, com recorte da catedral e tratamento do fundo para esta apresentação.';}else credit.append(source,document.createTextNode(' · '),license,document.createTextNode('. Fotografia de acervo, recortada e otimizada para esta apresentação.'));
    regionPage.querySelector('.er-photo-credits').open=false;regionPage.querySelector('.er-photo-credits').hidden=!region.asset;
    regionPage.querySelector('.er-contact-copy').textContent='Conte o que você procura em '+region.name+'. Nossa equipe ajuda a olhar os detalhes e entender as possibilidades para a sua escolha.';
    regionPage.querySelector('.er-other-regions').replaceChildren(...regions.filter(item=>item.id!==regionId).map(regionPlaceCard));
    regionPicker.querySelectorAll('[data-region-id]').forEach(button=>{if(button.dataset.regionId===regionId && view==='region')button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    renderRegionalProperties();
  }
  function showRegion(id,{reset=true,returning=false,persist=true}={}) {
    if(!regionById(id))return;
    if(assistantMode && !chatMinimized)minimizeChat(false);
    if(reset || id!==regionId)regionType='';
    homeStateId=regionById(id).stateId;
    opportunities.page.hidden=true;propertyOriginOpportunities=false;
    catalog.page.hidden=true;propertyOriginCatalog=false;
    regionId=id;view='region';propertyOriginRegion=null;root.dataset.page='region';home.hidden=true;propertyPage.hidden=true;regionPage.hidden=false;
    root.querySelector('.ec-header').classList.remove('nav-open');root.querySelector('.ex-menu-toggle').setAttribute('aria-expanded','false');
    setRegionPicker(false);renderRegion();
    const scroll=root.querySelector('.ec-page-scroll');scroll.scrollTop=returning ? regionReturnScroll : 0;
    if(returning)regionPage.querySelector('[data-region-property="'+selectedId+'"]')?.focus({preventScroll:true});
    else regionPage.querySelector('.er-explore').focus({preventScroll:true});
    if(persist)save();
  }
  root.addEventListener('click',event=>{
    const target=event.target;
    const picker=target.closest('[data-region-picker]');
    if(picker){setRegionPicker(regionPicker.hidden,picker,true);return;}
    if(target.closest('.er-nav-close')){setRegionPicker(false,collectionToggle,true);return;}
    const destination=target.closest('[data-region-id]');
    if(destination){showRegion(destination.dataset.regionId);return;}
    if(target.closest('[data-region-results]')){scrollToElement(regionPage.querySelector('.er-selection'));return;}
    const type=target.closest('[data-region-type]');
    if(type){regionType=type.dataset.regionType;renderRegionalProperties();regionPage.querySelector('[data-region-type="'+regionType+'"]').focus({preventScroll:true});save();return;}
    if(target.closest('.er-reset-type')){regionType='';renderRegionalProperties();save();return;}
    const property=target.closest('[data-region-property]');
    if(property){regionReturnScroll=root.querySelector('.ec-page-scroll').scrollTop;openProperty(property.dataset.regionProperty,true,regionId);return;}
    const favorite=target.closest('[data-region-save]');
    if(favorite){const id=favorite.dataset.regionSave;if(savedIds.has(id))savedIds.delete(id);else savedIds.add(id);updateFavorites();renderRegionalProperties();regionPage.querySelector('[data-region-save="'+id+'"]').focus({preventScroll:true});status.textContent=savedIds.has(id)?'Imóvel salvo na sua seleção.':'Imóvel removido da sua seleção.';save();return;}
    if(!target.closest('.er-nav-panel'))setRegionPicker(false);
  });
  root.addEventListener('keydown',event=>{if(event.key==='Escape' && !regionPicker.hidden){event.stopPropagation();setRegionPicker(false,collectionToggle,true);}});
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('.er-nav-panel,[data-region-picker]'))setRegionPicker(false);});


  root.querySelectorAll('[data-asset]').forEach(img => { img.src = assets[img.dataset.asset]; });

  function stateSnapshot() {
    return {version:'eme-experience-4',view,homeStateId,regionId,regionType,propertyOriginRegion,regionReturnScroll,featuredId,selectedId,photoIndex,filterType,favoritesOnly,savedIds:[...savedIds],hero:heroState,assistantMode,chatMinimized,intent,invitationDismissed};
  }
  function save() {
    const state = stateSnapshot();
    syncRoute();
    lastSignature = JSON.stringify(state);
    if (!experienceState?.setWidgetState) return;
    const property = byId(selectedId);
    experienceState.setWidgetState({
      modelContent:{proposta:'EME Select — coleção por região',regiao:view==='region' || propertyOriginRegion ? regionById(regionId).name : null,estado:view==='region' ? regionState(regionById(regionId)).name : null,pagina:assistantMode && !chatMinimized ? 'Atendimento: '+assistantMode : view === 'property' ? 'Página do imóvel' : view === 'region' ? 'Página da região' : 'Página inicial',chat:assistantMode ? chatMinimized ? 'Minimizado' : 'Aberto' : 'Fechado',imovel:view === 'property' ? property.title : view === 'home' ? byId(featuredId)?.title : null,ambiente:view === 'property' ? property.photos[photoIndex]?.name : null,categoria:(view === 'region' ? regionType : filterType) || 'Coleção completa',salvos:[...savedIds].map(id=>byId(id).title),busca:criteriaText()},
      privateContent:state
    }).catch(() => {});
  }
  function activeProperties() {
    return properties.filter(property => property.opportunity && (!filterType || property.type === filterType) && (!favoritesOnly || savedIds.has(property.id)));
  }
  function animateIn(element,direction = 1) {
    if (!reducedMotion() && element.animate) element.animate([{opacity:.25,transform:`translateX(${direction*26}px)`},{opacity:1,transform:'translateX(0)'}],{duration:470,easing:'cubic-bezier(.22,.75,.18,1)'});
  }
  function scrollToElement(element) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!element) return;
      const page = root.querySelector('.ec-page-scroll');
      const headerHeight = root.querySelector('.ec-header').offsetHeight;
      const top = element === root ? 0 : Math.max(0,element.getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop - headerHeight - 16);
      page.scrollTo({top,behavior:'instant'});
    }));
  }
  function updateFavorites() {
    const count = root.querySelector('.ec-saved-count');
    count.hidden = savedIds.size === 0;
    count.textContent = savedIds.size;
    root.querySelector('.ec-favorites').setAttribute('aria-label',savedIds.size ? `Ver ${savedIds.size} ${savedIds.size === 1 ? 'imóvel salvo' : 'imóveis salvos'}` : 'Ver imóveis salvos');
    const isSaved = savedIds.has(selectedId);
    const button = root.querySelector('.ep-save');
    button.setAttribute('aria-pressed',String(isSaved));
    button.querySelector('span').textContent = isSaved ? 'Imóvel salvo' : 'Salvar imóvel';
  }

  function renderCollection(animate = false,direction = 1) {
    const visible = activeProperties();
    if (visible.length && !visible.some(property=>property.id === featuredId)) featuredId = visible[0].id;
    const index = visible.findIndex(property=>property.id === featuredId);
    const count = visible.length;
    root.querySelector('.ec-collection-count').textContent = `${String(count).padStart(2,'0')} ${count === 1 ? 'imóvel' : 'imóveis'} ${favoritesOnly ? 'na sua seleção' : filterType ? '· '+filterType : 'para conhecer'}`;
    root.querySelector('.ec-reset-collection').hidden = !filterType && !favoritesOnly;
    root.querySelector('.ec-featured-wrap').hidden = count === 0;
    root.querySelector('.ec-empty').hidden = count !== 0;
    if (!count) {
      root.querySelector('.ec-empty-message').textContent = favoritesOnly ? 'Os imóveis que você salvar ficam reunidos aqui para continuar sua escolha.' : 'Ainda não há um imóvel desta categoria na seleção apresentada. Conte à equipe o que você procura.';
      const emptyAction = root.querySelector('.ec-empty .ec-action');
      emptyAction.dataset.section = favoritesOnly ? 'collection' : 'contact';
      emptyAction.firstChild.textContent = favoritesOnly ? 'Explorar a coleção ' : 'Conte o que procura ';
      return;
    }
    const property = visible[index];
    const image = root.querySelector('.ec-featured-img');
    image.src = assets[property.cover];
    image.alt = property.photos[0].caption;
    root.querySelector('.ec-featured-photo').setAttribute('aria-label','Explorar '+property.title);
    root.querySelector('.ec-featured-location').textContent = property.location;
    root.querySelector('.ec-featured-title').textContent = property.title;
    root.querySelector('.ec-featured-lead').textContent = property.lead;
    root.querySelector('.ec-featured-facts').textContent = property.summary;
    renderPrice(root.querySelector('.ec-featured-price'),property);
    root.querySelector('.ec-open-property').setAttribute('aria-label','Conhecer '+property.title);
    tabs.replaceChildren();
    visible.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ec-property-tab cursor-interaction';
      button.dataset.propertySelect = item.id;
      button.setAttribute('aria-pressed',String(item.id === featuredId));
      button.setAttribute('aria-label','Selecionar '+item.title);
      const thumb = document.createElement('img');
      thumb.src = assets[item.cover];
      thumb.alt = '';
      const label = document.createElement('span');
      const place=item.title.match(/\b(loteamento\s+.+|jardim\s+.+)$/i)?.[0];
      label.textContent = place ? place[0].toLocaleUpperCase('pt-BR')+place.slice(1) : item.short.split('|')[0].trim();
      const kind = document.createElement('small');
      kind.textContent = item.type;
      label.appendChild(kind);
      button.append(thumb,label);
      tabs.appendChild(button);
    });
    root.querySelector('.ec-property-position').textContent = `${String(index+1).padStart(2,'0')} / ${String(count).padStart(2,'0')}`;
    root.querySelector('.ec-property-prev').disabled = index <= 0;
    root.querySelector('.ec-property-next').disabled = index >= count-1;
    root.querySelector('.ec-property-selector').hidden = count === 1;
    if (animate) animateIn(featured,direction);
  }

  function selectFeatured(id,animate = true) {
    const visible = activeProperties();
    if (!visible.some(property=>property.id === id)) return;
    const previousIndex = visible.findIndex(property=>property.id === featuredId);
    featuredId = id;
    const index = visible.findIndex(property=>property.id === id);
    renderCollection(animate,index >= previousIndex ? 1 : -1);
    status.textContent = byId(id).title+'. '+byId(id).price;
  }

  function showHome(section = null,resetFilter = false,scroll = true) {
    opportunities.page.hidden=true;propertyOriginOpportunities=false;
    catalog.page.hidden=true;propertyOriginCatalog=false;
    regionPage.hidden=true;propertyOriginRegion=null;setRegionPicker(false);
    if (assistantMode && !chatMinimized) minimizeChat(false);
    root.querySelector('.ec-header').classList.remove('nav-open');
    root.querySelector('.ex-menu-toggle').setAttribute('aria-expanded','false');
    view = 'home';
    root.dataset.page = 'home';
    propertyPage.hidden = true;
    home.hidden = false;
    if (resetFilter) { filterType = null; favoritesOnly = false; }
    renderCollection();
    if (scroll) scrollToElement(section ? root.querySelector('#eme-full-'+section) : root);
  }

  const photoDimensions = Object.fromEntries(properties.flatMap(p=>p.photos.map(photo=>[photo.asset,[photo.width,photo.height]])));
  function setPhoto(index,animate = true) {
    const property = byId(selectedId);
    const direction = index >= photoIndex ? 1 : -1;
    photoIndex = Math.max(0,Math.min(property.photos.length-1,index));
    const photo = property.photos[photoIndex];
    const gallery = root.querySelector('.ep-gallery');
    const [width,height] = photoDimensions[photo.asset];
    gallery.dataset.orientation = height > width ? 'portrait' : 'landscape';
    gallery.style.setProperty('--ep-media-width',Math.min(760,440*width/height)+'px');
    gallery.style.setProperty('--ep-ratio',width+'/'+height);
    const sceneCopy = root.querySelector('.ep-scene-copy');
    sceneCopy.hidden = false;
    sceneCopy.querySelector('h2').textContent = photo.name;
    sceneCopy.querySelector('p').textContent = photo.caption;
    galleryImage.width = width;
    galleryImage.height = height;
    galleryImage.src = assets[photo.asset];
    galleryImage.alt = photo.caption;
    root.querySelector('.ep-photo-count').textContent = `${String(photoIndex+1).padStart(2,'0')} / ${String(property.photos.length).padStart(2,'0')}`;
    root.querySelectorAll('.ep-prev,.ex-photo-prev').forEach(button=>button.disabled = photoIndex === 0);
    root.querySelectorAll('.ep-next,.ex-photo-next').forEach(button=>button.disabled = photoIndex === property.photos.length-1);
    root.querySelectorAll('.ex-photo-edge').forEach(button=>button.hidden = property.photos.length === 1);
    chapters.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.chapter) === photoIndex)));
    root.querySelector('.ep-gallery-controls > div').hidden = false;
    root.querySelectorAll('.ep-prev,.ep-next').forEach(button=>button.hidden = property.photos.length === 1);
    if (animate) animateIn(galleryImage,direction);
    status.textContent = property.title+'. '+photo.name;
  }

  function renderProperty() {
    const back=root.querySelector('.ep-back');back.replaceChildren(element('span','','←'),document.createTextNode(propertyOriginOpportunities ? ' Voltar às oportunidades' : propertyOriginRegion ? ' Voltar a '+regionById(propertyOriginRegion).name : ' Voltar à coleção'));
    const property = byId(selectedId);
    propertyPage.setAttribute('aria-label',property.title);
    root.querySelector('.ep-finance').hidden = property.operation === 'alugar';
    root.querySelector('.ep-price').previousElementSibling.textContent = property.operation === 'alugar' ? 'Para alugar' : 'À venda';
    root.querySelector('.ep-title').textContent = property.title;
    root.querySelector('.ep-location').textContent = property.location;
    root.querySelector('.ep-summary').textContent = property.summary;
    renderPrice(root.querySelector('.ep-price'),property);
    const facts = root.querySelector('.ep-facts');
    facts.replaceChildren();
    property.facts.forEach(([name,value])=>{
      const pair = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = name;
      dd.textContent = value;
      pair.append(dt,dd);
      facts.appendChild(pair);
    });
    const storyTitle = root.querySelector('.ep-story-title');
    const pause = property.storyTitle.indexOf('. ');
    storyTitle.textContent = pause < 0 ? property.storyTitle : property.storyTitle.slice(0,pause+1);
    if(pause >= 0) {
      const continuation = document.createElement('span');
      continuation.textContent = property.storyTitle.slice(pause+2);
      storyTitle.appendChild(continuation);
    }
    const highlights = root.querySelector('.ep-story-copy');
    highlights.replaceChildren();
    property.highlights.forEach(([title,text])=>{
      const wrap = document.createElement('div');
      const heading = document.createElement('h3');
      const body = document.createElement('p');
      heading.textContent = title;
      body.textContent = text;
      wrap.append(heading,body);
      highlights.appendChild(wrap);
    });
    const dossier = root.querySelector('.ep-accordions');
    dossier.replaceChildren();
    property.dossier.forEach(([title,...paragraphs])=>{
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.className = 'cursor-interaction';
      summary.textContent = title;
      const body = document.createElement('div');
      paragraphs.forEach(text=>{const p = document.createElement('p');p.textContent=text;body.appendChild(p);});
      details.append(summary,body);
      dossier.appendChild(details);
    });
    chapters.replaceChildren();
    chapters.style.setProperty('--ep-photo-total',property.photos.length);
    property.photos.forEach((photo,index)=>{
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ep-chapter cursor-interaction';
      button.dataset.chapter = String(index);
      const thumb = document.createElement('img'); thumb.src = assets[photo.asset]; thumb.alt = '';
      const name = document.createElement('span'); name.textContent = photo.name;
      button.append(thumb,name);
      button.setAttribute('aria-pressed',String(index === photoIndex));
      button.setAttribute('aria-label',`Ver foto ${index+1}: ${photo.name}`);
      chapters.appendChild(button);
    });
    root.querySelector('.ep-chapter-row').hidden = property.photos.length === 1;
    root.querySelector('.ep-contact').href = 'https://wa.me/5554991578029?text='+encodeURIComponent('Olá! Gostaria de combinar uma visita ao imóvel '+property.full+'.');
    root.querySelector('.ep-plant').href = 'https://wa.me/5554991578029?text='+encodeURIComponent('Olá! Gostaria da planta e das medidas do imóvel '+property.full+'.');
    const nextProperty = properties[(properties.indexOf(property)+1)%properties.length];
    root.querySelector('.ep-next-title').textContent = nextProperty.title;
    root.querySelector('.ep-next-photo').src = assets[nextProperty.cover];
    root.querySelector('.ep-next-photo').alt = nextProperty.photos[0].caption;
    root.querySelector('.ep-next-open').dataset.nextProperty = nextProperty.id;
    root.querySelector('.ep-next-image').dataset.nextProperty = nextProperty.id;
    root.querySelector('.ep-next-image').setAttribute('aria-label','Conhecer '+nextProperty.title);
    setPhoto(photoIndex,false);
    updateFavorites();
  }

  function openProperty(id,animate = true,originRegion = null) {
    if (!byId(id) || changingPage) return;
    if(animate)root.dispatchEvent(new CustomEvent('eme-analytics-property',{detail:{id}}));
    if(view==='opportunities'){propertyOriginOpportunities=true;opportunitiesReturnScroll=root.querySelector('.ec-page-scroll').scrollTop;}else if(view!=='property')propertyOriginOpportunities=false;
    if(view==='catalog'){propertyOriginCatalog=true;catalogReturnScroll=root.querySelector('.ec-page-scroll').scrollTop;}else if(view!=='property')propertyOriginCatalog=false;
    if (assistantMode && !chatMinimized) minimizeChat(false);
    propertyOriginRegion=originRegion && byId(id).regionId===originRegion ? originRegion : null;
    setRegionPicker(false);
    selectedId = id;
    photoIndex = 0;
    const update = () => {
      catalog.page.hidden=true;regionPage.hidden=true;opportunities.page.hidden=true;
      view = 'property';
      root.dataset.page = 'property';
      home.hidden = true;
      propertyPage.hidden = false;
      renderProperty();
        root.querySelector('.ec-page-scroll').scrollTop = 0;
      root.querySelector('.ep-back').focus({preventScroll:true});
      save();
    };
    if (animate && !reducedMotion() && document.startViewTransition) {
      changingPage = true;
      try {
        const transition = document.startViewTransition(update);
        transition.finished.catch(()=>{}).finally(()=>{ changingPage = false; });
      } catch (_) { changingPage = false; update(); }
    } else update();
  }

  root.addEventListener('eme-hero-change',event=>{ heroState = event.detail; renderHeroHighlights(); save(); });
  root.addEventListener('click',event=>{
    const target = event.target;
    const sectionButton = target.closest('[data-section]');
    if (sectionButton) {
      if(sectionButton.tagName==='A'&&(event.ctrlKey||event.metaKey||event.shiftKey||event.button!==0))return;
      event.preventDefault();
      if(sectionButton.dataset.section==='collection'){showCatalog('');return;}
      if(sectionButton.dataset.section==='opportunities'){showOpportunities('');return;}
      showHome(sectionButton.dataset.section);save();return;
    }
    if (target.closest('.ec-brand')) { showHome(null,true); save(); return; }
    const categoryLink = target.closest('.ec-collection');
    if (categoryLink) {
      event.preventDefault();
      const hash = new URL(categoryLink.href).hash;
      const query = hash.includes('?') ? hash.split('?')[1] : '';
      showCatalog(query);
      return;
    }
    if (target.closest('.ec-reset-collection')) { showHome('collection',true); save(); return; }
    if (target.closest('.ec-favorites')) { showCatalog({saved:true});return; }
    const selector = target.closest('[data-property-select]');
    if (selector) {
      selectFeatured(selector.dataset.propertySelect);
      tabs.querySelector(`[data-property-select="${featuredId}"]`).focus({preventScroll:true});
      save();return;
    }
    if (target.closest('.ec-property-prev,.ec-property-next')) {
      const visible = activeProperties();
      const direction = target.closest('.ec-property-next') ? 1 : -1;
      const index = visible.findIndex(property=>property.id === featuredId)+direction;
      if (visible[index]) { selectFeatured(visible[index].id); save(); }
      return;
    }
    if (target.closest('.ec-featured-photo,.ec-open-property')) { openProperty(featuredId); return; }
    if (target.closest('.ep-back')) { if(propertyOriginOpportunities){showOpportunities(undefined,{returning:true});}else if(propertyOriginRegion){showRegion(propertyOriginRegion,{reset:false,returning:true});}else{showCatalog(propertyOriginCatalog?undefined:'',{returning:propertyOriginCatalog});} return; }
    const chapter = target.closest('[data-chapter]');
    if (chapter) { setPhoto(Number(chapter.dataset.chapter)); scrollToElement(root.querySelector('.ep-gallery')); save(); return; }
    if (target.closest('.ep-prev,.ex-photo-prev')) { setPhoto(photoIndex-1); save(); return; }
    if (target.closest('.ep-next,.ex-photo-next')) { setPhoto(photoIndex+1); save(); return; }

    if (target.closest('.ep-save')) { if(savedIds.has(selectedId)) savedIds.delete(selectedId); else savedIds.add(selectedId); updateFavorites(); status.textContent = savedIds.has(selectedId) ? 'Imóvel salvo na sua seleção.' : 'Imóvel removido da sua seleção.'; save(); return; }
    if (target.closest('.ep-visit-button')) { openLead('visit'); return; }
    const nextProperty = target.closest('[data-next-property]');
    if (nextProperty) openProperty(nextProperty.dataset.nextProperty,true,propertyOriginRegion);
  });

  root.querySelector('.ep-tour').addEventListener('keydown',event=>{
    if (event.key === 'ArrowRight') { event.preventDefault(); setPhoto(photoIndex+1); save(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); setPhoto(photoIndex-1); save(); }
  });

  function restore(snapshot) {
    const incoming = snapshot?.privateContent;
    if (!incoming || incoming.version !== 'eme-experience-4' || JSON.stringify(incoming) === lastSignature) return;
    featuredId = byId(incoming.featuredId) ? incoming.featuredId : (properties[0]?.id || '');
    selectedId = byId(incoming.selectedId) ? incoming.selectedId : (properties[0]?.id || '');
    photoIndex = Number.isInteger(incoming.photoIndex) ? Math.max(0,Math.min((byId(selectedId)?.photos.length || 1)-1,incoming.photoIndex)) : 0;
    filterType = typeof incoming.filterType === 'string' ? incoming.filterType : null;
    favoritesOnly = Boolean(incoming.favoritesOnly);
    savedIds = new Set((Array.isArray(incoming.savedIds) ? incoming.savedIds : []).filter(id=>byId(id)));
    if (incoming.hero?.version === 'eme-continuo-1') heroState = incoming.hero;
    homeStateId=regionStates.some(state=>state.id===incoming.homeStateId) ? incoming.homeStateId : regionStates[0]?.id||'';
    regionId=regionById(incoming.regionId) ? incoming.regionId : regions[0]?.id||'';
    regionType=regionTypes.some(type=>type.id===incoming.regionType) ? incoming.regionType : '';
    propertyOriginRegion=regionById(incoming.propertyOriginRegion) && byId(selectedId)?.regionId===incoming.propertyOriginRegion ? incoming.propertyOriginRegion : null;
    regionReturnScroll=Number.isFinite(incoming.regionReturnScroll) ? Math.max(0,incoming.regionReturnScroll) : 0;
    view = incoming.view === 'property' && byId(selectedId) ? 'property' : incoming.view === 'region' && regions.length ? 'region' : 'home';
    regionPage.hidden=view!=='region';
    if(view==='region')renderRegion();
    root.dataset.page = view;
    home.hidden = view !== 'home';
    propertyPage.hidden = view !== 'property';
    renderCollection();
    if (view === 'property') renderProperty();
    updateFavorites();
    intent = incoming.intent && typeof incoming.intent === 'object' ? incoming.intent : {};
    invitationDismissed = Boolean(incoming.invitationDismissed);
    if (['chat','search','voice'].includes(incoming.assistantMode)) {
      openAssistant(incoming.assistantMode,false);
      renderResults([],criteriaText());
      conversation = [{from:'EME',text:criteriaText() ? 'Sua busca: '+criteriaText()+'. Como posso ajudar a continuar?' : welcomeText()}];renderMessages();
      if (!criteriaText()) root.querySelector('.ex-results').hidden = true;
      if (incoming.chatMinimized) minimizeChat(false);
    } else {assistantMode=null;chatMinimized=false;assistant.hidden=true;minimizedChat.hidden=true;root.querySelector('.ex-chat-launch').setAttribute('aria-expanded','false');}
    renderHeroHighlights();
    lastSignature = JSON.stringify(stateSnapshot());
  }

  function calculateFinancing(price,down,annualRate,months,system) {
    const principal = Math.max(0,price-down);
    const monthlyRate = Math.expm1(Math.log1p(annualRate/100)/12);
    let first = 0, last = 0, interest = 0;
    if (principal > 0) {
      if (system === 'sac') {
        const amortization = principal/months;
        first = amortization+principal*monthlyRate;
        last = amortization*(1+monthlyRate);
        interest = principal*monthlyRate*(months+1)/2;
      } else {
        first = monthlyRate === 0 ? principal/months : principal*monthlyRate/(-Math.expm1(-months*Math.log1p(monthlyRate)));
        last = first;
        interest = Math.max(0,first*months-principal);
      }
    }
    return {principal,monthlyRate,first,last,interest,total:down+principal+interest};
  }
  const financeDialog = root.querySelector('.ef-dialog');
  const financeForm = root.querySelector('.ef-form');
  const financeContact = root.querySelector('.ef-contact');
  const financeWhatsApp = root.querySelector('.ef-whatsapp');
  const financeFields = Object.fromEntries(['price','down','rate','months','system'].map(name=>[name,financeForm.elements.namedItem(name)]));
  const financingDrafts = new Map();
  const moneyFormat = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const amountFormat = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  let financeTimer;
  let financeScrollOverflow = '';
  function readAmount(value) {
    const trimmed = value.trim();
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{0,2})?$/.test(trimmed)) return NaN;
    return Number(trimmed.replaceAll('.','').replace(',','.'));
  }
  function rememberFinance() {
    financingDrafts.set(selectedId,Object.fromEntries(Object.entries(financeFields).map(([key,field])=>[key,field.value])));
  }
  function clearFinanceContact() {
    financeWhatsApp.removeAttribute('href');
    financeWhatsApp.setAttribute('aria-disabled','true');
  }
  function financeMessage(property,price,down,rate,months,system,calculation) {
    const annualRate = String(rate).replace('.',',');
    const lines = [
      'Olá, equipe EME Select! Fiz uma simulação de financiamento e gostaria de conversar sobre este imóvel:',
      '',
      'Imóvel: '+property.full,
      'Localização: '+property.location,
      'Valor do imóvel considerado: '+moneyFormat.format(price),
      '',
      'Entrada: '+moneyFormat.format(down),
      'Valor financiado: '+moneyFormat.format(calculation.principal),
      'Juros efetivos: '+annualRate+'% ao ano',
      'Prazo: '+months+' '+(months===1?'mês':'meses'),
      'Sistema: '+(system==='sac'?'SAC — parcelas decrescentes':'Price — parcelas iguais'),
      (system==='sac'?'Primeira parcela estimada: ':'Parcela mensal estimada: ')+moneyFormat.format(calculation.first)
    ];
    if(system==='sac'&&calculation.principal>0) lines.push('Última parcela estimada: '+moneyFormat.format(calculation.last));
    if(calculation.principal===0) lines.push('A entrada cobre o imóvel; não há saldo a financiar.');
    lines.push('Link: '+location.origin+'/imovel/'+property.id,'','Simulação estimativa, sem seguros, tarifas, impostos ou correção monetária. Gostaria de entender as condições e os próximos passos.');
    return lines.join('\n');
  }
  function updateFinancing() {
    clearFinanceContact();
    const price = readAmount(financeFields.price.value);
    const down = readAmount(financeFields.down.value);
    const rate = financeFields.rate.valueAsNumber;
    const months = financeFields.months.valueAsNumber;
    const checks = [
      ['price',Number.isFinite(price)&&price>0&&price<=1e12,'Informe um valor de imóvel maior que zero, em reais.'],
      ['down',Number.isFinite(down)&&down>=0&&down<=price,'A entrada deve ser entre zero e o valor do imóvel.'],
      ['rate',Number.isFinite(rate)&&rate>=0&&rate<=100,'Informe os juros efetivos anuais entre 0% e 100%.'],
      ['months',Number.isInteger(months)&&months>=1&&months<=600,'Escolha um prazo inteiro de 1 a 600 meses.']
    ];
    checks.forEach(([key,valid])=>financeFields[key].setAttribute('aria-invalid',String(!valid)));
    const failed = checks.find(([,valid])=>!valid);
    const error = root.querySelector('.ef-error');
    const result = root.querySelector('.ef-result');
    error.hidden = !failed;
    result.hidden = Boolean(failed);
    financeContact.hidden = Boolean(failed);
    if (failed) { error.textContent = failed[2]; return false; }
    error.textContent = '';
    const system = financeFields.system.value;
    const calculation = calculateFinancing(price,down,rate,months,system);
    root.querySelector('.ef-payment-label').textContent = calculation.principal === 0 ? 'Entrada cobre o imóvel' : system === 'sac' ? 'Primeira parcela estimada' : 'Parcela mensal estimada';
    root.querySelector('.ef-payment').textContent = moneyFormat.format(calculation.first);
    root.querySelector('.ef-term').textContent = calculation.principal === 0 ? 'Sem valor a financiar' : months+' '+(months===1?'parcela mensal':'parcelas mensais')+(months%12===0?' · '+months/12+' '+(months===12?'ano':'anos'):'');
    root.querySelector('.ef-last-row').hidden = system !== 'sac'||calculation.principal === 0;
    root.querySelector('.ef-last').textContent = moneyFormat.format(calculation.last);
    root.querySelector('.ef-principal').textContent = moneyFormat.format(calculation.principal);
    root.querySelector('.ef-interest').textContent = moneyFormat.format(calculation.interest);
    root.querySelector('.ef-total').textContent = moneyFormat.format(calculation.total);
    root.querySelector('.ef-monthly-rate').textContent = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4}).format(calculation.monthlyRate*100)+'%';
    financeWhatsApp.href = 'https://wa.me/5554991578029?text='+encodeURIComponent(financeMessage(byId(selectedId),price,down,rate,months,system,calculation));
    financeWhatsApp.setAttribute('aria-disabled','false');
    return true;
  }
  function openFinancing() {
    if (financeDialog.open) return;
    const property = byId(selectedId);
    const amount = searchFacts[selectedId].price;
    const draft = financingDrafts.get(selectedId)||{price:amountFormat.format(amount),down:amountFormat.format(amount*.2),rate:'10',months:'360',system:'price'};
    Object.entries(financeFields).forEach(([key,field])=>field.value=draft[key]);
    root.querySelector('.ef-property').textContent = property.title;
    updateFinancing();
    financeScrollOverflow = root.querySelector('.ec-page-scroll').style.overflowY;
    root.querySelector('.ec-page-scroll').style.overflowY = 'hidden';
    financeDialog.showModal();
  }
  financeForm.addEventListener('input',()=>{
    clearFinanceContact();
    rememberFinance();
    clearTimeout(financeTimer);
    financeTimer = setTimeout(updateFinancing,160);
  });
  financeFields.system.addEventListener('change',()=>{rememberFinance();updateFinancing();});
  ['price','down'].forEach(key=>financeFields[key].addEventListener('blur',()=>{
    const value = readAmount(financeFields[key].value);
    if (Number.isFinite(value)) financeFields[key].value = amountFormat.format(value);
    rememberFinance();updateFinancing();
  }));
  financeForm.addEventListener('submit',event=>{event.preventDefault();clearTimeout(financeTimer);updateFinancing();});
  financeWhatsApp.addEventListener('click',event=>{
    clearTimeout(financeTimer);
    if(!updateFinancing()) {
      event.preventDefault();
      financeForm.querySelector('[aria-invalid="true"]')?.focus();
    }
  });
  root.querySelector('.ep-finance').addEventListener('click',openFinancing);
  root.querySelector('.ef-close').addEventListener('click',()=>financeDialog.close());
  financeDialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  financeDialog.addEventListener('click',event=>{
    if(event.target!==financeDialog)return;
    const rect = financeDialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)financeDialog.close();
  });
  financeDialog.addEventListener('close',()=>{
    rememberFinance();
    clearTimeout(financeTimer);
    root.querySelector('.ec-page-scroll').style.overflowY = financeScrollOverflow;
    root.querySelector('.ep-finance').focus({preventScroll:true});
  });

  const assistant = root.querySelector('.ex-assistant');
  const minimizedChat = root.querySelector('.ex-chat-minimized');
  const conversationPane = root.querySelector('.ex-assistant-layout');
  const voicePane = root.querySelector('.ex-voice');
  const leadPane = root.querySelector('.ex-lead');
  const headerSearch = root.querySelector('.ex-search input');
  const composer = root.querySelector('.ex-composer');
  const messageList = root.querySelector('.ex-messages');
  const resultList = root.querySelector('.ex-result-list');
  const leadForm = root.querySelector('.ex-lead-form');
  let assistantMode = null;
  let intent = {};
  let currentMatches = [...properties];
  let leadKind = 'selection';
  let leadPropertyId = null;
  let conversation = [];
  let invitationDismissed = false;
  let chatOpener = root.querySelector('.ex-chat-launch');
  let chatMinimized = false;
  const chatTransport=createChatTransport();
  let chatBusy=false,chatVersion=0,lastChatRequest=null;
  const searchFacts = Object.fromEntries(properties.map(p=>[p.id,p.searchFacts]));
  function element(tag,className,text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function icons() { if (lucide) lucide.createIcons({attrs:{width:17,height:17}}); }
  function propertyButton(property,small = false,reason = '') {
    const button = element('button',small ? 'ex-mini cursor-interaction' : 'ex-result-card cursor-interaction');
    button.type = 'button'; button.dataset.openId = property.id;
    button.setAttribute('aria-label','Ver '+property.title+' · '+property.price);
    const image = element('img'); image.src = assets[property.cover]; image.alt = '';
    const copy = element('span');
    copy.append(element(small ? 'span' : 'strong',small ? 'ex-mini-name' : '',property.title));
    if (!small) copy.append(element('small','',property.summary));
    copy.append(renderPrice(element('span',small ? 'ex-mini-price' : 'ex-result-price'),property));
    if (!small) copy.append(element('em','',reason || 'Conhecer o imóvel ↗︎'));
    button.append(image,copy); return button;
  }
  function renderHeroHighlights() {
    const container = root.querySelector('.ex-hero-highlights');
    container.replaceChildren();
    if (!heroState.chosen) return;
    const types = {casas:['Casa','Condomínio horizontal'],apartamentos:['Apartamento','Cobertura'],terrenos:['Terreno urbano','Lote em condomínio'],comercial:['Sala comercial','Loja','Edifício corporativo']};
    const type = types[heroState.chosen]?.[heroState.choice ?? 0];
    const items = properties.filter(property=>property.opportunity && property.type === type).slice(0,2);
    container.hidden = !items.length;
    if (!items.length) { root.dispatchEvent(new Event('eme-highlights-layout')); return; }
    const heading = element('p','ex-opportunities-title');
    const icon = element('i'); icon.setAttribute('data-lucide','sparkles'); icon.setAttribute('aria-hidden','true');
    heading.append(icon,document.createTextNode('Oportunidades'));
    container.append(heading);
    if (items.length) {
      const grid = element('div','ex-mini-grid');
      items.forEach(property=>grid.append(propertyButton(property,true)));
      container.append(grid);
    }
    icons();
    root.dispatchEvent(new Event('eme-highlights-layout'));
  }
  function openAssistant(mode,focus = true) {
    const wasOpen = Boolean(assistantMode);
    if (!wasOpen) {
      const active = document.activeElement;
      chatOpener = active && root.contains(active) && !assistant.contains(active) && active.matches('button,input,a,textarea') ? active : root.querySelector('.ex-chat-launch');
    }
    assistantMode = mode;
    chatMinimized = false;
    minimizedChat.hidden = true;
    assistant.hidden = false;
    home.hidden = view !== 'home'; propertyPage.hidden = view !== 'property';
    conversationPane.hidden = !['chat','search'].includes(mode);
    voicePane.hidden = mode !== 'voice'; leadPane.hidden = mode !== 'lead';
    root.querySelector('.ex-chat-return').hidden = ['chat','search'].includes(mode);
    root.querySelector('.ex-chat-launch').setAttribute('aria-expanded','true');
    root.querySelector('.ex-chat-launch').setAttribute('aria-label','Minimizar chat EME — online');
    root.querySelector('.ec-header').classList.remove('nav-open');
    root.querySelector('.ex-menu-toggle').setAttribute('aria-expanded','false');
    if (focus) requestAnimationFrame(() => {
      const field = mode === 'voice' ? root.querySelector('.ex-transcript') : mode === 'lead' ? leadForm.elements.name : composer.elements.message;
      if (field === composer.elements.message) resizeMessageInput();
      field.focus({preventScroll:true});
    });
  }
  function minimizeChat(returnFocus = true) {
    if (!assistantMode) return;
    chatMinimized = true;
    assistant.hidden = true;
    minimizedChat.hidden = false;
    root.querySelector('.ex-chat-launch').setAttribute('aria-expanded','false');
    root.querySelector('.ex-chat-launch').setAttribute('aria-label','Retomar chat EME — online');
    if (returnFocus) minimizedChat.focus({preventScroll:true});
  }
  function closeAssistant(returnFocus = true) {
    if (!assistantMode) return;
    assistantMode = null; chatMinimized = false; assistant.hidden = true; minimizedChat.hidden = true;
    root.querySelector('.ex-chat-launch').setAttribute('aria-expanded','false');
    root.querySelector('.ex-chat-launch').setAttribute('aria-label','Abrir chat EME — online');
    if (returnFocus && chatOpener?.isConnected) chatOpener.focus({preventScroll:true});
  }
  function money(value) { return 'R$ '+Math.round(value).toLocaleString('pt-BR'); }
  function criteriaText(criteria = intent) {
    if(criteria.summary)return criteria.summary;
    const parts = [];
    if (criteria.type) parts.push(criteria.type);
    if (criteria.city) parts.push(criteria.city.replace(/\b\w/g,letter=>letter.toUpperCase()));
    if (criteria.budget) parts.push('até '+money(criteria.budget));
    if (criteria.bedrooms) parts.push(criteria.bedrooms+' dormitórios ou mais');
    if (criteria.parking) parts.push(criteria.parking+' vagas ou mais');
    if (criteria.features?.length) parts.push(criteria.features.join(', '));
    if (criteria.rent) parts.push('locação');
    return parts.join(' · ');
  }
  function renderResults(items = currentMatches,summary = criteriaText()) {
    root.querySelector('.ex-results').hidden = false;
    currentMatches = items; resultList.replaceChildren();
    root.querySelector('.ex-result-actions').hidden=false;
    root.querySelector('.ex-results-title').textContent = items.length ? `${items.length === 1 ? 'Uma possibilidade' : items.length+' possibilidades'} para conhecer.` : 'Vamos refinar sua busca.';
    root.querySelector('.ex-result-summary').textContent = summary || 'Imóveis da coleção atual. Conte o que procura para ajustar esta seleção.';
    if (!items.length) resultList.append(element('p','ex-result-summary','Não há correspondência com os critérios informados nesta seleção. Você pode ajustar o pedido ou conversar com a equipe.'));
    items.forEach(property=>resultList.append(propertyButton(property,false)));
  }
  function renderMessages() {
    messageList.replaceChildren();
    conversation.slice(-40).forEach(message=>{
      const text = element('p','ex-message'+(message.from === 'Você' ? ' ex-message-user' : ''));
      text.append(element('small','',message.from),document.createTextNode(message.text)); messageList.append(text);
    });
  }
  function welcomeText() {
    return view === 'property'
      ? 'Que bom receber você por aqui! Sou o M, a IA da EME Select. Esse lugar despertou seu interesse? Posso contar mais sobre '+byId(selectedId).title+', ajudar a comparar ou orientar uma visita. Por onde você gostaria de começar?'
      : 'Olá, que bom ter você por aqui! Sou o M, a IA da EME Select. Vamos encontrar um lugar que combine com seus planos? Me conte, no seu tempo, o que você imagina para esse próximo passo.';
  }
  function chatWelcome() {
    if (conversation.length) return;
    conversation = [{from:'M',text:welcomeText(),welcome:true}];
    intent = {}; renderMessages();
    renderResults(view === 'property' ? [byId(selectedId)] : []);
    root.querySelector('.ex-results').hidden = true;
    root.querySelector('.ex-chips').hidden = false;
  }
  function scrollChat(toReply=false) {
    requestAnimationFrame(()=>{
      const stream=root.querySelector('.ex-chat-scroll');
      const reply=toReply?messageList.lastElementChild:null;
      if(reply)stream.scrollTop+=reply.getBoundingClientRect().top-stream.getBoundingClientRect().top-8;
      else stream.scrollTop=stream.scrollHeight;
    });
  }
  function setChatBusy(busy) {
    chatBusy=busy;
    composer.querySelector('.ex-send').disabled=busy;
    composer.setAttribute('aria-busy',String(busy));
    root.querySelector('.ex-chat-thinking').hidden=!busy;
    root.querySelector('.ex-chat-identity small').textContent=busy?'Consultando a coleção…':'IA · atendimento 24h';
    minimizedChat.querySelector('small').textContent=busy?'M está respondendo…':'Continuar de onde parou';
  }
  function resetChatRequest(){
    chatVersion++;chatTransport.cancel();setChatBusy(false);lastChatRequest=null;
    root.querySelector('.ex-chat-error').hidden=true;
  }
  function updateChatHandoff(){
    const parts=['Olá, equipe EME Select! Vim da conversa com o M.'];
    if(criteriaText())parts.push('Meu interesse: '+criteriaText());
    if(currentMatches.length)parts.push('Imóveis que conheci:',...currentMatches.slice(0,3).map(p=>p.title+' · '+p.price+' · '+location.origin+'/#/imovel/'+p.id));
    parts.push('Podemos continuar o atendimento?');
    root.querySelector('.ex-assistant-footer a').href='https://wa.me/5554991578029?text='+encodeURIComponent(parts.join('\n\n'));
  }
  async function sendChatRequest(request){
    const version=++chatVersion;
    lastChatRequest=request;
    root.querySelector('.ex-chat-error').hidden=true;
    setChatBusy(true);scrollChat();
    try{
      const data=await chatTransport.send(request.messages,request.context);
      if(!data||version!==chatVersion)return;
      const refreshed=mapProperties(data.properties,assets);
      for(const p of refreshed){const old=byId(p.id);if(old)Object.assign(old,p);else properties.push(p);searchFacts[p.id]=p.searchFacts;}
      intent={summary:data.searchSummary};
      conversation.push({from:'M',text:data.reply});renderMessages();
      renderResults(refreshed,criteriaText());
      root.querySelector('.ex-result-actions').hidden=data.handoff!=='none';
      root.querySelector('.ex-results').hidden=!refreshed.length&&data.handoff==='none';
      if(!refreshed.length)resultList.replaceChildren();
      if(data.handoff==='owner'){
        root.querySelector('.ex-results-title').textContent='Seu imóvel na coleção.';
        const link=element('a','ec-link','Apresentar meu imóvel ↗︎');link.href='/enviar-imovel';resultList.append(link);
      }else if(['team','visit'].includes(data.handoff)){
        root.querySelector('.ex-results-title').textContent=data.handoff==='visit'?'Vamos combinar uma visita?':'A equipe continua com você.';
        const button=element('button','ec-link ec-plain',data.handoff==='visit'?'Solicitar uma visita ↗︎':'Solicitar contato ↗︎');button.type='button';button.dataset.lead=data.handoff==='visit'?'visit':'selection';resultList.append(button);
      }
      updateChatHandoff();lastChatRequest=null;save();
    }catch(error){
      if(version!==chatVersion)return;
      root.querySelector('.ex-chat-error-copy').textContent=error.message;
      root.querySelector('.ex-chat-error').hidden=false;
    }finally{
      if(version===chatVersion){setChatBusy(false);if(lastChatRequest)root.querySelector('.ex-chat-identity small').textContent='IA · conexão indisponível';if(chatMinimized)minimizedChat.querySelector('small').textContent=lastChatRequest?'Toque para tentar novamente':'Resposta recebida · continuar';scrollChat(!lastChatRequest);}
    }
  }
  function respond(text,reset=false){
    const clean=text.trim().slice(0,1500);if(!clean||chatBusy&&!reset)return;
    if(reset){resetChatRequest();conversation=[];intent={};currentMatches=[];updateChatHandoff();}
    conversation.push({from:'Você',text:clean});renderMessages();
    root.querySelector('.ex-chips').hidden=true;
    root.querySelector('.ex-results').hidden=true;
    composer.elements.message.value='';composer.elements.message.style.height='48px';
    void sendChatRequest({messages:conversation.map(message=>({...message})),context:{propertyId:view==='property'?selectedId:null,recentIds:currentMatches.slice(0,3).map(p=>p.id),regionId:view==='region'?regionId:null}});
  }
  root.querySelector('.ex-chat-retry').addEventListener('click',()=>{if(lastChatRequest&&!chatBusy)void sendChatRequest(lastChatRequest);});
  function newConversation() {
    if(leadSending)return;
    resetChatRequest();
    if(voiceRecognition){voiceRecognition.onstart=voiceRecognition.onresult=voiceRecognition.onerror=voiceRecognition.onend=null;voiceRecognition.abort();voiceRecognition=null;}
    conversation=[];intent={};currentMatches=[];leadKind='selection';leadPropertyId=null;leadRequestId=crypto.randomUUID();
    headerSearch.value='';composer.reset();composer.elements.message.style.height='48px';
    root.querySelector('.ex-transcript').value='';root.querySelector('.ex-voice-state').textContent='';root.querySelector('.ex-voice-example').textContent='Gravar meu pedido';
    leadForm.reset();leadForm.hidden=false;root.querySelector('.ex-error').hidden=true;root.querySelector('.ex-success').hidden=true;
    resultList.replaceChildren();root.querySelector('.ex-result-summary').textContent='';
    chatWelcome();updateChatHandoff();openAssistant('chat');root.querySelector('.ex-chat-scroll').scrollTop=0;
    status.textContent='Nova conversa iniciada.';save();
  }
  root.querySelector('.ex-new-chat').addEventListener('click',newConversation);
  function runSearch(text,reset = true) {
    if (!text.trim()) { headerSearch.focus(); return; }
    openAssistant('search'); respond(text,reset); save();
  }
  function openLead(kind) {
    leadKind = kind;
    const inConversation = Boolean(assistantMode);
    const candidate = inConversation ? (currentMatches.length === 1 ? currentMatches[0] : null) : view === 'property' ? byId(selectedId) : null;
    leadPropertyId = kind === 'visit' ? candidate?.id ?? null : !inConversation && view === 'property' ? selectedId : null;
    openAssistant('lead');
    root.querySelector('.ex-lead-title').textContent = kind === 'visit' ? 'Vamos combinar uma visita?' : 'Uma seleção com o seu perfil.';
    const context = leadPropertyId ? byId(leadPropertyId).title+' · '+byId(leadPropertyId).price : criteriaText() || 'Imóveis selecionados em Vacaria e região';
    root.querySelector('.ex-lead-context').textContent = 'Seu interesse: '+context+'. '+(kind === 'visit' ? 'A equipe retorna para conversar e confirmar um horário.' : 'Conte como podemos falar com você sobre possibilidades que façam sentido.');
    leadRequestId = crypto.randomUUID(); leadForm.reset(); leadForm.hidden = false;
    root.querySelector('.ex-success').hidden = true;
    root.querySelector('.ex-error').hidden = true;
    save();
  }
  function showInvitation(kind) {
    if (invitationDismissed || assistantMode) return;
    const node = root.querySelector(`[data-invitation="${kind}"]`);
    if (!node || !node.hidden) return;
    const inner = element('div','ex-invitation-inner');
    const copy = element('div','ex-invitation-copy');
    copy.append(element('strong','',kind === 'property' ? 'Este lugar combina com você?' : 'Quer uma seleção com o seu perfil?'));
    copy.append(element('p','',kind === 'property' ? 'Receba informações e oportunidades semelhantes.' : 'A EME ajuda a encontrar o que faz sentido para sua busca.'));
    const action = element('button','ec-link ec-plain cursor-interaction',kind === 'property' ? 'Quero receber opções ↗︎' : 'Montar minha seleção ↗︎'); action.type='button'; action.dataset.lead='selection';
    const close = element('button','ex-dismiss cursor-interaction','×'); close.type='button'; close.setAttribute('aria-label','Dispensar sugestão'); close.dataset.dismissInvitation='';
    inner.append(copy,action,close); node.replaceChildren(inner); node.hidden=false;
    if (!reducedMotion()) inner.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,easing:'ease-out'});
  }
  const invitationObserver = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if (!entry.isIntersecting || assistantMode) return;
      if (entry.target.classList.contains('ep-essentials') && view === 'property') showInvitation('property');
      if (entry.target.classList.contains('ec-property-selector') && view === 'home') showInvitation('home');
    });
  },{threshold:.5});
  invitationObserver.observe(root.querySelector('.ep-essentials'));
  invitationObserver.observe(root.querySelector('.ec-property-selector'));
  let leadRequestId=crypto.randomUUID(),leadSending=false;
  async function submitLead() {
    if(leadSending)return;
    const phone=leadForm.elements.phone.value.replace(/\D/g,'');
    const error=root.querySelector('.ex-error'),button=leadForm.querySelector('button');
    error.hidden=true;
    if(leadForm.elements.name.value.trim().length<2){error.textContent='Conte como podemos chamar você.';error.hidden=false;return;}
    if(!/^\d{10,11}$/.test(phone)&&!/^55\d{10,11}$/.test(phone)){error.textContent='Confira o WhatsApp, incluindo o DDD.';error.hidden=false;return;}
    if(!leadForm.elements.consent.checked){error.textContent='Autorize o contato para continuar.';error.hidden=false;return;}
    const interest=leadPropertyId?byId(leadPropertyId).full:criteriaText()||'Quero conhecer a coleção EME Select';
    const q=new URLSearchParams(location.search);
    const body={requestId:leadRequestId,name:leadForm.elements.name.value.trim(),phone,consent:true,propertyId:leadPropertyId,interest:interest.slice(0,400),message:criteriaText().slice(0,1500),intent:leadKind==='visit'?'visit':'contact',source:{page:(location.pathname+location.hash.split('?')[0]).slice(0,300),origin:(q.get('utm_source')||'').slice(0,100),medium:(q.get('utm_medium')||'').slice(0,100),campaign:(q.get('utm_campaign')||'').slice(0,150)}};
    leadSending=true;root.querySelector('.ex-new-chat').disabled=true;button.disabled=true;button.textContent='Enviando…';
    try{
      const response=await fetch('/api/public/leads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      const data=await response.json();
      if(!response.ok||data.received!==true)throw Error(data.error||'Não foi possível confirmar o registro. Tente novamente.');
      root.querySelector('.ex-success-copy').textContent='Seu interesse: '+interest+'. Protocolo: '+String(data.reference).slice(0,8).toUpperCase()+'.';
      leadForm.reset();leadForm.hidden=true;root.querySelector('.ex-success').hidden=false;
    }catch(e){error.textContent=e.name==='TimeoutError'?'Não foi possível confirmar o envio. Tente novamente com este mesmo pedido.':e.message||'Confira sua conexão e tente novamente.';error.hidden=false;}
    finally{leadSending=false;root.querySelector('.ex-new-chat').disabled=false;button.disabled=false;button.textContent='Solicitar contato ↗︎';}
  }

  root.querySelectorAll('button[type="submit"]').forEach(button=>button.type='button');
  const headerVoicePanel=document.createElement('div');headerVoicePanel.className='header-voice';headerVoicePanel.hidden=true;
  headerVoicePanel.innerHTML='<span class="voice-level" aria-hidden="true"></span><span class="header-voice-message" role="status" aria-live="polite"></span><button type="button" class="header-voice-stop" hidden>Concluir</button><button type="button" class="header-voice-cancel" aria-label="Fechar gravação de voz">×</button>';
  headerSearch.closest('form').append(headerVoicePanel);
  const headerVoice=createHeaderVoice({input:headerSearch,button:root.querySelector('.ex-search .ex-microphone'),panel:headerVoicePanel,message:headerVoicePanel.querySelector('.header-voice-message'),stop:headerVoicePanel.querySelector('.header-voice-stop'),cancel:headerVoicePanel.querySelector('.header-voice-cancel'),Recognition:window.SpeechRecognition||window.webkitSpeechRecognition});
  window.addEventListener('pagehide',()=>headerVoice.finish());
  root.querySelector('.ex-search-submit').addEventListener('click',()=>{headerVoice.finish();runSearch(headerSearch.value);});
  headerSearch.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();headerVoice.finish();runSearch(headerSearch.value);}});
  composer.querySelector('button').addEventListener('click',()=>{respond(composer.elements.message.value);save();});
  function resizeMessageInput() {
    const field = composer.elements.message;
    if (!field.clientWidth) return;
    field.style.height = '48px';
    field.style.height = Math.min(100,Math.max(48,field.scrollHeight))+'px';
  }
  composer.elements.message.addEventListener('input',resizeMessageInput);
  let composerWidth = 0;
  new ResizeObserver(entries => {
    const width = entries[0].contentRect.width;
    if (width && width !== composerWidth) {composerWidth = width;resizeMessageInput();}
  }).observe(composer);
  composer.elements.message.addEventListener('keydown',event=>{if(event.key==='Enter' && !event.shiftKey){event.preventDefault();respond(composer.elements.message.value);save();}});
  leadForm.querySelector('button').addEventListener('click',submitLead);
  leadForm.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();submitLead();}});
  root.querySelectorAll('form').forEach(form=>form.addEventListener('submit',event=>event.preventDefault()));
  root.addEventListener('click',event=>{
    const target = event.target;
    const card = target.closest('[data-open-id]');
    if (card) {openProperty(card.dataset.openId);return;}
    if (target.closest('.ex-menu-toggle')) {
      const header=root.querySelector('.ec-header'); const opened=header.classList.toggle('nav-open'); root.querySelector('.ex-menu-toggle').setAttribute('aria-expanded',String(opened)); return;
    }
    if (target.closest('[data-assistant="chat"]')) {
      if (target.closest('.ex-chat-launch') && assistantMode && !chatMinimized) minimizeChat();
      else if (target.closest('.ex-chat-launch') && chatMinimized) openAssistant(assistantMode || 'chat');
      else {chatWelcome();openAssistant('chat');}
      save();return;
    }
    if (target.closest('.ex-chat-minimized')) {openAssistant(assistantMode || 'chat');save();return;}
    if (target.closest('.ex-minimize-chat')) {minimizeChat();save();return;}
    if (target.closest('.ex-microphone')) {
      if(target.closest('.ex-search')){voiceRecognition?.stop();headerVoice.start();return;}
      headerVoice.finish();
      openAssistant('voice'); root.querySelector('.ex-transcript').value=''; root.querySelector('.ex-voice-state').textContent='';save();return;
    }
    if (target.closest('.ex-assistant-back')) {closeAssistant();save();return;}
    if (target.closest('.ex-chat-return')) {chatWelcome();openAssistant('chat');save();return;}
    if (target.closest('.ex-voice-example')) {
      startVoice(); return;
    }
    if (target.closest('.ex-voice-search')) {
      const text=root.querySelector('.ex-transcript').value;
      if (!text.trim()) {root.querySelector('.ex-voice-state').textContent='Grave ou escreva seu pedido para continuar.';return;}
      headerSearch.value=text;runSearch(text);return;
    }
    const prompt = target.closest('[data-prompt]');
    if (prompt) {respond(prompt.dataset.prompt,true);save();return;}
    const category = target.closest('[data-category-chat]');
    if (category) {openAssistant('chat');respond('Procuro '+category.dataset.categoryChat,true);save();return;}
    if (target.closest('[data-owner-chat]')) {openAssistant('chat');respond('Quero anunciar meu imóvel',true);save();return;}
    const lead = target.closest('[data-lead]');
    if (lead) {openLead(lead.dataset.lead);return;}
    if (target.closest('[data-dismiss-invitation]')) {invitationDismissed=true;root.querySelectorAll('.ex-invitation').forEach(node=>node.hidden=true);return;}
  });
  root.addEventListener('keydown',event=>{
    if (event.key==='Escape' && assistantMode && !chatMinimized) {event.preventDefault();minimizeChat();save();}
  });
  new ResizeObserver(() => {headerSearch.placeholder = root.clientWidth < 310 ? 'Buscar imóveis' : 'O que você procura?';}).observe(root);
  function syncRoute(){
    updateHeaderNavigation();
    if(!routingReady)return;
    const hash=view==='property'?'#/imovel/'+selectedId:view==='region'?'#/regiao/'+regionId:view==='catalog'?catalog.hash():view==='opportunities'?opportunities.hash():'#/';
    const navigation=view==='property'&&propertyOriginOpportunities?{opportunitiesReturn:opportunities.hash(),opportunitiesScroll:opportunitiesReturnScroll}:view==='property'&&propertyOriginCatalog?{catalogReturn:catalog.hash(),catalogScroll:catalogReturnScroll}:null;
    if(location.hash!==hash)history.pushState(navigation,'',hash);
    root.dispatchEvent(new Event('eme-analytics-route'));
    document.title=(view==='property'?byId(selectedId)?.title:view==='region'?regionById(regionId).name:view==='catalog'?'Todos os imóveis':view==='opportunities'?'Oportunidades':'Seu próximo lugar')+' — EME Select';
  }
  function applyRoute(){
    const before=routingReady;routingReady=false;
    const parts=location.hash.split('?')[0].replace(/^#\/?/,'').split('/');
    if(['imovel','visita'].includes(parts[0])&&byId(parts[1])) {
      openProperty(parts[1],false);
      if(history.state?.catalogReturn){catalog.show(history.state.catalogReturn.split('?')[1]||'');catalog.page.hidden=true;propertyOriginCatalog=true;catalogReturnScroll=history.state.catalogScroll||0;}
      if(history.state?.opportunitiesReturn){opportunities.show(history.state.opportunitiesReturn.split('?')[1]||'');opportunities.page.hidden=true;propertyOriginOpportunities=true;propertyOriginCatalog=false;opportunitiesReturnScroll=history.state.opportunitiesScroll||0;renderProperty();}
    }
    else if(parts[0]==='regiao'&&regionById(parts[1]))showRegion(parts[1],{persist:false});
    else if(parts[0]==='colecao')showCatalog(location.hash.split('?')[1]||'',{persist:false});
    else if(parts[0]==='oportunidades')showOpportunities(location.hash.split('?')[1]||'',{returning:view==='property'&&propertyOriginOpportunities,persist:false});
    else {showHome(null,false,true);if(['imovel','visita'].includes(parts[0]))status.textContent='Este imóvel não está disponível na coleção atual.';}
    document.title=(view==='property'?byId(selectedId)?.title:view==='region'?regionById(regionId).name:view==='catalog'?'Todos os imóveis':view==='opportunities'?'Oportunidades':'Seu próximo lugar')+' — EME Select';
    routingReady=before;
    updateHeaderNavigation();
  }
  window.addEventListener('popstate',applyRoute);
  window.addEventListener('hashchange',applyRoute);
  let voiceRecognition=null;
  function startVoice(){
    const state=root.querySelector('.ex-voice-state'),button=root.querySelector('.ex-voice-example');
    if(voiceRecognition){voiceRecognition.stop();return;}
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){state.textContent='A busca por voz não está disponível neste navegador. Você pode digitar seu pedido abaixo.';return;}
    const recognition=new Recognition();voiceRecognition=recognition;recognition.lang='pt-BR';recognition.interimResults=true;
    recognition.onstart=()=>{state.textContent='Ouvindo… Conte o que você procura.';button.textContent='Parar gravação';};
    recognition.onresult=event=>{root.querySelector('.ex-transcript').value=Array.from(event.results).map(r=>r[0].transcript).join(' ').slice(0,800);};
    recognition.onerror=event=>{state.textContent=event.error==='not-allowed'?'O microfone não foi autorizado. Você pode digitar seu pedido.':'Não foi possível transcrever. Tente novamente ou digite seu pedido.';};
    recognition.onend=()=>{voiceRecognition=null;button.textContent='Gravar meu pedido';if(root.querySelector('.ex-transcript').value)state.textContent='Confira o pedido antes de buscar.';};
    try{recognition.start();}catch{voiceRecognition=null;state.textContent='Não foi possível iniciar o microfone. Digite seu pedido abaixo.';}
  }
  root.querySelectorAll('.ex-minimize-chat,.ex-assistant-back,.ex-voice-search,.ex-chat-return').forEach(button=>button.addEventListener('click',()=>voiceRecognition?.stop()));

  const pageScroller = root.querySelector('.ec-page-scroll');
  const stickyHeader = root.querySelector('.ec-header');
  function updateHeaderNavigation(){
    const header=root.querySelector('.ec-header');
    const readingLine=header.getBoundingClientRect().bottom+90;
    let current='collection';
    if(view==='home') {
      for(const section of ['opportunities','team','owners']) {
        const target=root.querySelector('#eme-full-'+section);
        if(target.getClientRects().length && target.getBoundingClientRect().top<=readingLine)current=section;
      }
    } else if(view==='opportunities'||(view==='property'&&propertyOriginOpportunities))current='opportunities';
    header.querySelectorAll('nav button').forEach(button=>{
      const section=button.dataset.section || (button.classList.contains('er-collection-toggle')?'collection':null);
      if(section&&section===current)button.setAttribute('aria-current','location');
      else button.removeAttribute('aria-current');
    });
  }
  new ResizeObserver(() => {
    pageScroller.style.setProperty('--eme-header-height',(stickyHeader.offsetHeight+16)+'px');
    updateHeaderNavigation();
  }).observe(stickyHeader);
  pageScroller.addEventListener('scroll',() => {
    stickyHeader.classList.toggle('is-scrolled',pageScroller.scrollTop > 16);
    updateHeaderNavigation();
  },{passive:true});
  let photoGesture = null;
  const gallery = root.querySelector('.ep-gallery');
  let lastGestureAt = 0;
  function finishPhotoGesture(x,y) {
    if (!photoGesture) return;
    const dx=x-photoGesture.x,dy=y-photoGesture.y;
    photoGesture=null;
    if (Date.now()-lastGestureAt<180) return;
    if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)*1.4) {lastGestureAt=Date.now();setPhoto(photoIndex+(dx<0 ? 1 : -1));save();}
  }
  gallery.addEventListener('pointerdown',event=>{
    if (event.target.closest('button') || byId(selectedId).photos.length < 2) return;
    if (event.pointerType === 'mouse') event.preventDefault();
    photoGesture={id:event.pointerId,x:event.clientX,y:event.clientY};
    gallery.setPointerCapture(event.pointerId);
  });
  gallery.addEventListener('dragstart',event=>event.preventDefault());
  gallery.addEventListener('pointerup',event=>{
    if (!photoGesture || photoGesture.id !== event.pointerId) return;
    if (gallery.hasPointerCapture(event.pointerId)) gallery.releasePointerCapture(event.pointerId);
    finishPhotoGesture(event.clientX,event.clientY);
  });
  gallery.addEventListener('pointercancel',()=>{photoGesture=null;});
  gallery.addEventListener('touchstart',event=>{if(event.target.closest('button'))return;const touch=event.touches[0];if(touch)photoGesture={x:touch.clientX,y:touch.clientY};},{passive:true});
  gallery.addEventListener('touchend',event=>{const touch=event.changedTouches[0];if(touch)finishPhotoGesture(touch.clientX,touch.clientY);},{passive:true});
  gallery.addEventListener('mousedown',event=>{if(event.target.closest('button'))return;event.preventDefault();if(!photoGesture)photoGesture={x:event.clientX,y:event.clientY};});
  document.addEventListener('mouseup',event=>finishPhotoGesture(event.clientX,event.clientY));

  renderCollection();
  updateFavorites();
  renderRegionNavigation();
  showHome(null,false,false);
  restore(experienceState?.widgetState);
  applyRoute();
  routingReady=true;
  renderHeroHighlights();
  icons();
  window.addEventListener('openai:set_globals',event=>{if(event.detail?.globals?.widgetState) restore(event.detail.globals.widgetState);});
})();

}
