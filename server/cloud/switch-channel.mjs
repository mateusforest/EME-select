// Dedicated commercial channel. Never fall back to the site's credentials.
import {attachCloudWhatsApp} from './whatsapp.mjs';
export const SWITCH_NUMBER='5585994488338';
export const SWITCH_CALLBACK='https://www.emeselect.com/api/webhooks/switch-whatsapp';
export function switchWhatsAppEnv(env){
 const mapped={...env};
 for(const name of ['WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_BUSINESS_ACCOUNT_ID','WHATSAPP_GRAPH_VERSION','WHATSAPP_VERIFY_TOKEN','META_APP_SECRET','WHATSAPP_WEBHOOK_ENABLED'])mapped[name]=env['SWITCH_'+name]||'';
 mapped.WHATSAPP_EXPECTED_NUMBER=env.SWITCH_WHATSAPP_EXPECTED_NUMBER||SWITCH_NUMBER;
 return mapped;
}
export function attachSwitchChannel({client,env=process.env,fetcher}){
 const service=attachCloudWhatsApp({client,env:switchWhatsAppEnv(env),fetcher,callbackUrl:SWITCH_CALLBACK});
 return {...service,handle:async(path,req,res,user,body,send)=>{
   if(!path.startsWith('/api/switch/whatsapp/'))return false;
   if(!user?.active||user.must_change||user.role!=='admin')throw Object.assign(Error('Somente a gestão configura o canal M Switch.'),{status:403});
   return service.handle(path.replace('/api/switch/whatsapp/','/api/whatsapp/'),req,res,user,body,send);
 }};
}
