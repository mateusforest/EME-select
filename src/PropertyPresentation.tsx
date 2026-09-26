import {Building2,Check,Leaf,Sparkles} from 'lucide-react';
import './presentation.css';
// Existing pasted text is displayed as separate paragraphs/items, never injected as HTML.
export function descriptionLines(value:string){return value.replace(/\r/g,'').replace(/[✔✅☑✓📍🏡🏠🛏🛁🚗🪑🌞🌟🔨]/gu,'\n').split(/\n+/).map(line=>line.replace(/^[\s•\-\uFE0F]+/u,'').trim()).filter(Boolean);}
export default function PropertyPresentation({description,features}:{description:string;features:string[]}){
 const lines=descriptionLines(description);
 return <div className="eme-presentation"><div className="eme-presentation-heading"><Leaf size={22} strokeWidth={1.3}/><h3>Sobre este lugar</h3></div><div className="eme-presentation-copy">{lines.map((line,index)=>line.endsWith(':')?<h4 key={index}>{line.slice(0,-1)}</h4>:<p key={index}>{line}</p>)}</div>{features.length>0&&<section><div className="eme-presentation-heading"><Building2 size={22} strokeWidth={1.3}/><h3>Os detalhes do imóvel</h3></div><ul>{[...new Set(features)].map((feature,index)=><li key={index}><Check size={16}/><span>{feature}</span></li>)}</ul></section>}<small className="eme-presentation-signature"><Sparkles size={13}/>Uma apresentação com o olhar EME.</small></div>;
}
