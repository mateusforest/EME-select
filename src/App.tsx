import { useEffect, useMemo, useRef, useState } from 'react';
import ScenePage from './spatial/SceneExperience';
import ExploreEnvironments from './ExploreEnvironments';
import Tour from './spatial/InteriorExperience';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, MapPin, Menu, MessageCircle, Play, Search, X, FileText, ShieldCheck, ScanLine, Leaf } from 'lucide-react';
import { CONTACT, environments, environmentById, money, properties, propertyFacts, whatsappUrl, type Property } from './data';
import { BookingForm, OwnerForm } from './Forms';
import PropertyDetails from './PropertyDetails';
import { Dialog } from './ui';
import CatalogPage from './CatalogPage';
import Comparison from './Comparison';
import { catalogHash, parseCatalogHash } from './catalog';
import { useSceneNavigation } from './sceneNavigation';

type Modal = { kind: 'favorites' | 'motion' | 'privacy' } | { kind: 'booking' | 'documents' | 'plan' | 'location'; property?: Property };
const goProperty = (p: Property) => `#/${p.hasInterior ? 'visita' : 'imovel'}/${p.id}`;
const comparisonIds = (hash: string): string[] => [...new Set((new URLSearchParams(hash.split('?')[1] || '').get('ids') || '').split(',').filter(id => properties.some(p => p.id === id)))].slice(0, 3);
const comparisonHash = (ids: string[], returnTo = '#/colecao') => `#/comparar?ids=${ids.join(',')}${returnTo !== '#/colecao' ? `&retorno=${encodeURIComponent(returnTo)}` : ''}`;
const comparisonReturn = (hash: string) => catalogHash(parseCatalogHash(new URLSearchParams(hash.split('?')[1] || '').get('retorno') || '#/colecao'));

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const update = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', update);
    return () => { window.removeEventListener('hashchange', update); };
  }, []);
  return hash;
}

function Header({ tour, favorites, onFavorites, onContact }: { tour: boolean; favorites: number; onFavorites: () => void; onContact: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  const hash = useHash();
  useEffect(() => { setMenuOpen(false); setExploreOpen(false); }, [hash]);
  useEffect(() => {
    if (!exploreOpen) return;
    const outside = (event: globalThis.PointerEvent) => { if (!exploreRef.current?.contains(event.target as Node)) setExploreOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [exploreOpen]);
  return <header className={`site-header${tour ? ' site-header--tour' : ''}`}>
    <a className="brand brand--marble" href="#/" aria-label="EME Select — início">
      <img className="brand-monogram" src="/assets/brand-marble-monogram.png" width="76" height="64" alt="" />
    </a>
    <nav className="desktop-nav" aria-label="Navegação principal">
      <div className="desktop-explore-wrap" ref={exploreRef} onKeyDown={event => { if (event.key === 'Escape') { setExploreOpen(false); exploreRef.current?.querySelector('button')?.focus(); } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setExploreOpen(false); }}>
        <button className="desktop-explore-trigger" aria-expanded={exploreOpen} aria-controls="desktop-explore-menu" onClick={() => setExploreOpen(open => !open)}>Explorar <ChevronDown size={13} /></button>
        {exploreOpen && <div className="desktop-explore-menu" id="desktop-explore-menu">
          <div><span className="eyebrow">Por ambiente</span>{environments.map(e => <a key={e.id} href={e.id === 'todos' ? '#/' : `#/ambientes/${e.id}`}>{e.id === 'todos' ? 'Todos os ambientes' : e.name}<ArrowUpRight size={13} /></a>)}</div>
          <div><span className="eyebrow">Por tipo de imóvel</span>{[{ label: 'Casas', type: 'Casa' }, { label: 'Casas em condomínio', type: 'Casa', region: 'condominios' as const }, { label: 'Apartamentos', type: 'Apartamento' }, { label: 'Compactos', type: 'Compacto', operation: 'alugar' as const }, { label: 'Condomínios horizontais', type: 'Condomínio horizontal' }, { label: 'Condomínios verticais', type: 'Condomínio vertical' }, { label: 'Lojas', type: 'Loja' }, { label: 'Salas comerciais', type: 'Sala comercial' }, { label: 'Edifícios corporativos', type: 'Edifício corporativo' }, { label: 'Terrenos urbanos', type: 'Terreno urbano' }, { label: 'Lotes em condomínio', type: 'Lote em condomínio' }, { label: 'Terras agrícolas', type: 'Terra agrícola' }, { label: 'Galpões', type: 'Galpão' }, { label: 'Pavilhões', type: 'Pavilhão' }, { label: 'Centros de distribuição', type: 'Centro de distribuição', operation: 'alugar' as const }].map(item => <a key={`${item.region || 'todos'}:${item.type}`} href={catalogHash({ region: item.region, type: item.type, operation: item.operation || properties.find(property => property.type === item.type)?.operation || 'comprar' })}>{item.label}<ArrowUpRight size={13} /></a>)}</div>
          <a href="#/colecao">Explorar a coleção completa <ArrowRight size={17} /></a>
        </div>}
      </div>
      <a href="#/curadoria" aria-current={hash === '#/curadoria' ? 'page' : undefined}>Nossa curadoria</a>
      <a href="/enviar-imovel">Para proprietários</a>
    </nav>
    <div className="header-actions">
      <button className="icon-button header-heart" aria-label={`Meus favoritos, ${favorites} imóveis`} onClick={onFavorites}><Heart size={20} />{favorites > 0 && <span className="favorite-count">{favorites}</span>}</button>
      <button className="contact-button" onClick={onContact}>Fale com a EME <ArrowUpRight size={17} /></button>
      <button className="icon-button mobile-menu-toggle" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
    </div>
    {menuOpen && <nav className="mobile-menu" id="mobile-menu" aria-label="Menu móvel">
      <a href="#/colecao">A coleção completa<ArrowUpRight size={17} /></a>
      {environments.map(e => <a key={e.id} href={e.id === 'todos' ? '#/' : `#/ambientes/${e.id}`}>{e.name}<ArrowUpRight size={17} /></a>)}
      <a href="#/curadoria">Nossa curadoria<ArrowUpRight size={17} /></a><a href="/enviar-imovel">Para proprietários<ArrowUpRight size={17} /></a>
      <button onClick={() => { setMenuOpen(false); onContact(); }}>Fale com a EME<MessageCircle size={18} /></button>
    </nav>}
  </header>;
}

function PropertyRows({ items, favorites, comparison, onCompare, onFavorite, onClose }: { items: Property[]; favorites: string[]; comparison: string[]; onCompare: (id: string) => void; onFavorite: (id: string) => void; onClose: () => void }) {
  return <div className="property-rows">{items.map(p => <article className="property-row" key={p.id}>
    <a className="row-image" href={goProperty(p)} onClick={onClose}><img src={p.image} alt={`${p.isIllustrative===false?'Fotografia':'Imagem ilustrativa'}: ${p.title}`} loading="lazy" /></a>
    <div className="row-info"><p className="eyebrow">{environmentById(p.environment).name} <span> / {p.operation === 'comprar' ? 'Comprar' : 'Alugar'}</span></p><h3><a href={goProperty(p)} onClick={onClose}>{p.title}</a></h3><p>{propertyFacts(p).filter(fact => !fact.label.startsWith('Suíte')).slice(0, 4).map(fact => fact.label === 'Área' ? fact.value : `${fact.label}: ${fact.value}`).join(' · ')}</p><strong>{money(p.price)}{p.operation === 'alugar' && <small> / mês</small>}</strong></div>
    <div className="row-actions"><button className="icon-button" onClick={() => onFavorite(p.id)} aria-label={`${favorites.includes(p.id) ? 'Remover' : 'Salvar'} ${p.title} ${favorites.includes(p.id) ? 'dos' : 'nos'} favoritos`} aria-pressed={favorites.includes(p.id)}><Heart size={20} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} /></button><button className={`catalog-compare-button${comparison.includes(p.id) ? ' is-compared' : ''}`} aria-pressed={comparison.includes(p.id)} aria-label={`Comparar ${p.title}`} onClick={() => onCompare(p.id)}><span className="catalog-checkbox">{comparison.includes(p.id) && <Check size={11} />}</span>Comparar</button><a href={goProperty(p)} onClick={onClose} aria-label={`Explorar ${p.title}`}><ArrowUpRight size={24} strokeWidth={1.4} /></a></div>
  </article>)}</div>;
}

function CurationPage({ onContact, onMotion }: { onContact: () => void; onMotion: () => void }) {
  const steps = [
    { icon: Leaf, title: 'Um bom lugar para viver.', copy: 'Arquitetura, luz, conservação e relação com o entorno. Qualidade se revela no conjunto, em imóveis de diferentes valores.' },
    { icon: ScanLine, title: 'Contexto antes da escolha.', copy: 'Preço, referências da região, demanda e características do imóvel devem fazer parte de uma leitura criteriosa de mercado.' },
    { icon: FileText, title: 'Clareza em cada etapa.', copy: 'Documentação e pendências precisam ser identificadas, registradas e analisadas por profissionais responsáveis. Você acompanha o que foi verificado.' },
    { icon: ShieldCheck, title: 'Pessoas nas decisões.', copy: 'Tecnologia para organizar e agilizar. Uma equipe preparada para avaliar, orientar a negociação e acompanhar as decisões importantes.' },
  ];
  return <main className="editorial-page" id="conteudo"><div className="editorial-intro"><span className="eyebrow">Nosso olhar</span><h1>O especial está<br />em <em>escolher bem.</em></h1><p>A EME Select nasce para aproximar pessoas de imóveis que fazem sentido. Curadoria, inteligência e uma experiência cuidada em cada detalhe.</p><button className="text-link" onClick={onMotion}>Conheça a essência da marca <Play size={13} /></button></div><div className="curation-landscape"><img src="/assets/scene-serra.png" alt="Arquitetura integrada à natureza da serra, em cenário ilustrativo" /><span>Arquitetura. Contexto. Possibilidades.</span></div><section className="curation-principles" aria-label="Princípios da curadoria">{steps.map((step, i) => <article key={step.title}><div><span className="eyebrow">0{i + 1}</span><step.icon size={28} strokeWidth={1.2} /></div><h2>{step.title}</h2><p>{step.copy}</p></article>)}</section><section className="editorial-invitation"><span className="eyebrow">Uma conversa faz a diferença</span><h2>Conte o que você<br /><em>quer viver.</em></h2><button className="primary-button" onClick={onContact}>Converse com a EME <ArrowUpRight size={20} /></button></section></main>;
}

function OwnerPage() {
  return <main className="owners-page" id="conteudo"><section className="owners-intro"><span className="eyebrow">Para proprietários</span><h1>Seu imóvel.<br /><em>Um olhar à altura.</em></h1><p>Uma apresentação cuidadosa começa muito antes de um anúncio. Conte sobre o seu imóvel e dê o primeiro passo para uma avaliação pela nossa equipe.</p><ol><li><span>01</span><div><h2>Conhecemos o imóvel</h2><p>Características, localização, estado de conservação e seu objetivo.</p></div></li><li><span>02</span><div><h2>Construímos uma leitura</h2><p>Referências de mercado, documentação e critérios de entrada na coleção.</p></div></li><li><span>03</span><div><h2>Planejamos a apresentação</h2><p>Se selecionado, definimos juntos a estratégia de venda ou locação.</p></div></li></ol><p className="owners-note">O envio das informações inicia uma conversa e não garante a inclusão do imóvel no catálogo.</p></section><section className="owner-form-panel" aria-label="Apresentar meu imóvel"><OwnerForm onClose={() => { window.location.hash = '#/'; }} /></section></main>;
}

function Footer({ onPrivacy }: { onPrivacy: () => void }) { return <footer className="site-footer"><a href="#/">EME SELECT</a><span>Rio Grande do Sul · Acervo demonstrativo</span><button onClick={onPrivacy}>Privacidade</button><a href="/portalselect">Portal da equipe</a><a href={whatsappUrl('Olá! Gostaria de conhecer a EME Select.')} target="_blank" rel="noopener noreferrer">{CONTACT.display}<ArrowUpRight size={12} /></a></footer>; }

export default function App() {
  const hash = useSceneNavigation();
  const [modal, setModal] = useState<Modal | null>(null);
  const [toast, setToast] = useState('');
  const [comparison, setComparison] = useState<string[]>(() => window.location.hash.startsWith('#/comparar') ? comparisonIds(window.location.hash) : []);
  const [favorites, setFavorites] = useState<string[]>(() => { try { const saved: unknown = JSON.parse(localStorage.getItem('eme-select:favorites') || '[]'); return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string' && properties.some(p => p.id === id)) : []; } catch { return []; } });
  const frameRef = useRef<HTMLIFrameElement>(null);
  const parts = hash.split('?')[0].replace(/^#\/?/, '').split('/');
  const catalogState = useMemo(() => parseCatalogHash(hash), [hash]);
  const previousRoute = useRef(hash.split('?')[0]);
  const lastCatalog = useRef(comparisonReturn(hash));
  const property = properties.find(p => p.id === parts[1]);
  const environment = environmentById(parts[0] === 'ambientes' ? parts[1] : 'todos');
  const isScene = parts[0] === '' || (parts[0] === 'ambientes' && environments.some(e => e.id === parts[1]));
  const isTour = parts[0] === 'visita' && Boolean(property?.hasInterior);
  const close = () => setModal(null);
  useEffect(() => { try { localStorage.setItem('eme-select:favorites', JSON.stringify(favorites)); } catch { /* A navegação permanece disponível quando o armazenamento está bloqueado. */ } }, [favorites]);
  useEffect(() => {
    setModal(null);
    const currentRoute = hash.split('?')[0];
    if (previousRoute.current !== currentRoute) window.scrollTo(0, 0);
    previousRoute.current = currentRoute;
    if (parts[0] === 'colecao') lastCatalog.current = catalogHash(parseCatalogHash(hash));
    if (parts[0] === 'comparar') { setComparison(comparisonIds(hash)); lastCatalog.current = comparisonReturn(hash); }
    document.title = `${property?.title || (isScene ? environment.name === 'Todos os ambientes' ? 'Seu próximo lugar' : environment.name : parts[0] === 'colecao' ? 'A coleção' : parts[0] === 'comparar' ? 'Comparar imóveis' : parts[0] === 'curadoria' ? 'Nossa curadoria' : parts[0] === 'proprietarios' ? 'Para proprietários' : 'Página não encontrada')} — EME Select`;
  }, [hash]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 4000); return () => window.clearTimeout(timer); }, [toast]);
  useEffect(() => { const handler = (event: MessageEvent) => { if (event.origin === window.location.origin && event.source === frameRef.current?.contentWindow && event.data?.type === 'eme-select:close-intro') setModal(null); }; window.addEventListener('message', handler); return () => window.removeEventListener('message', handler); }, []);
  function toggleFavorite(id: string) { setFavorites(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]); }
  function toggleComparison(id: string) {
    if (comparison.includes(id)) { setComparison(comparison.filter(value => value !== id)); return; }
    if (comparison.length >= 3) { setToast('Você pode comparar até 3 imóveis por vez.'); return; }
    setComparison([...comparison, id]);
  }
  function removeComparison(id: string) { const next = comparison.filter(value => value !== id); setComparison(next); window.location.hash = comparisonHash(next, lastCatalog.current); }
  async function shareRoute(route: string, message: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${route}`); setToast(message); }
    catch { setToast('Não foi possível copiar. Você pode compartilhar o endereço desta página.'); }
  }
  async function share(p: Property) {
    const url = `${window.location.origin}${window.location.pathname}#/imovel/${p.id}`;
    try { await navigator.clipboard.writeText(url); setToast('Link do imóvel copiado.'); } catch { setToast('Copie o endereço desta página para compartilhar.'); }
  }
  const contact = () => setModal({ kind: 'booking', property });
  const modalProperty = modal && 'property' in modal ? modal.property : undefined;
  const landInquiry = modalProperty?.environment === 'terrenos';
  let modalTitle = '';
  if (modal) modalTitle = { favorites: 'Sua seleção', booking: 'Agendar uma visita', documents: 'Documentação e verificações', plan: 'Planta do imóvel', location: 'Localização e entorno', motion: 'A essência da EME', privacy: 'Sua privacidade' }[modal.kind];
  if (modal?.kind === 'plan' && landInquiry) modalTitle = 'Área e implantação';
  return <><a href="#conteudo" className="skip-link" onClick={event => { event.preventDefault(); const main = document.querySelector('main'); main?.setAttribute('tabindex', '-1'); main?.focus(); }}>Pular para o conteúdo</a><Header tour={isTour} favorites={favorites.length} onFavorites={() => setModal({ kind: 'favorites' })} onContact={contact} />
    {isScene ? <ScenePage key={environment.id} environment={environment} onMotion={() => setModal({ kind: 'motion' })} favorites={favorites} onFavorite={toggleFavorite} />
      : parts[0] === 'colecao' ? <CatalogPage state={catalogState} favorites={favorites} comparison={comparison} onFavorite={toggleFavorite} onCompare={toggleComparison} onShare={() => shareRoute(catalogHash(catalogState), 'Link da busca copiado.')} />
      : parts[0] === 'comparar' ? <Comparison items={comparison.map(id => properties.find(p => p.id === id)!)} collectionHref={lastCatalog.current} onRemove={removeComparison} onBook={p => setModal({ kind: 'booking', property: p })} onShare={() => shareRoute(comparisonHash(comparison, lastCatalog.current), 'Link da comparação copiado.')} onClear={() => { setComparison([]); window.location.hash = comparisonHash([], lastCatalog.current); }} />
      : isTour && property ? <Tour property={property} favorite={favorites.includes(property.id)} onFavorite={() => toggleFavorite(property.id)} onBook={contact} onShare={() => share(property)} />
      : parts[0] === 'imovel' && property ? <PropertyDetails property={property} favorite={favorites.includes(property.id)} onToggleFavorite={() => toggleFavorite(property.id)} onBook={contact} onShare={() => share(property)} onDialog={kind => setModal({ kind, property })} />
      : parts[0] === 'curadoria' ? <CurationPage onContact={contact} onMotion={() => setModal({ kind: 'motion' })} />
      : parts[0] === 'proprietarios' ? <OwnerPage />
      : <main className="empty-page" id="conteudo"><span className="eyebrow">Um novo caminho</span><h1>Vamos encontrar<br />o seu lugar.</h1><p>Esta página não está disponível.</p><a className="primary-button" href="#/">Voltar aos ambientes <ArrowRight size={19} /></a></main>}
    {isScene && environment.id === 'todos' && <ExploreEnvironments />}
    {!isTour && <Footer onPrivacy={() => setModal({ kind: 'privacy' })} />}
    {comparison.length > 0 && parts[0] !== 'comparar' && !modal && <aside className="comparison-tray" aria-label="Seleção para comparar"><div><strong>{comparison.length} de 3 imóveis</strong><small>{comparison.length < 2 ? 'Escolha mais um para comparar' : 'Uma escolha, diferentes perspectivas'}</small></div><button disabled={comparison.length < 2} onClick={() => { window.location.hash = comparisonHash(comparison, lastCatalog.current); }}>Comparar seleção <ArrowRight size={16} /></button><button className="icon-button" aria-label="Limpar comparação" onClick={() => setComparison([])}><X size={16} /></button></aside>}
    {modal && <Dialog title={modalTitle} onClose={close} wide={modal.kind === 'favorites' || modal.kind === 'motion'}>
      {modal.kind === 'favorites' && (() => { const items = properties.filter(p => favorites.includes(p.id)); return <><div className="results-intro"><p>{items.length} {items.length === 1 ? 'imóvel' : 'imóveis'} na sua seleção</p><span>{items.some(p=>p.isIllustrative===false)?'Sua seleção de imóveis':'Acervo demonstrativo · valores ilustrativos'}</span></div>{items.length ? <><div className="comparison-inline-action"><p>Escolha de 2 a 3 imóveis para comparar os detalhes.</p><button className="primary-button" disabled={comparison.length < 2} onClick={() => { window.location.hash = comparisonHash(comparison, lastCatalog.current); close(); }}>Comparar seleção <ArrowRight size={15} /></button></div><PropertyRows items={items} favorites={favorites} comparison={comparison} onCompare={toggleComparison} onFavorite={toggleFavorite} onClose={close} /></> : <div className="empty-state"><Search size={33} strokeWidth={1} /><h3>Guarde o que faz sentido.</h3><p>Toque no coração de um imóvel para reuni-lo nesta seleção.</p><a className="primary-button" href="#/colecao" onClick={close}>Conheça a coleção <ArrowRight size={18} /></a></div>}</>; })()}
      {modal.kind === 'booking' && <BookingForm property={modal.property} onClose={close} />}
      {modal.kind === 'motion' && <iframe ref={frameRef} className="motion-frame" src="/motion/preview.html" title="Apresentação animada EME Select" allow="fullscreen" />}
      {modal.kind === 'documents' && (modalProperty?.isIllustrative===false?<div className="information-panel"><span className="status-label">Informações da negociação</span><p>As verificações e os documentos privados são tratados pela equipe. Consulte o escopo, as datas e eventuais condições antes de negociar.</p><a className="primary-button" href={whatsappUrl(`Olá! Gostaria de esclarecer a documentação do imóvel ${modalProperty?.title}.`)} target="_blank" rel="noopener noreferrer">Consultar a equipe<ArrowUpRight size={18}/></a></div>:<div className="information-panel"><span className="status-label">Acervo demonstrativo</span><p>Este imóvel é ilustrativo. Não há certidões, matrícula ou parecer jurídico vinculado a ele.</p><h3>O que deverá compor a análise</h3><ul className="document-checklist">{['Matrícula atualizada e titularidade', 'Ônus, restrições e averbações', 'Débitos de IPTU e condomínio', 'Documentos dos proprietários', 'Regularidade construtiva e uso', 'Revisão jurídica e registro de pendências'].map(item => <li key={item}><FileText size={18} /><span>{item}</span><small>A verificar</small></li>)}</ul><p className="small-copy">A análise depende de documentos atualizados, do caso concreto e da revisão dos profissionais responsáveis. Nenhuma regularidade foi atestada neste exemplo.</p><a className="primary-button" target="_blank" rel="noopener noreferrer" href={whatsappUrl(`Olá! Gostaria de conhecer o processo de curadoria documental da EME Select.`)}>Conversar com a equipe <ArrowUpRight size={18} /></a></div>)}
      {modal.kind === 'plan' && (modalProperty?.isIllustrative===false?<div className="information-panel"><h3>Planta e medidas</h3><p>A área exibida no anúncio é informada pela equipe. Solicite a planta e os detalhes das medidas para conferir a adequação ao seu uso.</p><a className="primary-button" href={whatsappUrl(`Olá! Gostaria da planta e das medidas do imóvel ${modalProperty?.title}.`)} target="_blank" rel="noopener noreferrer">Solicitar informações<ArrowUpRight size={18}/></a></div>:<div className="information-panel"><ScanLine size={40} strokeWidth={1} /><h3>Cada espaço tem sua medida.</h3><p>{landInquiry ? 'Este terreno faz parte do acervo demonstrativo. As dimensões, o levantamento da área e as possibilidades de implantação podem ser discutidos com a equipe em uma consulta sobre um imóvel real.' : 'Este imóvel faz parte do acervo demonstrativo e ainda não possui uma planta técnica. A equipe pode orientar você sobre a documentação necessária para uma escolha real.'}</p><a className="primary-button" target="_blank" rel="noopener noreferrer" href={whatsappUrl(`Olá! Estou explorando o exemplo “${modalProperty?.title}” na EME Select e gostaria de conversar sobre ${landInquiry ? 'dimensões e implantação no terreno' : 'plantas e distribuição dos ambientes'}.`)}>{landInquiry ? 'Conversar sobre a área' : 'Conversar sobre a planta'} <ArrowUpRight size={18} /></a></div>)}
      {modal.kind === 'location' && (modalProperty?.isIllustrative===false?<div className="information-panel"><h3>{modalProperty?.location}</h3><p>O anúncio apresenta o bairro ou região. Consulte o endereço e combine a visita diretamente com a EME.</p><a className="primary-button" href={whatsappUrl(`Olá! Gostaria de conhecer a localização do imóvel ${modalProperty?.title}.`)} target="_blank" rel="noopener noreferrer">Consultar localização<ArrowUpRight size={18}/></a></div>:<div className="information-panel"><MapPin size={40} strokeWidth={1} /><h3>{modalProperty?.location}</h3><p>O cenário apresenta possibilidades nesta região. Como o imóvel é ilustrativo, não há endereço real ou ponto no mapa associado a ele.</p><a className="primary-button" href={whatsappUrl(`Olá! Tenho interesse em imóveis na região ${modalProperty?.location}. Podemos conversar?`)} target="_blank" rel="noopener noreferrer">Falar sobre a região <ArrowUpRight size={18} /></a></div>)}
      {modal.kind === 'privacy' && <div className="information-panel"><h3>Você escolhe o que compartilhar.</h3><p>Os favoritos são guardados apenas neste navegador. A ficha de envio de imóvel é revisada por você e, após sua confirmação e consentimento, fica armazenada de forma privada para avaliação e contato pela equipe autorizada.</p><p>Os pedidos de visita preparam uma mensagem que você revisa antes de abrir e enviar pelo WhatsApp. Ao usar esse canal, aplicam-se também as condições e a política de privacidade do serviço.</p><p>Não utilizamos ferramentas de publicidade ou análise de visitas nesta versão.</p><button className="secondary-button" onClick={() => { setFavorites([]); setToast('Sua seleção foi apagada deste navegador.'); }}>Apagar meus favoritos</button></div>}
    </Dialog>}
    <div className={`toast${toast ? ' toast--visible' : ''}`} role="status" aria-live="polite">{toast && <><Check size={17} />{toast}</>}</div>
  </>;
}
