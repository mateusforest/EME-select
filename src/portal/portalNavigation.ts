import { ClipboardCheck, FileText, House, KeyRound, LayoutDashboard, MessageSquare, ShieldCheck, SlidersHorizontal, Sparkles, Users, Wallet, type LucideIcon } from 'lucide-react';

export interface PortalNavigationItem {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: string;
  status: 'active' | 'planned';
  adminOnly?: boolean;
}

export const portalNavigation: PortalNavigationItem[] = [
  { id: 'hoje', label: 'Visão geral', title: 'Seu olhar. Agora, com continuidade.', description: 'Acompanhe sua carteira e os próximos passos.', icon: LayoutDashboard, group: 'Sua operação', status: 'active' },
  { id: 'imoveis', label: 'Imóveis e anúncios', title: 'Cada lugar merece uma boa apresentação.', description: 'Cadastro, fotografias e apresentação de cada imóvel.', icon: House, group: 'Sua operação', status: 'active' },
  { id: 'empreendimentos', label: 'Empreendimentos', title: 'Uma experiência completa. Unidade por unidade.', description: 'Cenário DeVille, plantas, andares e disponibilidade.', icon: House, group: 'Sua operação', status: 'active', adminOnly: true },
  { id: 'avaliacoes', label: 'Avaliações', title: 'Cada imóvel começa com uma boa leitura.', description: 'Cadastro, responsável, curadoria e histórico em um só lugar.', icon: ClipboardCheck, group: 'Sua operação', status: 'active' },
  { id: 'relacionamento', label: 'Atendimento e visitas', title: 'Toda conversa merece continuidade.', description: 'Histórico de contatos, agenda de visitas e controle de chaves.', icon: MessageSquare, group: 'Sua operação', status: 'active' },
  { id: 'locacoes', label: 'Locações', title: 'Cuidar também é acompanhar.', description: 'Contratos, manutenção e compromissos da administração mensal.', icon: KeyRound, group: 'Sua operação', status: 'active' },
  { id: 'documentos', label: 'Documentos', title: 'Informação organizada. Acesso responsável.', description: 'Documentos privados, versões, validade e revisão da equipe.', icon: FileText, group: 'Sua operação', status: 'active' },
  { id: 'financeiro', label: 'Central financeira', title: 'Clareza para cuidar do crescimento.', description: 'Receitas, despesas, caixa e resultado da EME.', icon: Wallet, group: 'Gestão e inteligência', status: 'active', adminOnly: true },
  { id: 'padrao', label: 'Padrão de curadoria', title: 'O que faz um imóvel ser EME.', description: 'Os critérios utilizados nas novas avaliações, por tipo de imóvel.', icon: SlidersHorizontal, group: 'Gestão e inteligência', status: 'active' },
  { id: 'inteligencia', label: 'Central de IA', title: 'Inteligência com supervisão da EME.', description: 'Conferência da régua e análises com revisão da equipe.', icon: Sparkles, group: 'Gestão e inteligência', status: 'active' },
  { id: 'qualidade', label: 'Qualidade da equipe', title: 'Um padrão que se constrói em equipe.', description: 'Evidências de atendimento para orientar e desenvolver a equipe.', icon: ShieldCheck, group: 'Gestão e inteligência', status: 'active', adminOnly: true },
  { id: 'equipe', label: 'Equipe e acessos', title: 'Pessoas certas. Responsabilidades claras.', description: 'Contas individuais e acesso conforme a função.', icon: Users, group: 'Gestão e inteligência', status: 'active', adminOnly: true },
  { id: 'conta', label: 'Minha conta', title: 'Seu acesso, sob seu cuidado.', description: 'Informações da sua conta na EME Select.', icon: KeyRound, group: 'Sua conta', status: 'active' },
];

export const portalPath = (id: string) => id === 'hoje' ? '/portalselect' : '/portalselect/' + id;
export const portalPageFromPath = (path: string) => path.replace(/^\/portalselect\/?/, '').replace(/\/+$/, '') || 'hoje';
