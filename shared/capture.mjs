/** Fields suggested by extraction. Public approval and verification flags are never inferred. */
export const captureFields = {
 title:'Título',city:'Cidade',neighborhood:'Bairro',postalCode:'CEP',privateAddress:'Endereço completo · privado',
 price:'Preço informado',area:'Área privativa / útil',totalArea:'Área total',bedrooms:'Quartos',suites:'Suítes',bathrooms:'Banheiros',parking:'Vagas',yearBuilt:'Ano de construção',condominiumFee:'Condomínio mensal',propertyTax:'IPTU anual',occupancy:'Ocupação',costNotes:'Observações de área e despesas',
};
export const captureNumbers=['price','area','totalArea','bedrooms','suites','bathrooms','parking','yearBuilt','condominiumFee','propertyTax'];
export function captureValue(key,value){
 if(!Object.hasOwn(captureFields,key)||typeof value!=='string'||!value.trim()||value.length>1200)throw Error('Campo extraído inválido.');
 if(!captureNumbers.includes(key))return value.trim();
 if(!/^\d+(?:\.\d+)?$/.test(value))throw Error('Valor numérico extraído inválido.');
 const n=Number(value);if(!Number.isFinite(n)||n>1e12||(['bedrooms','suites','bathrooms','parking','yearBuilt'].includes(key)&&(!Number.isInteger(n)||n>(key==='yearBuilt'?2200:1000))))throw Error('Valor numérico extraído inválido.');return n;
}
