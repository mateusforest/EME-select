import {useLayoutEffect,useRef} from 'react';
import {properties} from '../data';
import markup from './landing.html?raw';
import {mountLanding} from './landing-runtime.mjs';
import './landing.css';

export default function LandingPage(){
  const host=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const element=host.current!;
    element.innerHTML=markup;
    document.title='EME Select · Encontre seu lugar';
    const dispose=mountLanding(element.querySelector<HTMLElement>('#eme-select-completa')!,properties);
    return()=>{dispose();element.replaceChildren();};
  },[]);
  return <div ref={host}/>;
}
