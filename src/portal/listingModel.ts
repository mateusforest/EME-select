import type { Property } from '../data';
export interface Draft {
 privateAddress:string;ownerName:string;ownerContact:string;title:string;city:string;neighborhood:string;type:string;environment:Property['environment'];condominium:''|'horizontal'|'vertical';operation:'comprar'|'alugar';
 price:number|null;area:number|null;bedrooms:number|null;suites:number|null;parking:number|null;condominiumFee:number|null;propertyTax:number|null;
 description:string;features:string;reasons:string;costNotes:string;
}
export interface Photo {id:string;url:string;caption:string;width:number;height:number;position:number}
export interface Listing {id:string;version:number;draft:Draft;photos:Photo[];stage:string;published:boolean;publishedVersion:number|null;blockers:string[]}
export const emptyDraft:Draft={privateAddress:'',ownerName:'',ownerContact:'',title:'',city:'',neighborhood:'',type:'Casa',environment:'urbano',condominium:'',operation:'comprar',price:null,area:null,bedrooms:null,suites:null,parking:null,condominiumFee:null,propertyTax:null,description:'',features:'',reasons:'',costNotes:''};
export const listingTypes=['Casa','Casa em condomínio','Apartamento','Compacto','Cabana','Sala comercial','Loja','Edifício corporativo','Galpão','Pavilhão','Centro de distribuição','Terreno urbano','Lote em condomínio','Terra agrícola'];
export function listingProperty(item:Listing):Property {const d=item.draft;return {id:item.id,title:d.title,environment:d.environment,condominium:d.condominium||undefined,location:[d.neighborhood,d.city].filter(Boolean).join(' · '),type:(d.type==='Casa em condomínio'?'Casa':d.type) as Property['type'],operation:d.operation,price:d.price||0,area:d.area||0,bedrooms:d.bedrooms,suites:d.suites,parking:d.parking,description:d.description,tags:d.features.split('\n').filter(Boolean),reasons:d.reasons.split('\n').filter(Boolean),image:item.photos[0]?.url||'',images:item.photos.map(p=>({url:p.url,caption:p.caption})),costNotes:d.costNotes,condominiumFee:d.condominiumFee,propertyTax:d.propertyTax,isIllustrative:false,hasInterior:false};}
