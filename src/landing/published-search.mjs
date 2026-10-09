const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const amounts = value => Number(value.replace(/[^\d,]/g, '').replace(',', '.'));
const typeGroups = {
  casas: ['casa', 'cabana'], apartamentos: ['apartamento', 'cobertura', 'compacto'],
  comercial: ['loja', 'sala comercial', 'edificio corporativo', 'galpao', 'pavilhao', 'centro de distribuicao'],
  terrenos: ['terreno urbano', 'lote em condominio', 'terra agricola'],
  loja: ['loja'], 'sala comercial': ['sala comercial'], galpao: ['galpao', 'pavilhao', 'centro de distribuicao'],
  cobertura: ['cobertura'], 'area rural': ['terra agricola']
};
export function publishedSearch(properties, interpretation) {
  const criteria = interpretation.criteria.map(fold);
  const broad = criteria.filter(c => ['casas','apartamentos','comercial','terrenos'].includes(c));
  const specific = criteria.filter(c => typeGroups[c] && !broad.includes(c));
  const excluded = criteria.filter(c => c.startsWith('excluir: ')).map(c => c.slice(9));
  const pending = [...interpretation.criteria.filter(c => !typeGroups[fold(c)] && !['em condominio','fora de condominio'].includes(fold(c)) && !fold(c).startsWith('excluir:'))];
  const constraints = [];
  for (const raw of interpretation.unverified) {
    const value = fold(raw);
    if (value.startsWith('localizacao: ')) constraints.push(p => fold(p.location).includes(value.slice(13)));
    else if (value.startsWith('excluir localizacao: ')) constraints.push(p => !fold(p.location).includes(value.slice(20)));
    else if (value === 'compra' || value === 'aluguel') constraints.push(p => p.operation === (value === 'compra' ? 'comprar' : 'alugar'));
    else if (['na serra','no litoral','na cidade'].includes(value)) constraints.push(p => p.environment === ({'na serra':'serra','no litoral':'litoral','na cidade':'urbano'})[value]);
    else if (/r\$/.test(value)) {
      const amount = amounts(value);
      constraints.push(p => Number.isFinite(p.price) && p.price > 0 && (value.startsWith('a partir') ? p.price >= amount : p.price <= amount));
    } else if (/\d+ (?:quarto|vaga)/.test(value)) {
      const amount = Number(value.match(/\d+/)[0]);
      const field = /vaga/.test(value) ? 'parking' : 'bedrooms';
      constraints.push(p => Number.isFinite(p[field]) && (value.startsWith('ate') ? p[field] <= amount : p[field] >= amount));
    } else if (/\d.* (?:m²|ha)$/.test(value)) {
      const amount = amounts(value) * (value.endsWith('ha') ? 10000 : 1);
      constraints.push(p => Number.isFinite(p.area) && p.area > 0 && (value.startsWith('ate') ? p.area <= amount : p.area >= amount));
    } else pending.push(raw);
  }
  const groupMatches = (p, name) => (typeGroups[name] || []).includes(fold(p.type));
  const condominium = p => Boolean(p.condominium || p.locationProfile === 'condominio' || p.type === 'Lote em condomínio');
  const understood = broad.length || specific.length || excluded.length || constraints.length || criteria.includes('em condominio') || criteria.includes('fora de condominio');
  if (!understood) return {matches:[], pending, understood:false};
  const matches = properties.filter(p => p.isIllustrative === false)
    .filter(p => !broad.length || broad.some(c => groupMatches(p,c)))
    .filter(p => !specific.length || specific.some(c => groupMatches(p,c)))
    .filter(p => !excluded.some(c => groupMatches(p,c)))
    .filter(p => !criteria.includes('em condominio') || condominium(p))
    .filter(p => !criteria.includes('fora de condominio') || !condominium(p))
    .filter(p => constraints.every(check => check(p)))
    .map((property,index) => ({property,index,score:pending.filter(c => !/^(Sem |Excluir)/.test(c) && fold([property.description,...(property.tags || [])].join(' ')).includes(fold(c.replace(/^Com /,'')))).length}))
    .sort((a,b) => b.score-a.score || a.index-b.index).map(m => m.property);
  return {matches, pending, understood:true};
}

export function propertyPhotos(property) {
  const allowed = url => typeof url === 'string' && (/^\/api\/photos\/[a-z0-9-]+$/i.test(url) || /^\/assets\//.test(url));
  const photos = (property.images || []).filter(image => allowed(image.url));
  const facade = photos.find(image => /fachada/.test(fold(image.caption)));
  const ordered = facade ? [facade,...photos.filter(image => image !== facade)] : photos;
  if (!ordered.length && allowed(property.image)) ordered.push({url:property.image,caption:property.title});
  return ordered;
}
