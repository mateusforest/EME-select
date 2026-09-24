import { profilesFor } from '../../shared/locations.mjs';
import { categoryTypes, sceneForLocation } from '../sceneCategories';
import { useMemo, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import gsap from 'gsap';
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, MapPin, Play, Search, SlidersHorizontal } from 'lucide-react';
import { environments,  propertyTypesForEnvironment, type Environment, type EnvironmentId, type Operation } from '../data';
import { catalogHash } from '../catalog';
import PhotographicHome from './PhotographicHome';
export default function ScenePage({ environment: env, onMotion }: { environment: Environment; onMotion: () => void; onFavorite: (id: string) => void; favorites: string[] }) {
  const [operation, setOperation] = useState<Operation>('comprar');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [region, setRegion] = useState<EnvironmentId>(env.id);
  const [locationProfile, setLocationProfile] = useState('');
  const scene = useMemo(()=>sceneForLocation(env,locationProfile),[env,locationProfile]);
  const pageRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from('.hero-copy > *', { opacity: 0, y: 12, duration: .72, stagger: .065, ease: 'power2.out' });
      gsap.from('.environment-selector', { opacity: 0, y: 7, duration: .6, delay: .2, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, [env.id]);

  function search(event: FormEvent) {
    event.preventDefault();
    window.location.hash = catalogHash({ region, operation, type, query, locationProfile });
  }
  return <main className={`scene-page scene-page--spatial scene-page--${env.id} scene-page--photographic`} ref={pageRef} id="conteudo" data-environment-page={env.id}>
    <PhotographicHome key={scene.image} environment={scene} selectedId={null} onSelect={id=>{const marker=scene.markers.find(m=>m.propertyId===id);if(marker)window.location.hash=catalogHash({region:env.id,operation,type:categoryTypes[marker.label]||'',locationProfile});}} />
    <section className="hero-copy" aria-labelledby="hero-title">
      <p className="eyebrow"><span className="tiny-rule" /> {env.eyebrow || 'Lugares para viver melhor'}</p>
      <h1 id="hero-title">{scene.title[0]}<em>{scene.title[1]}</em></h1>
      <p className="hero-subtitle">{scene.subtitle}</p>
      {profilesFor(env.id).length>1&&<div className="scene-location-tabs" role="group" aria-label="Localização no ambiente">{profilesFor(env.id).map(p=><button key={p.value} aria-pressed={locationProfile===p.value} onClick={()=>{setLocationProfile(p.value);setRegion(env.id);}}>{p.value?p.label:'Todas'}</button>)}</div>}
      <form className="search-module" onSubmit={search} role="search" aria-label="Buscar imóveis">
        <div className="operation-tabs" role="group" aria-label="Finalidade">
          <button type="button" aria-pressed={operation === 'comprar'} onClick={() => setOperation('comprar')}>Comprar</button>
          <button type="button" aria-pressed={operation === 'alugar'} onClick={() => setOperation('alugar')}>Alugar</button>
        </div>
        <div className="search-line"><Search size={19} aria-hidden="true" /><label className="sr-only" htmlFor="property-search">O que você procura?</label><input id="property-search" value={query} onChange={e => setQuery(e.target.value)} placeholder={env.placeholder} maxLength={180} /><button aria-label="Buscar imóveis" type="submit"><ArrowRight size={22} /></button></div>
        <div className="search-filters">
          <div><MapPin size={14} /><label className="sr-only" htmlFor="search-region">Ambiente</label><select id="search-region" value={region} onChange={e => { const next = e.target.value as EnvironmentId; setRegion(next);setLocationProfile(''); if (!propertyTypesForEnvironment(next).includes(type)) setType(''); }}>{environments.map(item => <option key={item.id} value={item.id}>{item.id === 'todos' ? 'Todos os ambientes' : item.id === 'litoral' ? 'Litoral Norte' : item.id === 'serra' ? 'Serra Gaúcha' : item.name}</option>)}</select><ChevronDown size={12} /></div>
          <div><SlidersHorizontal size={14} /><label className="sr-only" htmlFor="search-type">Tipo de imóvel</label><select id="search-type" value={type} onChange={e => setType(e.target.value)}>{propertyTypesForEnvironment(region).map(option => <option key={option} value={option}>{option || 'Todos os tipos'}</option>)}</select><ChevronDown size={12} /></div>
        </div>
      </form>
      <a className="text-link collection-link" href={catalogHash({ region: env.id, operation, locationProfile })}>Conheça a coleção <ArrowUpRight size={16} /></a>
    </section>

    <div className="scene-location"><MapPin size={14} /><span>{env.location}</span></div>
    <div className="scene-bottom">
      <div className="environment-selector"><p className="eyebrow"><span>{env.number} /</span> Escolha o ambiente</p><nav aria-label="Ambientes">{environments.map(e => <a href={e.id === 'todos' ? '#/' : `#/ambientes/${e.id}`} key={e.id} aria-current={e.id === env.id ? 'page' : undefined}>{e.id === 'todos' ? 'Todos' : e.name}</a>)}</nav></div>
    </div>
    <div className="scene-footnote"><span>Cenários ilustrativos · anúncios reais na coleção</span><button onClick={onMotion}><Play size={11} fill="currentColor" /> A essência da EME</button><a href="#/curadoria">Conheça nosso olhar <ArrowDown size={12} /></a></div>
  </main>;
}
