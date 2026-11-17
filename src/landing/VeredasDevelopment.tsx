import {useState} from 'react';
import {ArrowRight,ArrowUpRight,MapPin,Trees,ChevronLeft,ChevronRight} from 'lucide-react';
import {Dialog} from '../ui';
import './veredas-development.css';

const contact='https://wa.me/5554984007919?text='+encodeURIComponent('Olá! Gostaria de conhecer os lotes da Etapa III do Veredas, em Vacaria. Podemos conversar sobre disponibilidade e agendar uma visita?');
const photos=[
 {src:'/assets/developments/veredas/entrada.webp',alt:'Entrada do Veredas Bairro Parque e Parque de Negócios',caption:'Acesso ao bairro'},
 {src:'/assets/developments/veredas/vista-aerea.webp',alt:'Vista aérea do bairro Veredas ao entardecer, com Vacaria ao fundo',caption:'O bairro e a cidade'},
 {src:'/assets/developments/veredas/ciclovia.webp',alt:'Ciclovia e vias do bairro Veredas',caption:'Espaços para o dia a dia'},
];

export default function VeredasDevelopment(){
 const [open,setOpen]=useState(false),[photo,setPhoto]=useState(0);
 return <>
  <article className="veredas-card" aria-labelledby="veredas-title">
   <button className="veredas-cover" onClick={()=>{setPhoto(0);setOpen(true);}} aria-label="Ver fotos e detalhes do Veredas — Etapa III" aria-haspopup="dialog">
    <img src={photos[0].src} alt={photos[0].alt} width="1600" height="900" loading="lazy"/>
    <span className="veredas-cover-tag">VEREDAS · VACARIA</span>
    <span className="veredas-cover-link">Conheça o bairro <ArrowUpRight size={18}/></span>
   </button>
   <div className="veredas-copy">
    <p className="veredas-eyebrow">LOTEAMENTO · ETAPA III</p>
    <h2 id="veredas-title">Veredas<span>Um novo lugar para seus planos.</span></h2>
    <p className="veredas-location">Innovar Urbanizadora · Vacaria, RS</p>
    <p>Um bairro que conecta moradia, natureza e novas possibilidades. Conheça a terceira etapa comercial do Veredas Bairro Parque &amp; Parque de Negócios.</p>
    <ul className="veredas-facts"><li><Trees size={20}/>Bairro planejado</li><li><MapPin size={20}/>Junto ao Parque de Rodeios</li></ul>
    <button className="veredas-primary" onClick={()=>{setPhoto(0);setOpen(true);}} aria-haspopup="dialog">Conhecer o Veredas <ArrowRight size={19}/></button>
    <a className="veredas-contact" href={contact} target="_blank" rel="noopener noreferrer">Consultar lotes da Etapa III <ArrowUpRight size={16}/></a>
   </div>
  </article>
  {open&&<Dialog title="Veredas · Etapa III" onClose={()=>setOpen(false)} wide className="veredas-dialog">
   <div className="veredas-gallery">
    <img src={photos[photo].src} alt={photos[photo].alt} width="1600" height="900"/>
    <div className="veredas-gallery-controls"><button aria-label="Foto anterior" onClick={()=>setPhoto((photo+photos.length-1)%photos.length)}><ChevronLeft size={20}/></button><span aria-live="polite">{photo+1} / {photos.length} · {photos[photo].caption}</span><button aria-label="Próxima foto" onClick={()=>setPhoto((photo+1)%photos.length)}><ChevronRight size={20}/></button></div>
   </div>
   <div className="veredas-details"><p className="veredas-eyebrow">BAIRRO PARQUE &amp; PARQUE DE NEGÓCIOS</p><h3>Espaço para construir novos caminhos.</h3><p>Na Avenida Antônio Ribeiro Branco, junto ao Kartódromo e ao Parque de Rodeios, em Vacaria. Um projeto que reúne espaços para morar e para negócios, com praças e áreas verdes no planejamento do bairro.</p><p className="veredas-photo-note">As fotos apresentam o bairro e a infraestrutura da primeira fase. Consulte nossa equipe sobre a localização e a disponibilidade dos lotes da Etapa III.</p><a className="veredas-primary" href={contact} target="_blank" rel="noopener noreferrer">Quero conhecer os lotes <ArrowUpRight size={19}/></a></div>
  </Dialog>}
 </>;
}
