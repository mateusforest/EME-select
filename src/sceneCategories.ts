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
  const markers = env.markers.map(marker => ({...marker, label: marker.label === 'Vista para o mar' ? 'Apartamentos' : marker.label}));
  if (env.id === 'litoral') markers.push({propertyId:'litoral-coberturas', label:'Coberturas', x:86, y:25});
  if (env.id === 'serra') markers.push({propertyId:'serra-apartamentos', label:'Apartamentos', x:72, y:55});
  if (env.id === 'urbano') markers.push({propertyId:'urbano-casas', label:'Casas', x:57, y:73});
  return {...env, markers};
}
