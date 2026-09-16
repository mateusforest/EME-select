# Astra e preparação do WhatsApp · 0.15.0

## IA em operação

A única integração de análise usa Responses API, JSON Schema estrito, régua Select V2 e revisão humana. O modelo inicial passa de `gpt-5-mini` para `gpt-6-astra`, preservando o esforço `low`, o limite de 3.500 tokens de saída, `store:false`, o prompt e o formato do resultado. O prazo de resposta sobe de 45 para 90 segundos; a função Vercel do portal admite 120 segundos. Não há ferramentas, chamadas em segundo plano, respostas automáticas ou novos dados enviados ao provedor nesta mudança.

Uma instalação ainda não configurada (versão de configuração zero) usa `OPENAI_MODEL`, se definido, ou Astra. Quando `OPENAI_API_KEY` já existe no servidor, as análises ficam disponíveis. Depois que o administrador salva a configuração, suas escolhas persistidas prevalecem, inclusive a desativação. O painel identifica a chave da hospedagem sem exibi-la. A prévia com `npm start` passa a carregar `.env.local`; a produção usa as variáveis da Vercel. Migrations históricas, testes do modelo anterior e análises já realizadas preservam seus modelos originais.

Validação real de 16/09/2026: a conta respondeu com `gpt-6-astra`; ficha inteiramente sintética, sem dados de clientes; 13,8 segundos, 955 tokens de entrada e 424 de saída. A saída passou pelo contrato estruturado e classificou a ficha incompleta como dados insuficientes. Esse teste confirma acesso e compatibilidade, não constitui comparação completa de qualidade ou garantia de latência.

## Preparação do WhatsApp

Administradores encontram **Preparar WhatsApp** em Atendimento e visitas e na Central de IA. O painel confere variáveis da hospedagem, armazenamento e ativação; oferece cópia do endereço de retorno e teste de conta/número sem enviar mensagens. A ausência da configuração não interfere nos módulos existentes.

Endereço de retorno: `https://www.emeselect.com/api/webhooks/whatsapp`.

1. No painel da Meta, criar ou selecionar o aplicativo **EME Select**, associar o portfólio empresarial da EME e habilitar o caso de uso WhatsApp. O número esperado é **+55 54 99157-8029**. Ainda é necessário confirmar se o aplicativo atual é WhatsApp Business ou comum. Se o atendimento pelo celular precisar continuar, verificar elegibilidade e onboarding por coexistência antes de migrar o número.
2. Aplicar uma vez [ATIVAR-WHATSAPP.sql](sql/ATIVAR-WHATSAPP.sql) no SQL Editor do Supabase **vjoajqrwqdeujqaognac**. A migration cria somente `eme_whatsapp_events`, privada, com RLS e acesso exclusivo ao servidor. Não modifica imóveis, locações ou financeiro. Esta migration é separada da já aplicada em 0.14.0.
3. Preencher na Vercel os nomes de variáveis documentados em [.env.example](../.env.example). Gerar `WHATSAPP_VERIFY_TOKEN` aleatório com pelo menos 32 caracteres; cadastrar o mesmo valor no painel da Meta. `META_APP_SECRET` é o segredo do app, e o access token é a credencial de produção da Cloud API. Usar a versão da Graph API exibida como suportada pela Meta. Segredos nunca são retornados ao navegador.
4. Fazer novo deploy e usar **Testar conta e número**. O teste verifica que o identificador pertence à conta configurada e que o telefone corresponde ao esperado, sem disparar mensagens. Para um número de teste diferente, alterar explicitamente `WHATSAPP_EXPECTED_NUMBER`.
5. Depois de conferir a configuração, definir `WHATSAPP_WEBHOOK_ENABLED=true` na Vercel, publicar novamente, cadastrar o endereço de retorno e token na Meta e assinar o campo `messages`. O desafio só é aceito com armazenamento disponível. Uma mensagem de teste deverá aparecer em **Conferir eventos recebidos**.

O webhook verifica HMAC-SHA256 sobre os bytes originais, limita o corpo a 256 KiB, confere conta e número e deduplica por identificador do evento. Entregas repetidas não criam novas mensagens. Só responde com sucesso depois da gravação; falha de persistência retorna 503 para permitir reentrega. Texto, referência de mídia e estados de entrega ficam privados; o payload integral não é armazenado e nenhum anexo é baixado automaticamente.

Esta entrega prepara conexão e recebimento administrativo. Não envia mensagens, não faz atendimento autônomo, não vincula automaticamente contatos a imóveis e não fornece coexistência por conta própria. Esses fluxos serão conectados após habilitar e testar o canal real. O cadastro do app e a aprovação/eligibilidade na Meta não podem ser substituídos pela chave da OpenAI.

## Validação técnica

`node --test tests/intelligence.test.mjs tests/whatsapp.test.mjs` verifica contrato Astra, preservação de desativação explícita, assinatura, desafio, limites, escopo, repetição, falha de gravação, ausência de envio e permissões. `tests/whatsapp-workspace.spec.ts` cobre reconhecimento da chave do servidor, configuração incompleta, celular e restrição administrativa. As migrações são verificadas em PGlite antes de execução em produção.

Resultado: 17 testes de IA/WhatsApp e 21 verificações de regressão de API aprovados; quatro testes de navegador aprovados. Dois testes excederam os prazos durante o primeiro carregamento concorrente do ambiente de desenvolvimento e passaram na execução sequencial, sem alterar as expectativas. Build TypeScript/Vite aprovado.

Fontes: [guia oficial Astra](https://developers.openai.com/api/docs/guides/latest-model), [Cloud API da Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api), [webhooks no SDK oficial WhatsApp](https://github.com/WhatsApp/WhatsApp-Nodejs-SDK/blob/main/src/api/webhooks.ts), [runtime Vercel e Request Web](https://vercel.com/docs/functions/runtimes/node-js), [coexistência](https://docs.360dialog.com/docs/resources/phone-numbers/coexistence).
