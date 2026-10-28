const text = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const catalogDefaults = {q:'', operation:'', type:'', state:'', region:'', min:'', max:'', area:'', beds:'', parking:'', saved:false, sort:'selection'};
const keys = {q:'q', operation:'finalidade', type:'tipo', state:'estado', region:'regiao', min:'min', max:'max', area:'area', beds:'quartos', parking:'vagas', saved:'salvos', sort:'ordem'};
export function catalogFromQuery(query) {
  const params = new URLSearchParams(query), filters = {...catalogDefaults};
  for (const [key,param] of Object.entries(keys)) {
    if (key === 'saved') filters.saved = params.get(param) === '1';
    else if (params.has(param)) filters[key] = params.get(param).slice(0,180);
  }
  for (const key of ['min','max','area','beds','parking']) if (!/^\d+(\.\d+)?$/.test(filters[key])) filters[key] = '';
  if (!['','comprar','alugar'].includes(filters.operation)) filters.operation = '';
  if (!['selection','price-asc','price-desc','area-desc'].includes(filters.sort)) filters.sort = 'selection';
  return filters;
}
export function catalogHash(filters) {
  const query = new URLSearchParams();
  for (const [key,param] of Object.entries(keys)) if (filters[key] && filters[key] !== catalogDefaults[key]) query.set(param, key === 'saved' ? '1' : filters[key]);
  return '#/colecao'+(query.size ? '?'+query.toString() : '');
}
export function propertyState(property, regions) {
  const region = regions.find(item => item.id === property.regionId);
  if (region) return region.stateId;
  const place = text(property.location);
  return /rio grande do sul|\brs\b/.test(place) ? 'rs' : /santa catarina|\bsc\b/.test(place) ? 'sc' : '';
}
export function selectCatalog(properties, filters, savedIds = new Set(), regions = []) {
  const terms = text(filters.q).trim().split(/\s+/).filter(Boolean);
  const result = properties.filter(p => {
    const haystack = text([p.title,p.location,p.description,p.type,...(p.tags || [])].join(' '));
    const price = p.searchFacts.price;
    return terms.every(term => haystack.includes(term)) &&
      (!filters.operation || p.operation === filters.operation) &&
      (!filters.type || p.type === filters.type || p.group === filters.type) &&
      (!filters.state || propertyState(p,regions) === filters.state) &&
      (!filters.region || p.regionId === filters.region) &&
      (!filters.min || Number.isFinite(price) && price >= Number(filters.min)) && (!filters.max || Number.isFinite(price) && price <= Number(filters.max)) &&
      (!filters.area || p.area >= Number(filters.area)) &&
      (!filters.beds || p.bedrooms >= Number(filters.beds)) &&
      (!filters.parking || p.parking >= Number(filters.parking)) &&
      (!filters.saved || savedIds.has(p.id));
  });
  if (['price-asc','price-desc'].includes(filters.sort)) result.sort((a,b) => {
    const left=a.searchFacts.price,right=b.searchFacts.price;
    if(!Number.isFinite(left))return Number.isFinite(right)?1:0;
    if(!Number.isFinite(right))return -1;
    return filters.sort==='price-asc'?left-right:right-left;
  });
  if (filters.sort === 'area-desc') result.sort((a,b) => (b.area||0)-(a.area||0));
  return result;
}
