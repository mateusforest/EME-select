# Desempenho do site

Administração: `/acesso-select/equipe/desempenho`. GET `/api/analytics?days=7|30|90` exige administrador ativo com sessão válida. O site público envia lotes de até 20 eventos para POST `/api/public/analytics`; nenhum dado privado é retornado pelo coletor.

- Páginas vistas e cliques são eventos diferentes. Um clique no WhatsApp/chat/formulário não é contado como lead. Leads vêm de `eme_leads` / `leads`, com data de criação e situação atual.
- Somente categorias fixas e UUIDs de imóveis públicos são aceitos. Nenhum texto de busca, mensagem, contato, URL completo ou dado de conta integra as métricas.
- Sessões por aba, 30 minutos sem eventos; referência transformada diariamente no servidor. Os totais representam sessões diárias medidas, não pessoas únicas.
- Respeita DNT, GPC e a escolha no rodapé. Agentes identificados como bots são ignorados. Sem coleta retroativa.
- Fuso America/Sao_Paulo. Janela de 90 dias; limpeza dos registros antigos quando a coleta recebe novos dados. Bloqueadores, indisponibilidade e limites podem reduzir cobertura.

## Persistência

Produção usa registros privados `eme_cases`, `data.kind=site_analytics`, excluídos dos feeds e operações de imóveis por `internalKinds` e `propertyRecordsQuery`. Acesso direto às tabelas continua revogado a anon/authenticated. Somente o servidor escreve. Não precisa de chave de analytics ou migração externa.

16 fragmentos por dia reduzem contenção; escrita otimista por versão com até 5 tentativas. Os 600 IDs de eventos recentes por fragmento evitam repetição imediata de lotes. Limites por fragmento: 1.000 referências de sessão e 100 imóveis (títulos limitados a 120 caracteres). Se atingidos, o painel sinaliza que dimensões podem estar incompletas. Lotes públicos têm limite de taxa por origem e global. O relatório consulta somente projeções agregadas, sem referências de sessão ou recibos.

Local usa tabela SQLite `site_analytics`. Fixtures em `tmp/` são somente para testes e não fazem parte da publicação.

## Validação

`node --test tests/analytics.test.mjs tests/analytics-local.test.mjs tests/leads.test.mjs tests/leads-cloud.test.mjs tests/portal-api.test.mjs tests/select-access.test.mjs tests/unified-access.test.mjs`

`npm run build`

Conferir navegador em desktop e 390px, períodos, estado vazio, tabelas, clique entre páginas públicas e leitura no painel. Dados de teste nunca são enviados ao coletor de produção.
