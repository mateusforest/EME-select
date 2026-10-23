import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.avif':'image/avif','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{
 try{
  if(req.method!=='GET'){res.writeHead(405,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Prévia: envio desativado.'}));return;}
  const url=new URL(req.url,'http://127.0.0.1:4194');
  if(url.pathname.startsWith('/api/')){
   if(!/^\/api\/(?:public\/(?:properties|people)|(?:photos|people-images)\/[a-f0-9-]{36}|auth\/session)$/.test(url.pathname)){res.writeHead(404);res.end();return;}
   const upstream=await fetch('https://www.emeselect.com'+url.pathname,{signal:AbortSignal.timeout(15000)});
   res.writeHead(upstream.status,{'Content-Type':upstream.headers.get('content-type')||'application/json','Cache-Control':'no-store'});res.end(Buffer.from(await upstream.arrayBuffer()));return;
  }
  const file=resolve(root,'.'+(url.pathname==='/'||/^\/(?:enviar-imovel|portalselect)(?:\/|$)/.test(url.pathname)?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(root+sep)||(await stat(file)).isDirectory())throw Error();
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Não encontrado');}
}).listen(4194,'127.0.0.1',()=>console.log('Prévia com catálogo público e envios bloqueados: http://127.0.0.1:4194'));
