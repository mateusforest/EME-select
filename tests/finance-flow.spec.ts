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

test('partner contribution buttons save received and pending amounts visibly, survive reload and settle only once',async({page})=>{
  const a=await app(page);
  a.seed({type:'account.save',data:{name:'Caixa de teste',kind:'bank',openingDate:day,openingBalanceCents:0}});
  a.seed({type:'settings.save',data:{cashTargetCents:0,reserveBps:1000}});
  a.seed({type:'partner.save',data:{name:'Sócia Ana',shareBps:10000}});
  await a.open();await tab(page,'Sócios e regras');
  await page.getByRole('button',{name:'Lançar capital',exact:true}).click();
  let dialog=page.getByRole('dialog');
  await dialog.getByLabel('Valor do aporte (R$)',{exact:true}).fill('50000');
  await expect(dialog.getByLabel('O dinheiro já entrou na empresa?',{exact:true})).toHaveValue('');
  await dialog.getByLabel('O dinheiro já entrou na empresa?',{exact:true}).selectOption('yes');
  await submit(page,'Registrar aporte');
  expect(a.report().cash.availableCents).toBe(5000000);
  expect(a.report().partnerCapital.rows[0].capitalCents).toBe(5000000);
  const movements=page.getByRole('region',{name:'Movimentos de aportes',exact:true});
  await expect(movements.getByRole('row').filter({hasText:'Capital social · Sócia Ana'})).toContainText('Recebido');
  await page.getByRole('button',{name:'Lançar aporte reembolsável',exact:true}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByLabel('Valor do aporte (R$)',{exact:true}).fill('10000');
  await dialog.getByLabel('O dinheiro já entrou na empresa?',{exact:true}).selectOption('no');
  await submit(page,'Registrar aporte');
  expect(a.report().cash.availableCents).toBe(5000000);
  expect(a.report().partnerCapital.rows[0].pendingLoanCents).toBe(1000000);
  await expect(movements.getByRole('row').filter({hasText:'Aporte reembolsável · Sócia Ana'})).toContainText('A receber');
  await page.reload();await tab(page,'Sócios e regras');
  // The contribution history must not disappear when viewing another accounting month.
  await page.getByLabel('Competência selecionada').fill('2025-01');
  await expect(movements.getByRole('row').filter({hasText:'Aporte reembolsável · Sócia Ana'})).toBeVisible();
  await movements.getByRole('button',{name:'Receber aporte',exact:true}).click();
  await submit(page,'Confirmar recebimento');
  expect(a.report().cash.availableCents).toBe(6000000);
  expect(a.report().partnerCapital.rows[0].pendingLoanCents).toBe(0);
  expect(a.report().partnerCapital.rows[0].lentCents).toBe(1000000);
  expect(a.report().dre.combined.netProfitCents).toBe(0);
  expect(a.state().entries).toHaveLength(2);
  await expect(movements.getByRole('button',{name:'Receber aporte',exact:true})).toHaveCount(0);
  await page.screenshot({path:'tmp/finance14-contributions-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'tmp/finance14-contributions-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('contribution without account recovers into dedicated form and backend rejection preserves entered value',async({page})=>{
  const a=await app(page);
  a.seed({type:'partner.save',data:{name:'Sócio Bruno',shareBps:10000,openingDate:day,openingLoanCents:100000}});
  await a.open();await tab(page,'Sócios e regras');
  await page.getByRole('button',{name:'Lançar aporte reembolsável',exact:true}).click();
  await page.getByRole('button',{name:'Cadastrar conta e continuar',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Nome da conta',{exact:true}).fill('Conta anterior ao aporte');
  await page.getByRole('dialog').getByRole('button',{name:'Salvar registro',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'Registrar aporte',exact:true})).toBeVisible();
  await dialog.getByLabel('Valor do aporte (R$)',{exact:true}).fill('1000');
  await dialog.getByLabel('O dinheiro já entrou na empresa?',{exact:true}).selectOption('yes');
  await dialog.getByRole('button',{name:'Registrar aporte',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('posterior à data do histórico');
  expect(a.state().entries).toHaveLength(0);
  await dialog.getByLabel('O dinheiro já entrou na empresa?',{exact:true}).selectOption('no');
  await submit(page,'Registrar aporte');
  expect(a.state().entries[0].amountCents).toBe(100000);
  expect(a.state().entries[0].status).toBe('open');
});

test('outlook calculates costs and quotas on real ledger forecasts and updates after rule changes',async({page})=>{
  const a=await app(page);
  a.seed({type:'account.save',data:{name:'Conta',kind:'bank',openingDate:day,openingBalanceCents:5000000}});
  a.seed({type:'settings.save',data:{reserveBps:1000,cashTargetCents:1800000,defaultCommissionBps:5000}});
  for(const name of ['Sócia Ana','Sócio Bruno'])a.seed({type:'partner.save',data:{name,shareBps:5000}});
  a.seed({type:'operation.create',data:{title:'Venda prevista',kind:'sale',amountCents:10000000,taxCents:1200000,commissionBps:5000,reserveBps:1000,brokerId:broker.id,recognition:'forecast',competenceDate:day,dueDate:day}});
  a.seed({type:'recurrence.save',data:{name:'Estrutura mensal',category:'marketing',amountCents:600000,startMonth:month,dueDay:25}});
  await a.open();
  const outlook=page.getByRole('region',{name:'Projeção de caixa e ganhos dos sócios'});
  await expect(outlook.getByRole('table').first().getByRole('row').nth(1)).toContainText('38.000,00');
  await expect(outlook.getByRole('table').nth(1).getByRole('row').filter({hasText:'Sócia Ana'})).toContainText('19.000,00');
  await expect(outlook).toContainText('Não some as retiradas');
  await outlook.getByRole('button',{name:'Ajustar reserva e metas',exact:true}).click();
  await page.getByRole('dialog').getByLabel('Meta de caixa próprio (R$)',{exact:true}).fill('100000');
  await submit(page);
  await expect(outlook.getByRole('table').nth(1).getByRole('row').filter({hasText:'Sócia Ana'}).getByRole('cell').last()).toHaveText('R$ 0,00');
  expect(a.report().cash.availableCents).toBe(5000000);
  expect(a.report().dre.combined.netProfitCents).toBe(0);
  await page.screenshot({path:'tmp/finance14-outlook-desktop.png',fullPage:true});
});

test('owner calendar defaults to 5k per partner day five in overview and entries, persists parameters without creating debt',async({page})=>{
 const a=await app(page);
 for(const name of ['Sócia Ana','Sócio Bruno'])a.seed({type:'partner.save',data:{name,shareBps:5000}});
 await a.open();
 const agenda=page.getByRole('region',{name:'Agenda de pagamentos dos sócios',exact:true});
 await expect(agenda).toContainText('Pró-labore fixo no dia 5');
 await expect(agenda).toContainText('R$ 10.000,00');
 await expect(agenda).toContainText('-R$ 52.000,00');
 const table=agenda.getByRole('table',{name:'Calendário simulado de pagamentos por sócio',exact:true});
 await expect(table.getByRole('row')).toHaveCount(13);
 await expect(table.getByRole('row').nth(1)).toContainText('Sócia Ana');
 await expect(table.getByRole('row').nth(1)).toContainText('R$ 5.000,00');
 await expect(table.getByRole('row').nth(1).getByRole('cell').first()).toHaveText(/^05\//);
 expect(a.state().entries).toHaveLength(0);
 await tab(page,'Lançamentos');await expect(agenda).toBeVisible();
 await agenda.getByRole('button',{name:'Editar planejamento',exact:true}).click();
 await agenda.getByLabel('Outras despesas mensais (R$)',{exact:true}).fill('6200');
 await agenda.getByRole('button',{name:'Salvar planejamento',exact:true}).click();
 await expect(agenda.getByRole('button',{name:'Editar planejamento',exact:true})).toBeVisible();
 expect(a.state().settings.ownerPlan?.monthlyPayrollCents).toBe(500000);
 expect(a.state().settings.ownerPlan?.payday).toBe(5);
 expect(a.state().settings.ownerPlan?.monthlyFixedCents).toBe(620000);
 expect(a.state().entries).toHaveLength(0);
 await page.reload();await expect(agenda).toBeVisible();
 await agenda.getByRole('button',{name:'Editar planejamento',exact:true}).click();
 await expect(agenda.getByLabel('Dia fixo do pró-labore',{exact:true})).toHaveValue('5');
 await agenda.getByRole('button',{name:'Fechar ajustes',exact:true}).click();
 await agenda.screenshot({path:'tmp/finance15-agenda-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await agenda.screenshot({path:'tmp/finance15-agenda-mobile.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('owner agenda shows actual pending payroll and profit across accounting months with no automatic settlement',async({page})=>{
 const a=await app(page);
 a.seed({type:'partner.save',data:{name:'Sócia Ana',shareBps:10000}});
 a.seed({type:'entry.save',data:{description:'Pró-labore registrado',category:'prolabore',partnerId:a.state().partners[0].id,amountCents:500000,recognition:'forecast',competenceDate:'2025-01-01',dueDate:'2025-01-05'}});
 await a.open();
 const agenda=page.getByRole('region',{name:'Agenda de pagamentos dos sócios',exact:true});
 await expect(agenda.getByRole('row').filter({hasText:'Pró-labore registrado'})).toContainText('05/01/2025');
 await agenda.getByRole('row').filter({hasText:'Pró-labore registrado'}).getByRole('button',{name:'Registrar pagamento',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Cadastre a conta desta movimentação');
 expect(a.state().entries[0].status).toBe('open');
});
