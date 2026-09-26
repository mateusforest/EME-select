import { expect, test, type Page } from '@playwright/test';
import { applyFinanceCommand, emptyFinance, type FinanceCommand, type FinanceState } from '../shared/finance.mjs';
test.setTimeout(60000);

const admin={id:'a51dd98c-7f63-46a5-a1b3-bd0686129337',name:'Gestão EME',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false};
const broker={id:'f0c9d6d4-d74d-4ec3-9abc-e52b21b21f21',name:'Corretora Teste',role:'corretor',active:true};
const property={id:'41bba750-e9ab-4922-a010-228c63c1702e',title:'Apartamento frente ao mar'};
const now=new Date(),day=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'),month=day.slice(0,7);

async function setup(page:Page,role='admin'){
  let state:FinanceState=emptyFinance(),version=0,financeRequests=0;
  const requests:{version:number;requestId:string;command:FinanceCommand}[]=[];
  const receipts=new Map<string,unknown>();
  const context={actorId:admin.id,now:new Date().toISOString(),members:[admin,broker],properties:[property]};
  let loseNextResponse=false;
  const snapshot=()=>({version,state,history:[],members:[admin,broker],properties:[property]});
  await page.route('**/api/**',async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==='/api/auth/session')return route.fulfill({json:{user:{...admin,role},needsSetup:false}});
    if(pathname==='/api/evaluations')return route.fulfill({json:{evaluations:[]}});
    if(pathname==='/api/assignees')return route.fulfill({json:{members:[admin,broker]}});
    if(pathname==='/api/finance'){financeRequests++;return route.fulfill({json:snapshot()});}
    if(pathname==='/api/finance/commands'){
      const body=route.request().postDataJSON();requests.push(body);
      if(receipts.has(body.requestId))return route.fulfill({json:snapshot()});
      if(body.version!==version)return route.fulfill({status:409,json:{error:'O financeiro foi alterado. Atualize os dados e revise o registro.'}});
      try{state=applyFinanceCommand(state,body.command,context);version++;receipts.set(body.requestId,true);if(loseNextResponse){loseNextResponse=false;return route.abort('failed');}return route.fulfill({json:snapshot()});}
      catch(error){return route.fulfill({status:(error as {status?:number}).status??400,json:{error:(error as Error).message}});}
    }
    return route.fulfill({status:404,json:{error:'Unexpected API '+pathname}});
  });
  await page.goto('/portalselect/financeiro');
  await expect(page.getByRole('navigation',{name:'Navegação da equipe'})).toBeVisible({timeout:30000});
  return {state:()=>state,requests,financeRequests:()=>financeRequests,loseNextResponse:()=>{loseNextResponse=true;},seed:(command:FinanceCommand)=>{state=applyFinanceCommand(state,command,context);version++;}};
}
async function tab(page:Page,name:string){await page.getByRole('navigation',{name:'Seções do financeiro'}).getByRole('button',{name,exact:true}).click();}

test('financial admin records a real decimal amount, settles it and sees accrual DRE without fake balances',async({page})=>{
  const app=await setup(page);
  await expect(page.getByRole('heading',{name:'Comece pelo saldo real da empresa.'})).toBeVisible();
  await page.getByRole('button',{name:'Adicionar primeira conta',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Nome da conta',{exact:true}).fill('Conta principal');
  await dialog.getByLabel('Banco / instituição',{exact:true}).fill('Banco manual');
  await dialog.getByLabel('Saldo total inicial (R$)',{exact:true}).fill('10000.50');
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(app.state().accounts[0].openingBalanceCents).toBe(1000050);
  await tab(page,'Lançamentos');
  await page.getByRole('button',{name:'Novo lançamento',exact:true}).click();
  await dialog.getByLabel('Descrição do lançamento',{exact:true}).fill('Campanha captação setembro');
  await dialog.getByLabel('Categoria',{exact:true}).selectOption('marketing');
  await dialog.getByLabel('Valor (R$)',{exact:true}).fill('1234.56');
  await dialog.getByLabel('Centro de custo',{exact:true}).fill('Captação');
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(app.state().entries[0].amountCents).toBe(123456);
  await page.getByRole('button',{name:'Baixar',exact:true}).click();
  await dialog.getByLabel('Conta da movimentação',{exact:true}).selectOption(app.state().accounts[0].id);
  await dialog.getByRole('button',{name:'Confirmar baixa',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(app.state().entries[0].status).toBe('settled');
  await tab(page,'DRE e projeções');
  await expect(page.getByRole('row').filter({hasText:'Despesas operacionais e pró-labore'})).toContainText('1.234,56');
  await expect(page.getByRole('row').filter({hasText:'Lucro líquido gerencial'})).toContainText('-R$');
  await tab(page,'Contas');
  await expect(page.locator('.pf-account')).toContainText('8.765,94');
  await page.screenshot({path:'tmp/finance-accounts-desktop.png',fullPage:true});
});

test('operation creates linked revenue and commission; recurring administration is generated once and drives MRR',async({page})=>{
  const app=await setup(page);
  await tab(page,'Operações e corretores');
  await page.getByRole('button',{name:'Nova operação',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Nome da operação',{exact:true}).fill('Venda apartamento frente ao mar');
  await dialog.getByLabel('Receita da EME (R$)',{exact:true}).fill('15000');
  await dialog.getByLabel('Participação do corretor na receita EME (%)',{exact:true}).fill('30');
  await dialog.getByLabel('Reserva da empresa nesta operação (%)',{exact:true}).fill('15');
  await dialog.getByLabel('Corretor responsável',{exact:true}).selectOption(broker.id);
  await dialog.getByLabel('Imóvel vinculado',{exact:true}).selectOption(property.id);
  await dialog.getByRole('button',{name:'Criar operação',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(app.state().entries).toHaveLength(2);
  expect(app.state().entries.find(entry=>entry.category==='broker_commission')?.amountCents).toBe(450000);
  await expect(page.getByRole('row').filter({hasText:'Corretora Teste'}).last()).toContainText('10.500,00');
  await tab(page,'Recorrências');
  await page.getByRole('button',{name:'Nova recorrência',exact:true}).click();
  await dialog.getByLabel('Descrição da recorrência',{exact:true}).fill('Administração apartamento');
  await dialog.getByLabel('Categoria',{exact:true}).selectOption('management_fee');
  await dialog.getByLabel('Valor mensal (R$)',{exact:true}).fill('450');
  await dialog.getByLabel('Mês de término',{exact:true}).fill(month);
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  for(let index=0;index<2;index++){
    await page.getByRole('button',{name:'Gerar mês',exact:true}).click();
    await dialog.getByRole('button',{name:'Gerar lançamento',exact:true}).click();
    await expect(dialog).toHaveCount(0);
  }
  expect(app.state().entries.filter(entry=>entry.recurrenceMonth===month)).toHaveLength(1);
  await tab(page,'Visão geral');
  await expect(page.locator('.pf-metric').filter({hasText:'MRR'})).toContainText('450,00');
  await expect(page.locator('.pf-metric').filter({hasText:'MRR'})).toContainText('5.400,00');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'tmp/finance-overview-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
});

test('uncertain save response retries with the same idempotency key and preserves typed fields',async({page})=>{
  const app=await setup(page);
  await tab(page,'Lançamentos');
  await page.getByRole('button',{name:'Novo lançamento',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Descrição do lançamento',{exact:true}).fill('Impressão de material');
  await dialog.getByLabel('Categoria',{exact:true}).selectOption('materials');
  await dialog.getByLabel('Valor (R$)',{exact:true}).fill('129.90');
  app.loseNextResponse();
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('Não foi possível conectar');
  await expect(dialog.getByLabel('Descrição do lançamento',{exact:true})).toHaveValue('Impressão de material');
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(app.requests[0].requestId).toBe(app.requests[1].requestId);
  expect(app.state().entries).toHaveLength(1);
});

test('broker route never requests company finance data',async({page})=>{
  const app=await setup(page,'corretor');
  await expect(page.getByText('Esta área não está disponível para sua conta.',{exact:true})).toBeVisible({timeout:15000});
  expect(app.financeRequests()).toBe(0);
});

test('partner rules and manual DRE adjustments remain explicit; no payment is created by a simulation',async({page})=>{
  const app=await setup(page);
  app.seed({type:'account.save',data:{name:'Conta principal',kind:'bank',openingDate:day,openingBalanceCents:1000000,openingThirdPartyCents:0}});
  app.seed({type:'entry.save',data:{description:'Honorário realizado',category:'other_revenue',amountCents:1000000,recognition:'recognized',competenceDate:day,dueDate:day,behavior:'variable'}});
  await page.reload();
  await tab(page,'Sócios e regras');
  await page.getByRole('button',{name:'Configurar regras',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Reserva padrão por operação (%)',{exact:true}).fill('20');
  await dialog.getByLabel('Comissão padrão do corretor (%)',{exact:true}).fill('35');
  await dialog.getByLabel('Meta de caixa próprio (R$)',{exact:true}).fill('2000');
  await dialog.getByLabel('Investimento inicial para payback (R$)',{exact:true}).fill('25000');
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  for(const [name,share] of [['Sócia Um','60'],['Sócio Dois','40']]){
    await page.getByRole('button',{name:'Adicionar sócio',exact:true}).click();
    await dialog.getByLabel('Nome do sócio',{exact:true}).fill(name);
    await dialog.getByLabel('Participação na distribuição (%)',{exact:true}).fill(share);
    await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
    await expect(dialog).toHaveCount(0);
  }
  const simulation=page.locator('.pf-panel').filter({has:page.getByRole('heading',{name:'Simulação de distribuição'})});
  await expect(simulation).toContainText('8.000,00');
  await expect(simulation).toContainText('4.800,00');
  expect(app.state().entries.filter(entry=>entry.category==='partner_distribution')).toHaveLength(0);
  await tab(page,'DRE e projeções');
  await page.getByRole('button',{name:'Ajuste manual',exact:true}).click();
  await dialog.getByLabel('Descrição do ajuste',{exact:true}).fill('Apropriação de despesa documentada');
  await dialog.getByLabel('Grupo da DRE',{exact:true}).selectOption('opex');
  await dialog.getByLabel('Valor do ajuste (R$)',{exact:true}).fill('250.30');
  await dialog.getByLabel('Justificativa e referência',{exact:true}).fill('Apropriação referente ao documento interno 2026-09.');
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  const result=page.getByRole('row').filter({hasText:'Lucro líquido gerencial'});
  await expect(result).toContainText('10.000,00');
  await expect(result).toContainText('9.749,70');
  expect(app.state().entries).toHaveLength(1);
  await page.screenshot({path:'tmp/finance-dre-desktop.png',fullPage:true});
});

test('concurrent update keeps the form and requires an explicit refresh before retry',async({page})=>{
  const app=await setup(page);
  await tab(page,'Lançamentos');
  await page.getByRole('button',{name:'Novo lançamento',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Descrição do lançamento',{exact:true}).fill('Campanha com versão concorrente');
  await dialog.getByLabel('Categoria',{exact:true}).selectOption('marketing');
  await dialog.getByLabel('Valor (R$)',{exact:true}).fill('300');
  app.seed({type:'settings.save',data:{cashTargetCents:500000}});
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog.getByRole('alert')).toContainText('foi alterado');
  await dialog.getByRole('button',{name:'Atualizar dados do financeiro',exact:true}).click();
  await expect(dialog.getByLabel('Descrição do lançamento',{exact:true})).toHaveValue('Campanha com versão concorrente');
  await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  expect(app.state().entries).toHaveLength(1);
  expect(app.state().settings.cashTargetCents).toBe(500000);
  expect(app.requests[0].requestId).not.toBe(app.requests[1].requestId);
});

test('out-of-range month edits preserve the valid reporting period without crashing',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await setup(page);
  const period=page.getByLabel('Competência selecionada',{exact:true});
  await expect(period).toHaveAttribute('min','1900-01');
  await expect(period).toHaveAttribute('max','2200-12');
  await period.fill('0026-09');
  await expect(period).toHaveValue(month);
  await period.fill('2201-01');
  await expect(period).toHaveValue(month);
  await expect(page.getByRole('region',{name:'Central financeira'})).toBeVisible();
  await period.fill('2025-12');
  await expect(period).toHaveValue('2025-12');
  await expect(page.getByRole('region',{name:'Central financeira'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('entry form creates bounded monthly expense forecasts with BRL and original competence',async({page})=>{
 const app=await setup(page);await tab(page,'Lançamentos');await page.getByRole('button',{name:'Novo lançamento',exact:true}).click();const dialog=page.getByRole('dialog');
 await dialog.getByLabel('Descrição do lançamento',{exact:true}).fill('Aluguel do escritório');await dialog.getByLabel('Categoria',{exact:true}).selectOption('rent');await dialog.getByLabel('Valor (R$)',{exact:true}).fill('1.200,50');await dialog.getByLabel('Data de competência',{exact:true}).fill('2026-12-31');await dialog.getByLabel('Data de vencimento',{exact:true}).fill('2027-01-31');await dialog.getByLabel('Repetir este lançamento?',{exact:true}).selectOption('monthly');await dialog.getByLabel('Último mês da recorrência',{exact:false}).fill('2027-03');await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();await expect(dialog).toHaveCount(0);expect(app.state().entries).toHaveLength(3);expect(app.state().entries.every(e=>e.amountCents===120050&&e.recognition==='forecast')).toBe(true);expect(app.state().entries[0].competenceDate).toBe('2026-12-31');expect(app.state().entries[1].dueDate).toBe('2027-02-28');
});
