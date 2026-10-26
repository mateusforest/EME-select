export interface AcquisitionProposal {propertyId:string;clientName:string;title:string;location:string;eyebrow:string;unit:string;block:string;intro:string;features:string;developer:string;photoId:string;photoCaption:string;proposedPrice:number;advertisedPrice:number;issuedOn:string;validUntil:string;validTime:string;payments:{label:string;note:string;amount:number}[];included:string;expenses:string;advisorName:string;advisorContact:string;notes:string}
export interface ProposalRecord {id:string;version:number;reference:string;createdAt:string;updatedAt:string;archived:boolean;author:string;proposal:AcquisitionProposal}
export const proposalKind:string;
export const proposalLimits:Record<string,number>;
export function proposalMoney(value:number):string;
export function cents(value:number):number;
export function proposalDefaults(listing:any,user:{name:string;email:string},today?:string):AcquisitionProposal;
export function validateProposal(input:unknown):AcquisitionProposal;
