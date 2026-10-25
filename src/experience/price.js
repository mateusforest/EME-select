// Text nodes only: prices never become markup from editorial input.
export function renderPrice(target,property){
 target.replaceChildren();target.classList.toggle('has-discount',!!property.originalPrice);
 if(property.originalPrice){const previous=document.createElement('del');previous.className='eme-price-before';previous.textContent=property.originalPrice;previous.setAttribute('aria-label','Valor anterior: '+property.originalPrice);target.append(previous);}
 const current=document.createElement('span');current.className='eme-price-current';current.textContent=property.price;target.append(current);
 return target;
}
