import {catalogDefaults,catalogFromQuery,selectCatalog} from './catalog.js';

export const opportunityDefaults={type:'',region:'',sort:'selection'};
export function opportunitiesFromQuery(query){
 const filters=catalogFromQuery(query);
 return {type:filters.type,region:filters.region,sort:['selection','price-asc','price-desc'].includes(filters.sort)?filters.sort:'selection'};
}
export function opportunitiesHash(filters){
 const query=new URLSearchParams();
 if(filters.type)query.set('tipo',filters.type);
 if(filters.region)query.set('regiao',filters.region);
 if(filters.sort&&filters.sort!=='selection')query.set('ordem',filters.sort);
 return '#/oportunidades'+(query.size?'?'+query.toString():'');
}
export function selectOpportunities(properties,filters){
 // An editorial view of published inventory: never infer discounts or urgency from price.
 return selectCatalog(properties.filter(p=>p.opportunity!==false),{...catalogDefaults,...filters});
}
