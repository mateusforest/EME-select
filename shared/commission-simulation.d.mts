export interface SimulationInput {
  initial: number; fixed: number; floor: number; tax: number; share: number; external: number;
  urbanPrice: number; urbanFee: number; urbanCost: number; urbanInvoice: number;
  ruralPrice: number; ruralFee: number; ruralCost: number; ruralInvoice: number;
  delay: number; ruralMonth: number; n1: number; n2: number; n3: number; n4: number; n5: number; n6: number;
}
export type SimulationScenario = 'base' | 'stress';
export interface SimulationDeal {gross: number; taxes: number; invoice: number; net: number; outside: number; team: number; retained: number; cost: number; margin: number}
export interface SimulationMonth {month: number; units: number; opening: number; fixed: number; urbanCosts: number; ruralCosts: number; expenses: number; before: number; receipt: number; grossReceipts: number; taxes: number; invoice: number; outside: number; team: number; cash: number}
export interface SimulationResult {urban: SimulationDeal; rural: SimulationDeal; months: SimulationMonth[]; low: number; lowMonth: number; reserve: number; required: number; extra: number; final: number; pending: number; effectiveDelay: number; breakeven: number | null}
export const SIMULATION_DEFAULTS: Readonly<SimulationInput>;
export const SIMULATION_LIMITS: Readonly<Record<keyof SimulationInput, {min: number; max: number; integer: boolean}>>;
export function validateSimulation(input: SimulationInput): Partial<Record<keyof SimulationInput, string>>;
export function calculateCommissionSimulation(input: SimulationInput, scenario?: SimulationScenario): SimulationResult;
