export const opportunityDoor='<svg viewBox="0 0 40 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M6 11 25 4v39L6 37Z"/><path d="M25 9h4v29h-4"/><path d="M35 1 36 5 39 6 36 7 35 11 34 7 31 6 34 5Z" stroke-width="1"/></svg>';
export function opportunityBadge(){const badge=document.createElement('span');badge.className='eme-opportunity-badge';badge.setAttribute('role','img');badge.setAttribute('aria-label','Oportunidade EME');badge.title='Oportunidade EME';badge.innerHTML=opportunityDoor;return badge;}
export function markOpportunity(target,property){if(!target)return;target.querySelectorAll('.eme-opportunity-badge').forEach(el=>el.remove());if(property?.opportunity)target.append(opportunityBadge());}
export function brandOpportunities(root){
 root.querySelectorAll('.eo-opportunities [data-lucide="gem"],.eo-opportunities [data-lucide="sparkles"],.er-region [data-lucide="gem"]').forEach(el=>{const span=document.createElement('span');span.className='eme-opportunity-symbol';span.innerHTML=opportunityDoor;el.replaceWith(span);});
 const heading=root.querySelector('.eo-preview-heading h2');if(heading&&!heading.querySelector('.eme-opportunity-symbol')){const icon=document.createElement('span');icon.className='eme-opportunity-symbol';icon.innerHTML=opportunityDoor;heading.prepend(icon);}
}
