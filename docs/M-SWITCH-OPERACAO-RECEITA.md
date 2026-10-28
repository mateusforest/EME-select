# M Switch · Plano operacional para faturar com equipe enxuta
Data: 28/10/2026 · STATUS: proposta operacional. Funcionalidades novas desta branch não estão em produção.

## Princípio
Uma operação de corretagem regulamentada apoiada por software, e não software sem operação. Objetivo de produto: automatizar *entrada, qualificação, encaminhamento, matching, tarefas e comunicação consentida*, deixando para corretores habilitados avaliação, autorização, visitas e fechamento.

## Fluxo de ponta a ponta
1. **Aquisição**: canais próprios (SEO, indicações, redes, landing `/switch`), links de parceiros e contratos de compartilhamento de carteiras; rastrear origem, campanha, cidade, custo e permissão.
2. **Entrada**: quatro modalidades `sell,swap,buy,invest`. A página pública recebe dados com autorização para resposta e opt-in opcional de alertas, gravando na M Select com chave idempotente.
3. **Qualificação**: informações básicas de cidade/tipo/orçamento. Rascunhos estruturados por IA no futuro; consentimento e documentação nunca são inferidos por IA. Ficha de imóvel só fica qualificada após revisão do responsável, autorização de compartilhamento e valor mínimo confirmado. Investidor exige checagem humana de capacidade.
4. **Oferta massiva**: administrativo recebe CSV de construtoras e imobiliárias **autorizadas** (até 1.000 no frontend, 100 por chamada) e atualiza por parceiro e referência. Módulo aceita marcação de indisponibilidade. Próxima etapa: feed remoto permitido por contrato, com URL/credenciais do parceiro, checagem, agendamento e proteção contra SSRF. Não coletar imóveis da OLX/ZAP/VivaReal sem licença de uso.
5. **Matching**: motor filtra qualificados pelo endereço aproximado (cidade), tipo e preço. Gera candidato *nunca oferta*. Uma transação de permuta de três lados exige revisão documental e aceite de todas as partes; score é apenas prioridade operacional.
6. **Contato**: mensagem automática só após consentimento, modelo aprovado, horário adequado, deduplicação e canal operacional. Primeiro implantar fila de mensagens e opt-out; roteamento para humano em respostas complexas.
7. **Negociação/contrato**: um corretor habilitado assume, confirma preço/disponibilidade, estrutura minuta jurídica, visitas, responsabilidades e comissão. Instrumentos assinados pelos envolvidos.
8. **Pós-venda**: resultado pago, receita líquida, origem do negócio e indicação para novos compradores. Solicitar indicação com permissão, não exportar contatos pessoais sem autorização.

## Aquisição sem contratar um exército de corretores
- **Parceiros de oferta**: 3 incorporadoras + 3 imobiliárias/corretores com estoque e autorização; importação em lote, sem exclusividade fictícia. Remuneração e titularidade de leads em contrato.
- **Compradores orgânicos**: landing `/switch?utm_source=...` distribuída por parceiros, perfil Google da própria operação se elegível, páginas locais úteis, posts de troca/upgrade e link de indicação em anúncios autorizados. Não comprar listas telefônicas.
- **Investidores**: lista própria com cadastramento voluntário e preferências/consentimento específicos; classificação por cidade/tipo/orçamento. Nunca prometer deságio ou retorno sem avaliação.
- **Estratégia geográfica**: validar densidade em Vacaria e municípios próximos; só expandir para Caxias/Serra e litoral quando houver oferta e demanda suficientes para matches reais.

## Automações priorizadas

| Prioridade | Gatilho | O que a máquina executa | Barreira obrigatória | Estado |
| --- | --- | --- | --- | --- |
| P0 | Envio no site | Valida, registra consentimento/origem, deduplica, cria ficha | Sem mensagem a terceiros | Implementado na branch |
| P0 | Reimportar CSV parceiro | Atualiza até 100 ofertas por lote usando referência estável | Parceria/autorização escrita, acesso de admin | Implementado na branch |
| P0 | Abertura do painel administrativo | Recalcula matches de compradores, upgrades e investidores | Imóveis/contatos qualificados, não oferta | Implementado na branch |
| P1 | Nova entrada/alteração de disponibilidade | Agenda recomputação e tarefa na fila interna, registra motivo/validade | RLS, limites e logs | Não implementado |
| P1 | Mensagem inbound WhatsApp oficial | Qualifica, responde perguntas, encaminha humano e registra histórico | Janela de 24 h, termos e consentimento | Não implementado |
| P1 | Match aprovado | Notificação individual com imóvel verificado | Opt-in para novidades + modelo aprovado | Não implementado |
| P2 | Resposta de e-mail | Vincula à ficha e agenda revisão | SPF/DKIM, autorização e segurança do remetente | Não implementado |
| P2 | Chamada telefônica recebida | URA/assistente atende, extrai perfil e oferece transferência | Aviso sobre gravação, privacidade e suporte humano | Não implementado |
| P2 | Feed remoto de parceiro | Atualização agendada, reconciliação de remoções e mudanças de preço | Contrato de uso, host allowlist e token | Não implementado |

### Ferramentas
- Frontend React e portal M Select existente; Supabase para persistência, políticas RLS e auditoria; Vercel para API.
- Canal prioritário: WhatsApp Business Platform oficial e webhook, não sessão não oficial QR para operação crítica. Regras de templates, janela de 24 h e handoff: https://whatsappbusiness.com/pt-br/policy/
- E-mail: provedor transacional com API/webhook e DNS autenticado. Nada será enviado sem chave, confirmação de domínio, autorização e fila.
- Telefone: configurar posteriormente um número empresarial com SIP/CPaaS; primeiro tornar mensagem e captação mais eficientes.
- XML: integrações de **publicação outbound** OLX/Grupo ZAP são documentadas em https://developers.grupozap.com/feeds/integration.html ; isso NÃO autoriza importar o estoque de terceiros para uso próprio.

## Meta e medição
Fase piloto de 14 dias: 5 parceiros convidados com autorização, 2 carteiras importadas, 30 compradores/proprietários voluntários, pelo menos 10 oportunidades revisadas. São metas operacionais, **não promessas**.
Contar entrada válida, perfil qualificado, time-to-first-response, % de disponibilidade confirmada, correspondências úteis, propostas, imóveis vendidos, comissão recebida, custo variável por lead e margem líquida por operação.
Para primeira monetização, o caminho mais curto é captar **demanda com orçamento e prazo definidos** e casar com estoque de parceiros aptos a negociar, com comissão pactuada desde o início.
Uma transação de R$ 500.000 a 5% = R$ 25.000 **brutos**; descontar participações, impostos, despesas e eventuais reembolsos. O prazo de fechamento pode se estender por meses, mesmo com boa tecnologia.

## Habilitação responsável
- A intermediação depende de pessoa física ou jurídica inscrita no CRECI; não é possível substituir responsabilidades profissionais por agente de IA. Lei nº 6.530/78 (https://www2.camara.leg.br/legin/fed/lei/1970-1979/lei-6530-12-maio-1978-365766-normaatualizada-pl.html).
- O imóvel anunciado requer autorização escrita quando aplicável; o vínculo da M Select com o corretor/representante deve ser revisado juridicamente.
- LGPD: tratar dados só para finalidade informada, controle de acesso, atendimento aos direitos do titular, retenção definida, auditabilidade e opt-out. Privacidade e marketing devem ter regras distintas.
- Em produção, **ainda falta** aplicar a migração Supabase, testar formulários contra o banco e confirmar os fluxos com dados sintéticos antes do primeiro cliente.

## Evolução V2 — intermediação condicionada e ofertas automáticas (28/10/2026)

### Modelo comercial: primeiro as condições, depois o contato

Exemplo **hipotético**, não uma tabela de preços obrigatória: imóvel de R$ 600 mil, corretagem contratada de 5% = R$ 30 mil brutos. Proposta de dividir 30% da corretagem com a operação M Switch = R$ 9 mil **antes de custos/impostos**; os outros R$ 21 mil caberiam ao parceiro, conforme os contratos e participantes habilitados. A plataforma não deve declarar a comissão "ganha" antes da conclusão e do recebimento real.

A apresentação é uma mensagem com **teaser sem dados pessoais**: cidade, tipo, preço de referência e divisão da corretagem. O profissional opt-in vê as condições, informa CRECI, manifesta ciência e aguarda a conferência da equipe. Não aparecem nome, telefone, contato do proprietário/comprador ou link original. Um aceite do formulário **não equivale** à assinatura contratual.

O fluxo do deal usa `prepared → acknowledged → contracted → introduced → closed → paid` (cancelamento possível). O operador só autoriza a introdução após conferir CRECI e referência a contrato assinado. A simulação de honorários é atualizada por valores efetivos após a venda. A operação jurídica deve confirmar o compartilhamento de corretagem e os instrumentos apropriados antes de usar remuneração percentual.

### Rede opt-in sem pedir parceria porta a porta

O formulário público `/switch/profissionais` recebe nome, CRECI informado, cidade, especialidade e autorização expressa para mensagens da M Select. A administração confere a inscrição profissional antes de habilitar convites. Não há compra, importação nem disparo para números de terceiros sem autorização.

O destinatário recebe link `/switch/convite/:token` e pode registrar interesse e conhecer as condições. Para cancelar mensagens, há `/switch/sair/:token` e também a palavra **SAIR** pelo canal oficial, processada a partir do webhook autenticado por assinatura da Meta.

### Automação comercial com limites e verificações

A função `attachSwitchAutopilot` cruza **demanda qualificada** com **estoque autorizado de parceiros atualizado nos últimos 7 dias**, seleciona um profissional cadastrado/verificado com opt-in e prepara convite privado com remuneração estimada. Configurada e ativada, cria até **3 novos convites por execução**, no máximo **1 por profissional nas últimas 24 horas**, sem duplicar pares de oferta/demanda.

Condições automáticas vêm das variáveis privadas `SWITCH_DEFAULT_BROKERAGE_BPS` e `SWITCH_DEFAULT_SHARE_BPS`; **não** são aplicadas sem `SWITCH_AUTOPILOT_ENABLED=true`, chave privada e configuração Meta. Não gera contrato nem revela identidade das partes; apenas uma oportunidade preliminar com condições. O matching automático não atribui certeza de venda nem aprova crédito.

A rotina `GET /api/switch/cron` exige `Authorization: Bearer CRON_SECRET`. A Vercel foi configurada para execução diária às 12h UTC (9h em Brasília) para ser compatível inclusive com Hobby. O portal permite execução administrativa autenticada em `POST /api/switch/autopilot/run`. Convites gerados manualmente para profissionais aprovados também tentam envio imediato quando a Meta está pronta. Uma chamada de envio aceita pela Meta significa *submetida*, não entregue.

### Envios e controles

Mensagens saem exclusivamente por WhatsApp Business Platform oficial **quando configurado**. Exige credenciais do número e conta, `SWITCH_INVITE_SECRET` seguro (>=32 chars), `CRON_SECRET`, `SWITCH_WHATSAPP_TEMPLATE` previamente aprovado na Meta (pt_BR, 3 variáveis: cidade, link de condições, link de cancelamento), `SWITCH_WHATSAPP_ENABLED=true`. O padrão é **desligado**. Não use QR code não oficial em produção crítica.

A fila `eme_switch_outbox` deduplica por convite/profissional, exige opt-in e elegibilidade no momento de cada envio, registra `pending/sending/submitted/failed/skipped` e não reenvia automaticamente erros ambíguos. O painel exibe contagens; confirmação de entrega por status do provedor ainda não foi implementada. O opt-out bloqueia novas notificações mesmo após fila criada.

### Operação financeira e requisitos antes de vender

1. Registrar a habilitação CRECI da estrutura jurídica, a autorização de mediação e política de comissões assinada por quem participa.
2. Revisar/aplicar o arquivo `docs/sql/ATIVAR-M-SWITCH.sql` no ambiente Supabase correto e confirmar segurança/RLS por perfil.
3. Testar com dados sintéticos em preview: cadastro comprador/profissional, verificação CRECI, importação de estoque, encontro de demanda, convite, ciência, contrato, introdução, venda, recebimento, opt-out e não duplicação.
4. Configurar domínio e credenciais oficiais do WhatsApp, aprovar o template, confirmar envio em ambiente controlado e só então ativar `SWITCH_WHATSAPP_ENABLED`.
5. Em seguida definir a tabela comercial/participação em contrato e ativar `SWITCH_AUTOPILOT_ENABLED` (opcional). Nunca marcar vendas/receitas como reais automaticamente.
6. Criar distribuição orgânica do formulário: indicação comercial por clientes/empreendimentos, redes sociais e presença regional. O software **não gera demanda sozinho sem aquisição**.

**Não implementado:** integrações de telefone, e-mail automático, feeds remotos agendados, contratos assinados no próprio portal, pagamento/boleto automático, conciliação financeira ou entrega automática de telefone e dados de comprador. Essas ações dependem de provedores, regras e segurança adicionais.

**Qualidade:** `npm run test:switch` cobre testes de cálculo, consentimento, empresa, tokens, API, banco (PGlite), remetente Meta falso e autopiloto; `npm run build` no CI. A validação de build não comprova integração real com Meta nem Supabase de produção.
