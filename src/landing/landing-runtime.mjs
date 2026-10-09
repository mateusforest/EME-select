import {hydrateLanding} from './live-content.mjs';
import {publishedSearch,propertyPhotos} from './published-search.mjs';
export function mountLanding(root,properties){
 const lifecycle=new AbortController();
 hydrateLanding(root,properties,lifecycle.signal);

      const $=selector=>root.querySelector(selector);
      const assets={"litoral": "/assets/landing/litoral.avif", "cidade": "/assets/landing/cidade.avif", "bairro": "/assets/landing/bairro.avif", "condominio": "/assets/landing/condominio.avif", "cobertura": "/assets/landing/cobertura.avif", "terreno": "/assets/landing/terreno.avif", "rural": "/assets/landing/rural.avif", "loja": "/assets/landing/loja.avif", "sala": "/assets/landing/sala.avif", "galpao": "/assets/landing/galpao.avif", "lotecondominio": "/assets/landing/lotecondominio.avif", "casaindependente": "/assets/landing/casaindependente.avif", "apartamento": "/assets/landing/apartamento.avif", "garden": "/assets/landing/garden.avif"};
      assets.serra=$('[data-layer="0"]').src;
      const environments={serra:{label:'Serra',region:'serra'},litoral:{label:'Litoral',region:'litoral'},cidade:{label:'Cidade',region:'urbano'}};
      const choices={
        casas:{label:'Casas',hint:'Como você imagina morar?',options:[
          {id:'bairro',name:'Bairro tranquilo',summary:'Uma casa e sua vizinhança',asset:'bairro',copy:'Uma casa com identidade, em uma vizinhança para fazer parte.',type:'Casa'},
          {id:'condominio',name:'Condomínio fechado',summary:'Espaços compartilhados e privacidade',asset:'condominio',copy:'A sua casa, com áreas de convivência e uma nova forma de viver em conjunto.',type:'Casa',region:'condominios'},
          {id:'independente',name:'Casa independente',summary:'Arquitetura e espaço só seus',asset:'casaindependente',copy:'Arquitetura com personalidade, luz natural e espaço para construir sua rotina.',type:'Casa'}
        ]},
        apartamentos:{label:'Apartamentos',hint:'Qual perspectiva combina com você?',options:[
          {id:'apartamento',name:'Apartamentos',summary:'Conforto para o dia a dia',asset:'apartamento',copy:'Ambientes que acolhem a rotina, com luz natural e conexão com a cidade.',type:'Apartamento'},
          {id:'cobertura',name:'Coberturas',summary:'Terraço e horizonte aberto',asset:'cobertura',copy:'Mais céu, espaço ao ar livre e uma perspectiva diferente da cidade.',type:'Apartamento'},
          {id:'garden',name:'Apartamentos garden',summary:'Um jardim para chamar de seu',asset:'garden',copy:'A praticidade do apartamento com um espaço externo para viver de perto.',type:'Apartamento'}
        ]},
        comercial:{label:'Comercial',hint:'Que espaço o seu negócio precisa?',options:[
          {id:'loja',name:'Lojas',summary:'Vitrine e acesso pela rua',asset:'loja',copy:'Uma vitrine, um endereço e espaço para aproximar seu negócio das pessoas.',type:'Loja',region:'comercial'},
          {id:'sala',name:'Salas comerciais',summary:'Trabalhar, reunir e receber',asset:'sala',copy:'Ambientes para trabalhar com foco e receber clientes com cuidado.',type:'Sala comercial',region:'comercial'},
          {id:'galpao',name:'Galpões',summary:'Estrutura para sua operação',asset:'galpao',copy:'Espaço, acesso e estrutura para armazenar, produzir e distribuir.',type:'Galpão',region:'industrial'}
        ]},
        terrenos:{label:'Terrenos',hint:'Onde começa o seu próximo projeto?',options:[
          {id:'urbano',name:'Lotes residenciais',summary:'Um lugar para construir',asset:'terreno',copy:'Espaço para desenhar sua próxima casa, com a vizinhança por perto.',type:'Terreno urbano',region:'terrenos'},
          {id:'lote-condominio',name:'Lotes em condomínio',summary:'Acesso privado e áreas comuns',asset:'lotecondominio',copy:'O espaço da sua casa em um conjunto planejado, com acesso privado e áreas compartilhadas.',type:'Lote em condomínio',region:'terrenos'},
          {id:'rural',name:'Áreas rurais',summary:'Amplitude e contato com a natureza',asset:'rural',copy:'Paisagem aberta e espaço para imaginar outras possibilidades.',type:'Terra agrícola',region:'terrenos',exclude:['cidade']}
        ]}
      };
      const state={env:'serra',type:null,entry:null,panel:false};
      const layers=[ $('[data-layer="0"]'), $('[data-layer="1"]') ];
      const panel=$('#em-choices');
      const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
      let panelVersion=0;
      let panelOrigin=null,returnState=null;
      const getAsset=option=>typeof option.asset==='function'?option.asset(state.env):option.asset;
      const optionsFor=type=>choices[type].options.filter(option=>!option.exclude?.includes(state.env));
      const entryFor=(type,id)=>choices[type].options.find(option=>option.id===id);
      const motion=(element,keyframes,options)=>{
        if(reduced.matches||typeof element.animate!=='function')return null;
        return element.animate(keyframes,options);
      };
/*
 * EME Select · connected scene travel
 *
 * const camera = createEmeSceneTransition({
 *   stage: root.querySelector('[data-camera]'),
 *   layers: [imgA, imgB], // or [{element: divA, image: imgA, foreground: cutoutA}, …]
 *   initial: {src: imgA.src, alt: imgA.alt, position: '55% 52%'},
 *   onCommit: scene => updateHeading(scene),
 *   onError: () => announce('Não foi possível abrir este cenário. Tente novamente.')
 * });
 * await camera.show({src: assets.loja, alt:'Loja de rua.', position:'50% 50%'}, 'forward');
 * camera.show(next, 'back'); // rightward return, not a zoom reversal
 * camera.destroy();
 *
 * The controller owns each layer's layout/visibility/transform. stage must have
 * a definite rendered size and be positioned; overlay UI belongs outside it.
 * A foreground is OPTIONAL and must be a genuine transparent cutout aligned
 * with that scene. Without a cutout this is an honest lateral photograph
 * transition, not simulated 3D. No opacity crossfade, perspective, or rotation.
 */
function createEmeSceneTransition({
  stage,
  layers,
  initial = null,
  duration = 1320,
  loadTimeout = 15000,
  onCommit = () => {},
  onError = () => {},
}) {
  if (!stage || !Array.isArray(layers) || layers.length !== 2) {
    throw new TypeError('Provide a scene stage and exactly two image layers.');
  }

  const planes = layers.map(layer => layer.element ? layer : {element: layer, image: layer});
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const originalStage = {overflow: stage.style.overflow, busy: stage.getAttribute('aria-busy')};
  const original = planes.map(plane => [plane.element, plane.image, plane.foreground]
    .filter((element, index, list) => element && list.indexOf(element) === index)
    .map(element => ({element, style: element.getAttribute('style'), hidden: element.getAttribute('aria-hidden')})));
  let visible = 0;
  let committed = initial;
  let latest = null;
  let running = null;
  let serial = 0;
  let destroyed = false;
  let activeAnimations = [];

  stage.style.overflow = 'hidden';
  for (const [index, plane] of planes.entries()) {
    Object.assign(plane.element.style, {
      position: 'absolute', inset: '0', left: '0', top: '0', width: '100%', height: '100%',
      margin: '0', display: 'block', transform: 'none', opacity: '1',
      visibility: index === visible ? 'visible' : 'hidden', zIndex: index === visible ? '1' : '0',
      willChange: 'auto', overflow: 'hidden', transition: 'none',
    });
    Object.assign(plane.image.style, {width: '100%', height: '100%', objectFit: 'cover', display: 'block'});
    if (plane.element !== plane.image) {
      Object.assign(plane.image.style, {position: 'absolute', inset: '0', transform: 'none'});
    }
    if (plane.foreground) {
      Object.assign(plane.foreground.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        objectFit: 'cover', pointerEvents: 'none', transform: 'none', visibility: 'hidden',
      });
      plane.foreground.setAttribute('aria-hidden', 'true');
    }
    plane.element.setAttribute('aria-hidden', String(index !== visible));
  }

  function settle(request, status, error) {
    if (request.settled) return;
    request.settled = true;
    request.resolve({status, scene: request.scene, ...(error ? {error} : {})});
  }

  function busy() {
    const loading = latest && !latest.settled && !latest.ready;
    stage.dataset.sceneState = running ? 'moving' : loading ? 'loading' : 'ready';
    stage.setAttribute('aria-busy', String(Boolean(running || loading)));
  }

  // Each load has its own Image, so fast clicks cannot mutate the visible plane
  // or cause a stale decode callback to overwrite a more recent selection.
  function decodedImage(src) {
    const image = new Image();
    image.decoding = 'async';
    let abort;
    const promise = new Promise((resolve, reject) => {
      let ended = false;
      const done = error => {
        if (ended) return;
        ended = true;
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        if (error) reject(error);
        else resolve(image);
      };
      const timeout = setTimeout(() => {
        done(new Error('The scene image took too long to load.'));
        image.removeAttribute('src');
      }, loadTimeout);
      abort = () => {
        done(new Error('Scene request superseded.'));
        image.removeAttribute('src');
      };
      image.onerror = () => done(new Error('The scene image could not be loaded.'));
      image.onload = async () => {
        try {
          if (image.decode) await image.decode();
          if (!image.naturalWidth) throw new Error('The scene image is empty.');
          done();
        } catch (error) { done(error); }
      };
      image.src = src;
    });
    return {promise, abort: () => abort?.()};
  }

  function assign(plane, scene) {
    plane.image.src = scene.src;
    plane.image.alt = scene.alt || '';
    plane.image.style.objectPosition = scene.position || '50% 50%';
    if (plane.foreground) {
      if (scene.foregroundSrc) {
        plane.foreground.src = scene.foregroundSrc;
        plane.foreground.style.objectPosition = scene.position || '50% 50%';
        plane.foreground.style.visibility = 'visible';
      } else plane.foreground.style.visibility = 'hidden';
    }
  }

  async function travel(request) {
    if (destroyed || running || request !== latest || !request.ready) return;
    const scene = request.scene;
    if (committed?.src === scene.src && committed?.position === scene.position &&
        committed?.foregroundSrc === scene.foregroundSrc) {
      committed = scene;
      assign(planes[visible], scene);
      settle(request, 'unchanged');
      busy();
      onCommit(scene);
      return;
    }
    running = request;
    busy();
    const outgoing = planes[visible];
    const incoming = planes[1 - visible];
    assign(incoming, scene);
    // The preloaded image is decoded already, but also decode the displayed
    // element before exposing it: this guards large assets on slow devices.
    try {
      if (incoming.image.decode) await incoming.image.decode();
      if (incoming.foreground && scene.foregroundSrc && incoming.foreground.decode) await incoming.foreground.decode();
    } catch (error) {
      running = null;
      settle(request, 'error', error);
      if (!destroyed && request === latest) onError(error, scene);
      busy();
      if (latest?.ready && latest !== request) travel(latest);
      return;
    }
    if (destroyed) return;
    if (request !== latest) {
      running = null;
      settle(request, 'superseded');
      busy();
      if (latest?.ready) travel(latest);
      return;
    }
    const sign = request.direction === 'back' || request.direction === 'right' ? -1 : 1;
    outgoing.element.style.zIndex = '1';
    incoming.element.style.zIndex = '2';
    incoming.element.style.visibility = 'visible';
    outgoing.element.style.willChange = 'transform';
    incoming.element.style.willChange = 'transform';
    // A joined horizontal rail: the old scene remains completely opaque until
    // it physically leaves the frame. 100% +/- 0.15% overlap prevents seams.
    const timing = {duration, easing: 'cubic-bezier(.64,0,.24,1)', fill: 'both'};
    if (!reduce.matches && typeof incoming.element.animate === 'function') {
      activeAnimations = [
        outgoing.element.animate([
          {transform: 'translate3d(0,0,0)'},
          {transform: `translate3d(${-100 * sign}%,0,0)`},
        ], timing),
        incoming.element.animate([
          {transform: `translate3d(${99.85 * sign}%,0,0)`},
          {transform: 'translate3d(0,0,0)'},
        ], timing),
      ];
      // Genuine cutouts may move slightly faster than the environment. Never
      // move an arbitrary rectangle of the photo independently of its house.
      for (const [plane, entering] of [[outgoing, false], [incoming, true]]) {
        if (plane.foreground && plane.foreground.style.visibility !== 'hidden') {
          activeAnimations.push(plane.foreground.animate(entering ? [
            {transform: `translate3d(${5 * sign}%,0,0)`}, {transform: 'none'},
          ] : [
            {transform: 'none'}, {transform: `translate3d(${-5 * sign}%,0,0)`},
          ], timing));
        }
      }
      await Promise.allSettled(activeAnimations.map(animation => animation.finished));
    }
    if (destroyed) return;
    // Set the resting styles before canceling fill effects: no intermediate
    // flash, and no composited animation layers remain alive after settling.
    incoming.element.style.transform = 'none';
    incoming.element.style.visibility = 'visible';
    outgoing.element.style.visibility = 'hidden';
    outgoing.element.style.transform = 'none';
    incoming.element.style.willChange = 'auto';
    outgoing.element.style.willChange = 'auto';
    outgoing.element.setAttribute('aria-hidden', 'true');
    incoming.element.setAttribute('aria-hidden', 'false');
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations = [];
    visible = 1 - visible;
    committed = scene;
    running = null;
    const isLatest = request === latest;
    settle(request, isLatest ? 'committed' : 'superseded');
    busy();
    if (isLatest) onCommit(scene);
    else if (latest?.ready) travel(latest);
  }

  function show(scene, direction = 'forward') {
    if (!scene?.src) return Promise.resolve({status: 'error', scene, error: new TypeError('A scene src is required.')});
    if (destroyed) return Promise.resolve({status: 'destroyed', scene});
    if (latest && latest !== running && !latest.settled) {
      latest.loaders.forEach(loader => loader.abort());
      settle(latest, 'superseded');
    }
    const request = {id: ++serial, scene: {...scene}, direction, ready: false, settled: false, loaders: []};
    const result = new Promise(resolve => { request.resolve = resolve; });
    latest = request;
    busy();
    request.loaders = [decodedImage(scene.src)];
    if (scene.foregroundSrc) request.loaders.push(decodedImage(scene.foregroundSrc));
    Promise.all(request.loaders.map(loader => loader.promise)).then(() => {
      if (destroyed || request !== latest) {
        settle(request, destroyed ? 'destroyed' : 'superseded');
        return;
      }
      request.ready = true;
      busy();
      if (!running) travel(request);
    }).catch(error => {
      if (destroyed || request !== latest || request.settled) return;
      settle(request, 'error', error);
      busy();
      onError(error, request.scene); // Keep the current scene visible on failure.
    });
    return result;
  }

  function motionPreferenceChanged() {
    if (reduce.matches) activeAnimations.forEach(animation => { try { animation.finish(); } catch {} });
  }
  reduce.addEventListener?.('change', motionPreferenceChanged);

  return {
    show,
    get current() { return committed; },
    get moving() { return Boolean(running); },
    destroy() {
      destroyed = true;
      reduce.removeEventListener?.('change', motionPreferenceChanged);
      activeAnimations.forEach(animation => animation.cancel());
      activeAnimations = [];
      for (const request of new Set([latest, running].filter(Boolean))) {
        request.loaders.forEach(loader => loader.abort());
        settle(request, 'destroyed');
      }
      for (const list of original) for (const snapshot of list) {
        if (snapshot.style === null) snapshot.element.removeAttribute('style');
        else snapshot.element.setAttribute('style', snapshot.style);
        if (snapshot.hidden === null) snapshot.element.removeAttribute('aria-hidden');
        else snapshot.element.setAttribute('aria-hidden', snapshot.hidden);
      }
      stage.style.overflow = originalStage.overflow;
      if (originalStage.busy === null) stage.removeAttribute('aria-busy');
      else stage.setAttribute('aria-busy', originalStage.busy);
      delete stage.dataset.sceneState;
    },
  };
}

      let travelVersion=0;
      let confirmedScene={src:assets.serra,alt:'Cenário ilustrativo de uma casa na serra.',position:'55% 52%',viewState:{env:'serra',type:null,entry:null}};
      const camera=createEmeSceneTransition({stage:$('[data-camera]'),layers,initial:confirmedScene,onError:()=>announce('Não foi possível abrir o cenário. Tente novamente.')});
      async function changeScene(asset,direction='forward',position='55% 52%'){
        const version=++travelVersion;
        const label=state.entry?entryFor(state.type,state.entry).name:environments[state.env].label;
        const target={src:assets[asset],alt:'Cenário ilustrativo: '+label+'.',position,viewState:{env:state.env,type:state.type,entry:state.entry}};
        root.dataset.travel='moving';$('[data-copy]').inert=true;
        const result=await camera.show(target,direction);
        if(version!==travelVersion)return result;
        if(result.status==='committed'||result.status==='unchanged'){
          confirmedScene=target;
        }else if(result.status==='error'){
          hidePanel(false);
          Object.assign(state,confirmedScene.viewState);
          root.querySelectorAll('[data-env]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.env===state.env)));
          updateCopy();updatePath();
          await camera.show(confirmedScene,'back');
          if(version!==travelVersion)return result;
        }
        delete root.dataset.travel;$('[data-copy]').inert=state.panel||Boolean(searchMode);
        if(!state.panel&&!searchMode&&state.entry)$('[data-results-link]').focus({preventScroll:true});
        return result;
      }
      function announce(message){$('[data-live]').textContent=message;}
      function addPathButton(parent,label,handler,extraClass=''){
        const button=document.createElement('button');button.type='button';button.className='cursor-interaction '+extraClass;button.textContent=label;button.addEventListener('click',handler);parent.append(button);
      }
      function separator(parent){const mark=document.createElement('span');mark.className='em-separator';mark.textContent='/';mark.setAttribute('aria-hidden','true');parent.append(mark);}
      function updatePath(){
        const path=$('[data-path]');path.replaceChildren();
        if(state.type)addPathButton(path,'← Voltar',goBack,'em-back');
        if(state.type)addPathButton(path,environments[state.env].label,()=>setEnvironment(state.env));
        else{const label=document.createElement('span');label.textContent=environments[state.env].label;path.append(label);}
        if(state.type){separator(path);if(state.entry&&!state.panel)addPathButton(path,choices[state.type].label,()=>openType(state.type));else{const label=document.createElement('span');label.textContent=choices[state.type].label;path.append(label);}}
        path.hidden=!state.type;
        path.setAttribute('aria-label','Seu caminho: '+environments[state.env].label+(state.type?' / '+choices[state.type].label:'')+(state.entry?' / '+entryFor(state.type,state.entry).name:''));
      }
      function updateCopy(){
        const entry=state.entry&&entryFor(state.type,state.entry);
        root.dataset.level=entry?'cenario':'ambiente';
        $('[data-eyebrow]').textContent=entry?environments[state.env].label+' · '+choices[state.type].label:'Lugares para viver melhor';
        if(entry){$('[data-heading]').textContent=entry.name;$('[data-subtitle]').textContent=entry.summary;}
        else{$('[data-heading]').replaceChildren(document.createTextNode('Encontre'),document.createElement('br'),document.createTextNode('seu lugar.'));$('[data-subtitle]').replaceChildren(document.createTextNode('Um lugar que combina com você.'));}
        const link=$('[data-results-link]');link.hidden=!entry;
        if(entry){const params=new URLSearchParams({regiao:entry.region||environments[state.env].region,tipo:entry.type});link.href='#/colecao?'+params.toString();$('[data-results-label]').textContent=state.type==='casas'?'Ver casas':state.type==='apartamentos'?'Ver apartamentos':'Ver imóveis';}
        $('[data-bottom-label]').textContent='EME Select · '+environments[state.env].label;
      }
      function paintTypeButtons(){root.querySelectorAll('[data-type]').forEach(button=>button.setAttribute('aria-expanded',String(state.panel&&button.dataset.type===state.type)));}
      function hidePanel(animate=true){
        const version=++panelVersion;state.panel=false;root.dataset.panel='closed';panel.inert=true;$('[data-copy]').inert=false;paintTypeButtons();
        if(!animate||panel.hidden||reduced.matches){panel.hidden=true;return;}
        const animation=motion(panel,[{opacity:1,transform:'none'},{opacity:0,transform:'translate3d(-8px,0,0)'}],{duration:160,easing:'ease-in',fill:'forwards'});
        if(animation)animation.finished.catch(()=>{}).then(()=>{if(version===panelVersion)panel.hidden=true;animation.cancel();});else panel.hidden=true;
      }
      function renderOptions(){
        const data=choices[state.type];
        $('#em-panel-title').textContent=data.label;$('[data-panel-context]').textContent=environments[state.env].label+' · explorar';$('[data-panel-hint]').textContent=data.hint;
        const container=$('[data-options]');container.replaceChildren();
        for(const option of optionsFor(state.type)){
          const button=document.createElement('button');button.type='button';button.className='em-option cursor-interaction';button.dataset.option=option.id;
          const img=document.createElement('img');img.src=assets[getAsset(option)];img.alt='';img.setAttribute('aria-hidden','true');
          const copy=document.createElement('span'),name=document.createElement('strong'),summary=document.createElement('small'),arrow=document.createElement('span');
          name.textContent=option.name;summary.textContent=option.summary;copy.append(name,summary);arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');button.append(img,copy,arrow);
          button.addEventListener('click',()=>chooseOption(option.id));container.append(button);
        }
      }
      function openType(type,origin){
        if(!state.panel){returnState={type:state.type,entry:state.entry};panelOrigin=origin||root.querySelector('[data-type="'+type+'"]');}
        state.type=type;state.entry=null;state.panel=true;++panelVersion;root.dataset.panel='open';$('[data-copy]').inert=true;
        renderOptions();panel.hidden=false;panel.inert=false;paintTypeButtons();updatePath();
        motion(panel,[{opacity:0,transform:'translate3d(-10px,0,0)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.2,.75,.2,1)'});
        $('[data-close]').focus({preventScroll:true});announce(dataLabel(type)+' — escolha um cenário.');
      }
      function dataLabel(type){return choices[type].label;}
      function closeChoices(){
        hidePanel();state.type=returnState?.type||null;state.entry=returnState?.entry||null;updatePath();updateCopy();panelOrigin?.focus({preventScroll:true});
      }
      function chooseOption(id){
        const option=entryFor(state.type,id);state.entry=id;
        hidePanel();updateCopy();updatePath();
        changeScene(getAsset(option),'forward',option.position||'55% 52%');
        $('[data-results-link]').focus({preventScroll:true});announce(environments[state.env].label+' / '+choices[state.type].label+' / '+option.name+'. Cenário ilustrativo selecionado.');
      }
      function setEnvironment(env){
        state.env=env;state.type=null;state.entry=null;returnState=null;hidePanel();
        root.querySelectorAll('[data-env]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.env===env)));
        updateCopy();updatePath();changeScene(env,'lateral');announce('Ambiente '+environments[env].label+' selecionado.');
      }
      function goBack(){
        if(state.panel){closeChoices();return;}
        if(state.entry){const type=state.type;state.entry=null;updateCopy();changeScene(state.env,'back');openType(type);returnState={type:null,entry:null};return;}
        setEnvironment(state.env);
      }
function interpretEmeSearch(query) {
  const raw = String(query || '').trim().slice(0, 1200);
  let q = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[–—]/g, '-');
  const spoken={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10};
  q=q.replace(/\b(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)(?=\s+(?:milhao|milhoes|mil|quartos?|dormitorios?|vagas?)\b)/g,w=>spoken[w]).replace(/\b(\d+) (milhao|milhoes) e meio\b/g,(_,n,u)=>(Number(n)+0.5)+' '+u);
  const criteria = [], unverified = [];
  const add = (list, value) => { if (!list.includes(value)) list.push(value); };
  const negPrefix = /\b(?:nao(?:\s+(?:quero|queria|gostaria|busco|procuro|preciso|desejo|aceito|seja|pode ser))?|sem|evitar|exceto|dispenso)(?:\s+(?:de|um|uma|uns|umas|o|a|os|as|em|no|na|nos|nas|ser|estar|tipo|imovel|imoveis|casa|casas|apartamento|apartamentos|sala|salas|loja|lojas|galpao|galpoes|terreno|terrenos|lote|lotes)){0,5}\s*$/;
  function polarity(source) {
    let positive = false, negative = false;
    for (const m of q.matchAll(new RegExp('\\b(?:' + source + ')\\b', 'g'))) {
      const before = q.slice(0, m.index).split(/[;.!?]|,(?!\d)|\b(?:mas|porem)\b/).pop();
      const listNegation = /\b(?:nem|ou)\s*$/.test(before) && /\b(?:nao|sem|exceto|evitar|dispenso)\b/.test(before) && !/\b(?:e quero|e procuro|e busco)\b/.test(before);
      if (negPrefix.test(before) || listNegation) negative = true;
      else positive = true;
    }
    return {positive, negative};
  }
  const patterns = {
    casas: 'casas?|sobrados?|residencias?', apartamentos: 'apartamentos?|aptos?|apes?',
    comercial: 'comerciais|comercial', terrenos: 'terrenos?|lotes?|areas? rurais?|area rural|sitios?|chacaras?|fazendas?',
    bairro: 'bairro tranquilo|bairro calmo|rua tranquila|rua calma',
    condominio: 'condominios?|rua privativa', independente: 'independente|independentes|isolada|isoladas',
    cobertura: 'coberturas?|penthouses?', garden: 'garden|gardens|apartamento terreo|apartamentos terreos',
    loja: 'lojas?|pontos? comerciais?|ponto comercial', sala: 'salas? comerciais?|sala comercial|escritorios?',
    galpao: 'galpoes|galpao|armazens?|depositos?', rural: 'areas? rurais?|area rural|sitios?|chacaras?|fazendas?|campo',
    piscina: 'piscinas?', jardim: 'jardins?|jardim|quintais?|quintal', terraco: 'terracos?',
    residencial: 'residenciais|residencial', comprar: 'comprar|compra|adquirir', alugar: 'alugar|aluguel|locacao|locar',
    serra: 'serra|montanha|montanhas', litoral: 'litoral|praia|praias|beira-mar|frente ao mar', cidade: 'cidade|urbano|urbana'
  };
  const p = Object.fromEntries(Object.entries(patterns).map(([k,v]) => [k,polarity(v)]));
  const yes = k => p[k].positive && !p[k].negative;
  const no = k => p[k].negative && !p[k].positive;
  const labels = {casas:'Casas',apartamentos:'Apartamentos',comercial:'Comercial',terrenos:'Terrenos',bairro:'Bairro tranquilo',condominio:'Em condomínio',independente:'Casa independente',cobertura:'Cobertura',garden:'Apartamento garden',loja:'Loja',sala:'Sala comercial',galpao:'Galpão',rural:'Área rural',residencial:'Residencial'};
  for (const [k,label] of Object.entries(labels)) {
    if (yes(k)) add(criteria,label);
    if (no(k)) add(criteria, k==='condominio' ? 'Fora de condomínio' : 'Excluir: '+label.toLowerCase());
  }
  for (const [k,label] of [['comprar','Compra'],['alugar','Aluguel'],['serra','Na serra'],['litoral','No litoral'],['cidade','Na cidade']]) {
    if (yes(k)) add(unverified,label);
  }
  for (const [k,label] of [['piscina','piscina'],['jardim','jardim ou quintal'],['terraco','terraço']]) {
    if (yes(k)) add(unverified,'Com '+label);
    if (no(k)) add(unverified,'Sem '+label);
  }
  function quantity(n) {
    return Number(n.includes(',') ? n.replace(/\./g,'').replace(',','.') : /^\d{1,3}(?:\.\d{3})+$/.test(n) ? n.replace(/\./g,'') : n);
  }
  const money = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d+)?)\s*(milhoes|milhao|mil|k)?\b/g;
  for (const m of q.matchAll(money)) {
    const before=q.slice(Math.max(0,m.index-45),m.index);
    if (/^\s*(?:m[2²]?|metros?|ha|hectares?)(?:$|[\s.,])/.test(q.slice(m.index+m[0].length))) continue;
    const currency=/r\$/.test(m[0]);
    const unit=m[2] || '';
    const amount=quantity(m[1]) * (/milhao|milhoes/.test(unit)?1000000:/mil|k/.test(unit)?1000:1);
    if (!unit && !currency && !(amount>=1000 && /(?:ate|maximo|minimo|orcamento|preco|valor|entre|de|a partir de)\s*$/.test(before))) continue;
    if (!Number.isFinite(amount) || amount<=0) continue;
    const bound=/(?:ate|no maximo|maximo de?|limite de?)\s*$/.test(before)?'Até ':/(?:a partir de|pelo menos|no minimo|minimo de?)\s*$/.test(before)?'A partir de ':'';
    add(unverified,bound+'R$ '+amount.toLocaleString('pt-BR',{maximumFractionDigits:2}));
  }
  for (const m of q.matchAll(/\b(\d{1,2})\s*(quartos?|dormitorios?|dorms?|vagas?|garagens?)\b/g)) {
    const before=q.slice(Math.max(0,m.index-30),m.index);
    const bound=/(?:pelo menos|no minimo|minimo de?)\s*$/.test(before)?'No mínimo ':/(?:ate|no maximo|maximo de?)\s*$/.test(before)?'Até ':'';
    const n=Number(m[1]), noun=/vaga|garagem/.test(m[2])?'vaga':'quarto';
    add(unverified,bound+n+' '+noun+(n===1?'':'s'));
  }
  for(const m of q.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(m²|m2|metros? quadrados?|hectares?|ha)(?=$|[^\w])/g)) {
    const before=q.slice(Math.max(0,m.index-30),m.index);
    const bound=/(?:ate|no maximo)\s*$/.test(before)?'Até ':/(?:a partir de|no minimo|pelo menos)\s*$/.test(before)?'A partir de ':'';
    add(unverified,bound+quantity(m[1]).toLocaleString('pt-BR')+' '+(/ha|hectare/.test(m[2])?'ha':'m²'));
  }
  const cities=['Vacaria','Caxias do Sul','Porto Alegre','Gramado','Canela','Torres','Capão da Canoa','Xangri-lá','Bento Gonçalves','São Paulo','Rio de Janeiro','Balneário Camboriú','Florianópolis','Garopaba','Lages'];
  const fold=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for (const city of cities) {const loc=polarity(fold(city));if(loc.positive||loc.negative) add(unverified,(loc.negative&&!loc.positive?'Excluir localização: ':'Localização: ')+city);}
  for (const m of q.matchAll(/\b(?:na cidade de|cidade de|no municipio de|em)\s+([a-z][a-z -]{1,55})/g)) {
    const place=m[1].split(/\b(?:com|sem|ate|por|para|que|quero|procuro|e uma?|e um|no|na)\b/)[0].trim();
    if (!place || /\b(?:condominio|condominios|bairro|rua|casa|apartamento|um|uma|frente|torno|serra|litoral|cidade|area|lote|terreno|local|regiao|qualquer|boa|bom)\b/.test(place) || place.split(/\s+/).length>5) continue;
    if (!cities.some(c=>fold(c)===place)) {const loc=polarity(place);add(unverified,(loc.negative&&!loc.positive?'Excluir localização: ':'Localização: ')+place.replace(/\b[a-z]/g,c=>c.toUpperCase()));}
  }
  const center=polarity('bairro centro|no centro|regiao central');
  if(center.positive||center.negative) add(unverified,(center.negative&&!center.positive?'Excluir localização: ':'Localização: ')+'Centro');
  const scenes = [
    ['casas','bairro','bairro','Casa em bairro tranquilo',['bairro']],
    ['casas','condominio','condominio','Casa em condomínio fechado',['condominio']],
    ['casas','independente','casaindependente','Casa independente',['independente','piscina']],
    ['apartamentos','apartamento','apartamento','Apartamento',[]],
    ['apartamentos','cobertura','cobertura','Cobertura',['cobertura','terraco']],
    ['apartamentos','garden','garden','Apartamento garden',['garden','jardim']],
    ['comercial','loja','loja','Loja',['loja']],
    ['comercial','sala','sala','Sala comercial',['sala']],
    ['comercial','galpao','galpao','Galpão',['galpao']],
    ['terrenos','urbano','terreno','Lote residencial',['residencial']],
    ['terrenos','lote-condominio','lotecondominio','Lote em condomínio',['condominio','residencial']],
    ['terrenos','rural','rural','Área rural',['rural']]
  ];
  const types=new Set(['casas','apartamentos','comercial','terrenos'].filter(yes));
  const leafType={bairro:'casas',independente:'casas',cobertura:'apartamentos',garden:'apartamentos',loja:'comercial',sala:'comercial',galpao:'comercial',rural:'terrenos'};
  for (const [leaf,type] of Object.entries(leafType)) if(yes(leaf)) types.add(type);
  if (!types.size && yes('condominio')) {types.add('casas');types.add('terrenos');}
  const strict=Object.keys(leafType).filter(yes);
  const matches=scenes.map(([type,entry,asset,title,tags],i)=>{
    if (!types.has(type) || no(type) || tags.some(no)) return null;
    const specific=strict.filter(k=>leafType[k]===type);
    if (specific.length && !specific.some(k=>tags.includes(k))) return null;
    if (yes('condominio') && ['casas','terrenos'].includes(type) && !tags.includes('condominio')) return null;
    if (yes('residencial') && type==='terrenos' && !tags.includes('residencial')) return null;
    const reasons=['Cenário de '+({casas:'casa',apartamentos:'apartamento',comercial:'imóvel comercial',terrenos:'terreno'})[type]];
    let rank=0;
    for(const tag of tags) if(yes(tag)) {
      rank+=3;
      if(labels[tag]) add(reasons,labels[tag]);
      else if(tag==='piscina') add(reasons,'Piscina presente na imagem');
      else if(tag==='jardim') add(reasons,'Jardim presente na imagem');
      else if(tag==='terraco') add(reasons,'Terraço presente na imagem');
    }
    return {type,entry,asset,title,reasons,rank,i};
  }).filter(Boolean).sort((a,b)=>b.rank-a.rank||a.i-b.i).slice(0,3).map(({rank,i,...scene})=>scene);
  const understood=criteria.length>0 || unverified.length>0;
  const result={criteria,unverified,matches,understood};
  if(!matches.length) result.question=understood?'Você procura casa, apartamento, imóvel comercial ou terreno?':'O que você procura? Pode me dizer o tipo de imóvel e como imagina esse lugar.';
  else if(!['casas','apartamentos','comercial','terrenos'].some(yes) && yes('condominio')) result.question='Você pensa em uma casa ou em um lote em condomínio?';
  return result;
}

      const searchInput=$('[data-search-input]');
      const searchResults=$('[data-search-results]');
      const voicePanel=$('#em-voice');
      const searchBackdrops=['[data-copy]','.em-type-rail','.em-environments','[data-path]'];
      let searchMode=null;
      function setSearchMode(mode){
        if(mode!=='voice')stopVoice();
        if(state.panel)closeChoices();
        searchMode=mode;
        root.dataset.search=mode?'open':'closed';
        searchResults.hidden=mode!=='results';
        voicePanel.hidden=mode!=='voice';
        $('[data-search-mic]').setAttribute('aria-expanded',String(mode==='voice'));
        searchBackdrops.forEach(selector=>{$(selector).inert=Boolean(mode);});
        if(!mode)$('[data-copy]').inert=state.panel||root.dataset.travel==='moving';
      }
      function closeSearch(focus=true){
        const previousMode=searchMode;setSearchMode(null);
        if(focus)(previousMode==='voice'?$('[data-search-mic]'):searchInput).focus({preventScroll:true});
      }
      function openSearchMatch(match){
        closeSearch(false);
        if(match.entry==='rural'&&state.env==='cidade'){
          state.env='serra';
          root.querySelectorAll('[data-env]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.env==='serra')));
        }
        state.type=match.type;returnState={type:null,entry:null};chooseOption(match.entry);
      }
      function runNaturalSearch(){
        const query=searchInput.value.trim();
        if(!query){searchInput.focus();searchInput.reportValidity();return;}
        const answer=interpretEmeSearch(query);
        const found=publishedSearch(properties,answer);
        const list=$('[data-search-list]');list.replaceChildren();
        list.dataset.count=String(found.matches.length);
        $('[data-search-caption]').textContent=found.matches.length
          ? found.matches.length+' '+(found.matches.length===1?'imóvel publicado encontrado.':'imóveis publicados encontrados.')
          : 'Nenhum anúncio corresponde aos critérios identificados.';
        $('[data-understood]').hidden=!answer.understood;
        $('[data-search-criteria]').textContent=[...answer.criteria,...answer.unverified].join(' · ');
        const unverified=$('[data-search-unverified]');unverified.hidden=!found.pending.length;
        unverified.textContent='Confirme com a equipe: '+found.pending.join(' · ')+'.';
        for(const property of found.matches.slice(0,12)){
          const article=document.createElement('article');article.className='em-match';
          const frame=document.createElement('div');frame.className='em-match-image';
          const photo=propertyPhotos(property)[0];
          if(photo){const img=document.createElement('img');img.src=photo.url;img.alt=photo.caption||property.title;img.loading='lazy';frame.append(img);}
          const title=document.createElement('h3');title.textContent=property.title.toLocaleLowerCase('pt-BR').replace(/^./,c=>c.toUpperCase());
          const details=document.createElement('p');details.textContent=property.location+' · '+(property.price>0?property.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'Consulte a equipe');
          const link=document.createElement('a');link.className='em-result-property';link.href='#/imovel/'+encodeURIComponent(property.id);link.textContent='Conhecer imóvel →';
          article.append(frame,title,details,link);list.append(article);
        }
        $('[data-search-empty]').hidden=Boolean(found.matches.length);
        $('[data-search-question]').textContent=found.understood
          ? 'Experimente ajustar a localização, o tipo ou o valor. Você também pode consultar o catálogo completo.'
          : 'Descreva o tipo, a cidade ou a faixa de valor. Por exemplo: casa em Vacaria até 2 milhões.';
        setSearchMode('results');
        motion(searchResults,[{transform:'translateY(-12px)',opacity:.3},{transform:'none',opacity:1}],{duration:420,easing:'cubic-bezier(.2,.75,.2,1)'});
        $('[data-search-close]').focus({preventScroll:true});
        announce(found.matches.length+' imóveis encontrados nos anúncios publicados.');
      }
      $('[data-search-form]').addEventListener('submit',event=>{event.preventDefault();runNaturalSearch();});
      let recognition=null;
      function stopVoice(){
        if(!recognition)return;
        const previous=recognition;recognition=null;
        previous.onend=null;previous.onerror=null;previous.onresult=null;
        try{previous.abort();}catch{}
      }
      $('[data-search-mic]').addEventListener('click',()=>{
        if(searchMode==='voice'){closeSearch();return;}
        $('[data-transcript]').value=searchInput.value.trim();
        setSearchMode('voice');
        const status=$('[data-voice-status]');
        const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
        if(!SpeechRecognition){status.textContent='A voz não está disponível neste navegador. Digite seu pedido abaixo.';$('[data-transcript]').focus();return;}
        const instance=new SpeechRecognition();recognition=instance;
        instance.lang='pt-BR';instance.interimResults=true;instance.continuous=false;
        status.textContent='Ouvindo… Fale seu pedido. A transcrição é processada pelo serviço de voz do navegador.';
        instance.onresult=event=>{$('[data-transcript]').value=Array.from(event.results).map(result=>result[0].transcript).join(' ').slice(0,500);};
        instance.onerror=event=>{status.textContent=event.error==='not-allowed'?'Microfone não autorizado. Você pode digitar seu pedido.':'Não foi possível transcrever. Você pode digitar ou tentar novamente.';};
        instance.onend=()=>{if(status.textContent.startsWith('Ouvindo'))status.textContent='Confira o texto e toque em buscar.';if(recognition===instance)recognition=null;};
        try{instance.start();}catch{recognition=null;status.textContent='Não foi possível iniciar o microfone. Digite seu pedido.';}
        $('[data-voice-close]').focus({preventScroll:true});
      });
      $('[data-voice-close]').addEventListener('click',()=>closeSearch());
      $('[data-search-close]').addEventListener('click',()=>closeSearch());
      $('[data-refine]').addEventListener('click',()=>{searchInput.focus({preventScroll:true});searchInput.select();});
      $('[data-transcript-send]').addEventListener('click',()=>{
        const text=$('[data-transcript]').value.trim();
        if(!text){$('[data-transcript]').focus();announce('Digite o pedido para buscar.');return;}
        searchInput.value=text;runNaturalSearch();
      });
      $('[data-search-example]').addEventListener('click',()=>{searchInput.value='Quero uma casa em Vacaria';runNaturalSearch();});
      root.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&searchMode){event.stopImmediatePropagation();event.preventDefault();closeSearch();}
      },true);

      root.querySelectorAll('[data-env]').forEach(button=>button.addEventListener('click',()=>setEnvironment(button.dataset.env)));
      root.querySelectorAll('[data-type]').forEach(button=>button.addEventListener('click',()=>openType(button.dataset.type,button)));
      $('[data-close]').addEventListener('click',closeChoices);
      root.addEventListener('keydown',event=>{if(event.key==='Escape'){if(state.panel)closeChoices();else if(state.entry)goBack();}});
      updateCopy();updatePath();
    
      return () => {lifecycle.abort();stopVoice();travelVersion++;camera.destroy();root.getAnimations?.({subtree:true}).forEach(animation=>animation.cancel());};
}
