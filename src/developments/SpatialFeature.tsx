import './spatial-feature.css';

export const SPATIAL_URL = 'https://www.emespatial.com';

export function SpatialFeature(){return <section className="sp-feature" aria-labelledby="sp-feature-title"><img src="/assets/m/gallery/geral.webp" alt="Torre M, estudo conceitual com varandas e jardins" loading="lazy"/><div><span className="sp-kicker">EME SPATIAL · EXPERIÊNCIA INTERATIVA</span><h2 id="sp-feature-title">Um novo jeito de<br/>conhecer um lugar.</h2><p>Explore a arquitetura, aproxime os detalhes e descubra os espaços do M, nosso empreendimento conceito.</p><a className="sp-button" href={SPATIAL_URL}>Conhecer o EME Spatial <span>↗</span></a></div></section>}
