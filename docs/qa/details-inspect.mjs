import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];
for (const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  const page = await browser.newPage({viewport, reducedMotion:'reduce'});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['imovel/urbano-01','proprietarios']) {
    await page.goto(`http://127.0.0.1:4190/#/${route}`);
    await page.waitForLoadState('networkidle');
    const name = `${route.split('/')[0]}-${viewport.width}`;
    await page.screenshot({path:`docs/qa/${name}.png`,fullPage:true});
    results.push({name,errors:[...errors],...(await page.evaluate(() => ({
      documentWidth:document.documentElement.scrollWidth,
      viewportWidth:window.innerWidth,
      headings:[...document.querySelectorAll('h1,h2')].map(e=>e.textContent),
      images:[...document.images].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),
      overflow:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,10).map(e=>({tag:e.tagName,className:e.className,right:e.getBoundingClientRect().right})),
    })))});
  }
  await page.close();
}
await browser.close();
await fs.writeFile('docs/qa/details-inspect.json',JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
