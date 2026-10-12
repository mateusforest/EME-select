import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePublicRoute,environmentHref,publicTitle,publicReasons} from '../src/public-presentation.mjs';
test('legacy environment URLs lead to matching modern scenes',()=>{
 for(const id of ['todos','serra','litoral','urbano','condominios','comercial','terrenos','industrial']){
  assert.equal(resolvePublicRoute(`#/ambientes/${id}`),environmentHref(id));
  assert.ok(!environmentHref(id).includes('/ambientes/'));
 }
 assert.equal(resolvePublicRoute('#/ambientes/urbano'),'#/?ambiente=cidade');
 assert.match(resolvePublicRoute('#/ambientes/industrial'),/opcao=galpao/);
 for(const hash of ['#/colecao?tipo=Casa','#/imovel/123','#/empreendimentos/g400','#/ambientes/inexistente']) assert.equal(resolvePublicRoute(hash),hash);
});
test('public copy removes editorial directions without changing source records',()=>{
 const source={reasons:['Destacar a suíte com closet.','Valorizar editorialmente os pátios.','Mencionar painéis solares sem prometer economia.'],tags:['Suíte com closet','15 painéis solares informados']};
 const before=JSON.stringify(source);
 assert.deepEqual(publicReasons(source),source.tags);assert.equal(JSON.stringify(source),before);
 assert.deepEqual(publicReasons({reasons:['Sala e cozinha integradas.'],tags:['Outro']}),['Sala e cozinha integradas.']);
 assert.equal(publicTitle('CASA NO TURQUESA'),'Casa no turquesa');
 assert.equal(publicTitle('Casa M Veredas'),'Casa M Veredas');
 assert.equal(publicTitle('EME SELECT'),'EME select');
});
