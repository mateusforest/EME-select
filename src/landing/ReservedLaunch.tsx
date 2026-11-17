import {ArrowUpRight,LockKeyhole} from 'lucide-react';
import './reserved-launch.css';

// Keep unreleased names, locations, artwork and source links out of public assets.
const contact='https://wa.me/5554984007919?text='+encodeURIComponent('Olá! Vi o card de pré-lançamento reservado no site da EME Select e gostaria de conversar com um consultor sobre essa novidade.');

export default function ReservedLaunch(){
 return <article className="reserved-launch" aria-labelledby="reserved-launch-title">
  <div className="reserved-launch-art">
   <div className="reserved-launch-atmosphere" aria-hidden="true"><i/><i/><i/></div>
   <div className="reserved-launch-reveal"><span className="reserved-launch-lock"><LockKeyhole size={23} strokeWidth={1.2} aria-hidden="true"/></span><span className="reserved-launch-soon">EM BREVE</span><span className="reserved-launch-visual-title">Novas possibilidades.<br/>Em primeira mão.</span><span className="reserved-launch-line"/></div>
   <span className="reserved-launch-caption">Composição conceitual</span>
  </div>
  <div className="reserved-launch-copy">
   <p className="reserved-launch-kicker"><span/>PRÉ-LANÇAMENTO · ATENDIMENTO RESERVADO</p>
   <h2 id="reserved-launch-title">Um novo endereço<br/>está chegando.</h2>
   <p>Algumas novidades merecem uma conversa antes de serem apresentadas ao mundo.</p>
   <p>Já estamos atendendo interessados. Fale com nossos consultores para conhecer essa oportunidade em uma apresentação individual.</p>
   <a className="reserved-launch-cta" href={contact} target="_blank" rel="noopener noreferrer">Quero saber em primeira mão <ArrowUpRight size={19} aria-hidden="true"/></a>
   <p className="reserved-launch-note"><LockKeyhole size={14} aria-hidden="true"/>Detalhes compartilhados em atendimento privado.</p>
  </div>
 </article>;
}
