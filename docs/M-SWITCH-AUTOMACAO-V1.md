# M Switch — operação automatizada dentro da M Select (proposta técnica V1)

**Estado:** arquitetura proposta; núcleo de correspondência preliminar implementado nesta branch. **Não implantado em produção, não conectado a leads reais, sem envios de mensagens.**

## Objetivo

Fazer o cliente entrar, informar o imóvel que tem, o imóvel ou valor que procura e o que aceita negociar. A plataforma identifica oportunidades, pede a informação que falta, cria tarefas para corretores e acompanha negociações. Humanos decidem avaliação, documentação, condições e fechamento. **M Switch não é outra empresa nem outro SaaS**: é uma vertical da M Select.

## Evidência do projeto que já podemos reaproveitar

Conferido no repositório `mateusforest/EME-select` (outubro/2026):
- `src/portal/LeadsWorkspace.tsx`, `server/cloud/leads.mjs` e `shared/leads.mjs`: captação de leads, atribuição e status.
- `src/portal/BuyerWorkspace.tsx`, `shared/buyer-qualification.mjs`, `server/buyer-ai.mjs`: qualificação de compradores por IA **com revisão** e correspondência de catálogo já existente.
- `src/portal/CaptureAssistant.tsx`: apoio à captação.
- `src/portal/OperationsWorkspace.tsx`, `shared/operations.mjs`: tarefas, visitas e acompanhamento operacional.
- `src/portal/ProposalsWorkspace.tsx`: propostas imobiliárias.
- `src/portal/WhatsAppSetup.tsx`, `server/cloud/whatsapp.mjs`: base para eventos do WhatsApp. **Canal não comprovado em produção.**
- Supabase/Vercel: base existente, sem exigir n8n, servidor próprio ou outro banco no início.
- A auditoria de leads 27/10/2026 observa que o WhatsApp direto ainda não entra automaticamente no funil; portanto não presumir que isso já funcione.

**Não** modificar a distribuição atual de leads, o inventário público ou as regras de acesso ao criar a vertical.

## Funil de aquisição e automação

| Entrada | Captura | Automação | Ponto humano |
| --- | --- | --- | --- |
| Proprietário quer trocar | Página pública `/switch/trocar` com tipo, cidade, fotos, faixa desejada, prazo e contato | Deduplicação, extração por IA, checklist e combinação com imóveis de destino | Validar autorização, titularidade, matrícula, ônus e preço |
| Proprietário precisa vender | `/switch/vender` com prazo e mínimo indicativo | Triagem de liquidez e cruzamento com investidores autorizados | Avaliar imóvel e confirmar limites comerciais |
| Investidor procura oportunidades | `/switch/investir` com cidades, tipos, faixa, objetivos e opt-in | Perfil estruturado, cruzamento e fila interna de candidatos | Confirmar recursos, origem lícita de recursos quando exigido e intenção |
| Construtora/incorporadora | Portal parceiro com estoque e critérios de aceite | Atualizar estoque com fonte, data, permissão e mapeamento de trocas | Homologar parceiro e aprovar negociações |
| Corretor parceiro | Formulário/link identificado com imóvel e cliente | Atribuição, SLA e regras de remuneração contratadas | Conferência do responsável e CRECI |
| Campanha/redes sociais | Link rastreável para formulário ou atendimento com origem | Identificar origem, contar interesse qualificado e testar conversão | Produção e aprovação da campanha |

Entrada automática de imóveis de portais externos: **somente por API/feed licenciado, autorização do anunciante ou compartilhamento por parceiro**. Não presumir permissão de scraping ou autorização para reutilizar fotos, textos ou dados pessoais.

## Eventos operacionais

1. `switch.lead.created`: validar entrada, deduplicar por telefone e identidade confirmada, preservar origem e consentimentos.
2. `switch.profile.qualified`: normalizar localização, tipo, preço e prazo; registrar lacunas; não inventar fatos.
3. `switch.asset.reviewed`: revisão de cadastro, propriedade e autorização de compartilhamento.
4. `switch.investor.verified`: registrar disponibilidade declarada e resultado de conferência humana, sem publicar valores pessoais.
5. `switch.match.created`: algoritmo determinístico gera **candidato**, justificativas e pendências. Alertas internos podem ser automáticos.
6. `switch.match.approved`: corretor habilitado decide se deve apresentar o imóvel. Verificar consentimento atualizado do destinatário.
7. `switch.offer.proposed`: proposta sujeita à concordância das partes; nada de aceite automático.
8. `switch.deal.closed`: registrar contrato, comissão efetiva, custos e resultado comercial.

Cada evento deve ter `event_id`, `source`, `occurred_at` e chave de idempotência, com logs e retentativas seguras. Mudança de preço ou disponibilidade invalida correspondências ainda não revisadas. Ao cancelar consentimento, suspender automaticamente os envios.

## Modelo de dados V1 sugerido (tabelas novas, sem alteração de produção nesta PR)

- `switch_requests`: tipo [swap, sell, upgrade], lead_id, property_id opcional, faixa, urgência, status, origem, owner_id.
- `switch_assets`: vínculo com imóvel M Select ou referência externa autorizada, avaliação declarada e revisada separadas, ônus conhecidos, situação documental, autorização e validade.
- `switch_investor_profiles`: perfil, cidades, tipos, orçamento máximo declarado, critérios, consentimento, status de verificação. Financeiro detalhado em área restrita.
- `switch_developer_inventory`: parceiro, imóvel, disponibilidade, critérios de permuta, data da última verificação.
- `switch_matches`: pares, pontuação, justificativas, pendências, versão de dados, estado de revisão, corretor responsável.
- `switch_deals`: pipeline da proposta, valor declarado/negociado, participantes autorizados e vínculo a documento contratual.
- `switch_events` e `switch_outbox`: histórico, fila de avisos, consentimento vigente, deduplicação, entrega, falha e reenvio.

Autorização no servidor e políticas RLS por corretor/empresa; anexos privados. Não expor dados do investidor para proprietário antes de autorização. Estabelecer retenção e eliminação conforme a política de privacidade e a LGPD.

## Implementação entregue nesta branch — piloto funcional para revisão

**Frontend público:**
- `/switch` (via `src/main.tsx` e `vercel.json`) com formulário responsivo para troca, venda e investimento.
- Consentimento para responder à solicitação separado da autorização opcional para alertas; nota de privacidade e aviso de não garantia.
- Link na seção de proprietários do site M Select. Origem UTM opcional, `requestId` idempotente e estado de sucesso/erro.

**API de produção (Supabase/Vercel):**
- `POST /api/public/switch`: validação de entrada, limites por IP/global, deduplicação por identificador de envio, persistência **sem acesso público de leitura**.
- `GET /api/switch`: carteira de solicitações privada; administrador acessa as entradas gerais e corretor acessa apenas as atribuídas.
- `PATCH /api/switch/:id`: gestão de etapa, responsável e conferências documentais e financeiras reservadas a administradores, versão otimista.
- `GET /api/switch/matches`: combinações de investidor/ativo e destinos de upgrade (somente gestão); nenhum envio a terceiros, oferta automática ou avaliação de crédito.

**Banco:** `supabase/migrations/20261028_switch_pilot.sql` com RLS, privilégios exclusivos do servidor, restrições e histórico via trigger. Cópia de ativação `docs/sql/ATIVAR-M-SWITCH.sql`.

**Portal:** nova área `M Switch` em `/acesso-select/equipe/switch`, fichas, filtros, atribuição, avanço de etapas e candidatos de correspondência carregados automaticamente. Corretores só veem seus registros.

**Núcleo:** `shared/switch-matching.mjs`, `shared/switch-intake.mjs`, `shared/switch-trades.mjs`.

**Teste:** `npm run test:switch`; cenários com `node:test` para permissões, entrada, matching, revisão e simulações. Foram executados 22 cenários de funções em avaliador isolado (22/22). O GitHub Actions validou com sucesso **npm ci, npm run test:switch e npm run build** nesta branch em 28/10/2026, e a Vercel informou build de preview aprovado. **Ainda não houve teste real contra o Supabase ou validação de fluxos com banco ativo.** A integração de API e o SQL precisam ser testados em ambiente de prévia antes do merge.

**Não implementado:** atendimento autônomo via WhatsApp, coleta de dados por IA no novo formulário, importações externas, avaliação automática, aprovação de propostas, aviso em background, importação de bases e deploy em produção. Essas etapas devem ser construídas só após validação de segurança e do fluxo com dados sintéticos.


## Sprint de integração sem construir um SaaS novo

**Sprint A — entrada (primeiro):** criar rotas públicas dentro da M Select, persitir solicitações com consentimento separado e conectar à distribuição e qualificação existentes. Dashboard `Switch > Novas solicitações`.

**Sprint B — oferta:** criar onboarding de investidores e parceiros, validação de dados, consentimentos e tabela de ativos. Importações somente de feeds autorizados. Encaixar `rankSwitchInvestors` num endpoint autenticado.

**Sprint C — operação:** cartões de oportunidades com filtros e pontuação explicada; botão de aprovação do corretor; simulador de upgrade em cada proposta; registro de aceite e divergências.

**Sprint D — comunicação:** integração com canal oficial, modelos permitidos, fila de envios, stop ao opt-out, transferência humana e acompanhamento. No início, usar notificação **interna** e rascunho para o corretor até o WhatsApp estar validado.

**Sprint E — escala:** indicadores por fonte, custo por lead qualificado, taxa de compatibilidade, investidores ativos, tempo de negociação, propostas, comissão recebida e margem operacional por transação. Só ampliar cidades após fechamento comprovado.

## Decisões de segurança, financeiras e comerciais

- Nenhum robô envia proposta vinculante, garante liquidez, define preço como laudo ou aprova financiamento.
- Pontuação do algoritmo é **prioridade operacional** e não probabilidade de fechar venda.
- Converter moeda para centavos; documentar impostos, custos, dívida, taxas, comissão e a remuneração real antes de simular lucro.
- Regras de comissão, partes envolvidas e estrutura de operação revisadas por corretor habilitado e advogado; evitar remuneração duplicada ou não acordada.
- LGPD: finalidade, transparência, base legal adequada, minimização, acesso restrito, registro de comunicação e respeito à retirada de consentimento quando aplicável.
- WhatsApp: opt-in válido, modelos aprovados para iniciar conversa, janela de 24h para mensagens livres e transferência humana. A integração por QR code não deve ser assumida como autorizada/estável para automação comercial em escala.
- Nenhum envio em massa, compra de bases, spam ou coleta de dados privados para prospecção.

## Meta comercial que decide se vale escalar

Operação de teste: 30 solicitações qualificadas, 10 investidores/parceiros autorizados e revisão humana de pelo menos 10 matches relevantes. Registrar por que cada match fracassa. **A métrica de validação é proposta real e transação fechada com margem positiva**, não número de cadastros. Evitar automações adicionais se não houver evidência de demanda e oferta.

## Checklist de ativação segura (obrigatória antes de abrir ao público)

1. Criar backup/revisar os dados Supabase, aplicar `docs/sql/ATIVAR-M-SWITCH.sql` no projeto correto. Verificar tabelas, RLS e privilégios — **não foram aplicados aqui**.
2. Criar deployment de preview desta branch e executar `npm run test:switch`, `npm run build` e teste de navegação mobile/desktop.
3. Testar com dados **sintéticos**: um vendedor, um comprador em upgrade e um investidor, sem contatos reais. Validar POST, idempotência, GET restrito por corretor, qualificação, matching e PATCH de versão concorrente.
4. Testar que nenhum dado pessoal fica publicamente acessível e que a alteração de etapa não dispara mensagem.
5. Preparar canal de atendimento para pedidos LGPD/opt-out e definir responsáveis.
6. Somente depois autorizar merge/deploy. Não promover a branch diretamente a produção antes do banco estar pronto.

