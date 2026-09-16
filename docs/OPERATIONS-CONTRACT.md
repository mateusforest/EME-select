# Operações reais — contrato de integração

`GET /api/operations` retorna `{version, state, properties, members, history}`. `version` é a revisão concorrente inteira. `state` tem `{version:1,tickets:[],visits:[],leases:[],documents:[],reviews:[]}`. Dados de exemplo não são inseridos. Toda entidade tem `id` UUID e `createdAt`, `updatedAt`, `createdBy`. Objetos vinculados ao imóvel usam **propertyId** (ID real da candidatura/carteira).

`POST /api/operations/commands`: `{requestId:UUIDv4,version:number,command:{type:string,data:object}}`. Retorna snapshot atualizado. Conflito 409 exige recarregar; repetição do mesmo requestId/payload é idempotente. Campos `id` opcionais em criação. Alterações exigem autenticação; corretor só acessa carteira atualmente atribuída. Qualidade/reviews é exclusiva de admin. Admin confirma visitas, autoriza chaves e revisa documentos.

## Atendimento

Ticket: `{id,propertyId,title,contactName,contactPhone,channel:'whatsapp'|'phone'|'email'|'site'|'in_person'|'other',status:'new'|'in_progress'|'waiting'|'closed',assigneeId,priority:'normal'|'high',nextContactAt:string|null,notes,messages:[]}`. Mensagem: `{id,direction:'received'|'sent'|'internal',body,occurredAt,createdAt,createdBy}`. ISO com fuso em datas/hora. **Registra contatos feitos fora do sistema; não envia WhatsApp, e-mail ou SMS.**

- `ticket.save`: dados do ticket; `propertyId` obrigatório, inclusive na criação. Corretor atribui para si; admin escolhe membro real ativo.
- `ticket.message`: `{id:ticketId,direction,body,occurredAt}`. Histórico acrescentado, nunca editado.

## Agenda e chaves

Visit: `{id,propertyId,brokerId,visitorName,visitorPhone,startAt,endAt,status:'requested'|'confirmed'|'completed'|'cancelled',notes,cancelReason,key:{status:'none'|'requested'|'authorized'|'out'|'returned',authorizedAt,authorizedBy,returnDueAt,pickedUpAt,returnedAt,custodianName,identityReference,notes}}`. Todos os campos da chave, exceto status, começam `null`/string vazia. Identificação de custódia é referência interna; não pedir CPF completo.

- `visit.save`: dados da visita. Horário conflita se mesma unidade **ou** mesmo corretor em visita solicitada/confirmada. Alterar uma visita confirmada exige nova confirmação. Chave fora impede editar/cancelar/concluir.
- `visit.confirm` (admin): `{id}`.
- `visit.cancel`: `{id,reason}`.
- `visit.complete`: `{id,notes}`; horário inicial deve ter ocorrido.
- `key.request`: `{id:visitId}`.
- `key.authorize` (admin): `{id,returnDueAt,notes}`; visita confirmada, retorno posterior ao término.
- `key.pickup`: `{id,custodianName,identityReference,occurredAt,notes}`; somente depois de autorização EME.
- `key.return`: `{id,occurredAt,notes}`; posterior à retirada. Nada abre portas, entrega chaves ou aciona terceiros automaticamente.

## Locações

Lease: `{id,propertyId,ownerName,ownerPhone,tenantName,tenantPhone,startDate,endDate,rentCents,managementBps,dueDay,status:'active'|'ended',notes,charges:[],maintenance:[],inspections:[]}`. Cents inteiros; managementBps 0–10000; dueDay 1–28; datas YYYY-MM-DD. Contratos ativos não se sobrepõem para a mesma unidade.

Charge: `{id,month:'YYYY-MM',rentCents,feeCents,ownerDueCents,status:'open'|'received'|'repassed'|'cancelled',dueDate,receivedAt,repassedAt,notes}`. Valor integral mensal; não há cálculo automático de proporcionalidade. Competência gerada permanece independente de alterações futuras no contrato.

- `lease.save`: dados do contrato. Corretores acessam apenas os contratos de imóveis de sua carteira.
- `lease.end` (admin): `{id,reason}`; preserva cobranças abertas.
- `lease.generate`: `{id:leaseId,month,rentCents?:number}`; gera uma vez por mês, opcional valor proporcional conferido manualmente. Não duplica cancelados.
- `lease.receive`: `{id:leaseId,chargeId,occurredAt,notes}`; data real passada/atual.
- `lease.repass`: `{id:leaseId,chargeId,occurredAt,notes}`; apenas após recebimento, registro manual.
- `lease.cancel_charge` (admin): `{id,chargeId,reason}`; somente competência aberta.
- `lease.maintenance`: `{id:leaseId,itemId?:UUID,title,description,status:'open'|'in_progress'|'resolved',estimatedCostCents?:number|null,actualCostCents?:number|null,notes}`.
- `lease.inspection`: `{id:leaseId,itemId?:UUID,kind:'entry'|'periodic'|'exit',scheduledAt,completedAt?:string|null,result:'pending'|'adequate'|'action_required',notes}`.

**Não gera lançamentos no financeiro nesta versão.** A central financeira é o livro de valores da empresa; locação é controle operacional manual. Não confundir honorários EME com aluguel do proprietário; não duplicar recebimentos ao registrar no financeiro.

## Documentos privados

Document: `{id,propertyId,title,category:'authorization'|'ownership'|'contract'|'inspection'|'other',filename,mimeType,sizeBytes,sha256,version:number,previousId:string|null,expiresOn:string|null,status:'pending'|'approved'|'rejected',reviewNotes,reviewedAt,reviewedBy}`. Conteúdo nunca aparece no snapshot, projeção pública, auditoria ou localStorage.

- `document.upload`: `{id?:UUID,propertyId,title,category,filename,mimeType,contentBase64,expiresOn?:YYYY-MM-DD|null,previousId?:UUID|null}` via endpoint de comandos normal. PDF, PNG, JPEG ou WebP, máximo **2 MiB decodificados**. `contentBase64` puro, sem prefixo data URL. Nova versão exige previousId do mesmo imóvel e categoria; versões anteriores preservadas.
- `document.review` (admin): `{id,status:'approved'|'rejected',notes}`. Revisão operacional humana; não certifica regularidade jurídica.
- `GET /api/operations/documents/:id/content`: download autenticado, `Content-Disposition: attachment`, `Cache-Control: private,no-store`, `nosniff`. Corretor precisa continuar responsável pelo imóvel; arquivo não é público.

## Qualidade da equipe

Review: `{id,brokerId,periodStart,periodEnd,scores:{communication:number|null,followup:number|null,reliability:number|null,presentation:number|null},evidence,actionPlan,status:'draft'|'complete'}`. Notas de 0 a 5; desconhecido permanece null. Completar exige quatro notas e evidências. Todo review é humano; nenhuma análise de IA é simulada.

- `review.save` (admin): dados do review.
- Métricas são derivadas de tickets/visitas reais: `operationsMetrics(state,asOf)` exportado de `shared/operations.mjs` retorna `{brokers:[{id,tickets,openTickets,overdueFollowups,visits,completedVisits,cancelledVisits}],totals:{openTickets,upcomingVisits,keysOut,overdueKeys,activeLeases,openMaintenance,pendingDocuments}}`.

## Adapters para integração pelo root

- `attachOperations({db,transaction,stamp,send})` em `server/operations.mjs`; `handle(path,req,res,user,body)` retorna boolean.
- `attachCloudOperations({client,hashOf})` em `server/cloud/operations.mjs`; `handle(path,req,res,user,body,send)` retorna Promise<boolean>.
- Middleware existente deve limitar corpo a aproximadamente 3 MiB (base64 2 MiB + envelope) ou maior e validar Origin/CSRF antes de POST; adapters preservam todas as verificações de autorização.
- Migração `supabase/migrations/20260916_operations.sql`, RPC `eme_save_operations` protegido por service_role e sessão real, revisão concorrente, recibos idempotentes e auditoria; autorização do escopo verificada novamente dentro da transação.
