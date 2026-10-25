export function equalWeights(ids:string[]):Record<string,number>;
export function rebalanceWeights(ids:string[],weights:Record<string,number>,changed:string,value:number):Record<string,number>;
export function chooseWeighted(ids:string[],weights:Record<string,number>,previous?:Record<string,number>):{selected:string|null;state:Record<string,number>};
