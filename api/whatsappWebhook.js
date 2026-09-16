import {createClient} from '../server/cloud/client.mjs';
import {attachCloudWhatsApp} from '../server/cloud/whatsapp.mjs';
let app;
export default {
  async fetch(request){
    try{app??=attachCloudWhatsApp({client:createClient()});return await app.webhook({method:request.method,url:request.url,headers:request.headers,body:request.body});}
    catch{return new Response('Recebimento ainda não ativado.',{status:503,headers:{'Cache-Control':'no-store'}});}
  }
};
