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

## Visual refinement — 2026-09-26

Replaced approximate full-width floor polygons with balcony regions traced in the panoramic image coordinate system. The selected floor uses a fine warm edge and a restrained tint; recessed timber bays are not crossed by a green slab. Night overlays are individual glass panes, with varied brightness and no light painted onto opaque facade panels.

The navigable model now has seven residential levels over the commercial podium, recessed timber cores, framed corner glazing, balcony slabs and clustered planting, stone/timber/paving textures, a stepped glazed crown and an entrance canopy. Instanced geometry limits draw calls. Environment reflections, directional shadows and selective warm interior emission replace uniformly luminous glazing. Mobile camera fit is responsive; the model remains a conceptual architectural interpretation, not BIM.

Validation adds independent image/SVG cover-projection checks through desktop, tablet, mobile and zoom; selective night-window checks; mobile WebGL remount; plus existing galleries, plans, keyboard, fallback and Moradas regression. Local day/night desktop/mobile visual captures are in ignored `tmp/g400-refinement/`.

## Multi-view facade navigation — 2026-09-26

The scene offers Lateral 1 / Frente / Lateral 2. Moving between lateral views goes through the front with a directional perspective crossfade and a short frontal hold; these are transitions between supplied renderings, not reconstructed photographic 3D. Reduced-motion preferences switch directly. New requests cancel in-flight animations; images decode before the transition, and failures retain the previous scene with a retry action. Floor and lighting state persist across views.

`scene-front.svg` and `scene-right.svg` frame the unchanged, embedded original WebP files (02 and 01 respectively) in the scene's 1672 × 941 viewport. They use a restrained sky background and edge mask; no generative change to the source architecture. Rebuild with `node scripts/g400-scene-assets.mjs`.

Each perspective has its own source-coordinate floor outlines and window quads in `g400Projection.ts`. Hits cover both visible ends of the facade. Hover, focus and selection now use the Moradas floor treatment. Warm pane gradients, mullions, halos and sunset/night opacity follow Moradas as well, replacing the previous barely visible treatment.

Additional checks exercise lateral-to-front-to-lateral order in both directions, cancellation, retained floor and lighting, pointer selection at both ends of all three views, and reduced-motion mobile navigation. Visual evidence: ignored `tmp/g400-views/`.
