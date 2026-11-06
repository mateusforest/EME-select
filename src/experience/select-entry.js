import {mountAccessWelcome} from './select-welcome.js';
import {mountFeaturedDevelopment} from './moradas-feature';
import './select-entry.css';
const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
export function mountSelectEntry(root,siteContent){
 const access=root.querySelector('[data-section=owners]');access.removeAttribute('data-section');access.classList.add('es-access');access.textContent='Acesso Select';access.onclick=()=>location.assign('/acesso-select');
 for(const link of root.querySelectorAll('a[href="/acesso-select"]')){link.href='/acesso-select';link.textContent='Acesso Select';}
 const discovery=root.querySelector('.er-discovery');discovery.classList.add('es-discovery');for(const child of discovery.children)child.hidden=true;
 const panel=document.createElement('div');panel.className='es-selection';
 panel.innerHTML=`<section id="ef-moradas" aria-label="Empreendimento em destaque"></section><section class="es-search-panel" aria-labelledby="es-selection-title"><p class="es-eyebrow">DO SEU JEITO</p><h2 id="es-selection-title">Monte sua seleção.</h2><p class="es-search-intro">Escolha um lugar, um tipo de imóvel e a faixa de valor que faz sentido para você.</p><form><label>Região<select name="region"><option value="">Onde você procura?</option></select></label><label>Tipo de imóvel<select name="type"><option value="">O que você procura?</option><option>Casa</option><option>Apartamento</option><option>Terreno</option><option>Comercial</option></select></label><label>Faixa de valor<select name="max"><option value="">Ainda estou definindo</option><option value="400000">Até R$ 400 mil</option><option value="800000">Até R$ 800 mil</option><option value="1500000">Até R$ 1,5 milhão</option><option value="3000000">Até R$ 3 milhões</option></select></label><button type="submit"><span>Ver minha seleção</span>${arrow}</button></form><button type="button" class="es-region"><span>Prefiro explorar por região</span>${arrow}</button><p class="es-result" role="status" hidden></p></section>`;
 const regions=siteContent?.regions||[];const select=panel.querySelector('[name=region]');regions.forEach(r=>{const o=document.createElement('option');o.value=r.id;o.textContent=r.name;select.append(o);});
 const contentRoot=root.querySelector('#eme-continuo')||root;contentRoot.addEventListener('eme-site-content',event=>{const value=select.value;select.replaceChildren(new Option('Onde você procura?',''),...event.detail.regions.map(r=>new Option(r.name,r.id)));select.value=event.detail.regions.some(r=>r.id===value)?value:'';});
 panel.querySelector('form').onsubmit=e=>{e.preventDefault();const form=new FormData(e.currentTarget),search=Object.fromEntries(form);try{localStorage.setItem('eme.select.preferences',JSON.stringify(search));}catch{}const query=new URLSearchParams();for(const [key,value] of form)if(value)query.set(({region:'regiao',type:'tipo',max:'max'})[key],value);location.hash='#/colecao?'+query;};
 panel.querySelector('.es-region').setAttribute('data-region-picker','');discovery.append(panel);
 mountFeaturedDevelopment(panel.querySelector('#ef-moradas'));
 const empty=root.querySelector('.el-empty');if(empty){const alert=document.createElement('a');alert.href='/acesso-select?criar=1&alerta=1';alert.textContent='Criar acesso e autorizar um alerta para minha busca →';empty.append(alert);}
 mountAccessWelcome(root);
}
