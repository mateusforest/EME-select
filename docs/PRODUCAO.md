# EME Select — estado da implementação

## Atualização 0.13.0 — Portal único

`/portalselect` reúne as áreas funcionais e o escopo das áreas em desenvolvimento, com a mesma autenticação e navegação. A demonstração paralela foi retirada do código publicado; links antigos `/portalselect/demo/...` encaminham à área correspondente e exigem acesso da equipe. O padrão de curadoria usa a política atual Select V2, enquanto dossiês antigos preservam seu histórico. Financeiro, equipe e qualidade da equipe são exclusivos dos administradores. Veja [PORTAL-130.md](PORTAL-130.md) e [FINANCEIRO-012.md](FINANCEIRO-012.md).

## Histórico 0.10.0 — Fichas e percurso fotográfico

Produção usa API na Vercel, Supabase Auth, banco Postgres e armazenamento privado de fotos. O formulário do site cria fichas em Recebido com protocolo. A equipe completa o cadastro em cinco etapas, organiza fotos por ambiente e abre a prévia em tela inteira. O apartamento enviado foi cadastrado privadamente em Em avaliação, sem aprovação ou publicação. Veja [PORTAL-100.md](PORTAL-100.md). `npm start` continua usando SQLite local independente.

## Histórico 0.8.0 — Cadastro e anúncio real

O portal local agora recebe imóveis e fotos em `/portalselect/imoveis`, oferece prévia privada no padrão editorial do site e publica no catálogo do servidor após curadoria e confirmação do administrador. A galeria utiliza transições progressivas. Dados do proprietário ficam separados da divulgação. Consulte [PORTAL-080.md](PORTAL-080.md) para o fluxo, armazenamento e limites. A Vercel continua com frontend estático, sem conexão com o banco local.

## Histórico 0.7.0 — Curadoria e decisão

O dossiê real agora reúne notas com evidências, verificações humanas, pendências e decisão de entrada na carteira. A régua permanece explicitamente experimental. A aprovação exige administrador, revisão e motivo; não publica anúncios. Consulte [PORTAL-070.md](PORTAL-070.md). IA e consultas externas ainda não estão conectadas.

## Histórico 0.6.0 — Base local da equipe

O acesso real em `/portalselect` agora possui contas individuais, permissões, cadastro de avaliações, histórico no servidor e banco SQLite privado. A primeira conta é criada pelo proprietário na tela. A demonstração anterior foi movida para `/portalselect/demo`. Consulte [PORTAL-060.md](PORTAL-060.md) para operação, cópias de segurança e limites. IA, documentos, relacionamento e administração mensal ainda aguardam conexão.

## Histórico 0.5.0 — Portal Select

Criada a rota `/portalselect`, com interface própria, avaliações, dossiês, tarefas, rascunhos de relacionamento, demonstrativos de locação e áreas de qualidade e IA. É uma prévia funcional com dados fictícios e persistência neste navegador. Não possui login, banco compartilhado, IA conectada nem operações financeiras reais. Consulte [PORTAL-050.md](PORTAL-050.md) para escopo, rotas e limites. O site público permanece com os mesmos cenários e acervo ilustrativo.

## O que esta etapa entrega

Atualização 0.4.1: home com quatro tipologias reconhecíveis, novo cenário Condomínios e seção Explore os ambientes. Condomínios é uma coleção transversal de três imóveis existentes, classificados explicitamente como horizontais ou verticais. O usuário adiou o 3D e o piloto Marble. Nenhum mundo Marble foi gerado, exportado ou integrado.

Uma aplicação de frontend navegável, com a identidade aprovada da EME Select e os cenários de início, Litoral, Serra, Urbano, Condomínios, Comercial, Terrenos e Industrial. Os pontos interativos dos cenários conduzem à exploração dos imóveis, detalhes e solicitação de visita. O acervo contém **18 imóveis demonstrativos**, com opções de compra e locação. As coleções de terrenos e condomínios contêm somente exemplos de compra nesta versão.

As imagens dos ambientes são ilustrativas, criadas para demonstrar a experiência visual. Os marcadores acompanham a fotografia durante aproximação e arraste. Sala, Varanda e Cozinha selecionam trechos da imagem interna original. Não são novos pontos de vista, captura espacial, planta de loteamento ou simulação de disponibilidade. Os modelos de estudo Three.js continuam preservados nos arquivos, fora da experiência ativa.

A busca combina texto e filtros locais de ambiente, operação e tipo. Ela consulta os dados presentes na aplicação; não consulta a internet, não conversa com um modelo de IA e não interpreta qualquer pedido complexo como um assistente imobiliário.

Há apresentação de características, valores ilustrativos, motivos de seleção e etapas demonstrativas de documentação. Os formulários permitem revisar a solicitação e abrir o WhatsApp comercial **5554999902688 — (54) 99990-2688**. O visitante confirma o envio no próprio WhatsApp. A equipe ainda precisa responder e confirmar horários.

A apresentação opcional da marca foi construída em HyperFrames e GSAP, com reprodução controlada pelo visitante. Os arquivos de produção estão em `public/motion/`; a composição editável e suas verificações ficam em `motion/`.

## Limites atuais

| Área | Situação desta versão |
| --- | --- |
| Catálogo | Anúncios reais após revisão e publicação no portal; 18 exemplos preservados nos cenários, identificados como demonstrativos |
| Backend e banco de dados | Vercel + Supabase em produção; SQLite privado independente em desenvolvimento |
| Autenticação e painel da equipe | Portal único em /portalselect; links antigos da demonstração encaminham ao portal autenticado |
| Financeiro | Lançamentos, contas manuais, comissões, sócios, caixa, projeções e DRE gerencial; sem conexão bancária ou execução de pagamentos |
| Formulários | Envio de imóvel gravado no portal com protocolo; solicitação de visita via WhatsApp |
| Agenda | Solicitação de horário sujeita à confirmação humana; sem reserva de horário |
| IA de atendimento e curadoria | Ainda não implementada; não há avaliação, captação ou análise automatizada real |
| Documentação | Portal registra referências e conferências humanas; recebe fotos, mas não documentos jurídicos. Anúncios reais orientam consultar a equipe |
| Visita do imóvel | Percurso de fotos reais em tela inteira, capítulos e transições; sem captura espacial ou medição comercial. 3D adiado |
| Venda e locação | Experiência de descoberta e contato; sem propostas vinculantes, pagamentos, contratos ou assinatura eletrônica |
| Publicação | Administrador publica após curadoria; API na Vercel, banco e fotos no Supabase |

As seções de curadoria e documentação não atestam que um imóvel está regular, sem débitos, sem processos ou apto para venda. A marca não apresenta nesta etapa uma comprovação de ser a primeira ou única operação de seu segmento.

## Arquitetura sugerida para a próxima etapa

1. **Catálogo administrado pela equipe.** Um backend recebe imóveis, preços, disponibilidade, responsáveis e históricos de revisão. Um painel com contas individuais e permissões permite cadastrar, revisar e publicar. O frontend passa a consumir somente os registros aprovados.
2. **Mídia e documentação separadas.** Fotografias e tours autorizados podem ser públicos. Documentos de proprietários e análises internas ficam em armazenamento privado, com acesso restrito, prazo de retenção e registro de acesso. Não colocar documentos sensíveis dentro de `public/`.
3. **Atendimento e agenda.** Registrar solicitações no backend com estados claros, responsável e histórico. Integrar agenda e canal comercial sem transformar uma intenção de visita em horário confirmado antes da validação necessária.
4. **IA como apoio operacional.** Processar dados autorizados para extração de características, identificação de lacunas e preparação de comparativos. Cada resultado precisa guardar fontes, data, limitações e revisão. O modelo não publica o imóvel, define sozinho condições comerciais ou conclui a análise jurídica.
5. **Curadoria com decisões rastreáveis.** Separar critérios de mercado, qualidade física, documentação, apresentação e viabilidade comercial. Cada etapa tem responsável humano e critérios de aprovação. Pendências permanecem visíveis à equipe até a resolução documentada.
6. **Experiência espacial por imóvel.** Incorporar tours 360° ou modelos 3D quando houver captura real, autorização e qualidade técnica. Manter alternativa em fotos, planta e texto, especialmente em dispositivos com menor capacidade e para acessibilidade.

Uma implementação possível é manter React no frontend, adicionar uma API em TypeScript, banco relacional, armazenamento de objetos e uma fila para processamentos demorados. A seleção de provedores deve considerar o volume do piloto, integração com o EME SaaS, separação entre empresas, controles de acesso e custo operacional. Nenhum desses serviços está contratado ou integrado nesta entrega.

## Antes de publicar um catálogo comercial

- Substituir cada registro demonstrativo por um imóvel autorizado, com fotografias correspondentes e dados conferidos: operação, preço, área, características, disponibilidade e despesas aplicáveis.
- Definir quem pode cadastrar, aprovar, alterar e retirar um anúncio; manter histórico e datas das revisões.
- Conferir a apresentação institucional da empresa, contatos, identificação profissional aplicável, termos de uso e informações sobre tratamento dos dados com os responsáveis pelo negócio.
- Definir quais verificações documentais serão feitas, com quais fontes e por quais responsáveis. Publicar estados precisos, como “em análise” ou “documento conferido em determinada data”, conforme o trabalho efetivamente realizado.
- Configurar domínio, HTTPS, hospedagem, cópias de segurança, monitoramento de falhas e processo de atualização do catálogo.
- Testar o contato comercial, os formulários, a experiência em celular, teclado, movimento reduzido, links compartilhados e desempenho com imagens finais.
- Se houver armazenamento de leads, implementar validação no servidor, prevenção de abuso, permissões, retenção e informação clara ao visitante antes da coleta.

O primeiro lançamento pode operar com catálogo pequeno, atualização manual e atendimento humano pelo WhatsApp. Integrações de IA, captação, documentos e tours entram conforme a operação conseguir sustentar a qualidade das informações e do atendimento.
