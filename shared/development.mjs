export const developmentId = 'moradas-da-serra';
export const developmentRecordId = 'e6e00000-0000-4000-8000-000000000001';
export const unitStatuses = { unknown:'A confirmar', available:'Disponível', reserved:'Reservado', sold:'Vendido' };
export function emptyDevelopment() { return { name:'Moradas da Serra', developer:'DeVille', location:'Vacaria, RS', description:'Explore as torres, os andares e cada possibilidade.', notes:'Arquitetura ilustrativa. Confirme o projeto e a disponibilidade com a equipe.', towers:[{id:'a',label:'Torre 1',floors:9},{id:'b',label:'Torre 2',floors:9}], plans:[], units:[] }; }
const error=message=>{throw Object.assign(new Error(message),{status:400});};
const string=(value,max=300)=>{if(typeof value!=='string'||value.trim().length>max)error('Confira os textos do empreendimento.');return value.trim();};
const number=(v,max=1e9,integer=false)=>{if(v===null||v==='')return null;if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max||(integer&&!Number.isInteger(v)))error('Confira as medidas e os números preenchidos.');return v;};
export function validateDevelopment(input) {
 if(!input||!Array.isArray(input.towers)||input.towers.length!==2||!Array.isArray(input.plans)||input.plans.length>30||!Array.isArray(input.units)||input.units.length>300)error('Estrutura do empreendimento inválida.');
 const result={name:string(input.name,100),developer:string(input.developer,100),location:string(input.location,150),description:string(input.description,800),notes:string(input.notes,800)};
 if(!result.name||!result.developer||!result.location)error('Informe nome, incorporadora e localização.');
 result.towers=['a','b'].map(id=>{const t=input.towers.find(t=>t.id===id);if(!t)error('Informe as duas torres.');const floors=number(t.floors,9,true);if(floors!==9)error('Esta cena está calibrada para nove andares por torre.');return {id,label:string(t.label,50)||id,floors};});
 const identifier=v=>{const id=string(v,80);if(!/^[a-zA-Z0-9_-]+$/.test(id))error('Identificador inválido.');return id;};
 result.plans=input.plans.map(p=>{
  const imageUrl=string(p.imageUrl,700);
  if(imageUrl&&!/^\/api\/development-images\/[a-f0-9-]{36}$/.test(imageUrl)&&!/^\/assets\/developments\/moradas-da-serra\/[\w.-]+$/.test(imageUrl))error('Envie a imagem da planta pelo portal.');
  const plan={id:identifier(p.id),title:string(p.title,120),area:number(p.area,100000),bedrooms:number(p.bedrooms,30,true),suites:number(p.suites,30,true),parking:number(p.parking,100,true),imageUrl};
  if(!plan.title)error('Dê um nome para cada planta.');return plan;
 });
 result.units=input.units.map(u=>{const tower=result.towers.find(t=>t.id===u.tower),floor=number(u.floor,9,true),planId=string(u.planId,80);if(!tower||!floor||floor>tower.floors||!Object.hasOwn(unitStatuses,u.status)||planId&&!result.plans.some(p=>p.id===planId))error('Confira torre, andar, planta e disponibilidade da unidade.');const label=string(u.label,60);if(!label)error('Informe a identificação da unidade.');return {id:identifier(u.id),tower:u.tower,floor,label,planId,status:u.status,price:number(u.price),orientation:string(u.orientation,100)};});
 for(const key of ['plans','units'])if(new Set(result[key].map(i=>i.id)).size!==result[key].length)error('Há identificadores repetidos.');
 if(new Set(result.units.map(u=>`${u.tower}:${u.label.toLowerCase()}`)).size!==result.units.length)error('Há unidades com a mesma identificação na torre.');
 if(Buffer.byteLength(JSON.stringify(result))>110000)error('Reduza a quantidade de informações.');
 return result;
}
export function developmentPublicationIssues(config) {
 const problems=[];
 for(const u of config.units){const p=config.plans.find(p=>p.id===u.planId);if(u.status==='available'&&(!p||!p.area||!p.imageUrl))problems.push(`Unidade ${u.label}: vincule uma planta com área e imagem antes de oferecer.`);}
 return problems;
}
