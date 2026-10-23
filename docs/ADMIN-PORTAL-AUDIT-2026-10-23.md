# Revisão do portal administrativo — 23/10/2026

## Organização e identidade

- Navegação recolhível em Operação, Site e conteúdo, Gestão, Equipe e Sua conta. Visão geral contém quatro entradas principais.
- Cabeçalho compacto com monograma transparente; fundo claro, verde original e seleção suave no menu.
- Minhas comissões fica no portal do corretor. Administração mantém os acordos em Central financeira → Negócios e comissões.
- Spatial Studio removido da navegação e da tela do portal. Nenhum material existente foi apagado.

## Conteúdo público

- Perfis no site usa a equipe aprovada: Mateus Forest, Douglas Maraschin e Fabrício Foscarini, com retratos distintos. Os dados antigos permanecem preservados até a próxima gravação; a apresentação usa a base aprovada.
- O site lê apenas os perfis publicados. Rascunhos continuam privados e separados das contas de acesso.
- Oportunidades permite selecionar os anúncios publicados que aparecem na página dedicada e nos destaques da hero. A seleção inicial preserva os anúncios anteriormente exibidos; o administrador passa a controlá-la explicitamente ao salvar.
- Regiões permite editar destinos e textos, ocultar/mostrar regiões, adicionar destinos e vincular imóveis. Banners existentes são preservados com seus créditos; novos destinos começam sem fotografia.
- Empreendimentos permanece como editor do projeto Moradas da Serra/DeVille, com plantas e unidades. Na conferência de produção, não havia estoque publicado. Não foi transformado em um gestor genérico de múltiplos empreendimentos.

## Documentos e acessos

- Documentos da empresa: área exclusiva de administradores, separada dos documentos por imóvel, com categoria, validade, download, versões e arquivamento reversível.
- Aceita PDF, PNG, JPEG e WebP de até 2 MB. Arquivos são validados e guardados em registros privados auditados; não são enviados ao catálogo público.
- API pública expõe somente configurações editoriais e referências a imóveis publicados. Consultas de carteira excluem os registros administrativos antes de recuperar os dados.
- Acessos permite editar nome, função e situação; mudanças de função e suspensões encerram sessões anteriores. Há proteção contra alteração da própria função, suspensão da própria conta e perda do último administrador.
- E-mail permanece somente leitura. Alteração de senha continua no fluxo específico da própria conta. Contas reais não foram alteradas durante a validação.

## Fluxos revisados

- Financeiro reorganizado em Resumo, Caixa, Negócios e comissões e Sócios. Projeções ficam em relatórios; planejamento dos sócios fica em Sócios. Nenhum lançamento, saldo ou regra de cálculo foi modificado.
- Conversas internas são registros por imóvel, visíveis conforme a carteira autorizada. Têm atualização manual e não enviam mensagens ao WhatsApp.
- Critérios de seleção mantém a régua existente, notas, pesos e evidências por tipo de imóvel. Decisões e publicação continuam na ficha do imóvel.
- Qualidade do atendimento continua a registrar evidências da equipe; não foi confundida com os perfis públicos.
- M e ferramentas de IA distingue o atendimento público das análises internas e mostra a disponibilidade do M. A integração de conversa livre existente foi preservada.

## Validação

- Compilação TypeScript e produção Vite concluídas.
- 67 verificações de regressão passaram, incluindo operações, financeiro, portal, empreendimentos, publicações, IA e políticas do banco.
- 12 verificações adicionais passaram: documentos administrativos nos adaptadores local/cloud, permissões e sessões, perfis e fotografias, seleção editorial de oportunidades. Há sobreposição com parte da suíte de regressão; não somar como testes únicos.
- Validação visual local: identidade, menu, formulários, perfis e gravação/restauração de texto de região.
- Conferência autenticada de produção antes da publicação: carteira, financeiro, empreendimentos, documentos, conversas, qualidade e IA. Sem criar transações ou registros de teste na produção.

Não é uma auditoria contábil ou jurídica. A revisão cobriu organização, interface, integração dos dados e controles técnicos dos fluxos alterados.
