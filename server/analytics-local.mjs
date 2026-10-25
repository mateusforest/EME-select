import {createAnalytics,analyticsBucket,analyticsDay,mergeAnalytics,analyticsReport} from './analytics.mjs';
export function attachLocalAnalytics({db,transaction,consume}){
 db.exec('CREATE TABLE IF NOT EXISTS site_analytics(id TEXT PRIMARY KEY,day TEXT NOT NULL,data TEXT NOT NULL); CREATE INDEX IF NOT EXISTS site_analytics_day ON site_analytics(day);');
 return createAnalytics({rate:async req=>consume('analytics:'+req.socket.remoteAddress,120),store:{
  record:async(input,date)=>transaction(()=>{const bucket=analyticsBucket(input,date),row=db.prepare('SELECT data FROM site_analytics WHERE id=?').get(bucket.id),catalog=new Map(db.prepare('SELECT id,published FROM listings WHERE published IS NOT NULL').all().map(r=>[r.id,JSON.parse(r.published).title]));const {data,changed}=mergeAnalytics(row?JSON.parse(row.data):null,input,bucket,catalog,date);if(changed)db.prepare('INSERT INTO site_analytics(id,day,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(bucket.id,bucket.day,JSON.stringify(data));db.prepare('DELETE FROM site_analytics WHERE day<?').run(analyticsDay(new Date(date.getTime()-89*86400000)));}),
  report:async(days,date)=>{const from=analyticsDay(new Date(date.getTime()-(days-1)*86400000));return analyticsReport(db.prepare('SELECT data FROM site_analytics WHERE day>=?').all(from).map(r=>JSON.parse(r.data)),db.prepare('SELECT property_id,status,created_at FROM leads WHERE created_at>=? AND created_at<=?').all(new Date(from+'T00:00:00-03:00').toISOString(),date.toISOString()),days,date);}
 }});
}
