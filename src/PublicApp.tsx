import App from './App';
import {useEffect,useState} from 'react';
import {registerPublishedProperties} from './data';
import './styles.css';
import './spatial/spatial.css';
import './spatial/photographic-home.css';
import './spatial/photographic-interior.css';
import './scene-navigation.css';
import './environments.css';
import './brand-header.css';
export default function PublicApp(){const [ready,setReady]=useState(false);useEffect(()=>{let active=true;const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),4000);fetch('/api/public/properties',{signal:controller.signal,cache:'no-store'}).then(async res=>{if(!res.ok||!res.headers.get('content-type')?.includes('application/json'))return;const data=await res.json();if(active&&Array.isArray(data.properties))registerPublishedProperties(data.properties);}).catch(()=>{}).finally(()=>{clearTimeout(timeout);if(active)setReady(true);});return()=>{active=false;controller.abort();clearTimeout(timeout);};},[]);return ready?<App/>:<div role="status" style={{padding:32,color:'#173c32'}}>Preparando a coleção…</div>;}

