// One queue slot per deal, including concurrent retries with different recipients.
// Never reset submitted, failed or sending jobs: an ambiguous provider response
// needs human reconciliation, not an automatic second message.
export async function queueSwitchInvite(client, deal, professional) {
  const existing=await client.rest('eme_switch_outbox?deal_id=eq.'+deal.id+'&select=id&limit=1');
  if(existing.length)return false;
  const rows=await client.request('/rest/v1/eme_switch_outbox?on_conflict=id',{
    method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},
    body:{id:deal.id,deal_id:deal.id,professional_id:professional.id,phone:professional.phone,status:'pending'}
  });
  return !!rows?.length;
}
