// Encontrar imóveis de destino para quem deseja trocar/realizar upgrade.
// Apenas sugestão interna: não valida financiamento, avaliação ou acordo entre as partes.
const key = value => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
const positive = value => Number.isSafeInteger(value)&&value>=1000000;
export function rankSwitchUpgradeTargets(requests,{limit=200}={}){
  if(!Array.isArray(requests)||!Number.isInteger(limit)||limit<1||limit>500)throw TypeError('Lista ou limite inválidos.');
  const eligible=r=>r&&r.status==='qualified'&&r.kind!=='invest'&&r.ownership_reviewed===true&&r.sharing_authorized===true&&positive(Number(r.min_acceptable_cents));
  const assets=requests.filter(eligible);
  const results=[];
  for(const buyer of assets.filter(r=>r.kind==='swap'&&key(r.target_city)&&positive(Number(r.target_budget_cents)))){
    for(const asset of assets){
      if(asset.id===buyer.id||key(asset.city)!==key(buyer.target_city))continue;
      if(Number(asset.min_acceptable_cents)>Number(buyer.target_budget_cents))continue;
      results.push({
        kind:'upgrade-target',assetId:asset.id,investorId:buyer.id,
        score:75+(Number(asset.min_acceptable_cents)<=Number(buyer.target_budget_cents)*0.9?10:0),
        stage:'candidate',requiresBrokerReview:true,
        reasons:['Cidade de destino compatível.','Preço mínimo revisado dentro do orçamento declarado para o imóvel desejado.'],
        flags:['A venda do imóvel de origem, crédito, disponibilidade e condições de troca ainda exigem análise.']
      });
    }
  }
  return results.sort((a,b)=>b.score-a.score||a.assetId.localeCompare(b.assetId)).slice(0,limit);
}
