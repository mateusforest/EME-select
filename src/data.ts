export type EnvironmentId = 'todos' | 'litoral' | 'serra' | 'urbano' | 'condominios' | 'comercial' | 'terrenos' | 'industrial';
export type PropertyType = 'Casa' | 'Apartamento' | 'Compacto' | 'Cabana' | 'Cobertura'
  | 'Loja' | 'Sala comercial' | 'Edifício corporativo'
  | 'Terreno urbano' | 'Lote em condomínio' | 'Terra agrícola'
  | 'Galpão' | 'Pavilhão' | 'Centro de distribuição';
export type Operation = 'comprar' | 'alugar';
export type CondominiumKind = 'horizontal' | 'vertical';

const residentialTypes = ['Casa', 'Apartamento', 'Compacto', 'Cabana', 'Cobertura', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical'];
const commercialTypes = ['Loja', 'Sala comercial', 'Edifício corporativo'];
const landTypes = ['Terreno urbano', 'Lote em condomínio', 'Terra agrícola'];
const industrialTypes = ['Galpão', 'Pavilhão', 'Centro de distribuição'];

/** The empty value means any type; labels and values are shared by every filter. */
export const PROPERTY_TYPE_OPTIONS = ['', ...residentialTypes, ...commercialTypes, ...landTypes, ...industrialTypes];
export const PROPERTY_TYPE_OPTIONS_BY_ENVIRONMENT: Record<EnvironmentId, string[]> = {
  todos: PROPERTY_TYPE_OPTIONS,
  litoral: ['', 'Casa', 'Apartamento', 'Cobertura', 'Compacto', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical'],
  serra: ['', 'Casa', 'Cabana', 'Apartamento', 'Cobertura', 'Compacto', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical'],
  urbano: ['', 'Casa', 'Apartamento', 'Cobertura', 'Compacto', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical'],
  condominios: ['', 'Casa', 'Apartamento', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical'],
  comercial: ['', ...commercialTypes],
  terrenos: ['', ...landTypes],
  industrial: ['', ...industrialTypes],
};
export const propertyTypesForEnvironment = (environment: EnvironmentId): string[] => PROPERTY_TYPE_OPTIONS_BY_ENVIRONMENT[environment];

/** A mixed collection may use bedrooms; selecting any nonresidential scope clears it. */
export function supportsBedrooms(environment: EnvironmentId, type = ''): boolean {
  return !['comercial', 'terrenos', 'industrial'].includes(environment)
    && ![...commercialTypes, ...landTypes, ...industrialTypes].includes(type);
}

export interface Property {
  id: string;
  title: string;
  /** The geographic or use environment stays unchanged in cross-cutting collections. */
  environment: Exclude<EnvironmentId, 'todos' | 'condominios'>;
  condominium?: CondominiumKind;
  location: string;
  locationProfile?: string;
  type: PropertyType;
  operation: Operation;
  price: number;
  area: number;
  /** null means not applicable or not supplied, never a known zero. */
  bedrooms: number | null;
  suites: number | null;
  parking: number | null;
  clearHeightM?: number;
  docks?: number;
  isIllustrative?: boolean;
  tags: string[];
  reasons: string[];
  description: string;
  image: string;
  hasInterior?: boolean;
  images?: {url:string;caption:string;room?:string;width?:number;height?:number}[];
  bathrooms?:number|null;totalArea?:number|null;yearBuilt?:number|null;
  costNotes?:string;
  condominiumFee?:number|null;
  propertyTax?:number|null;
}

export interface SceneMarker {
  propertyId: string;
  x: number;
  y: number;
  label: string;
}

/** Condomínios is a collection of existing homes, never a second copy of a listing. */
export function propertyInEnvironment(property: Property, environment: EnvironmentId): boolean {
  return environment === 'todos' || (environment === 'condominios'
    ? property.condominium !== undefined
    : property.environment === environment);
}

export interface Environment {
  id: EnvironmentId;
  name: string;
  eyebrow?: string;
  number: string;
  title: [string, string];
  subtitle: string;
  placeholder: string;
  location: string;
  image: string;
  markers: SceneMarker[];
}

export const CONTACT = {
  phone: '5554991578029',
  display: '(54) 99157-8029',
  brand: 'EME Select',
};

export const environments: Environment[] = [
  {
    id: 'todos', name: 'Todos os ambientes', number: '01',
    title: ['Seu próximo lugar.', 'Uma escolha especial.'],
    subtitle: 'Imóveis selecionados. Uma nova forma de explorar.',
    placeholder: 'Descreva o lugar que você procura', location: 'Rio Grande do Sul',
    image: '/assets/scene-home-v2.png',
    markers: [
      { propertyId: 'serra-01', x: 58, y: 27, label: 'Casas' },
      { propertyId: 'litoral-02', x: 60, y: 69, label: 'Casas em condomínio' },
      { propertyId: 'urbano-01', x: 85, y: 22, label: 'Apartamentos' },
      { propertyId: 'urbano-02', x: 24, y: 56, label: 'Compactos' },
    ],
  },
  {
    id: 'litoral', name: 'Litoral', number: '02',
    title: ['Um novo ritmo.', 'Perto do mar.'],
    subtitle: 'Casas e apartamentos para viver o litoral.',
    placeholder: 'Como é o seu lugar no litoral?', location: 'Litoral Norte · RS',
    image: '/assets/scene-litoral.png',
    markers: [
      { propertyId: 'litoral-01', x: 33, y: 58, label: 'Casas de praia' },
      { propertyId: 'litoral-02', x: 65, y: 42, label: 'Condomínios horizontais' },
      { propertyId: 'litoral-03', x: 88, y: 21, label: 'Vista para o mar' },
    ],
  },
  {
    id: 'serra', name: 'Serra', number: '03',
    title: ['Seu refúgio.', 'Todos os dias.'],
    subtitle: 'Arquitetura e natureza para viver a serra.',
    placeholder: 'Como é o seu refúgio na serra?', location: 'Serra Gaúcha · RS',
    image: '/assets/scene-serra.png',
    markers: [
      { propertyId: 'serra-01', x: 56, y: 49, label: 'Casas na serra' },
      { propertyId: 'serra-02', x: 24, y: 61, label: 'Cabanas' },
      { propertyId: 'serra-03', x: 85, y: 29, label: 'Condomínios' },
    ],
  },
  {
    id: 'urbano', name: 'Urbano', number: '04',
    title: ['Perto de tudo.', 'No seu ritmo.'],
    subtitle: 'Apartamentos e compactos para viver a cidade.',
    placeholder: 'Como é o seu lugar na cidade?', location: 'Rio Grande do Sul',
    image: '/assets/scene-urbano.png',
    markers: [
      { propertyId: 'urbano-02', x: 43, y: 49, label: 'Compactos' },
      { propertyId: 'urbano-03', x: 86, y: 17, label: 'Condomínios verticais' },
      { propertyId: 'urbano-01', x: 83, y: 68, label: 'Apartamentos' },
    ],
  },
  {
    id: 'condominios', name: 'Condomínios', eyebrow: 'Formas de viver em conjunto', number: '05',
    title: ['Seu espaço.', 'Uma vida em conjunto.'],
    subtitle: 'Casas e apartamentos em condomínios.',
    placeholder: 'Encontre o seu lugar em condomínio', location: 'Rio Grande do Sul',
    image: '/assets/scene-condominios.png',
    markers: [
      { propertyId: 'litoral-02', x: 61, y: 71, label: 'Condomínios horizontais' },
      { propertyId: 'urbano-03', x: 85, y: 40, label: 'Condomínios verticais' },
    ],
  },
  {
    id: 'comercial', name: 'Comercial', eyebrow: 'Espaços para ir além', number: '06',
    title: ['Seu negócio.', 'No lugar certo.'],
    subtitle: 'Espaços selecionados para trabalhar, empreender e crescer.',
    placeholder: 'Busque o espaço para o seu negócio', location: 'Rio Grande do Sul',
    image: '/assets/scene-comercial.png',
    markers: [
      { propertyId: 'comercial-01', x: 31, y: 66, label: 'Lojas' },
      { propertyId: 'comercial-02', x: 59, y: 41, label: 'Salas comerciais' },
      { propertyId: 'comercial-03', x: 84, y: 24, label: 'Edifícios corporativos' },
    ],
  },
  {
    id: 'terrenos', name: 'Terrenos', eyebrow: 'Terrenos e Terras', number: '07',
    title: ['Espaço para crescer.', 'Terra para realizar.'],
    subtitle: 'Terrenos urbanos, lotes em condomínio e terras agrícolas.',
    placeholder: 'Encontre o terreno para o seu projeto', location: 'Rio Grande do Sul',
    image: '/assets/scene-terrenos.png',
    markers: [
      { propertyId: 'terrenos-01', x: 34, y: 68, label: 'Terrenos urbanos' },
      { propertyId: 'terrenos-02', x: 60, y: 46, label: 'Lotes em condomínio' },
      { propertyId: 'terrenos-03', x: 84, y: 24, label: 'Terras agrícolas' },
    ],
  },
  {
    id: 'industrial', name: 'Industrial', eyebrow: 'Industrial e Logístico', number: '08',
    title: ['Espaço para operar.', 'Estrutura para crescer.'],
    subtitle: 'Galpões, pavilhões e centros de distribuição selecionados.',
    placeholder: 'Encontre o espaço para sua operação', location: 'Rio Grande do Sul',
    image: '/assets/scene-industrial.png',
    markers: [
      { propertyId: 'industrial-01', x: 32, y: 65, label: 'Galpões' },
      { propertyId: 'industrial-02', x: 60, y: 42, label: 'Pavilhões' },
      { propertyId: 'industrial-03', x: 85, y: 25, label: 'Centros de distribuição' },
    ],
  },
];

// Only approved, published records are loaded from the server.
export const properties: Property[] = [];

const areaNumber = (value: number): string => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(value);

/** Area remains square metres for sorting and filters; agricultural land also shows hectares. */
export function formatArea(property: Property): string {
  const squareMetres = `${areaNumber(property.area)} m²`;
  return property.type === 'Terra agrícola' && property.area >= 10000
    ? `${areaNumber(property.area / 10000)} ha (${squareMetres})`
    : squareMetres;
}

export function propertyFacts(property: Property): Array<{ label: string; value: string }> {
  const facts = [{ label: 'Área', value: formatArea(property) }];
  if (supportsBedrooms(property.environment, property.type)) {
    if (property.bedrooms !== null) facts.push({ label: property.bedrooms === 1 ? 'Quarto' : 'Quartos', value: String(property.bedrooms) });
    if (property.suites !== null) facts.push({ label: property.suites === 1 ? 'Suíte' : 'Suítes', value: String(property.suites) });
  }
  if (property.parking !== null) facts.push({ label: property.parking === 1 ? 'Vaga' : 'Vagas', value: String(property.parking) });
  if (property.clearHeightM !== undefined) facts.push({ label: 'Pé-direito', value: `${areaNumber(property.clearHeightM)} m` });
  if (property.docks !== undefined) facts.push({ label: property.docks === 1 ? 'Doca' : 'Docas', value: String(property.docks) });
  return facts;
}

export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const ignoredWords = new Set(['um', 'uma', 'de', 'da', 'do', 'das', 'dos', 'o', 'a', 'em', 'no', 'na', 'nos', 'nas', 'para', 'quero', 'procuro']);
const negativeWords = new Set(['sem', 'nao', 'exceto']);
const pluralTerms: Record<string, string> = {
  casas: 'casa', apartamentos: 'apartamento', coberturas: 'cobertura', compactos: 'compacto', cabanas: 'cabana',
  condominios: 'condominio', jardins: 'jardim', piscinas: 'piscina', varandas: 'varanda',
  lareiras: 'lareira', araucarias: 'araucaria', horizontais: 'horizontal', verticais: 'vertical',
  lojas: 'loja', salas: 'sala', comerciais: 'comercial', edificios: 'edificio', corporativos: 'corporativo',
  terrenos: 'terreno', urbanos: 'urbano', lotes: 'lote', terras: 'terra', agricolas: 'agricola',
  galpoes: 'galpao', pavilhoes: 'pavilhao', centros: 'centro', distribuicoes: 'distribuicao',
  armazens: 'armazem', depositos: 'deposito', escritorios: 'escritorio', predios: 'predio',
  rurais: 'rural', areas: 'area', hectares: 'hectare', docas: 'doca', industriais: 'industrial',
  logisticos: 'logistico', logistica: 'logistico', campos: 'campo', lavouras: 'lavoura',
};
const searchWords = (value: string): string[] => normalize(value).split(/\W+/).filter(Boolean);
const searchTerm = (word: string): string => pluralTerms[word] ?? word;

// Busca local por palavras inteiras. Uma negação afeta o termo seguinte;
// "e"/"nem" prolongam a exclusão, enquanto "com" retoma termos positivos.
// Excluir uma palavra cadastrada não comprova a ausência física da característica.
function queryTerms(query: string): { required: string[]; excluded: string[]; incomplete: boolean } {
  const required: string[] = [];
  const excluded: string[] = [];
  let excludeNext = false;
  let lastWasExcluded = false;
  for (const word of searchWords(query)) {
    if (negativeWords.has(word)) { excludeNext = true; lastWasExcluded = false; continue; }
    if (word === 'com') { excludeNext = false; lastWasExcluded = false; continue; }
    if (word === 'e' || word === 'nem') {
      if (lastWasExcluded || word === 'nem') excludeNext = true;
      continue;
    }
    if (ignoredWords.has(word)) continue;
    (excludeNext ? excluded : required).push(searchTerm(word));
    lastWasExcluded = excludeNext;
    excludeNext = false;
  }
  return { required, excluded, incomplete: excludeNext };
}

export function filterProperties(env: EnvironmentId, operation: Operation, type: string, query: string): Property[] {
  const { required, excluded, incomplete } = queryTerms(query);
  if (incomplete) return [];
  const selectedType = normalize(type);
  const source=properties.some(p=>p.isIllustrative===false)?properties.filter(p=>p.isIllustrative===false):properties;
  return source.filter(p => {
    if (!propertyInEnvironment(p, env)) return false;
    if (p.operation !== operation) return false;
    if (selectedType === 'condominio') {
      if (!p.condominium) return false;
    } else if (selectedType === 'condominio horizontal' || selectedType === 'condominio vertical') {
      if (p.condominium !== selectedType.slice('condominio '.length)) return false;
    } else if (selectedType && normalize(p.type) !== selectedType) return false;
    const condominiumTerms = p.condominium ? ['condomínio', p.condominium] : [];
    const terms = new Set(searchWords([p.title, p.type, p.location, ...p.tags, ...condominiumTerms, p.environment, p.operation].join(' ')).map(searchTerm));
    return required.every(term => terms.has(term)) && excluded.every(term => !terms.has(term));
  });
}

export const money = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
}).format(value);

export function whatsappUrl(message: string): string {
  return `https://wa.me/${CONTACT.phone}?text=${encodeURIComponent(message)}`;
}

export const environmentById = (id: string) => environments.find(e => e.id === id) ?? environments[0];

export function registerPublishedProperties(real:Property[]){properties.splice(0,properties.length,...real.filter(p=>p.isIllustrative===false));}
export const hasPublishedProperties=()=>properties.some(p=>p.isIllustrative===false);
