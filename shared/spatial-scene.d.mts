export interface SpatialScene {version:1;mode:'presentation'|'tipo5';assets:string[];finish:string;hour:number;room:string}
export interface SpatialProposal {recipient:string;deliverables:string;conditions:string}
export const sceneAssets:{id:string;label:string;file:string}[];
export const sceneRooms:{id:string;label:string}[];
export const sceneFinishes:{id:string;label:string}[];
export function defaultScene():SpatialScene;
export function validateScene(input:unknown):SpatialScene;
export function defaultProposal():SpatialProposal;
export function validateProposal(input:unknown):SpatialProposal;
