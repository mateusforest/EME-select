export type FinanceDirection = 'in' | 'out' | 'transfer'
export type DreGroup = 'revenue' | 'deductions' | 'direct_cost' | 'opex' | 'financial_income' | 'financial_expense' | 'income_tax'
export interface FinanceMeta { createdAt: string; updatedAt: string; createdBy: string }
export interface FinanceAccount extends FinanceMeta { id: string; name: string; kind: 'bank' | 'cash'; bankName: string; openingDate: string; openingBalanceCents: number; openingThirdPartyCents: number; active: boolean }
export interface FinanceEntry extends FinanceMeta { id: string; description: string; category: string; amountCents: number; recognition: 'forecast' | 'recognized'; status: 'open' | 'settled' | 'cancelled'; competenceDate: string; dueDate: string; settledDate: string | null; accountId: string | null; destinationAccountId: string | null; behavior: 'fixed' | 'variable'; costCenter: string; brokerId: string | null; propertyId: string | null; partnerId: string | null; operationId: string | null; recurrenceId: string | null; recurrenceMonth: string | null; notes: string; cancelReason: string | null }
export interface FinanceRecurrence extends FinanceMeta { id: string; name: string; category: string; amountCents: number; behavior: 'fixed' | 'variable'; costCenter: string; brokerId: string | null; propertyId: string | null; partnerId: string | null; startMonth: string; endMonth: string | null; dueDay: number; active: boolean }
export interface FinanceOperation extends FinanceMeta { id: string; title: string; kind: 'sale' | 'rental' | 'management' | 'other'; status: 'active' | 'cancelled'; cancelReason: string | null; amountCents: number; commissionBps: number; commissionCents: number; directCostCents: number; reserveBps: number; reserveCents: number; brokerId: string | null; propertyId: string | null; competenceDate: string; dueDate: string; notes: string }
export interface FinancePartner extends FinanceMeta { id: string; name: string; shareBps: number; active: boolean }
export interface FinanceSettings { reserveBps: number | null; defaultCommissionBps: number | null; cashTargetCents: number | null; initialInvestmentCents: number | null }
export interface FinanceAdjustment extends FinanceMeta { id: string; label: string; group: DreGroup; amountCents: number; competenceDate: string; status: 'active' | 'cancelled'; reason: string; cancelReason: string | null }
export interface FinanceState { version: 1; accounts: FinanceAccount[]; entries: FinanceEntry[]; recurrences: FinanceRecurrence[]; operations: FinanceOperation[]; partners: FinancePartner[]; settings: FinanceSettings; adjustments: FinanceAdjustment[] }
export interface FinanceContext { actorId: string; now?: string; nowISO?: string; members: Array<{id: string; name: string; role: string; active?: boolean}>; properties: Array<{id: string; title: string}> }
export type FinanceCommandType = 'account.save' | 'entry.save' | 'entry.settle' | 'entry.cancel' | 'recurrence.save' | 'recurrence.generate' | 'operation.create' | 'operation.cancel' | 'partner.save' | 'settings.save' | 'adjustment.save' | 'adjustment.cancel'
export interface FinanceCommand { type: FinanceCommandType; data: Record<string, unknown> }
export interface FinanceCategory { id: string; label: string; direction: FinanceDirection; dreGroup: DreGroup | null; recurringRevenue: boolean }
export interface DreValues { revenueCents: number; deductionsCents: number; netRevenueCents: number; directCostCents: number; grossProfitCents: number; operatingExpensesCents: number; operatingProfitCents: number; financialIncomeCents: number; financialExpenseCents: number; incomeTaxCents: number; netProfitCents: number }
export interface FinanceReport {
  cash: { balanceCents: number; thirdPartyHeldCents: number; availableCents: number; reserveSuggestedCents: number; targetCents: number | null; gapCents: number | null; accounts: Array<{id: string; name: string; balanceCents: number; active: boolean}> };
  period: { receivedCents: number; paidCents: number; fixedCostsCents: number; variableCostsCents: number; overdueReceivableCents: number; overduePayableCents: number; operatingCashCents: number; byCategory: Array<{category: string; label: string; amountCents: number; direction: FinanceDirection}> };
  dre: { automatic: DreValues; manual: DreValues; combined: DreValues };
  mrrCents: number; arrCents: number;
  projections: Array<{month: string; openingCents: number; receivableCents: number; payableCents: number; thirdPartyInCents: number; thirdPartyOutCents: number; retainedFeesCents: number; closingCents: number; availableCents: number; belowTarget: boolean}>;
  brokers: Array<{id: string; name: string; operations: number; revenueCents: number; commissionCents: number; directCostCents: number; contributionCents: number; receivedCents: number}>;
  distribution: { eligibleCents: number; allocatedBps: number; ready: boolean; payableHorizon: string; commitmentsCents: number; shares: Array<{id: string; name: string; shareBps: number; amountCents: number}> };
  payback: { investmentCents: number | null; recoveredCents: number; remainingCents: number | null; monthsEstimate: number | null; reached: boolean };
  warnings: string[];
}
export const FINANCE_CATEGORIES: readonly FinanceCategory[]
export const DRE_GROUPS: readonly { id: DreGroup; label: string }[]
export class FinanceError extends Error { code: string; status: number }
export function emptyFinance(): FinanceState
export function applyFinanceCommand(state: FinanceState, command: FinanceCommand, context: FinanceContext): FinanceState
export function financeReport(state: FinanceState, period: {from: string; to: string; asOf: string}, members?: Array<{id: string; name: string}>): FinanceReport
export function percentCents(amountCents: number, basisPoints: number): number
