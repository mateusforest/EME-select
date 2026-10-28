import test from 'node:test';
import assert from 'node:assert/strict';
import { rankSwitchInvestors, simulateSwitchUpgrade } from '../shared/switch-matching.mjs';

const asset = {
  id: 'casa-1', city: 'Vacaria', propertyType: 'Casa',
  status: 'available', ownershipReviewed: true, sharingAuthorized: true,
  minAcceptableCents: 32000000, referencePriceCents: 35000000
};
const investor = {
  id: 'investidor-1', active: true, alertsOptIn: true,
  cities: ['VACÁRIA', 'Caxias do Sul'], propertyTypes: ['casa'],
  maxPurchaseCents: 34000000, fundsVerified: true
};

test('não permite cruzamento de imóvel sem autorização, sem revisão ou indisponível', () => {
  for (const change of [
    { sharingAuthorized: false },
    { ownershipReviewed: false },
    { status: 'reserved' }
  ]) assert.deepEqual(rankSwitchInvestors({ ...asset, ...change }, [investor]), []);
});
test('exige perfil ativo e autorização de alerta', () => {
  assert.deepEqual(rankSwitchInvestors(asset, [{ ...investor, active: false }]), []);
  assert.deepEqual(rankSwitchInvestors(asset, [{ ...investor, alertsOptIn: false }]), []);
});
test('compatibilidade exige cidade, tipo e orçamento declarados', () => {
  const entries = [
    investor,
    { ...investor, id: 'outra-cidade', cities: ['Porto Alegre'] },
    { ...investor, id: 'outro-tipo', propertyTypes: ['Apartamento'] },
    { ...investor, id: 'sem-orcamento', maxPurchaseCents: null },
    { ...investor, id: 'orcamento-insuficiente', maxPurchaseCents: 30000000 }
  ];
  assert.deepEqual(rankSwitchInvestors(asset, entries).map(x => x.investorId), ['investidor-1']);
});
test('classifica como oportunidade pendente de revisão humana, nunca oferta aprovada', () => {
  const [match] = rankSwitchInvestors(asset, [investor]);
  assert.equal(match.stage, 'candidate');
  assert.equal(match.requiresBrokerReview, true);
  assert.ok(match.reasons.length > 0);
});
test('explica quando desconto desejado exige valor inferior ao mínimo do vendedor', () => {
  const [match] = rankSwitchInvestors(asset, [{ ...investor, desiredDiscountPercent: 20 }]);
  assert.ok(match.flags.some(x => x.includes('desconto desejada')));
});
test('não descarta investidor que declara mínimo acima da pedida do proprietário', () => {
  const [match] = rankSwitchInvestors(asset, [{ ...investor, minPurchaseCents: 33000000 }]);
  assert.equal(match.investorId, investor.id);
});
test('ordenação determinística e limite definido', () => {
  const second = { ...investor, id: 'investidor-2', fundsVerified: false };
  const result = rankSwitchInvestors(asset, [second, investor], { limit: 1 });
  assert.equal(result.length, 1);
  assert.equal(result[0].investorId, investor.id);
});
test('falha em valores financeiros inválidos', () => {
  assert.throws(() => rankSwitchInvestors({ ...asset, minAcceptableCents: -1 }, [investor]), TypeError);
  assert.throws(() => simulateSwitchUpgrade({ targetPriceCents: Number.NaN, saleProceedsCents: 0 }), TypeError);
});
test('simula upgrade com saldo líquido e crédito ainda não avaliado', () => {
  const result = simulateSwitchUpgrade({
    targetPriceCents: 60000000, saleProceedsCents: 35000000,
    debtPayoffCents: 5000000, transactionCostsCents: 2000000, cashCents: 3000000
  });
  assert.equal(result.netSaleCents, 30000000);
  assert.equal(result.needsCents, 29000000);
  assert.equal(result.fundingGapCents, null);
  assert.equal(result.status, 'credit-not-reviewed');
  assert.equal(result.requiresHumanReview, true);
});
test('simulação não confunde pré-análise com aprovação da negociação', () => {
  const fit = simulateSwitchUpgrade({
    targetPriceCents: 60000000, saleProceedsCents: 35000000, financingPreapprovedCents: 25000000
  });
  assert.equal(fit.needsCents, 25000000);
  assert.equal(fit.status, 'numeric-fit-only');
  assert.equal(fit.requiresHumanReview, true);
  const short = simulateSwitchUpgrade({
    targetPriceCents: 60000000, saleProceedsCents: 35000000, financingPreapprovedCents: 20000000
  });
  assert.equal(short.fundingGapCents, 5000000);
  assert.equal(short.status, 'funding-gap');
});
