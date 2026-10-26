import type {ProposalRecord} from './acquisition-proposal.mjs';
export function renderAcquisitionPDF(record:ProposalRecord & {demo?:boolean},assets:{PDFLib:any;fontkit:any;regularBytes:Uint8Array;mediumBytes:Uint8Array;logoBytes:Uint8Array;photoBytes?:Uint8Array}):Promise<Uint8Array>;
