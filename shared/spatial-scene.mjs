export const sceneAssets = [
 ['fachada-1','Fachada · lateral 1','carousel-apresentation-03.webp'],['fachada-frente','Fachada · frente','carousel-apresentation-02.webp'],['fachada-2','Fachada · lateral 2','carousel-apresentation-01.webp'],
 ['living','Living integrado','carousel-apartament-01.webp'],['suite','Suíte','carousel-apartament-02.webp'],['duplex','Living com pé-direito duplo','carousel-apartament-03.webp'],['gourmet','Jantar e cozinha','carousel-apartament-04.webp'],
 ['playground','Playground','carousel-social-structure-01.webp'],['piscina','Piscina','carousel-social-structure-02.webp'],['fogo','Praça do fogo','carousel-social-structure-03.webp'],['academia','Academia','carousel-social-structure-04.webp'],['festas','Salão de festas','carousel-social-structure-05.webp']
].map(([id,label,file])=>({id,label,file}));
export const sceneRooms=[['living','Living'],['jantar','Jantar'],['cozinha','Cozinha'],['suite-1','Suíte 1'],['suite-2','Suíte 2'],['lavabo','Lavabo'],['servico','Serviço'],['banho-1','Banho da suíte 1'],['banho-2','Banho da suíte 2']].map(([id,label])=>({id,label}));
export const sceneFinishes=[{id:'original',label:'G400 · original'},{id:'linen',label:'Linho e madeira'},{id:'olive',label:'Verde e pedra'}];
export function defaultScene(){return {version:1,mode:'presentation',assets:['fachada-1','living','suite','piscina'],finish:'original',hour:14,room:'living'};}
export function validateScene(input){
 const fail=()=>{throw Object.assign(new Error('Configuração de cenário inválida.'),{status:400});};
 if(!input||typeof input!=='object'||Array.isArray(input))fail();
 if(Object.keys(input).some(k=>!['version','mode','assets','finish','hour','room'].includes(k)))fail();
 if(input.version!==1||!['presentation','tipo5'].includes(input.mode)||!sceneFinishes.some(f=>f.id===input.finish)||!sceneRooms.some(r=>r.id===input.room)||!Number.isFinite(input.hour)||input.hour<8||input.hour>22)fail();
 if(!Array.isArray(input.assets)||input.assets.length<2||input.assets.length>12||new Set(input.assets).size!==input.assets.length||input.assets.some(id=>!sceneAssets.some(a=>a.id===id)))fail();
 return {version:1,mode:input.mode,assets:[...input.assets],finish:input.finish,hour:input.hour,room:input.room};
}
export function defaultProposal(){return {recipient:'',deliverables:'',conditions:'Condições finais, revisões e cronograma sujeitos à aprovação do escopo. Hospedagem, operação mensal, licenças de terceiros e alterações posteriores não estão incluídas nesta estimativa.'};}
export function validateProposal(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['recipient','deliverables','conditions'].includes(k)))throw Object.assign(new Error('Confira os dados da proposta.'),{status:400});
 for(const [key,max] of [['recipient',180],['deliverables',2500],['conditions',1800]])if(typeof value[key]!=='string'||value[key].length>max)throw Object.assign(new Error('Confira os dados da proposta.'),{status:400});
 return {recipient:value.recipient.trim(),deliverables:value.deliverables.trim(),conditions:value.conditions.trim()};
}
