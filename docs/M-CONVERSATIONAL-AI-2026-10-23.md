# M: conversa com o catálogo publicado

O chat público usa a Responses API da OpenAI e a conexão já configurada na Central de IA. A busca por palavras-chave do navegador foi substituída por conversa contextual. Busca escrita, transcrição de voz e sugestões iniciais entram no mesmo atendimento.

## Operação

- `POST /api/public/chat`: mensagens de usuário/assistente e IDs de contexto; não exige login no portal.
- `GET /api/public/chat`: somente `{ available }`, sem modelo, credenciais ou configuração privada.
- O M recebe ferramentas de leitura `search_catalog` e `property_details`. A busca combina tipo, região, finalidade, preços, dormitórios, vagas e características registradas.
- Somente o snapshot publicado chega ao serviço, projetado numa lista explícita de campos. Rascunhos, contatos de proprietários e documentos não entram no contexto.
- Recomendações têm até três IDs consultados. Cards e links são resolvidos pelo servidor/site, não pelo texto gerado. Uma alteração no catálogo durante a resposta exige nova consulta.
- Sem correspondência, o M informa a falta de opções e pede permissão para flexibilizar critérios. Não confirma disponibilidade, negociação, visitas ou crédito.
- Visitas e contato continuam sujeitos à ação do visitante. O WhatsApp recebe um texto preparado com o resumo e os imóveis; o envio é feito pelo visitante. O formulário registra o resumo somente com autorização de contato.

## Configuração

Reutiliza a chave criptografada do portal ou `OPENAI_API_KEY` no servidor, conforme a configuração existente. Respeita a desativação explícita da Central de IA. `OPENAI_CHAT_MODEL` permite um modelo específico do chat; sem ele, usa o modelo configurado. `EME_PUBLIC_CHAT_ENABLED=false` desliga apenas o M público. Nenhuma credencial é enviada ao cliente.

Há limites persistentes de 30 mensagens por IP e 200 no total por janela de 15 minutos, usando o limitador existente (SQLite local / RPC Supabase em produção). O histórico enviado tem no máximo 24 mensagens e 20 mil caracteres; a mensagem do visitante tem limite de 1.500 caracteres. Cada turno usa no máximo quatro chamadas de modelo/ferramentas, com prazo de resposta limitado.

O histórico fica na memória da página. Não é gravado no portal ou em localStorage. `store:false` desativa o armazenamento de respostas da API; isso não representa uma promessa sobre toda retenção do provedor. A informação de privacidade do site foi atualizada. Nova conversa cancela a requisição pendente e ignora respostas tardias. Falhas exibem uma opção explícita de tentar novamente, sem simular resposta de IA.

## Validação

- `tests/public-chat.test.mjs`: entrada pública, projeção de dados, filtros, chamadas de ferramentas, IDs inválidos, falhas do provedor, credenciais criptografadas, limites, alteração de publicação durante resposta, handlers local/cloud, contexto, cancelamento e repetição sem duplicar mensagem.
- Regressão de inteligência, portal, leads, publicação, coleção e oportunidades.
- TypeScript e build de produção.
- Conferência visual do chat compacto, minimização, reinício e recuperação de erro.

Referências oficiais: [Function calling](https://developers.openai.com/api/docs/guides/function-calling), [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Conversation state](https://developers.openai.com/api/docs/guides/conversation-state).
