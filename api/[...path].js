import {createCloudApi} from '../server/cloud/api.mjs';
let app;
export default async function handler(req,res){
 try{app??=createCloudApi();await app.handle(req,res);}
 catch{res.setHeader('Cache-Control','no-store');res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'O serviço do portal está em configuração. Tente novamente em instantes.'}));}
}
