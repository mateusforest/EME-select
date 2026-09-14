# Portal Select — primeira versão (0.5.0)

Criado em 14/09/2026 na rota **/portalselect**. A aplicação pública continua nas rotas existentes.

## Acessos
- Visão geral: http://127.0.0.1:4191/portalselect
- Avaliações: /portalselect/avaliacoes
- Carteira: /portalselect/carteira
- Relacionamento: /portalselect/relacionamento
- Locações: /portalselect/locacoes
- Qualidade da equipe: /portalselect/qualidade
- Central de IA: /portalselect/inteligencia
- Padrão de curadoria: /portalselect/padrao

O rodapé do site inclui “Portal da equipe”. Navegação interna mantém histórico do navegador. A prévia em scripts/serve.mjs serve o aplicativo nas rotas do portal, inclusive ao atualizar uma página interna. Uma hospedagem futura precisa da mesma regra de reescrita, limitada às rotas da aplicação.

## O que funciona nesta versão
- Painel com contagens derivadas dos exemplos, tarefas e distribuição de avaliações por etapa.
- Cadastro de candidaturas demonstrativas, busca, filtro por etapa e abertura de dossiê.
- Dossiê com pontuação, cobertura incompleta, pendências, responsável e histórico.
- Aprovação de entrada no exemplo exige etapa de decisão, documentação marcada como conferida no conjunto fictício, ausência de pendências, nota mínima experimental, mínimo por dimensão e revisão humana confirmada.
- Solicitação de ajuste exige motivo e mantém o caso pendente.
- Conclusão e reabertura de tarefas; concluir tarefa não libera dossiê.
- Carteira conectada aos 18 exemplos do site, com filtro por finalidade e acesso às fichas públicas.
- Conversas fictícias, rascunhos separados por contato e notas locais. Nenhum envio externo.
- Três contratos ilustrativos com valores discriminados de recebimento, saldo, taxa e repasse; pagamento parcial não vira repasse automático.
- Qualidade da equipe e escopo da IA com limitações e fontes de evidência previstas.
- Layout para computador e celular, busca global, painéis com foco e fechamento por Escape.
- Carregamento separado do site público e do portal, inclusive os respectivos estilos.

## Estado dos dados e serviços
Esta é uma base de interface e fluxo funcional com dados fictícios. **Não existe autenticação, autorização no servidor, banco de dados compartilhado, IA conectada, consulta jurídica, emissão de cobrança ou pagamento.** A rota é acessível a quem tiver o endereço. Não inserir dados pessoais, documentos ou operações reais.

Candidaturas, decisões de exemplo, tarefas, rascunhos e notas ficam no localStorage deste navegador, sob a chave eme-select-portal-demo-v1. Os dados não são compartilhados entre pessoas/dispositivos e não constituem um histórico de auditoria seguro. Apagar os dados do navegador remove essas alterações. Dados locais inválidos são substituídos pelos exemplos com aviso. Falha de gravação também é indicada. Não é uma solução de sincronização simultânea entre abas.

As notas de curadoria e os resumos são exemplos preparados, não resultados de um modelo. Aceitar uma candidatura não publica nem altera o acervo público. Os critérios 80/100 e 3/5 são experimentais. Taxa de administração de 8% em um contrato é somente ilustração.

## Arquivos principais
- src/main.tsx: escolha e carregamento separado das aplicações.
- src/PublicApp.tsx: entrada do site existente e estilos públicos.
- src/portal/PortalApp.tsx: navegação, telas e interações.
- src/portal/model.ts: tipos, exemplos, cálculo e condições de aprovação.
- src/portal/usePortal.ts: rota, histórico e persistência local demonstrativa.
- src/portal/portal.css: identidade e adaptação das telas.
- scripts/serve.mjs: prévia compilada e suporte à rota direta.
- tests/portal.spec.ts: testes de fluxo, isolamento de rascunhos, critérios e recuperação.
- scripts/verify-portal.mjs: verificação da versão compilada em 1440 px e 390 px, respostas HTTP e imagens em design/portal.

## Próxima etapa de produção
1. Implementar contas individuais, autenticação, permissões no servidor e armazenamento privado.
2. Criar o cadastro e o histórico no banco, separar imóvel, oferta e candidatura e conectar o envio público de avaliações.
3. Validar a política de curadoria e a matriz documental; substituir exemplos por registros autorizados.
4. Conectar IA com fontes, limites de ação, revisão e avaliação de qualidade.
5. Integrar atendimento e administração de locações com provedores autorizados, conciliação e aprovações.

Nenhuma credencial, serviço externo ou assinatura foi criada nesta entrega.

