// Source coordinates from the commercial Tipo 5 plan. Heights remain illustrative.
export type PlanPoint = [number, number];
export type Wall = [number, number, number, number];
export const tipo5Outline: PlanPoint[] = [[810,308],[1155,308],[1155,285],[1525,285],[1525,315],[1700,315],[1700,615],[1430,615],[1430,690],[1390,690],[1390,800],[700,800],[700,610],[810,610]];
export const tipo5Walls: Wall[] = [
  [1155,285,1525,285],[1700,315,1700,615],[1430,615,1700,615],
  [1430,615,1430,690],[1390,690,1430,690],[1390,690,1390,800],
  [700,800,1120,800],[1190,800,1390,800],[700,610,700,800],[700,610,810,610],[810,595,810,610],
  [1155,315,1155,570],[1155,570,1345,570],[1345,315,1345,490],[1345,548,1345,570],
  [1430,315,1430,500],[1345,500,1370,500],[1420,500,1430,500],
  [1515,315,1515,500],[1515,552,1515,615],[1430,500,1460,500],[1500,500,1515,500],
  [1220,700,1390,700],[1220,700,1220,735],[1220,780,1220,800],
  [810,610,810,655],[810,720,810,800],
];
export const tipo5Windows: Wall[] = [[820,315,1150,315],[810,325,810,595],[1165,315,1335,315],[1525,322,1690,322]];
// Collision volumes cover the footprint of large furniture, not their decorative trim.
export const tipo5Obstacles: [number,number,number,number][] = [
  [825,325,1035,382],[825,365,880,504],[942,434,1018,484],[1117,365,1138,515],
  [818,766,946,798],[813,712,845,780],[925,632,966,698],[887,651,927,700],
  [996,623,1144,750], // dining table and chairs
  [1170,353,1306,473],[1560,359,1697,479], // beds, headboards
  [1184,539,1316,567],[1666,520,1696,603], // wardrobes
  [1362,438,1408,466],[1447,438,1493,466],[1288,765,1333,790],
  [737,624,780,659],[742,741,783,779],
];
const clearance=14,step=10;
const distance=(a:PlanPoint,b:PlanPoint)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function inPolygon([x,y]:PlanPoint){let inside=false;for(let i=0,j=tipo5Outline.length-1;i<tipo5Outline.length;j=i++){const a=tipo5Outline[i],b=tipo5Outline[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function segmentDistance([x,y]:PlanPoint,[x1,y1,x2,y2]:Wall){const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-x1-t*dx,y-y1-t*dy);}
export function canWalk(point:PlanPoint){
  const [x,y]=point;
  if(![[0,0],[clearance,0],[-clearance,0],[0,clearance],[0,-clearance]].every(([dx,dy])=>inPolygon([x+dx,y+dy])))return false;
  if([...tipo5Walls,...tipo5Windows].some(w=>segmentDistance(point,w)<clearance+5))return false;
  return !tipo5Obstacles.some(([a,b,c,d])=>x>a-clearance&&x<c+clearance&&y>b-clearance&&y<d+clearance);
}
export function clearWalk(a:PlanPoint,b:PlanPoint){const samples=Math.ceil(distance(a,b)/4);for(let i=0;i<=samples;i++){const t=samples?i/samples:0;if(!canWalk([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]))return false;}return true;}
let cells: Map<string,PlanPoint>|undefined;
const key=(p:PlanPoint)=>p.join(',');
function grid(){if(!cells){cells=new Map();for(let x=700;x<1700;x+=step)for(let y=300;y<800;y+=step){const p:PlanPoint=[x,y];if(canWalk(p))cells.set(key(p),p);}}return cells;}
export function nearestWalk(point:PlanPoint,maxDistance=Infinity):PlanPoint|null {
  if(canWalk(point))return [...point];let best:PlanPoint|null=null,dist=maxDistance;
  for(const p of grid().values()){const d=distance(p,point);if(d<dist){dist=d;best=p;}}return best;
}
export function walkRoute(start:PlanPoint,destination:PlanPoint):PlanPoint[]{
  const from=nearestWalk(start,80),goal=nearestWalk(destination,100);if(!from||!goal)return [];
  if(clearWalk(from,goal))return [from,goal];
  const all=grid(),closest=(p:PlanPoint)=>[...all.values()].sort((a,b)=>distance(p,a)-distance(p,b)).slice(0,40).find(n=>clearWalk(p,n));
  const first=closest(from),last=closest(goal);if(!first||!last)return [];
  const open=[first],scores=new Map([[key(first),0]]),parents=new Map<string,string>(),closed=new Set<string>();
  while(open.length){open.sort((a,b)=>(scores.get(key(a))!+distance(a,last))-(scores.get(key(b))!+distance(b,last)));const current=open.shift()!,id=key(current);if(id===key(last)){
    const route:PlanPoint[]=[goal,current];let cursor=id;while(parents.has(cursor)){cursor=parents.get(cursor)!;route.push(all.get(cursor)!);}route.push(from);route.reverse();
    const smooth:PlanPoint[]=[route[0]];let i=0;while(i<route.length-1){let next=route.length-1;while(next>i+1&&!clearWalk(route[i],route[next]))next--;smooth.push(route[next]);i=next;}return smooth;
  }closed.add(id);
    for(const dx of [-step,0,step])for(const dy of [-step,0,step]){if(!dx&&!dy)continue;const point:PlanPoint=[current[0]+dx,current[1]+dy],next=key(point);if(!all.has(next)||closed.has(next)||!clearWalk(current,point))continue;const score=scores.get(id)!+Math.hypot(dx,dy);if(score<(scores.get(next)??Infinity)){parents.set(next,id);scores.set(next,score);if(!open.some(p=>key(p)===next))open.push(point);}}
  }return [];
}
export function roomAt([x,y]:PlanPoint){if(x>1515&&y<615)return 'suite-2';if(x>1155&&x<1345&&y<570)return 'suite-1';if(x>1220&&y>700)return 'lavabo';if(x<810)return 'servico';if(y>610&&x<985)return 'cozinha';if(y>575&&x<1190)return 'jantar';if(x<1155&&y<575)return 'living';return null;}
