import {useEffect, useState} from 'react';
import {showNotice} from '../notices';
import PropertyDetails from '../PropertyDetails';
import {api} from './api';
import {listingProperty, type Listing} from './listingModel';
import '../styles.css';

async function shareListing(item: Listing) {
  const isPublic = item.published && (!item.access || item.access.visibility === 'public');
  const path = isPublic ? '/imovel/' + encodeURIComponent(item.id) : location.pathname;
  const url = new URL(path, location.origin).href;
  const description = isPublic ? 'Anúncio publicado' : 'Prévia privada para a equipe com acesso ao imóvel';
  if (navigator.share) {
    try {
      await navigator.share({title: item.draft.title, text: description, url});
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    await showNotice(description + '. Link copiado.');
  } catch {
    await showNotice(description + '. Copie o link abaixo:\n' + url);
  }
}

export default function ListingPreview() {
  const [item, setItem] = useState<Listing|null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<Listing>('/listings/' + location.pathname.split('/').pop()).then(setItem).catch(e => setError(e.message));
  }, []);
  return <>
    <div style={{padding:'16px 24px',background:'#173c32',color:'#fff',fontSize:12,display:'flex',justifyContent:'space-between',gap:20}}>
      <span>Prévia privada · versão salva · não representa publicação</span>
      <a href="/acesso-select/equipe/imoveis" style={{color:'#fff'}}>Voltar ao portal</a>
    </div>
    {error ? <p role="alert">{error}</p> : item ? <PropertyDetails preview property={listingProperty(item)}
      favorite={false} onToggleFavorite={()=>{}}
      onBook={()=>void showNotice('Prévia privada. O contato estará disponível no anúncio publicado.')}
      onShare={()=>void shareListing(item)}
      onDialog={()=>void showNotice('Documentos e informações complementares devem ser conferidos com a equipe.')}
    /> : <p role="status">Preparando a prévia…</p>}
  </>;
}
