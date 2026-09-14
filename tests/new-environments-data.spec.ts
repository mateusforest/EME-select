import { expect, test } from '@playwright/test';
import { catalogHash, DEFAULT_CATALOG_STATE, parseCatalogHash, selectCatalog, validateCatalog } from '../src/catalog';
import type { CatalogState } from '../src/catalog';
import { environments, filterProperties, formatArea, properties, propertyFacts, propertyTypesForEnvironment, PROPERTY_TYPE_OPTIONS, supportsBedrooms } from '../src/data';
import type { EnvironmentId, Property } from '../src/data';

const state = (values: Partial<CatalogState> = {}): CatalogState => ({ ...DEFAULT_CATALOG_STATE, ...values });
const property = (id: string): Property => {
  const result = properties.find(item => item.id === id);
  if (!result) throw new Error(`Fixture not found: ${id}`);
  return result;
};
const newEnvironments: EnvironmentId[] = ['comercial', 'terrenos', 'industrial'];
const newProperties = properties.filter(item => newEnvironments.includes(item.environment));

test('eight environments retain their order and the three nonresidential scenes have distinct linked markers', () => {
  expect(environments.map(item => item.id)).toEqual(['todos', 'litoral', 'serra', 'urbano', 'condominios', 'comercial', 'terrenos', 'industrial']);
  expect(environments.map(item => item.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
  for (const id of newEnvironments) {
    const environment = environments.find(item => item.id === id)!;
    expect(environment.image).toBe(`/assets/scene-${id}.png`);
    expect(environment.markers.map(item => item.propertyId)).toEqual([`${id}-01`, `${id}-02`, `${id}-03`]);
    expect(new Set(environment.markers.map(item => item.label)).size).toBe(3);
    for (const marker of environment.markers) {
      expect(property(marker.propertyId).environment).toBe(id);
      expect(marker.x).toBeGreaterThan(0);
      expect(marker.x).toBeLessThan(100);
      expect(marker.y).toBeGreaterThan(0);
      expect(marker.y).toBeLessThan(100);
    }
  }
});

test('nine distinct nonresidential types share the central options and remain explicitly illustrative', () => {
  expect(newProperties).toHaveLength(9);
  expect(new Set(newProperties.map(item => item.type)).size).toBe(9);
  for (const item of newProperties) {
    expect(item.isIllustrative).toBe(true);
    expect(item.bedrooms).toBeNull();
    expect(item.suites).toBeNull();
    expect(PROPERTY_TYPE_OPTIONS).toContain(item.type);
    expect(propertyTypesForEnvironment(item.environment)).toContain(item.type);
    expect(propertyTypesForEnvironment('todos')).toContain(item.type);
  }
  for (const id of newEnvironments) expect(propertyTypesForEnvironment(id)).toHaveLength(4);
  expect(propertyTypesForEnvironment('terrenos')).not.toContain('Casa');
});

test('each new type is individually filterable with its environment and transaction', () => {
  for (const item of newProperties) {
    const filters = state({ region: item.environment, operation: item.operation, type: item.type });
    expect(validateCatalog(filters)).toBeNull();
    expect(selectCatalog(filters).map(result => result.id)).toEqual([item.id]);
    expect(parseCatalogHash(catalogHash(filters))).toEqual(filters);
    expect(selectCatalog({ ...filters, operation: item.operation === 'comprar' ? 'alugar' : 'comprar' })).toEqual([]);
  }
});

test('new category search recognizes plurals, accents, synonyms and exclusions', () => {
  const cases = [
    ['comercial-01', 'LOJAS comerciais'],
    ['comercial-02', 'salas comerciais'],
    ['comercial-03', 'edifícios corporativos'],
    ['terrenos-01', 'terrenos urbanos'],
    ['terrenos-02', 'lotes em condomínios'],
    ['terrenos-03', 'terras agrícolas'],
    ['industrial-01', 'galpões industriais'],
    ['industrial-02', 'pavilhões industriais'],
    ['industrial-03', 'centros de distribuição'],
  ];
  for (const [id, query] of cases) {
    const item = property(id);
    expect(filterProperties(item.environment, item.operation, '', query).map(result => result.id)).toEqual([id]);
  }
  expect(filterProperties('comercial', 'comprar', '', 'escritórios').map(item => item.id)).toEqual(['comercial-02', 'comercial-03']);
  expect(filterProperties('industrial', 'alugar', '', 'logística').map(item => item.id)).toEqual(['industrial-03']);
  expect(filterProperties('terrenos', 'comprar', '', 'terrenos sem condomínio').map(item => item.id)).toEqual(['terrenos-01', 'terrenos-03']);
});

test('agricultural land displays hectares but keeps numeric area filters in square metres', () => {
  const land = property('terrenos-03');
  expect(land.area).toBe(125000);
  expect(formatArea(land)).toBe('12,5 ha (125.000 m²)');
  expect(formatArea({ ...land, area: 10000 })).toBe('1 ha (10.000 m²)');
  expect(formatArea({ ...land, area: 9999 })).toBe('9.999 m²');
  expect(formatArea({ ...property('terrenos-01'), area: 10000 })).toBe('10.000 m²');
  expect(selectCatalog(state({ region: 'terrenos', minArea: '125000' })).map(item => item.id)).toEqual(['terrenos-03']);
  expect(selectCatalog(state({ region: 'terrenos', minArea: '125001' }))).toEqual([]);
});

test('URL sanitation removes bedrooms from nonresidential environment or type', () => {
  for (const item of newProperties) {
    expect(supportsBedrooms(item.environment, '')).toBe(false);
    expect(supportsBedrooms('todos', item.type)).toBe(false);
    const hash = catalogHash({ region: item.environment, type: item.type, bedrooms: '3' });
    expect(hash).not.toContain('quartos');
    expect(parseCatalogHash(`${hash}&quartos=3`).bedrooms).toBe('');
    expect(parseCatalogHash(`#/colecao?tipo=${encodeURIComponent(item.type)}&quartos=3`).bedrooms).toBe('');
  }
  expect(parseCatalogHash('#/colecao?regiao=industrial&quartos=incorrect').bedrooms).toBe('');
  expect(parseCatalogHash('#/colecao?regiao=serra&quartos=3').bedrooms).toBe('3');
  expect(supportsBedrooms('todos')).toBe(true);
});

test('URL sanitation clears a type unavailable in the selected environment before applying bedrooms', () => {
  const commercial = parseCatalogHash('#/colecao?regiao=comercial&tipo=Casa&quartos=3');
  expect(commercial).toEqual(state({ region: 'comercial' }));
  expect(catalogHash(commercial)).toBe('#/colecao?regiao=comercial');
  expect(selectCatalog(commercial).map(item => item.id)).toEqual(['comercial-02', 'comercial-03']);
  const residential = parseCatalogHash('#/colecao?regiao=serra&tipo=Loja&quartos=3');
  expect(residential).toEqual(state({ region: 'serra', bedrooms: '3' }));
  expect(catalogHash({ region: 'industrial', type: 'Terra agrícola', bedrooms: '2' })).toBe('#/colecao?regiao=industrial');
  expect(parseCatalogHash('#/colecao?tipo=Loja').type).toBe('Loja');
});

test('stale bedroom input is ignored in nonresidential scope and unknown bedrooms never satisfy residential filters', () => {
  const filters = state({ region: 'terrenos', bedrooms: '4' });
  expect(selectCatalog(filters)).toHaveLength(3);
  expect(validateCatalog({ ...filters, bedrooms: 'invalid' })).toBeNull();
  expect(selectCatalog({ ...filters, bedrooms: 'invalid' })).toHaveLength(3);
  expect(selectCatalog(state({ type: 'Sala comercial', bedrooms: '4' })).map(item => item.id)).toEqual(['comercial-02']);
  expect(selectCatalog(state({ bedrooms: '0' })).every(item => item.bedrooms !== null)).toBe(true);
  expect(selectCatalog(state({ bedrooms: '3' })).every(item => (item.bedrooms ?? -1) >= 3)).toBe(true);
});

test('land facts contain area without invented zero bedrooms or parking', () => {
  for (const land of properties.filter(item => item.environment === 'terrenos')) {
    expect(land.parking).toBeNull();
    expect(propertyFacts(land)).toEqual([{ label: 'Área', value: formatArea(land) }]);
  }
});

test('property facts preserve meaningful known zeros and present industrial dimensions', () => {
  expect(propertyFacts(property('industrial-03'))).toEqual([
    { label: 'Área', value: '4.800 m²' },
    { label: 'Vagas', value: '24' },
    { label: 'Pé-direito', value: '11,5 m' },
    { label: 'Docas', value: '6' },
  ]);
  expect(propertyFacts(property('industrial-02')).some(fact => /Doca/.test(fact.label))).toBe(false);
  expect(propertyFacts({ ...property('urbano-02'), parking: 0, suites: null })).toEqual([
    { label: 'Área', value: '46 m²' },
    { label: 'Quarto', value: '1' },
    { label: 'Vagas', value: '0' },
  ]);
});
