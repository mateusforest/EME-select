import {selectTeam} from '../../shared/team-profiles.mjs';
const badge='<svg class="eme-verified" viewBox="0 0 24 24" role="img" aria-label="Consultor EME Select"><path fill="currentColor" d="m12 1 3 2 3.5.5 1.1 3.4L22 10l-.8 3.5.3 3.5-3 2-2 3-3.5-.4L9.5 22l-2.8-2.3-3.4-1.2L3 15 1 12l2-3 .5-3.5 3.4-1.1L10 2z"/><path d="m7 12 3.2 3.2L17 8.5" fill="none" stroke="#fffdf3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let consultants=[];
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
function name(person,tag='h3'){const n=el(tag,'eme-consultant-name',person.name),mark=el('span');mark.innerHTML=badge;n.append(mark);return n;}
function portrait(person){const img=el('img');img.src=person.photo;img.alt=person.name;img.width=120;img.height=120;img.loading='lazy';return img;}
function profile(person){
 const previous=document.activeElement,box=el('dialog','eme-consultant-dialog');box.setAttribute('aria-label',person.name);
 const close=el('button','eme-profile-close','×');close.type='button';close.setAttribute('aria-label','Fechar perfil');close.onclick=()=>box.close();
 const top=el('div','eme-profile-head'),copy=el('div');copy.append(el('p','eme-profile-kicker','SEU CONSULTOR EME'),name(person,'h2'),el('p','',person.role),el('small','',person.registration));top.append(portrait(person),copy);
 box.append(close,top,el('p','eme-profile-bio',person.bio));
 if(person.specialties?.length)box.append(el('p','eme-profile-specialties',person.specialties.join(' · ')));
 if(person.phone){const link=el('a','eme-profile-contact','Conversar com '+person.name.split(' ')[0]);link.href='https://wa.me/'+person.phone;link.target='_blank';link.rel='noopener noreferrer';box.append(link);}
 box.addEventListener('click',e=>{if(e.target===box){const r=box.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)box.close();}});
 box.addEventListener('close',()=>{box.remove();if(previous?.isConnected)previous.focus();});document.body.append(box);box.showModal();close.focus();
}
export function mountConsultants(root,publishedPeople){
 const people=Array.isArray(publishedPeople)?publishedPeople:selectTeam;
 consultants=people.filter(p=>/^CRECI\b/i.test(p.registration||'')).map(p=>{
  const approved=selectTeam.find(t=>t.registration===p.registration);
  return {...approved,...p,photo:p.photoUrl||p.photo,specialties:p.specialties||approved?.specialties||[],phone:approved?.phone||''};
 });
 const list=root.querySelector('.ec-team-list');list.replaceChildren();list.closest('.ec-team').hidden=!consultants.length;
 root.querySelector('.ec-team .ec-section-title').textContent='Fale com nossos consultores.';
 for(const person of consultants){const article=el('article'),button=el('button','eme-consultant-open'),copy=el('div');button.type='button';button.setAttribute('aria-label','Conhecer '+person.name);button.setAttribute('aria-haspopup','dialog');button.onclick=()=>profile(person);button.append(name(person));copy.append(button,el('p','',person.role),el('small','',person.registration));article.append(portrait(person),copy);list.append(article);}
}
export function renderPropertyConsultants(root,display,property){
 const panel=root.querySelector('.ep-person');panel.replaceChildren();
 const chosen=display?.mode==='fixed'?consultants.find(p=>p.id===display.personId):null;
 const people=chosen?[chosen]:consultants;
 const heads=el('div','ep-consultants');
 for(const person of people){const button=el('button','ep-consultant-mini');button.type='button';button.setAttribute('aria-label','Conhecer '+person.name);button.setAttribute('aria-haspopup','dialog');button.onclick=()=>profile(person);button.append(portrait(person),name(person,'span'));heads.append(button);}
 panel.append(heads);
 const direct=chosen?.phone,action=el(direct?'a':'button','ep-contact ec-action',direct?'Conversar com '+chosen.name.split(' ')[0]:'Conversar sobre este imóvel');
 if(direct){action.href='https://wa.me/'+chosen.phone+'?text='+encodeURIComponent('Olá! Gostaria de conversar sobre '+property.full+'.');action.target='_blank';action.rel='noopener noreferrer';}
 else {action.type='button';action.dataset.lead='contact';}
 panel.append(action,el('small','',direct?'Atendimento direto com este consultor.':'Conte seu interesse. A equipe direciona seu atendimento e confirma a disponibilidade.'));
}
