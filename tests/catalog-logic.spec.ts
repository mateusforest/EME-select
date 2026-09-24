import { test, expect } from '@playwright/test';
import { catalogHash, DEFAULT_CATALOG_STATE, parseCatalogHash, selectCatalog, validateCatalog } from '../src/catalog';
import type { CatalogState } from '../src/catalog';
import { properties, registerPublishedProperties } from '../src/data';

import {sampleProperties} from './fixtures/catalog';
test.beforeEach(()=>registerPublishedProperties(sampleProperties));

const state = (values: Partial<CatalogState> = {}): CatalogState => ({ ...DEFAULT_CATALOG_STATE, ...values });

test('empty and foreign hashes resolve to independent default states', () => {
  for (const hash of ['', '#/', '#/colecao', '#/imovel/urbano-01?regiao=serra']) {
    expect(parseCatalogHash(hash)).toEqual(DEFAULT_CATALOG_STATE);
  }
  const parsed = parseCatalogHash('#/colecao');
  parsed.region = 'serra';
  expect(DEFAULT_CATALOG_STATE.region).toBe('todos');
  expect(catalogHash({})).toBe('#/colecao');
});

test('share links round-trip every supported field including accent, whitespace and numeric precision', () => {
  const original = state({ region: 'serra', operation: 'alugar', type: 'Condomínio horizontal', query: ' jardim & luz + varanda  ', minPrice: '0001500.50', maxPrice: '7000', minArea: '.5', bedrooms: '01', sort: 'maior-area' });
  const hash = catalogHash(original);
  expect(parseCatalogHash(hash)).toEqual(original);
  expect(catalogHash(parseCatalogHash(hash))).toBe(hash);
  expect(hash).not.toContain('curadoria');
});

test('unknown values, malformed escapes and duplicate keys are deterministic', () => {
  const parsed = parseCatalogHash('#/colecao?regiao=serra&regiao=urbano&operacao=roubar&tipo=%E0%A4%A&ordem=aleatorio&precoMin=NaN&quartos=1.5&x=ignored');
  expect(parsed).toEqual(state({ region: 'serra' }));
  expect(catalogHash(parsed)).toBe('#/colecao?regiao=serra');
});

test('URL input limits query and clamps finite oversized numeric values', () => {
  const parsed = parseCatalogHash(`#/colecao?busca=${'a'.repeat(300)}&precoMin=9000000000000&precoMax=${'9'.repeat(400)}&areaMin=99999999&quartos=101`);
  expect(parsed.query).toHaveLength(180);
  expect(parsed.minPrice).toBe('1000000000000');
  expect(parsed.maxPrice).toBe('');
  expect(parsed.minArea).toBe('10000000');
  expect(parsed.bedrooms).toBe('100');
  expect(validateCatalog(parsed)).toBeNull();
});

test('raw decimal validation rejects currency, separators, negatives and nonfinite values', () => {
  for (const minPrice of ['R$ 1000', '1.000,00', '1000,00', '-1', 'Infinity', 'NaN', '1e6', ' 1000 ', '12.', '+12']) {
    expect(validateCatalog(state({ minPrice }))).not.toBeNull();
    expect(selectCatalog(state({ minPrice }))).toEqual([]);
    expect(parseCatalogHash(`#/colecao?precoMin=${encodeURIComponent(minPrice)}`).minPrice).toBe('');
  }
  expect(validateCatalog(state({ minPrice: '0', maxPrice: '1850000.50', minArea: '.5' }))).toBeNull();
  expect(validateCatalog(state({ bedrooms: '2.5' }))).not.toBeNull();
});

test('inverted bounds remain reviewable in share URL and produce zero results', () => {
  const original = state({ minPrice: '2000000', maxPrice: '1500000' });
  expect(validateCatalog(original)).toContain('valor máximo');
  expect(selectCatalog(original)).toEqual([]);
  expect(parseCatalogHash(catalogHash(original))).toEqual(original);
});

test('region, operation, whole-term query and inclusive numeric bounds work together', () => {
  const selected = selectCatalog(state({ region: 'litoral', type: 'Casa', query: 'jardim', minPrice: '1680000', maxPrice: '2350000', minArea: '186', bedrooms: '3' }));
  expect(selected.map(property => property.id)).toEqual(['litoral-01', 'litoral-02']);
  expect(selectCatalog(state({ region: 'litoral', operation: 'alugar', minPrice: '5400', maxPrice: '5400', minArea: '112', bedrooms: '2' })).map(property => property.id)).toEqual(['litoral-03']);
  expect(selectCatalog(state({ bedrooms: '4' }))).toEqual([]);
  expect(selectCatalog(state({ query: 'marte' }))).toEqual([]);
  expect(selectCatalog(state({ query: 'jardim sem piscina' })).map(property => property.id)).toEqual(['litoral-02', 'serra-01', 'serra-03']);
});

test('condominium types follow the explicit residential membership and subtype', () => {
  expect(selectCatalog(state({ type: 'Condomínio' })).map(property => property.id)).toEqual(['urbano-03', 'litoral-02', 'serra-03']);
  expect(selectCatalog(state({ type: 'Condomínio horizontal' })).map(property => property.id)).toEqual(['litoral-02', 'serra-03']);
  expect(selectCatalog(state({ type: 'Condomínio vertical' })).map(property => property.id)).toEqual(['urbano-03']);
  expect(selectCatalog(state({ type: 'Compacto', operation: 'alugar' })).map(property => property.id)).toEqual(['urbano-02']);
  expect(selectCatalog(state({ type: 'Cabana', operation: 'alugar' })).map(property => property.id)).toEqual(['serra-02']);
});

test('ordering is deterministic and never reorders the source catalog', () => {
  const originalIds = properties.map(property => property.id);
  const lowFirst = selectCatalog(state({ sort: 'menor-preco' }));
  const purchaseProperties = properties.filter(property => property.operation === 'comprar');
  expect(lowFirst.map(property => property.price)).toEqual(purchaseProperties.map(property => property.price).sort((a, b) => a - b));
  expect(selectCatalog(state({ sort: 'maior-preco' })).map(property => property.price)).toEqual(lowFirst.map(property => property.price).reverse());
  expect(selectCatalog(state({ sort: 'maior-area' })).map(property => property.area)).toEqual(purchaseProperties.map(property => property.area).sort((a, b) => b - a));
  expect(selectCatalog(state()).map(property => property.id)).toEqual(originalIds.filter(id => properties.find(property => property.id === id)?.operation === 'comprar'));
  expect(properties.map(property => property.id)).toEqual(originalIds);
});

test('location profiles round-trip and isolate matching real listings',()=>{
 registerPublishedProperties(sampleProperties.map(p=>({...p,locationProfile:p.id==='litoral-01'?'beira-mar':'centro'})));
 const scoped=state({region:'litoral',type:'Casa',locationProfile:'beira-mar'});
 expect(parseCatalogHash(catalogHash(scoped))).toEqual(scoped);
 expect(selectCatalog(scoped).map(p=>p.id)).toEqual(['litoral-01']);
 expect(parseCatalogHash('#/colecao?regiao=industrial&localizacao=beira-mar').locationProfile).toBe('');
 registerPublishedProperties([{...sampleProperties[0],isIllustrative:true}]);
 expect(selectCatalog(state())).toEqual([]);
});
