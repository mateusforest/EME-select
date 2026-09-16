import { ArrowUpRight, Clock3, ShieldCheck } from 'lucide-react';
import { portalPath, type PortalNavigationItem } from './portalNavigation';

type PlannedContent = { summary: string; available: string; next: { title: string; description: string }[]; control: string; action: { page: string; label: string }; adminAction?: { page: string; label: string } };
const content: Record<string, PlannedContent> = {
  relacionamento: {
    summary: 'O atendimento integrado, a agenda de visitas e a conversa entre as partes ainda não estão disponíveis neste portal.',
    available: 'O histórico de cada avaliação já pode receber observações e próximos passos da equipe. A ficha pública de envio de imóvel também está disponível no site.',
    next: [
      { title: 'Atendimento com contexto', description: 'Reunir as conversas do WhatsApp autorizado e encaminhar o contato ao responsável, com histórico e acompanhamento da EME.' },
      { title: 'Visitas e chaves', description: 'Combinar horários entre proprietário, interessado e equipe. A retirada de chave dependerá de autorização expressa da EME e registro de entrega e devolução.' },
      { title: 'Área do proprietário', description: 'Permitir que o cliente acompanhe seu imóvel e converse com a equipe e com interessados dentro de um fluxo supervisionado.' },
    ],
    control: 'O WhatsApp ainda não está conectado. Esta área não recebe nem envia mensagens e ainda não agenda visitas ou libera chaves.',
    action: { page: 'avaliacoes', label: 'Acompanhar avaliações' },
  },
  locacoes: {
    summary: 'A gestão de contratos, vistorias, manutenção e renovações ainda está em desenvolvimento.',
    available: 'Os anúncios de locação já podem ser cadastrados. Os administradores também podem registrar manualmente aluguéis, taxas de administração e repasses na Central financeira.',
    next: [
      { title: 'Contratos e vigências', description: 'Relacionar proprietário, locatário e imóvel, acompanhando datas, garantias e condições revisadas pela equipe.' },
      { title: 'Manutenção e vistorias', description: 'Organizar solicitações, autorizações, responsáveis e registros de entrada e saída do imóvel.' },
      { title: 'Cobranças e renovações', description: 'Acompanhar vencimentos, reajustes e renovação, com conferência dos lançamentos e dos valores de terceiros.' },
    ],
    control: 'Os lançamentos financeiros atuais são manuais. O portal não emite cobranças nem realiza transferências bancárias.',
    action: { page: 'imoveis', label: 'Ver imóveis e anúncios' },
    adminAction: { page: 'financeiro', label: 'Abrir Central financeira' },
  },
  documentos: {
    summary: 'O armazenamento privado de documentos e as consultas externas ainda não estão disponíveis.',
    available: 'A curadoria já permite registrar referências, fontes, responsáveis e pendências documentais no dossiê de cada avaliação.',
    next: [
      { title: 'Dossiê privado', description: 'Reunir os documentos autorizados por imóvel, com controle de acesso e separação das fotos destinadas ao anúncio público.' },
      { title: 'Validade e histórico', description: 'Controlar versões, datas de emissão e revisões, mantendo quem conferiu cada documento.' },
      { title: 'Revisão responsável', description: 'Organizar divergências e consultas habilitadas para a análise dos profissionais responsáveis pelo caso.' },
    ],
    control: 'Registre apenas referências textuais na curadoria. Não envie documentos pessoais no campo de fotos do anúncio; esse campo é destinado à apresentação pública do imóvel.',
    action: { page: 'avaliacoes', label: 'Ver dossiês de avaliação' },
  },
  inteligencia: {
    summary: 'A IA de atendimento e análise ainda não está conectada. As avaliações atuais são preenchidas pela equipe e seguem regras de validação do portal.',
    available: 'O sistema já verifica notas mínimas, evidências registradas e conferências obrigatórias antes de encaminhar um imóvel à decisão humana.',
    next: [
      { title: 'Atendimento e pré-avaliação', description: 'Coletar informações, organizar o histórico do imóvel, identificar pendências e preparar uma recomendação de enquadramento.' },
      { title: 'Curadoria com evidências', description: 'Apoiar a leitura do material por critério, indicando fontes, incertezas e motivos para selecionar, solicitar ajustes ou não selecionar.' },
      { title: 'Acompanhamento da operação', description: 'Preparar resumos e alertas de atendimento, locação e documentação para a revisão dos responsáveis.' },
    ],
    control: 'A decisão final de entrada e a publicação permanecem com a EME. A IA não está atendendo clientes nem aprovando imóveis nesta versão.',
    action: { page: 'padrao', label: 'Consultar padrão de curadoria' },
  },
  qualidade: {
    summary: 'A análise de qualidade do atendimento ainda depende da conexão dos canais e da definição dos critérios com a equipe.',
    available: 'A distribuição das avaliações e os registros de cada responsável já estão disponíveis. O resultado financeiro por corretor pode ser acompanhado na Central financeira.',
    next: [
      { title: 'Continuidade e clareza', description: 'Revisar retornos, compromissos assumidos e consistência das informações, considerando o contexto de cada atendimento.' },
      { title: 'Evidências e contexto', description: 'Relacionar as observações ao registro de origem e à cobertura dos canais, sem interpretar ausência de mensagem como falha confirmada.' },
      { title: 'Desenvolvimento da equipe', description: 'Permitir revisão pelo gestor, resposta do profissional e acompanhamento de melhorias acordadas.' },
    ],
    control: 'Ainda não há pontuação de atendimento. Não são aplicados rankings, punições ou decisões de remuneração automáticas.',
    action: { page: 'equipe', label: 'Gerenciar equipe e acessos' },
    adminAction: { page: 'financeiro', label: 'Ver resultado financeiro' },
  },
};

export default function PlannedWorkspace({ page, admin, onNavigate }: { page: PortalNavigationItem; admin: boolean; onNavigate: (page: string) => void }) {
  const section = content[page.id];
  if (!section) return null;
  const actions = [section.action, ...(admin && section.adminAction ? [section.adminAction] : [])];
  return <div className="pt-planned-workspace">
    <section className="pt-module-status" aria-labelledby="module-status-heading"><span className="pt-module-icon"><page.icon size={27} /></span><div><span className="pt-status-label"><Clock3 size={13} />Em desenvolvimento</span><h2 id="module-status-heading">{page.label}</h2><p>{section.summary}</p></div></section>
    <section className="ps-card pt-module-available"><div><span className="ps-overline">JÁ DISPONÍVEL NO PORTAL</span><h2>O que você pode fazer hoje</h2><p>{section.available}</p></div><div className="pt-module-actions">{actions.map(action => <a key={action.page} href={portalPath(action.page)} className="ps-button" onClick={event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); onNavigate(action.page); }}>{action.label}<ArrowUpRight size={16} /></a>)}</div></section>
    <section aria-labelledby="module-scope-heading"><div className="pt-module-section-heading"><span className="ps-overline">PRÓXIMAS FUNCIONALIDADES</span><h2 id="module-scope-heading">O escopo desta área</h2></div><div className="pt-module-grid">{section.next.map((item, index) => <article className="ps-card" key={item.title}><span className="pt-module-number">{String(index + 1).padStart(2, '0')}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></section>
    <div className="ps-note pt-module-note"><ShieldCheck size={19} /><p>{section.control}</p></div>
  </div>;
}
