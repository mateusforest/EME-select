// M Switch — ingestão de carteira autorizada e busca de compradores sem dados privados do proprietário.
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
const str=(v,label,min,max)=>typeof v==='string'&&v.trim().length>=min&&v.trim().length<=max?v.trim():fail('Confira '+label+'.');
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
const money=v=>Number.isSafeInteger(v)&&v>=1_000_000&&v<=1_000_000_000_000?v:fail('Preço inválido (centavos).');
export function validateSwitchPartnerImport(body){
  if(!body||typeof body!=='object'||Array.isArray(body))fail('Lote inválido.');
  if(Object.keys(body).some(k=>!['partner','authorizationConfirmed','offers'].includes(k)))fail('Campos não permitidos.');
  if(body.authorizationConfirmed!==true)fail('Confirme a autorização escrita para inserir os imóveis deste parceiro.');
  const partner=str(body.partner,'o parceiro',3,100);
  if(!Array.isArray(body.offers)||body.offers.length<1||body.offers.length>100)fail('Envie de 1 a 100 imóveis.');
  const seen=new Set();
  return {partner,offers:body.offers.map(row=>{
    if(!row||typeof row!=='object'||Array.isArray(row))fail('Imóvel inválido.');
    if(Object.keys(row).some(k=>!['ref','title','city','propertyType','priceCents','url','available'].includes(k)))fail('Campos de imóvel não permitidos.');
    const ref=str(row.ref,'a referência',1,80);
    if(!/^[\p{L}\p{N}_.-]+$/u.test(ref)||seen.has(ref))fail('Referência duplicada ou inválida.');
    seen.add(ref);
    let href;
    try{
      const parsed=new URL(str(row.url,'o link autorizado',12,500));
      if(parsed.protocol!=='https:'||parsed.username||parsed.password||!parsed.hostname.includes('.')||parsed.hostname==='localhost')fail('Informe um link HTTPS público.');
      href=parsed.toString();
    }catch{fail('Informe um link HTTPS público para cada imóvel.');}
    if(typeof row.available!=='boolean')fail('Informe a disponibilidade declarada.');
    return {ref,title:str(row.title,'o título',3,120),city:str(row.city,'a cidade',2,100),
      propertyType:str(row.propertyType,'o tipo',2,60),priceCents:money(row.priceCents),
      url:href,available:row.available};
  })};
}
export function matchSwitchDemand(requests,offers,{limit=200}={}){
  if(!Array.isArray(requests)||!Array.isArray(offers)||!Number.isInteger(limit)||limit<1||limit>1000)throw TypeError('Dados de correspondência inválidos.');
  const results=[];
  const eligible=requests.filter(r=>r&&r.status==='qualified'&&['buy','swap','invest'].includes(r.kind));
  for(const demand of eligible){
    const city=norm(demand.kind==='swap'?demand.target_city:demand.city);
    const max=Number(demand.kind==='swap'?demand.target_budget_cents:demand.asking_cents);
    if(!city||!Number.isSafeInteger(max)||max<1_000_000)continue;
    for(const offer of offers){
      if(!offer||offer.available!==true||offer.authorization_confirmed!==true||!offer.partner||!offer.ref)continue;
      if(city!==norm(offer.city)||norm(demand.property_type)!==norm(offer.property_type))continue;
      const price=Number(offer.price_cents);
      if(!Number.isSafeInteger(price)||price<1_000_000||price>max)continue;
      results.push({
        kind:'partner-offer',assetId:offer.id,investorId:demand.id,
        score:75+(price<=max*0.9?10:0),stage:'candidate',requiresBrokerReview:true,
        reasons:['Cidade e tipo do imóvel compatíveis.','Valor informado dentro do orçamento declarado.'],
        flags:['Disponibilidade, divulgação autorizada e documentação precisam ser reconfirmadas antes de apresentar.']
      });
    }
  }
  return results.sort((a,b)=>b.score-a.score||String(a.assetId).localeCompare(String(b.assetId))).slice(0,limit);
}
