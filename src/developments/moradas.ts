export const MORADAS_ROUTE = '#/empreendimentos/moradas-da-serra';
export const ASSETS = '/assets/developments/moradas-da-serra/';
export type TowerId = 'a' | 'b';
export type Lighting = 'day' | 'sunset' | 'night';
export type Place = 'overview' | 'floors' | 'leisure' | 'surroundings';
export type GalleryId = 'interiors' | 'leisure' | 'court' | 'entrance' | 'plans';
export type UnitStatus = 'available' | 'reserved' | 'sold' | 'unknown';
export interface DevelopmentUnit { id: string; tower: TowerId; floor: number; label: string; typology: string; status: UnitStatus }
// No live stock, floor plans or unit numbering has been supplied by DeVille.
// Empty inventory is deliberately unknown, never interpreted as sold or available.
export const units: DevelopmentUnit[] = [];
export const floors = [9, 8, 7, 6, 5, 4, 3, 2, 1];
export function floorState(tower: TowerId, floor: number, inventory: DevelopmentUnit[] = units) {
  const matches = inventory.filter(unit => unit.tower === tower && unit.floor === floor);
  if (matches.some(unit => unit.status === 'available')) return 'available';
  if (!matches.length || matches.some(unit => unit.status === 'unknown')) return 'unknown';
  return 'unavailable';
}
export const galleries: Record<GalleryId, { title: string; note: string; images: { file: string; caption: string }[] }> = {
  interiors: { title: 'Por dentro do seu próximo lugar', note: 'Perspectivas fornecidas pela DeVille. Mobiliário ilustrativo; consulte o memorial descritivo.', images: [
    { file: 'living.jpg', caption: 'Estar e jantar integrados' }, { file: 'kitchen.jpg', caption: 'Cozinha integrada' },
    { file: 'suite.jpg', caption: 'Dormitório' }, { file: 'bedroom.jpg', caption: 'Um espaço para descansar' },
    { file: 'single-bedroom.jpg', caption: 'Dormitório individual' }, { file: 'bathroom.jpg', caption: 'Banheiro' },
  ] },
  leisure: { title: 'Tempo para viver lá fora', note: 'Perspectivas fornecidas pela DeVille. Áreas, equipamentos e acabamentos sujeitos ao projeto e memorial.', images: [
    { file: 'pool.jpg', caption: 'Piscina e espaço de convivência' }, { file: 'lounge.jpg', caption: 'Convivência ao entardecer' }, { file: 'court.jpg', caption: 'Quadra e playground' },
  ] },
  court: { title: 'Espaço para se encontrar', note: 'Perspectiva fornecida pela DeVille. Consulte o projeto e memorial do empreendimento.', images: [{ file: 'court.jpg', caption: 'Quadra e playground' }] },
  entrance: { title: 'Sua chegada ao Moradas da Serra', note: 'Perspectivas fornecidas pela DeVille. Apresentação do acesso e das fachadas.', images: [{ file: 'front.jpg', caption: 'Acesso ao condomínio' }, { file: 'facade.jpg', caption: 'Volumes e fachadas' }] },
  plans: { title: 'Plantas para diferentes momentos', note: 'Material comercial fornecido pela DeVille: 2 dormitórios a partir de 52 m² e 3 dormitórios com 71 m² e suíte. Vinculação a torres, andares e unidades a confirmar.', images: [{ file: 'plans.jpg', caption: 'Tipologias do empreendimento · material da incorporadora' }] },
};
