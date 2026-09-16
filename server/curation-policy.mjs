export const LEGACY_POLICY = 'EME-piloto-01';
export const SELECT_POLICY = 'EME-select-v2-pilot';

const closed = ['Entrada aprovada', 'Não selecionado'];
const families = {
  residential: {label:'Residencial',types:['Casa','Casa em condomínio','Apartamento','Compacto','Cabana'],weights:[25,25,20,20,10]},
  commercial: {label:'Comercial',types:['Sala comercial','Loja','Edifício corporativo'],weights:[25,25,20,20,10]},
  industrial: {label:'Industrial e logístico',types:['Galpão','Pavilhão','Centro de distribuição'],weights:[25,30,15,20,10]},
  land: {label:'Terrenos',types:['Terreno urbano','Lote em condomínio'],weights:[25,25,20,15,15]},
  agricultural: {label:'Agrícola',types:['Terra agrícola'],weights:[25,25,15,25,10]},
};

const anchors = {
  physical:[
    'Elemento essencial comprovadamente inutilizável para o uso avaliado.',
    'Deterioração extensa; intervenção ampla identificada.',
    'Deficiências relevantes em vários pontos; recuperação necessária.',
    'Conservação funcional; correções delimitadas e registradas.',
    'Conservação superior e consistente nos pontos críticos, sem deficiência relevante identificada no escopo observado.',
    'Condição excepcional e uniforme; execução ou manutenção corroboradas e todos os pontos críticos documentados.',
  ],
  use:[
    'Uso essencial objetivamente inviável na configuração documentada.',
    'Fluxo ou acesso essencial comprometido; reconfiguração ampla necessária.',
    'Limitações importantes prejudicam o uso cotidiano ou operacional.',
    'Programa essencial atendido; limitações e concessões explícitas.',
    'Programa bem resolvido e fluxos eficientes demonstrados em planta ou material suficiente.',
    'Eficiência excepcional demonstrada, com soluções adicionais úteis e sem gargalo relevante identificado.',
  ],
  project:[
    'Implantação ou configuração incompatível com o uso documentado.',
    'Desarticulação generalizada; conflito relevante entre espaços e uso.',
    'Soluções fragmentadas ou limitações claras de implantação.',
    'Projeto coerente e proporcional, sem diferencial comprovado.',
    'Conjunto consistente; pelo menos duas soluções de projeto úteis e documentadas.',
    'Integração excepcional de soluções; qualidade espacial superior demonstrada em referências comparáveis.',
  ],
  infrastructure:[
    'Recurso essencial comprovadamente ausente e sem solução para o uso avaliado.',
    'Múltiplos recursos essenciais deficientes.',
    'Atendimento parcial; adaptações relevantes necessárias.',
    'Recursos essenciais atendidos, com escopo e limitações registrados.',
    'Recursos superiores aos essenciais e adequados ao uso, corroborados por material específico.',
    'Recursos integrados e desempenho superior demonstrado por fontes adequadas, além de declarações comerciais.',
  ],
  context:[
    'Condicionante material comprovado impede o uso avaliado.',
    'Conflito grave documentado com acesso ou entorno.',
    'Limitações relevantes prejudicam o uso.',
    'Local compatível com o uso; concessões claras.',
    'Relação favorável com acesso e entorno; benefícios específicos documentados.',
    'Integração excepcional e consistente demonstrada em referências comparáveis e fontes pertinentes.',
  ],
};

const guidance = {
  residential:[
    'Confira ambientes internos, exterior/áreas comuns pertinentes e manutenção. Fotografia não comprova condição estrutural ou instalações ocultas.',
    'Confira planta ou sequência suficiente, circulação, acessos e programa declarado. Tamanho e preço não substituem boa distribuição.',
    'Registre proporções, relação entre ambientes, implantação e soluções úteis. Marca de acabamento ou gosto pessoal não comprova qualidade.',
    'Registre luz, ventilação e recursos pertinentes com fontes. Não infira desempenho acústico, térmico ou energético apenas por imagem.',
    'Avalie acessos, entorno imediato e exposições pertinentes ao uso. Não pontue prestígio social ou perfil dos moradores.',
  ],
  commercial:[
    'Confira unidade, fachada, acessos, áreas de apoio e estado observado/declarado das instalações.',
    'Defina a atividade pretendida; confira fluxos de público, equipe e carga, dimensões e capacidades com fontes.',
    'Avalie configuração para a atividade, áreas de apoio e organização de acessos e atendimento.',
    'Confira instalações da atividade, circulação vertical quando existente e conforto dos espaços ocupados; encaminhe capacidades técnicas para revisão.',
    'Avalie mobilidade e visibilidade quando pertinente. Condições ou restrições de uso exigem fonte e responsável pela revisão.',
  ],
  industrial:[
    'Confira cobertura, fechamentos, piso e áreas operacionais no escopo visível; registre manutenção e limitações declaradas.',
    'Confira acesso, manobra, carga/descarga, pé-direito e capacidades declaradas. Foto não certifica capacidade de piso ou doca.',
    'Avalie fluxos operacionais, separação de áreas e configuração para o uso proposto, sem presumir viabilidade técnica.',
    'Registre energia, utilidades, sistemas e áreas de apoio com fontes pertinentes; capacidades dependem de conferência responsável.',
    'Confira rotas de acesso, relação com vizinhança e condicionantes da operação. Não presumir licenças ou regularidade.',
  ],
  land:[
    'Registre limites/área com fonte, topografia informada, condição superficial e acessos. Não equivale a levantamento ou laudo.',
    'Confira geometria, acesso identificado e dependências do uso pretendido. Não invente potencial construtivo.',
    'Avalie relação entre forma, relevo e implantação pretendida, explicitando condicionantes e o que depende de análise técnica.',
    'Registre infraestrutura existente, fontes sobre disponibilidade/ligação e dependências para implantação.',
    'Confira entorno e conexão local. Riscos, restrições e permissões dependem da análise responsável; aparência não comprova viabilidade.',
  ],
  agricultural:[
    'Registre área/limites com fonte, condição observada do terreno e benfeitorias e histórico declarado de manejo/manutenção.',
    'Defina a atividade pretendida e confira circulação, logística e capacidades declaradas com fonte.',
    'Avalie organização das áreas, benfeitorias e acessos em relação à atividade declarada.',
    'Registre água, energia, infraestrutura produtiva e dependências de operação. Não infira solo, produtividade ou direitos de uso por fotografia.',
    'Confira acessos, logística e relação com áreas adjacentes; encaminhe condicionantes técnicas/documentais ao responsável.',
  ],
};

const checks = [
  ['authorization','Autorização e vínculo do solicitante','Conferência humana da identidade, do vínculo e da autorização para o escopo. Permissão de contato não autoriza divulgação.'],
  ['description','Características, áreas e uso informado','Identifique fontes e diferenças entre declaração, observação e conferência. Resolva contradições materiais de identificação, áreas e uso.'],
  ['market','Fontes e comparáveis de mercado','Registre preço pedido, custos com periodicidade e comparáveis datados. Mercado é prontidão comercial; não eleva a qualidade e não cria preço mínimo.'],
  ['documents','Revisão documental pelo responsável','Registre responsável, fontes, data e escopo da revisão pertinente ao caso. Conferido não significa garantia geral de regularidade.'],
];
const v2Checks = [
  ['scope','Enquadramento e evidências suficientes','Confirme tipologia, uso e região atendida; identifique o imóvel e confira se o material sustenta cada nota. Não conclua enquanto faltar evidência crítica.'],
  ...checks,
  ['technical','Limitações e revisão técnica pertinente','Registre limitações materiais e o encaminhamento dos alertas ao responsável pertinente. Pendências bloqueantes devem estar resolvidas; fotos não certificam segurança, capacidade técnica ou aptidão.'],
];

function selectedPolicy(saved) {
  if (typeof saved.policy === 'string' && saved.policy) return saved.policy;
  // Legacy snapshots predate explicit policy persistence. Never reinterpret their scores.
  if (Array.isArray(saved.criteria) && (saved.criteria.length === 4 || saved.criteria.some(c=>c?.key === 'market'))) return LEGACY_POLICY;
  return SELECT_POLICY;
}

function legacyDefinitions(type) {
  const rows=[
    ['physical','Condição física',30,'Estado observado, manutenção e limitações verificadas.'],
    ['use','Adequação ao uso',25,'Distribuição, acessos e infraestrutura para o uso proposto.'],
    ['context','Contexto do local',20,'Entorno, acessibilidade e condicionantes observadas.'],
    ['market','Coerência de mercado',25,'Preço pedido, despesas e comparáveis identificados e datados.'],
  ];
  if(type.includes('Terreno')||type==='Terra agrícola') {
    rows[0][1]='Condição do terreno'; rows[0][3]='Topografia, limites e condições observadas. Não equivale a laudo técnico.';
    rows[1][3]='Acesso, infraestrutura e viabilidade do uso pretendido a conferir com os responsáveis.';
  } else if(['Galpão','Pavilhão'].includes(type)) rows[1][3]='Circulação, acessos, instalações e adequação operacional ao uso proposto.';
  else if(['Sala comercial','Loja'].includes(type)) rows[1][3]='Acesso, visibilidade quando pertinente e adequação ao uso comercial proposto.';
  return rows.map(([key,label,weight,help])=>({key,label,weight,help,minimum:3,anchors:[]}));
}

export function readCuration({saved={},type='',stage=''}={}) {
  saved=saved||{};
  const policy=selectedPolicy(saved),legacy=policy===LEGACY_POLICY,supported=legacy||policy===SELECT_POLICY;
  const family=Object.keys(families).find(key=>families[key].types.includes(type))||null;
  const familyChanged=!legacy&&typeof saved.family==='string'&&saved.family!==family;
  const selectedFamily=families[family];
  const labels={physical:family==='land'||family==='agricultural'?'Condição do terreno e conservação':'Condição e conservação',use:'Adequação funcional',project:'Projeto e implantação',infrastructure:'Conforto e infraestrutura',context:'Integração ao local'};
  const definitions=legacy?legacyDefinitions(type):Object.keys(labels).map((key,index)=>({key,label:labels[key],weight:selectedFamily?.weights[index]??0,help:guidance[family]?.[index]||'Identifique uma tipologia atendida antes de pontuar.',minimum:['physical','use'].includes(key)?4:3,anchors:anchors[key]}));
  const storedCriteria=Array.isArray(saved.criteria)?saved.criteria:[];
  const criteria=definitions.map(def=>{
    const value=storedCriteria.find(c=>c?.key===def.key);
    return {...def,score:familyChanged?null:(value?.score??null),note:typeof value?.note==='string'?value.note:''};
  });
  const storedChecks=Array.isArray(saved.checks)?saved.checks:[];
  const verifications=(legacy?checks:v2Checks).map(([key,label,help])=>{
    const value=storedChecks.find(c=>c?.key===key);
    return {key,label,help:legacy&&key==='market'?'Registre preço pedido, despesas e comparáveis datados. Nesta política anterior preservada, coerência de mercado também integra a nota.':help,state:familyChanged?'Em revisão':(value?.state||'Pendente'),note:typeof value?.note==='string'?value.note:'',author:value?.author??null,date:value?.date??null};
  });
  const documented=c=>Number.isInteger(c.score)&&c.score>=0&&c.score<=5&&c.note.trim().length>=10;
  const complete=criteria.every(documented),threshold=legacy?80:85;
  const rawScore=complete&&supported&&(legacy||family)?criteria.reduce((sum,c)=>sum+c.score*c.weight/5,0):null;
  const score=rawScore===null?null:Math.round(rawScore);
  const blockers=[];
  if(!supported)blockers.push('Política de curadoria desconhecida. Solicite revisão técnica antes de decidir.');
  if(!legacy&&!family)blockers.push('Identifique uma tipologia atendida para aplicar a régua Select V2.');
  if(familyChanged)blockers.push('A família do imóvel mudou. Reavalie as cinco notas e as conferências antes de salvar.');
  if(!complete)blockers.push(`Complete as ${criteria.length} notas e suas referências de evidência. Informação desconhecida permanece sem nota.`);
  if(rawScore!==null&&(rawScore<threshold||criteria.some(c=>c.score<c.minimum)))blockers.push(legacy?'A avaliação está abaixo da régua piloto: 80/100 e mínimo 3 por dimensão.':'A qualidade está abaixo da régua Select V2: 85/100, condição e função com mínimo 4/5 e demais dimensões com mínimo 3/5.');
  for(const c of verifications)if(c.state!=='Conferido'||c.note.trim().length<10)blockers.push(c.label+': conferência humana pendente.');
  const pending=typeof saved.pending==='string'?saved.pending:'';
  if(pending.trim())blockers.push('Resolva as pendências abertas antes da decisão.');
  return {policy,family,familyLabel:selectedFamily?.label||'Tipologia não identificada',threshold,legacy,criteria,checks:verifications,pending,score,blockers,coverage:criteria.filter(documented).length,locked:closed.includes(stage)};
}

export function curationSnapshot(curation) {
  return {
    policy:curation.policy,
    ...(curation.legacy?{}:{family:curation.family}),
    criteria:curation.criteria.map(({key,score,note})=>({key,score,note})),
    checks:curation.checks.map(({key,state,note,author,date})=>({key,state,note,author,date})),
    pending:curation.pending,
  };
}
