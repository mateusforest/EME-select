export interface SwitchFeeQuote {
 salePriceCents:number;
 brokerageBps:number;
 switchShareBps:number;
 grossCommissionCents:number;
 switchShareCents:number;
 partnerShareCents:number;
 contingent:boolean;
 requiresSignedAgreement:boolean;
 description:string;
}
export function switchDealQuote(input:{salePriceCents:number;brokerageBps:number;switchShareBps:number}):SwitchFeeQuote;
export function switchOfferDraft(input:Record<string,unknown>,source:Record<string,unknown>,target:Record<string,unknown>):SwitchFeeQuote&{sourceKind:'switch_request'|'partner_offer';sourceId:string;demandId:string;expiresDays:number};
export function switchOfferTeaser(deal:Record<string,unknown>):Record<string,unknown>;
export function switchOfferAcceptance(body:Record<string,unknown>):Record<string,unknown>;
export function switchDealTransition(deal:{status:string},action:string,details?:Record<string,unknown>):{status:string};
