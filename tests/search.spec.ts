import { expect, test } from '@playwright/test';
import { filterProperties } from '../src/data';

const ids = (items: ReturnType<typeof filterProperties>) => items.map(item => item.id);

test('busca mantém os filtros de ambiente, finalidade e tipo', () => {
  expect(ids(filterProperties('litoral', 'alugar', 'Apartamento', ''))).toEqual(['litoral-03']);
  expect(ids(filterProperties('serra', 'comprar', 'Casa', ''))).toEqual(['serra-01', 'serra-03']);
  expect(filterProperties('urbano', 'alugar', 'Casa', '')).toEqual([]);
});

test('busca aceita acentos, caixa e plurais conhecidos', () => {
  expect(ids(filterProperties('todos', 'comprar', '', 'CONDOMÍNIOS HORIZONTAIS'))).toEqual(['litoral-02', 'serra-03']);
  expect(ids(filterProperties('todos', 'comprar', '', 'condominios horizontais'))).toEqual(['litoral-02', 'serra-03']);
  expect(ids(filterProperties('serra', 'comprar', '', 'casas araucárias'))).toEqual(['serra-01']);
  expect(ids(filterProperties('todos', 'comprar', 'condominio', ''))).toEqual(['urbano-03', 'litoral-02', 'serra-03']);
});

test('sem piscina exclui o anúncio que menciona piscina', () => {
  expect(ids(filterProperties('litoral', 'comprar', 'Casa', 'sem piscina'))).toEqual(['litoral-02']);
  expect(ids(filterProperties('litoral', 'comprar', 'Casa', 'com piscina'))).toEqual(['litoral-01']);
});

test('combina termo desejado, termo excluído e retomada com com', () => {
  expect(ids(filterProperties('litoral', 'comprar', '', 'casa sem piscina com jardim'))).toEqual(['litoral-02']);
  expect(ids(filterProperties('serra', 'comprar', '', 'casa jardim sem lareira'))).toEqual(['serra-03']);
});

test('não e exceto mantêm a intenção de excluir', () => {
  expect(ids(filterProperties('litoral', 'comprar', 'Casa', 'não quero piscina'))).toEqual(['litoral-02']);
  expect(ids(filterProperties('litoral', 'comprar', 'Casa', 'exceto piscina'))).toEqual(['litoral-02']);
});

test('continua as exclusões ligadas por e ou nem', () => {
  expect(ids(filterProperties('serra', 'comprar', 'Casa', 'sem lareira e condomínio'))).toEqual([]);
  expect(ids(filterProperties('serra', 'comprar', 'Casa', 'sem lareira nem condomínio'))).toEqual([]);
});

test('não ignora negação incompleta ou condição numérica desconhecida', () => {
  expect(filterProperties('todos', 'comprar', '', 'sem')).toEqual([]);
  expect(filterProperties('todos', 'comprar', '', 'casa sem')).toEqual([]);
  expect(filterProperties('todos', 'comprar', '', 'casa 3 quartos')).toEqual([]);
  expect(filterProperties('todos', 'comprar', '', 'casa 200 m²')).toEqual([]);
});

test('finalidade escrita não pode contrariar o filtro selecionado', () => {
  expect(ids(filterProperties('litoral', 'alugar', '', 'alugar apartamento mar'))).toEqual(['litoral-03']);
  expect(filterProperties('litoral', 'comprar', '', 'alugar apartamento mar')).toEqual([]);
});

test('palavras precisam existir no catálogo sem inventar aproximação', () => {
  expect(filterProperties('todos', 'comprar', '', 'apart')).toEqual([]);
  expect(filterProperties('todos', 'comprar', '', 'helicóptero')).toEqual([]);
  expect(ids(filterProperties('todos', 'comprar', '', 'rio grande do sul varanda'))).toEqual(['urbano-01', 'urbano-03']);
});
