# Experiência pública por região

A home, as páginas de Vacaria e Praia de Palmas e a ficha de imóvel usam a direção aprovada em 22/10/2026: verde original, fundo claro, arquitetura conceitual navegável, cabeçalho compacto e chat no canto da tela. A catedral de Vacaria é uma composição assistida por IA a partir da referência fornecida; a página identifica a composição. A fotografia de Palmas mantém autoria, data e licença nos créditos.

## Integração

- `src/experience/` contém a experiência independente, carregada pela entrada pública de `src/main.tsx`. Portal, ficha do proprietário, apresentações e páginas legadas específicas continuam em seus módulos anteriores.
- `/api/public/properties` é a única fonte dos anúncios, preços, descrições e fotografias. Não há oferta estática de demonstração nem substituição por anúncios fictícios quando o catálogo falha. Todas as fotos publicadas mantêm dimensão e orientação informadas pelo portal.
- `/api/public/people` atualiza a apresentação da equipe, com os perfis publicados.
- O formulário de contato envia para `/api/public/leads`, com consentimento explícito e chave de repetição estável. Sucesso só aparece depois de `received: true`; uma falha mantém o pedido para nova tentativa.
- O simulador Price/SAC gera uma mensagem de WhatsApp com o link público do imóvel, entrada, juros efetivos anuais, prazo e parcelas estimadas. A pessoa revisa e envia no WhatsApp. Não há envio automático.
- Favoritos e estado escolhido ficam no navegador. A conversa permanece apenas em memória durante a navegação. A voz utiliza SpeechRecognition do navegador, com autorização e revisão da transcrição; há alternativa por texto.

## Limites desta publicação

O M é uma busca guiada por critérios da coleção, com respostas determinísticas. Não foi conectado a um modelo de conversa livre e não é anunciado como IA nesta versão. A conexão de IA pública deve ter configuração, limites e validação próprios; as credenciais privadas da central administrativa não são expostas.

As regiões disponíveis são Vacaria e Praia de Palmas. A coleção de Palmas fica vazia até haver anúncio real publicado para a região. Sem migração de banco ou mudança nas permissões, APIs privadas, credenciais e configuração da Vercel.

## Validação e publicação

Compilação TypeScript/Vite e nove testes de catálogo, fotos, contatos, persistência, repetição e isolamento de corretores aprovados. Conferência visual em 1280, 1024, 390 e 320 pixels, incluindo hero, regiões, catálogo real, galeria, simulador, busca e falha de contato sem criação de registro em produção. Microfone físico não foi acionado na conferência.

Publicação pelo repositório `mateusforest/EME-select`, branch `main`, integrado à Vercel. Base anterior: `486f9e58ca6922e1763ba7b69c61eef0d2f56c86`. Para reverter, reverter apenas o commit desta experiência e republicar; nenhum dado de negócio foi migrado.

`scripts/preview-production.mjs` serve o build local com leitura do catálogo público e bloqueia todos os envios. `scripts/import-approved-experience.mjs` documenta a importação inicial do fragmento aprovado; a manutenção posterior pode editar diretamente `src/experience/`.
