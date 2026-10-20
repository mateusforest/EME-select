import sharp from 'sharp';

const ORIGIN = 'https://www.emeselect.com';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

export function createPropertyShare(fetcher = fetch) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, body, type = 'text/html; charset=utf-8') => {
      res.statusCode = status; res.setHeader('Content-Type', type); res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); return send(405, 'Método não permitido.'); }
    const requestUrl = new URL(req.url, ORIGIN);
    const route = /^\/imovel\/([^/]+)(\/capa\.jpg)?\/?$/.exec(requestUrl.pathname);
    const id = route?.[1] || requestUrl.searchParams.get('id') || '';
    if (!UUID.test(id)) return send(404, 'Imóvel não encontrado.');
    try {
      // Read only the public, approved snapshot; never expose a private draft.
      const response = await fetcher(ORIGIN + '/api/public/properties', {signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('Public catalog unavailable');
      const {properties} = await response.json();
      const property = properties?.find(item => item.id === id);
      if (!property) return send(404, 'Este anúncio não está disponível.');
      const cover = property.image;
      if (!/^\/api\/photos\/[a-f0-9-]+$/i.test(cover || '')) throw new Error('Published cover unavailable');
      if (route?.[2] || requestUrl.searchParams.get('cover') === '1') {
        const photo = await fetcher(ORIGIN + cover, {signal: AbortSignal.timeout(10000), redirect:'error'});
        if (!photo.ok) throw new Error('Cover unavailable');
        const jpeg = await sharp(Buffer.from(await photo.arrayBuffer()), {limitInputPixels:40000000})
          .rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).jpeg({quality:88}).toBuffer();
        return send(200, jpeg, 'image/jpeg');
      }
      const title = property.title;
      const price = property.price ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(property.price) : 'Consulte a equipe';
      const description = [property.location, price, property.bedrooms ? `${property.bedrooms} dormitórios` : '', property.area ? `${property.area} m²` : ''].filter(Boolean).join(' · ');
      const url = `${ORIGIN}/imovel/${id}`;
      const image = `${url}/capa.jpg`;
      const destination = `${ORIGIN}/#/imovel/${id}`;
      return send(200, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} — EME Select</title><meta name="description" content="${escape(description)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="EME Select"><meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${image}"><meta property="og:image:secure_url" content="${image}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:alt" content="${escape(title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${image}">
<style>body{margin:0;background:#f6f4ed;color:#173f32;font:16px/1.6 Arial,sans-serif}main{max-width:720px;margin:40px auto;padding:24px}img{width:100%;max-height:480px;object-fit:contain;border-radius:18px}h1{font:36px/1.2 Georgia,serif}a{display:inline-block;background:#173f32;color:white;padding:14px 24px;border-radius:10px;text-decoration:none}</style>
</head><body><main><p>EME SELECT · IMÓVEL DA COLEÇÃO</p><img src="${image}" alt="${escape(title)}"><h1>${escape(title)}</h1><p>${escape(description)}</p><a href="${destination}">Conhecer este imóvel</a></main><script>window.location.replace(${JSON.stringify(destination)});</script></body></html>`);
    } catch { return send(503, 'Não foi possível carregar o anúncio. Tente novamente em instantes.'); }
  };
}
export default createPropertyShare();
