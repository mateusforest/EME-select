import test from 'node:test';
import assert from 'node:assert/strict';
import {portalMenuForRole,portalNavigationForRole,portalNavigation,portalPath,portalPageFromPath} from '../src/portal/portalNavigation.ts';

test('broker navigation preserves working routes without exposing administrative areas',()=>{
 const items=portalNavigationForRole('corretor');
 for(const id of ['imoveis','leads','documentos','relacionamento','conversas','comissoes','conta'])assert.ok(items.some(item=>item.id===id));
 for(const id of ['financeiro','empresa-documentos','equipe','qualidade','site','regioes','oportunidades'])assert.ok(!items.some(item=>item.id===id));
 for(const item of items)assert.equal(portalPageFromPath(portalPath(item.id)),item.id);
 assert.equal(items.find(item=>item.id==='leads').label,'Meus leads');
 assert.equal(items.find(item=>item.id==='comissoes').group,'Resultados');
});

test('broker presentation does not mutate the shared administrative navigation',()=>{
 const before=JSON.stringify(portalNavigation);portalNavigationForRole('corretor');
 assert.equal(JSON.stringify(portalNavigation),before);
 const admin=portalNavigationForRole('admin');
 assert.ok(admin.some(item=>item.id==='financeiro'));
 assert.ok(admin.some(item=>item.id==='empresa-documentos'));
 assert.ok(!admin.some(item=>item.id==='comissoes'));
 assert.equal(admin.find(item=>item.id==='leads').label,'Leads');
});


test('compact menu keeps every permitted destination reachable without duplicates',()=>{
 for(const role of ['admin','corretor']){
  const menu=portalMenuForRole(role);
  assert.equal(menu.primary.length,6);
  const ids=[...menu.primary,...menu.sections.flatMap(s=>s.items)].map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length);
  const expected=portalNavigationForRole(role).filter(item=>!item.secondary&&item.id!=='conta').map(item=>item.id);
  assert.deepEqual([...ids].sort(),expected.sort());
 }
});
