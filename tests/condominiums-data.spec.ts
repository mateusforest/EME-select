import { expect, test } from '@playwright/test';
import { catalogHash, DEFAULT_CATALOG_STATE, parseCatalogHash, selectCatalog, validateCatalog } from '../src/catalog';
import type { CatalogState } from '../src/catalog';
import { environmentById, filterProperties, properties, propertyInEnvironment, propertyTypesForEnvironment, supportsBedrooms } from '../src/data';

const state = (values: Partial<CatalogState> = {}): CatalogState => ({ ...DEFAULT_CATALOG_STATE, ...values });
const ids = (items: typeof properties): string[] => items.map(item => item.id);

test('home links four distinct housing categories to existing properties', () => {
  const home = environmentById('todos');
  expect(home.image).toBe('/assets/scene-home-v2.png');
  expect(home.markers.map(marker => [marker.propertyId, marker.label])).toEqual([
    ['serra-01', 'Casas'],
    ['litoral-02', 'Casas em condomínio'],
    ['urbano-01', 'Apartamentos'],
    ['urbano-02', 'Compactos'],
  ]);
  for (const marker of home.markers) expect(properties.some(property => property.id === marker.propertyId)).toBe(true);
});

test('the condominium scene links two subtypes while the collection keeps three existing geographic listings', () => {
  const environment = environmentById('condominios');
  expect(environment.number).toBe('05');
  expect(environment.image).toBe('/assets/scene-condominios.png');
  expect(environment.title).toEqual(['Seu espaço.', 'Uma vida em conjunto.']);
  expect(environment.markers.map(marker => [marker.propertyId, marker.label])).toEqual([
    ['litoral-02', 'Condomínios horizontais'],
    ['urbano-03', 'Condomínios verticais'],
  ]);
  const condominiumProperties = properties.filter(property => propertyInEnvironment(property, 'condominios'));
  expect(condominiumProperties.map(property => [property.id, property.environment, property.condominium])).toEqual([
    ['urbano-03', 'urbano', 'vertical'],
    ['litoral-02', 'litoral', 'horizontal'],
    ['serra-03', 'serra', 'horizontal'],
  ]);
  expect(properties).toHaveLength(18);
  expect(new Set(properties.map(property => property.id)).size).toBe(properties.length);
  for (const property of condominiumProperties) {
    expect(propertyInEnvironment(property, property.environment)).toBe(true);
    expect(selectCatalog(state({ region: 'condominios' }))).toContain(property);
  }
});

test('explicit condominium membership excludes the land listing even when its tags mention condomínio', () => {
  const land = properties.find(property => property.id === 'terrenos-02')!;
  expect(land.tags).toContain('condomínio');
  expect(propertyInEnvironment(land, 'condominios')).toBe(false);
  expect(propertyInEnvironment({ ...properties[0], tags: ['condomínio', 'horizontal'] }, 'condominios')).toBe(false);
  expect(ids(selectCatalog(state({ region: 'condominios' })))).toEqual(['urbano-03', 'litoral-02', 'serra-03']);
  expect(ids(selectCatalog(state({ type: 'Condomínio' })))).toEqual(['urbano-03', 'litoral-02', 'serra-03']);
});

test('the collection supports housing types, explicit subtypes and geographic intersections', () => {
  expect(ids(filterProperties('condominios', 'comprar', 'Casa', ''))).toEqual(['litoral-02', 'serra-03']);
  expect(ids(filterProperties('condominios', 'comprar', 'Apartamento', ''))).toEqual(['urbano-03']);
  expect(ids(filterProperties('condominios', 'comprar', 'Condomínio horizontal', ''))).toEqual(['litoral-02', 'serra-03']);
  expect(ids(filterProperties('condominios', 'comprar', 'Condomínio vertical', ''))).toEqual(['urbano-03']);
  expect(ids(filterProperties('serra', 'comprar', 'Condomínio horizontal', ''))).toEqual(['serra-03']);
  expect(filterProperties('litoral', 'comprar', 'Condomínio vertical', '')).toEqual([]);
  expect(filterProperties('condominios', 'alugar', '', '')).toEqual([]);
});

test('search, bedroom and numeric filters combine with the collection without losing subtype semantics', () => {
  expect(ids(filterProperties('condominios', 'comprar', '', 'CONDOMÍNIOS HORIZONTAIS'))).toEqual(['litoral-02', 'serra-03']);
  expect(ids(filterProperties('condominios', 'comprar', '', 'condomínios sem horizontal'))).toEqual(['urbano-03']);
  expect(ids(selectCatalog(state({ region: 'condominios', type: 'Casa', query: 'jardins', minPrice: '1600000', bedrooms: '3' })))).toEqual(['litoral-02']);
  expect(ids(selectCatalog(state({ region: 'condominios', type: 'Condomínio vertical', minArea: '192' })))).toEqual(['urbano-03']);
  expect(supportsBedrooms('condominios')).toBe(true);
  expect(selectCatalog(state({ region: 'condominios', bedrooms: '4' }))).toEqual([]);
});

test('condominium URLs round-trip supported types and clear incompatible filters', () => {
  for (const type of ['', 'Casa', 'Apartamento', 'Condomínio', 'Condomínio horizontal', 'Condomínio vertical']) {
    const filters = state({ region: 'condominios', type, bedrooms: '3', query: 'luz & espaço' });
    expect(propertyTypesForEnvironment('condominios')).toContain(type);
    expect(validateCatalog(filters)).toBeNull();
    expect(parseCatalogHash(catalogHash(filters))).toEqual(filters);
  }
  expect(catalogHash({ region: 'condominios', type: 'Casa' })).toBe('#/colecao?regiao=condominios&tipo=Casa');
  expect(parseCatalogHash('#/colecao?regiao=condominios&tipo=Loja&quartos=3')).toEqual(state({ region: 'condominios', bedrooms: '3' }));
  expect(parseCatalogHash('#/colecao?regiao=condominios&tipo=Compacto').type).toBe('');
});
