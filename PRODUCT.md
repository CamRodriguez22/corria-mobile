# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

- **Field technicians** (`tecnico`): photograph galvanized-steel plates in the field, often in sun and with one hand, upload one photo or a whole batch (lote) to a measurement point (Punto), and check the result right away. They can rename or delete only their own photos.
- **Company admins and super admins** (`admin`, `super_admin`): watch what was uploaded across their scope and manage photos and lotes.
- **Clients** (`cliente`): read-only; they follow results and history.

## Product Purpose

PIXELRUST measures corrosion on galvanized steel plates from photos. An AI segmentation model computes the corroded area percentage over the plate and assigns a level based on ISO 10289. The mobile app is not a copy of the web. It keeps the essence of the final project in a more accessible form and serves two jobs:
1. Upload photos (one or several) and lotes.
2. Monitor uploaded information: results, lotes, history, levels and trends.

Success: a technician uploads a batch in a few taps and immediately understands each result, and a supervisor understands how a point is evolving without opening the web.

## Positioning

Corrosion measured from the plate itself (approximate % over the plate, not over the whole photo), with levels aligned to ISO 10289 and the same backend and thresholds as the PIXELRUST web dashboard.

## Operating Context

- Outdoor test sites and plants; variable connectivity (offline banner, cached history).
- Hierarchy: Zona > Punto > Lote > Medición (photo).
- Backend: AWS (Cognito auth, API Gateway + Lambda, S3 presigned uploads). Thumbnail URLs are presigned and expire after 1 hour.
- Tested on the computer with Expo web at phone size (390x844); shipped as an Android build with Expo dev client.

## Capabilities and Constraints

- Levels: Sin corrosión (<0.05 %), Leve (<10 %), Moderada (<25 %), Severa (>=25 %), 0-3. Identical to backend `_calcular_nivel` and web `statusUtils.js`.
- The app does not create users, zones or points, and has no maps.
- Only endpoints that exist in the backend; no invented routes or fields.
- Terminology identical to the web: Zona, Punto, Lote, Medición (or "foto" in everyday language). Spanish UI, neutral register, addressing the user as "tú".
- Not tied to any university or institution; company and city come from the user's profile.

## Brand Commitments

- Name: PIXELRUST.
- Palette coherent with the PIXELRUST web (accent `#C1460B`, text-safe severity colors).
- Icons: custom SVG, 24 grid, stroke 2.2, round caps (style "trazo técnico industrial", chosen by the owner). No emojis or text glyphs as icons. New icon styles are shown to the owner before being applied.
- The app is the project's showcase: visual quality is a priority.

## Evidence on Hand

- Real backend data only (photos, percentages, levels). No invented testimonials, metrics or customers.
- Design reference: `~/projects/corrosion-ml/1_documentos_pf/docs/cimientos-de-ux_resumen.md` (Nielsen heuristics, severity scale 0-4).

## Product Principles

1. The result must be understood at a glance: level, percentage and the photo, together.
2. Field first: large touch targets, clear states, nothing lost when the network fails.
3. Same truth as the web: same thresholds, vocabulary and data.
4. Honest numbers: the percentage is approximate and over the plate, and partial data is labeled as partial.

## Accessibility & Inclusion

WCAG AA contrast (4.5:1 for text), touch targets of at least 44 pt (48 dp on Android), text of at least 14 pt (12 pt only for metadata), accessibility labels on icon-only controls, respect for reduced motion.
