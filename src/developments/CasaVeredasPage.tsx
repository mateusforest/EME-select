import { useState } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowRight, Expand, FileText } from 'lucide-react';
import { Dialog } from '../ui';
import { whatsappUrl } from '../data';
import './casa-veredas.css';
const base = '/assets/developments/casa-m-veredas/';
const views = [
  { file: 'fachada', name: 'A chegada', detail: 'Volumes, luz e acolhimento.' },
  { file: 'arquitetura', name: 'A arquitetura', detail: 'Texturas naturais e linhas que se encontram.' },
  { file: 'acesso', name: 'Outro olhar', detail: 'Uma nova perspectiva da fachada.' },
  { file: 'piscina', name: 'O lazer', detail: 'O encontro entre a casa e o pátio.' },
  { file: 'patio', name: 'Ao ar livre', detail: 'Espaço para desacelerar.' },
];
export default function CasaVeredasPage() {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [floor, setFloor] = useState<'terreo' | 'superior'>('terreo');
  const view = views[active];
  const move = (step: number) => setActive(value => (value + step + views.length) % views.length);
  return <main id="conteudo" className="cv-page">
    <section className="cv-intro">
      <a className="cv-back" href="#/">← Voltar ao Select</a>
      <div className="cv-heading"><div><p className="cv-kicker">Lançamentos & projetos · Residencial</p><h1>Casa M <em>Veredas.</em></h1></div><p>Arquitetura para acolher.<br />Espaço para viver por inteiro.</p></div>
      <div className="cv-stage"><img key={view.file} src={`${base}${view.file}.webp`} alt={`Casa M Veredas — ${view.name}, perspectiva ilustrativa`} fetchPriority="high" /><button className="cv-expand" onClick={() => setExpanded(true)} aria-label="Ampliar perspectiva"><Expand size={17} /></button></div>
      <div className="cv-gallery-bar"><div aria-live="polite"><span className="cv-kicker">0{active + 1} / 05</span><strong>{view.name}</strong></div><div className="cv-view-tabs" aria-label="Perspectivas da casa">{views.map((item, index) => <button key={item.file} aria-pressed={index === active} onClick={() => setActive(index)}>{item.name}</button>)}</div><div className="cv-arrows"><button onClick={() => move(-1)} aria-label="Perspectiva anterior"><ArrowLeft size={18} /></button><button onClick={() => move(1)} aria-label="Próxima perspectiva"><ArrowRight size={18} /></button></div></div>
      <p className="cv-note">Perspectivas ilustrativas do projeto. Imagens e plantas representam estudos e podem apresentar diferenças entre si.</p>
    </section>
    <section className="cv-story"><div><p className="cv-kicker">O projeto</p><h2>O cotidiano ganha<br /><em>outro ritmo.</em></h2></div><div><p>Ambientes de convivência, espaços de descanso e uma área externa que convida a ficar. A Casa M Veredas reúne a vida da família em dois pavimentos, com lazer conectado à casa.</p><div className="cv-facts"><div><strong>4 suítes</strong><span>Uma no térreo e três no superior</span></div><div><strong>≈ 370 m²</strong><span>Casa em dois pavimentos, no estudo</span></div><div><strong>Piscina & gourmet</strong><span>Lazer previsto no projeto</span></div><div><strong>Espaço para a família</strong><span>Escritório, brinquedoteca e sala íntima</span></div></div><p className="cv-note">Área preliminar da casa: 370,10 m². Não inclui todas as áreas complementares e coberturas; não corresponde a uma área legal de construção aprovada.</p></div></section>
    <figure className="cv-lifestyle"><img src={`${base}piscina.webp`} alt="Perspectiva ilustrativa da piscina e do pátio ao entardecer" loading="lazy" /><figcaption>O lado de fora também é casa.</figcaption></figure>
    <section className="cv-plans"><div className="cv-heading"><div><p className="cv-kicker">Conheça a distribuição</p><h2>Cada espaço,<br /><em>uma possibilidade.</em></h2></div><p>Explore as plantas base<br />e veja como os ambientes se conectam.</p></div><div className="cv-plan-tabs" aria-label="Plantas disponíveis"><button aria-pressed={floor === 'terreo'} onClick={() => setFloor('terreo')}>Térreo & lazer</button><button aria-pressed={floor === 'superior'} onClick={() => setFloor('superior')}>Pavimento superior</button></div><a className="cv-plan-image" href={`${base}planta-${floor}.pdf`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir planta ${floor === 'terreo' ? 'do térreo' : 'do superior'} em PDF`}><img src={`${base}planta-${floor}.webp`} alt={`Planta base ${floor === 'terreo' ? 'do térreo e lazer' : 'do pavimento superior'} da Casa M Veredas`} loading="lazy" /></a><div className="cv-plan-footer"><p className="cv-note">Estudos preliminares V08, de outubro de 2026. Plantas não executivas, sujeitas a detalhamento e compatibilização.</p><a href={`${base}planta-${floor}.pdf`} target="_blank" rel="noopener noreferrer"><FileText size={17} /> Abrir planta em PDF <ArrowUpRight size={16} /></a></div></section>
    <section className="cv-contact"><p className="cv-kicker">Vamos conversar</p><h2>Se imagine aqui.</h2><p>Converse com a EME sobre o projeto,<br />as condições e os próximos passos.</p><a href={whatsappUrl('Olá! Quero saber mais sobre a Casa M Veredas, que vi nos lançamentos do Select.')} target="_blank" rel="noopener noreferrer">Tenho interesse na Casa M Veredas <ArrowUpRight size={17} /></a><small>Consulte a equipe sobre estágio do projeto, localização e disponibilidade.</small></section>
    {expanded && <Dialog title={`Casa M Veredas · ${view.name}`} onClose={() => setExpanded(false)} wide className="cv-lightbox"><img src={`${base}${view.file}.webp`} alt={`Perspectiva ilustrativa: ${view.name}`} /><div className="cv-lightbox-controls"><button onClick={() => move(-1)} aria-label="Perspectiva anterior"><ArrowLeft size={18} /></button><p aria-live="polite">{active + 1} / 5 · {view.detail}</p><button onClick={() => move(1)} aria-label="Próxima perspectiva"><ArrowRight size={18} /></button></div></Dialog>}
  </main>;
}
