import {mountConsultants} from './consultants.js';
import {mountAnalytics} from './analytics.js';
import {mountEcosystem} from './ecosystem.js';
import './ecosystem.css';
import {mountSelectEntry} from './select-entry.js';
import template from './template.html?raw';
import assets from './assets.json';
import {mountExperience} from './runtime.js';
import {selectTeam} from '../team-profiles';
import './experience.css';
import './production.css';
import './header.css';
import './header-voice.css';
import './search-page.css';
import './opportunities.css';
import './opportunity-brand.css';
import './price.css';
import './chat.css';
import './editorial.css';
import '../mobile.css';
import './journey.css';
import './consultants.css';
import './select-refinement.css';

export async function startExperience(){
 const container=document.getElementById('root');
 container.innerHTML='<div class="experience-loading" role="status">Preparando a coleção EME Select…</div>';
 let properties=[],failed=false,siteContent=null,publicPeople=null;
 const contentRequest=fetch('/api/public/site-content',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json():null).catch(()=>null);
 const peopleRequest=fetch('/api/public/people',{cache:'no-store',signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json():null).catch(()=>null);
 try{
  const response=await fetch('/api/public/properties',{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json'))throw Error('Catálogo indisponível');
  const data=await response.json();if(!Array.isArray(data.properties))throw Error('Catálogo indisponível');properties=data.properties;
 }catch{failed=true;}
 container.innerHTML=template;
 const gallery=container.querySelector('.ep-gallery');
 const panel=document.createElement('div');panel.className='ep-detail-panel';
 panel.append(container.querySelector('.ep-price-block'),container.querySelector('.ep-top-actions'),container.querySelector('.ep-scene-copy'));gallery.append(panel);
 container.querySelector('.ep-photo-stage').append(container.querySelector('.ep-photo-count'));
 const allPhotos=document.createElement('button');allPhotos.type='button';allPhotos.className='ep-all-photos ec-plain';allPhotos.textContent='Ver todas as fotos →';allPhotos.setAttribute('aria-expanded','false');
 allPhotos.onclick=()=>{const expanded=allPhotos.getAttribute('aria-expanded')!=='true';allPhotos.setAttribute('aria-expanded',String(expanded));container.querySelector('.ep-chapters').classList.toggle('is-expanded',expanded);allPhotos.textContent=expanded?'Recolher fotos ↑':'Ver todas as fotos →';};
 container.querySelector('.ep-chapter-heading span').replaceWith(allPhotos);
 mountBrandArtwork(container);
 [siteContent,publicPeople]=await Promise.all([contentRequest,peopleRequest]);
 mountConsultants(container,publicPeople?.people);
 mountExperience(properties,{...assets},siteContent);
 mountSelectEntry(container,siteContent);
 mountEcosystem(container);
 if(failed){const notice=document.createElement('div');notice.className='experience-offline';notice.setAttribute('role','status');notice.append('Não foi possível atualizar os imóveis. ');const retry=document.createElement('button');retry.textContent='Tentar novamente';retry.onclick=()=>location.reload();notice.append(retry);container.append(notice);}
 container.querySelectorAll('img').forEach(img=>{img.decoding='async';if(!img.closest('.ec-scene,.ec-header'))img.loading='lazy';});
 addFooter(container);
 mountAnalytics(container);
}

function mountBrandArtwork(container){
 // Frame the supplied artwork without redrawing or altering its pixels.
 container.querySelectorAll('.ex-chat-symbol').forEach((symbol,index)=>{
  symbol.innerHTML=`<svg viewBox="126 114 996 1002" aria-hidden="true" focusable="false"><defs><clipPath id="eme-chat-art-${index}"><ellipse cx="624" cy="615" rx="485" ry="488"/><circle cx="985" cy="932" r="91"/></clipPath></defs><image href="/assets/experience/chat-select-20261022.webp" width="1254" height="1254" clip-path="url(#eme-chat-art-${index})"/></svg>`;
 });
}

function dialog(title,paragraphs){
 const box=document.createElement('dialog');box.className='experience-dialog';box.setAttribute('aria-label',title);
 const h=document.createElement('h2');h.textContent=title;box.append(h);
 paragraphs.filter(Boolean).forEach(copy=>{const p=document.createElement('p');p.textContent=copy;box.append(p);});
 const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>box.close();box.append(close);box.addEventListener('close',()=>box.remove());document.body.append(box);box.showModal();
}
function addFooter(container){
 const footer=container.querySelector('.ec-footer');
 const portal=document.createElement('a');portal.href='/acesso-select';portal.textContent='Acesso Select';
 const privacy=document.createElement('button');privacy.type='button';privacy.className='experience-privacy';privacy.textContent='Privacidade';privacy.onclick=()=>dialog('Privacidade',['No Acesso Select, usamos nome, e-mail, telefone e CPF ou CNPJ para analisar o cadastro e administrar o acesso. O documento fica restrito à administração; não aparece no catálogo nem no aviso de WhatsApp. A entrada na seleção reservada depende de aprovação humana. O aviso sobre o cadastro pelo WhatsApp é opcional e separado dos avisos de imóveis. Solicite revisão ou exclusão dos dados pelos canais de atendimento da EME.','Medimos visitas, páginas, seções e imóveis consultados para melhorar o site. O painel não recebe nomes, e-mails, telefones, mensagens, textos de busca ou endereços IP. Uma referência temporária de sessão é renovada após 30 minutos de inatividade e transformada diariamente no servidor. Os registros de medição ficam disponíveis por até 90 dias. Você pode desativar a medição no rodapé; sinais de não rastreamento do navegador também são respeitados.','Seus imóveis salvos e sua escolha de estado ficam apenas neste navegador. O histórico do M fica na memória desta página e é apagado ao recarregar ou iniciar uma nova conversa. Ao enviar uma mensagem, o conteúdo e o contexto público dos imóveis são processados pela OpenAI para gerar a resposta. A EME não grava esse histórico no portal; a API é usada com armazenamento de respostas desativado. O provedor aplica suas próprias regras de tratamento e retenção. Evite enviar documentos ou dados sensíveis.','Os pedidos de contato são enviados ao portal privado da EME somente quando você preenche os dados e autoriza o contato. O resumo do interesse acompanha esse pedido. No WhatsApp, o resumo e os imóveis são preparados para você revisar e enviar. Para solicitar informações ou exclusão de dados, fale com a equipe pelo canal de atendimento do site.','A busca por voz depende do serviço de reconhecimento do seu navegador e só inicia com sua ação e autorização de microfone. Confira a transcrição antes de buscar.','Ao abrir o WhatsApp ou outro serviço externo, aplicam-se também as regras desse serviço.']);
 footer.insertBefore(privacy,footer.lastElementChild);footer.insertBefore(portal,footer.lastElementChild);
}
