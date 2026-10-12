import {useLayoutEffect,useRef} from 'react';
import {properties} from '../data';
import markup from './landing.html?raw';
import {mountLanding} from './landing-runtime.mjs';
import './landing.css';

export default function LandingPage({route='#/'}:{route?:string}){
  const host=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const element=host.current!;
    element.innerHTML=markup;
    window.scrollTo(0,0);
    document.title='EME Select · Encontre seu lugar';
    const dispose=mountLanding(element.querySelector<HTMLElement>('#eme-select-completa')!,properties,Object.fromEntries(new URLSearchParams(route.split('?')[1]||'')));
    if (new URLSearchParams(route.split('?')[1] || '').get('secao') === 'equipe') element.querySelector('#ef-equipe')?.scrollIntoView({block:'start'});
    return()=>{dispose();element.replaceChildren();};
  },[route]);
  return <div ref={host}/>;
}
