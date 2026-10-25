import template from './innovation.html?raw';

const steps=[
 ['CURADORIA & PREFERÊNCIAS','Um ponto de partida\nmais próximo de você.','Região, tipo de imóvel e momento de vida ajudam a orientar a busca. Nosso olhar começa pelo que faz sentido para cada pessoa.','Mais contexto para encontrar boas possibilidades.'],
 ['VISUALIZAÇÃO & CONTEXTO','Veja o espaço.\nEntenda as possibilidades.','Fotografias, informações e experiências imersivas nos projetos que contam com esse recurso ajudam a compreender ambientes e imaginar diferentes usos.','Conhecer melhor para escolher com mais clareza.'],
 ['PROPOSTAS & RELACIONAMENTO','Mais clareza\npara o próximo passo.','Uma proposta bem apresentada organiza valores, condições e etapas. O atendimento próximo ajuda a esclarecer dúvidas e acompanhar a negociação.','Informação organizada. Relações com cuidado.'],
];

export function createInnovation(root){
 const page=document.createElement('div');page.className='innovation-page';page.hidden=true;page.innerHTML=template;
 const scroller=root.querySelector('.ec-page-scroll');scroller.append(page);
 const find=s=>page.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 // Keep anchors within the site's scroll container, without replacing the route.
 page.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');if(!link)return;
  const target=find(link.getAttribute('href'));if(!target)return;
  event.preventDefault();const offset=root.querySelector('.ec-header').offsetHeight+28;
  scroller.scrollTo({top:scroller.scrollTop+target.getBoundingClientRect().top-scroller.getBoundingClientRect().top-offset,behavior:reduced.matches?'instant':'smooth'});
  const heading=target.querySelector('h2,h3')||target;heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
 });
 const tabs=[...page.querySelectorAll('[data-step]')];
 function setStep(index){
  tabs.forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));button.tabIndex=i===index?0:-1;});
  find('#experience-panel').setAttribute('aria-labelledby',tabs[index].id);
  find('#experience-tag').textContent=steps[index][0];
  find('#experience-title').replaceChildren(...steps[index][1].split('\n').flatMap((line,i)=>i?[document.createElement('br'),document.createTextNode(line)]:[document.createTextNode(line)]));
  find('#experience-copy').textContent=steps[index][2];find('#experience-note').textContent=steps[index][3];
 }
 tabs.forEach((button,i)=>{
  button.addEventListener('click',()=>setStep(i));
  button.addEventListener('keydown',event=>{
   const index=({ArrowRight:(i+1)%tabs.length,ArrowLeft:(i+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1})[event.key];
   if(index===undefined)return;event.preventDefault();setStep(index);tabs[index].focus();
  });
 });
 let paused=reduced.matches;
 function motion(){
  page.classList.toggle('motion-paused',paused);find('#motion-toggle').textContent=paused?'Reproduzir animações':'Pausar animações';
  find('#motion-toggle').setAttribute('aria-pressed',String(paused));find('.eme-ecosystem').dataset.motionPaused=String(paused);
  root.dispatchEvent(new Event('eme-ecosystem-motion'));
 }
 find('#motion-toggle').onclick=()=>{paused=!paused;motion();};reduced.addEventListener('change',event=>{paused=event.matches;motion();});motion();
 const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');page.append(progress);
 let ticking=false;scroller.addEventListener('scroll',()=>{
  if(ticking||page.hidden)return;ticking=true;requestAnimationFrame(()=>{const range=scroller.scrollHeight-scroller.clientHeight;progress.style.transform=`scaleX(${range>0?scroller.scrollTop/range:0})`;ticking=false;});
 },{passive:true});
 const form=find('#idea-form'),result=find('#idea-result'),feedback=find('#idea-feedback'),send=find('#send-idea');
 let entry=null,requestId=crypto.randomUUID();
 form.addEventListener('submit',event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const data=new FormData(form);entry={name:data.get('nome').trim(),email:data.get('email').trim(),front:data.get('frente'),idea:data.get('ideia').trim(),url:data.get('link').trim()};
  find('#idea-summary').textContent=`${entry.name}\n${entry.email}\n${entry.front}\n\n${entry.idea}${entry.url?'\n\nApresentação: '+entry.url:''}`;
  form.hidden=true;result.hidden=false;feedback.textContent='';find('#idea-consent').focus({preventScroll:true});
 });
 find('#edit-idea').onclick=()=>{form.hidden=false;result.hidden=true;requestId=crypto.randomUUID();form.elements.nome.focus({preventScroll:true});};
 send.onclick=async()=>{
  if(!entry||send.disabled)return;
  if(!find('#idea-consent').checked){feedback.textContent='Autorize o uso dos dados para enviar sua ideia.';find('#idea-consent').focus();return;}
  send.disabled=true;find('#edit-idea').disabled=true;send.textContent='Enviando…';feedback.textContent='';
  try{
   const response=await fetch('/api/public/innovation',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',signal:AbortSignal.timeout(20000),body:JSON.stringify({...entry,requestId,consent:true})});
   const data=await response.json();if(!response.ok||data.reference!==requestId)throw Error(data.error||'Não foi possível confirmar o envio. Tente novamente.');
   const title=document.createElement('h4');title.textContent='Sua ideia chegou à EME.';
   const copy=document.createElement('p');copy.textContent='Obrigado por compartilhar. A equipe irá analisar sua proposta e poderá entrar em contato pelo e-mail informado.';
   const reference=document.createElement('p');reference.className='form-notice';reference.textContent='Protocolo: '+data.reference;
   result.replaceChildren(title,copy,reference);result.setAttribute('tabindex','-1');result.focus({preventScroll:true});
   form.reset();entry=null;
  }catch(error){feedback.textContent=error.message||'Não foi possível enviar. Seus dados continuam aqui para tentar novamente.';send.disabled=false;find('#edit-idea').disabled=false;send.textContent='Enviar à EME';}
 };
 return {page};
}
