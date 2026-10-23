export interface ManagedRegion {id:string;stateId:string;stateName:string;city:string;name:string;context:string;asset:string;enabled:boolean;intro:string;collectionTitle:string;postcard:string;imageAlt:string;credit:string;license:string;licenseUrl:string;source:string}
export interface SiteContent {regions:ManagedRegion[];opportunityIds:string[]|null;regionAssignments:Record<string,string>}
export const siteRecordId:string;
export const initialRegions:ManagedRegion[];
export const internalKinds:string[];
export const propertyRecordsQuery:string;
export function defaultSiteContent():SiteContent;
export function publicSiteContent(data:unknown):SiteContent;
