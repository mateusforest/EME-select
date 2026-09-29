// Traced against the supplied Tipo 5 commercial sheet (1920 × 1067).
// Plan coordinates drive the shell, door openings, furniture and walking together.
// Approximate calibration: traced footprint ≈ 134 m², matching the sheet’s 133.70 m² scale.
export const TIPO5_SCALE=.0185;
export type PlanPoint = [number, number];
export type Wall = [number, number, number, number];
export const tipo5Outline: PlanPoint[] = [[810,315],[1700,315],[1700,615],[1435,615],[1435,695],[1320,695],[1320,800],[700,800],[700,610],[810,610]];
export const tipo5Windows: Wall[] = [[850,315,1145,315],[1195,315,1330,315],[1360,315,1425,315],[1450,315,1500,315],[1535,315,1675,315]];
export const tipo5Walls: Wall[] = [
 [810,315,850,315],[1145,315,1195,315],[1330,315,1360,315],[1425,315,1450,315],[1500,315,1535,315],[1675,315,1700,315],
 [810,315,810,610],[700,610,810,610],[700,610,700,800],
 [700,800,1130,800],[1195,800,1320,800],[1320,695,1320,800],
 [1260,695,1435,695],[1200,695,1210,695],[1200,695,1200,800],
 [1435,615,1435,695],[1435,615,1700,615],[1700,315,1700,615],
 [1155,315,1155,570],[1155,570,1345,570],
 [1345,315,1345,440],[1345,490,1345,515],[1345,560,1345,570],
 [1345,500,1445,500],[1499,500,1525,500],[1435,315,1435,500],
 [1525,315,1525,500],[1435,500,1435,516],[1435,566,1435,615],
 [810,610,865,610],[865,610,865,682],[810,682,865,682],
];
// x, z, opening width, axis (1: along z, 0: along x), entrance to common hall.
export const tipo5Doors = [[1345,465,50,1,0],[1345,537.5,45,1,0],[1472,500,54,0,0],[1435,541,50,1,0],[1235,695,50,0,0],[1162.5,800,65,0,1]] as const;
// Furniture bounds are traced from the same sheet. Decorative items remain within them.
export const tipo5Obstacles: [number,number,number,number][] = [
 [862,330,1085,376],[862,365,907,499],[998,450,1074,495],[1120,335,1145,530],
 [746,746,795,794],[795,756,965,794],[930,690,965,794], // kitchen L, fridge at the south wall
 [711,621,810,659],[810,536,865,610],[810,610,865,682],[865,558,954,594], // laundry and gourmet
 [993,610,1108,784], // table and chairs
 [1165,352,1293,463],[1167,473,1200,500],[1565,353,1692,464],[1658,475,1695,501],
 [1165,510,1290,565],[1438,575,1695,610], // wardrobes against bottom walls
 [1270,652,1430,690], // circulation console shown on plan
 [1350,320,1430,375],[1440,320,1520,375], // shower trays
 [1399,390,1430,424],[1493,390,1521,424], // toilets
 [1400,435,1430,489],[1493,435,1521,489], // bathroom vanities
 [1208,762,1258,793],[1273,753,1310,793], // lavabo basin and WC
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
export function roomAt([x,y]:PlanPoint){if(x>1345&&x<1435&&y<500)return 'banho-1';if(x>1435&&x<1525&&y<500)return 'banho-2';if(x>1435&&y<615)return 'suite-2';if(x>1155&&x<1345&&y<570)return 'suite-1';if(x>1200&&x<1320&&y>695)return 'lavabo';if(x<810&&y<705)return 'servico';if(y>610&&x<985)return 'cozinha';if(y>575&&x<1200)return 'jantar';if(x<1155&&y<575)return 'living';return null;}
