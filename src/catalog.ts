import { environments, filterProperties, PROPERTY_TYPE_OPTIONS, propertyTypesForEnvironment, supportsBedrooms } from './data';
import type { EnvironmentId, Property } from './data';

export interface CatalogState {
  region: EnvironmentId;
  operation: 'comprar' | 'alugar';
  type: string;
  query: string;
  minPrice: string;
  maxPrice: string;
  minArea: string;
  bedrooms: string;
  sort: 'curadoria' | 'menor-preco' | 'maior-preco' | 'maior-area';
}

export const DEFAULT_CATALOG_STATE: CatalogState = {
  region: 'todos', operation: 'comprar', type: '', query: '',
  minPrice: '', maxPrice: '', minArea: '', bedrooms: '', sort: 'curadoria',
};

const regions = new Set<string>(environments.map(environment => environment.id));
const types = new Set(PROPERTY_TYPE_OPTIONS);
const sorts = new Set(['curadoria', 'menor-preco', 'maior-preco', 'maior-area']);
const numericLimits = { minPrice: 1_000_000_000_000, maxPrice: 1_000_000_000_000, minArea: 10_000_000, bedrooms: 100 } as const;
type NumericKey = keyof typeof numericLimits;
const keys: Array<[keyof CatalogState, string]> = [
  ['region', 'regiao'], ['operation', 'operacao'], ['type', 'tipo'], ['query', 'busca'],
  ['minPrice', 'precoMin'], ['maxPrice', 'precoMax'], ['minArea', 'areaMin'],
  ['bedrooms', 'quartos'], ['sort', 'ordem'],
];

// Decimal simples: sem moeda, agrupadores, sinal, notação exponencial ou Infinity.
function isDecimal(value: string): boolean {
  return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) && Number.isFinite(Number(value));
}

function cleanNumeric(value: string, key: NumericKey): string {
  if (!value || !isDecimal(value)) return '';
  const number = Number(value);
  if (key === 'bedrooms' && !Number.isInteger(number)) return '';
  return number > numericLimits[key] ? String(numericLimits[key]) : value;
}

function sanitize(input: Partial<CatalogState>): CatalogState {
  const state = { ...DEFAULT_CATALOG_STATE };
  if (typeof input.region === 'string' && regions.has(input.region)) state.region = input.region;
  if (input.operation === 'comprar' || input.operation === 'alugar') state.operation = input.operation;
  if (typeof input.type === 'string' && types.has(input.type)) state.type = input.type;
  if (typeof input.query === 'string') state.query = input.query.slice(0, 180);
  if (typeof input.sort === 'string' && sorts.has(input.sort)) state.sort = input.sort;
  for (const key of Object.keys(numericLimits) as NumericKey[]) {
    if (typeof input[key] === 'string') state[key] = cleanNumeric(input[key], key);
  }
  if (!propertyTypesForEnvironment(state.region).includes(state.type)) state.type = '';
  if (!supportsBedrooms(state.region, state.type)) state.bedrooms = '';
  return state;
}

/** URLSearchParams.get chooses the first value when a parameter is repeated. */
export function parseCatalogHash(hash: string): CatalogState {
  const separator = hash.indexOf('?');
  if (separator === -1 || hash.slice(0, separator) !== '#/colecao') return { ...DEFAULT_CATALOG_STATE };
  const params = new URLSearchParams(hash.slice(separator + 1));
  const input: Record<string, string> = {};
  for (const [key, parameter] of keys) {
    const value = params.get(parameter);
    if (value !== null) input[key] = value;
  }
  return sanitize(input);
}

/** Stable, shareable route; valid numeric strings retain their entered precision. */
export function catalogHash(input: Partial<CatalogState>): string {
  const state = sanitize(input);
  const params = new URLSearchParams();
  for (const [key, parameter] of keys) {
    if (state[key] !== DEFAULT_CATALOG_STATE[key]) params.set(parameter, state[key]);
  }
  const query = params.toString();
  return `#/colecao${query ? `?${query}` : ''}`;
}

export function validateCatalog(state: CatalogState): string | null {
  if (!regions.has(state.region) || !['comprar', 'alugar'].includes(state.operation) || !types.has(state.type) || !sorts.has(state.sort)) {
    return 'Revise os filtros selecionados.';
  }
  if (state.query.length > 180) return 'Use até 180 caracteres na busca.';
  for (const key of Object.keys(numericLimits) as NumericKey[]) {
    if (key === 'bedrooms' && !supportsBedrooms(state.region, state.type)) continue;
    const value = state[key];
    if (value && (!isDecimal(value) || Number(value) > numericLimits[key])) {
      if (key === 'minArea') return 'Informe uma área válida em m², usando apenas números e ponto para decimais.';
      if (key === 'bedrooms') return 'Informe uma quantidade de quartos entre 0 e 100.';
      return 'Informe um valor válido, usando apenas números e ponto para centavos.';
    }
    if (key === 'bedrooms' && value && !Number.isInteger(Number(value))) return 'A quantidade de quartos deve ser um número inteiro.';
  }
  if (state.minPrice !== '' && state.maxPrice !== '' && Number(state.minPrice) > Number(state.maxPrice)) {
    return 'O valor máximo precisa ser igual ou maior que o valor mínimo.';
  }
  return null;
}

export function selectCatalog(state: CatalogState): Property[] {
  if (validateCatalog(state)) return [];
  const result = filterProperties(state.region, state.operation, state.type, state.query).filter(property => {
    if (state.minPrice !== '' && property.price < Number(state.minPrice)) return false;
    if (state.maxPrice !== '' && property.price > Number(state.maxPrice)) return false;
    if (state.minArea !== '' && property.area < Number(state.minArea)) return false;
    if (supportsBedrooms(state.region, state.type) && state.bedrooms !== ''
      && (property.bedrooms === null || property.bedrooms < Number(state.bedrooms))) return false;
    return true;
  });
  if (state.sort === 'menor-preco') result.sort((a, b) => a.price - b.price);
  if (state.sort === 'maior-preco') result.sort((a, b) => b.price - a.price);
  if (state.sort === 'maior-area') result.sort((a, b) => b.area - a.area);
  return result;
}
