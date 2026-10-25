export const siteRecordId='eae00000-0000-4000-8000-000000000003';
export const internalKinds=['directory','development','site_content','company_document','select_account','site_analytics'];
// Filter before fetching: company document bytes must never enter property feeds.
export const propertyRecordsQuery='&data->>deletedAt=is.null&or=(data->>kind.is.null,data->>kind.not.in.(directory,development,site_content,company_document,select_account,site_analytics))';
export const initialRegions=[
 {id:'vacaria',stateId:'rs',stateName:'Rio Grande do Sul',city:'Vacaria',name:'Vacaria',context:'Rio Grande do Sul',asset:'region-vacaria',enabled:true,intro:'Uma cidade para chamar de sua. Imóveis escolhidos com atenção ao espaço, à construção e à sua rotina.',collectionTitle:'Seu próximo lugar em Vacaria.',postcard:'Catedral Nossa Senhora da Oliveira · Vacaria',imageAlt:'Catedral Nossa Senhora da Oliveira, em Vacaria.',credit:'Ederson Pereira Boeira · 2005',license:'Domínio público',licenseUrl:'https://commons.wikimedia.org/wiki/File:Centrodevacaria-rs-brasil.JPG',source:'https://commons.wikimedia.org/wiki/File:Centrodevacaria-rs-brasil.JPG'},
 {id:'praia-de-palmas',stateId:'sc',stateName:'Santa Catarina',city:'Governador Celso Ramos',name:'Praia de Palmas',context:'Governador Celso Ramos · SC',asset:'region-palmas',enabled:true,intro:'O mar como parte da paisagem. Um novo lugar para encontrar o espaço que combina com seus planos.',collectionTitle:'Novas possibilidades em Palmas.',postcard:'Praia de Palmas · Governador Celso Ramos',imageAlt:'Vista da orla da Praia de Palmas.',credit:'Otávio Nogueira · 2015',license:'CC BY 2.0',licenseUrl:'https://creativecommons.org/licenses/by/2.0/',source:'https://commons.wikimedia.org/wiki/File:Praia_de_Palmas_(19895533034).jpg'}
];
export function defaultSiteContent(){return {regions:structuredClone(initialRegions),opportunityIds:null,opportunityPrices:{},regionAssignments:{},consultantDisplay:{mode:'team',personId:''}};}
export function publicSiteContent(data){const config={...defaultSiteContent(),...data?.config};return {...config,regions:config.regions.filter(r=>r.enabled)};}
// Discounts only affect the public offer while the property is selected. The
// listing's published base price stays intact and returns when the offer ends.
export function applyOpportunityPrices(properties,config){
 return properties.map(p=>{
  const price=config?.opportunityPrices?.[p.id];
  const selected=config?.opportunityIds===null||config?.opportunityIds?.includes(p.id);
  return selected&&Number.isFinite(price)&&price>0&&price<p.price?{...p,originalPrice:p.price,price}:p;
 });
}
