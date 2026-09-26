# G400 — Geraldo Andreola

Public route: `/#/empreendimentos/g400`. Entry points: home feature, desktop Explore menu, mobile menu.

Uses the Moradas experience layout, shared dialog and image-decoding behavior. The G400 page, plans, model and assets are separate from the Moradas API and inventory. No existing published records are modified.

## Sources

- User supplied saved HTML: `C:/Users/mateu/Downloads/G400/G400 _ Edifício Geraldo Andreola – Vacaria_RS.html`.
- Fourteen original renderings copied without alteration from that folder to `public/assets/developments/g400/`.
- The G400 mark is the first four original vector shapes of the supplied HTML header, extracted into `logo.svg`; no tracing or redesign.
- Official source: https://yclodema.com.br/g400/ (checked 2026-09-26).
- Twelve plan sheets referenced by the supplied `plants.js.baixados`, downloaded from `https://yclodema.com.br/wp-content/uploads/YCLODEMA-plantas-2023-G400-{name}.webp`, where name is Tipo-1 through Tipo-5, Duplex, Triplex-1, Triplex-2, Garagem-1, Garagem-2, Infraestrutura-1 and Infraestrutura-2. Saved locally as `planta-*.webp`.

The unit map follows those plan sheets: Types 1–3 list floors 1–6; Types 4–5 list floors 1–5; duplex 703, triplex 704 and 705. Do not synthesize 604/605 or 701/702. Areas are private areas, not total areas. This is a static project reference: all availability requires confirmation; no price, delivery date or stock is asserted.

Original interior captions distinguish private triplex social space, triplex suite, duplex living and triplex gourmet. Common-area image 05 is rooftop lounge, not the private party room. Enlarged plan mode preserves the original whole sheet with scroll to read dimensions and fine print.

## Conceptual assets

The panoramic scene `public/assets/developments/g400/hero.webp` was prepared with the built-in image generation tool from the supplied `apresentation.webp`. Original output: `C:/Users/mateu/.codex/generated_images/01a0924b-7ecc-71a3-bbd1-0e2f8edcb1c7/exec-585af463-1765-4577-b8b1-22f711e4a6b5.png`. Production conversion uses Sharp WebP quality 90.

Both this expanded scene and the independently built navigable 3D massing model are conceptual, not verified BIM, survey, photographs or exact geolocation. Floor bands are navigation markers. The original source galleries and plans remain unchanged.

Final image prompt:

> Edit target: the supplied architectural rendering of G400 Geraldo Andreola. Create a wide 16:9 architectural website scene by OUTPAINTING the surroundings of this exact rendering, preserving the building architecture, number of levels, window arrangement, white structural frames, narrow reddish timber vertical fins, dark glass, balcony planting, podium, corner viewpoint and proportions faithfully. Do not redesign the building. Full building must fit comfortably within the frame from roof to sidewalk, located in the middle of the wide canvas between x=35% and x=72%, from y=14% to y=85%. Expand the same Vacaria urban street context and blue clear sky horizontally. Keep left 28% and right 20% visually calm, natural pale blue sky and subdued low-rise neighborhood for text overlays. Daylight, highly refined architectural visualization, natural materials, understated realistic lighting. Extend street and foreground, not crop the building. No added towers, no rooftop swimming pool, no mountain resort, no oversized plants, no visual interface, no text, no labels, no logos added, no watermarks. Preserve existing surroundings where present. Asset is a conceptual panoramic presentation of the supplied project, NOT a newly designed building.

## Validation

`npm run build`; `npx playwright test tests/g400.spec.ts tests/development.spec.ts`.

Covers original unit mapping, five gallery groups (facades, interiors, leisure, residential plans and infrastructure plans), unit-specific inquiry links, plan zoom, keyboard navigation/focus restoration, 320/390/820 mobile layouts, 3D camera/floor/lighting/context loss, discovery links and Moradas regression.
