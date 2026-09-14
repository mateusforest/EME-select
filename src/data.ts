export type EnvironmentId = 'todos' | 'litoral' | 'serra' | 'urbano' | 'condominios' | 'comercial' | 'terrenos' | 'industrial';
export type PropertyType = 'Casa' | 'Apartamento' | 'Compacto' | 'Cabana'
  | 'Loja' | 'Sala comercial' | 'Edifício corporativo'
  | 'Terreno urbano' | 'Lote em condomínio' | 'Terra agrícola'
  | 'Galpão' | 'Pavilhão' | 'Centro de distribuição';
export type Operation = 'comprar' | 'alugar';
export type CondominiumKind = 'horizontal' | 'vertical';

const residentialTypes = ['Casa', 'Apartamento', 'Compacto', 'Cabana', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical'];
const commercialTypes = ['Loja', 'Sala comercial', 'Edifício corporativo'];
const landTypes = ['Terreno urbano', 'Lote em condomínio', 'Terra agrícola'];
const industrialTypes = ['Galpão', 'Pavilhão', 'Centro de distribuição'];

/** The empty value means any type; labels and values are shared by every filter. */
export const PROPERTY_TYPE_OPTIONS = ['', ...residentialTypes, ...commercialTypes, ...landTypes, ...industrialTypes];
export const PROPERTY_TYPE_OPTIONS_BY_ENVIRONMENT: Record<EnvironmentId, string[]> = {
  todos: PROPERTY_TYPE_OPTIONS,
  litoral: ['', 'Casa', 'Apartamento', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical'],
  serra: ['', 'Casa', 'Cabana', 'Condomínio', 'Condomínio horizontal'],
  urbano: ['', 'Casa', 'Apartamento', 'Compacto', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical'],
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
  phone: '5554999902688',
  display: '(54) 99990-2688',
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

// Fixtures explícitas. Substituir pelo catálogo validado antes da publicação comercial.
export const properties: Property[] = [
  {
    id: 'urbano-01', title: 'Apartamento com varanda', environment: 'urbano',
    location: 'Rio Grande do Sul', type: 'Apartamento', operation: 'comprar',
    price: 1850000, area: 148, bedrooms: 3, suites: 2, parking: 2,
    tags: ['varanda', 'luz natural', 'cidade', 'ambientes integrados'],
    reasons: ['Integração entre sala e varanda', 'Boa entrada de luz natural', 'Varanda com área de convivência'],
    description: 'Um espaço que aproxima a vida de dentro da paisagem lá fora. A sala se prolonga pela varanda, com materiais naturais e ambientes que acolhem diferentes momentos do dia.',
    image: '/assets/interior-living.png', hasInterior: true,
  },
  {
    id: 'urbano-02', title: 'Compacto junto à praça', environment: 'urbano',
    location: 'Rio Grande do Sul', type: 'Compacto', operation: 'alugar',
    price: 3200, area: 46, bedrooms: 1, suites: 1, parking: 1,
    tags: ['compacto', 'apartamento', 'praça', 'cidade', 'serviços'],
    reasons: ['Espaços bem aproveitados', 'Integração entre os ambientes', 'Conexão com a vida de bairro'],
    description: 'Uma proposta de morar com menos excessos e mais possibilidades, em um cenário de ruas arborizadas e convivência.',
    image: '/assets/scene-urbano.png',
  },
  {
    id: 'urbano-03', title: 'Residência nas alturas', environment: 'urbano',
    condominium: 'vertical',
    location: 'Rio Grande do Sul', type: 'Apartamento', operation: 'comprar',
    price: 2450000, area: 192, bedrooms: 3, suites: 3, parking: 3,
    tags: ['condomínio', 'vertical', 'apartamento', 'varanda', 'vista'],
    reasons: ['Varandas generosas', 'Contato com a paisagem urbana', 'Ambientes de convivência'],
    description: 'Uma leitura contemporânea do morar urbano, com jardins, amplitude e espaços para aproveitar a cidade em outro ritmo.',
    image: '/assets/scene-urbano.png',
  },
  {
    id: 'litoral-01', title: 'Casa entre jardins e mar', environment: 'litoral',
    location: 'Litoral Norte · RS', type: 'Casa', operation: 'comprar',
    price: 2350000, area: 240, bedrooms: 3, suites: 3, parking: 2,
    tags: ['praia', 'mar', 'jardim', 'piscina', 'casa'],
    reasons: ['Integração com o jardim', 'Materiais naturais', 'Espaços de convivência abertos'],
    description: 'Uma casa de linhas serenas, pensada para reunir e desacelerar. Madeira, pedra e vidro aproximam os ambientes da paisagem costeira.',
    image: '/assets/scene-litoral.png',
  },
  {
    id: 'litoral-02', title: 'Casa no condomínio dos jardins', environment: 'litoral',
    condominium: 'horizontal',
    location: 'Litoral Norte · RS', type: 'Casa', operation: 'comprar',
    price: 1680000, area: 186, bedrooms: 3, suites: 2, parking: 2,
    tags: ['condomínio', 'horizontal', 'jardim', 'praia', 'casa'],
    reasons: ['Jardins integrados à arquitetura', 'Escala acolhedora', 'Áreas de convivência'],
    description: 'Arquitetura contemporânea em uma paisagem conectada por caminhos e jardins, com espaço para viver cada dia com tranquilidade.',
    image: '/assets/scene-litoral.png',
  },
  {
    id: 'litoral-03', title: 'Apartamento voltado ao mar', environment: 'litoral',
    location: 'Litoral Norte · RS', type: 'Apartamento', operation: 'alugar',
    price: 5400, area: 112, bedrooms: 2, suites: 1, parking: 2,
    tags: ['vista', 'mar', 'apartamento', 'praia', 'varanda'],
    reasons: ['Varanda conectada à sala', 'Paisagem aberta', 'Arquitetura com proteção solar'],
    description: 'Um convite para deixar o horizonte fazer parte da rotina, com espaços abertos e uma relação próxima com a luz.',
    image: '/assets/scene-litoral.png',
  },
  {
    id: 'serra-01', title: 'Casa entre as araucárias', environment: 'serra',
    location: 'Serra Gaúcha · RS', type: 'Casa', operation: 'comprar',
    price: 2150000, area: 228, bedrooms: 3, suites: 2, parking: 2,
    tags: ['natureza', 'araucárias', 'madeira', 'pedra', 'lareira', 'casa', 'jardim'],
    reasons: ['Madeira, pedra e vidro em equilíbrio', 'Conexão com o entorno natural', 'Ambientes para acolher'],
    description: 'Um refúgio de linhas contemporâneas entre o verde. A sala envidraçada e o terraço convidam a paisagem para perto.',
    image: '/assets/scene-serra.png',
  },
  {
    id: 'serra-02', title: 'Cabana em meio ao verde', environment: 'serra',
    location: 'Serra Gaúcha · RS', type: 'Cabana', operation: 'alugar',
    price: 3800, area: 72, bedrooms: 1, suites: 1, parking: 1,
    tags: ['cabana', 'natureza', 'compacto', 'lareira', 'madeira'],
    reasons: ['Escala aconchegante', 'Ambientes bem aproveitados', 'Materiais que acolhem'],
    description: 'Uma forma simples e cuidadosa de estar perto da natureza, com arquitetura que valoriza luz, abrigo e paisagem.',
    image: '/assets/scene-serra.png',
  },
  {
    id: 'serra-03', title: 'Casa no condomínio da serra', environment: 'serra',
    condominium: 'horizontal',
    location: 'Serra Gaúcha · RS', type: 'Casa', operation: 'comprar',
    price: 1590000, area: 178, bedrooms: 3, suites: 1, parking: 2,
    tags: ['condomínio', 'horizontal', 'natureza', 'casa', 'jardim'],
    reasons: ['Arquitetura integrada ao relevo', 'Percursos entre jardins', 'Escala residencial'],
    description: 'Uma coleção de casas conectadas por caminhos, jardins e uma relação próxima com a paisagem da serra.',
    image: '/assets/scene-serra.png',
  },
  {
    id: 'comercial-01', title: 'Loja com frente para a rua', environment: 'comercial',
    location: 'Caxias do Sul · RS', type: 'Loja', operation: 'alugar',
    price: 6800, area: 135, bedrooms: null, suites: null, parking: 2,
    tags: ['loja', 'comercial', 'varejo', 'vitrine', 'térreo', 'frente de rua'],
    reasons: ['Vitrine voltada para a rua', 'Salão com planta aberta', 'Acesso no nível da calçada'],
    description: 'Uma loja térrea com vitrine voltada para a rua, salão aberto e espaço de apoio. A entrada no nível da calçada aproxima o interior da vida do bairro.',
    image: '/assets/scene-comercial.png', isIllustrative: true,
  },
  {
    id: 'comercial-02', title: 'Sala comercial com luz natural', environment: 'comercial',
    location: 'Porto Alegre · RS', type: 'Sala comercial', operation: 'comprar',
    price: 590000, area: 68, bedrooms: null, suites: null, parking: 1,
    tags: ['sala', 'comercial', 'escritório', 'conjunto', 'serviços', 'luz natural'],
    reasons: ['Planta com possibilidades de organização', 'Janelas amplas', 'Espaço de apoio para o dia a dia'],
    description: 'Janelas amplas trazem luz natural a esta sala comercial de 68 m². A planta reúne espaço de trabalho e apoio, com diferentes possibilidades de organização.',
    image: '/assets/scene-comercial.png', isIllustrative: true,
  },
  {
    id: 'comercial-03', title: 'Edifício para sede corporativa', environment: 'comercial',
    location: 'Caxias do Sul · RS', type: 'Edifício corporativo', operation: 'comprar',
    price: 7800000, area: 1450, bedrooms: null, suites: null, parking: 18,
    tags: ['edifício', 'corporativo', 'comercial', 'prédio', 'sede', 'escritório'],
    reasons: ['Ambientes distribuídos em pavimentos', 'Entrada dedicada', 'Estacionamento no mesmo conjunto'],
    description: 'Um edifício de entrada própria, com pavimentos de trabalho e áreas de apoio. O estacionamento no mesmo conjunto acompanha a escala de uma sede empresarial.',
    image: '/assets/scene-comercial.png', isIllustrative: true,
  },
  {
    id: 'terrenos-01', title: 'Terreno urbano em rua de bairro', environment: 'terrenos',
    location: 'Caxias do Sul · RS', type: 'Terreno urbano', operation: 'comprar',
    price: 460000, area: 480, bedrooms: null, suites: null, parking: null,
    tags: ['terreno', 'urbano', 'lote', 'bairro', 'rua'],
    reasons: ['Inserção em área urbana', 'Frente voltada para a rua', 'Espaço para estudar um novo projeto'],
    description: 'Um terreno de 480 m² voltado para uma rua de bairro. A inserção urbana oferece um ponto de partida para estudar a relação entre um novo projeto e seu entorno.',
    image: '/assets/scene-terrenos.png', isIllustrative: true,
  },
  {
    id: 'terrenos-02', title: 'Lote em condomínio arborizado', environment: 'terrenos',
    location: 'Serra Gaúcha · RS', type: 'Lote em condomínio', operation: 'comprar',
    price: 690000, area: 720, bedrooms: null, suites: null, parking: null,
    tags: ['lote', 'terreno', 'condomínio', 'arborizado', 'residencial'],
    reasons: ['Lote em um conjunto residencial', 'Entorno arborizado', 'Área para desenvolver um projeto'],
    description: 'Um lote de 720 m² em um conjunto residencial arborizado. A paisagem da serra e a escala do entorno dão contexto às primeiras ideias de projeto.',
    image: '/assets/scene-terrenos.png', isIllustrative: true,
  },
  {
    id: 'terrenos-03', title: 'Terras agrícolas no interior', environment: 'terrenos',
    location: 'Interior do Rio Grande do Sul', type: 'Terra agrícola', operation: 'comprar',
    price: 1625000, area: 125000, bedrooms: null, suites: null, parking: null,
    tags: ['terra', 'agrícola', 'rural', 'área', 'campo', 'cultivo', 'hectare', 'lavoura'],
    reasons: ['Área apresentada em hectares', 'Paisagem rural aberta', 'Espaço para estudar um projeto agrícola'],
    description: 'São 12,5 hectares em uma paisagem rural aberta no interior gaúcho. A extensão da área convida a observar o terreno e pensar seu aproveitamento ao longo do tempo.',
    image: '/assets/scene-terrenos.png', isIllustrative: true,
  },
  {
    id: 'industrial-01', title: 'Galpão com área de apoio', environment: 'industrial',
    location: 'Caxias do Sul · RS', type: 'Galpão', operation: 'alugar',
    price: 16500, area: 950, bedrooms: null, suites: null, parking: 8,
    clearHeightM: 7, docks: 1,
    tags: ['galpão', 'industrial', 'armazém', 'depósito', 'armazenagem', 'doca', 'apoio'],
    reasons: ['Salão com área contínua', 'Apoio separado do espaço principal', 'Uma doca ilustrativa de carga'],
    description: 'Um galpão de 950 m², com salão contínuo, pé-direito de 7 m e uma doca. O apoio separado do espaço principal ajuda a visualizar a organização dos ambientes.',
    image: '/assets/scene-industrial.png', isIllustrative: true,
  },
  {
    id: 'industrial-02', title: 'Pavilhão para organizar sua operação', environment: 'industrial',
    location: 'Bento Gonçalves · RS', type: 'Pavilhão', operation: 'comprar',
    price: 3400000, area: 1800, bedrooms: null, suites: null, parking: 12,
    clearHeightM: 8,
    tags: ['pavilhão', 'industrial', 'produção', 'operação', 'armazenagem', 'pátio'],
    reasons: ['Espaço principal amplo', 'Área externa de apoio', 'Ambientes para organizar fluxos'],
    description: 'Um pavilhão de 1.800 m² com pé-direito de 8 m e área externa de apoio. O espaço principal amplo permite estudar a disposição de ambientes e fluxos de trabalho.',
    image: '/assets/scene-industrial.png', isIllustrative: true,
  },
  {
    id: 'industrial-03', title: 'Centro de distribuição com docas', environment: 'industrial',
    location: 'Região Metropolitana · RS', type: 'Centro de distribuição', operation: 'alugar',
    price: 72000, area: 4800, bedrooms: null, suites: null, parking: 24,
    clearHeightM: 11.5, docks: 6,
    tags: ['centro', 'distribuição', 'logístico', 'industrial', 'cd', 'armazém', 'armazenagem', 'doca', 'carga', 'descarga'],
    reasons: ['Seis docas ilustrativas de carga', 'Espaço para organizar armazenagem', 'Pátio associado à operação'],
    description: 'Um centro de distribuição de 4.800 m², com seis docas e pé-direito de 11,5 m. O pátio e a área de armazenagem compõem o conjunto para planejar fluxos de carga e circulação.',
    image: '/assets/scene-industrial.png', isIllustrative: true,
  },
];

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
  casas: 'casa', apartamentos: 'apartamento', compactos: 'compacto', cabanas: 'cabana',
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
  return properties.filter(p => {
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
