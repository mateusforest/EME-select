import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Plus, Share2, X } from 'lucide-react';
import { environmentById, formatArea, money, supportsBedrooms } from './data';
import type { Property } from './data';
import './comparison.css';

interface ComparisonProps {
  items: Property[];
  onRemove: (id: string) => void;
  onBook: (property: Property) => void;
  onShare: () => void;
  onClear: () => void;
  collectionHref?: string;
}

interface ComparisonRow {
  id: string;
  label: string;
  value: (property: Property) => string;
  render?: (property: Property) => ReactNode;
  relevant?: (property: Property) => boolean;
}

const residential = (property: Property) => supportsBedrooms(property.environment, property.type);
const industrial = (property: Property) => property.environment === 'industrial';
const countOrUnknown = (value: number | null | undefined) => value == null ? 'Não informado' : value.toLocaleString('pt-BR');
const areaLabel = (property: Property) => property.environment === 'terrenos' ? 'Área do terreno' : 'Área informada';

const comparisonRows: ComparisonRow[] = [
  {
    id: 'price', label: 'Valor', value: property => `${property.operation}:${property.price}`,
    render: property => <>
      <span className="cmp-operation">{property.operation === 'alugar' ? 'Locação · mensal' : 'À venda'}</span>
      <strong className="cmp-price">{money(property.price)}{property.operation === 'alugar' && <small> / mês</small>}</strong>
      <span className="cmp-value-note">{property.operation === 'alugar' ? 'Encargos não informados' : 'Custos da transação não informados'}</span>
    </>,
  },
  {
    id: 'area', label: 'Área informada', value: property => `${areaLabel(property)}:${formatArea(property)}`,
    render: property => <>{formatArea(property)}<span className="cmp-value-note">{areaLabel(property)}</span></>,
  },
  { id: 'bedrooms', label: 'Quartos', relevant: residential, value: property => residential(property) ? countOrUnknown(property.bedrooms) : 'Não se aplica' },
  { id: 'suites', label: 'Suítes', relevant: residential, value: property => residential(property) ? countOrUnknown(property.suites) : 'Não se aplica' },
  { id: 'parking', label: 'Vagas', value: property => countOrUnknown(property.parking) },
  { id: 'clear-height', label: 'Pé-direito', relevant: industrial, value: property => industrial(property) ? property.clearHeightM == null ? 'Não informado' : `${property.clearHeightM.toLocaleString('pt-BR')} m` : 'Não se aplica' },
  { id: 'docks', label: 'Docas', relevant: industrial, value: property => industrial(property) ? countOrUnknown(property.docks) : 'Não se aplica' },
  {
    id: 'region', label: 'Ambiente e localização', value: property => `${property.environment}:${property.location}`,
    render: property => <><span className="cmp-region-name">{environmentById(property.environment).name}</span><span className="cmp-value-note">{property.location}</span></>,
  },
  { id: 'type', label: 'Tipo de imóvel', value: property => property.type },
  {
    id: 'tags', label: 'Características', value: property => [...property.tags].sort().join('|'),
    render: property => <ul className="cmp-tags">{property.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>,
  },
  {
    id: 'reasons', label: 'O olhar da curadoria', value: property => [...property.reasons].sort().join('|'),
    render: property => <ul className="cmp-reasons">{property.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>,
  },
  {
    id: 'documents', label: 'Documentação', value: p => p.isIllustrative===false?'Consultar a equipe':'Não verificada',
    render: p => <><span className="cmp-document-state">{p.isIllustrative===false?'Consultar a equipe':'Não verificada'}</span><span className="cmp-value-note">{p.isIllustrative===false?'Solicite escopo e datas das verificações.':'Acervo de exemplo, sem análise documental realizada.'}</span></>,
  },
];

export default function Comparison({ items, onRemove, onBook, onShare, onClear, collectionHref = '#/colecao' }: ComparisonProps) {
  const [onlyDifferences, setOnlyDifferences] = useState(false);
  const selected = items.slice(0, 3);
  const canCompare = selected.length > 1;
  const relevantRows = comparisonRows.filter(row => !row.relevant || selected.some(row.relevant));
  const rows = relevantRows.filter(row => !onlyDifferences || !canCompare || new Set(selected.map(row.value)).size > 1);
  const mixedOperations = new Set(selected.map(property => property.operation)).size > 1;
  const includesNonResidential = selected.some(property => !residential(property));
  const omitted = relevantRows.length - rows.length;

  return <main id="conteudo" className="cmp-page" tabIndex={-1}>
    <div className="cmp-topline">
      <a className="cmp-back" href={collectionHref}><ArrowLeft size={15} aria-hidden="true" /> Voltar à coleção</a>
      <span className="cmp-demo">{selected.some(p=>p.isIllustrative===false)?'Seleção EME Select':'Acervo demonstrativo'}</span>
    </div>

    <header className="cmp-heading">
      <span className="cmp-eyebrow">Lado a lado · Sua seleção</span>
      <h1>O que faz sentido<br /><em>para você.</em></h1>
      <p>Veja os espaços, os detalhes e as possibilidades. A melhor escolha começa pelo que importa na sua vida.</p>
    </header>

    {selected.length === 0 ? <section className="cmp-empty" aria-labelledby="cmp-empty-title">
      <span className="cmp-empty-count" aria-hidden="true">01 — 02 — 03</span>
      <h2 id="cmp-empty-title">Dê espaço às suas possibilidades.</h2>
      <p>Escolha até três imóveis na coleção para olhar cada detalhe lado a lado.</p>
      <a className="cmp-button cmp-button--solid" href={collectionHref}>Explorar a coleção <ArrowRight size={16} aria-hidden="true" /></a>
    </section> : <>
      <div className="cmp-toolbar">
        <div className="cmp-selection-count"><span>{String(selected.length).padStart(2, '0')}</span><p>{selected.length === 1 ? 'imóvel na sua seleção' : 'imóveis na sua seleção'}<small>Até 3 possibilidades por comparação</small></p></div>
        <div className="cmp-toolbar-actions">
          {selected.length < 3 && <a className="cmp-text-button" href={collectionHref}><Plus size={15} aria-hidden="true" /> Adicionar imóvel</a>}
          <button type="button" className="cmp-text-button" onClick={onShare}><Share2 size={14} aria-hidden="true" /> Compartilhar seleção</button>
          <button type="button" className="cmp-text-button cmp-clear" onClick={onClear}>Limpar seleção</button>
        </div>
      </div>

      {!canCompare && <div className="cmp-one-note"><p><strong>Seu primeiro lugar está aqui.</strong> Adicione mais um imóvel para comparar as possibilidades.</p><a href={collectionHref}>Continuar explorando <ArrowRight size={14} aria-hidden="true" /></a></div>}

      <div className="cmp-options">
        <label className="cmp-differences"><input type="checkbox" checked={onlyDifferences} disabled={!canCompare} onChange={event => setOnlyDifferences(event.target.checked)} /><span>Mostrar apenas diferenças</span></label>
        <span className="cmp-scroll-hint">Deslize a tabela para ver todos os imóveis →</span>
        {canCompare && onlyDifferences && <span className="cmp-hidden-count" role="status">{omitted === 1 ? '1 critério igual oculto' : `${omitted} critérios iguais ocultos`}</span>}
      </div>

      {mixedOperations && <p className="cmp-mixed-note">Sua seleção reúne compra e locação. Os valores de locação são mensais.</p>}
      {includesNonResidential && <p className="cmp-mixed-note">As áreas seguem a medida indicada em cada imóvel. “Não se aplica” identifica um critério sem uso nesse tipo de imóvel; “Não informado” indica um dado ausente.</p>}

      <div className="cmp-table-scroll" role="region" aria-label="Comparação dos imóveis selecionados; use as setas para rolar a tabela" tabIndex={0}>
        <table className={`cmp-table cmp-table--${selected.length}`}>
          <caption className="sr-only">Comparação de {selected.length} {selected.length === 1 ? 'imóvel' : 'imóveis'} da seleção EME Select. Valores, imagens e características demonstrativos.</caption>
          <thead><tr>
            <th scope="col" className="cmp-row-label cmp-intro-cell"><span className="cmp-eyebrow">Cada detalhe<br />conta.</span></th>
            {selected.map((property, index) => <th scope="col" key={property.id} className="cmp-property-heading">
              <div className="cmp-property-topline"><span className="cmp-property-number">{String(index + 1).padStart(2, '0')}</span><button type="button" className="cmp-remove" onClick={() => onRemove(property.id)} aria-label={`Remover ${property.title} da comparação`}><X size={15} aria-hidden="true" /></button></div>
              <a className="cmp-property-image" href={`#/imovel/${property.id}`}><img src={property.image} alt={`${property.isIllustrative===false?'Fotografia':'Imagem ilustrativa'} de ${property.title}`} loading="lazy" /><span>{property.isIllustrative===false?'Fotografia do imóvel':property.hasInterior ? 'Ambiente ilustrativo' : 'Cenário ilustrativo'}</span></a>
              <span className="cmp-property-region">{environmentById(property.environment).name}</span>
              <a className="cmp-property-title" href={`#/imovel/${property.id}`}>{property.title}</a>
              <a className="cmp-details-link" href={`#/imovel/${property.id}`}>Conhecer o imóvel <ArrowRight size={13} aria-hidden="true" /></a>
            </th>)}
          </tr></thead>
          <tbody>
            {rows.map(row => <tr key={row.id} className={`cmp-data-row cmp-data-row--${row.id}`}><th scope="row" className="cmp-row-label">{row.label}</th>{selected.map(property => <td key={property.id}>{row.render ? row.render(property) : row.value(property)}</td>)}</tr>)}
            {rows.length === 0 && <tr><td className="cmp-no-differences" colSpan={selected.length + 1}>Os critérios disponíveis são iguais. Desative o filtro para conferir todos os detalhes.</td></tr>}
          </tbody>
          <tfoot><tr><th scope="row" className="cmp-row-label">Seu próximo passo</th>{selected.map(property => <td key={property.id}><button type="button" className="cmp-button cmp-button--solid cmp-book" onClick={() => onBook(property)}>Solicitar visita <ArrowRight size={15} aria-hidden="true" /></button><span className="cmp-book-note">Data e horário sujeitos à confirmação da equipe.</span></td>)}</tr></tfoot>
        </table>
      </div>

      <aside className="cmp-footnote"><span className="cmp-eyebrow">Um olhar atento</span><p>Imóveis, imagens e dados de exemplo. Os pontos de curadoria descrevem os conceitos apresentados e não representam vistoria, avaliação de mercado ou aprovação jurídica. Documentação e condições devem ser verificadas pela equipe antes de qualquer negociação.</p></aside>
    </>}
  </main>;
}
