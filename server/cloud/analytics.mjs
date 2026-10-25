import {createAnalytics,analyticsBucket,analyticsDay,mergeAnalytics,analyticsReport} from '../analytics.mjs';
import {createHash} from 'node:crypto';
import {publicAccess} from '../select-access.mjs';
export function attachCloudAnalytics({client}){
 const {rest,rpc}=client;
 async function all(query){const output=[];for(let offset=0;offset<100000;offset+=500){const rows=await rest(query+'&limit=500&offset='+offset);output.push(...rows);if(rows.length<500)return output;}throw Object.assign(Error('O período excede o limite desta consulta. Escolha um período menor.'),{status:503});}
 const store={
  async record(input,date){const bucket=analyticsBucket(input,date),inventory=await all('eme_cases?select=id,data->published,data->access&data->published=not.is.null'),catalog=new Map(inventory.filter(r=>publicAccess({data:r})).map(r=>[r.id,r.published.title]));
   for(let attempt=0;attempt<5;attempt++){
    const row=(await rest('eme_cases?id=eq.'+bucket.id+'&select=id,version,data'))[0];if(row&&row.data.kind!=='site_analytics')throw Error('Analytics record collision');const {data,changed}=mergeAnalytics(row?.data,input,bucket,catalog,date);if(!changed)return;
    if(row){const saved=await rest('eme_cases?id=eq.'+row.id+'&version=eq.'+row.version,'PATCH',{data,version:row.version+1,updated_at:date.toISOString()});if(saved.length)return;}
    else{const admin=(await rest('eme_profiles?role=eq.admin&active=eq.true&select=id&limit=1'))[0];if(!admin)throw Error('Administrator unavailable');try{await rest('eme_cases','POST',{id:bucket.id,assignee_id:admin.id,data});await rest('eme_cases?data->>kind=eq.site_analytics&data->>day=lt.'+analyticsDay(new Date(date.getTime()-89*86400000)),'DELETE');return;}catch(e){if(e.status!==409)throw e;}}
   }throw Object.assign(Error('Medição temporariamente ocupada.'),{status:503});
  },
  async report(days,date){const from=analyticsDay(new Date(date.getTime()-(days-1)*86400000)),to=analyticsDay(date);const [rows,leads]=await Promise.all([all('eme_cases?select=data->day,data->startedAt,data->visits,data->pageViews,data->pages,data->properties,data->sections,data->devices,data->sources,data->limited&data->>kind=eq.site_analytics&data->>day=gte.'+from+'&data->>day=lte.'+to+'&order=id'),all('eme_leads?select=id,property_id,status,created_at&created_at=gte.'+from+'T00:00:00-03:00&created_at=lt.'+analyticsDay(new Date(date.getTime()+86400000))+'T00:00:00-03:00&order=id')]);return analyticsReport(rows,leads,days,date);}
 };
 return createAnalytics({store,rate:async req=>{const ip=createHash('sha256').update(String(req.headers['x-forwarded-for']||'unknown').split(',')[0]).digest('hex');await rpc('eme_limit',{p_key:'analytics:'+ip,p_max:120});await rpc('eme_limit',{p_key:'analytics:total',p_max:3000});}});
}
