export interface ManagedRegion {id:string;stateId:string;stateName:string;city:string;name:string;context:string;asset:string;enabled:boolean;intro:string;collectionTitle:string;postcard:string;imageAlt:string;credit:string;license:string;licenseUrl:string;source:string}
export interface SiteContent {consultantDisplay?:{mode:'team'|'fixed';personId:string};regions:ManagedRegion[];opportunityIds:string[]|null;opportunityPrices:Record<string,number>;regionAssignments:Record<string,string>}
export const siteRecordId:string;
export const initialRegions:ManagedRegion[];
export const internalKinds:string[];
export const propertyRecordsQuery:string;
export function defaultSiteContent():SiteContent;
export function publicSiteContent(data:unknown):SiteContent;
export function applyOpportunityPrices<T extends {id:string;price:number}>(properties:T[],config:SiteContent|undefined):Array<T & {originalPrice?:number}>;
