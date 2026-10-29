# M Switch — preparação do lançamento, 29/10/2026

## Estado verificado

- Repositório `mateusforest/EME-select`, PR #2, branch `feat/m-switch-matching-v1`; ponto de partida `cce3897e3ed616932506937ddda557ae30a43303`. PR aberta, rascunho, sem merge na inspeção.
- Supabase conectado nesta sessão. Projeto existente **emeselect**, ref **vjoajqrwqdeujqaognac**, região `us-west-2`, estado informado `ACTIVE_HEALTHY`.
- Consulta somente ao catálogo: `public.eme_profiles` existe, com `id uuid`, `role text`, `active boolean`, `must_change boolean` e RLS ativa. **Nenhuma tabela `eme_switch_*` existe no projeto consultado.**
- A conexão retornou zero branches de desenvolvimento e zero entradas no histórico de migrações. Isso não significa banco vazio: o esquema M Select já existe e pode ter sido aplicado pelo SQL Editor. Não executar todas as migrações antigas do repositório.
- Nenhum projeto, banco remoto ou branch Supabase foi criado. Nenhuma migração foi aplicada no projeto ativo, nenhum deploy de produção e nenhum envio real foi executado.
- O teste local de primeiro negócio usa pessoas e referências sintéticas. Não demonstra cliente captado, contrato real, venda ou receita.

## Reutilizar o M Select sem interferir na operação

`server/cloud/client.mjs` usa a conexão já existente, via REST/RPC. A API autentica e valida papel/atribuição antes de operar com a chave de servidor; o navegador não fala diretamente com as tabelas Switch. Manter o mesmo projeto e Auth.

O isolamento é por tabelas `public.eme_switch_*`, grants restritos e RLS com negação por padrão para `anon`/`authenticated`. São oito tabelas: requests, events, partner_offers, deal_invites, deal_audit, professionals, outbox e consent_events. O único vínculo externo é com `eme_profiles`; não se alteram leads, estoque, financeiro, Auth ou buckets existentes. A trilha de consentimento armazena somente identificador interno, finalidades, versão, origem e data, sem duplicar nome/telefone.

`service_role` ignora RLS por definição: a restrição de administradores e corretores continua sendo responsabilidade da API. A conexão ativa confirmou `rolbypassrls=true` para esse papel e `false` para os papéis públicos. RLS não protege contra vazamento da chave administrativa. A tabela de consentimentos concede apenas leitura ao serviço; gravações são feitas por trigger de escopo restrito. [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Arquivos para revisão:

1. `supabase/migrations/20261028_switch_pilot.sql`: sete tabelas originais.
2. `supabase/migrations/20261029_switch_launch_evidence.sql`: extensão aditiva, oitava tabela, comprovantes, auditoria de consentimento e guarda de etapas.
3. `docs/sql/ATIVAR-M-SWITCH.sql`: pacote gerado das duas migrações, em uma única transação com timeout. Alternativa para aplicação manual controlada; não aplicar também as migrações separadamente como se fossem alterações diferentes.
4. `docs/sql/VERIFICAR-M-SWITCH.sql`: inspeção somente de leitura, sem dados de clientes.

Não há `DROP TABLE`, exclusão de registros ou alteração de permissões globais. A substituição de triggers/funções afeta apenas objetos M Switch. Versão de consentimento e referência de comprovantes antigas permanecem desconhecidas (`NULL`), sem inventar aceites retroativos. O pacote SQL não é um comparador completo de drift: se surgirem objetos Switch antes da aplicação, comparar suas colunas, tipos, constraints e grants antes de prosseguir.

## Verificação e aplicação posterior

Hoje os testes executam PostgreSQL embarcado em memória (PGlite), sem conexão de rede. Não equivalem a homologação de Supabase Auth, PostgREST, credenciais, rede ou RLS no projeto hospedado.

```sh
npm run test:switch
npm run test:switch:dry-run
npm run build
npx playwright test --config playwright.switch.config.ts
node scripts/switch-migration-bundle.mjs
```

O dry-run instala o SQL real, testa restrições como `anon`, `authenticated` e `service_role`, preserva uma tabela sentinela M Select, verifica negação de acesso mesmo com grant acidental, aplica a extensão novamente e percorre o primeiro negócio sem provedor externo.

Antes da aplicação no projeto ativo: obter autorização específica para a alteração do banco, conferir backup/restauração e ref `vjoajqrwqdeujqaognac`, revisar o preflight e então aplicar somente o pacote Switch. Sem branch de homologação existente, não criar uma automaticamente: isso provisionaria outro banco e pode ter custo. Se a aplicação falhar, a transação deve reverter; não usar reset nem tentar apagar tabelas. Depois, repetir o preflight, executar testes sintéticos autorizados pela API e conferir logs/advisories. Para recuar após uso, desabilitar o módulo e os envios, preservando a auditoria; não oferecer rollback destrutivo como rotina.

O endpoint administrativo `/api/switch/readiness` agora verifica as oito tabelas e colunas novas. Sucesso com chave de serviço comprova acesso técnico, **não** isolamento RLS, aprovação comercial ou aprovação Meta. `rlsVerified=false` deixa esse limite explícito.

## Consentimento e primeiro negócio

As páginas de solicitações e profissionais enviam `consentVersion=2026-10-29.1`; API rejeita versão ausente/desatualizada. O texto vem de `shared/switch-consent.mjs`, preservado no Git. Os checkboxes começam desmarcados. Autorização de resposta e avisos de oportunidades são distintas; avisos de compradores/proprietários continuam opcionais. O servidor registra data/versão; a trigger registra captura e mudanças de preferências na mesma transação. Repetir uma inscrição não reativa profissional que cancelou avisos. Esse registro prova o formulário recebido, não a titularidade do telefone; confirmar identidade/contato durante a qualificação.

Roteiro comercial verificável, após liberação de lançamento:

1. Receber interesse voluntário, registrar origem e consentimentos; sem importar listas de terceiros.
2. Conferir intenção, orçamento e forma de pagamento do comprador; para investidor, conferência financeira. Não chamar declaração de crédito aprovado.
3. Conferir titularidade/autorização do imóvel, disponibilidade, mínimo e condições do parceiro. Registrar referências dos documentos na nota interna, em armazenamento privado já autorizado.
4. Preparar correspondência e condições de comissão. Teaser não revela contato, endereço ou identidade das partes. Match não é venda.
5. Conferir CRECI e acordo assinado. Antes da introdução, a API consulta novamente as duas fichas: demanda qualificada, autorizações, preço, cidade/tipo e disponibilidade recente da oferta parceira.
6. Fechamento exige valor real e referência do documento (8–160 caracteres). Recebimento exige participação integral calculada e referência do comprovante (8–160). Registro parcial continua fora do fluxo atual e exige conciliação específica. Referências são declarações da gestão: não há leitura automática de contratos nem verificação bancária.
7. Só registrar caixa depois de conferência humana do recebimento; nenhuma integração automática com financeiro/PIX foi adicionada.

Revogação de avisos profissionais continua pelo link privado e pelo `SAIR` no webhook Meta existente. Avisos opcionais de solicitantes ainda não têm remetente automático implementado; solicitações de cancelamento são tratadas pelo atendimento. Não liberar campanhas desse público sem fluxo operacional de supressão homologado. Aceite de convite continua separado de inscrição para novos alertas.

## WhatsApp: o que muda com QR Code

| Opção | Conexão e manutenção | Limitações e decisão para M Switch |
|---|---|---|
| WhatsApp Business/Web oficial, atendimento humano | Operador vincula o computador pelo celular/QR e atende manualmente | Caminho de piloto sem desenvolver integração Meta. Não fornece ao backend uma API de envio nem confirmações automáticas. Mesmo assim exige contato autorizado e registro humano do atendimento. |
| Evolution API em modo Baileys | Serviço REST próprio, sessão Web vinculada por QR, processo persistente, armazenamento de sessão, controles de acesso | Simplifica a camada HTTP, mas herda as limitações do protocolo Web não oficial. Não transforma Baileys em integração autorizada da Meta. Avaliar apenas experimento separado, sem conectar o número principal nesta etapa. |
| Baileys direto | Biblioteca Node/WebSocket; aplicação precisa gerir credenciais, reconexões, filas e eventos | Maior esforço de operação e manutenção. Sessão revogada exige novo pareamento; reinícios sem persistência perdem credenciais. Não funciona como processo persistente dentro de uma função Vercel comum. |
| WhatsApp Business Platform / Cloud API | Número empresarial, conta/app, token, webhook assinado e modelos aprovados | Já é o caminho implementado no código. Adequado para automação comercial sustentada; não dispensa consentimento, limites, acompanhamento de qualidade e atendimento humano. |

Evolution oferece tanto modo Web/Baileys quanto Cloud API oficial: é preciso especificar o modo ao comparar. Seu projeto exige infraestrutura própria e banco para o serviço. **Não executar as migrações Prisma da Evolution no `public` do M Select.** Nenhuma infraestrutura Evolution foi provisionada. [Repositório mantido pela Evolution Foundation](https://github.com/evolution-foundation/evolution-api).

Baileys declara não ter vínculo/autorização oficial do WhatsApp. Sua documentação exige persistir credenciais/chaves e tratar reconexões; QR não é um token permanente de API. Atualizações do protocolo, sessão revogada e falhas de armazenamento podem interromper a operação. Não se deve publicar QR, credenciais de sessão ou chaves nos logs. [Baileys](https://github.com/WhiskeySockets/Baileys/blob/master/README.md), [conexão e credenciais](https://github.com/WhiskeySockets/baileys.wiki-site/blob/main/docs/socket/connecting.md).

O próprio WhatsApp informa que dispositivos vinculados podem sair se o telefone principal não for usado por mais de 14 dias. Isso não prevê todas as causas de queda de uma biblioteca não oficial. [Dispositivos vinculados](https://faq.whatsapp.com/378279804439436/).

Não há taxa de banimento confiável para prometer. Opt-in e volume baixo não eliminam o risco de suspensão por uso não autorizado. Não há configuração, intervalo artificial ou troca de número que possa ser apresentada como garantia de proteção. A ajuda oficial alerta para banimento associado a mensagens automáticas/em massa não permitidas e clientes modificados. [Uso responsável](https://faq.whatsapp.com/361005896189245/).

Na plataforma oficial, conversas iniciadas pela empresa exigem modelos aprovados; respostas livres dependem da janela de atendimento de 24 horas. A política exige autorização para contato e respeito ao cancelamento em qualquer canal. [Política de mensagens WhatsApp Business](https://business.whatsapp.com/policy).

**Recomendação técnica:** piloto com captação opt-in e atendimento humano no app oficial; manter Cloud API como caminho de automação. Se o responsável escolher experimentar QR não oficial após entender o risco, isolar o serviço e sua sessão, com autenticação, armazenamento seguro, fila deduplicada, pausa em desconexão, webhooks autenticados, supressão de opt-out e teste com contato interno autorizado. Não fazer fallback automático de Meta para Baileys: pode duplicar mensagens e trocar o canal sem ciência da operação. Nenhum adaptador Evolution/Baileys ou pareamento real foi ativado nesta entrega.

## Conexões e ações que ainda dependem do responsável

- **Supabase:** conexão do plugin confirmada; não precisa criar projeto. A ref do projeto está verificada. Acesso SQL pelo plugin não confirma que Vercel tem as variáveis corretas. Conferir no gerenciador de segredos existente `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` **ou** `SUPABASE_SECRET_KEY`, e `VITE_SUPABASE_PUBLISHABLE_KEY` do mesmo projeto. Não colar segredos no chat nem versionar `.env`.
- **Homologação:** falta autorização para aplicar SQL no projeto ativo e validar API com sessão administrativa real. O fluxo local não migrou nem consultou dados de clientes.
- **QR manual:** responsável usa o próprio celular em Dispositivos conectados e lê o QR na interface oficial. Isso concede acesso ao dispositivo; não pedir foto do QR ou códigos de verificação no chat. Pareamento não foi realizado.
- **Meta para automação:** conferir `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, token, `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, versão Graph suportada e modelo `SWITCH_WHATSAPP_TEMPLATE` em `pt_BR` com três parâmetros. Configurar webhook HTTPS e verificar assinatura, `SAIR` e status de entrega com contato interno autorizado. Não assumir que essas credenciais existem porque o código as referencia.
- **Segredos Switch:** `SWITCH_INVITE_SECRET` com pelo menos 32 caracteres e `CRON_SECRET` com pelo menos 20. Gerar/guardar no ambiente seguro; não usar prefixo `VITE_`. Manter `SWITCH_WHATSAPP_ENABLED=false` e `SWITCH_AUTOPILOT_ENABLED=false` até autorizações separadas para envios e operação.
- **Comercial:** responsável habilitado confere autorizações, CRECI e instrumentos aplicáveis. Este pacote não atesta regularidade jurídica, aprovação de contratos, venda ou faturamento.

## Limites conhecidos

O teste local substitui o transporte REST por um adaptador SQL e simula o provedor. A rechecagem da introdução ocorre antes da atualização e não é um bloqueio transacional das duas fichas; reconfirmar as condições antes da apresentação humana. A captura de formulário não verifica posse do número. O fluxo de convite e o webhook existentes precisam de homologação hospedada. `submitted` significa aceito pela API de envio, não entregue/lido. O SQL de consentimento não deve ser apresentado como prova de recebimento de mensagem.

## Validação concluída nesta revisão

- 66 testes de domínio/API/SQL passaram localmente, incluindo 6 verificações do dry-run.
- 5 testes Playwright Chromium passaram: comprador, consentimento profissional, formulário móvel, convite e cancelamento. APIs de interface interceptadas, sem chamadas reais.
- TypeScript e build Vite passaram; o build mantém aviso de chunks grandes já presente na aplicação.
- Pacote SQL gerado/verificado; preflight testado antes e depois da instalação local.
- SQL remoto limitado à inspeção do catálogo; homologação do banco hospedado e das credenciais do aplicativo continua pendente.
