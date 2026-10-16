export type FinancingInput = {price:number;downPayment:number;months:number;annualRate:number;system:'SAC'|'PRICE'};
export type FinancingResult = {principal:number;monthlyRate:number;first:number;last:number;interest:number;total:number;schedule:{month:number;payment:number;interest:number;amortization:number;balance:number}[]};
export function calculateFinancing(input:FinancingInput):FinancingResult|null;
