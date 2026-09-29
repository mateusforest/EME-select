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

Floor regions follow the slab contours of each visible volume in the source image coordinate system. Selection and hover use a translucent green fill with a pale green outline. Recessed timber bays are not crossed by diagonals joining different facade planes. Night overlays use inset glass panes with varied brightness, preserving frames and planted balustrades.

The navigable model now has seven residential levels over the commercial podium, recessed timber cores, framed corner glazing, balcony slabs and clustered planting, stone/timber/paving textures, a stepped glazed crown and an entrance canopy. Instanced geometry limits draw calls. Environment reflections, directional shadows and selective warm interior emission replace uniformly luminous glazing. Mobile camera fit is responsive; the model remains a conceptual architectural interpretation, not BIM.

Validation adds independent image/SVG cover-projection checks through desktop, tablet, mobile and zoom; selective night-window checks; mobile WebGL remount; plus existing galleries, plans, keyboard, fallback and Moradas regression. Local day/night desktop/mobile visual captures are in ignored `tmp/g400-refinement/`.

## Multi-view facade navigation — 2026-09-26

The scene offers Lateral 1 / Frente / Lateral 2. Moving between lateral views goes through the front with a directional perspective crossfade and a short frontal hold; these are transitions between supplied renderings, not reconstructed photographic 3D. Reduced-motion preferences switch directly. New requests cancel in-flight animations; images decode before the transition, and failures retain the previous scene with a retry action. Floor and lighting state persist across views.

`scene-front.svg` and `scene-right.svg` frame the unchanged, embedded original WebP files (02 and 01 respectively) in the scene's 1672 × 941 viewport. They use a restrained sky background and edge mask; no generative change to the source architecture. Rebuild with `node scripts/g400-scene-assets.mjs`.

Each perspective has its own source-coordinate floor outlines and window quads in `g400Projection.ts`. Hits cover both visible ends of the facade. Hover, focus and selection use the Moradas floor treatment. Warm pane gradients and sunset/night opacity share that vocabulary. Exterior halos and artificial mullions were removed: the lighting stays within the traced glass and the original frames remain visible.

Alignment correction: the lateral views use separate contours for the near corner and the distant wings; the front follows the slight perspective of its slab lines. Rows are traced separately rather than extrapolated with uniform spacing. Enlarged source-coordinate comparisons cover floors 1, 3, 6 and 7 in all three views.

The 3D marker now has vertical green faces over the full 3.2-unit storey height, following the model's balcony footprint and recessed cores, plus a separate crown on floor 7. Both upper and lower edges are visible; there is no opaque horizontal cap. Pointer hover previews a floor, leaving the model restores the selected floor, and orbit drags do not select units. The former yellow slab-level line is removed.

Additional checks exercise lateral-to-front-to-lateral order in both directions, cancellation, retained floor and lighting, pointer selection at both ends of all three views, and reduced-motion mobile navigation. Visual evidence: ignored `tmp/g400-views/`.

## Initial apartment pilot — 2026-09-29 (superseded by the refinement below)

This section records the initial release. The current behavior is described under Continuous visit refinement.

Selecting a unit now opens a dedicated residence dialog with the correct commercial area, suite count, unit-specific inquiry, room selection and unmodified original sheet. All eight documented residential types and all 31 explicitly listed unit identifiers are covered. Duplex 703 exposes two internal levels; triplex 704/705 expose three. These are internal levels, not new building-floor numbers. The main galleries remain available independently.

`g400Residences.ts` stores hand-inspected source-pixel crops and room points. HTML room buttons share the exact aspect ratio of the cropped SVG viewport, including mobile, avoiding cover/contain drift. The original complete sheet remains available at full width with horizontal scroll on request. No original asset was changed or generated.

The first 3D interior is **Tipo 5**, used only by its listed units 105/205/305/405/505. `buildTipo5.ts` traces a conceptual footprint and room divisions from that sheet; furniture and material treatments are authored geometry. `G400ApartmentModel.tsx` provides orbit/zoom in a low-wall cutaway, selectable room markers, first-person viewing stations with pointer/keyboard look, and illustrative lighting from 08:00 to 20:00. The starting light follows the facade's day/sunset/night choice. Only the model code and Three.js are loaded when the visitor requests 3D.

This is a browser-based, conceptual pilot, not a measured architectural digital twin or a photorealistic replica. It deliberately uses a neutral exterior. No unit-specific window view, physical sun study, actual dimensions, delivery specifications or live availability is asserted. Heights, wall thicknesses, lighting and furniture are estimates. No free walking/collision simulation, exterior-to-interior continuous camera path, or interior 3D for the other types is shipped in this stage. Other types expose interactive original plans instead of reusing an incorrect 3D layout. Public UI labels the 3D as a pilot and states these material limitations.

The shortcut opens the selected floor's Tipo 5 if one exists, or documented unit 305 otherwise, updating the floor selection consistently. Closing the dialog restores focus and returns to the matching floor. Context loss offers the plan immediately; reopening 3D creates a fresh renderer. Scene materials, geometry, textures, event handlers, controls and resize observation are cleaned up on unmount.

Validation: `npm run build`; `node node_modules/@playwright/test/cli.js test tests/g400-residence.spec.ts tests/g400.spec.ts`. New coverage includes all types and levels, pointer/keyboard room selection, pixel-to-hotspot alignment at 1440/390/320px, unit-specific contact context, retained floor/focus, 3D camera/light state, context-loss recovery and mobile dialog width. Screenshots inspected in ignored `tmp/g400-residence/` and `test-results/`.

## Continuous visit refinement — 2026-09-29

The original rendered facade is now the only exterior experience. Dragging moves through the three supplied perspectives; scrolling or the zoom buttons brings the building closer. Floor selection isolates and approaches the documented slab contour, with original plan previews beside the unit list. This is navigation among registered images, not a reconstructed photographic 360-degree scene. The older exterior massing model is no longer exposed or loaded.

Selecting a Tipo 5 unit opens its furnished cutaway directly. Entering the apartment uses a continuous camera transition. Clicking the floor, furniture or the minimap chooses a reachable destination; a route follows the shared plan, walls, doors and furniture footprints. WASD, arrow keys and holdable mobile controls allow manual movement and looking. A position/heading minimap and stop action make the movement legible. New destinations replace previous walks; blur, lost pointer capture and hidden pages release controls.

`tipo5Navigation.ts` defines the common source-coordinate geometry and collision rules used by the model. A grid search finds a route; swept collision checks constrain both smoothed routes and manual movement. Suite access follows the corridor openings on the original sheet. All 49 ordered room-to-room routes are checked for reachability and clearance.

The interior palette follows the supplied G400 renderings: oak, pale stone, cream textiles, green accents, bronze details, curtains and warm indirect lighting. Those reference images show penthouse interiors; they establish a visual language, not photographic evidence of the Tipo 5 furniture or finishes. Local CC0 material maps and studio reflections are documented in `public/assets/developments/g400/materials/SOURCES.md`. HDR lighting is not used as a window view. Desktop ambient occlusion adds contact depth; small screens use the lighter renderer. Original plans, availability qualifications and conceptual-model labeling remain intact.

The visitor can walk continuously within Tipo 5 (105/205/305/405/505). Other layouts retain their correct interactive source plans. Exact measured geometry, actual window views, photorealistic interior reconstruction and a continuous exterior-to-interior 3D camera path remain outside this implementation. Async texture/environment loads, render targets, shadows, materials, handlers and movement state are cleaned up on unmount; WebGL context loss returns access to the source plan.

Validation: `npm run build`; `node node_modules/@playwright/test/cli.js test tests/g400.spec.ts tests/g400-residence.spec.ts tests/g400-walking.spec.ts`. Coverage includes facade drag/zoom/floor focus, retained galleries and discovery links, all unit sheets/levels, path reachability, changing/stopping walks, actual canvas clicks, look controls, collision-safe keyboard movement, mobile held controls, reduced motion, context loss and overflow. Visual review captures are in ignored `tmp/g400-walk/`.
