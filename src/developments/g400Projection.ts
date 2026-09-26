export type G400View = 'left' | 'front' | 'right';
export type Point = readonly [number, number];
type Quad = readonly [Point, Point, Point, Point];
export const g400Views = {
  left:{label:'Lateral 1',file:'hero.webp',x:0,y:0,width:1672,height:941,sourceWidth:1672,sourceHeight:941},
  front:{label:'Frente',file:'carousel-apresentation-02.webp',x:402,y:-100,width:960,height:960,sourceWidth:1600,sourceHeight:1600},
  right:{label:'Lateral 2',file:'carousel-apresentation-01.webp',x:465,y:-70,width:839.04,height:1048.32,sourceWidth:1311,sourceHeight:1638},
} as const;
// Every hit region and light is in the same source coordinate system as its image.
const cornerEdges = [
  [[690,573],[744,561],[857,582]],[[692,529],[744,514],[857,538]],
  [[692,484],[744,467],[857,494]],[[692,439],[744,419],[857,449]],
  [[692,391],[744,369],[857,402]],[[692,341],[744,317],[857,353]],
  [[692,284],[744,263],[857,303]],[[692,238],[744,187],[857,246]],
] as const;
const boundaries:Record<G400View,Point[][]>={
  left:cornerEdges.map((edge,i)=>[[560,590-i*34.2],...edge,[1098,601-i*37.8]]),
  front:Array.from({length:8},(_,i)=>i===7?[[345,641],[669,626],[679,502],[905,502],[912,552],[1265,535]]:[[345,1138-i*70],[1265,1138-i*70]]),
  right:[
 [[246,1144],[575,1145],[666,1137],[814,1170],[925,1180],[1032,1182]],
 [[246,1102],[575,1085],[666,1070],[814,1105],[925,1125],[1032,1125]],
 [[246,1060],[575,1015],[666,998],[814,1035],[925,1067],[1032,1068]],
 [[246,1019],[575,945],[666,924],[814,966],[925,1008],[1032,1010]],
 [[246,977],[575,870],[666,847],[814,896],[925,948],[1032,950]],
 [[246,934],[575,792],[666,766],[814,824],[925,886],[1032,891]],
 [[246,891],[575,714],[666,685],[814,754],[925,824],[1032,831]],
 [[246,814],[343,674],[552,570],[675,447],[814,587],[925,632],[1032,652]],
 ],
};
export function g400Regions(view:G400View){return Array.from({length:7},(_,i)=>({floor:i+1,points:[...boundaries[view][i+1],...[...boundaries[view][i]].reverse()].map(p=>p.join(',')).join(' ')}));}
const leftGlazing:Quad[]=[
 [[749,535],[810,548],[810,565],[749,553]],[[705,549],[741,536],[741,553],[705,565]],
 [[749,486],[810,501],[810,522],[749,508]],[[705,502],[741,487],[741,507],[705,522]],
 [[749,438],[810,454],[810,475],[749,460]],[[705,457],[741,439],[741,460],[705,477]],
 [[749,389],[810,407],[810,429],[749,412]],[[705,413],[741,391],[741,412],[705,433]],
 [[749,340],[810,359],[810,381],[749,364]],[[705,365],[741,342],[741,363],[705,386]],
 [[749,288],[810,310],[810,331],[749,308]],[[705,318],[741,290],[741,310],[705,338]],
 [[749,228],[810,254],[810,275],[749,249]],[[705,258],[741,229],[741,249],[705,277]],
];
const column=(x:number,y:number,w:number,h:number,step:number,slope=0,count=7):Quad[]=>Array.from({length:count},(_,i)=>[[x,y+i*step],[x+w,y+i*step+w*slope],[x+w,y+i*step+w*slope+h],[x,y+i*step+h]]);
const glazing:Record<G400View,Quad[]>={
 left:[...leftGlazing,...column(1061,332,26,18,37,.43),...column(574,360,12,16,33,-.6),...column(893,297,12,12,42,.35)],
 front:[...column(369,672,113,31,70),...column(1118,588,117,31,70,0,8),...column(1056,609,19,18,70),...column(919,609,24,18,70),...column(715,686,34,18,70)],
 right:[
 ...[[575,522,590,31],[670,618,694,23],[751,700,772,22],[829,777,846,23],[908,856,917,22],[983,936,988,23],[1056,1013,1059,22],[1107,1089,1119,23]].flatMap(([left,corner,right,h]):Quad[]=>[
 [[585,left],[666,corner],[666,corner+h],[585,left+h]],
 [[676,corner+4],[750,right],[750,right+h],[676,corner+h+4]],
 ]),
 ...[[708,684,712],[769,749,775],[833,814,839],[894,878,902],[953,939,964],[1013,1000,1023],[1070,1059,1084],[1123,1113,1137]].flatMap(([left,corner,right]):Quad[]=>[
 [[866,left],[922,corner],[922,corner+18],[866,left+18]],
 [[928,corner+3],[952,right],[952,right+18],[928,corner+21]],
 ]),
 ...column(321,854,12,16,43,-.4),
 ],
};
const mix=(a:Point,b:Point,t:number):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
export function g400Panes(view:G400View){return glazing[view].flatMap((quad,bay)=>{
 const width=Math.hypot(quad[1][0]-quad[0][0],quad[1][1]-quad[0][1]),count=width>50?4:width>22?2:1;
 return Array.from({length:count},(_,pane)=>{
 const points=[mix(quad[0],quad[1],pane/count+.025),mix(quad[0],quad[1],(pane+1)/count-.025),mix(quad[3],quad[2],(pane+1)/count-.025),mix(quad[3],quad[2],pane/count+.025)];
 return {points:points.map(p=>p.join(',')).join(' '),x:points.reduce((s,p)=>s+p[0],0)/4,y:points.reduce((s,p)=>s+p[1],0)/4,w:width/count,h:quad[3][1]-quad[0][1],lit:(bay*3+pane*2)%7!==0&&(bay+pane)%5!==0,brightness:.65+((bay+pane)%3)*.12};
 });
});}
