import {createWhatsApp} from '../whatsapp.mjs';
export function attachCloudWhatsApp({client,env=process.env,fetcher}){
  const store={
    ready:async()=>{try{await client.rest('eme_whatsapp_events?select=event_key&limit=0');return true;}catch{return false;}},
    ingest:async events=>{
      await client.request('/rest/v1/eme_whatsapp_events?on_conflict=event_key',{
        method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:events
      });
      // WhatsApp "SAIR" (texto exato) cancela futuros convites M Switch. A origem do evento
      // já foi autenticada via assinatura Meta em createWhatsApp(). Jamais responder automaticamente.
      for(const event of events){
        if(event.kind!=='message'||!['sair','parar','stop','cancelar'].includes(String(event.data?.text||'').trim().toLocaleLowerCase('pt-BR')))continue;
        if(!/^55[1-9]{2}9?\d{8}$/.test(String(event.contact_phone||'')))continue;
        await client.rest('eme_switch_professionals?phone=eq.'+event.contact_phone,'PATCH',{
          status:'paused',whatsapp_opt_in:false,updated_at:new Date().toISOString()
        }).catch(error=>{
          // Migração M Switch pode ainda estar desativada; não prejudicar o webhook legado.
          if(error.status!==503)throw error;
        });
      }
    },
    list:()=>client.rest('eme_whatsapp_events?select=event_key,kind,message_id,contact_phone,occurred_at,received_at,data&order=received_at.desc&limit=50'),
  };
  return createWhatsApp({store,env,fetcher,rate:user=>client.rpc('eme_limit',{p_key:'whatsapp-check:'+user.id,p_max:6})});
}
