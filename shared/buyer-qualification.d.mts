export interface BuyerProfile {operation:string;city:string;neighborhood:string;propertyType:string;budgetMax:number|null;bedrooms:number|null;purpose:string;timeline:string;payment:string;essentials:string;email:string;whatsappUpdates:string;emailUpdates:string;contactPermission:string}
export const buyerChannels:Record<string,string>;
export const buyerEnums:Record<string,Record<string,string>>;
export function emptyBuyer():BuyerProfile;
export function profileForLead(lead:any):BuyerProfile;
export function buyerProfile(input:unknown):BuyerProfile;
export function buyerIntake(input:unknown):any;
export function buyerReadiness(profile:unknown,lead:any,now?:number):{missing:string[];complete:number;total:number;label:string;priority:number;nextAction:string};
export function matchBuyer(profile:unknown,catalog:any[]):any;
