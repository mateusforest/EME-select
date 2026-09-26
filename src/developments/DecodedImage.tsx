import {useEffect,useState} from 'react';
export default function DecodedImage({src,alt}:{src:string;alt:string}){
 const [shown,setShown]=useState<{src:string;alt:string}|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;setFailed(false);const image=new Image();image.src=src;const timer=setTimeout(()=>{if(active)setFailed(true);},15000);image.decode().then(()=>{if(active){setShown({src,alt});setFailed(false);}clearTimeout(timer);}).catch(()=>{if(active)setFailed(true);clearTimeout(timer);});return()=>{active=false;clearTimeout(timer);};},[src,alt]);
 return <>{shown&&<img src={shown.src} alt={shown.alt}/>}<span className="development-gallery-loading" role="status">{failed?'Não foi possível carregar. Selecione outra imagem.':shown?.src!==src?'Carregando fotografia…':''}</span></>;
}
