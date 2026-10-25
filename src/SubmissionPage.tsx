import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowUpRight, Camera, Check, FileCheck2, House, MessageCircle } from 'lucide-react';
import OwnerSubmission from './OwnerSubmission';
import { whatsappUrl } from './data';
import './styles.css';
import './submission-page.css';
import './soft-relief.css';
import './public-refinement.css';

export default function SubmissionPage() {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = 'Divulgue seu imóvel conosco — EME Select';
    heading.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, []);

  return <div className="submission-page eme-public">
    <a className="skip-link" href="#ficha-imovel">Ir para o formulário</a>
    <header className="submission-site-header">
      <a className="submission-brand" href="/#/" aria-label="EME Select — início">
        <img className="select-mark" src="/assets/experience/brand-monogram-transparent.webp" width="50" height="39" alt="" aria-hidden="true" /><small aria-hidden="true">SELECT</small>
      </a>
      <a className="submission-back" href="/#/">Conheça a EME <ArrowUpRight size={16} aria-hidden="true" /></a>
    </header>

    <main className="submission-content" id="conteudo">
      <section className="submission-intro" aria-labelledby="submission-title">
        <span className="eyebrow">DIVULGUE SEU IMÓVEL CONOSCO</span>
        <h1 id="submission-title" ref={heading} tabIndex={-1}>Seu imóvel merece<br /><em>um olhar criterioso.</em></h1>
        <p className="submission-lead">Boas-vindas à EME Select. Se você é proprietário ou representa uma empresa, este é o primeiro passo para apresentar seu imóvel à nossa coleção.</p>
        <p className="submission-selection-note">Menos é mais. Selecionamos pelo conjunto: qualidade, funcionalidade, contexto e transparência. Cada envio passa por avaliação segundo os critérios da EME; a entrada na coleção depende da conferência da equipe.</p>
        <a className="submission-form-link" href="#ficha-imovel">Apresentar meu imóvel <ArrowDown size={16} aria-hidden="true" /></a>

        <section className="submission-checklist" aria-labelledby="submission-checklist-title">
          <div className="submission-section-heading"><span className="eyebrow">Antes de começar</span><h2 id="submission-checklist-title">O que preparar.</h2></div>
          <article>
            <House size={22} strokeWidth={1.4} aria-hidden="true" />
            <div><h3>Um imóvel bem cuidado.</h3><p>Conservação, funcionalidade e condições de uso fazem parte da análise. Informe reparos necessários, ocupação e limitações com clareza.</p></div>
          </article>
          <article>
            <FileCheck2 size={22} strokeWidth={1.4} aria-hidden="true" />
            <div><h3>Informações que podemos conferir.</h3><p>Separe localização, áreas, características, valor pretendido e sua relação com o imóvel. Use dados verdadeiros e deixe em branco o que ainda precisa confirmar.</p><p>O vínculo com o imóvel e a autorização para divulgar dados e imagens serão conferidos pela equipe. Não inclua documentos pessoais no campo de descrição.</p></div>
          </article>
          <article>
            <Camera size={22} strokeWidth={1.4} aria-hidden="true" />
            <div><h3>Fotos originais, com qualidade.</h3><p>Separe arquivos JPEG, PNG ou WebP, nítidos e bem iluminados. Para a apresentação, buscamos pelo menos <strong>2.000 px no lado maior e 1.200 px no menor</strong>; o ideal é <strong>3.000 px ou mais no lado maior</strong>.</p><p>Prefira os arquivos originais, sem capturas de tela, montagens ou ampliação artificial. Mostre o imóvel como ele é, incluindo pontos que precisam de atenção.</p><p className="submission-photo-note">Envie até 8 fotos nesta ficha. Com sua autorização, a IA fará uma leitura preliminar das imagens e informações. A equipe confere os pontos levantados antes de decidir.</p></div>
          </article>
        </section>

        <p className="submission-fairness">Qualidade é cuidado, funcionalidade e uma boa experiência de uso. Avaliamos essas características em cada imóvel, sem uma faixa mínima de preço.</p>
      </section>

      <div className="submission-form-column">
        <div className="submission-form-context"><Check size={16} aria-hidden="true" /><p>Ficha privada · Fotos do imóvel · Análise preliminar · Revisão da equipe</p></div>
        <div className="submission-form-card" id="ficha-imovel" tabIndex={-1}>
          <OwnerSubmission onClose={() => { window.location.assign('/#/'); }} />
        </div>
        <p className="submission-access-note">Sua ficha, suas fotos e a análise ficam reunidas para a equipe. O resultado automático é preliminar; não publica um anúncio nem substitui a avaliação final.</p>
        <a className="submission-help" href={whatsappUrl('Olá! Preciso de ajuda para apresentar meu imóvel à EME Select.')} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden="true" /><span>Precisa de ajuda? Fale com a EME.</span><ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
    </main>

    <footer className="submission-footer"><span>EME SELECT</span><p>Informações cuidadas. Decisões acompanhadas pela equipe.</p><a href="/#/">Voltar ao site <ArrowUpRight size={14} aria-hidden="true" /></a></footer>
  </div>;
}
