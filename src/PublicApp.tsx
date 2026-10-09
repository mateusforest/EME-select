import App from './App';
import LandingPage from './landing/LandingPage';
import {useEffect,useState} from 'react';
import {registerPublishedProperties} from './data';
import './styles.css';
import './spatial/spatial.css';
import './spatial/photographic-home.css';
import './spatial/photographic-interior.css';
import './scene-navigation.css';
import './environments.css';
import './brand-header.css';
import './soft-relief.css';
export default function PublicApp(){
 const [route,setRoute]=useState(()=>window.location.hash||'#/');
 useEffect(()=>{const update=()=>setRoute(window.location.hash||'#/');window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 const isLanding=['#/','#','', '#/ambientes/todos'].includes(route.split('?')[0]);
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  document.documentElement.classList.add('eme-public');
  return()=>document.documentElement.classList.remove('eme-public');
 },[]);
 useEffect(()=>{
  let active=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),8000);
  fetch('/api/public/properties',{signal:controller.signal,cache:'no-store'}).then(async res=>{
   if(!res.ok||!res.headers.get('content-type')?.includes('application/json'))throw Error('Coleção indisponível');
   const data=await res.json();if(!Array.isArray(data.properties))throw Error('Coleção indisponível');
   if(active){registerPublishedProperties(data.properties);setFailed(false);}
  }).catch(()=>{if(active){registerPublishedProperties([]);setFailed(true);}}).finally(()=>{clearTimeout(timeout);if(active)setReady(true);});
  return()=>{active=false;controller.abort();clearTimeout(timeout);};
 },[attempt]);
 return ready?<>{isLanding?<LandingPage key={attempt}/>:<App key={attempt}/>}{failed&&<div role="status" className="collection-connection-notice">Não foi possível atualizar os anúncios. <button onClick={()=>{setReady(false);setAttempt(v=>v+1);}}>Tentar novamente</button></div>}</>:<div role="status" style={{padding:32,color:'#173c32'}}>Preparando a coleção…</div>;
}

