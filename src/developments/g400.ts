export const G400_ROUTE = '#/empreendimentos/g400';
export const G400_ASSETS = '/assets/developments/g400/';
export type G400GalleryId = 'facades' | 'interiors' | 'leisure' | 'plans' | 'infrastructure';
export interface G400Image { file: string; caption: string }
export const g400Plans = [
  { id: 'tipo-1', title: 'Tipo 1', area: '193,56', suites: 3, units: ['101','201','301','401','501','601'] },
  { id: 'tipo-2', title: 'Tipo 2', area: '209,30', suites: 3, units: ['102','202','302','402','502','602'] },
  { id: 'tipo-3', title: 'Tipo 3', area: '215,90', suites: 3, units: ['103','203','303','403','503','603'] },
  { id: 'tipo-4', title: 'Tipo 4', area: '148,27', suites: 2, units: ['104','204','304','404','504'] },
  { id: 'tipo-5', title: 'Tipo 5', area: '133,70', suites: 2, units: ['105','205','305','405','505'] },
  { id: 'duplex', title: 'Duplex', area: '399,32', suites: 3, units: ['703'] },
  { id: 'triplex-1', title: 'Triplex 1', area: '444,56', suites: 4, units: ['704'] },
  { id: 'triplex-2', title: 'Triplex 2', area: '411,08', suites: 3, units: ['705'] },
];
// Unit numbers and areas transcribed from Yclodema's supplied 2023 plan sheets.
// This is a project reference, never a live inventory or confirmation of availability.
export function g400UnitsOnFloor(floor: number) {
  return g400Plans.flatMap((plan, planIndex) => plan.units.filter(unit => Number(unit[0]) === floor).map(unit => ({ unit, plan, planIndex })));
}
const images = (group: string, captions: string[]): G400Image[] => captions.map((caption,index) => ({file:`carousel-${group}-${String(index+1).padStart(2,'0')}.webp`,caption}));
export const g400Galleries: Record<G400GalleryId, {title:string; note:string; images:G400Image[]}> = {
  facades: {title:'G400 por todos os ângulos',note:'Perspectivas do projeto · Yclodema / Studio 997. Imagens ilustrativas.',images:images('apresentation',['Vista BR–Centro · Avenida Moreira Paz','Fachada · Avenida Moreira Paz','Perspectiva da esquina','Fachada · Rua João Borges Pinto','Vista · Rua João Borges Pinto'])},
  interiors: {title:'Espaço para viver do seu jeito',note:'Interiores ilustrativos das coberturas. Mobiliário e acabamentos sujeitos ao memorial da unidade.',images:images('apartament',['Salão de festas privativo · Triplex','Suíte principal · Triplex 1','Living · Duplex','Espaço gourmet · Triplex 2'])},
  leisure: {title:'Tempo para você. Lugar para todos.',note:'Perspectivas das áreas sociais do projeto. Consulte o memorial para equipamentos e acabamentos.',images:images('social-structure',['Playground','Piscina','Firespace','Academia','Rooftop lounge'])},
  plans: {title:'Plantas para diferentes formas de viver',note:'Plantas comerciais da Yclodema (2023). Áreas privativas e numeração conforme o material; disponibilidade e condições a confirmar.',images:g400Plans.map(plan=>({file:`planta-${plan.id}.webp`,caption:`${plan.title} · ${plan.area} m² privativos · ${plan.suites} suítes`}))},
  infrastructure: {title:'Cada espaço, em perspectiva',note:'Plantas de infraestrutura da Yclodema. A vinculação das vagas às unidades deve ser confirmada.',images:[{file:'planta-infraestrutura-1.webp',caption:'Convivência e lazer · Térreo'},{file:'planta-infraestrutura-2.webp',caption:'Academia · 7º andar e rooftop lounge · Cobertura'},{file:'planta-garagem-1.webp',caption:'Garagem · Planta 1'},{file:'planta-garagem-2.webp',caption:'Garagem · Planta 2'}]},
};
