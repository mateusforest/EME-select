import {createWhatsApp} from '../whatsapp.mjs';
export function attachCloudWhatsApp({client,env=process.env,fetcher}){
  const store={
    ready:async()=>{try{await client.rest('eme_whatsapp_events?select=event_key&limit=0');return true;}catch{return false;}},
    ingest:events=>client.request('/rest/v1/eme_whatsapp_events?on_conflict=event_key',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:events}),
    list:()=>client.rest('eme_whatsapp_events?select=event_key,kind,message_id,contact_phone,occurred_at,received_at,data&order=received_at.desc&limit=50'),
  };
  return createWhatsApp({store,env,fetcher,rate:user=>client.rpc('eme_limit',{p_key:'whatsapp-check:'+user.id,p_max:6})});
}
