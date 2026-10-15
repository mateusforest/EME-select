import { expect, test, type Page } from '@playwright/test';
import { applyFinanceCommand, emptyFinance, financeReport, type FinanceCommand, type FinanceState } from '../shared/finance.mjs';

test.setTimeout(60000);
const admin={id:'a51dd98c-7f63-46a5-a1b3-bd0686129337',name:'Gestão EME',role:'admin',active:true,mustChangePassword:false};
const broker={id:'f0c9d6d4-d74d-4ec3-9abc-e52b21b21f21',name:'Corretora Teste',role:'corretor',active:true};
const property={id:'41bba750-e9ab-4922-a010-228c63c1702e',title:'Imóvel real do cadastro'};
const now=new Date(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(now),month=day.slice(0,7);
const period={from:month+'-01',to:month+'-'+new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate(),asOf:day};
async function app(page:Page){
  let state:FinanceState=emptyFinance(),version=0;
  const context={actorId:admin.id,now:now.toISOString(),members:[admin,broker],properties:[property]};
  const snapshot=()=>({state,version,history:[],members:[admin,broker],properties:[property]});
  const seed=(command:FinanceCommand)=>{state=applyFinanceCommand(state,command,context);version++;};
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/session')return route.fulfill({json:{user:admin,needsSetup:false}});
    if(path==='/api/evaluations')return route.fulfill({json:{evaluations:[]}});
    if(path==='/api/assignees')return route.fulfill({json:{members:[admin,broker]}});
    if(path==='/api/finance')return route.fulfill({json:snapshot()});
    if(path==='/api/finance/commands'){
      const body=route.request().postDataJSON();
      if(body.version!==version)return route.fulfill({status:409,json:{error:'Dados alterados.'}});
      try{seed(body.command);return route.fulfill({json:snapshot()});}
      catch(error){return route.fulfill({status:400,json:{error:(error as Error).message}});}
    }
    return route.fulfill({status:404,json:{error:'Unexpected API '+path}});
  });
  return {seed,state:()=>state,report:()=>financeReport(state,period,[admin,broker]),open:async()=>{await page.goto('/portalselect/financeiro');await expect(page.getByRole('region',{name:'Central financeira'})).toBeVisible();}};
}
const tab=async(page:Page,name:string)=>page.getByRole('navigation',{name:'Seções do financeiro'}).getByRole('button',{name,exact:true}).click();
const submit=async(page:Page,label='Salvar registro')=>{await page.getByRole('dialog').getByRole('button',{name:label,exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);};

test('50k and 100k sales recognize net profit, distribute all partners and record gross withholding without DRE expense',async({page})=>{
  const a=await app(page);
  a.seed({type:'account.save',data:{name:'Conta própria',kind:'bank',openingDate:day,openingBalanceCents:1000000,openingThirdPartyCents:0}});
  a.seed({type:'settings.save',data:{reserveBps:0,defaultCommissionBps:5000,cashTargetCents:1000000,partnerRepaymentBps:2500}});
  for(const name of ['Sócia Ana','Sócio Bruno'])a.seed({type:'partner.save',data:{name,shareBps:5000,active:true}});
  await a.open();
  await tab(page,'Operações e corretores');
  for(const [title,revenue,tax] of [['Venda urbana 50 mil','50000','6000'],['Venda rural 100 mil','100000','12000']]){
    await page.getByRole('button',{name:'Nova operação',exact:true}).click();
    const dialog=page.getByRole('dialog');
    await expect(dialog.getByLabel('Reconhecimento da operação',{exact:true})).toHaveValue('recognized');
    await expect(dialog.getByLabel('Sócio vinculado',{exact:true})).toHaveCount(0);
    await dialog.getByLabel('Nome da operação',{exact:true}).fill(title);
    await dialog.getByLabel('Receita da EME (R$)',{exact:true}).fill(revenue);
    await dialog.getByLabel('Tributos desta operação (R$)',{exact:true}).fill(tax);
    await dialog.getByLabel('Corretor responsável',{exact:true}).selectOption(broker.id);
    await dialog.getByLabel('Imóvel vinculado',{exact:true}).selectOption(property.id);
    await submit(page,'Criar operação');
  }
  expect(a.state().entries.every(e=>e.recognition==='recognized')).toBe(true);
  expect(a.state().operations.map(o=>o.commissionCents)).toEqual([2200000,4400000]);
  expect(a.report().dre.combined.netProfitCents).toBe(6600000);
  expect(a.report().cash.availableCents).toBe(1000000);
  await tab(page,'DRE e projeções');
  const distribution=page.getByRole('region',{name:'Distribuição entre os sócios'});
  await expect(distribution.getByRole('table').first().getByRole('row').filter({hasText:'Sócia Ana'})).toContainText('33.000,00');
  await expect(distribution.getByRole('button',{name:'Programar distribuição',exact:true})).toBeDisabled();
  await tab(page,'Lançamentos');
  for(const title of ['Venda urbana 50 mil','Venda rural 100 mil']){
    await page.getByRole('row').filter({has:page.getByText(title,{exact:true})}).getByRole('button',{name:'Receber',exact:true}).click();
    await submit(page,'Confirmar recebimento');
  }
  expect(a.report().cash.availableCents).toBe(16000000);
  expect(a.report().distribution.eligibleCents).toBe(6600000);
  await tab(page,'DRE e projeções');
  await page.screenshot({path:'tmp/finance-flow-dre-desktop.png',fullPage:true});
  await distribution.getByRole('button',{name:'Programar distribuição',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Valores brutos; retenções são informadas na confirmação do pagamento.');
  await page.getByRole('dialog').getByLabel('Deliberação e motivo da programação',{exact:true}).fill('Deliberação dos sócios após conferir o resultado e a reserva.');
  await submit(page,'Confirmar distribuição programada');
  expect(a.state().entries.filter(e=>e.category==='partner_distribution').map(e=>e.amountCents)).toEqual([3300000,3300000]);
  expect(a.report().dre.combined.netProfitCents).toBe(6600000);
  await tab(page,'Sócios e regras');
  const byPartner=page.getByRole('table',{name:'Lucros por sócio · acumulados até hoje, em valores brutos'});
  await expect(byPartner.getByRole('row').filter({hasText:'Sócia Ana'})).toContainText('33.000,00');
  await tab(page,'Lançamentos');
  const partnerRow=page.getByRole('row').filter({has:page.getByText('Lucros · Sócia Ana · '+month,{exact:true})});
  await partnerRow.getByRole('button',{name:'Pagar',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Imposto retido do sócio (R$)',{exact:true}).fill('3300');
  await expect(dialog.getByLabel('Vencimento do imposto retido',{exact:true})).toBeVisible();
  await submit(page,'Confirmar pagamento');
  await expect(partnerRow).toContainText('Retenção: R$ 3.300,00');
  await expect(partnerRow).toContainText('Líquido pago: R$ 29.700,00');
  expect(a.report().cash.availableCents).toBe(13030000);
  expect(a.state().entries.find(e=>e.category==='partner_withholding')?.amountCents).toBe(330000);
  expect(a.report().dre.combined.netProfitCents).toBe(6600000);
  await tab(page,'Sócios e regras');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'tmp/finance-flow-partners-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('80k and 20k historical loans never duplicate cash and compensation respects its monthly cap',async({page})=>{
  const a=await app(page);
  a.seed({type:'account.save',data:{name:'Conta histórica',kind:'bank',openingDate:day,openingBalanceCents:10000000,openingThirdPartyCents:0}});
  a.seed({type:'settings.save',data:{reserveBps:0,defaultCommissionBps:5000,cashTargetCents:2000000,partnerRepaymentBps:2500}});
  await a.open();await tab(page,'Sócios e regras');
  for(const [name,value] of [['Sócia Ana','80000'],['Sócio Bruno','20000']]){
    await page.getByRole('button',{name:'Adicionar sócio',exact:true}).click();
    const dialog=page.getByRole('dialog');
    await dialog.getByLabel('Nome do sócio',{exact:true}).fill(name);
    await dialog.getByLabel('Participação na distribuição (%)',{exact:true}).fill('50');
    await dialog.getByLabel('Data de referência do histórico',{exact:true}).fill(day);
    await dialog.getByLabel('Aportes reembolsáveis no histórico (R$)',{exact:true}).fill(value);
    await submit(page);
  }
  expect(a.state().entries).toHaveLength(0);
  expect(a.report().cash.availableCents).toBe(10000000);
  expect(a.report().dre.combined.netProfitCents).toBe(0);
  expect(a.report().partnerCapital.plannedCents).toBe(2000000);
  const panel=page.getByRole('region',{name:'Aportes e compensação dos sócios'});
  const table=panel.getByRole('table',{name:'Histórico e movimentos registrados por sócio'});
  await expect(table.getByRole('row').filter({hasText:'Sócia Ana'})).toContainText('80.000,00');
  await expect(table.getByRole('row').filter({hasText:'Sócio Bruno'}).getByRole('cell').last()).toHaveText('R$ 0,00');
  await panel.getByRole('button',{name:'Programar compensação',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Deliberação e motivo da programação',{exact:true}).fill('Restituição prioritária aprovada; limite mensal de 25% e reserva preservada.');
  await submit(page,'Confirmar compensação programada');
  const repayment=a.state().entries.filter(e=>e.category==='loan_repayment');
  expect(repayment).toHaveLength(1);
  expect(repayment[0].partnerId).toBe(a.state().partners.find(p=>p.name==='Sócia Ana')?.id);
  expect(repayment[0].amountCents).toBe(2000000);
  expect(a.report().partnerCapital.monthlyAllocatedCents).toBe(2000000);
  await expect(panel.getByRole('button',{name:'Programar compensação',exact:true})).toBeDisabled();
  expect(a.report().cash.availableCents).toBe(10000000);
  expect(a.report().dre.combined.netProfitCents).toBe(0);
  await page.screenshot({path:'tmp/finance-flow-capital-desktop.png',fullPage:true});
});

test('payment without an account offers account creation and returns to an actionable payment',async({page})=>{
  const a=await app(page);
  a.seed({type:'entry.save',data:{description:'Despesa a pagar sem conta',category:'marketing',amountCents:5000,recognition:'recognized',competenceDate:day,dueDate:day}});
  await a.open();await tab(page,'Lançamentos');
  await page.getByRole('button',{name:'Pagar',exact:true}).click();
  await page.getByRole('button',{name:'Cadastrar conta e continuar',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Nome da conta',{exact:true}).fill('Conta cadastrada na baixa');
  await page.getByRole('dialog').getByLabel('Saldo total inicial (R$)',{exact:true}).fill('100');
  await page.getByRole('dialog').getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('button',{name:'Confirmar pagamento',exact:true})).toBeVisible();
  await submit(page,'Confirmar pagamento');
  expect(a.state().entries[0].status).toBe('settled');
  expect(a.report().cash.availableCents).toBe(5000);
});

test('initial cash 50k plus earned honorarium 100k keeps DRE at 100k and becomes cash 150k only on receipt',async({page})=>{
  const a=await app(page);
  a.seed({type:'account.save',data:{name:'Conta com saldo inicial',kind:'bank',openingDate:day,openingBalanceCents:5000000,openingThirdPartyCents:0}});
  a.seed({type:'settings.save',data:{reserveBps:0,defaultCommissionBps:0,cashTargetCents:0}});
  for(const name of ['Sócia Ana','Sócio Bruno'])a.seed({type:'partner.save',data:{name,shareBps:5000,active:true}});
  a.seed({type:'entry.save',data:{description:'Honorários de venda realizados',category:'sale_fee',amountCents:10000000,recognition:'recognized',competenceDate:day,dueDate:day}});
  await a.open();
  await expect(page.locator('.pf-hero h2')).toHaveText('R$ 50.000,00');
  await tab(page,'DRE e projeções');
  await expect(page.getByRole('row').filter({hasText:'Lucro líquido gerencial'})).toContainText('100.000,00');
  const allocation=page.getByRole('region',{name:'Distribuição entre os sócios'});
  for(const name of ['Sócia Ana','Sócio Bruno'])await expect(allocation.getByRole('table').first().getByRole('row').filter({hasText:name})).toContainText('50.000,00');
  await expect(allocation.getByRole('button',{name:'Programar distribuição',exact:true})).toBeDisabled();
  expect(a.report().dre.combined.revenueCents).toBe(10000000);
  expect(a.report().cash.availableCents).toBe(5000000);
  await tab(page,'Lançamentos');
  await page.getByRole('row').filter({hasText:'Honorários de venda realizados'}).getByRole('button',{name:'Receber',exact:true}).click();
  await submit(page,'Confirmar recebimento');
  await tab(page,'Visão geral');
  await expect(page.locator('.pf-hero h2')).toHaveText('R$ 150.000,00');
  expect(a.report().dre.combined.revenueCents).toBe(10000000);
  expect(a.report().dre.combined.netProfitCents).toBe(10000000);
  expect(a.report().distribution.periodShares.map(s=>s.amountCents)).toEqual([5000000,5000000]);
  expect(a.report().distribution.eligibleCents).toBe(10000000);
  await tab(page,'DRE e projeções');
  await page.screenshot({path:'tmp/finance-initial-50k-receipt-100k-desktop.png',fullPage:true});
});
