# Auditoria de distribuição de leads — 27/10/2026

## Escopo e evidências

Conferência somente de leitura do portal oficial, da resposta autenticada de `/api/leads`, dos links públicos dos consultores, do código do projeto e das migrações SQL. Não foram criados contatos fictícios em produção, enviados WhatsApps, alterados percentuais ou redistribuídos leads.

## Configuração observada no site oficial

| Consultor | Função | Percentual salvo | WhatsApp publicado |
| --- | --- | --- | --- |
| Douglas Maraschin | Administrador | 60% | (54) 98400-7919 |
| Fabrício Foscarini | Corretor | 40% | (54) 98103-7089 |

- Regra `weighted`, versão 2; soma de 100%.
- Ambos ativos e com primeiro acesso concluído (`must_change: false`).
- O servidor informa suporte à distribuição percentual e a administradores corretores.
- Nenhuma das contas de Mateus está selecionada nessa regra.
- Os números acima correspondem aos links `wa.me` dos perfis públicos e a `shared/team-profiles.mjs`. A auditoria não enviou mensagens nem verificou a titularidade das linhas.
- Número geral configurado para a EME: (54) 99157-8029.

## Histórico real disponível

A consulta retornou apenas um lead, recebido em 25/10/2026 às 01:44 no horário de São Paulo. Seu evento original registra `routing: round_robin`, e ele está com Fabrício. Portanto, esse registro pertence à regra anterior e não serve para medir a distribuição percentual atual. Não há amostra de novos leads recebidos com `routing: weighted`.

## Código e SQL

Revisados `shared/lead-distribution.mjs`, `shared/leads.mjs`, os adaptadores local e cloud de leads, a entrada HTTP, o painel de distribuição, a captura pública e os links de consultores.

Também foram revisadas as migrações `20261012_leads.sql`, `20261025_weighted_leads.sql`, `20261025_admin_broker_routing.sql` e o arquivo de entrega `docs/sql/ATIVAR-ADMINISTRADOR-CORRETOR.sql`.

- A seleção ponderada é progressiva: não há sorteio independente a cada contato. Com os mesmos participantes disponíveis e pesos constantes, o saldo distribui 60/40 ao longo das entradas.
- A configuração é bloqueada durante a transação SQL para serializar entradas simultâneas.
- Solicitações repetidas e contatos duplicados elegíveis para reutilização mantêm o atendimento original, sem consumir uma nova vez da fila.
- Somente participantes selecionados, ativos e com primeiro acesso concluído recebem entradas ponderadas. Administradores podem participar sem perder sua função.
- Indisponibilidade de um participante muda a distribuição entre os disponíveis. Sem participante disponível, o lead fica na gestão.
- A regra não redistribui contatos existentes. Alterar e salvar a regra reinicia o saldo da distribuição.
- O arquivo de entrega atual substitui as funções completas e evita a antiga alteração por substituição textual de trechos SQL.

### Validação executada

`node --test tests/weighted-leads.test.mjs tests/leads.test.mjs tests/leads-cloud.test.mjs`

Resultado: **8 testes aprovados, 0 falhas**. As migrações foram executadas em PostgreSQL de teste via PGlite. A cobertura inclui 100 entradas com divisão 60/40 entre administrador e corretor, concorrência, repetição, elegibilidade, permissões, isolamento dos corretores e reexecução do SQL sem modificar os registros existentes.

Limite da evidência: o portal permite verificar a configuração e os eventos reais, mas não expõe o corpo das funções instaladas no Supabase. O SQL do projeto foi executado e validado em teste; não houve inspeção direta da definição atual da função no banco de produção nem entradas ponderadas reais disponíveis para confirmar seu resultado em produção.

## Alcance dos percentuais e WhatsApp

O site está configurado com `consultantDisplay.mode: team`. O contato principal do imóvel passa pelo formulário de leads e pela regra de distribuição.

Já os links de WhatsApp nos perfis individuais de Douglas e Fabrício abrem diretamente o respectivo número e não passam pelo rodízio. A opção de continuar no WhatsApp após o formulário abre o número geral da EME; ela não alterna o destino conforme o responsável atribuído ao lead.

Consequentemente, os percentuais governam a atribuição dos novos leads registrados pelo formulário. Eles não representam a divisão de todas as conversas recebidas diretamente por WhatsApp. A entrada automática de conversas do WhatsApp no funil ainda depende da integração desse canal.
