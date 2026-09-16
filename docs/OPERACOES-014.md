# Operação do Portal Select · 0.14.0

As cinco páginas antes reservadas ao planejamento passam a ter fluxos operacionais com persistência privada, histórico e autorização no servidor. A versão local usa SQLite; produção usa Supabase. Não há dados de exemplo inseridos.

## Uso da equipe

1. **Atendimento e visitas:** selecione um imóvel da carteira, registre o contato, o canal, o responsável e o próximo retorno. O histórico distingue contato recebido, contato enviado fora do portal e nota interna. A agenda verifica sobreposição do imóvel e do corretor. A confirmação e a autorização de chave são do administrador; retirada e devolução exigem registro humano. Uma chave fora impede encerrar a visita.
2. **Locações:** cadastre contrato, partes, período, aluguel, dia de vencimento e honorários de administração. Gere uma competência por mês e registre recebimento e repasse somente depois de ocorrerem. O sistema mantém os valores daquela competência, mesmo se o contrato mudar. Registre também manutenção, custos e vistorias. A geração não calcula proporcionalidade; informe o valor conferido quando necessário.
3. **Documentos:** envie PDF, PNG, JPEG ou WebP até 2 MiB, associado ao imóvel. Registre categoria, validade e novas versões. O administrador confere e registra a revisão. O download continua autenticado e limitado à carteira atual; o arquivo não se torna público ao publicar o anúncio. A revisão operacional não é certificação jurídica.
4. **Central de IA:** selecione um imóvel e execute uma conferência da régua sem consumo de API ou uma análise da OpenAI, se configurada. O histórico registra quem solicitou, quando, versão do imóvel, resultado e revisão. Validar uma recomendação não aprova nem publica o imóvel. Alterações no imóvel exigem nova análise antes de validar a recomendação.
5. **Qualidade da equipe:** administradores consultam indicadores provenientes de atendimentos e visitas reais e registram avaliação por período, evidências e plano de ação. Os indicadores não são uma nota automática de desempenho. Desconhecido permanece sem nota; não há ranking de pessoas por IA.

## Integrações e limites efetivos

- **WhatsApp:** o número indicado é (54) 99157-8029 e opera no aplicativo. Os novos atendimentos registram interações reais manualmente; não recebem nem enviam mensagens pela API. Conectar a API oficial e o fluxo supervisionado de automação continua dependendo da habilitação do canal na Meta. Nenhuma mensagem é disparada por esta entrega.
- **Clientes externos:** estas são áreas autenticadas da equipe. A conta do proprietário, conversas entre proprietário e interessado e convites com verificação de identidade permanecem fora desta entrega. O formulário público `/enviar-imovel` continua funcionando.
- **Locações e financeiro:** locação guarda acompanhamento operacional. Não cria lançamentos financeiros automaticamente, não movimenta contas e não emite boletos. Os valores efetivos devem ser registrados na central financeira; a interface identifica essa separação para evitar dupla contagem. Aluguel de terceiro não é receita própria da EME.
- **IA:** a infraestrutura fica pronta, mas chamadas à OpenAI dependem de credencial e saldo da conta da empresa. Não há chave predefinida nem treinamento/fine-tuning aplicado. As instruções usam a régua atual e o contexto do imóvel; a análise é textual, não inspeciona fotos ou arquivos e não consulta cartórios, processos ou registros externos.

## Configuração da IA

O administrador abre **Central de IA → Configurar IA**, informa uma chave da OpenAI, confirma um modelo disponível em sua conta e ativa as análises. O modelo inicial é `gpt-5-mini`, configurável. Salvar apenas registra a configuração; a execução seguinte verifica a conexão com o provedor. A chave é cifrada com AES-256-GCM no servidor e nunca é retornada pela API.

Opcionalmente o servidor aceita `OPENAI_API_KEY`. A configuração do portal, quando preenchida, prevalece. As chamadas usam Responses API, JSON Schema estrito e `store:false`; cada clique de análise é uma chamada sob demanda, limitada a 12 solicitações por usuário a cada janela de 15 minutos e 3.500 tokens de saída. Recibos por UUID impedem disparar novamente a mesma solicitação. Mensagens, valores financeiros e aprovações não são executados pelo modelo.

Produção deriva a chave de cifragem de `EME_AI_ENCRYPTION_KEY`, quando presente; caso contrário, usa a chave privilegiada do Supabase, com separação de domínio. Recomenda-se manter uma chave de cifragem estável separada antes da primeira configuração. A troca dessa chave (ou da chave privilegiada usada como fallback) exige regravar a credencial da OpenAI pelo painel. Em SQLite, a chave fica ao lado do banco com sufixo `.ai-key`; inclua esse arquivo no backup privado junto com o banco. Nunca use prefixo `VITE_` em segredos.

Fontes da implementação: [Responses e saída estruturada](https://developers.openai.com/api/docs/guides/structured-outputs) e [modelo GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini).

## Ativação e validação

Antes de publicar o código, aplicar na base **EME** as migrations `20260916_operations.sql` e `20260916_intelligence.sql`. O arquivo [ATIVAR-OPERACOES-IA.sql](sql/ATIVAR-OPERACOES-IA.sql) reúne ambas em uma única transação para executar no SQL Editor do projeto `vjoajqrwqdeujqaognac`. Ele é gerado por `node scripts/prepare-operations-migration.mjs`; não executar as migrations novamente depois do arquivo combinado. Elas criam sete tabelas privadas e duas funções transacionais, sem modificar imóveis, fotos, contas existentes ou o livro financeiro. `anon` e `authenticated` não recebem acesso direto. O servidor revalida sessão, perfil e vínculo ao imóvel em cada escrita. Começam com listas vazias e a IA desativada.

Uma execução de IA que permaneça em processamento por pelo menos cinco minutos pode ser marcada como interrompida por um administrador, com confirmação explícita. Essa ação é auditada, não repete a chamada ao provedor e não permite reutilizar o mesmo identificador. Uma nova análise exige uma nova ação da equipe.

```sh
npm run build
npm run test:operations
npm run test:api
npm run test:cloud
npx playwright test tests/portal.spec.ts tests/operations-workspace.spec.ts tests/intelligence-workspace.spec.ts
```

Os testes usam bancos isolados. As respostas da OpenAI são simuladas exclusivamente nos testes; não houve consumo real nem envio de dados de clientes à OpenAI durante o desenvolvimento.

Verificação da versão: build aprovado; 12 verificações da API operacional, 11 da migration/RPC, nove do domínio operacional, nove da IA e 14 testes de navegador aprovados. As regressões da API existente (40) e cloud (17) também passaram. O SQL combinado foi validado em PostgreSQL isolado, incluindo permissões, preservação dos dados existentes e rollback integral diante de erro na segunda migration.

Ativação em produção confirmada em 16/09/2026, após execução do SQL pelo administrador: as sete tabelas responderam ao servidor e negaram acesso público (401). As duas funções rejeitaram comandos sem sessão válida; os registros de configuração inicial existem. A conferência não criou nem alterou registros operacionais.
