import {expect,test as base,type Page} from '@playwright/test';
import {createServer} from 'node:http';
import {mkdirSync,mkdtempSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createPortalApi} from '../server/portal-api.mjs';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1sAAAAASUVORK5CYII=','base64');
const day=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
const localInput=(offsetMinutes:number)=>{const date=new Date(Date.now()+offsetMinutes*60000);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);};
type TestApp={propertyId:string;adminId:string;requests:any[];snapshot:()=>Promise<any>;caseDetails:()=>Promise<any>;command:(type:string,data:Record<string,unknown>)=>Promise<any>;loseNextResponse:()=>void};
const test=base.extend<{app:TestApp}>({app:async({page},use)=>{
  mkdirSync('tmp',{recursive:true});const dbPath=join(mkdtempSync(resolve('tmp/operations-browser-')),'portal.sqlite');
  const api=createPortalApi({dbPath});const server=createServer((req,res)=>api.handle(req,res));await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  const address=server.address();if(!address||typeof address==='string')throw Error('Test server unavailable');
  const origin='http://127.0.0.1:'+address.port;let cookie='',lose=false;const requests:any[]=[];
  const call=async(path:string,body?:unknown)=>{const response=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie')!.split(';')[0];const value=await response.json();if(!response.ok)throw Error(path+': '+JSON.stringify(value));return value;};
  const user=(await call('/auth/setup',{name:'Gestão de teste',email:'operations-ui@example.test',password:'Operations-UI-Test-2026!'})).user;
  const property=(await call('/evaluations',{title:'Casa de teste integrada',city:'Porto Alegre',type:'Casa',operation:'Venda e locação',assigneeId:user.id})).evaluation;
  await page.route('**/api/**',async route=>{
    const incoming=route.request(),path=new URL(incoming.url()).pathname;const body=incoming.postData();
    if(path==='/api/operations/commands')requests.push(JSON.parse(body!));
    const response=await fetch(origin+path,{method:incoming.method(),headers:{Origin:origin,Cookie:cookie,'Content-Type':'application/json'},...(body?{body}:{})});
    if(lose&&path==='/api/operations/commands'&&response.ok){lose=false;await response.arrayBuffer();await route.abort('failed');return;}
    await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers.entries()),body:Buffer.from(await response.arrayBuffer())});
  });
  try{await use({propertyId:property.id,adminId:user.id,requests,snapshot:()=>call('/operations'),caseDetails:()=>call('/evaluations/'+property.id),command:async(type,data)=>{const state=await call('/operations');return call('/operations/commands',{version:state.version,requestId:randomUUID(),command:{type,data}});},loseNextResponse:()=>{lose=true;}});}finally{await new Promise<void>(done=>server.close(()=>done()));api.close();}
}});
test.setTimeout(90000);
async function save(page:Page,label='Salvar registro'){const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:label,exact:true}).click();await expect(dialog).toHaveCount(0);}
async function fillTicket(page:Page,app:TestApp,title:string){const dialog=page.getByRole('dialog');await dialog.getByLabel('Assunto do atendimento',{exact:true}).fill(title);await dialog.getByLabel('Imóvel',{exact:true}).selectOption(app.propertyId);await dialog.getByLabel('Nome do contato',{exact:true}).fill('Interessado do teste');await dialog.getByLabel('Telefone do contato',{exact:true}).fill('54900000000');await dialog.getByLabel('Próximo retorno',{exact:true}).fill(localInput(1440));}

test('real API: five modules save usable records and remain private and truthful about external automation',async({page,app})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/portalselect/relacionamento');
  await page.getByRole('button',{name:'Novo atendimento',exact:true}).click();await fillTicket(page,app,'Agendar visita ao imóvel');await save(page);
  await expect(page.getByRole('heading',{name:'Agendar visita ao imóvel',exact:true})).toBeVisible();
  await page.getByLabel('Conteúdo do registro',{exact:true}).fill('Interesse confirmado. Registrar opções de horário antes do retorno.');
  await page.getByRole('button',{name:'Registrar contato',exact:true}).click();
  await expect(page.getByLabel('Histórico do atendimento')).toContainText('Interesse confirmado.');
  await page.screenshot({path:'tmp/operations-ticket-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Visitas e chaves',exact:true}).click();await page.getByRole('button',{name:'Novo agendamento',exact:true}).click();
  let dialog=page.getByRole('dialog');await dialog.getByLabel('Imóvel',{exact:true}).selectOption(app.propertyId);await dialog.getByLabel('Nome do visitante',{exact:true}).fill('Visitante teste');await dialog.getByLabel('Início da visita',{exact:true}).fill(localInput(60));await dialog.getByLabel('Fim da visita',{exact:true}).fill(localInput(120));await save(page);
  await page.getByRole('button',{name:'Confirmar pela EME',exact:true}).click();await save(page,'Confirmar visita');
  await page.getByRole('button',{name:'Solicitar chave',exact:true}).click();await save(page,'Registrar solicitação');
  await page.getByRole('button',{name:'Autorizar chave',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Prazo de devolução',{exact:true}).fill(localInput(180));await dialog.getByLabel('Condições da autorização',{exact:true}).fill('Retirada autorizada após conferência presencial pela EME.');await save(page,'Autorizar pela EME');
  await expect(page.getByText('Retirada autorizada',{exact:true})).toBeVisible();
  await page.goto('/portalselect/locacoes');await page.getByRole('button',{name:'Novo contrato',exact:true}).click();dialog=page.getByRole('dialog');
  await dialog.getByLabel('Imóvel',{exact:true}).selectOption(app.propertyId);await dialog.getByLabel('Nome do proprietário',{exact:true}).fill('Proprietário teste');await dialog.getByLabel('Nome do locatário',{exact:true}).fill('Locatário teste');
  await dialog.getByLabel('Início do contrato',{exact:true}).fill(day().slice(0,7)+'-01');await dialog.getByLabel('Término do contrato',{exact:true}).fill((Number(day().slice(0,4))+1)+'-12-31');await dialog.getByLabel('Aluguel mensal (R$)',{exact:true}).fill('4200.50');await dialog.getByLabel('Taxa de administração (%)',{exact:true}).fill('8');await save(page);
  await page.getByRole('button',{name:'Gerar competência',exact:true}).click();await save(page,'Gerar competência');
  const charge=page.locator('.po-table tbody tr');await expect(charge).toContainText('4.200,50');await expect(charge).toContainText('336,04');await expect(charge).toContainText('3.864,46');
  await page.getByRole('button',{name:'Registrar recebimento',exact:true}).click();await page.getByRole('dialog').getByLabel('Comprovante e observações',{exact:true}).fill('Recebimento bancário conferido no teste controlado.');await save(page,'Confirmar recebimento manual');
  await expect(charge).toContainText('Recebido · repasse pendente');await page.screenshot({path:'tmp/operations-lease-desktop.png',fullPage:true});
  await page.goto('/portalselect/documentos');await page.getByRole('button',{name:'Enviar documento',exact:true}).click();dialog=page.getByRole('dialog');
  await dialog.getByLabel('Imóvel',{exact:true}).selectOption(app.propertyId);await dialog.getByLabel('Categoria do documento',{exact:true}).selectOption('authorization');await dialog.getByLabel('Título do documento',{exact:true}).fill('Autorização de divulgação');await dialog.getByLabel(/^Arquivo/).setInputFiles({name:'autorizacao.png',mimeType:'image/png',buffer:png});await save(page,'Enviar documento');
  await expect(page.getByRole('heading',{name:'Autorização de divulgação',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Revisar documento',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Resultado da revisão',{exact:true}).selectOption('approved');await dialog.getByLabel('Escopo e observações da revisão',{exact:true}).fill('Autorização conferida pelo gestor no escopo de divulgação de teste.');await save(page);
  const document=(await app.snapshot()).state.documents[0];await expect(page.getByRole('link',{name:'Baixar arquivo',exact:true})).toHaveAttribute('href','/api/operations/documents/'+document.id+'/content');await expect(page.getByRole('link',{name:'Baixar arquivo',exact:true})).toHaveAttribute('download','');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tmp/operations-documents-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.setViewportSize({width:1440,height:1000});
  await page.goto('/portalselect/qualidade');await page.getByRole('button',{name:'Nova avaliação de atendimento',exact:true}).click();dialog=page.getByRole('dialog');
  await dialog.getByLabel('Início do período',{exact:true}).fill(day().slice(0,7)+'-01');await dialog.getByLabel('Fim do período',{exact:true}).fill(day());await dialog.getByLabel('Situação da avaliação',{exact:true}).selectOption('complete');
  for(const label of ['Clareza da comunicação','Continuidade do atendimento','Precisão das informações','Apresentação do imóvel'])await dialog.getByLabel(label,{exact:true}).selectOption('4');
  await dialog.getByLabel('Evidências e contexto',{exact:true}).fill('Atendimento e retorno conferidos pelo gestor a partir dos registros do período.');await dialog.getByLabel('Plano de ação e acompanhamento',{exact:true}).fill('Confirmar o próximo retorno combinado com o interessado.');await save(page);
  await expect(page.getByText('Concluída',{exact:true})).toBeVisible();
  await page.goto('/portalselect/inteligencia');await expect(page.getByRole('heading',{name:'Comece por um imóvel.',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Imóvel',exact:true}).selectOption(app.propertyId);await expect(page.getByRole('button',{name:'Solicitar análise IA',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Conferir régua sem IA',exact:true}).click();await expect(page.locator('.pi-run')).toHaveCount(1);await expect(page.locator('.pi-run')).toContainText('SEM IA');
  await page.getByRole('button',{name:'Registrar revisão',exact:true}).click();await page.getByLabel('Justificativa',{exact:true}).fill('Pendências conferidas. Solicitar evidências antes de qualquer aprovação.');await page.getByRole('button',{name:'Salvar revisão',exact:true}).click();
  await expect(page.locator('.pi-run')).toContainText('Recomendação validada');await page.reload();await expect(page.locator('.pi-run')).toContainText('Pendências conferidas.');
  const dossier=await app.caseDetails();expect(dossier.evaluation.stage).toBe('Recebido');expect(dossier.evaluation.version).toBe(1);expect(dossier.history).toHaveLength(1);
  const actual=await app.snapshot();expect(actual.state.tickets).toHaveLength(1);expect(actual.state.tickets[0].messages).toHaveLength(1);expect(actual.state.visits[0].key.status).toBe('authorized');expect(actual.state.leases[0].charges[0].status).toBe('received');expect(actual.state.documents[0].status).toBe('approved');expect(actual.state.reviews).toHaveLength(1);expect(errors).toEqual([]);
});

test('real API: an interrupted response retries the same command once, and conflict refresh preserves form data',async({page,app})=>{
  await page.goto('/portalselect/relacionamento');await page.getByRole('button',{name:'Novo atendimento',exact:true}).click();await fillTicket(page,app,'Registro com resposta interrompida');app.loseNextResponse();
  let dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Não foi possível conectar');await expect(dialog.getByLabel('Assunto do atendimento',{exact:true})).toHaveValue('Registro com resposta interrompida');await save(page);
  expect(app.requests[0].requestId).toBe(app.requests[1].requestId);expect((await app.snapshot()).state.tickets).toHaveLength(1);
  await page.getByRole('button',{name:'Novo atendimento',exact:true}).click();await fillTicket(page,app,'Registro preservado após concorrência');
  await app.command('ticket.save',{propertyId:app.propertyId,assigneeId:app.adminId,title:'Atualização concorrente',contactName:'Contato paralelo',channel:'phone',status:'closed',priority:'normal',notes:''});
  dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Salvar registro',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('mudou');await dialog.getByRole('button',{name:'Atualizar dados sem perder os campos',exact:true}).click();
  await expect(dialog.getByLabel('Assunto do atendimento',{exact:true})).toHaveValue('Registro preservado após concorrência');await save(page);
  expect((await app.snapshot()).state.tickets).toHaveLength(3);expect(app.requests.at(-1).requestId).not.toBe(app.requests.at(-2).requestId);
});
