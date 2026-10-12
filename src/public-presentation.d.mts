import type {Property} from './data';
export function environmentHref(id:string):string;
export function resolvePublicRoute(hash:string):string;
export function publicTitle(title:string):string;
export function publicReasons(property:Pick<Property,'reasons'|'tags'>):string[];
