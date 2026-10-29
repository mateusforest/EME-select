import {useId} from 'react';

type Objective='swap'|'sell'|'buy'|'invest';
const labels={swap:'Trocar · novos caminhos para seu imóvel',sell:'Vender · encontre o próximo proprietário',buy:'Comprar · a chave do seu próximo lugar',invest:'Investir · possibilidades para o seu objetivo'};

/** Vector artwork shares the palette and linework of the objective controls. */
export default function SwitchObjectiveArt({objective}:{objective:Objective|null}){
 const id=useId().replace(/:/g,'');
 return <figure className="sw-objective-art" aria-label="Objetivo em destaque">
  <div key={objective||'connections'} className="sw-objective-art-content">
   <svg viewBox="0 0 440 330" role="img" aria-label={objective?labels[objective]:'M Switch · conexões imobiliárias'}>
    <defs>
     <linearGradient id={id+'green'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#47735c"/><stop offset=".48" stopColor="#1b4d3c"/><stop offset="1" stopColor="#0d3025"/></linearGradient>
     <linearGradient id={id+'gold'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e8d8a5"/><stop offset=".5" stopColor="#ba914e"/><stop offset="1" stopColor="#87642f"/></linearGradient>
     <radialGradient id={id+'halo'}><stop stopColor="#cbd7c2" stopOpacity=".55"/><stop offset="1" stopColor="#cbd7c2" stopOpacity="0"/></radialGradient>
     <radialGradient id={id+'shadow'}><stop stopColor="#173f33" stopOpacity=".13"/><stop offset="1" stopColor="#173f33" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="224" cy="166" rx="198" ry="151" fill={'url(#'+id+'halo)'}/>
    <ellipse cx="224" cy="289" rx="124" ry="17" fill={'url(#'+id+'shadow)'}/>
    <circle cx="220" cy="157" r="120" fill="none" stroke="#a3b498" strokeOpacity=".32" strokeWidth="1" strokeDasharray="2 9"/>
    <path d="M94 197A133 133 0 0 1 173 31M266 282A133 133 0 0 0 352 130" fill="none" stroke={'url(#'+id+'gold)'} strokeOpacity=".5"/>
    <g fill={'url(#'+id+'green)'} stroke="#d4dfcc" strokeWidth="1.4" strokeLinejoin="round">
     {objective==='swap'?<>
      <path d="M96 157l62-49 62 49v92h-43v-61h-37v61H96z"/>
      <path d="M224 115l60-48 60 48v92h-42v-60h-36v60h-42z"/>
     </>:objective==='sell'?<>
      <path d="M118 140l91-69 90 69v113h-62v-74h-55v74h-64z"/>
      <path d="M274 167h55l31 33-63 63-50-50z" fill={'url(#'+id+'gold)'} stroke="#e8d8a5"/>
      <circle cx="285" cy="188" r="6" fill="#173f33" stroke="none"/>
     </>:objective==='buy'?<>
      <path d="M159 113l80-60 80 60v109h-53v-64h-53v64h-54z" opacity=".45"/>
      <path d="M190 132a46 46 0 1 0-20 85l37 38h22v-22h22v-22l-38-38a46 46 0 0 0-23-41z"/>
      <circle cx="169" cy="170" r="15" fill="#f1f0e8" stroke={'url(#'+id+'gold)'} strokeWidth="4"/>
     </>:objective==='invest'?<>
      <rect x="117" y="194" width="49" height="67" rx="6"/>
      <rect x="190" y="151" width="49" height="110" rx="6"/>
      <rect x="263" y="103" width="49" height="158" rx="6"/>
     </>:<>
      <rect x="119" y="92" width="133" height="133" rx="43" transform="rotate(-18 185 159)"/>
      <rect x="205" y="119" width="104" height="104" rx="33" transform="rotate(18 257 171)" fill="none" stroke={'url(#'+id+'gold)'} strokeWidth="9"/>
     </>}
    </g>
    <g fill="none" stroke={'url(#'+id+'gold)'} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
     {objective==='swap'?<><path d="M110 92c31-45 102-45 140-15m-1-24 5 29-29-3"/><path d="M328 231c-30 44-102 45-140 15m1 24-5-29 29 3"/></>:objective==='sell'?<path d="m278 225 12 12 27-29" stroke="#173f33" strokeWidth="4"/>:objective==='buy'?<path d="m198 205 38 38"/>:objective==='invest'?<path d="m111 151 69-56 48 15 79-56m-33 0h33v33"/>:<><path d="M142 155h61m-17-17 17 17-17 17"/><path d="M282 181h-59m17-17-17 17 17 17"/></>}
    </g>
    <path d="M350 65v16m-8-8h16" stroke={'url(#'+id+'gold)'} strokeWidth="2" strokeLinecap="round"/>
   </svg>
   <figcaption>{objective?labels[objective]:'Possibilidades que se conectam.'}</figcaption>
  </div>
 </figure>;
}
