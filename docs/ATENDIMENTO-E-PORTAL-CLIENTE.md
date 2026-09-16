# Atendimento e portal do cliente — proposta de implementação

Data: 16/09/2026. Base examinada: EME Select 0.10.0.

**Este documento define contratos para as próximas entregas. Não ativa WhatsApp, IA, convites, contas de clientes, conversas, reservas ou retirada de chaves.** A inspeção foi feita no código local; não comprova a configuração nem o estado atual dos serviços em produção. Os arquivos centrais de autenticação, rotas e migrações estavam iguais na cópia de trabalho e em `C:/Users/mateu/Downloads/EME-Select` no momento da inspeção.

## 1. Resultado pretendido

Uma pessoa inicia o atendimento pelo WhatsApp. Um assistente identificado como IA coleta o essencial e encaminha para uma pessoa da EME quando necessário. Quem deseja apresentar um imóvel recebe um link individual para preencher sua ficha. A equipe verifica identidade, vínculo e autorização antes de liberar o acompanhamento do imóvel no portal.

No portal, o proprietário acompanha os imóveis aos quais recebeu acesso, responde à equipe, propõe correções e combina visitas. Uma conversa com um interessado só é aberta com participantes identificados e supervisão informada da EME. A agenda distingue pedido de confirmação. A retirada e a devolução de chaves dependem de conferência humana registrada.

Primeiro recorte operacional: convites emitidos pela equipe, ficha individual e acompanhamento do proprietário. O mesmo contrato de convite poderá ser usado pela IA depois; não é necessário conectar o WhatsApp para testar esse primeiro recorte.

Contato indicado para este atendimento: **(54) 99157-8029**, formato internacional `5554991578029`. O atendimento atual usa o aplicativo WhatsApp; a API e a IA de atendimento não foram ativadas. Usar esse número em links comerciais não significa que exista uma API WhatsApp configurada. A configuração do canal/API ainda é desconhecida; a configuração local reportada contém apenas Supabase. Não pressupor credencial, provedor, número habilitado para API ou autorização de disparo automático.

### Entrega local desta rodada: formulário público dedicado

Foi adicionada a página `/enviar-imovel`, preparada para o endereço `https://www.emeselect.com/enviar-imovel`. Ela reutiliza `OwnerSubmission` e o endpoint de recebimento existente, apresenta orientações sobre conservação/funcionalidade, dados verdadeiros, vínculo/autorização e fotos originais. Solicita preparar JPEG, PNG ou WebP com lado maior de pelo menos 2.000 px e menor de pelo menos 1.200 px; o ideal é 3.000 px ou mais no lado maior. A página não recebe arquivos: fotos e documentos continuam sendo complementados com a equipe.

É um **link público geral**, sem token individual, autenticação de proprietário ou concessão de acesso. O envio confirmado cria a ficha privada em `Recebido` e devolve protocolo; não garante aceitação na curadoria, publicação ou titularidade. A página e seus fallbacks local/Vercel estão implementados no código desta rodada; disponibilidade no endereço público depende da implantação e verificação da versão. Os contratos de convite e portal descritos nas seções seguintes continuam futuros.

## 2. O que o código já oferece

| Capacidade | Evidência local | Situação e limite |
| --- | --- | --- |
| Site e portal da equipe separados | `src/main.tsx`, `src/portal/PortalEntry.tsx` | `/portalselect` abre a equipe; `/portalselect/demo` abre exemplos. Não existe portal de cliente. |
| Link público de apresentação | `src/SubmissionPage.tsx`, `/enviar-imovel` | Página dedicada com orientações e formulário existente. Link geral, sem convite individual, upload ou concessão de acesso. |
| Contas de equipe | `src/portal/api.ts`, `server/cloud/api.mjs`, migração `20260914_portal.sql` | Perfis `admin` e `corretor`; não há perfil externo. Administrador vê a carteira; corretor, os cadastros atribuídos. |
| Autenticação em nuvem | `server/cloud/api.mjs`, `server/cloud/client.mjs` | Supabase Auth verifica credenciais; a API cria sessão própria com token aleatório de 32 bytes, hash SHA-256 no banco e cookie `HttpOnly`, `Secure`, `SameSite=Strict`. Sessão de até 8 horas e inatividade de 30 minutos. Recuperação de senha por e-mail ainda não está implementada. |
| Proteção do banco | `supabase/migrations/20260914_portal.sql` | RLS habilitada e acesso direto de `anon`/`authenticated` revogado. O servidor usa credencial privilegiada; portanto, suas verificações e as funções transacionais são parte essencial da autorização. Isso ainda não equivale a uma política de RLS por proprietário. |
| Recebimento público de imóvel | `src/OwnerSubmission.tsx`, `server/submission.mjs`, `/api/public/submissions`, migração `20260915_submissions.sql` | Formulário em três etapas, validação, limites e protocolo idempotente. Cria ficha privada em `Recebido`; vínculo informado é uma declaração. Não cria conta, convite ou acesso de proprietário. |
| Cadastro, fotos e curadoria | `server/cloud/api.mjs`, `server/cloud/domain.mjs`, `src/portal/ListingsWorkspace.tsx` | Ficha, prévia, fotos privadas, conferências e decisão humana. Alterações relevantes exigem nova revisão. Somente projeção explícita é publicada. |
| Auditoria e concorrência de ficha | `eme_audit`, `eme_save_case`, campo `version` | Histórico da equipe e rejeição de versão desatualizada. O autor atual exige um perfil de equipe; o modelo não acomoda corretamente cliente, IA e webhook sem extensão. |
| Solicitação de visita | `src/Forms.tsx` | Prepara texto para o visitante enviar no WhatsApp. Não consulta disponibilidade nem reserva horário. |
| Relacionamento, tarefas e agenda de demonstração | `src/portal/PortalApp.tsx`, `src/portal/model.ts` | Contatos fictícios e rascunhos locais. Não são mensagens recebidas/enviadas, compromissos reais ou integrações. |
| Produção e desenvolvimento | `api/portal.js`, `vercel.json`, `scripts/serve.mjs` | API Vercel/Supabase e servidor local SQLite são implementações distintas. `npm start` não testa a base de produção. |

Ainda faltam: emissão/resgate/revogação de convites; verificação de contato externo; autenticação e recuperação de conta do cliente; vínculo de acesso por imóvel; projeção privada do proprietário; mensagens reais e participantes; triagem e integração WhatsApp; fila de saída; agenda com controle de conflito; custódia de chaves e auditoria multiator. As telas demonstrativas não devem ser apresentadas como entrega dessas funções.

## 3. Identidade não é autorização sobre um imóvel

Manter `eme_profiles` e os contratos atuais exclusivamente para a equipe no primeiro lançamento. Adicionar identidade externa separada, vinculada a `auth.users`, sem dar ao cliente os papéis `admin` ou `corretor`.

Uma mesma identidade externa pode ser proprietária de um imóvel e interessada em outro. Essa relação pertence ao recurso; não deve ser um atributo global que libera a carteira inteira. Nome, telefone, e-mail coincidente, protocolo, indicação da IA e escolha “Proprietário” no formulário não comprovam autorização.

O vínculo ativo exige uma decisão da equipe com quem verificou, quando, a relação declarada, evidência/referência consultada e escopo concedido. Guardar a referência privada à evidência, evitando anexar documentos sensíveis ao log. Um representante recebe escopo e validade próprios. Acesso ao portal e autorização de publicidade são decisões independentes.

### Matriz de acesso do primeiro lançamento

| Ator | Acesso permitido | Decisões que continuam restritas |
| --- | --- | --- |
| Visitante | Catálogo publicado; envio público de uma ficha | Nenhuma leitura de cadastro privado, contatos, mensagens ou agenda detalhada |
| Portador de convite de cadastro | Após resgate e confirmação do contato destinado: preencher a própria ficha, revisar e enviar | Nenhum acesso a imóvel existente, dossiê, publicação, papel de proprietário ou conversa de terceiros |
| Cliente autenticado, vínculo pendente | Próprio perfil e recibo/status limitado do pedido | Nenhum dado da carteira antes da aprovação do vínculo |
| Proprietário/representante com vínculo ativo | Projeção permitida dos próprios imóveis; conversas das quais participa; pedidos de visita e disponibilidade dos próprios imóveis | Sem notas internas, documentos de terceiros, histórico completo de curadoria ou edição direta da versão publicada |
| Interessado autenticado | Imóveis públicos, sua própria conversa e seus pedidos de visita | Sem cadastro privado do proprietário, outros interessados, seus horários identificáveis ou chaves |
| Corretor ativo responsável | Imóveis atribuídos; conversas e agenda sob sua responsabilidade | Não concede acesso de proprietário, não publica nem autoriza retirada de chave no recorte inicial |
| Administrador ativo | Aprova/revoga vínculos; supervisiona operação; confirma visitas e autoriza retirada conforme conferência | Acesso e decisões sensíveis registrados; não substitui confirmação física de entrega/devolução |
| Serviço de IA/integração | Comandos limitados de triagem, rascunho e consulta da projeção já autorizada | Sem credencial de administrador, mudança de vínculo, aprovação de curadoria, publicação ou confirmação/entrega de chave |

Remoção de um vínculo bloqueia imediatamente novas leituras e escritas daquele imóvel, inclusive fotos, anexos, mensagens e agenda. A sessão pode continuar válida para outros vínculos. O histórico permanece para a operação autorizada da EME. Ações em curso devem revalidar o vínculo dentro da mesma transação da escrita.

## 4. Convite individual para cadastro

Estados propostos:

```text
emitido ──resgate + contato confirmado──> resgatado ──envio──> concluído
   │                                        │
   ├──prazo ultrapassado──> expirado          ├──prazo ultrapassado──> expirado
   └──equipe revoga───────> revogado          └──equipe revoga───────> revogado
```

Regras do contrato:

1. A equipe informa finalidade `property_intake`, contato destinatário, validade e responsável. Proposta inicial: sete dias, configurável e visível à equipe. Um convite permite um envio. Reemitir revoga o anterior.
2. Gerar token opaco com 32 bytes aleatórios; persistir apenas hash SHA-256, `expires_at`, `revoked_at`, autor e escopo. O token não contém telefone, e-mail, `case_id` ou papel. Não usar protocolo ou UUID de imóvel como segredo de acesso.
3. Entregar o segredo uma única vez ao operador/canal autorizado. Não gravar URL integral em auditoria, métricas, erro, analytics ou eventos de navegação. Logs de requisição devem omitir o corpo dos endpoints de resgate.
4. Proposta de URL: `/cadastro#convite=<token>`. O fragmento evita enviar o token ao servidor na navegação inicial; não impede cópia, encaminhamento ou leitura pelo navegador. A página sem scripts de terceiros resgata por `POST` de mesma origem e remove o fragmento com `history.replaceState`. Aplicar `Referrer-Policy: no-referrer` na página, não somente na API.
5. Abrir o link não consome o convite: prévias de mensagem e leitores de link podem fazer acesso automático. O consumo ocorre após ação explícita e verificação do contato destinatário. A confirmação por código usa canal já confirmado na emissão, limite de tentativas e prazo curto. O simples formulário não permite substituir o destinatário e ganhar acesso.
6. O resgate troca o token por uma sessão curta de cadastro em cookie `HttpOnly`, `Secure`, `SameSite=Strict`, restrita a `/api/intake`. O token original deixa de funcionar; retomada usa novo desafio do mesmo contato. Revogar o convite invalida suas sessões. A data limite do convite também limita a sessão.
7. A sessão de cadastro só acessa o rascunho associado ao convite; não acessa `eme_cases`. No primeiro recorte, coleta texto e contato; fotos continuam no fluxo autenticado da equipe. Upload externo entra após contrato próprio de tamanho, tipo, armazenamento privado e inspeção.
8. Enviar usa chave idempotente e hash do conteúdo. Em transação: validar sessão, validade e escopo; bloquear convite; criar exatamente uma ficha `Recebido`; guardar recibo; marcar convite concluído; registrar evento. Repetir a mesma requisição retorna o mesmo recibo; mesma chave com conteúdo diferente retorna `409`.
9. Convite inválido, expirado ou revogado recebe resposta genérica; não revelar contato destinatário, existência de imóvel ou relação com alguém. Aplicar limites por convite e origem para resgate/verificação.
10. Conclusão do cadastro pode iniciar pedido de conta/vínculo, nunca ativá-lo automaticamente. A equipe ainda confere identidade, representação e imóvel.

O formulário público atual continua disponível e privado. Seu consentimento de contato não se converte em autorização de divulgação ou acesso. Não aceitar `role`, `assignee_id`, `published`, `approved` ou vínculo ativo em payload de visitante, cliente ou IA.

## 5. Dados propostos, adicionados por fase

Usar o UUID existente de `eme_cases` como `case_id` do imóvel no primeiro recorte; não duplicar a carteira. Evitar inserir todas as novas relações em `data` JSON: participantes, permissões, reservas e tokens precisam de restrições verificáveis no banco.

| Fase | Tabela proposta | Campos/restrições essenciais |
| --- | --- | --- |
| 1 | `eme_intake_invites` | `id`, `token_hash unique`, propósito, destinatário privado, responsável, expiração, revogação, resgate, `submitted_case_id`, versão; nenhum segredo em claro |
| 1 | `eme_intake_sessions` | Hash da sessão, convite, contato verificado, prazo, revogação; sessão sempre limitada pelo convite |
| 1 | `eme_intake_drafts` | Um rascunho por convite, conteúdo validado, versão, chave/hash de envio e recibo; sem dados de outros cadastros |
| 1 | `eme_operational_events` | ID, tipo de evento, ator, recurso, instante do servidor, motivo, correlação e resultado; somente acréscimo pelas funções de domínio |
| 2 | `eme_client_accounts` | ID referenciado a `auth.users`, nome, contato verificado, estado da conta; não participa de `eme_profiles` |
| 2 | `eme_client_sessions` | Hash, conta externa, prazo, último uso e revogação; cookie e caminhos separados da sessão da equipe |
| 2 | `eme_case_access` | `case_id`, cliente, relação declarada, estado, capacidades, validade opcional, quem conferiu/aprovou/revogou e referência de evidência; um vínculo corrente por par imóvel/cliente |
| 2 | `eme_case_change_requests` | Autor externo, imóvel, campos propostos, versão-base, estado e decisão da equipe; mudanças não escrevem diretamente na ficha/publicação |
| 3 | `eme_conversations` | Imóvel opcional na triagem, finalidade, responsável EME, estado, modo `human`/`assistant`, versão e aviso de supervisão vigente |
| 3 | `eme_conversation_participants` | Conversa, ator, capacidade, ingresso/saída, aceite do aviso; unicidade de participação ativa; autorização derivada do vínculo quando aplicável |
| 3 | `eme_messages` | Conversa, autor/tipo, texto, instante, origem, chave idempotente, identificador do provedor, estado de entrega; conteúdo não se mistura com notas internas |
| 3 | `eme_internal_notes` | Conversa/imóvel, autor de equipe e texto; sem projeção externa e sem envio pelo canal de mensagens |
| 4 | `eme_channel_events`, `eme_outbox` | Identificador único do evento do provedor, processamento; comandos de saída, chave idempotente, tentativas, próxima tentativa e estado de entrega |
| 5 | `eme_appointments` | Imóvel, solicitante, responsável, intervalo, fuso, estado, versão, motivo e confirmação humana |
| 5 | `eme_resource_reservations` | Compromisso, recurso (imóvel/corretor/chave), intervalo e estado; exclusão de sobreposição para reservas ativas |
| 6 | `eme_key_items`, `eme_key_custody` | Chave física identificada, imóvel, local de custódia restrito; solicitante, recebedor, horários pedidos/autorizados, autorização EME, conferência de identidade, saída, entrega/devolução e responsáveis humanos |

Os nomes são propostas, não migrações já existentes. Cada fase cria somente as tabelas de que precisa. Antes da implementação, definir retenção operacional e quem pode exportar cada classe de dado; exclusão/anonimização deve preservar a coerência dos eventos e das referências obrigatórias.

`eme_operational_events` deve distinguir `staff`, `client`, `system` e `assistant`, com FK de equipe ou cliente quando correspondente e restrição de coerência entre tipo e identificador. Um evento automático não deve atribuir sua autoria ao administrador por ele ser responsável pela ficha. Registrar também o responsável operacional quando for diferente do autor. Não colocar token, senha, código de confirmação, documento integral ou texto inteiro de conversa em evento genérico.

## 6. Autorização na API, banco e arquivos

O primeiro lançamento preserva o modelo BFF: o navegador fala com a API de mesma origem; não recebe credencial privilegiada nem consulta tabelas privadas diretamente. Não ampliar o tipo `TeamUser` para transformar cliente em membro da equipe.

As novas tabelas começam com RLS habilitada e privilégios revogados para `anon`/`authenticated`, como a base atual. **A credencial privilegiada do backend contorna RLS: isso não elimina a necessidade de autorização por recurso.** Leituras privadas e escritas externas devem passar por funções com escopo reduzido que validem a sessão e o vínculo ativo, incluindo prazo/revogação, e retornem apenas a projeção permitida. Escrita, checagem final e evento devem ocorrer na mesma transação. Não fazer um `SELECT` genérico privilegiado e confiar que a interface esconda o restante.

O backend não aceita `actor_id`, `role`, `client_id` efetivo ou capacidades do corpo: deriva o ator da sessão. A chave do imóvel é um seletor, não uma autorização. Todas as rotas filhas repetem o controle do pai: fotos, anexos, mensagens, disponibilidade e recibos. Solicitações para recurso não autorizado retornam `404` ou erro genérico consistente, sem expor existência/dados.

Se posteriormente houver leitura direta com JWT do cliente, isso exige outra entrega: políticas RLS por `auth.uid()` e vínculo ativo, `WITH CHECK` em escrita, políticas de storage e testes reais com os papéis `anon`/`authenticated`. A sessão própria atual não preenche `auth.uid()` por si só. Não abrir permissões diretas para facilitar realtime antes desses controles.

Projeções independentes:

- `PublicProperty`: somente os campos já destinados ao catálogo e fotos publicadas.
- `OwnerProperty`: identificação do próprio imóvel, etapa explicada para o cliente, pendências destinadas a ele, dados que forneceu, fotos autorizadas, versão e contatos profissionais necessários.
- `ParticipantConversation`: somente mensagens da conversa autorizada e participantes visíveis. Um proprietário não vê todas as conversas de interessados apenas por ser proprietário.
- `TeamCase`: dossiê interno conforme atribuição/papel existente. Notas internas, evidências documentais e avaliação de outras pessoas não entram nas projeções de cliente.

Não reaproveitar o retorno integral de `listing(row)`/`details(row)` para o portal externo. Fotos privadas continuam passando por autorização; URL conhecida não basta. Se forem usadas URLs assinadas, manter validade curta e considerar que uma URL já emitida pode continuar acessível até expirar após uma revogação. Não colocar documentos, tokens ou anexos privados em `public/`.

## 7. Contratos de rotas propostos

As rotas abaixo não existem hoje. Alterar `src/main.tsx`, os rewrites Vercel e o fallback local de forma explícita, sem encaminhar o cliente ao login da equipe. Reservar `/cliente` para o cliente, `/cadastro` para o convite e manter `/portalselect` para a equipe.

| Contrato | Regra principal |
| --- | --- |
| `POST /api/intake-invitations` (equipe) | Emite convite dentro do escopo do operador; retorna o link somente na emissão |
| `POST /api/intake-invitations/:id/revoke` (equipe) | Revoga convite e sessões de cadastro em transação; registra motivo |
| `POST /api/intake/exchange` | Confirma convite/contato e emite sessão limitada; resposta não traz ficha existente |
| `GET/PATCH /api/intake/draft` | A sessão escolhe o rascunho; `PATCH` exige versão |
| `POST /api/intake/submit` | Idempotência + transação de criação da ficha privada e consumo do convite |
| `/api/client/auth/session`, `/login`, `/logout`, `/recovery` | Conta externa, recuperação com verificação e revogação; sem acesso à equipe |
| `POST /api/cases/:id/access-decisions` (administrador) | Aprova, limita ou revoga vínculo após conferência; exige versão, motivo e referência |
| `GET /api/client/properties` e `/:id` | Lista somente vínculos ativos e entrega projeção do cliente, paginada |
| `POST /api/client/properties/:id/change-requests` | Propõe alterações; equipe decide em ação separada |
| `GET/POST /api/client/conversations/:id/messages` | Participação ativa, paginação, limite de tamanho e idempotência na escrita |
| `POST /api/conversations/:id/participants` (equipe) | Convite/aceite explícito; não revela histórico de outros participantes |
| `POST /api/channel/whatsapp/webhook` | Endpoint próprio com verificação criptográfica do provedor, corpo bruto e idempotência; não usa a exceção de origem do browser |
| `POST /api/client/appointments` | Cria pedido, nunca confirmação |
| `POST /api/appointments/:id/confirm` (administrador) | Valida disponibilidade e cria reservas atomicamente; conflito retorna `409` |
| `POST /api/client/key-requests` | Cliente ou assistente atuando no atendimento registra pedido e solicitante; nunca autoriza a retirada |
| `POST /api/keys/:id/authorize`, `/checkout`, `/return` (administrador) | Transições humanas distintas, sessão válida, versão e evento de custódia |

Os endpoints de desafio e confirmação de contato devem ser detalhados junto ao provedor de identidade; nenhuma integração está escolhida ou ativa por este documento. Adotar corpo validado por lista permitida, IDs válidos, limites, `Cache-Control: no-store` e proteção de origem/CSRF compatível com cookies. O webhook precisa de handler independente: o atual `handle` exige origem de navegador e faz parsing JSON antes de chegar a rotas específicas, o que não é o contrato de verificação de assinatura de um webhook.

Convenções: `401` sem sessão; `404` para recurso inexistente/inacessível; `409` para versão, idempotência incompatível ou choque de reserva; `422` para dados semanticamente inválidos; `429` para excesso. Não retornar stack, credenciais nem corpo bruto do provedor ao cliente.

## 8. Conversas e monitoramento informado

Estados: `aberta → aguardando_cliente / aguardando_equipe → encerrada`. Reabertura é evento explícito. O modo de resposta, `assistant` ou `human`, é separado do estado da conversa. “Aguardando cliente” não permite à IA retomar depois de um atendente assumir.

Toda conversa mostra seus participantes, responsável da EME e aviso persistente: “Esta conversa acontece no ambiente EME Select e pode ser acompanhada pela equipe responsável pelo atendimento.” Mostrar também quando a mensagem é de IA e como pedir atendimento humano. Registrar versão e aceite do aviso antes da primeira mensagem. Acesso de supervisão da EME segue atribuição/papel e fica registrado; supervisão não é um participante invisível simulando identidade de cliente.

Começar com conversa cliente–EME. Para permitir proprietário–interessado, abrir uma conversa própria, ligada a um imóvel, com convite e aceite dos dois, mais a supervisão informada da EME. Não adicionar interessado a uma conversa antiga de proprietário com a equipe nem copiar esse histórico. Coproprietários também não ganham acesso automático às conversas pessoais de outro coproprietário.

No primeiro lançamento, mensagens enviadas são imutáveis; correções são novas mensagens. Moderação pode ocultar conteúdo da projeção quando necessário, com evento e motivo, sem reescrever silenciosamente o histórico. Notas internas usam tabela e endpoint distintos, nunca uma flag recebida do cliente que possa se tornar mensagem pública. Anexos ficam fora do primeiro recorte de mensagens.

Cliente só responde por sua identidade. O servidor determina autor, canal e estado de entrega. Usar chave idempotente por conversa/autor; eventos externos usam identificador único do provedor. “Recebida pela EME”, “aceita pelo canal”, “entregue” e “falhou” são estados diferentes. Timeout de envio não é autorização para disparar nova mensagem sem deduplicação.

## 9. WhatsApp e IA com passagem para uma pessoa

Fluxo de triagem proposto:

```text
entrada → identificar intenção → coletar mínimo → revisar resumo
                    │                     │
                    │                     ├──apresentar imóvel → convite de cadastro
                    │                     └──buscar/visitar → atendimento/pedido de visita
                    └──dúvida, pedido humano ou falha → fila humana
```

O assistente informa que é IA, pergunta se a pessoa procura um imóvel ou quer apresentar um imóvel, coleta cidade, finalidade, preferências essenciais e contato permitido. Não pede documentos sensíveis pelo chat inicial. Informa quando algo depende da equipe e não anuncia um horário como reservado antes da confirmação no sistema.

Dados e ferramentas disponíveis à IA devem ser limitados ao atendimento atual e às projeções autorizadas. Texto recebido, anexos e conteúdo externo são dados não confiáveis: não alteram permissões, instruções de sistema, destinatários ou ferramentas. A IA pode sugerir resposta, completar rascunho e propor próximo passo. Autorizações de publicação, condição comercial final, regularidade documental, acesso como proprietário e chave continuam humanas.

Passagem humana: pedido explícito do cliente, dúvida que exija conferir informação, identidade/vínculo incerto, pendência documental, reclamação, negociação ou falha do canal/modelo. Guardar resumo com mensagens de origem, campos confirmados, lacunas e motivo. Ao atendente assumir, incrementar a versão da conversa e suspender envios automáticos pendentes; o worker revalida modo/versão antes de cada envio. A retomada da IA exige ação explícita registrada da equipe.

Uma integração real exige conta/canal, credenciais e webhook aprovados na configuração operacional. Não escolher nem contratar provedor por este documento. Antes de conectar, verificar na documentação oficial vigente do provedor os requisitos de assinatura, mensagens iniciadas pela empresa, consentimento, modelos e limites aplicáveis. Não importar regras temporais presumidas para o código.

O recebimento grava evento e enfileira trabalho antes de reconhecer o webhook. A saída usa outbox persistente, tentativas limitadas e reconciliação de resultado incerto. Preservar a ordem por conversa, deduplicar eventos e impedir que um replay envie mensagem ou crie ficha novamente. Medir falhas, tempo na fila e passagens humanas sem pôr conteúdo pessoal em métricas.

## 10. Agenda: pedido não é reserva

Estados:

```text
solicitado → em_análise → confirmado → realizado
     │           │           ├──cancelado
     │           │           └──não_compareceu
     └───────────┴──> recusado/cancelado
```

O cliente propõe intervalos; proprietário informa disponibilidade do próprio imóvel. A equipe verifica condições de acesso, responsável e duração antes de confirmar. Interessados recebem horários disponíveis/indisponíveis, sem nomes ou motivos de compromissos de outras pessoas.

Guardar início e fim como instantes UTC e o fuso usado para a apresentação, inicialmente `America/Sao_Paulo`. Validar fim após início, duração, prazo mínimo e intervalo de deslocamento quando aplicável. Não guardar apenas “amanhã às 14h”.

No primeiro recorte, não há pré-reserva temporária: pedidos não bloqueiam horário e a tela diz isso. Confirmar executa uma transação que bloqueia o pedido, revalida a versão e insere todas as reservas necessárias (imóvel, corretor e, se aplicável, chave). Uma restrição de exclusão no Postgres deve impedir intervalos sobrepostos `[início,fim)` para o mesmo recurso entre reservas ativas; validar a extensão/operadores necessários em staging antes da migração. O conflito de qualquer recurso reverte todas as inserções e devolve `409`. Checar disponibilidade com `SELECT` antes de gravar, sem restrição/bloqueio transacional, é insuficiente.

Cancelar libera reservas na mesma transação e conserva o histórico. Remarcar troca o intervalo atomicamente: se a nova reserva falhar, a antiga continua confirmada. Envios externos ocorrem depois do commit por outbox. Falha de notificação não desfaz uma reserva nem a transforma em segunda visita. A confirmação informa se a notificação está pendente.

## 11. Chaves: autorização e custódia humanas

Pedido de retirada: `solicitado → autorizado_pela_EME / recusado`. A IA pode registrar o pedido na conversa do solicitante identificado; o registro deve distinguir esse solicitante do serviço que executou a ação. O pedido pode conter imóvel, motivo/visita, pessoa que pretende retirar e horários pretendidos de retirada e devolução. Ele não reserva a chave nem revela onde ela está.

Estados de custódia: `disponível → autorizada_para_retirada → retirada → devolvida`. `cancelada`/`expirada` podem encerrar uma autorização antes da retirada; `atrasada` e `incidente` sinalizam necessidade de intervenção após a retirada. “Atrasada” não torna a chave disponível.

No primeiro lançamento, somente administrador humano da EME autoriza e registra saída/devolução. A operação pode conceder esse escopo a outro profissional da EME em entrega posterior, de forma explícita. Visita confirmada é uma condição necessária para o fluxo normal, mas não basta: conferir autorização do responsável pelo imóvel, identidade do solicitante e do recebedor, janela de retirada/devolução e chave física. Registrar quem aprovou, quem entregou/recebeu, horários previstos e reais, compromisso, motivo e referência de conferência. Autorização digital não comprova entrega física.

Uma chave pode ter no máximo uma custódia ativa; implementar restrição única correspondente e bloquear a linha da chave na transação. Impedir dupla retirada concorrente e retirada após cancelamento, expiração ou revogação da autorização. Cancelar visita com chave já retirada cria tarefa/incidente de devolução, sem inventar retorno automático.

IA, cliente e convite não autorizam nem marcam retirada/devolução. Código de armário, localização exata de custódia e outras credenciais de acesso não entram no chat ou no payload comum de agenda. Exceções operacionais exigem decisão humana e motivo, nunca uma passagem oculta de estado.

## 12. Critérios de aceite antes de habilitar cada fase

| Área | Evidência necessária |
| --- | --- |
| Convite | Dois resgates/envios simultâneos produzem uma sessão/um cadastro conforme contrato; token em claro não aparece no banco/log; expiração/revogação bloqueiam inclusive sessão já emitida; abrir prévia não consome; link encaminhado não dispensa verificar destinatário |
| Identidade e acesso | Cliente A não consegue ler/mudar imóvel, foto, conversa ou agenda de B trocando IDs; cliente não acessa endpoints de equipe; convite e declaração de proprietário não criam vínculo ativo |
| RLS/backend | `anon` e `authenticated` não leem tabelas privadas; funções externas recusam sessão/vínculo inválido; testar API real com identidade A/B e ator revogado, além de testes de schema |
| Projeção | Snapshot de payload demonstra ausência de notas internas, tokens, contatos de terceiros e documentos privados; paginação não amplia escopo |
| Vínculo | Administrador registra motivo/evidência; revogação interrompe acesso, escrita e mídia; vínculo de um imóvel não abre outro; aprovação comercial/publicação não altera automaticamente vínculo |
| Conversa | Removido não lê nem envia; adição de interessado não expõe conversa anterior; supervisão/IA visíveis; nota interna nunca chega ao canal externo; mesma chave não duplica mensagem |
| WhatsApp/IA | Assinatura inválida rejeitada; replay não duplica; falha/timeout vai para fila; humano assumir impede envio automático pendente; teste de texto malicioso não amplia ferramentas/permissões |
| Agenda | Duas confirmações concorrentes do mesmo imóvel/corretor/chave resultam em no máximo uma reserva conflitante; remarcar sem vaga preserva reserva anterior; cancelar libera todos os recursos; timezone aparece corretamente |
| Chaves | Cliente/IA/corretor não autorizam; duas retiradas simultâneas não criam duas custódias; cancelamento com chave fora gera pendência; devolução só ocorre por ação humana registrada |
| Operação | Responsável da fila definido; recuperação/revogação de acesso exercitada; eventos permitem explicar quem fez a transição; falha de provedor mantém estado e permite retomada sem duplicação |

Executar cenários em ambiente isolado com dados fictícios. Reutilizar os testes de curadoria/publicação para garantir que clientes e IA não atravessem seus controles. `tests/cloud-schema.test.mjs` cobre parte da base atual, não esses novos contratos. A validação local SQLite não substitui teste do Postgres, cookies e transações da API cloud. Não executar scripts destinados a projeto vazio sobre uma operação com clientes.

## 13. Entregas curtas e reversíveis

| Fase | Entrega visível | Condição para avançar |
| --- | --- | --- |
| 1 — Convite assistido | Equipe emite/revoga link; pessoa confirma contato, preenche e recebe protocolo; equipe vê a origem do envio | Resgate, escopo, validade e idempotência aprovados em staging; nenhuma criação automática de proprietário |
| 2 — Portal do proprietário | Conta externa, recuperação, vínculo conferido, lista dos próprios imóveis, pendências e pedido de alteração | Testes A/B, revogação, projeção e mídia aprovados; piloto com poucos imóveis autorizados |
| 3 — Conversa no portal | Cliente conversa com EME; depois conversa própria com interessado e supervisão informada | Participantes, privacidade de histórico, auditoria e moderação aprovados |
| 4 — WhatsApp e IA | Eventos entram na mesma fila; IA começa sugerindo respostas para revisão e depois faz triagem limitada | Canal configurado, assinatura/outbox/replay/passagem humana validados; escopo de respostas aprovado pela operação |
| 5 — Agenda | Pedido, confirmação humana, cancelamento e remarcação sem reserva dupla | Testes concorrentes do banco e visibilidade por participante aprovados |
| 6 — Chaves | Autorização humana e registro de retirada/devolução com pendências | Procedimento físico definido, responsáveis treinados e invariantes de custódia validados |

Habilitar cada fase por configuração no servidor e grupo piloto; esconder botão não é controle de autorização. Desabilitar novas automações não remove dados nem eventos existentes. Ao desligar a fase de IA, suspender outbox automático e manter fila humana; ao desligar convites, impedir emissões e resgates novos e definir tratamento dos rascunhos em curso. Compromissos confirmados e chaves retiradas continuam visíveis à equipe até seu encerramento.

Manter o núcleo operacional da EME Select separado de outros produtos e integrações. Esta proposta não altera nenhum sistema Helpu, não cria segredo, não envia mensagem e não executa migração. O próximo trabalho implementável é a Fase 1 com testes e configuração de identidade/canal explicitamente definidos, preservando os controles de curadoria existentes.
