/**
 * M Switch — camada determinística de correspondência.
 *
 * Não avalia imóveis, não aprova crédito, não constitui oferta e não envia mensagens.
 * Recebe apenas perfis que a operação já validou e consentiu em compartilhar.
 */
const amount = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(label + ' deve ser um valor não negativo em centavos.');
  return value;
};
const key = value => String(value ?? '').trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const keys = values => Array.isArray(values) ? values.map(key).filter(Boolean) : [];
const validId = value => typeof value === 'string' && value.trim().length > 0;
const optAmount = (value, label) => value == null ? null : amount(value, label);

/**
 * Sugere investidores compatíveis com um imóvel que o proprietário autorizou compartilhar.
 *
 * asset: {id, city, propertyType, status, ownershipReviewed, sharingAuthorized,
 *         minAcceptableCents, referencePriceCents?}
 * investors: [{id, active, alertsOptIn, cities, propertyTypes, minPurchaseCents?,
 *              maxPurchaseCents, desiredDiscountPercent?, fundsVerified?}]
 *
 * Resultados são apenas para análise interna e revisão de um corretor habilitado.
 */
export function rankSwitchInvestors(asset, investors, { limit = 20 } = {}) {
  if (!asset || typeof asset !== 'object' || !Array.isArray(investors)) throw new TypeError('Imóvel e perfis de investidores são obrigatórios.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new TypeError('Limite deve ficar entre 1 e 100.');
  if (!validId(asset.id)) throw new TypeError('O imóvel precisa de identificador.');
  const minAcceptable = amount(asset.minAcceptableCents, 'Valor mínimo aceito');
  const referencePrice = optAmount(asset.referencePriceCents, 'Valor de referência');
  const city = key(asset.city), propertyType = key(asset.propertyType);
  if (!city || !propertyType) throw new TypeError('Cidade e tipo do imóvel são obrigatórios.');
  // Não mostrar a terceiros um imóvel sem revisão de titularidade e autorização.
  if (asset.status !== 'available' || asset.ownershipReviewed !== true || asset.sharingAuthorized !== true) return [];
  const matches = [];
  for (const investor of investors) {
    if (!investor || !validId(investor.id) || investor.active !== true || investor.alertsOptIn !== true) continue;
    if (!keys(investor.cities).includes(city) || !keys(investor.propertyTypes).includes(propertyType)) continue;
    const maxPurchase = optAmount(investor.maxPurchaseCents, 'Orçamento máximo do investidor');
    if (maxPurchase == null || maxPurchase < minAcceptable) continue;
    const minPurchase = investor.minPurchaseCents == null ? 0 : amount(investor.minPurchaseCents, 'Orçamento mínimo do investidor');
    if (minPurchase > maxPurchase || minPurchase > (referencePrice ?? minAcceptable)) continue;
    const pct = investor.desiredDiscountPercent == null ? null : investor.desiredDiscountPercent;
    if (pct != null && (typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100)) continue;
    const flags = [];
    let score = 75; // Cidade + tipo são requisitos obrigatórios, não evidência de intenção de compra.
    const headroom = maxPurchase - minAcceptable;
    score += headroom >= minAcceptable * 0.2 ? 10 : headroom > 0 ? 5 : 0;
    if (investor.fundsVerified === true) score += 10;
    else flags.push('Capacidade financeira do investidor ainda não verificada.');
    if (pct != null) {
      if (referencePrice == null || referencePrice === 0) flags.push('Desconto pretendido sem valor de referência revisado.');
      else if (minAcceptable > referencePrice * (1 - pct / 100)) {
        score -= 10;
        flags.push('Preço mínimo do proprietário supera a faixa de desconto desejada pelo investidor.');
      } else score += 5;
    }
    matches.push({
      assetId: asset.id, investorId: investor.id, score: Math.max(0, Math.min(100, score)),
      stage: 'candidate', requiresBrokerReview: true,
      reasons: ['Cidade atendida.', 'Tipo de imóvel aceito.', 'Orçamento declarado permite avaliar o mínimo do proprietário.'],
      flags
    });
  }
  return matches.sort((a,b) => b.score - a.score || a.investorId.localeCompare(b.investorId)).slice(0, limit);
}

/**
 * Simulação aritmética, não parecer bancário, avaliação, proposta ou aprovação.
 * Valores em centavos. financingPreapprovedCents nulo significa crédito desconhecido.
 */
export function simulateSwitchUpgrade({
  targetPriceCents, saleProceedsCents, debtPayoffCents = 0,
  transactionCostsCents = 0, cashCents = 0, financingPreapprovedCents = null
}) {
  const target = amount(targetPriceCents, 'Preço do imóvel de destino');
  const proceeds = amount(saleProceedsCents, 'Recebimento com a venda');
  const debt = amount(debtPayoffCents, 'Quitação de dívida');
  const costs = amount(transactionCostsCents, 'Custos de transação');
  const cash = amount(cashCents, 'Recursos próprios');
  const approved = optAmount(financingPreapprovedCents, 'Crédito pré-analisado');
  const netSaleCents = proceeds - debt;
  const needsCents = Math.max(0, target + costs - netSaleCents - cash);
  return {
    netSaleCents, needsCents,
    financingPreapprovedCents: approved,
    fundingGapCents: approved == null ? null : Math.max(0, needsCents - approved),
    status: approved == null ? 'credit-not-reviewed' : needsCents <= approved ? 'numeric-fit-only' : 'funding-gap',
    requiresHumanReview: true
  };
}
