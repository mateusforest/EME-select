# Central de relacionamento EME Select

Objetivo: transformar contatos que procuram imóveis em atendimentos contextualizados para os corretores. Canais: WhatsApp, Instagram, Facebook, e-mail, contatos pessoais, indicações e site. O número central da imobiliária será definido depois; e-mail comercial e perfis sociais aguardam indicação do usuário.

## Fluxo proposto

Entrada identificada → pré-atendimento → perfil revisado → seleção compatível → atendimento do corretor → visita/proposta → acompanhamento.

O M deverá se identificar como assistente virtual, entender compra/locação, região, tipo, valor declarado, prazo e requisitos. Perguntas curtas, sem repetir o que já foi respondido. Se a pessoa pedir um corretor, quiser visitar/propor ou houver dúvida que o catálogo não resolve, encaminhar com resumo e histórico. A qualificação descreve a busca; não estima renda, crédito nem o valor da pessoa para a empresa.

## Primeira entrega construída, ainda local

- Cadastro pela equipe com WhatsApp, e-mail opcional, origem e referência da indicação/campanha. Mesmo telefone em atendimento não cria outro lead. Atribuição inicial ao usuário que cadastrou; gestão pode redistribuir.
- Perfil de busca persistido, revisão com controle de versão e histórico. Campos desconhecidos ficam em branco.
- IA conectada ao provedor já configurado na Central de IA: organiza trechos da conversa, apresenta evidências literais e perguntas restantes. A equipe revisa antes de salvar. Não roda sem conexão habilitada.
- Correspondência com o catálogo publicado, considerando preços de oportunidades. Imóveis arquivados, apagados, reservados ou de acesso individual não entram nessa seleção pública. Visita e disponibilidade ainda precisam de confirmação.
- Rascunhos editáveis para entender a busca, apresentar opções, retomar conversa e convidar para solicitar Acesso Select. Copiar não envia e não registra contato realizado.
- Atendimento, novidades por WhatsApp e novidades por e-mail têm autorizações distintas. Desconhecido é o padrão. Não são ativadas campanhas por preencher a ficha.
- Corretores consultam e alteram apenas leads atribuídos; a gestão vê o conjunto. A carteira de imóveis continua compartilhada conforme a regra existente.

Esta entrega não liga os canais externos, não envia mensagens nem aprova cadastros. A IA foi verificada com respostas controladas do provedor; não foi feita uma análise real de conversa de cliente. A prévia utiliza uma base temporária e dados marcados como demonstração.

## Ativação em etapas

| Etapa | Resultado | O que falta |
| --- | --- | --- |
| 1. Organização e qualificação | Ficha, origem, correspondências e próximos passos | Aplicar o SQL desta entrega, publicar a versão aprovada e testar a conexão de IA |
| 2. WhatsApp central | Receber mensagens na ficha e fazer pré-atendimento | Escolher número, conectar conta empresarial/API, concluir ponte entre webhook e leads, fila de respostas e transferência humana |
| 3. Redes sociais e e-mail | Identificar campanhas, Directs e respostas | Informar contas oficiais, conectar permissões disponíveis, configurar remetente e recebimento; validar cada integração |
| 4. Oportunidades e acompanhamento | Avisos relevantes e retomadas consentidas | Preferências, frequência aprovada, modelos de mensagem, agendador, bloqueios e confirmação de entrega |

O código já tem recepção de eventos do WhatsApp, mas isso não significa que o número esteja conectado nem que cada mensagem já vire um lead. Instagram e e-mail não têm recepção automática nesta entrega. Publicações sociais e anúncios pagos ficam fora da primeira ativação; podem levar ao WhatsApp ou a uma página de captação com origem identificada.

## Sequências a validar antes de ativar

1. **Primeiro contato:** responder ao interesse recebido, completar somente as informações ausentes e oferecer atendimento humano.
2. **Seleção:** apresentar até três imóveis compatíveis, com valores atuais; registrar interesse/recusa para ajustar a busca. Não prometer exclusividade, valorização ou disponibilidade.
3. **Sem opção no momento:** pedir autorização específica para avisar quando surgir algo compatível. Uma indicação não equivale a essa autorização.
4. **Novo imóvel ou mudança de preço:** verificar catálogo e acesso novamente no momento do envio, comparar com o perfil, evitar repetição por pessoa/imóvel/versão e respeitar frequência e horários aprovados.
5. **Retomada:** começar com uma única retomada no prazo combinado; parar ao receber resposta, recusa ou quando o corretor assumir. Cadências adicionais serão aprovadas antes da ativação.
6. **Acesso Select:** convidar para solicitar cadastro; a equipe continua aprovando o acesso. Documentos e seleção reservada exigem vínculo/permissão no servidor.

Para o WhatsApp Business Platform, conversas iniciadas pela empresa usam modelos aprovados; respostas livres dependem da janela de 24 horas após a mensagem do usuário. Deve haver saída clara para atendimento humano e respeito à recusa de contato. Fonte: [política oficial de mensagens do WhatsApp](https://business.whatsapp.com/policy), consultada em 26/10/2026. As regras efetivas de cada canal devem ser revalidadas na ativação.

## Contrato da automação seguinte

Eventos recebidos terão identificador do provedor e deduplicação antes da criação/atualização do lead. Mensagens não serão enviadas diretamente pelo navegador. Uma fila no servidor deverá registrar mensagem, canal, finalidade, consentimento, versão do imóvel, responsável, estado de entrega e erro.

Antes de cada envio: conferir consentimento atual, aprovação do acesso quando aplicável, pausa humana, horário/frequência, estado do lead, disponibilidade do imóvel e regra vigente do provedor. Repetições após falha usam a mesma referência de idempotência. Nenhum envio é marcado como entregue só porque entrou na fila. A futura automação deverá conciliar as preferências do lead e do Acesso Select por identidade confirmada; não reativar uma recusa ao importar ou recadastrar um contato. Opt-out suspende mensagens futuras imediatamente; o corretor pode assumir e interromper a IA sem perder o histórico.

Métricas propostas: contatos por origem, tempo até primeiro atendimento, perfis completos, seleções apresentadas, respostas recebidas, visitas solicitadas/confirmadas, propostas e conversões. Atribuição por campanha deve distinguir clique, contato e negócio; não tratar clique como lead.

## Banco e validação

Migração: `supabase/migrations/20261026_buyer_qualification.sql`; cópia para execução manual: `docs/sql/ATIVAR-CAPTACAO-INTELIGENTE.sql`. Não altera a função histórica de recebimento/distribuição e não redistribui leads existentes. A interface detecta a migração pendente e mantém o acompanhamento antigo disponível.

Verificações: testes de regras, API local, controle de acesso, duplicação, conflitos de edição, SQL executado duas vezes em PostgreSQL local de teste, catálogo público/preço vigente, falha do provedor e rascunhos sem autorização. Conferência visual em desktop e celular feita na prévia isolada; sem mensagens reais.
