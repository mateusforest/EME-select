import type {SpatialScene,SpatialProposal} from './spatial-scene.mjs';
export interface SpatialPlan {summary:string;steps:string[];risks:string}
export interface SpatialProject {name:string;level:string;scope:string;brief:string;manualHours:number;automatableShare:number;reductionTarget:number;hourCost:number;resources:number;contingency:number;tax:number;margin:number;people:number;hoursPerWeek:number;reviewWeeks:number;courtesy:number;platformInvestment:number;plan:SpatialPlan|null;scene?:SpatialScene|null;proposal?:SpatialProposal}
export const spatialLevels:{id:string;label:string;description:string;factor:number;license:string}[];
export function initialSpatialProject():SpatialProject;
export function validateSpatialProject(value:unknown):SpatialProject;
export function estimateSpatialProject(value:SpatialProject):{savedHours:number;remainingHours:number;cost:number;price:number;payable:number;weeks:number;baselineWeeks:number;platformInvestment:number};
export function applySpatialScope(project:SpatialProject,scope:string,level?:string):SpatialProject;
