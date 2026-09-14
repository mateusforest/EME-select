import { ArrowUpRight } from 'lucide-react';
import { environments } from './data';
import './explore-environments.css';

const environmentStories: Record<string, { copy: string; alt: string; position?: string; featured?: boolean }> = {
  litoral: {
    copy: 'O mar por perto. Mais espaço para os dias leves.',
    alt: 'Arquitetura e jardins junto à paisagem do litoral, em imagem ilustrativa',
    position: '58% 64%',
  },
  serra: {
    copy: 'Paisagens para desacelerar. Lugares para ficar.',
    alt: 'Casas integradas ao verde da serra, em imagem ilustrativa',
    position: '58% 65%',
  },
  urbano: {
    copy: 'A vida de bairro, perto do que move sua rotina.',
    alt: 'Edifícios e ruas arborizadas em cenário urbano ilustrativo',
    position: '65% 58%',
  },
  condominios: {
    copy: 'Casas e apartamentos. Espaço para viver e conviver.',
    alt: 'Condomínios horizontais e verticais entre jardins, em imagem ilustrativa',
    position: '56% 62%',
    featured: true,
  },
  comercial: {
    copy: 'Espaços para encontrar pessoas e dar lugar às suas ideias.',
    alt: 'Lojas e espaços de trabalho em cenário comercial ilustrativo',
    position: '58% 60%',
  },
  terrenos: {
    copy: 'Da cidade ao campo, o começo de um novo projeto.',
    alt: 'Terrenos e paisagem rural em imagem ilustrativa',
    position: '56% 63%',
  },
  industrial: {
    copy: 'Estruturas e conexões para o próximo passo da operação.',
    alt: 'Galpões e estruturas logísticas em cenário industrial ilustrativo',
    position: '60% 60%',
  },
};

export default function ExploreEnvironments() {
  const destinations = environments.filter(environment => environment.id !== 'todos');

  return <section className="explore-environments" id="explore-ambientes" aria-labelledby="explore-environments-title">
    <div className="explore-environments-inner">
      <header className="explore-environments-heading">
        <div>
          <p className="explore-environments-kicker"><span aria-hidden="true" /> Um lugar para cada possibilidade</p>
          <h2 id="explore-environments-title">Explore os <em>ambientes.</em></h2>
        </div>
        <p className="explore-environments-intro">Diferentes paisagens, diferentes planos.<br />Encontre o contexto que combina com o seu próximo passo.</p>
      </header>

      <ol className="explore-environments-grid">
        {destinations.map((environment, index) => {
          const story = environmentStories[environment.id];
          return <li className={`explore-env-item${story?.featured ? ' explore-env-item--featured' : ''}`} key={environment.id}>
            <a className="explore-env-link" href={`#/ambientes/${environment.id}`} aria-label={`Explorar ${environment.name}`}>
              <div className="explore-env-image">
                <img src={environment.image} alt={story?.alt || `Cenário ilustrativo de ${environment.name}`} loading="lazy" decoding="async" width="1586" height="992" style={{ objectPosition: story?.position || 'center' }} />
                {story?.featured && <span className="explore-env-feature">Um jeito de morar</span>}
              </div>
              <div className="explore-env-caption">
                <span className="explore-env-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div className="explore-env-story"><h3>{environment.name}</h3><p>{story?.copy || environment.subtitle}</p></div>
                <ArrowUpRight className="explore-env-arrow" size={22} strokeWidth={1.3} aria-hidden="true" />
              </div>
            </a>
          </li>;
        })}
      </ol>

      <div className="explore-environments-footer">
        <p>Um olhar atento, em cada ambiente.</p>
        <span>Paisagens e imóveis ilustrativos</span>
      </div>
    </div>
  </section>;
}
