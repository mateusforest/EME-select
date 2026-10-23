  function syncRoute(){
    if(!routingReady)return;
    const hash=view==='property'?'#/imovel/'+selectedId:view==='region'?'#/regiao/'+regionId:filterType?'#/colecao?tipo='+encodeURIComponent(filterType):'#/';
    if(location.hash!==hash)history.pushState(null,'',hash);
    document.title=(view==='property'?byId(selectedId)?.title:view==='region'?regionById(regionId).name:'Seu próximo lugar')+' — EME Select';
  }
  function applyRoute(){
    const before=routingReady;routingReady=false;
    const parts=location.hash.split('?')[0].replace(/^#\/?/,'').split('/');
    if(parts[0]==='colecao'){filterType=new URLSearchParams(location.hash.split('?')[1]||'').get('tipo');favoritesOnly=false;}
    if(['imovel','visita'].includes(parts[0])&&byId(parts[1]))openProperty(parts[1],false);
    else if(parts[0]==='regiao'&&regionById(parts[1]))showRegion(parts[1],{persist:false});
    else {showHome(parts[0]==='colecao'?'collection':null,false,true);if(['imovel','visita'].includes(parts[0]))status.textContent='Este imóvel não está disponível na coleção atual.';}
    routingReady=before;
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
