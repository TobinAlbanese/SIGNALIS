import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { store, paths, ensureDirectories, getDb, id, now, asJson, parseJson } from './db.mjs';
import { seedDemo } from './seedData.mjs';

ensureDirectories();
getDb();
seedDemo(store);

const app = express();
const port = Number(process.env.PORT ?? 4343);
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const target = file.mimetype.startsWith('image/') ? paths.imageDir : paths.documentDir;
      fs.mkdirSync(target, { recursive: true });
      cb(null, target);
    },
    filename(req, file, cb) {
      const extension = path.extname(file.originalname);
      cb(null, `${Date.now()}-${id()}${extension}`);
    }
  })
});

app.use(express.json({ limit: '25mb' }));
app.use('/media', express.static(paths.mediaRoot));
app.use('/exports', express.static(paths.exportsDir));

app.use((req, res, next) => {
  res.setHeader('X-TAOSINT-Safety', 'manual-local-first-no-ai-no-live-tracking');
  next();
});

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function notFound(res, label = 'Record') {
  return res.status(404).json({ error: `${label} not found` });
}

function attachmentHeaders(res, filename, contentType) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'TAOSINT',
    localFirst: true,
    noEmbeddedAi: true,
    database: path.relative(process.cwd(), paths.dbFile)
  });
});

app.get('/api/projects', (req, res) => res.json(store.listProjects()));
app.post('/api/projects', (req, res) => res.status(201).json(store.createProject(req.body)));
app.get('/api/projects/:id', (req, res) => {
  const project = store.getProject(req.params.id);
  if (!project) return notFound(res, 'Project');
  return res.json(project);
});
app.put('/api/projects/:id', (req, res) => {
  const project = store.updateProject(req.params.id, req.body);
  return res.json(project);
});
app.delete('/api/projects/:id', (req, res) => res.json({ ok: store.deleteProject(req.params.id) }));

app.get('/api/projects/:projectId/entities', (req, res) => res.json(store.listEntities(req.params.projectId)));
app.post('/api/projects/:projectId/entities', (req, res) => res.status(201).json(store.createEntity(req.params.projectId, req.body)));
app.get('/api/entities/:id', (req, res) => {
  const entity = store.getEntity(req.params.id);
  if (!entity) return notFound(res, 'Entity');
  return res.json(entity);
});
app.put('/api/entities/:id', (req, res) => {
  const entity = store.updateEntity(req.params.id, req.body);
  if (!entity) return notFound(res, 'Entity');
  return res.json(entity);
});
app.delete('/api/entities/:id', (req, res) => res.json({ ok: store.deleteEntity(req.params.id) }));
app.get('/api/entities/:id/export/markdown', (req, res) => {
  const markdown = store.exportEntityMarkdown(req.params.id);
  if (!markdown) return notFound(res, 'Entity');
  attachmentHeaders(res, `entity-${req.params.id}.md`, 'text/markdown; charset=utf-8');
  return res.send(markdown);
});

app.get('/api/projects/:projectId/relationships', (req, res) => res.json(store.listRelationships(req.params.projectId)));
app.post('/api/projects/:projectId/relationships', (req, res) =>
  res.status(201).json(store.createRelationship(req.params.projectId, req.body))
);
app.put('/api/relationships/:id', (req, res) => {
  const relationship = store.updateRelationship(req.params.id, req.body);
  if (!relationship) return notFound(res, 'Relationship');
  return res.json(relationship);
});
app.delete('/api/relationships/:id', (req, res) => res.json({ ok: store.deleteRelationship(req.params.id) }));

app.get('/api/projects/:projectId/locations', (req, res) =>
  res.json(store.listEntities(req.params.projectId).filter((entity) => entity.type === 'location'))
);
app.post('/api/projects/:projectId/locations', (req, res) =>
  res.status(201).json(store.createEntity(req.params.projectId, { ...req.body, type: 'location', details: req.body.details ?? req.body }))
);
app.put('/api/locations/:id', (req, res) => {
  const entity = store.updateEntity(req.params.id, { ...req.body, type: 'location', details: req.body.details ?? req.body });
  if (!entity) return notFound(res, 'Location');
  return res.json(entity);
});

app.get('/api/projects/:projectId/events', (req, res) => res.json(store.listEvents(req.params.projectId)));
app.post('/api/projects/:projectId/events', (req, res) => res.status(201).json(store.createEvent(req.params.projectId, req.body)));
app.put('/api/events/:id', (req, res) => {
  const event = store.updateEvent(req.params.id, req.body);
  if (!event) return notFound(res, 'Event');
  return res.json(event);
});
app.delete('/api/events/:id', (req, res) => res.json({ ok: store.deleteEvent(req.params.id) }));

app.get('/api/projects/:projectId/sources', (req, res) => res.json(store.listSources(req.params.projectId)));
app.post('/api/projects/:projectId/sources', (req, res) => res.status(201).json(store.createSource(req.params.projectId, req.body)));
app.put('/api/sources/:id', (req, res) => {
  const source = store.updateSource(req.params.id, req.body);
  if (!source) return notFound(res, 'Source');
  return res.json(source);
});
app.delete('/api/sources/:id', (req, res) => res.json({ ok: store.deleteSource(req.params.id) }));

app.get('/api/projects/:projectId/notes', (req, res) => res.json(store.listNotes(req.params.projectId)));
app.post('/api/projects/:projectId/notes', (req, res) => res.status(201).json(store.createNote(req.params.projectId, req.body)));
app.put('/api/notes/:id', (req, res) => {
  const note = store.updateNote(req.params.id, req.body);
  if (!note) return notFound(res, 'Note');
  return res.json(note);
});
app.delete('/api/notes/:id', (req, res) => res.json({ ok: store.deleteNote(req.params.id) }));

app.get('/api/projects/:projectId/claims', (req, res) => res.json(store.listClaims(req.params.projectId)));
app.post('/api/projects/:projectId/claims', (req, res) => res.status(201).json(store.createClaim(req.params.projectId, req.body)));

app.get('/api/projects/:projectId/open-questions', (req, res) => res.json(store.listOpenQuestions(req.params.projectId)));
app.post('/api/projects/:projectId/open-questions', (req, res) =>
  res.status(201).json(store.createOpenQuestion(req.params.projectId, req.body))
);

app.get('/api/projects/:projectId/sticky-notes', (req, res) => res.json(store.listStickyNotes(req.params.projectId)));
app.post('/api/projects/:projectId/sticky-notes', (req, res) =>
  res.status(201).json(store.createStickyNote(req.params.projectId, req.body))
);

app.get('/api/projects/:projectId/diagram-layouts', (req, res) => res.json(store.listDiagramLayouts(req.params.projectId)));
app.post('/api/projects/:projectId/diagram-layouts', (req, res) =>
  res.status(201).json(store.saveDiagramLayout(req.params.projectId, req.body))
);

app.get('/api/projects/:projectId/files', (req, res) => res.json(store.listFiles(req.params.projectId)));
app.post('/api/projects/:projectId/files', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  return res.status(201).json(store.createFile(req.params.projectId, req.file, req.body));
});
app.get('/api/files/:id', (req, res) => {
  const file = store.getFile(req.params.id);
  if (!file) return notFound(res, 'File');
  return res.sendFile(path.join(process.cwd(), file.filePath));
});
app.delete('/api/files/:id', (req, res) => res.json({ ok: store.deleteFile(req.params.id) }));

app.get('/api/projects/:projectId/audit-log', (req, res) => res.json(store.getAudit(req.params.projectId)));
app.get('/api/projects/:projectId/search', (req, res) => res.json(store.search(req.params.projectId, String(req.query.q ?? ''))));
app.get('/api/projects/:projectId/path', (req, res) => {
  const pathResult = store.pathBetween(req.params.projectId, String(req.query.from ?? ''), String(req.query.to ?? ''), Number(req.query.depth ?? 5));
  res.json({ path: pathResult });
});

app.get('/api/projects/:projectId/export/json', (req, res) => {
  const bundle = store.exportProject(req.params.projectId);
  if (!bundle) return notFound(res, 'Project');
  attachmentHeaders(res, `${req.params.projectId}.json`, 'application/json; charset=utf-8');
  return res.send(JSON.stringify(bundle, null, 2));
});
app.post('/api/projects/import/json', (req, res) => res.status(201).json(store.importProject(req.body)));
app.get(
  '/api/projects/:projectId/export/zip',
  asyncHandler(async (req, res) => {
    const zip = await store.exportZip(req.params.projectId);
    if (!zip) return notFound(res, 'Project');
    attachmentHeaders(res, `${req.params.projectId}.zip`, 'application/zip');
    return res.send(zip);
  })
);
app.get('/api/projects/:projectId/export/geojson', (req, res) => {
  attachmentHeaders(res, `${req.params.projectId}.geojson`, 'application/geo+json; charset=utf-8');
  return res.send(JSON.stringify(store.exportGeoJson(req.params.projectId), null, 2));
});
app.get('/api/projects/:projectId/export/graphml', (req, res) => {
  attachmentHeaders(res, `${req.params.projectId}.graphml`, 'application/xml; charset=utf-8');
  return res.send(store.exportGraphMl(req.params.projectId));
});
app.get('/api/projects/:projectId/export/markdown', (req, res) => {
  attachmentHeaders(res, `${req.params.projectId}.md`, 'text/markdown; charset=utf-8');
  return res.send(store.exportMarkdown(req.params.projectId));
});
app.get('/api/projects/:projectId/export/csv/:kind', (req, res) => {
  const kind = req.params.kind;
  const data =
    kind === 'entities'
      ? store.listEntities(req.params.projectId)
      : kind === 'relationships'
        ? store.listRelationships(req.params.projectId)
        : kind === 'events'
          ? store.listEvents(req.params.projectId)
          : kind === 'sources'
            ? store.listSources(req.params.projectId)
            : [];
  if (!data.length) return res.status(400).json({ error: 'Unsupported export kind or empty data' });
  const keys = Array.from(new Set(data.flatMap((item) => Object.keys(item).filter((key) => typeof item[key] !== 'object'))));
  const csv = [keys.join(','), ...data.map((row) => keys.map((key) => `"${String(row[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
  attachmentHeaders(res, `${req.params.projectId}-${kind}.csv`, 'text/csv; charset=utf-8');
  return res.send(csv);
});

app.post(
  '/api/geocode/search',
  asyncHandler(async (req, res) => {
    const query = String(req.body.query ?? '').trim();
    if (!query) return res.status(400).json({ error: 'Query is required' });
    const database = getDb();
    const cacheKey = query.toLowerCase();
    const cached = database.prepare('SELECT result_json FROM geocode_cache WHERE provider = ? AND query = ?').get('nominatim', cacheKey);
    if (cached) return res.json({ provider: 'nominatim', cached: true, results: parseJson(cached.result_json, []) });

    const endpoint = new URL('https://nominatim.openstreetmap.org/search');
    endpoint.searchParams.set('format', 'jsonv2');
    endpoint.searchParams.set('limit', '6');
    endpoint.searchParams.set('q', query);
    const response = await fetch(endpoint, { headers: { 'User-Agent': 'TAOSINT local-first notebook/0.1' } });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    const raw = await response.json();
    const results = raw.map((item) => ({
      provider: 'nominatim',
      placeId: item.place_id,
      resolvedName: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      boundingBox: item.boundingbox,
      precisionLevel: item.type === 'city' || item.addresstype === 'city' ? 'City-level' : 'Unknown'
    }));
    database
      .prepare('INSERT OR REPLACE INTO geocode_cache (id, provider, query, result_json, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id(), 'nominatim', cacheKey, asJson(results, []), now());
    res.json({ provider: 'nominatim', cached: false, results });
  })
);

app.post(
  '/api/geocode/reverse',
  asyncHandler(async (req, res) => {
    const lat = Number(req.body.lat);
    const lon = Number(req.body.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: 'Valid lat and lon are required' });
    const query = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const database = getDb();
    const cached = database.prepare('SELECT result_json FROM geocode_cache WHERE provider = ? AND query = ?').get('nominatim-reverse', query);
    if (cached) return res.json({ provider: 'nominatim', cached: true, result: parseJson(cached.result_json, null) });
    const endpoint = new URL('https://nominatim.openstreetmap.org/reverse');
    endpoint.searchParams.set('format', 'jsonv2');
    endpoint.searchParams.set('lat', String(lat));
    endpoint.searchParams.set('lon', String(lon));
    const response = await fetch(endpoint, { headers: { 'User-Agent': 'TAOSINT local-first notebook/0.1' } });
    if (!response.ok) throw new Error(`Reverse geocoder returned ${response.status}`);
    const raw = await response.json();
    const result = {
      provider: 'nominatim',
      placeId: raw.place_id,
      resolvedName: raw.display_name,
      latitude: lat,
      longitude: lon,
      precisionLevel: 'Unknown',
      address: raw.address ?? {}
    };
    database
      .prepare('INSERT OR REPLACE INTO geocode_cache (id, provider, query, result_json, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id(), 'nominatim-reverse', query, asJson(result, {}), now());
    res.json({ provider: 'nominatim', cached: false, result });
  })
);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status ?? 500).json({ error: error.message ?? 'Unexpected server error' });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distDir, 'index.html'));
    }
    return next();
  });
}

const server = app.listen(port, () => {
  console.log(`TAOSINT API listening on http://localhost:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
