# Revisão M Switch — 29/10/2026

Implementação local baseada em `762cfb7`, na branch `fix/switch-integracao-20261029`.
Não houve merge, publicação, SQL remoto, migração de contatos reais ou envio de mensagem.

## Correções

- O autopiloto recupera um convite já salvo quando a criação da fila falha. Reconstrói apenas convites automáticos HMAC válidos, pendentes e não expirados. A chave da fila deriva do convite e impede duas recuperações concorrentes de criar dois envios. Não reinicia mensagens enviadas, com falha ambígua ou em processamento.
- Solicitações, carteiras e profissionais são consultados em páginas ordenadas. A carteira não fica mais limitada aos primeiros 200/300/500 registros. O painel de cruzamentos continua apresentando os melhores 200 candidatos para análise, não todos os pares possíveis.
- O estoque público de venda da EME é consultado em tempo real, com o preço vigente das oportunidades. Imóveis arquivados, excluídos, reservados, ilustrativos, de locação ou sem valor conhecido não entram em convites automáticos. A origem é conferida novamente ao preparar, enviar e autorizar a introdução.
- A gestão pode conectar um contato do CRM após confirmar o uso do perfil no Switch. Só são elegíveis contatos abertos, autorizados, com cidade, tipo e orçamento de compra. A entrada fica em análise, preserva o responsável, não libera marketing e não inventa um aceite do formulário público. O histórico usa `source=crm:<id>` e o lead original permanece intacto. Alterações de perfil ou revogação do contato impedem o uso da cópia nos cruzamentos/envios até revisão.
- Tela pública com Manrope, fundo claro, verde e dourado, monograma oficial, navegação, imagem conceitual do acervo e explicação das etapas. O mesmo cabeçalho e linguagem visual se aplicam à inscrição de profissionais e aos convites.

## Revisão local

`npm run preview:switch` abre o serviço em http://127.0.0.1:4231/switch.
Esse modo bloqueia todas as chamadas `/api/` com aviso explícito. Não simula cadastro bem-sucedido, não usa credenciais e não acessa produção.

Validação: TypeScript, build Vite, 74 testes de domínio/API/SQL e cinco testes de interface em Chromium/Edge. Os testes de interface interceptam APIs, e os de banco usam PGlite em memória. Não equivalem à homologação no Supabase hospedado ou à entrega real de WhatsApp.

Não foi necessário adicionar migração para esta revisão. A ativação original ainda depende do pacote `docs/sql/ATIVAR-M-SWITCH.sql`, da conferência do projeto correto e das variáveis/canais de atendimento. O SQL original foi conferido localmente. Os envios e o autopiloto continuam desativados por padrão.

