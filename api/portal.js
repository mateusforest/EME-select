import {createCloudApi} from '../server/cloud/api.mjs';
let app;
export function portalRequestUrl(value){
 const url=new URL(value,'https://portal.internal');
 if(url.pathname!=='/api/portal'||!url.searchParams.has('route'))return value;
 const route=url.searchParams.get('route');url.searchParams.delete('route');
 const query=url.searchParams.toString();return '/api/'+route+(query?'?'+query:'');
}
export default async function handler(req,res){
 req.url=portalRequestUrl(req.url);
 try{app??=createCloudApi();await app.handle(req,res);}
 catch{res.setHeader('Cache-Control','no-store');res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'O serviço do portal está em configuração. Tente novamente em instantes.'}));}
}
