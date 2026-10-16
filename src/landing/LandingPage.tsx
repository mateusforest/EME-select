import {createPortal} from 'react-dom';
import TeamProfiles from '../TeamProfiles';
import {useLayoutEffect,useRef,useState} from 'react';
import {properties} from '../data';
import markup from './landing.html?raw';
import {mountLanding} from './landing-runtime.mjs';
import './landing.css';

export default function LandingPage({route='#/'}:{route?:string}){
  const host=useRef<HTMLDivElement>(null);
  const [teamHost,setTeamHost]=useState<HTMLElement|null>(null);
  useLayoutEffect(()=>{
    const element=host.current!;
    element.innerHTML=markup;
    const team=element.querySelector<HTMLElement>('#ef-equipe')!;team.replaceChildren();setTeamHost(team);
    window.scrollTo(0,0);
    document.title='EME Select · Encontre seu lugar';
    const dispose=mountLanding(element.querySelector<HTMLElement>('#eme-select-completa')!,properties,Object.fromEntries(new URLSearchParams(route.split('?')[1]||'')));
    if (new URLSearchParams(route.split('?')[1] || '').get('secao') === 'equipe') element.querySelector('#ef-equipe')?.scrollIntoView({block:'start'});
    return()=>{dispose();element.replaceChildren();};
  },[route]);
  return <><div ref={host}/>{teamHost&&createPortal(<TeamProfiles/>,teamHost)}</>;
}
