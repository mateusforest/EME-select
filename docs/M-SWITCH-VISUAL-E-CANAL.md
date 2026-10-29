# M Switch — visual guiado e canal comercial

Revisão de 29/10/2026. Esta revisão está local; não houve publicação, SQL remoto nem envio real.

## Pronto no código

- Abertura leve com quatro caminhos em faixa horizontal; no celular, grade 2 × 2. Nenhum formulário aberto inicialmente.
- Cada caminho abre explicação específica e três etapas. O cadastro aparece somente após “Continuar”. Fechamento por botão/Escape, foco acessível e preservação do rascunho. Consentimentos são desmarcados ao mudar de finalidade.
- Casa exibida na proporção natural, integrada ao fundo, sem recorte de card.
- O portal existente `/acesso-select/equipe/switch` mantém solicitações, qualificação, cruzamentos, negociações e fila. Inclui agora configuração própria do WhatsApp M Switch e indicação explícita de recursos ainda pendentes.
- Canal provisório: **+55 (85) 99448-8338**. Configuração Switch separada do canal principal. Sem fallback de credenciais. O remetente é consultado na Meta antes de cada envio; número diferente bloqueia a transmissão.
- Webhook dedicado `/api/webhooks/switch-whatsapp`, com assinatura, conta e número conferidos. A consulta de eventos fica limitada ao número do canal.

## Banco — execução manual escolhida pelo responsável

No projeto EXISTENTE `emeselect` (`vjoajqrwqdeujqaognac`):

1. Execute `docs/sql/VERIFICAR-M-SWITCH.sql`. Consulta somente estrutura, não dados pessoais.
2. Para criar o módulo, use `docs/sql/ATIVAR-M-SWITCH.sql` completo, em uma transação. Não aplicar todas as migrations antigas do site. Se houver schema Switch diferente, verificar o resultado da etapa 1 antes de executar.
3. Confira no painel de WhatsApp se “Armazenamento privado” está disponível. Se estiver ausente, aplique SOMENTE `supabase/migrations/20260916_whatsapp.sql`. Não reaplicar essa migration se a tabela já existir.
4. Execute novamente a verificação e clique em “Verificar” no painel administrativo M Switch.

O pacote Switch foi conferido em PostgreSQL embarcado. A sessão Supabase estava desconectada e, a pedido do responsável, nenhuma alteração remota foi tentada.

## WhatsApp — ativação ainda depende da conta Meta

Número informado não equivale a número conectado. O responsável precisa concluir a vinculação oficial do número na própria conta Meta; confirmar coexistência antes se ele já usa o aplicativo Business. Não pedir senha, código ou token no chat.

Definir na hospedagem (apenas servidor):

- `SWITCH_WHATSAPP_EXPECTED_NUMBER=5585994488338`
- `SWITCH_WHATSAPP_ACCESS_TOKEN`
- `SWITCH_WHATSAPP_PHONE_NUMBER_ID`
- `SWITCH_WHATSAPP_BUSINESS_ACCOUNT_ID`
- `SWITCH_WHATSAPP_GRAPH_VERSION` conforme versão indicada pela Meta
- `SWITCH_META_APP_SECRET`
- `SWITCH_WHATSAPP_VERIFY_TOKEN` aleatório >=32 caracteres
- `SWITCH_INVITE_SECRET` aleatório >=32 caracteres, estável para preservar links
- `SWITCH_WHATSAPP_TEMPLATE` aprovado em pt_BR, três parâmetros: cidade, convite e saída
- `CRON_SECRET` aleatório >=20 caracteres

Após cadastro no provedor e publicação deste código: “WhatsApp do M Switch” → “Preparar WhatsApp” → “Testar conta e número” (consulta somente leitura). Configurar retorno `https://www.emeselect.com/api/webhooks/switch-whatsapp` e validar assinatura/recebimento. Habilitar `SWITCH_WHATSAPP_WEBHOOK_ENABLED=true` apenas com armazenamento e credenciais prontos.

Manter `SWITCH_WHATSAPP_ENABLED=false` e `SWITCH_AUTOPILOT_ENABLED=false` até homologação com destinatário de teste autorizado, modelo aprovado e condições comerciais definidas. Os testes desta revisão simulam o provedor; nenhum aviso foi enviado.

## Limite funcional importante

O motor sugere conexões entre imóveis e demandas qualificadas de compradores/investidores. Os convites automáticos implementados hoje são destinados a **corretores/parceiros verificados com autorização**.

Avisos automáticos diretos a compradores, vendedores e investidores, retomada de conversa pelo número comercial e formação de negociações com três ou mais participantes ainda não foram implementados. Não estão marcados como prontos no portal. Para completar essa evolução: criar fila por destinatário/finalidade, templates de cliente separados, preferência/SAIR para clientes, revalidar autorizações e disponibilidade antes de enviar, e acompanhar respostas sem compartilhar contatos entre as partes automaticamente.

## Validação

85 testes de domínio/API/SQL/WhatsApp e 6 de interface passaram. TypeScript, build e pacote SQL passaram. Conferência visual em desktop e celular. Credenciais e banco hospedados não foram homologados.

Fontes verificadas: https://supabase.com/docs/guides/database/postgres/row-level-security e documentação de integração já presente em `docs/M-SWITCH-LANCAMENTO-29-10.md`. A documentação Meta não pôde ser recarregada nesta sessão (HTTP 429); não se alterou a versão Graph para uma versão presumida.
