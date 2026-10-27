import type {BuyerProfile} from './buyer-qualification.mjs';
export const buyerMessageKinds:Record<string,string>;
export function buyerMessageDraft(input:{kind:string;profile:BuyerProfile;lead:any;matches?:any[];origin:string}):string;
