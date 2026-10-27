import { ChartNoAxesCombined, ClipboardCheck, FileText, House, KeyRound, LayoutDashboard, MessageSquare, ShieldCheck, SlidersHorizontal, Sparkles, Users, Wallet, Globe2, Gem, MapPinned, type LucideIcon } from 'lucide-react';

export interface PortalNavigationItem {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: string;
  status: 'active' | 'planned';
  adminOnly?: boolean;
  brokerOnly?: boolean;
  secondary?: boolean;
}

export const portalNavigation: PortalNavigationItem[] = [
  {id:'minha-atuacao',label:'Minha atuação',title:'Seus negócios, de perto.',description:'Seu dia, seus leads e suas comissões na mesma conta administrativa.',icon:House,group:'Operação',status:'active',adminOnly:true},
  { id: 'hoje', label: 'Visão geral', title: 'Sua operação, em perspectiva.', description: 'Acompanhe os imóveis, as publicações e os próximos passos.', icon: LayoutDashboard, group: 'Operação', status: 'active' },
  {id:'propostas',label:'Propostas em PDF',title:'Uma proposta para o próximo passo.',description:'Escolha um imóvel, prepare as condições e gere uma apresentação personalizada.',icon:FileText,group:'Operação',status:'active'},
  {id:'materiais',label:'Materiais de divulgação',title:'Tudo para apresentar o próximo lugar.',description:'Criativos, vídeos e apresentações organizados por imóvel e corretor.',icon:FileText,group:'Operação',status:'active'},
  { id: 'imoveis', label: 'Imóveis e captações', title: 'Da captação ao anúncio.', description: 'Uma ficha por imóvel. Materiais, cadastro e publicação.', icon: House, group: 'Operação', status: 'active' },
  { id: 'empreendimentos', label: 'Empreendimentos', title: 'Uma experiência completa. Unidade por unidade.', description: 'Moradas da Serra / DeVille: plantas, unidades e disponibilidade publicada.', icon: House, group: 'Site e conteúdo', status: 'active', adminOnly: true },
  { id: 'avaliacoes', secondary: true, label: 'Avaliações', title: 'Cada imóvel começa com uma boa leitura.', description: 'Cadastro, responsável, curadoria e histórico em um só lugar.', icon: ClipboardCheck, group: 'Operação', status: 'active' },
  { id: 'leads', label: 'Leads e entrada', title: 'Cada interesse, acompanhado.', description: 'Entrada do site, distribuição e histórico dos contatos.', icon: MessageSquare, group: 'Operação', status: 'active' },
  { id: 'relacionamento', label: 'Atendimento e visitas', title: 'Toda conversa merece continuidade.', description: 'Histórico de contatos, agenda de visitas e controle de chaves.', icon: MessageSquare, group: 'Operação', status: 'active' },
  { id: 'locacoes', label: 'Locações', title: 'Cuidar também é acompanhar.', description: 'Contratos, manutenção e compromissos da administração mensal.', icon: KeyRound, group: 'Operação', status: 'active' },
  { id: 'documentos', label: 'Documentos dos imóveis', title: 'Informação organizada. Acesso responsável.', description: 'Documentos privados, versões, validade e revisão da equipe.', icon: FileText, group: 'Operação', status: 'active' },
  { id: 'comissoes', label: 'Minhas comissões', title: 'Clareza em cada conquista.', description: 'Participações, potencial e pagamentos individuais.', icon: Wallet, group: 'Operação', brokerOnly: true, status: 'active' },
  { id: 'conversas', label: 'Conversas internas', title: 'O contexto fica com o negócio.', description: 'Registros internos por imóvel, compartilhados com a gestão e a carteira autorizada.', icon: MessageSquare, group: 'Equipe', status: 'active' },
  { id: 'financeiro', label: 'Central financeira', title: 'Clareza para cuidar do crescimento.', description: 'Receitas, despesas, caixa e resultado da EME.', icon: Wallet, group: 'Gestão', status: 'active', adminOnly: true },
  { id: 'padrao', label: 'Critérios de seleção', title: 'O que faz um imóvel ser EME.', description: 'Os critérios utilizados nas novas avaliações, por tipo de imóvel.', icon: SlidersHorizontal, group: 'Gestão', status: 'active' },
  { id: 'inteligencia', label: 'M e ferramentas de IA', title: 'Inteligência para o seu trabalho.', description: 'M no site, conexão de IA e análises internas com revisão da equipe.', icon: Sparkles, group: 'Gestão', status: 'active' },
  { id: 'qualidade', label: 'Qualidade do atendimento', title: 'Um padrão que se constrói em equipe.', description: 'Evidências de atendimento para orientar e desenvolver a equipe.', icon: ShieldCheck, group: 'Equipe', status: 'active', adminOnly: true },
  { id: 'pessoas', label: 'Perfis no site', title: 'Nossa equipe.', description: 'Perfis, retratos e cargos apresentados na página inicial.', icon: Users, group: 'Site e conteúdo', status: 'active', adminOnly: true },
  { id: 'equipe', label: 'Acessos da equipe', title: 'Pessoas certas. Responsabilidades claras.', description: 'Administradores e corretores. Contas e permissões da equipe.', icon: Users, group: 'Equipe', status: 'active', adminOnly: true },
  { id: 'clientes', label: 'Clientes e proprietários', title: 'Cada acesso, acompanhado.', description: 'Cadastros do Acesso Select, aprovação, imóveis exclusivos e vínculos de proprietários.', icon: Users, group: 'Operação', status: 'active', adminOnly: true },
  {id:'envios',label:'Imóveis enviados pelo site',title:'Cada envio, um novo olhar.',description:'Fichas, fotografias e leituras preliminares reunidas para a avaliação da equipe.',icon:ClipboardCheck,group:'Operação',status:'active',adminOnly:true},
  {id:'inovacao',label:'Inovação · ideias',title:'Novas ideias, novos caminhos.',description:'Acompanhe as propostas recebidas pelo ecossistema EME.',icon:Sparkles,group:'Site e conteúdo',status:'active',adminOnly:true},
  {id:'desempenho',label:'Desempenho do site',title:'O interesse, em perspectiva.',description:'Visitas, navegação, imóveis e contatos recebidos. Os sinais do site em um só lugar.',icon:ChartNoAxesCombined,group:'Site e conteúdo',status:'active',adminOnly:true},
  {id:'oportunidades',label:'Oportunidades',title:'O que merece destaque.',description:'Escolha os imóveis publicados que ganham destaque na experiência.',icon:Gem,group:'Site e conteúdo',status:'active',adminOnly:true},
  {id:'regioes',label:'Regiões',title:'Um olhar para cada lugar.',description:'Estados, destinos e vínculos com os imóveis da coleção.',icon:MapPinned,group:'Site e conteúdo',status:'active',adminOnly:true},
  {id:'empresa-documentos',label:'Documentos da empresa',title:'A empresa, bem organizada.',description:'Contratos e documentos internos em uma área privada da administração.',icon:FileText,group:'Gestão',status:'active',adminOnly:true},
  {id:'site',label:'Visão do site',title:'A experiência pública, sob seu cuidado.',description:'Acompanhe os conteúdos que chegam ao cliente.',icon:Globe2,group:'Site e conteúdo',status:'active',adminOnly:true},
  { id: 'conta', label: 'Minha conta', title: 'Seu acesso, sob seu cuidado.', description: 'Informações da sua conta na EME Select.', icon: KeyRound, group: 'Sua conta', status: 'active' },
];

export const portalPath = (id: string) => id === 'hoje' ? '/acesso-select/equipe' : '/acesso-select/equipe/' + id;

// Both roles use the same shell and routes; only their working vocabulary changes.
export function portalNavigationForRole(role: 'admin' | 'corretor'): PortalNavigationItem[] {
  const available = portalNavigation.filter(item => (!item.adminOnly || role === 'admin') && (!item.brokerOnly || role === 'corretor'));
  if (role === 'admin') return available;
  const presentation: Record<string, Partial<PortalNavigationItem>> = {
    hoje: {label:'Meu dia', title:'Sua carteira, em perspectiva.', description:'Seus imóveis, contatos e próximos passos, em um só lugar.'},
    imoveis: {label:'Carteira de imóveis', group:'Carteira', description:'Todos os imóveis da imobiliária, disponíveis para o seu atendimento.'},
    propostas: {group:'Carteira'},
    materiais: {group:'Carteira'},
    avaliacoes: {group:'Carteira'},
    documentos: {group:'Carteira'},
    locacoes: {group:'Carteira'},
    leads: {label:'Meus leads', group:'Atendimento', description:'Contatos atribuídos a você, próximos retornos e histórico de atendimento.'},
    relacionamento: {group:'Atendimento'},
    conversas: {group:'Atendimento'},
    comissoes: {group:'Resultados'},
    padrao: {group:'Apoio'},
    inteligencia: {label:'Ferramentas de IA', group:'Apoio', description:'Prepare materiais e análises dos seus imóveis, com revisão antes de usar.'},
  };
  return available.map(item => ({...item,...presentation[item.id]}));
}
export const portalPageFromPath = (path: string) => path.replace(/^\/acesso-select\/equipe\/?/, '').replace(/\/+$/, '') || 'hoje';
