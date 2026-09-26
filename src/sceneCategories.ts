import type { Environment } from './data';

export const categoryTypes: Record<string, string> = {
  Casas: 'Casa', 'Casas de praia': 'Casa', 'Casas na serra': 'Casa', 'Casas em condomínio': 'Condomínio horizontal',
  Apartamentos: 'Apartamento', Coberturas: 'Cobertura', Compactos: 'Compacto', Cabanas: 'Cabana',
  Condomínios: 'Condomínio', 'Condomínios horizontais': 'Condomínio horizontal', 'Condomínios verticais': 'Condomínio vertical',
  Lojas: 'Loja', 'Salas comerciais': 'Sala comercial', 'Edifícios corporativos': 'Edifício corporativo',
  'Terrenos urbanos': 'Terreno urbano', 'Lotes em condomínio': 'Lote em condomínio', 'Terras agrícolas': 'Terra agrícola',
  Galpões: 'Galpão', Pavilhões: 'Pavilhão', 'Centros de distribuição': 'Centro de distribuição',
};
export function sceneForLocation(env: Environment, profile: string): Environment {
  if (env.id === 'urbano' && profile === 'bairro') return { ...env, image: '/assets/scene-urbano-bairro.webp',
    title: ['Mais tranquilidade.', 'Perto da sua vida.'], subtitle: 'Casas, apartamentos e condomínios em bairros residenciais.',
    markers: [{ propertyId:'bairro-casas', label:'Casas', x:65, y:60 }, { propertyId:'bairro-apartamentos', label:'Apartamentos', x:86, y:42 }, { propertyId:'bairro-condominios', label:'Condomínios horizontais', x:42, y:70 }],
  };
  const key=env.id+'-'+profile;
  const variants:Record<string,{image:string;title:[string,string];subtitle:string;pins:[string,number,number][]}>={
   'litoral-centro':{image:'litoral-centro',title:['A cidade encontra o mar.','Você encontra seu lugar.'],subtitle:'Apartamentos, compactos e coberturas no centro do litoral.',pins:[['Compactos',29,76],['Apartamentos',64,64],['Coberturas',89,29]]},
   'litoral-bairro':{image:'litoral-bairro',title:['O mar por perto.','A calma à sua porta.'],subtitle:'Casas, apartamentos e condomínios em bairros do litoral.',pins:[['Casas de praia',43,68],['Apartamentos',91,43],['Condomínios horizontais',66,44]]},
   'litoral-beira-mar':{image:'litoral-beira-mar',title:['Abra a janela.','Encontre o mar.'],subtitle:'Casas, apartamentos e coberturas junto à praia.',pins:[['Casas de praia',76,71],['Apartamentos',87,46],['Coberturas',87,20]]},
   'serra-centro':{image:'serra-centro',title:['O charme da serra.','A vida ao seu redor.'],subtitle:'Apartamentos e coberturas nos centros da serra.',pins:[['Apartamentos',57,64],['Condomínios verticais',84,51],['Coberturas',84,25]]},
   'serra-bairro':{image:'serra-bairro',title:['Uma rua tranquila.','Seu lugar na serra.'],subtitle:'Casas, apartamentos e condomínios entre jardins e araucárias.',pins:[['Casas na serra',53,65],['Apartamentos',86,40],['Condomínios',62,37]]},
  };
  const variant=variants[key]||(env.id==='serra'&&!profile?variants['serra-bairro']:undefined);
  if(variant)return {...env,image:'/assets/scene-'+variant.image+'.webp',title:profile?variant.title:env.title,subtitle:variant.subtitle,markers:variant.pins.map(([label,x,y],i)=>({propertyId:key+'-'+i,label,x,y}))};
  const markers = env.markers.map(marker => ({...marker, label: marker.label === 'Vista para o mar' ? 'Apartamentos' : marker.label}));
  if (env.id === 'litoral') markers.push({propertyId:'litoral-coberturas', label:'Coberturas', x:91, y:30});
  // Categories without a corresponding building remain available in the type filter.
  return {...env, markers};
}
