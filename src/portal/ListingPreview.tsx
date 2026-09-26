import {showNotice} from '../notices';
import {useEffect,useState} from 'react';
import {api} from './api';
import {listingProperty,type Listing} from './listingModel';
import PropertyDetails from '../PropertyDetails';
import '../styles.css';
export default function ListingPreview(){const [item,setItem]=useState<Listing|null>(null),[error,setError]=useState('');useEffect(()=>{api<Listing>('/listings/'+location.pathname.split('/').pop()).then(setItem).catch(e=>setError(e.message));},[]);return <><div style={{padding:'16px 24px',background:'#173c32',color:'#fff',fontSize:12,display:'flex',justifyContent:'space-between',gap:20}}><span>Prévia privada · versão salva · não representa publicação</span><a href="/portalselect/imoveis" style={{color:'#fff'}}>Voltar ao portal</a></div>{error?<p role="alert">{error}</p>:item?<PropertyDetails preview property={listingProperty(item)} favorite={false} onToggleFavorite={()=>{}} onBook={()=>void showNotice('Prévia privada. O contato estará disponível no anúncio publicado.')} onShare={()=>void showNotice('A prévia é privada. Publique o anúncio para compartilhar.')} onDialog={()=>void showNotice('Documentos e informações complementares devem ser conferidos com a equipe.')}/>:<p role="status">Preparando a prévia…</p>}</>;}
