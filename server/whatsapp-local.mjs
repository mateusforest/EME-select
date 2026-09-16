import {createWhatsApp} from './whatsapp.mjs';
export function attachWhatsApp({db,transaction,consume,send,env=process.env,fetcher}){
  db.exec(`CREATE TABLE IF NOT EXISTS whatsapp_events(event_key TEXT PRIMARY KEY,kind TEXT NOT NULL,message_id TEXT NOT NULL,phone_number_id TEXT NOT NULL,contact_phone TEXT NOT NULL,occurred_at TEXT NOT NULL,received_at TEXT NOT NULL,data TEXT NOT NULL) STRICT;`);
  const insert=db.prepare('INSERT OR IGNORE INTO whatsapp_events VALUES(?,?,?,?,?,?,?,?)');
  const store={ready:async()=>true,ingest:events=>transaction(()=>{for(const event of events)insert.run(event.event_key,event.kind,event.message_id,event.phone_number_id,event.contact_phone,event.occurred_at,new Date().toISOString(),JSON.stringify(event.data));}),list:async()=>db.prepare('SELECT * FROM whatsapp_events ORDER BY received_at DESC LIMIT 50').all().map(row=>({...row,data:JSON.parse(row.data)}))};
  const service=createWhatsApp({store,env,fetcher,rate:user=>consume('whatsapp-check:'+user.id,6)});
  return {handle:(path,req,res,user,body)=>service.handle(path,req,res,user,body,(status,value)=>send(res,status,value)),publicHandle:async(path,req,res)=>{if(path!=='/api/webhooks/whatsapp')return false;const headers=new Headers();for(const[key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);const reply=await service.webhook({method:req.method,url:'http://localhost'+req.url,headers,body:req});res.statusCode=reply.status;reply.headers.forEach((value,key)=>res.setHeader(key,value));res.end(await reply.text());return true;}};
}
