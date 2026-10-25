export function createHeaderVoice({input,button,panel,message,stop,cancel,Recognition}) {
 let active=null,previous='',failed=false;
 const idle=()=>{input.readOnly=false;button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Buscar por voz');panel.classList.remove('is-recording');stop.hidden=true;};
 function abort(){const recognition=active;active=null;if(recognition){recognition.onstart=recognition.onresult=recognition.onerror=recognition.onend=null;recognition.abort();}idle();}
 function dismiss(){if(active){abort();input.value=previous;}panel.hidden=true;input.focus();}
 function start(){
  if(active){active.stop();return;}
  panel.hidden=false;failed=false;previous=input.value;
  if(!Recognition){message.textContent='Voz indisponível neste navegador. Digite sua busca.';idle();return;}
  const recognition=new Recognition();active=recognition;recognition.lang='pt-BR';recognition.interimResults=true;recognition.continuous=true;
  input.readOnly=true;stop.hidden=false;button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Concluir gravação');message.textContent='Iniciando microfone…';
  recognition.onstart=()=>{panel.classList.add('is-recording');message.textContent='Ouvindo… diga o que procura.';};
  recognition.onresult=event=>{input.value=Array.from(event.results).map(r=>r[0].transcript).join(' ').slice(0,800);};
  recognition.onerror=event=>{failed=true;message.textContent=event.error==='not-allowed'?'Microfone não autorizado. Permita o acesso no navegador ou digite.':event.error==='no-speech'?'Não ouvimos sua voz. Tente novamente.':'Não foi possível transcrever. Tente novamente ou digite.';};
  recognition.onend=()=>{if(active!==recognition)return;active=null;idle();if(!failed)message.textContent=input.value!==previous?'Revise o texto e envie sua busca.':'Nenhuma fala recebida. Tente novamente.';input.focus();};
  try{recognition.start();}catch{abort();message.textContent='Não foi possível iniciar o microfone. Digite sua busca.';}
 }
 stop.addEventListener('click',()=>active?.stop());cancel.addEventListener('click',dismiss);
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();dismiss();}});
 return {start,finish:()=>{abort();panel.hidden=true;}};
}
