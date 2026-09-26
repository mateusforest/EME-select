type Point = readonly [number, number];
type Quad = readonly [Point, Point, Point, Point];
// Coordinates traced against hero.webp, in its native 1672 × 941 projection.
// Follow the wraparound balcony, not the recessed timber bays behind it.
const edges = [
  [[690,573],[744,561],[857,582]],
  [[692,529],[744,514],[857,538]],
  [[692,484],[744,467],[857,494]],
  [[692,439],[744,419],[857,449]],
  [[692,391],[744,369],[857,402]],
  [[692,341],[744,317],[857,353]],
  [[692,284],[744,263],[857,303]],
  [[692,238],[744,187],[857,246]],
] as const;
export const g400FloorRegions = Array.from({length:7},(_,index)=>{
  const bottom=edges[index],top=edges[index+1];
  return {floor:index+1,points:[...top,...[...bottom].reverse()].map(p=>p.join(',')).join(' '),edge:`M ${bottom.map(p=>p.join(',')).join(' L ')}`};
});
const glazing:Quad[]=[
  [[749,535],[810,548],[810,565],[749,553]],[[705,549],[741,536],[741,553],[705,565]],
  [[749,486],[810,501],[810,522],[749,508]],[[705,502],[741,487],[741,507],[705,522]],
  [[749,438],[810,454],[810,475],[749,460]],[[705,457],[741,439],[741,460],[705,477]],
  [[749,389],[810,407],[810,429],[749,412]],[[705,413],[741,391],[741,412],[705,433]],
  [[749,340],[810,359],[810,381],[749,364]],[[705,365],[741,342],[741,363],[705,386]],
  [[749,288],[810,310],[810,331],[749,308]],[[705,318],[741,290],[741,310],[705,338]],
  [[749,228],[810,254],[810,275],[749,249]],[[705,258],[741,229],[741,249],[705,277]],
];
const interpolate=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
export const g400WindowPanes=glazing.flatMap((quad,bay)=>Array.from({length:4},(_,pane)=>{
  const start=pane/4+.014,end=(pane+1)/4-.014;
  return {points:[interpolate(quad[0],quad[1],start),interpolate(quad[0],quad[1],end),interpolate(quad[3],quad[2],end),interpolate(quad[3],quad[2],start)].map(p=>p.join(',')).join(' '),brightness:[.36,.08,.5,.24,.06,.31,.17][Math.floor(bay/2)]*(pane%3===0?.45:1)};
}));
