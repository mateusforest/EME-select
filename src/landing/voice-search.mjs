/** Explicit capture → stop → review → send. Audio is transcribed by the browser. */
export function createVoiceSearch(root,{window:win=window,onSend,onCancel,signal}){
 const $=s=>root.querySelector(s),panel=$('#em-voice'),input=$('[data-transcript]'),status=$('[data-voice-status]'),send=$('[data-transcript-send]'),stop=$('[data-voice-stop]'),start=$('[data-voice-start]'),clock=$('[data-voice-time]');
 let recognition=null,ticker=null,deadline=null,started=0,phase='idle';
 const busy=()=>['starting','recording','stopping'].includes(phase);
 function setPhase(next,message){phase=next;panel.dataset.voiceState=next;status.textContent=message;input.readOnly=busy();send.disabled=busy()||!input.value.trim();stop.hidden=!['starting','recording','stopping'].includes(next);stop.disabled=next==='stopping';stop.textContent=next==='starting'?'Cancelar início':next==='stopping'?'Finalizando…':'Parar gravação';start.hidden=busy();start.textContent=input.value.trim()?'Continuar gravação':'Gravar novamente';}
 function clearTimers(){win.clearInterval(ticker);win.clearTimeout(deadline);ticker=null;deadline=null;}
 function detach(){const old=recognition;recognition=null;clearTimers();if(old){old.onstart=old.onresult=old.onerror=old.onend=null;try{old.abort();}catch{}}}
 function review(message){detach();setPhase('review',message||(input.value.trim()?'Gravação encerrada. Revise o texto e envie quando quiser.':'Não identificamos uma fala. Tente novamente ou digite seu pedido.'));}
 function capture(){
  detach();const Speech=win.SpeechRecognition||win.webkitSpeechRecognition;
  if(!Speech){setPhase('unavailable','Este navegador não oferece transcrição por voz. Você pode digitar e enviar seu pedido.');start.hidden=true;input.focus();return;}
  const prefix=input.value.trim();let instance;
  try{instance=new Speech();}catch{setPhase('error','Não foi possível iniciar. Tente novamente ou digite seu pedido.');return;}
  recognition=instance;instance.lang='pt-BR';instance.continuous=true;instance.interimResults=true;clock.textContent='00:00';
  setPhase('starting','Aguardando o microfone. Autorize o acesso no navegador, se solicitado.');
  deadline=win.setTimeout(()=>{if(recognition===instance)review('O microfone não iniciou. Confira a permissão e tente novamente.');},20000);
  instance.onstart=()=>{if(recognition!==instance||phase!=='starting')return;win.clearTimeout(deadline);started=Date.now();setPhase('recording','Gravando seu pedido. Quando terminar, toque em Parar gravação.');ticker=win.setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);clock.textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');},1000);stop.focus({preventScroll:true});};
  instance.onresult=event=>{if(recognition!==instance)return;const spoken=Array.from(event.results).map(r=>r[0].transcript).join(' ').trim();input.value=[prefix,spoken].filter(Boolean).join(' ').slice(0,500);if(input.value.length>=500&&phase==='recording')finish();};
  instance.onerror=event=>{if(recognition!==instance)return;const messages={'not-allowed':'Microfone não autorizado. Libere o acesso no navegador ou digite seu pedido.','service-not-allowed':'O serviço de voz não está disponível. Digite seu pedido.','audio-capture':'Microfone não encontrado. Confira o dispositivo ou digite seu pedido.','network':'A transcrição perdeu a conexão. O texto recebido foi preservado.','no-speech':'Não identificamos uma fala. Tente novamente ou digite seu pedido.'};review(messages[event.error]||'A gravação foi interrompida. Revise o texto ou tente novamente.');};
  instance.onend=()=>{if(recognition===instance)review();};
  try{instance.start();}catch{review('Não foi possível iniciar o microfone. Tente novamente ou digite seu pedido.');}
 }
 function finish(){if(!recognition)return;if(phase==='starting'){review('Início cancelado. Você pode tentar novamente ou digitar.');return;}if(phase!=='recording')return;win.clearInterval(ticker);setPhase('stopping','Finalizando a transcrição…');const current=recognition;deadline=win.setTimeout(()=>{if(recognition===current)review();},4000);try{current.stop();}catch{review();}}
 const cancel=()=>{detach();input.value='';setPhase('idle','Gravação cancelada.');};
 stop.addEventListener('click',finish,{signal});start.addEventListener('click',capture,{signal});
 $('[data-voice-cancel]').addEventListener('click',()=>{cancel();onCancel();},{signal});
 input.addEventListener('input',()=>{send.disabled=busy()||!input.value.trim();},{signal});
 send.addEventListener('click',()=>{if(busy()||!input.value.trim())return;const text=input.value.trim();detach();onSend(text);},{signal});
 win.addEventListener('pagehide',cancel,{signal});
 signal?.addEventListener('abort',cancel,{once:true});
 return {open(text=''){input.value=text.slice(0,500);capture();},cancel,stop:finish};
}
