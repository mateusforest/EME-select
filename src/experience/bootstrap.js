import template from './template.html?raw';
import assets from './assets.json';
import {mountExperience} from './runtime.js';
import './experience.css';
import './production.css';

export async function startExperience(){
 const container=document.getElementById('root');
 container.innerHTML='<div class="experience-loading" role="status">Preparando a coleção EME Select…</div>';
 let properties=[],failed=false;
 try{
  const response=await fetch('/api/public/properties',{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Catálogo indisponível');
  const data=await response.json();if(!Array.isArray(data.properties))throw Error('Catálogo indisponível');properties=data.properties;
 }catch{failed=true;}
 container.innerHTML=template;
 mountExperience(properties,{...assets});
 if(failed){const notice=document.createElement('div');notice.className='experience-offline';notice.setAttribute('role','status');notice.append('Não foi possível atualizar os imóveis. ');const retry=document.createElement('button');retry.textContent='Tentar novamente';retry.onclick=()=>location.reload();notice.append(retry);container.append(notice);}
 container.querySelectorAll('img').forEach(img=>{img.decoding='async';if(!img.closest('.ec-scene,.ec-header'))img.loading='lazy';});
 addFooter(container);
 void updatePeople(container);
}

function dialog(title,paragraphs){
 const box=document.createElement('dialog');box.className='experience-dialog';box.setAttribute('aria-label',title);
 const h=document.createElement('h2');h.textContent=title;box.append(h);
 paragraphs.filter(Boolean).forEach(copy=>{const p=document.createElement('p');p.textContent=copy;box.append(p);});
 const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>box.close();box.append(close);box.addEventListener('close',()=>box.remove());document.body.append(box);box.showModal();
}
function addFooter(container){
 const footer=container.querySelector('.ec-footer');
 const portal=document.createElement('a');portal.href='/portalselect';portal.textContent='Portal da equipe';
 const privacy=document.createElement('button');privacy.type='button';privacy.className='experience-privacy';privacy.textContent='Privacidade';privacy.onclick=()=>dialog('Privacidade',['Seus imóveis salvos e sua escolha de estado ficam apenas neste navegador. A conversa com o M permanece na memória da página durante a navegação.','Os pedidos de contato são enviados ao portal privado da EME somente quando você preenche os dados e autoriza o contato. Para solicitar informações ou exclusão de dados, fale com a equipe pelo canal de atendimento do site.','A busca por voz depende do serviço de reconhecimento do seu navegador e só inicia com sua ação e autorização de microfone. Confira a transcrição antes de buscar.','Ao abrir o WhatsApp ou outro serviço externo, aplicam-se também as regras desse serviço.']);
 footer.insertBefore(privacy,footer.lastElementChild);footer.insertBefore(portal,footer.lastElementChild);
}
async function updatePeople(container){
 try{
  const response=await fetch('/api/public/people',{signal:AbortSignal.timeout(10000)});if(!response.ok)return;const data=await response.json();if(!Array.isArray(data.people))return;
  const list=container.querySelector('.ec-team-list');list.replaceChildren();
  for(const person of data.people){const article=document.createElement('article');if(/^\/api\/people-images\/[a-f0-9-]{36}$/.test(person.photoUrl)){const img=document.createElement('img');img.src=person.photoUrl;img.alt=person.name;img.loading='lazy';article.append(img);}const copy=document.createElement('div'),title=document.createElement('h3'),button=document.createElement('button'),role=document.createElement('p');button.textContent=person.name;button.type='button';button.setAttribute('aria-label','Conhecer '+person.name);button.onclick=()=>dialog(person.name,[person.role,person.bio,person.registration]);title.append(button);role.textContent=[person.role,person.registration].filter(Boolean).join(' · ');copy.append(title,role);article.append(copy);list.append(article);}
  if(!data.people.length)list.textContent='Converse com a nossa equipe pelo atendimento EME Select.';
 }catch{/* A seleção e o atendimento continuam disponíveis. */}
}
