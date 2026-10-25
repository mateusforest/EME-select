let presented=false;
export function mountAccessWelcome(container){
 const root=container.querySelector('#eme-continuo')||container;
 const orb=root.querySelector('.ex-chat-launch');orb.classList.add('eme-floating-chat');root.append(orb);
 // This flag lives only in this document: SPA navigation does not show it again,
 // while a fresh page load starts a new visit. No persistent dismissal cookie.
 const box=document.createElement('dialog');box.className='eme-access-welcome';box.setAttribute('aria-labelledby','eme-welcome-title');
 box.innerHTML=`<button type="button" class="eme-welcome-close" aria-label="Fechar convite">×</button><div class="eme-welcome-intro"><p class="eme-welcome-kicker">ACESSO SELECT</p><h2 id="eme-welcome-title">Um olhar além<br>do catálogo.</h2><p>Seu próximo lugar. Seus negócios.<br>Mais próximos de você.</p><div class="eme-welcome-benefits"><span>Seleção reservada</span><span>Imóveis exclusivos</span><span>Lançamentos em primeira mão</span></div></div><div class="eme-welcome-profiles"><article><span class="eme-welcome-number">01</span><h3>Para quem procura</h3><p>Conte o que faz sentido para você. Salve seus favoritos e receba novidades compatíveis com sua busca, com sua autorização.</p><a href="/acesso-select?criar=1">Criar meu acesso</a></article><article><span class="eme-welcome-number">02</span><h3>Para proprietários</h3><p>Já tem imóveis conosco? Acompanhe anúncios, visitas, propostas e documentos em um só lugar, com o apoio da equipe.</p><a href="/acesso-select">Acompanhar meus imóveis</a></article></div><footer><span>Já faz parte da EME?</span><a href="/acesso-select">Entrar no Acesso Select</a><button type="button" class="eme-welcome-explore">Continuar explorando</button></footer>`;
 let previous=null,eligible=false;
 const close=()=>box.close();box.querySelector('.eme-welcome-close').onclick=close;box.querySelector('.eme-welcome-explore').onclick=close;
 box.querySelectorAll('a').forEach(link=>link.addEventListener('click',close));
 box.addEventListener('click',e=>{if(e.target!==box)return;const r=box.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();});
 box.addEventListener('close',()=>{if(previous?.isConnected)previous.focus({preventScroll:true});});
 document.body.append(box);
 function refresh(){if(root.dataset.page!=='home'){if(box.open)box.close();return;}if(!eligible||presented||document.visibilityState==='hidden'||document.querySelector('dialog[open]'))return;presented=true;previous=document.activeElement;box.showModal();box.querySelector('.eme-welcome-close').focus({preventScroll:true});}
 new MutationObserver(refresh).observe(root,{attributes:true,attributeFilter:['data-page']});
 document.addEventListener('visibilitychange',refresh);
 fetch('/api/select/session',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(s=>{eligible=!s.user;refresh();}).catch(()=>{});
}
