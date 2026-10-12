# Portal do corretor — entrega de 12/10/2026

## Implementado

- Meu dia: leads novos, retornos atrasados, próximos contatos, visitas futuras e imóveis da carteira. Dados reais; falhas de carregamento não simulam uma carteira vazia.
- Navegação móvel: Hoje, Leads, Imóveis, Comissões e Mais; botões e campos adequados ao toque.
- Origem da captação registrada separadamente do responsável operacional. A origem não muda com uma transferência de carteira; correções administrativas são auditadas.
- Comissões individuais com endpoint de projeção explícita. O corretor não recebe saldos bancários, despesas, participações dos demais corretores nem dados de sócios.
- Administração de acordos por imóvel: modelo, captador, participantes, percentuais sobre honorários da imobiliária e condições combinadas. Não há percentuais ou valores predefinidos.
- Fechamento do acordo cria comissões reconhecidas em aberto no financeiro. Honorários efetivos podem diferir da estimativa. O registro de receita da imobiliária é feito separadamente na central financeira; conferir lançamentos já existentes antes de fechar um acordo.
- Pagamento continua utilizando a baixa administrativa existente, com conta, data e histórico. Arquivar um acordo preserva a versão anterior; acordos encerrados não podem gerar novas comissões.
- Rateio em centavos com distribuição determinística do arredondamento, sem ultrapassar a participação total combinada.
- Conversas internas por imóvel usando o armazenamento operacional existente: assunto, prazo de acompanhamento, mensagens internas e autoria. Acesso acompanha a carteira atribuída e a gestão. Não envia mensagens externas. Atualização manual; não há notificações push, menções ou indicadores de leitura nesta entrega.
- Assistente Select integrado à navegação e ao fluxo de cadastro com fotos/documentos já existente. Nenhuma nova chamada de IA é feita automaticamente ao abrir as telas.

## Uso pela administração

1. Em Minhas comissões, registrar a origem da captação independentemente de valores.
2. Registrar o acordo do imóvel e as condições efetivamente combinadas. Consolidar funções da mesma pessoa em uma participação; soma máxima de 100% dos honorários.
3. O corretor passa a ver sua estimativa e as condições.
4. Após o negócio fechar, conferir duplicidades e registrar honorários efetivos, competência, previsão de pagamento e referência.
5. Registrar a receita correspondente e baixar os pagamentos na central financeira. Comissões previstas, reconhecidas e pagas são exibidas separadamente.

## Implantação

Usa as estruturas financeiras e operacionais existentes, sem nova migração SQL. Requer os módulos financeiros/operacionais previamente ativados. Arquivos de sócios, investimentos e contratos que aguardavam autorização em outro commit não estão incluídos nesta entrega.

A conexão externa com ChatGPT não está instalada. Ela exige uma entrega própria de autenticação por corretor e ferramentas MCP; nenhum botão desta entrega afirma que essa conexão existe. A IA no portal depende da configuração existente e não foi validada com dados reais de clientes nesta entrega.

## Validação

- 46 testes de domínio e HTTP: isolamento entre contas, privilégios administrativos, congelamento do acordo, rateio, fechamento, idempotência, pagamento, transferência da carteira e regressões financeiras/operacionais.
- Montagem real dos componentes React com respostas de teste: dashboard, navegação móvel, ausência da central financeira para corretores, comissões sem dados artificiais e formulário de conversa.
- Compilação TypeScript e Vite concluída.
- Sem gravações em dados de produção. Sem validação visual em aparelho físico ou configuração de ChatGPT externo.
