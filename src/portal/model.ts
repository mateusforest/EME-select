export type Stage = 'Recebido' | 'Em avaliação' | 'Ajustes solicitados' | 'Aguardando decisão' | 'Entrada aprovada';
export type Scores = [number | null, number | null, number | null, number | null];
export interface Evaluation {
  id: string; title: string; city: string; type: string; operation: string; owner: string;
  assignee: string; stage: Stage; legal: 'Pendente' | 'Em revisão' | 'Conferido';
  scores: Scores; image: string; received: string; summary: string; pending: string[];
  reviewed: boolean; history: string[];
}
export interface Task { id: string; title: string; detail: string; time: string; evaluation?: string; urgent?: boolean }
export interface Conversation {
  id: string; name: string; initials: string; topic: string; channel: string;
  summary: string; message: string; reply: string; time: string;
}
export const stages: Stage[] = ['Recebido', 'Em avaliação', 'Ajustes solicitados', 'Aguardando decisão', 'Entrada aprovada'];
export const weights = [30, 25, 20, 25];
export const dimensions = ['Conservação', 'Funcionalidade', 'Contexto do local', 'Coerência de mercado'];
export function scoreOf(scores: Scores): number | null {
  if (scores.some(value => value === null)) return null;
  return Math.round(scores.reduce<number>((total, value, i) => total + (value ?? 0) * weights[i] / 5, 0));
}
export function approvalBlock(caseItem: Evaluation): string | null {
  if (caseItem.stage !== 'Aguardando decisão') return 'O imóvel precisa estar na etapa de decisão.';
  if (caseItem.legal !== 'Conferido' || caseItem.pending.length) return 'Há verificações pendentes neste dossiê.';
  const score = scoreOf(caseItem.scores);
  if (score === null) return 'A avaliação ainda está incompleta.';
  if (score < 80 || caseItem.scores.some(value => value !== null && value < 3)) return 'A pontuação está abaixo da régua experimental.';
  if (!caseItem.reviewed) return 'Confirme a revisão das evidências de exemplo.';
  return null;
}
export const evaluations: Evaluation[] = [
  { id: 'AV-001', title: 'Casa entre jardins', city: 'Atlântida · RS', type: 'Casa em condomínio', operation: 'Venda', owner: 'Proprietário de exemplo 01', assignee: 'Lia Martins', stage: 'Em avaliação', legal: 'Pendente', scores: [4, 4, 3, 5], image: '/assets/scene-condominios.png', received: '2026-09-11', summary: 'Boa integração entre espaços internos e jardim. A faixa pedida precisa ser sustentada pelos comparáveis anexados ao caso.', pending: ['Confirmar autorização de divulgação', 'Concluir análise da matrícula'], reviewed: false, history: ['11/09 · Candidatura de exemplo recebida', '12/09 · Características organizadas para conferência'] },
  { id: 'AV-002', title: 'Apartamento Mont’Serrat', city: 'Porto Alegre · RS', type: 'Apartamento', operation: 'Venda', owner: 'Proprietário de exemplo 02', assignee: 'Rafael Costa', stage: 'Aguardando decisão', legal: 'Conferido', scores: [4, 5, 4, 4], image: '/assets/scene-urbano.png', received: '2026-09-10', summary: 'Planta funcional, boa iluminação e despesas registradas. Exemplo de dossiê pronto para a revisão final da equipe.', pending: [], reviewed: false, history: ['10/09 · Candidatura de exemplo recebida', '12/09 · Verificações demonstrativas concluídas', '13/09 · Encaminhado para decisão de entrada'] },
  { id: 'AV-003', title: 'Casa das araucárias', city: 'Canela · RS', type: 'Casa', operation: 'Venda', owner: 'Proprietário de exemplo 03', assignee: 'Lia Martins', stage: 'Em avaliação', legal: 'Em revisão', scores: [5, 4, 4, 4], image: '/assets/scene-serra.png', received: '2026-09-12', summary: 'Relação consistente com a paisagem e ambientes bem resolvidos. A confirmação das áreas é necessária antes da decisão.', pending: ['Confirmar área construída'], reviewed: false, history: ['12/09 · Candidatura de exemplo recebida'] },
  { id: 'AV-004', title: 'Terreno Horizonte', city: 'Caxias do Sul · RS', type: 'Terreno urbano', operation: 'Venda', owner: 'Proprietário de exemplo 04', assignee: 'Rafael Costa', stage: 'Recebido', legal: 'Pendente', scores: [null, null, 4, null], image: '/assets/scene-terrenos.png', received: '2026-09-13', summary: 'Informações iniciais recebidas. Uso permitido, limites e infraestrutura ainda precisam ser verificados.', pending: ['Obter dados de área e limites', 'Verificar viabilidade de uso'], reviewed: false, history: ['13/09 · Candidatura de exemplo recebida'] },
  { id: 'AV-005', title: 'Pavilhão Norte', city: 'Passo Fundo · RS', type: 'Pavilhão', operation: 'Locação', owner: 'Proprietário de exemplo 05', assignee: 'Rafael Costa', stage: 'Ajustes solicitados', legal: 'Em revisão', scores: [2, 4, 4, 3], image: '/assets/scene-industrial.png', received: '2026-09-09', summary: 'Boa configuração de acesso. A conservação exige esclarecimentos e revisão antes de uma nova avaliação.', pending: ['Esclarecer manutenção da cobertura'], reviewed: false, history: ['09/09 · Candidatura de exemplo recebida', '12/09 · Solicitadas informações de manutenção'] },
  { id: 'AV-006', title: 'Sala junto à praça', city: 'Porto Alegre · RS', type: 'Sala comercial', operation: 'Locação', owner: 'Proprietário de exemplo 06', assignee: 'Lia Martins', stage: 'Aguardando decisão', legal: 'Conferido', scores: [4, 4, 4, 4], image: '/assets/scene-comercial.png', received: '2026-09-11', summary: 'Acessos e infraestrutura descritos no cadastro. Exemplo com os requisitos da etapa conferidos para revisão final.', pending: [], reviewed: false, history: ['11/09 · Candidatura de exemplo recebida', '13/09 · Encaminhado para decisão de entrada'] },
];
export const tasks: Task[] = [
  { id: 't1', title: 'Revisar a entrada do Mont’Serrat', detail: 'Curadoria · Rafael Costa', time: '09:30', evaluation: 'AV-002', urgent: true },
  { id: 't2', title: 'Conferir autorização de divulgação', detail: 'Casa entre jardins · Lia Martins', time: '10:00', evaluation: 'AV-001', urgent: true },
  { id: 't3', title: 'Acompanhar solicitação de visita', detail: 'Relacionamento · Rafael Costa', time: '11:00' },
  { id: 't4', title: 'Conferir repasse de setembro', detail: 'Locações · Equipe financeira', time: '14:00' },
  { id: 't5', title: 'Confirmar a área construída', detail: 'Casa das araucárias · Lia Martins', time: '15:30', evaluation: 'AV-003' },
];
export const conversations: Conversation[] = [
  { id: 'c1', name: 'Ana Oliveira', initials: 'AO', topic: 'Uma casa para viver perto do verde', channel: 'Conversa de exemplo', summary: 'Procura casa na Serra, com jardim e espaço para trabalhar. Solicitou opções e horários de visita. Orçamento ainda não informado.', message: 'Gostei da casa em Canela. Consigo conhecer melhor o jardim antes de marcar uma visita?', reply: 'Olá, Ana! Podemos reunir mais detalhes do jardim e confirmar as possibilidades de visita. Você tem preferência de dia e período?', time: '09:12' },
  { id: 'c2', name: 'Pedro Almeida', initials: 'PA', topic: 'Apresentação de um imóvel', channel: 'Conversa de exemplo', summary: 'Quer apresentar um apartamento para a curadoria. Informou localização e intenção de venda. Ainda não enviou características.', message: 'Tenho um apartamento em Porto Alegre e gostaria de entender como funciona a seleção.', reply: 'Olá, Pedro! A avaliação considera as características do imóvel, seu contexto e a documentação. Podemos começar pela região, área e algumas fotos?', time: '08:48' },
  { id: 'c3', name: 'Clara Mendes', initials: 'CM', topic: 'Manutenção no apartamento', channel: 'Conversa de exemplo', summary: 'Relatou uma torneira com vazamento. Precisamos confirmar a urgência e registrar as informações para o responsável.', message: 'A torneira da cozinha começou a pingar. Como faço para solicitar a manutenção?', reply: 'Olá, Clara. Vamos registrar a solicitação. O vazamento está contido ou há risco de alagamento? Se puder, descreva quando começou para encaminharmos ao responsável.', time: 'Ontem' },
];
export const rentals = [
  { id: 'LC-001', name: 'Apartamento do parque', city: 'Porto Alegre', image: '/assets/scene-urbano.png', tenant: 'Locatário de exemplo 01', owner: 'Proprietário de exemplo 07', rent: 4200, received: 4200, fee: 336, state: 'Repasse a conferir', due: '10/09/2026', event: 'Conferência do repasse', eventDate: '15/09', note: 'Recebimento conciliado no exemplo. Demonstrativo aguarda revisão. Taxa de 8% apenas ilustrativa, sem política comercial definida.' },
  { id: 'LC-002', name: 'Casa do bosque', city: 'Canela', image: '/assets/scene-serra.png', tenant: 'Locatário de exemplo 02', owner: 'Proprietário de exemplo 08', rent: 6800, received: 3000, fee: null, state: 'Pagamento parcial', due: '10/09/2026', event: 'Acompanhar saldo em aberto', eventDate: '14/09', note: 'Recebimento parcial de exemplo. Saldo de R$ 3.800,00 sem encargos calculados. Repasse ainda não calculado.' },
  { id: 'LC-003', name: 'Sala da praça', city: 'Caxias do Sul', image: '/assets/scene-comercial.png', tenant: 'Locatário de exemplo 03', owner: 'Proprietário de exemplo 09', rent: 2900, received: 0, fee: null, state: 'A vencer', due: '20/09/2026', event: 'Vencimento da cobrança', eventDate: '20/09', note: 'Cobrança de exemplo ainda não vencida. Nenhum pagamento ou envio real foi realizado.' },
];
export interface PortalState { version: 1; evaluations: Evaluation[]; done: string[]; drafts: Record<string, string>; notes: Record<string, string>; }
export const initialState = (): PortalState => ({ version: 1, evaluations: structuredClone(evaluations), done: [], drafts: {}, notes: {} });
export const STORAGE_KEY = 'eme-select-portal-demo-v1';
export function isPortalState(value: unknown): value is PortalState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PortalState;
  const strings = (v: unknown) => Array.isArray(v) && v.every(item => typeof item === 'string');
  const record = (v: unknown) => v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(item => typeof item === 'string');
  return s.version === 1 && Array.isArray(s.evaluations) && s.evaluations.length <= 200 && s.evaluations.every(e =>
    e && ['id','title','city','type','operation','owner','assignee','image','received','summary'].every(k => typeof e[k as keyof Evaluation] === 'string') &&
    stages.includes(e.stage) && ['Pendente','Em revisão','Conferido'].includes(e.legal) &&
    Array.isArray(e.scores) && e.scores.length === 4 && e.scores.every(n => n === null || Number.isFinite(n) && n >= 0 && n <= 5) &&
    typeof e.reviewed === 'boolean' && strings(e.pending) && strings(e.history)) &&
    new Set(s.evaluations.map(e => e.id)).size === s.evaluations.length &&
    strings(s.done) && Boolean(record(s.drafts)) && Boolean(record(s.notes));
}

