import {validateScene,validateProposal} from './spatial-scene.mjs';
export const spatialLevels = [
 {id:'visual',label:'Apresentação',description:'Imagens, plantas e pontos de visita. Sem caminhada livre.',factor:.30,license:'Entrega web; hospedagem e direitos dos materiais definidos por projeto.'},
 {id:'interactive',label:'Navegável',description:'Geometria otimizada, caminhada e seleção de espaços.',factor:.65,license:'Motor web e bibliotecas de ativos; conferir licenças comerciais.'},
 {id:'signature',label:'Signature',description:'Alto realismo, materiais e luz avançados; produção especializada.',factor:1,license:'Motor gráfico e infraestrutura GPU a contratar conforme uso.'},
];
export function initialSpatialProject(){return {name:'G400 · piloto de produção',level:'interactive',scope:'pilot',brief:'Validar uma tipologia e um ambiente social, com navegação coerente com a planta. Medir horas, retrabalho e custo antes de expandir.',manualHours:200,automatableShare:.6,reductionTarget:.5,hourCost:115,resources:2500,contingency:.15,tax:.10,margin:.30,people:2,hoursPerWeek:30,reviewWeeks:1,courtesy:1,platformInvestment:0,plan:null};}
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
export function validateSpatialProject(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('Informe o projeto.');
 const keys=[...Object.keys(initialSpatialProject()),'scene','proposal'];if(Object.keys(value).some(k=>!keys.includes(k)))fail('Campo de projeto não reconhecido.');
 if(typeof value.name!=='string'||value.name.trim().length<3||value.name.length>120||typeof value.brief!=='string'||value.brief.length>5000)fail('Confira o nome e o objetivo do projeto.');
 if(!spatialLevels.some(l=>l.id===value.level)||!['pilot','full','custom'].includes(value.scope))fail('Selecione o escopo e o nível.');
 const limits={manualHours:[1,20000],automatableShare:[0,1],reductionTarget:[0,.9],hourCost:[1,2000],resources:[0,10000000],contingency:[0,.8],tax:[0,.5],margin:[0,.8],people:[1,30],hoursPerWeek:[1,40],reviewWeeks:[0,52],courtesy:[0,1],platformInvestment:[0,10000000]};
 for(const [key,[min,max]] of Object.entries(limits))if(typeof value[key]!=='number'||!Number.isFinite(value[key])||value[key]<min||value[key]>max)fail('Confira o valor de '+key+'.');
 if(value.tax+value.margin>=.9)fail('Tributos e margem precisam somar menos de 90%.');
 if(value.plan!==null&&(typeof value.plan!=='object'||typeof value.plan.summary!=='string'||!Array.isArray(value.plan.steps)||value.plan.steps.length>12||value.plan.steps.some(s=>typeof s!=='string'||s.length>1500)||typeof value.plan.risks!=='string'||JSON.stringify(value.plan).length>16000))fail('Plano de produção inválido.');
 const scene=value.scene==null?value.scene:validateScene(value.scene);
 const proposal=value.proposal===undefined?undefined:validateProposal(value.proposal);
 const result={...value,name:value.name.trim(),brief:value.brief.trim(),...(scene!==undefined?{scene}:{}),...(proposal!==undefined?{proposal}:{})};
 if(new TextEncoder().encode(JSON.stringify(result)).length>34000)fail('O projeto excede o limite. Reduza os textos do plano e da proposta.');
 return result;
}
export function estimateSpatialProject(input){
 const p=validateSpatialProject(input);
 const savedHours=p.manualHours*p.automatableShare*p.reductionTarget;
 const remainingHours=p.manualHours-savedHours;
 const cost=(remainingHours*p.hourCost+p.resources)*(1+p.contingency);
 const price=Math.ceil(cost/(1-p.tax-p.margin)/1000)*1000;
 return {savedHours,remainingHours,cost,price,payable:price*(1-p.courtesy),weeks:Math.ceil(remainingHours/(p.people*p.hoursPerWeek)+p.reviewWeeks),baselineWeeks:Math.ceil(p.manualHours/(p.people*p.hoursPerWeek)+p.reviewWeeks),platformInvestment:p.platformInvestment};
}
export function applySpatialScope(project,scope,level=project.level){
 const factor=spatialLevels.find(l=>l.id===level)?.factor||1;
 return {...project,scope,level,manualHours:scope==='full'?Math.round(2276*factor):scope==='pilot'?Math.round(200*factor):project.manualHours,resources:scope==='full'?16000:scope==='pilot'?2500:project.resources,plan:null};
}
