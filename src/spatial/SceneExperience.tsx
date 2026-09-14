import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import gsap from 'gsap';
import { ArrowDown, ArrowRight, ArrowUpRight, ChevronDown, Heart, MapPin, Play, Search, SlidersHorizontal, X } from 'lucide-react';
import { environments, environmentById, properties, propertyFacts, propertyTypesForEnvironment, type Environment, type EnvironmentId, type Operation, type Property } from '../data';
import { catalogHash } from '../catalog';
import PhotographicHome from './PhotographicHome';
const goProperty = (p: Property) => `#/${p.hasInterior ? 'visita' : 'imovel'}/${p.id}`;
export default function ScenePage({ environment: env, onMotion, onFavorite, favorites }: { environment: Environment; onMotion: () => void; onFavorite: (id: string) => void; favorites: string[] }) {
  const [operation, setOperation] = useState<Operation>('comprar');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [region, setRegion] = useState<EnvironmentId>(env.id);
  const [selected, setSelected] = useState<Property | null>(null);
  const pageRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      gsap.from('.hero-copy > *', { opacity: 0, y: 12, duration: .72, stagger: .065, ease: 'power2.out' });
      gsap.from('.environment-selector', { opacity: 0, y: 7, duration: .6, delay: .2, ease: 'power2.out' });
    }, pageRef);
    return () => ctx.revert();
  }, [env.id]);
  useLayoutEffect(() => {
    if (!selected || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tween = gsap.fromTo(pageRef.current!.querySelector('.scene-selection'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .4, ease: 'power2.out' });
    return () => { tween.kill(); };
  }, [selected]);
  function search(event: FormEvent) {
    event.preventDefault();
    window.location.hash = catalogHash({ region, operation, type, query });
  }
  return <main className={`scene-page scene-page--spatial scene-page--${env.id} scene-page--photographic`} ref={pageRef} id="conteudo" data-environment-page={env.id}>
    <PhotographicHome environment={env} selectedId={selected?.id || null} onSelect={id => setSelected(properties.find(property => property.id === id) || null)} />
    <section className="hero-copy" aria-labelledby="hero-title">
      <p className="eyebrow"><span className="tiny-rule" /> {env.eyebrow || 'Lugares para viver melhor'}</p>
      <h1 id="hero-title">{env.title[0]}<em>{env.title[1]}</em></h1>
      <p className="hero-subtitle">{env.subtitle}</p>
      <form className="search-module" onSubmit={search} role="search" aria-label="Buscar imóveis">
        <div className="operation-tabs" role="group" aria-label="Finalidade">
          <button type="button" aria-pressed={operation === 'comprar'} onClick={() => setOperation('comprar')}>Comprar</button>
          <button type="button" aria-pressed={operation === 'alugar'} onClick={() => setOperation('alugar')}>Alugar</button>
        </div>
        <div className="search-line"><Search size={19} aria-hidden="true" /><label className="sr-only" htmlFor="property-search">O que você procura?</label><input id="property-search" value={query} onChange={e => setQuery(e.target.value)} placeholder={env.placeholder} maxLength={180} /><button aria-label="Buscar imóveis" type="submit"><ArrowRight size={22} /></button></div>
        <div className="search-filters">
          <div><MapPin size={14} /><label className="sr-only" htmlFor="search-region">Ambiente</label><select id="search-region" value={region} onChange={e => { const next = e.target.value as EnvironmentId; setRegion(next); if (!propertyTypesForEnvironment(next).includes(type)) setType(''); }}>{environments.map(item => <option key={item.id} value={item.id}>{item.id === 'todos' ? 'Todos os ambientes' : item.id === 'litoral' ? 'Litoral Norte' : item.id === 'serra' ? 'Serra Gaúcha' : item.name}</option>)}</select><ChevronDown size={12} /></div>
          <div><SlidersHorizontal size={14} /><label className="sr-only" htmlFor="search-type">Tipo de imóvel</label><select id="search-type" value={type} onChange={e => setType(e.target.value)}>{propertyTypesForEnvironment(region).map(option => <option key={option} value={option}>{option || 'Todos os tipos'}</option>)}</select><ChevronDown size={12} /></div>
        </div>
      </form>
      <a className="text-link collection-link" href={catalogHash({ region: env.id, operation })}>Conheça a coleção <ArrowUpRight size={16} /></a>
    </section>
    {selected && <aside className="scene-selection" aria-label="Imóvel selecionado">
      <div className="selection-top"><span className="eyebrow">Coleção {environmentById(selected.environment).name}</span><button className="icon-button" aria-label="Fechar imóvel selecionado" onClick={() => setSelected(null)}><X size={17} /></button></div>
      <h2>{selected.title}</h2><p className="selection-facts">{propertyFacts(selected).filter(fact => !fact.label.startsWith('Suíte')).slice(0, 4).map(fact => <span key={fact.label}>{fact.label === 'Área' ? fact.value : `${fact.label}: ${fact.value}`}</span>)}</p>
      <div className="selection-bottom"><a href={goProperty(selected)}>Explorar imóvel <ArrowRight size={19} /></a><button className="icon-button" aria-label={favorites.includes(selected.id) ? 'Remover dos favoritos' : 'Salvar nos favoritos'} aria-pressed={favorites.includes(selected.id)} onClick={() => onFavorite(selected.id)}><Heart size={19} fill={favorites.includes(selected.id) ? 'currentColor' : 'none'} /></button></div>
      <small>Imóvel ilustrativo · acervo demonstrativo</small>
    </aside>}
    <div className="scene-location"><MapPin size={14} /><span>{env.location}</span></div>
    <div className="scene-bottom">
      <div className="environment-selector"><p className="eyebrow"><span>{env.number} /</span> Escolha o ambiente</p><nav aria-label="Ambientes">{environments.map(e => <a href={e.id === 'todos' ? '#/' : `#/ambientes/${e.id}`} key={e.id} aria-current={e.id === env.id ? 'page' : undefined}>{e.id === 'todos' ? 'Todos' : e.name}</a>)}</nav></div>
    </div>
    <div className="scene-footnote"><span>Cenários e imóveis ilustrativos</span><button onClick={onMotion}><Play size={11} fill="currentColor" /> A essência da EME</button><a href="#/curadoria">Conheça nosso olhar <ArrowDown size={12} /></a></div>
  </main>;
}
