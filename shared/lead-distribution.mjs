// Integer percentages always total 100. Rebalance every other selected broker
// proportionally; the last point(s) go in stable selection order.
export function equalWeights(ids){return Object.fromEntries(ids.map((id,i)=>[id,Math.floor(100/ids.length)+(i<100%ids.length?1:0)]));}
export function rebalanceWeights(ids,weights,changed,value){
 if(ids.length===1)return {[ids[0]]:100};
 const fixed=Math.max(0,Math.min(100,Math.round(Number(value)||0))),others=ids.filter(id=>id!==changed),remaining=100-fixed;
 const total=others.reduce((n,id)=>n+(weights[id]||0),0),next={[changed]:fixed};let allocated=0;
 others.forEach(id=>{next[id]=Math.floor(remaining*(total?(weights[id]||0)/total:1/others.length));allocated+=next[id];});
 for(let i=0;allocated<remaining;i++,allocated++)next[others[i%others.length]]++;
 return Object.fromEntries(ids.map(id=>[id,next[id]]));
}
export function chooseWeighted(ids,weights,previous={}){
 const available=ids.filter(id=>weights[id]>0),state={},total=available.reduce((n,id)=>n+weights[id],0);let selected=null;
 for(const id of available){state[id]=(previous[id]||0)+weights[id];if(selected===null||state[id]>state[selected])selected=id;}
 if(selected)state[selected]-=total;
 return {selected,state};
}
