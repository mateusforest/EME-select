# M Switch — Plano de ativação e primeiro caixa | 29/10/2026

**Estado de 28/10/2026:** código da M Switch na PR #2 (branch `feat/m-switch-matching-v1`), sem merge e sem validação em Supabase de produção ou WhatsApp real. Esta lista não significa que algo será executado sozinho até a ativação. Não inventar clientes, oportunidades nem faturamento.

## Portão 1 — Homologar infraestrutura sem clientes reais
**Responsável:** administrador da operação / desenvolvedor, com acesso às credenciais.

- [ ] Criar backup do banco e escolher projeto correto no Supabase (sem copiar segredos para o chat).
- [ ] Revisar e executar `docs/sql/ATIVAR-M-SWITCH.sql` em ambiente de homologação, conferir funções e permissões. A migration contém RLS e 6 tabelas; testes automatizados não substituem a conferência no Supabase real.
- [ ] Abrir a prévia do PR; acessar `/switch`, `/switch/profissionais` e portal `/acesso-select/equipe/switch`.
- [ ] Verificar `GET /api/switch/readiness` como administrador: tabelas e segredos básicos. Nunca expor endpoint público.
- [ ] Simular com números inventados e dados sintéticos: um proprietário com titularidade/autorização revisadas, um comprador com **intenção e orçamento confirmados** e um profissional com CRECI e opt-in revisados. Confirmar matching privado sem dados pessoais expostos.
- [ ] Testar idempotência de POST, bloqueio de perfil sem acesso, reimportação, alteração concorrente, expiração de convite, pausa de WhatsApp e versão de ficha.
- [ ] Testar recusa de autorização e opt-out em toda a cadeia. Sem mensagens reais nesta etapa.
- [ ] Liberar merge/deploy somente depois do checklist e revisão de segurança.

## Portão 2 — WhatsApp oficial
- [ ] Número empresarial, token, app secret, webhook e conta da Meta verificados, sem alterar o canal atual sem plano de continuidade.
- [ ] Aprovar template específico `SWITCH_WHATSAPP_TEMPLATE` em pt_BR com três parâmetros: cidade, URL privada do convite e link de saída.
- [ ] Configurar segredo HMAC `SWITCH_INVITE_SECRET` (>=32) e `CRON_SECRET` (>=20) no servidor; nunca usar variáveis `VITE_` para segredos.
- [ ] Confirmar webhook com `WA Business Platform` oficial; manter `SWITCH_WHATSAPP_ENABLED=false` até teste com conta/telefone empresarial e opt-in controlado.
- [ ] Testar submissão à Meta e retorno do webhook, inclusive `SAIR`. Distinguir **submetido**, **entregue** e **lido** (confirmação de entrega ainda não foi integrada à M Switch).
- [ ] Só ativar `SWITCH_AUTOPILOT_ENABLED=true` se houver CRECI/contratos válidos, modelo aprovado, consentimento e tabela de comissão pactuada por escrito.

## Portão 3 — Ativar aquisição sem depender de parceria fria
A rede não cria demanda do nada. Começar com oferta direta e compradores voluntários:
- **Oferta:** imóveis próprios da M Select já regularizados para divulgação e cadastrados/compartilhados com consentimento. Cadastro manual mínimo; outros estoques por importação CSV autorizada.
- **Demanda:** clientes atuais que expressaram interesse e podem ser contatados segundo a autorização; convite público de cadastro na rota `/switch`; posts orgânicos próprios; indicações espontâneas. **Não importar números de terceiros para disparos.**
- **Conversão:** equipe habilitada confirma necessidade/orçamento, revisa disponibilidade e procura até 5 correspondências relevantes; evita "compra confirmada" sem prova.
- **Oferta a profissionais:** divulgação da inscrição pública `/switch/profissionais` em redes e canais próprios, sem abordagem não solicitada; somente perfis verificados opt-in.
- **Proposta:** apresentar a remuneração antes do contato; obter instrumento contratual; só então a equipe autoriza a introdução das partes.
- **Financeiro:** reconhecer receita somente quando comprovada, não quando um match é gerado.

## Meta útil para o primeiro dia (não promessa)
Concluir a ativação técnica, receber 3–10 interesses legítimos, validar um possível encaixe e agendar uma conversa comercial. A chance de liquidar corretagem imobiliária no mesmo dia é baixa sem operação quase fechada.

## Alternativa para caixa mais rápido — serviço independente
Proposta **a validar comercial e juridicamente**, sem confundir com corretagem por resultado: `M Select — Revisão Comercial Express` para imóveis que já estão parados. Entrega: diagnóstico de apresentação do anúncio, clareza do público-alvo, estudo orientativo de posicionamento (não laudo), lista de correções de foto/texto e plano de divulgação. Preço de teste **R$ 390–790 por relatório**, mediante escopo e contrato escrito, sem promessa de venda, sem avaliação pericial e sem inventar comparáveis.

Um proprietário que aceitar e pagar pode gerar caixa antes de uma venda, mas não há compra garantida e **não existe checkout nem PIX automático integrado**. Validar previamente requisitos de CRECI, conflito de interesses e relação com eventual comissão futura.

## Indicadores de verdade
Receita recebida líquida; leads com opt-in; origem; compradores verificados; ofertas revisadas; convites enviados e efetivamente entregues; CRECI conferido; condições aceitas; contratos assinados; negócio fechado; comissão recebida. **Match e pedido de análise não são faturamento.**

## Critério de decisão
Se o Supabase ou Meta real falhar, manter o módulo fora de produção. O plano comercial pode avançar apenas com operações lícitas autorizadas e atendimento humano habilitado, sem prometer sistema autônomo ativo.
