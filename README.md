# TAOSINT

TAOSINT is a local-first manual intelligence mapping notebook for structured public-source research. It is designed for analysts to enter records manually once, then reuse the same structured data across tables, profiles, graph boards, map boards, timelines, notes, source review, and exports.

TAOSINT does not include embedded AI, live tracking, private-account scraping, doxxing automation, or automatic sensitive-data inference.

## Quick Start

Requirements:

- Node.js 22.5 or newer
- npm

Install dependencies:

```bash
npm install --cache .npm-cache
```

Reset and seed the local SQLite database:

```bash
npm run db:reset
```

Run the local app:

```bash
npm run dev
```

Open:

```text
http://localhost:4343/
```

The API runs at:

```text
http://localhost:4343/
```

For hot-reload frontend development, use:

```bash
npm run dev:hot
```

Then open:

```text
http://localhost:5174/
```

If port `4343` is already taken, choose another local port:

```bash
PORT=4500 npm run dev
```

Then open:

```text
http://localhost:4500/
```

## Production Local Use

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

Open:

```text
http://localhost:4343/
```

## First Launch Seed Data

The seed creates one project:

- The AL-Qaeda Framework
- 222 structured records across people, organizations, regions, countries, and key locations
- 164 chart-derived and chronology-derived relationships
- 44 timeline events
- 3 source records, 3 claims, 4 open questions, and 2 graph sticky notes

The seed is built from the user-provided chart/PDF and analyst chronology. Dense chart-derived links are intentionally marked as chart-claimed, low/unknown confidence, or requiring verification where appropriate. Use manual source review before external publication.

## Project Structure

```text
.
├── server/
│   ├── db.mjs                  # SQLite schema, data access, exports
│   ├── index.mjs               # Express API and static production server
│   ├── seedData.mjs            # First-launch framework seed data
│   └── scripts/
│       ├── reset-db.mjs
│       └── seed.mjs
├── src/
│   ├── components/             # Layout, inspector, quick add, UI primitives
│   ├── lib/                    # API and download helpers
│   ├── store/                  # Zustand workspace store
│   ├── views/                  # Dashboard, graph, map, timeline, sources, files, notes, reports
│   ├── constants.ts
│   ├── styles.css
│   └── types.ts
├── data/                       # Local SQLite database
├── media/                      # Local images and documents
├── exports/                    # Export output and verification artifacts
├── backups/
└── dist/                       # Production frontend build
```

## Main Features

- Multi-project local workspace
- SQLite schema for projects, entities, people, organizations, locations, events, sources, relationships, notes, files, claims, open questions, diagram layouts, sticky notes, and audit log
- REST API for project, entity, relationship, event, source, note, file, search, geocoding, and export workflows
- Three-panel analyst layout with top bar, sidebar, workspace, inspector, and bottom drawer
- Entity table powered by TanStack Table and a Zotero-style source review workspace
- Manual quick-add workflow for projects, entities, relationships, locations, events, sources, and notes
- Right inspector editing for selected entities, relationships, events, sources, notes, files, and sticky notes
- React Flow graph board with custom entity/sticky nodes, labeled edges, drag-to-create relationships, dark minimap, zoom/pan, layout controls, and image export
- Diagram modes: freeform, hierarchy, family tree, spider, organization chart, event network, location network, source/evidence graph
- Leaflet map board with swappable layers, click-to-add person/event/location/note markers, country highlights, route/measurement lines, precision labels, organization/country/confidence filters, geocoding provider interface, GeoJSON export, and PNG/JPG/WebP capture
- Timeline view combining events, relationship dates, and source publication dates
- Notes workspace with simple Markdown-style preview
- File library with local uploads, image previews, duplicate hints from local hashes, and external reverse-image-search launchers
- Reports view with Markdown/HTML entity dossier export and local path finder
- Global search across entities, notes, sources, events, relationships, and tags
- Public-safe export architecture notes and safety constraints in the UI

## Import And Export

Project exports:

- JSON: `/api/projects/:projectId/export/json`
- ZIP: `/api/projects/:projectId/export/zip`
- GeoJSON: `/api/projects/:projectId/export/geojson`
- GraphML: `/api/projects/:projectId/export/graphml`
- Markdown: `/api/projects/:projectId/export/markdown`
- CSV: `/api/projects/:projectId/export/csv/entities`, `relationships`, `events`, or `sources`

Entity dossier export:

- Markdown: `/api/entities/:id/export/markdown`
- HTML: available from the Reports view

Project JSON import:

- Use the top-bar Import button, or POST JSON to `/api/projects/import/json`.

Graph visual export:

- Use the Graph Board export buttons for JPG, WebP, PNG, or SVG.

Map export:

- Use the Map Board export buttons for GeoJSON, PNG, JPG, or WebP.

Automatic project archive:

- When a new project is created, the currently active project is archived under `backups/`.
- The archive folder includes JSON data, GeoJSON, GraphML, Markdown, copied media files, metadata, and lightweight SVG visual summaries for the network and map.

## Database Reset

```bash
npm run db:reset
```

This removes `data/taosint.sqlite`, recreates the schema, and reseeds `The AL-Qaeda Framework`.

## Local Storage

TAOSINT keeps data on the local machine:

```text
data/taosint.sqlite
media/images/
media/documents/
media/originals/
media/processed/
exports/
backups/
```

## Safety Constraints

The app is intended for lawful public-source research, historical analysis, sanctions research, organizational mapping, academic-style analysis, and manual evidence review.

Design constraints:

- No live tracking
- No automated doxxing
- No private-account scraping
- No automatic sensitive personal-data inference
- Exact personal addresses are not displayed by default
- Location precision labels are part of mapped records
- Exports are designed to support redaction and public-safe modes
- Relationships and claims show source/confidence status
- Unsourced and low-confidence records are visibly marked

## Public Viewer Architecture Notes

The code is structured so a later static public viewer export can emit:

```text
viewer.html
project-public.json
media/
assets/
```

Planned public viewer settings:

- Include or exclude exact coordinates
- Include or exclude analyst notes
- Include or exclude low-confidence relationships
- Include or exclude sources and images
- Anonymize selected entities
- Blur selected images
- Hide private fields and local file paths
- Render read-only graph, map, timeline, profiles, and source list

## Known Limitations

- Node's built-in `node:sqlite` module is currently experimental, but avoids native SQLite install friction.
- Advanced image editing tools are represented by the local file/image workflow and planned derivative model; crop, perspective correction, OCR, and full derivative editing are future work.
- PDF exports are planned; Markdown and HTML dossier exports work now.
- Map image export depends on browser capture behavior and third-party tile CORS behavior.
- The first production bundle is intentionally broad and may trigger a Vite chunk-size warning; code splitting is a future optimization.
- Geocoding uses a Nominatim-compatible provider only when manually triggered and caches results locally.

## Roadmap

- Richer entity-specific profile pages
- Full claim/evidence editor
- Redaction-aware public viewer bundle export
- Map drawing tools for polygons and routes
- Marker clustering
- Full local image derivative editor
- OCR with searchable text
- PDF report generation
- Optional Tauri desktop wrapper
- Optional offline map/geocoder support
