import {createRoot} from 'react-dom/client';
import LandingPage from '../landing/LandingPage';
import {registerPublishedProperties} from '../data';
export function mountPropertyLanding(container:HTMLElement,properties:any[]){
 registerPublishedProperties(properties);
 const home=container.querySelector('.ec-home');if(!home)return;
 const host=document.createElement('div');host.className='property-first-host';home.append(host);
 container.querySelector('#eme-continuo')?.classList.add('has-property-landing');
 createRoot(host).render(<LandingPage embedded/>);
}
