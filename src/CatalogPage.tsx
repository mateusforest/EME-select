import { profilesFor, locationProfiles } from '../shared/locations.mjs';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, MapPin, Ruler, Search, Share2, SlidersHorizontal, X } from 'lucide-react';
import { environments, environmentById, money, propertyFacts, propertyTypesForEnvironment, supportsBedrooms, type EnvironmentId, type Property } from './data';
import { catalogHash, DEFAULT_CATALOG_STATE, selectCatalog, validateCatalog, type CatalogState } from './catalog';
import './catalog.css';

interface CatalogPageProps {
  state: CatalogState;
  favorites: string[];
  comparison: string[];
  onFavorite: (id: string) => void;
  onCompare: (id: string) => void;
  onShare: () => void;
}

const collectionLabels: Record<string, string> = {
  Cobertura: 'Coberturas', Casa: 'Casas', Apartamento: 'Apartamentos', Compacto: 'Compactos', Cabana: 'Cabanas',
  'Condomínio horizontal': 'Horizontais', 'Condomínio vertical': 'Verticais',
  Loja: 'Lojas', 'Sala comercial': 'Salas comerciais', 'Edifício corporativo': 'Edifícios corporativos',
  'Terreno urbano': 'Terrenos urbanos', 'Lote em condomínio': 'Lotes em condomínio', 'Terra agrícola': 'Terras agrícolas',
  Galpão: 'Galpões', Pavilhão: 'Pavilhões', 'Centro de distribuição': 'Centros de distribuição',
};

export default function CatalogPage({ state, favorites, comparison, onFavorite, onCompare, onShare }: CatalogPageProps) {
  const [draft, setDraft] = useState(state);
  const [error, setError] = useState<string | null>(validateCatalog(state));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const items = selectCatalog(state);
  const region = environmentById(state.region);
  const types = ['', ...propertyTypesForEnvironment(draft.region).filter(Boolean)];
  const collections = [{ label: 'Todos os tipos', type: '' }, ...propertyTypesForEnvironment(state.region)
    .filter(type => type && type !== 'Condomínio')
    .map(type => ({ label: collectionLabels[type] || type, type }))];
  const showBedrooms = supportsBedrooms(draft.region, draft.type);

  useEffect(() => {
    setDraft(state);
    setError(validateCatalog(state));
  }, [state]);

  function update<K extends keyof CatalogState>(key: K, value: CatalogState[K]) {
    setDraft(previous => {
      const next = { ...previous, [key]: value };
      if (key === 'region') next.locationProfile = '';
      if (key === 'region' && next.type && !propertyTypesForEnvironment(next.region).includes(next.type)) next.type = '';
      if (!supportsBedrooms(next.region, next.type)) next.bedrooms = '';
      return next;
    });
    setError(null);
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalid = validateCatalog(draft);
    setError(invalid);
    if (invalid) return;
    window.location.hash = catalogHash(draft);
    setFiltersOpen(false);
  }

  const chips: { key: keyof CatalogState; label: string }[] = [];
  if (state.region !== 'todos') chips.push({ key: 'region', label: region.name });
  if (state.locationProfile) chips.push({ key: 'locationProfile', label: locationProfiles.find(p=>p.value===state.locationProfile)?.label||state.locationProfile });
  if (state.type) chips.push({ key: 'type', label: state.type });
  if (state.query) chips.push({ key: 'query', label: `“${state.query}”` });
  if (state.minPrice) chips.push({ key: 'minPrice', label: `A partir de ${money(Number(state.minPrice))}` });
  if (state.maxPrice) chips.push({ key: 'maxPrice', label: `Até ${money(Number(state.maxPrice))}` });
  if (state.minArea) chips.push({ key: 'minArea', label: `A partir de ${state.minArea} m²` });
  if (state.bedrooms && supportsBedrooms(state.region, state.type)) chips.push({ key: 'bedrooms', label: `${state.bedrooms}+ quartos` });

  return <main className="catalog-page" id="conteudo">
    <div className="catalog-breadcrumb">
      <a href={state.region === 'todos' ? '#/' : `#/ambientes/${state.region}`}><ArrowLeft size={15} /> Voltar aos ambientes</a>
      <span>Imóveis publicados · coleção EME Select</span>
    </div>

    <section className="catalog-intro" aria-labelledby="catalog-title">
      <div>
        <p className="eyebrow">A coleção EME Select</p>
        <h1 id="catalog-title">{state.type ? (state.type==='Condomínio horizontal'?'Casas em condomínio':state.type==='Condomínio vertical'?'Condomínios verticais':collectionLabels[state.type]||state.type) : 'Encontre o seu lugar.'}</h1>
        <p>Explore possibilidades. Perceba os detalhes. Escolha o que faz sentido para você.</p>
      </div>
      <button className="catalog-share" onClick={onShare}><Share2 size={17} /> Compartilhar busca <ArrowUpRight size={14} /></button>
    </section>

    <nav className="catalog-collections" aria-label="Coleções por tipo">
      {collections.map(collection => <a key={collection.label}
        href={catalogHash({ ...state, type: collection.type })}
        aria-current={state.type === collection.type ? 'page' : undefined}>
        {collection.label}<span aria-hidden="true">↗</span>
      </a>)}
    </nav>

    <div className="catalog-layout">
      <aside className={`catalog-filter-panel${filtersOpen ? ' catalog-filter-panel--open' : ''}`} aria-label="Filtros da coleção">
        <button className="catalog-mobile-filter" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(open => !open)}>
          <SlidersHorizontal size={17} /> Refinar minha busca <ChevronDown size={16} />
        </button>
        <form id="catalog-filters" onSubmit={apply} noValidate>
          <div className="catalog-filter-heading"><span className="eyebrow">Suas possibilidades</span><SlidersHorizontal size={18} strokeWidth={1.3} /></div>
          <label className="catalog-field" htmlFor="catalog-query"><span>O que você procura?</span><div className="catalog-search-input"><Search size={15} /><input id="catalog-query" value={draft.query} onChange={e => update('query', e.target.value)} maxLength={180} placeholder="Varanda, jardim, natureza…" /></div></label>
          <label className="catalog-field" htmlFor="catalog-operation"><span>Finalidade</span><select id="catalog-operation" value={draft.operation} onChange={e => { setDraft(previous => ({ ...previous, operation: e.target.value as CatalogState['operation'], minPrice: '', maxPrice: '' })); setError(null); }}><option value="comprar">Comprar</option><option value="alugar">Alugar</option></select></label>
          <label className="catalog-field"><span>Localização</span><select value={draft.locationProfile} onChange={e=>update('locationProfile',e.target.value)}>{profilesFor(draft.region).map(p=><option key={p.value} value={p.value}>{p.label}</option>)}</select></label><label className="catalog-field" htmlFor="catalog-region"><span>Ambiente</span><select id="catalog-region" value={draft.region} onChange={e => update('region', e.target.value as EnvironmentId)}>{environments.map(environment => <option key={environment.id} value={environment.id}>{environment.id === 'todos' ? 'Todos os ambientes' : environment.name}</option>)}</select></label>
          <label className="catalog-field" htmlFor="catalog-type"><span>Tipo de imóvel</span><select id="catalog-type" value={draft.type} onChange={e => update('type', e.target.value)}>{types.map(type => <option key={type} value={type}>{type || 'Todos os tipos'}</option>)}</select></label>

          <fieldset className="catalog-price-range"><legend>{draft.operation === 'alugar' ? 'Aluguel mensal · R$' : 'Valor de compra · R$'}</legend><div className="catalog-range-grid">
            <label className="catalog-field" htmlFor="catalog-min-price"><span>Valor mínimo</span><input id="catalog-min-price" type="number" inputMode="numeric" min="0" step="1" value={draft.minPrice} onChange={e => update('minPrice', e.target.value)} placeholder="Sem mínimo" aria-invalid={Boolean(error)} aria-describedby={error ? 'catalog-error' : undefined} /></label>
            <label className="catalog-field" htmlFor="catalog-max-price"><span>Valor máximo</span><input id="catalog-max-price" type="number" inputMode="numeric" min="0" step="1" value={draft.maxPrice} onChange={e => update('maxPrice', e.target.value)} placeholder="Sem máximo" aria-invalid={Boolean(error)} aria-describedby={error ? 'catalog-error' : undefined} /></label>
          </div></fieldset>
          <div className={`catalog-range-grid${showBedrooms ? '' : ' catalog-range-grid--single'}`}>
            <label className="catalog-field" htmlFor="catalog-area"><span>Área mínima</span><div className="catalog-unit-input"><input id="catalog-area" type="number" inputMode="numeric" min="0" step="1" value={draft.minArea} onChange={e => update('minArea', e.target.value)} placeholder="Todas" /><span aria-hidden="true">m²</span></div></label>
            {showBedrooms && <label className="catalog-field" htmlFor="catalog-bedrooms"><span>Quartos</span><select id="catalog-bedrooms" value={draft.bedrooms} onChange={e => update('bedrooms', e.target.value)}><option value="">Todos</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={String(n)}>{n} ou mais</option>)}</select></label>}
          </div>
          {(draft.region === 'terrenos' || draft.type === 'Terra agrícola') && <p className="catalog-filter-note">Área do terreno em m². Para converter hectares, 1 ha equivale a 10.000 m².</p>}
          {draft.operation === 'alugar' && <p className="catalog-filter-note">O filtro considera o aluguel. Condomínio e IPTU devem ser consultados separadamente.</p>}
          {error && <p className="catalog-error" id="catalog-error" role="alert">{error}</p>}
          <button className="primary-button catalog-apply" type="submit">Aplicar filtros <ArrowRight size={18} /></button>
          <a className="catalog-reset" href={catalogHash({ ...DEFAULT_CATALOG_STATE, operation: state.operation })} onClick={() => { setDraft({ ...DEFAULT_CATALOG_STATE, operation: state.operation }); setError(null); }}>Limpar filtros</a>
          <p className="catalog-filter-note">Busca por características cadastradas. Use os filtros para definir valores, área{showBedrooms ? ' e quartos' : ''}.</p>
        </form>
      </aside>

      <section className="catalog-results" aria-label="Imóveis da coleção">
        <div className="catalog-results-top">
          <p role="status"><strong>{String(items.length).padStart(2, '0')}</strong> {items.length === 1 ? 'possibilidade para explorar' : 'possibilidades para explorar'}</p>
          <label className="catalog-sort" htmlFor="catalog-sort"><span className="sr-only">Ordenar por</span><select id="catalog-sort" value={state.sort} onChange={e => { window.location.hash = catalogHash({ ...state, sort: e.target.value as CatalogState['sort'] }); }}><option value="curadoria">Ordem da coleção</option><option value="menor-preco">Menor valor</option><option value="maior-preco">Maior valor</option><option value="maior-area">Maior área</option></select><ChevronDown size={13} /></label>
        </div>

        {chips.length > 0 && <div className="catalog-active-filters" aria-label="Filtros ativos">{chips.map(chip => <a key={chip.key} href={catalogHash({ ...state, [chip.key]: DEFAULT_CATALOG_STATE[chip.key] })} aria-label={`Remover filtro ${chip.label}`}><span>{chip.label}</span><X size={12} /></a>)}</div>}

        <div className="catalog-property-list">
          {items.map(property => <CatalogProperty key={property.id} property={property} favorite={favorites.includes(property.id)} compared={comparison.includes(property.id)} onFavorite={() => onFavorite(property.id)} onCompare={() => onCompare(property.id)} />)}
        </div>

        {items.length === 0 && <div className="catalog-empty"><Search size={36} strokeWidth={1} /><h2>Vamos abrir<br /><em>novas possibilidades.</em></h2><p>{error ? 'Revise os valores para continuar sua busca.' : 'Ainda não há imóveis publicados para esta seleção. Fale com a EME ou explore outra categoria.'}</p><a className="primary-button" href={catalogHash({ operation: state.operation })}>Explorar a coleção <ArrowRight size={18} /></a></div>}
        {items.length > 0 && <div className="catalog-endnote"><span className="tiny-rule" /><p>Uma boa escolha começa com uma boa conversa.</p><a href="#/curadoria">Entenda nosso olhar <ArrowUpRight size={14} /></a></div>}
      </section>
    </div>
  </main>;
}

function CatalogProperty({ property, favorite, compared, onFavorite, onCompare }: { property: Property; favorite: boolean; compared: boolean; onFavorite: () => void; onCompare: () => void }) {
  const region = environmentById(property.environment);
  return <article className="catalog-property">
    <a className="catalog-property-image" href={`#/${property.hasInterior ? 'visita' : 'imovel'}/${property.id}`} aria-label={`Explorar ${property.title}`}><img src={property.image} alt={`${property.isIllustrative===false?'Fotografia':'Imagem ilustrativa'} de ${property.title}`} loading="lazy" decoding="async" /><span>{property.isIllustrative===false?'Fotografia do imóvel':'Imagem ilustrativa'}</span><span className="catalog-image-arrow"><ArrowUpRight size={22} strokeWidth={1.4} /></span></a>
    <div className="catalog-property-copy">
      <div className="catalog-property-top"><span className="eyebrow">{region.name} <span>/ {property.type}</span></span><button className="icon-button" aria-label={`${favorite ? 'Remover' : 'Salvar'} ${property.title} ${favorite ? 'dos' : 'nos'} favoritos`} aria-pressed={favorite} onClick={onFavorite}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} /></button></div>
      <h2><a href={`#/imovel/${property.id}`}>{property.title}</a></h2>
      <p className="catalog-property-location"><MapPin size={12} />{property.location}</p>
      <p className="catalog-property-reason">{property.reasons[0]}.</p>
      <div className="catalog-property-facts">{propertyFacts(property).filter(fact => !/^Suíte/.test(fact.label)).map((fact, index) => <span key={fact.label}>{index === 0 && <Ruler size={15} aria-hidden="true" />}<span>{fact.value}<small>{fact.label === 'Área' && property.environment === 'terrenos' ? 'Área do terreno' : fact.label}</small></span></span>)}</div>
      <div className="catalog-property-bottom"><div><span>{property.operation === 'alugar' ? 'Aluguel mensal' : 'Valor de venda'}</span><strong>{money(property.price)}{property.operation === 'alugar' && <small> / mês</small>}</strong></div><button className={`catalog-compare-button${compared ? ' is-compared' : ''}`} aria-pressed={compared} aria-label={`Comparar ${property.title}`} onClick={onCompare}><span className="catalog-checkbox">{compared && <Check size={11} />}</span>{compared ? 'Na comparação' : 'Comparar'}</button></div>
    </div>
  </article>;
}

