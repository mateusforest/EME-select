// The inventory is shared by staff. Private acquisition data and write rights are not.
export function staffListing(item, user, assigneeId, responsible = '') {
 const owns = user.role === 'admin' || user.id === assigneeId;
 const draft = {...item.draft};
 if (!owns) for (const key of ['privateAddress','ownerName','ownerContact','sourceNotes','sourceReference','sourceUrl','requesterRole','documentationStatus','authorizationStatus']) draft[key] = '';
 return {...item, draft, responsible, canEdit: owns && (user.role === 'admin' || !item.published && !['Entrada aprovada','Não selecionado'].includes(item.stage))};
}

// PostgREST caps a single response. Fetch every page instead of silently truncating a portfolio.
export async function allRecords(rest, query) {
 const result = [];
 for (let offset = 0; ; offset += 500) {
  const rows = await rest(query + '&limit=500&offset=' + offset);
  result.push(...rows);
  if (rows.length < 500) return result;
 }
}
