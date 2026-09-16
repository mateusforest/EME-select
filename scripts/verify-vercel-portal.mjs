import {chromium,expect} from '@playwright/test';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const config=JSON.parse(readFileSync('vercel.json','utf8'));
for(const source of ['/portalselect','/portalselect/:path*'])assert.ok(config.rewrites.some(rule=>rule.source===source&&rule.destination==='/index.html'));
const root=resolve('dist'),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage(),errors=[];let apiConnected=false;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://portal.eme.test/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.startsWith('/api/'))return route.fulfill(apiConnected?{status:200,json:{user:null,needsSetup:false}}:{status:404,contentType:'text/plain',body:'NOT_FOUND'});
  const file=resolve(root,path.startsWith('/portalselect')?'index.html':'.'+path);
  if(!file.startsWith(root+sep)||!existsSync(file))return route.fulfill({status:404,body:'NOT_FOUND'});
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
  await route.fulfill({status:200,contentType:types[extname(file)]||'application/octet-stream',body:readFileSync(file)});
 });
 for(const path of ['/portalselect','/portalselect/imoveis','/portalselect/avaliacoes']){
  await page.goto('https://portal.eme.test'+path);
  await expect(page.getByRole('heading',{name:'O portal online está em preparação.'})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'E-mail',exact:true})).toHaveCount(0);
 }
 await expect(page.getByRole('link',{name:/demonstração/i})).toHaveCount(0);
 await page.goto('https://portal.eme.test/portalselect/demo/avaliacoes?origem=legado');
 await expect(page).toHaveURL('https://portal.eme.test/portalselect/avaliacoes?origem=legado');
 await expect(page.getByRole('heading',{name:'O portal online está em preparação.'})).toBeVisible();
 await expect(page.locator('.pt-live')).toHaveCount(0);
 apiConnected=true;
 await page.goto('https://portal.eme.test/portalselect');
 await expect(page.getByRole('heading',{name:'Bem-vindo de volta.'})).toBeVisible();
 await expect(page.getByRole('textbox',{name:'E-mail',exact:true})).toBeVisible();
 assert.deepEqual(errors,[]);
 console.log('Unified portal verified: nested routes, unavailable API, authenticated legacy links and connected login.');
}finally{await browser.close();}
