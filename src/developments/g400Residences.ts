// Coordinates refer to the unchanged commercial sheets, not surveyed dimensions.
export interface ResidenceRoom { id:string; name:string; x:number; y:number; description:string }
export interface ResidenceLevel { name:string; crop:[number,number,number,number]; rooms:ResidenceRoom[] }
export interface ResidenceLayout { height:number; levels:ResidenceLevel[] }
const room=(id:string,name:string,x:number,y:number,description:string):ResidenceRoom=>({id,name,x,y,description});
const living=(x:number,y:number)=>room('living','Living',x,y,'Estar e convivência junto à fachada, conectados à área de jantar.');
const dining=(x:number,y:number)=>room('jantar','Jantar e gourmet',x,y,'A mesa reúne a área social e o espaço gourmet com churrasqueira.');
const kitchen=(x:number,y:number)=>room('cozinha','Cozinha',x,y,'A cozinha se conecta aos ambientes sociais e à área de serviço.');
const suite=(n:number,x:number,y:number)=>room(`suite-${n}`,`Suíte ${n}`,x,y,'Dormitório com banheiro próprio na ala íntima do apartamento.');
const service=(x:number,y:number)=>room('servico','Área de serviço',x,y,'Ambiente de apoio e lavanderia, conforme a distribuição da planta.');
const bath=(x:number,y:number)=>room('lavabo','Lavabo',x,y,'Lavabo de apoio à área social.');
const roof=(x:number,y:number)=>room('festas','Salão de festas',x,y,'Espaço privativo para receber, com acesso independente pela cobertura.');
export const g400Residences:Record<string,ResidenceLayout>={
  'tipo-1':{height:960,levels:[{name:'Apartamento',crop:[755,75,985,800],rooms:[living(960,280),dining(1145,505),kitchen(1090,670),suite(1,1205,220),suite(2,1435,225),suite(3,1580,260),service(1080,800)]}]},
  'tipo-2':{height:960,levels:[{name:'Apartamento',crop:[650,70,1110,830],rooms:[living(860,690),dining(1060,485),kitchen(1000,305),suite(1,1140,690),suite(2,1410,715),suite(3,1580,660),service(980,165)]}]},
  'tipo-3':{height:960,levels:[{name:'Apartamento',crop:[650,70,1120,830],rooms:[living(1590,675),dining(1415,490),kitchen(1450,290),suite(1,850,650),suite(2,1010,715),suite(3,1290,715),service(1430,155)]}]},
  'tipo-4':{height:1067,levels:[{name:'Apartamento',crop:[835,110,935,860],rooms:[living(1490,650),dining(1110,550),kitchen(1150,850),suite(1,1330,280),suite(2,1590,280),bath(910,575)]}]},
  'tipo-5':{height:1067,levels:[{name:'Apartamento',crop:[680,240,1060,590],rooms:[living(985,450),dining(1060,705),kitchen(870,705),suite(1,1250,440),suite(2,1590,440),bath(1260,745),service(765,650),room('banho-1','Banho da suíte 1',1385,440,'Banheiro privativo com acesso pela suíte 1.'),room('banho-2','Banho da suíte 2',1475,440,'Banheiro privativo com acesso pela suíte 2.')]}]},
  duplex:{height:2133,levels:[
    {name:'1º pavimento',crop:[500,1120,1240,940],rooms:[living(1530,1770),dining(1380,1575),kitchen(1400,1375),suite(1,830,1750),suite(2,1010,1840),suite(3,1300,1840),service(1410,1240)]},
    {name:'Cobertura',crop:[770,115,970,900],rooms:[roof(1110,710),room('hospedes','Quarto de hóspedes',1400,250,'Quarto de hóspedes no nível da cobertura.'),kitchen(1310,800)]},
  ]},
  'triplex-1':{height:2773,levels:[
    {name:'1º pavimento',crop:[850,1810,920,890],rooms:[room('intimo','Sala íntima',1110,2470,'Estar reservado no primeiro nível da unidade.'),suite(1,1320,2000),suite(2,1610,2000),suite(3,1610,2370)]},
    {name:'2º pavimento',crop:[850,960,910,860],rooms:[living(1580,1520),dining(1140,1470),kitchen(1180,1690),suite(4,1390,1140)]},
    {name:'Cobertura',crop:[850,70,900,870],rooms:[roof(1430,540),kitchen(1170,785),room('spa','Estar e spa ilustrado',1570,230,'A prancha ilustra um spa junto ao estar da cobertura. Equipamentos a confirmar no memorial.')]},
  ]},
  'triplex-2':{height:2133,levels:[
    {name:'1º pavimento',crop:[670,1420,1080,610],rooms:[suite(1,1040,1640),suite(2,1230,1620),suite(3,1630,1600)]},
    {name:'2º pavimento',crop:[665,795,1080,610],rooms:[living(990,1000),dining(1180,1000),kitchen(1510,1050),bath(770,1240)]},
    {name:'Cobertura',crop:[515,150,1230,610],rooms:[roof(1100,350),kitchen(760,580),room('spa','Spa ilustrado',1600,345,'A prancha ilustra um spa privativo na cobertura. Equipamentos a confirmar no memorial.')]},
  ]},
};

// Pilot camera stations follow the Tipo 5 plan. One scene serves only its listed units.
export const tipo5Stations:Record<string,{eye:[number,number];look:[number,number];pitch?:number} >={
  living:{eye:[1060,520],look:[940,355]},
  jantar:{eye:[1180,650],look:[1060,700]},
  cozinha:{eye:[853,702],look:[908,783],pitch:-.25},
  'suite-1':{eye:[1310,510],look:[1200,410]},
  'suite-2':{eye:[1570,555],look:[1630,410]},
  lavabo:{eye:[1233,723],look:[1270,783],pitch:-.43},
  servico:{eye:[765,703],look:[750,640],pitch:-.34},
  'banho-1':{eye:[1375,468],look:[1410,387],pitch:-.25},
  'banho-2':{eye:[1466,470],look:[1500,387],pitch:-.25},
};
