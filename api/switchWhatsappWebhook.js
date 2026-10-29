import {createClient} from '../server/cloud/client.mjs';
import {attachSwitchChannel} from '../server/cloud/switch-channel.mjs';
let app;
export default {async fetch(request){
 try{app??=attachSwitchChannel({client:createClient()});return await app.webhook({method:request.method,url:request.url,headers:request.headers,body:request.body});}
 catch{return new Response('Canal M Switch ainda não ativado.',{status:503,headers:{'Cache-Control':'no-store'}});}
}};
