import { expect, test, type Page } from '@playwright/test';
import type { LiveEvaluation, TeamUser } from '../src/portal/api';

const admin:TeamUser={id:'a51dd98c-7f63-46a5-a1b3-bd0686129337',name:'Gestão EME',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false};
const evaluation:LiveEvaluation={id:'41bba750-e9ab-4922-a010-228c63c1702e',title:'Imóvel cadastrado pela equipe',city:'Porto Alegre · RS',type:'Apartamento',operation:'Venda',owner:'Solicitante cadastrado',assignee_id:admin.id,assignee:admin.name,stage:'Recebido',version:1,created_at:'2026-09-16T12:00:00Z',updated_at:'2026-09-16T12:00:00Z'};

async function mockPortal(page:Page,options:{authenticated?:boolean;role?:TeamUser['role'];mustChangePassword?:boolean;sessionError?:boolean}={}){
  let authenticated=options.authenticated??true;
  const user={...admin,role:options.role??'admin',mustChangePassword:options.mustChangePassword??false};
  const requests:string[]=[];
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;requests.push(path);
    if(path==='/api/auth/session')return route.fulfill(options.sessionError?{status:503,json:{error:'O serviço de acesso está temporariamente indisponível.'}}:{json:{user:authenticated?user:null,needsSetup:false}});
    if(path==='/api/auth/login'){authenticated=true;return route.fulfill({json:{user}});}
    if(!authenticated)return route.fulfill({status:401,json:{error:'Entre com sua conta.'}});
    if(path==='/api/evaluations')return route.fulfill({json:{evaluations:[evaluation]}});
    if(path==='/api/assignees')return route.fulfill({json:{members:[user]}});
    if(path==='/api/listings')return route.fulfill({json:{listings:[]}});
    return route.fulfill({status:404,json:{error:'Unexpected test API '+path}});
  });
  return requests;
}
const navigation=(page:Page)=>page.getByRole('navigation',{name:'Navegação da equipe'});
const plannedStatus=(page:Page)=>page.getByRole('main').getByText('Em desenvolvimento',{exact:true});
async function expectOnePortal(page:Page){
  await expect(navigation(page)).toBeVisible();
  await expect(page.locator('a[href*="/portalselect/demo"]')).toHaveCount(0);
  await expect(page.getByRole('link',{name:/Demonstração|Explorar o desenho completo/i})).toHaveCount(0);
  await expect(page.locator('.site-header')).toHaveCount(0);
}

test('the login offers only the team account and no public demonstration bypass',async({page})=>{
  const requests=await mockPortal(page,{authenticated:false});
  await page.goto('/portalselect');
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  await expect(page.getByLabel('E-mail',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Entrar no portal',exact:true})).toBeVisible();
  await expect(page.locator('a[href*="/portalselect/demo"]')).toHaveCount(0);
  await expect(navigation(page)).toHaveCount(0);
  expect(requests).toContain('/api/auth/session');
  expect(requests).not.toContain('/api/evaluations');
});

test('a legacy demo URL requires login and opens the real overview, ignoring former example storage',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('eme-select-portal-demo-v1','{"version":1,"evaluations":[{}]}'));
  const requests=await mockPortal(page,{authenticated:false});
  await page.goto('/portalselect/demo');
  await expect(page).toHaveURL(/\/portalselect$/);
  await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
  expect(requests).not.toContain('/api/evaluations');
  await page.getByLabel('E-mail',{exact:true}).fill(admin.email);
  await page.getByLabel('Senha',{exact:true}).fill('portal-test-password');
  await page.getByRole('button',{name:'Entrar no portal',exact:true}).click();
  await expectOnePortal(page);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Seu olhar. Agora, com continuidade.');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText(evaluation.title);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(requests).toContain('/api/evaluations');
});

test('legacy evaluation links preserve their destination and browser history uses the same workspace',async({page})=>{
  await mockPortal(page);
  await page.goto('/portalselect/demo/avaliacoes?origem=legado');
  await expect(page).toHaveURL(/\/portalselect\/avaliacoes\?origem=legado$/);
  await expectOnePortal(page);
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText(evaluation.title);
  await navigation(page).getByRole('link',{name:'Locações',exact:true}).click();
  await expect(page).toHaveURL(/\/portalselect\/locacoes$/);
  await expect(plannedStatus(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/portalselect\/avaliacoes\?origem=legado$/);
  await expect(page.getByLabel('Buscar avaliações da equipe')).toBeVisible();
  await expect(page.locator('tbody')).toContainText(evaluation.title);
});

test('the former example property collection redirects to the saved listings module',async({page})=>{
  const requests=await mockPortal(page);
  await page.goto('/portalselect/demo/carteira');
  await expect(page).toHaveURL(/\/portalselect\/imoveis$/);
  await expectOnePortal(page);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Cada lugar merece uma boa apresentação.');
  await expect(page.getByRole('button',{name:/Cadastrar imóvel|Novo imóvel/}).first()).toBeVisible();
  await expect.poll(()=>requests.includes('/api/listings')).toBe(true);
  await expect(page.getByText('Os 18 imóveis ilustrativos que compõem o site da EME.',{exact:true})).toHaveCount(0);
});

test('rental planning is explicit and never presents fictitious contracts or cash totals',async({page})=>{
  await mockPortal(page);
  await page.goto('/portalselect/demo/locacoes');
  await expect(page).toHaveURL(/\/portalselect\/locacoes$/);
  await expectOnePortal(page);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Cuidar também é acompanhar.');
  await expect(plannedStatus(page)).toBeVisible();
  await expect(page.locator('.ps-rental-list')).toHaveCount(0);
  await expect(page.getByText('Apartamento do parque',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Casa do bosque',{exact:true})).toHaveCount(0);
  await expect(page.getByText('R$ 4.200,00',{exact:true})).toHaveCount(0);
  await expect(navigation(page).getByRole('link',{name:'Central financeira',exact:true})).toHaveAttribute('href','/portalselect/financeiro');
});

test('a broker cannot use legacy links to access company finances or team quality',async({page})=>{
  const requests=await mockPortal(page,{role:'corretor'});
  for(const route of ['financeiro','qualidade']){
    await page.goto('/portalselect/demo/'+route);
    await expect(page).toHaveURL(new RegExp('/portalselect/'+route+'$'));
    await expectOnePortal(page);
    await expect(page.getByRole('heading',{name:'Esta área não está disponível para sua conta.'})).toBeVisible();
    await expect(navigation(page).getByRole('link',{name:'Central financeira',exact:true})).toHaveCount(0);
    await expect(navigation(page).getByRole('link',{name:'Qualidade da equipe',exact:true})).toHaveCount(0);
  }
  expect(requests).not.toContain('/api/finance');
});

test('mobile planned modules use the team menu, fit the viewport and return to the same overview',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await mockPortal(page);
  await page.goto('/portalselect');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Seu olhar. Agora, com continuidade.');
  await page.getByRole('button',{name:'Abrir navegação',exact:true}).click();
  await navigation(page).getByRole('link',{name:'Central de IA',exact:true}).click();
  await expect(page).toHaveURL(/\/portalselect\/inteligencia$/);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Inteligência com supervisão da EME.');
  await expect(plannedStatus(page)).toBeVisible();
  await expect(page.getByRole('button',{name:'Abrir navegação',exact:true})).toHaveAttribute('aria-expanded','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Abrir navegação',exact:true}).click();
  await navigation(page).getByRole('link',{name:'Visão geral',exact:true}).click();
  await expect(page).toHaveURL(/\/portalselect$/);
  await expect(page.locator('tbody')).toContainText(evaluation.title);
  expect(errors).toEqual([]);
});

test('the password-change gate also protects legacy demonstration routes',async({page})=>{
  const requests=await mockPortal(page,{mustChangePassword:true});
  await page.goto('/portalselect/demo/avaliacoes');
  await expect(page).toHaveURL(/\/portalselect\/avaliacoes$/);
  await expect(page.getByRole('heading',{name:'Uma senha só sua.'})).toBeVisible();
  await expect(page.getByLabel('Senha atual',{exact:true})).toBeVisible();
  await expect(navigation(page)).toHaveCount(0);
  expect(requests).not.toContain('/api/evaluations');
});

test('an unavailable authentication service cannot fall back to an illustrative portal',async({page})=>{
  await mockPortal(page,{sessionError:true});
  await page.goto('/portalselect/demo');
  await expect(page.getByRole('alert')).toContainText('temporariamente indisponível');
  await expect(page.getByRole('button',{name:'Tentar novamente',exact:true})).toBeVisible();
  await expect(page.locator('a[href*="/portalselect/demo"]')).toHaveCount(0);
  await expect(navigation(page)).toHaveCount(0);
});

test('the curation reference uses the current five-dimension policy and links to real evaluations',async({page})=>{
  await mockPortal(page);
  await page.goto('/portalselect/demo/padrao');
  await expect(page).toHaveURL(/\/portalselect\/padrao$/);
  await expectOnePortal(page);
  await expect(page.locator('.pt-standard-threshold')).toContainText('85/100');
  const criteria=page.getByRole('region',{name:'Critérios de qualidade'});
  await expect(criteria.getByRole('article')).toHaveCount(5);
  await expect(criteria.getByText('Mínimo 4/5',{exact:true})).toHaveCount(2);
  await page.getByRole('button',{name:'Industrial',exact:true}).click();
  await expect(criteria).toContainText('Peso 30%');
  await expect(criteria).toContainText('carga/descarga');
  await page.getByRole('button',{name:'Aplicar nos dossiês de avaliação',exact:true}).click();
  await expect(page).toHaveURL(/\/portalselect\/avaliacoes$/);
  await expect(page.locator('tbody')).toContainText(evaluation.title);
});

test('the extended sidebar keeps account access reachable on mobile without creating sample conversations',async({page})=>{
  await mockPortal(page);
  await page.goto('/portalselect/relacionamento');
  await expect(plannedStatus(page)).toBeVisible();
  await expect(page.getByLabel('Rascunho de resposta')).toHaveCount(0);
  await page.screenshot({path:'tmp/portal-unified-relationship-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'tmp/portal-unified-relationship-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Abrir navegação',exact:true}).click();
  await expect(navigation(page)).toBeVisible();
  await page.screenshot({path:'tmp/portal-unified-navigation-mobile.png'});
  await navigation(page).getByRole('link',{name:'Minha conta',exact:true}).click();
  await expect(page).toHaveURL(/\/portalselect\/conta$/);
  await expect(page.getByRole('heading',{name:'Seu acesso, sob seu cuidado.'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Abrir navegação',exact:true})).toHaveAttribute('aria-expanded','false');
});
