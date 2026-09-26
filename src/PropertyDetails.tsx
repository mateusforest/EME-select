import PropertyPresentation from './PropertyPresentation';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Bath, BedDouble, CarFront,
  FileText, Heart, LayoutTemplate, MapPin, Maximize2, MoveVertical, Ruler, Share2, Truck,
} from 'lucide-react';
import type { Property } from './data';
import { environmentById, money, propertyFacts, supportsBedrooms } from './data';
import './details.css';
import PropertyGallery from './PropertyGallery';

export interface PropertyDetailsProps {
  property: Property;
  preview?: boolean;
  favorite: boolean;
  onToggleFavorite: () => void;
  onBook: () => void;
  onDialog: (kind: 'documents' | 'plan' | 'location') => void;
  onShare: () => void;
}

export default function PropertyDetails({
  property, preview=false, favorite, onToggleFavorite, onBook, onDialog, onShare,
}: PropertyDetailsProps) {
  const environment = environmentById(property.environment);
  const collectionName = property.environment === 'urbano' ? 'Urbana' : environment.name;
  const visitHref = `#/visita/${property.id}`;
  const backHref = property.hasInterior ? visitHref : `/#/ambientes/${property.environment}`;
  const imageHref = property.hasInterior ? visitHref : property.image;
  const facts = propertyFacts(property).map(fact=>property.isIllustrative===false&&!property.area&&fact.label==='Área'?{...fact,value:'A informar'}:fact);
  const residential = supportsBedrooms(property.environment, property.type);
  const land = property.environment === 'terrenos';

  return (
    <main className="details-page" aria-labelledby="details-title">
      <div className="details-topline">
        <a className="details-back" href={backHref}>
          <ArrowLeft size={18} aria-hidden="true" />
          {property.hasInterior ? 'Voltar à visita' : `Voltar para ${environment.name}`}
        </a>
        <p className="details-demo">{preview?'Prévia em avaliação · dados a conferir':property.isIllustrative===false?'Imóvel da coleção EME Select':'Acervo demonstrativo · dados ilustrativos'}</p>
      </div>

      <div className="details-layout">
        <section className="details-visual" aria-label="Imagem e informações do ambiente">
          {property.isIllustrative===false?<PropertyGallery key={property.id} images={property.images||[]} title={property.title}/>:<a
            className={`details-image-link${property.hasInterior ? ' details-image-link--interior' : ''}`}
            href={imageHref}
            target={property.hasInterior ? undefined : '_blank'}
            rel={property.hasInterior ? undefined : 'noopener noreferrer'}
            aria-label={property.hasInterior ? `Explorar os ambientes de ${property.title}` : `Ampliar imagem ilustrativa de ${property.title} em nova aba`}
          >
            <img
              className="details-image"
              src={property.image}
              alt={property.hasInterior ? 'Sala integrada à varanda, com madeira, luz natural e vista para a cidade' : `Cenário ilustrativo da coleção ${environment.name}: ${property.title}`}
              fetchPriority="high"
            />
            <span className="details-image-label">Imagem ilustrativa</span>
            <span className="details-image-action">
              <Maximize2 size={18} aria-hidden="true" />
              {property.hasInterior ? 'Explorar em tela cheia' : 'Ampliar imagem'}
              {!property.hasInterior && <ArrowUpRight size={16} aria-hidden="true" />}
            </span>
          </a>}

          <div className="details-visual-links">
            <button type="button" className="details-feature-link" onClick={() => onDialog('plan')}>
              <LayoutTemplate className="details-feature-icon" size={32} strokeWidth={1.25} aria-hidden="true" />
              <span><strong>{land ? 'Área e implantação' : 'Planta do imóvel'}</strong><small>{land ? 'Dimensões e ocupação a consultar' : 'Distribuição dos espaços'}</small></span>
              <ArrowRight className="details-feature-arrow" size={21} aria-hidden="true" />
            </button>
            <button type="button" className="details-feature-link" onClick={() => onDialog('location')}>
              <MapPin className="details-feature-icon" size={33} strokeWidth={1.25} aria-hidden="true" />
              <span><strong>Localização e entorno</strong><small>{residential ? 'O lugar além da porta' : 'O lugar e suas conexões'}</small></span>
              <ArrowRight className="details-feature-arrow" size={21} aria-hidden="true" />
            </button>
          </div>

          <div className="details-story">
            <span className="details-eyebrow">{residential ? 'Uma forma de viver' : 'Possibilidades do espaço'}</span>
            <PropertyPresentation description={property.description} features={property.tags}/>
          </div>
        </section>

        <aside className="details-information" aria-label="Detalhes e curadoria do imóvel">
          <div className="details-heading-row">
            <p className="details-eyebrow">Coleção {collectionName}</p>
            <div className="details-utilities">
              <button
                className={`details-icon-button${favorite ? ' is-favorite' : ''}`}
                type="button"
                onClick={onToggleFavorite}
                aria-pressed={favorite}
                aria-label={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                title={favorite ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              ><Heart size={19} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" /></button>
              <button className="details-icon-button" type="button" onClick={onShare} aria-label="Compartilhar imóvel" title="Compartilhar imóvel">
                <Share2 size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          <h1 id="details-title" className="details-title">{property.title}</h1>
          <p className="details-location"><MapPin size={15} aria-hidden="true" />{property.location}</p>
          <div className="details-price-block">
            <span className="details-operation">{property.operation === 'alugar' ? 'Locação' : 'À venda'}</span>
            <p className="details-price">{property.isIllustrative===false&&!property.price?'Valor a informar':money(property.price)}{property.operation === 'alugar' && <span> / mês</span>}</p>
          </div>

          <div className="details-facts-block">
            <dl className="details-facts">
              {facts.map(fact => {
                const Icon = /^Quarto/.test(fact.label) ? BedDouble : /^Suíte/.test(fact.label) ? Bath : /^Vaga/.test(fact.label) ? CarFront : fact.label === 'Pé-direito' ? MoveVertical : /^Doca/.test(fact.label) ? Truck : Ruler;
                return <div key={fact.label}><Icon size={24} strokeWidth={1.4} aria-hidden="true" /><dt>{fact.label === 'Área' ? land ? 'Área do terreno' : 'Área informada' : fact.label}</dt><dd>{fact.value}</dd></div>;
              })}
            </dl>
            <p className="details-cost-note">{property.isIllustrative===false?`Condomínio mensal: ${property.condominiumFee==null?'consultar':money(property.condominiumFee)} · IPTU anual: ${property.propertyTax==null?'consultar':money(property.propertyTax)}${property.costNotes?' · '+property.costNotes:''}`:residential ? 'Condomínio e IPTU: consultar' : 'Tributos e encargos: consultar'}</p>
          </div>

          <dl className="details-extra-facts">{[["Banheiros",property.bathrooms],["Área total (m²)",property.totalArea],["Ano de construção",property.yearBuilt]].filter(([,v])=>v!=null).map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <section className="details-curation" aria-labelledby="details-curation-title">
            <div className="details-section-heading">
              <h2 id="details-curation-title">{preview?'Diferenciais em avaliação':'Curadoria EME'}</h2>
              <span className="details-small-label">O que chama atenção</span>
            </div>
            <ul className="details-reasons">
              {property.reasons.map(reason => <li key={reason}><span className="details-reason-dot" aria-hidden="true" />{reason}</li>)}
            </ul>
          </section>

          <section className="details-documents" aria-labelledby="details-documents-title">
            <div className="details-section-heading">
              <h2 id="details-documents-title">Documentação</h2>
              <span className="details-status">{property.isIllustrative===false?'Consultar a equipe':'Não verificada'}</span>
            </div>
            <p>{property.isIllustrative===false?'A equipe pode esclarecer o escopo e a data das verificações e orientar sobre a documentação atualizada para a negociação.':'Conheça as verificações previstas. Este imóvel de exemplo não passou por análise documental.'}</p>
            <button className="details-document-link" type="button" onClick={() => onDialog('documents')}>
              <FileText size={17} aria-hidden="true" />
              <span>Ver documentação e verificações</span>
              <ArrowRight size={19} aria-hidden="true" />
            </button>
          </section>

          <div className="details-cta-group">
            <button className="details-book" type="button" onClick={onBook}>
              <span>Agendar visita</span><ArrowRight size={23} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button className="details-conversation" type="button" onClick={onBook}>Conversar sobre este imóvel <ArrowUpRight size={15} aria-hidden="true" /></button>
          </div>
        </aside>
      </div>
      <div className="details-bottomline"><span>06 / Detalhes e curadoria</span><span>EME Select</span></div>
    </main>
  );
}
