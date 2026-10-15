import {peopleRecordId} from './people.mjs';
import {developmentRecordId} from '../shared/development.mjs';

// Listings and evaluations share the same identity. Prefer the current listing
// fields without renaming the IDs already referenced by historical ledger rows.
export function financeProperties(rows) {
  const properties = new Map();
  const text = value => typeof value === 'string' ? value.trim() : '';
  for (const row of rows) {
    if ([peopleRecordId, developmentRecordId].includes(row.id) || ['directory', 'development'].includes(row.kind)) continue;
    const source = row.listingTitle !== null && row.listingTitle !== undefined ? 'listing' : 'evaluation';
    const property = {
      id: row.id,
      title: text(row.listingTitle) || text(row.title) || 'Imóvel sem título',
      city: text(row.listingCity) || text(row.city),
      type: text(row.listingType) || text(row.type),
      source,
      assigneeId: row.assignee_id || null,
    };
    if (!properties.has(row.id) || source === 'listing') properties.set(row.id, property);
  }
  return [...properties.values()].sort((a, b) => Number(b.source === 'listing') - Number(a.source === 'listing') || a.title.localeCompare(b.title, 'pt-BR') || a.id.localeCompare(b.id));
}
