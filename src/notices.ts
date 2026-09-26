import './notices.css';
function notice(message:string,confirm=false):Promise<boolean>{
 return new Promise(resolve=>{
  const previous=document.activeElement as HTMLElement|null;
  const dialog=document.createElement('dialog');dialog.className='eme-notice';
  const heading=document.createElement('h2');heading.textContent=confirm?'Antes de continuar':'EME Select';heading.id='eme-notice-'+crypto.randomUUID();dialog.setAttribute('aria-labelledby',heading.id);
  const brand=document.createElement('span');brand.className='eme-notice-brand';brand.textContent='UM CUIDADO EM CADA DETALHE';
  const copy=document.createElement('p');copy.textContent=message;
  const actions=document.createElement('div');actions.className='eme-notice-actions';
  const finish=(answer:boolean)=>{dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();resolve(answer);};
  if(confirm){const cancel=document.createElement('button');cancel.textContent='Voltar';cancel.onclick=()=>finish(false);actions.append(cancel);}
  const proceed=document.createElement('button');proceed.className='eme-notice-primary';proceed.textContent=confirm?'Confirmar':'Entendi';proceed.onclick=()=>finish(true);actions.append(proceed);
  dialog.append(brand,heading,copy,actions);dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});document.body.append(dialog);dialog.showModal();(actions.firstElementChild as HTMLElement).focus();
 });
}
export const confirmAction=(message:string)=>notice(message,true);
export const showNotice=(message:string)=>notice(message);
