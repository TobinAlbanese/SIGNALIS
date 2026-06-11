import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import JSZip from 'jszip';

export const rootDir = process.cwd();
export const paths = {
  dataDir: path.join(rootDir, 'data'),
  dbFile: path.join(rootDir, 'data', 'taosint.sqlite'),
  mediaRoot: path.join(rootDir, 'media'),
  imageDir: path.join(rootDir, 'media', 'images'),
  documentDir: path.join(rootDir, 'media', 'documents'),
  originalsDir: path.join(rootDir, 'media', 'originals'),
  processedDir: path.join(rootDir, 'media', 'processed'),
  exportsDir: path.join(rootDir, 'exports'),
  backupsDir: path.join(rootDir, 'backups')
};

const jsonColumns = new Set([
  'tags',
  'aliases',
  'defaultMapCenter',
  'sourceIds',
  'attachments',
  'knownFamilyMembers',
  'knownAssociates',
  'knownLocations',
  'childOrganizationIds',
  'knownMembers',
  'leadership',
  'operatingLocations',
  'activeDates',
  'publicDesignations',
  'sanctions',
  'linkedEntities',
  'linkedEvents',
  'linkedRelationships',
  'boundingBox',
  'nodes',
  'edges',
  'viewport',
  'metadata',
  'translation',
  'fields',
  'sourceIds'
]);

const entityDetailTables = {
  person: 'people',
  organization: 'organizations',
  'sub-organization': 'organizations',
  location: 'locations',
  event: null,
  source: null,
  document: null,
  image: null
};

const relationshipTypes = new Set([
  'reports_to',
  'commands',
  'supervises',
  'member_of',
  'leader_of',
  'deputy_of',
  'subordinate_of',
  'appointed_by',
  'replaced_by',
  'predecessor_of',
  'successor_of',
  'family_member_of',
  'parent_of',
  'child_of',
  'sibling_of',
  'spouse_of',
  'associate_of',
  'ally_of',
  'rival_of',
  'owns',
  'controls',
  'funds',
  'communicates_with',
  'traveled_to',
  'located_in',
  'last_seen_at',
  'operates_in',
  'attended_event',
  'involved_in',
  'mentioned_in',
  'source_claims',
  'source_supports',
  'source_contradicts',
  'sanctioned_by',
  'designated_by',
  'part_of',
  'custom'
]);

const confidenceValues = new Set(['high', 'medium', 'low', 'unknown', 'contradicted']);

let db;

export function ensureDirectories() {
  for (const dir of Object.values(paths)) {
    if (dir.endsWith('.sqlite')) continue;
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb() {
  if (!db) {
    ensureDirectories();
    db = new DatabaseSync(paths.dbFile);
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA journal_mode = WAL;');
    migrate(db);
  }
  return db;
}

export function resetDb() {
  if (db) {
    db.close();
    db = undefined;
  }
  if (fs.existsSync(paths.dbFile)) fs.rmSync(paths.dbFile);
  for (const suffix of ['-wal', '-shm']) {
    if (fs.existsSync(`${paths.dbFile}${suffix}`)) fs.rmSync(`${paths.dbFile}${suffix}`);
  }
  return getDb();
}

function migrate(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'General research',
      status TEXT DEFAULT 'active',
      tags_json TEXT DEFAULT '[]',
      default_map_center_json TEXT DEFAULT '{"lat":30.1798,"lng":66.975,"label":"Quetta, Balochistan, Pakistan"}',
      default_map_zoom INTEGER DEFAULT 5,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      aliases_json TEXT DEFAULT '[]',
      image_file_id TEXT,
      summary TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      tags_json TEXT DEFAULT '[]',
      confidence TEXT DEFAULT 'unknown',
      source_ids_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS people (
      entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
      full_name TEXT DEFAULT '',
      native_name TEXT DEFAULT '',
      transliterations_json TEXT DEFAULT '[]',
      date_of_birth TEXT DEFAULT '',
      date_of_death TEXT DEFAULT '',
      nationality TEXT DEFAULT '',
      role_title TEXT DEFAULT '',
      rank TEXT DEFAULT '',
      organization_id TEXT DEFAULT '',
      sub_organization_id TEXT DEFAULT '',
      faction TEXT DEFAULT '',
      status TEXT DEFAULT '',
      influence_level TEXT DEFAULT '',
      access_level TEXT DEFAULT '',
      known_family_members_json TEXT DEFAULT '[]',
      known_associates_json TEXT DEFAULT '[]',
      known_locations_json TEXT DEFAULT '[]',
      last_known_location_id TEXT DEFAULT '',
      current_role_start_date TEXT DEFAULT '',
      current_role_end_date TEXT DEFAULT '',
      profile_summary TEXT DEFAULT '',
      analyst_notes TEXT DEFAULT '',
      attachments_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS organizations (
      entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
      name TEXT DEFAULT '',
      aliases_json TEXT DEFAULT '[]',
      org_type TEXT DEFAULT '',
      parent_organization_id TEXT DEFAULT '',
      child_organization_ids_json TEXT DEFAULT '[]',
      known_members_json TEXT DEFAULT '[]',
      leadership_json TEXT DEFAULT '[]',
      operating_locations_json TEXT DEFAULT '[]',
      headquarters_location_id TEXT DEFAULT '',
      active_dates_json TEXT DEFAULT '{}',
      ideology_or_function TEXT DEFAULT '',
      public_designations_json TEXT DEFAULT '[]',
      sanctions_json TEXT DEFAULT '[]',
      summary TEXT DEFAULT '',
      analyst_notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS locations (
      entity_id TEXT PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
      name TEXT DEFAULT '',
      aliases_json TEXT DEFAULT '[]',
      location_type TEXT DEFAULT '',
      latitude REAL,
      longitude REAL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      region TEXT DEFAULT '',
      country TEXT DEFAULT '',
      precision_level TEXT DEFAULT 'Unknown',
      geocode_source TEXT DEFAULT '',
      original_query TEXT DEFAULT '',
      resolved_name TEXT DEFAULT '',
      bounding_box_json TEXT DEFAULT '[]',
      linked_entities_json TEXT DEFAULT '[]',
      linked_events_json TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      event_type TEXT DEFAULT 'Other',
      date_start TEXT DEFAULT '',
      date_end TEXT DEFAULT '',
      time_known INTEGER DEFAULT 0,
      location_id TEXT DEFAULT '',
      latitude REAL,
      longitude REAL,
      involved_person_ids_json TEXT DEFAULT '[]',
      involved_organization_ids_json TEXT DEFAULT '[]',
      source_ids_json TEXT DEFAULT '[]',
      description TEXT DEFAULT '',
      analyst_notes TEXT DEFAULT '',
      confidence TEXT DEFAULT 'unknown',
      tags_json TEXT DEFAULT '[]',
      attachments_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      url TEXT DEFAULT '',
      publisher TEXT DEFAULT '',
      author TEXT DEFAULT '',
      publication_date TEXT DEFAULT '',
      access_date TEXT DEFAULT '',
      source_type TEXT DEFAULT 'Other',
      reliability TEXT DEFAULT 'D: Unknown',
      credibility TEXT DEFAULT '3: Possibly true',
      archived_file_id TEXT DEFAULT '',
      citation_text TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      linked_entities_json TEXT DEFAULT '[]',
      linked_relationships_json TEXT DEFAULT '[]',
      linked_events_json TEXT DEFAULT '[]',
      attachments_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      source_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      target_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      relationship_type TEXT NOT NULL,
      direction TEXT DEFAULT 'directed',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      status TEXT DEFAULT 'unknown',
      confidence TEXT DEFAULT 'unknown',
      source_ids_json TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      parent_type TEXT DEFAULT 'project',
      parent_id TEXT DEFAULT '',
      note_type TEXT DEFAULT 'project',
      title TEXT DEFAULT '',
      body TEXT DEFAULT '',
      color TEXT DEFAULT 'note',
      tags_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT DEFAULT '',
      file_path TEXT NOT NULL,
      file_type TEXT DEFAULT 'document',
      hash TEXT DEFAULT '',
      perceptual_hash TEXT DEFAULT '',
      source_id TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS claims (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      claim_text TEXT NOT NULL,
      claim_type TEXT DEFAULT 'general',
      linked_entity_id TEXT DEFAULT '',
      linked_relationship_id TEXT DEFAULT '',
      linked_event_id TEXT DEFAULT '',
      source_ids_json TEXT DEFAULT '[]',
      confidence TEXT DEFAULT 'unknown',
      status TEXT DEFAULT 'unverified',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS open_questions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      linked_entity_id TEXT DEFAULT '',
      linked_relationship_id TEXT DEFAULT '',
      linked_event_id TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diagram_layouts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      diagram_type TEXT DEFAULT 'freeform',
      name TEXT DEFAULT 'Working board',
      nodes_json TEXT DEFAULT '[]',
      edges_json TEXT DEFAULT '[]',
      viewport_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sticky_notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT DEFAULT '',
      body TEXT DEFAULT '',
      color TEXT DEFAULT 'note',
      attached_to_node_id TEXT DEFAULT '',
      attached_to_relationship_id TEXT DEFAULT '',
      x REAL DEFAULT 0,
      y REAL DEFAULT 0,
      width REAL DEFAULT 220,
      height REAL DEFAULT 160,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS entity_tags (
      entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (entity_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS entity_sources (
      entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      link_type TEXT DEFAULT 'mentions',
      PRIMARY KEY (entity_id, source_id, link_type)
    );

    CREATE TABLE IF NOT EXISTS relationship_sources (
      relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      link_type TEXT DEFAULT 'supports',
      PRIMARY KEY (relationship_id, source_id, link_type)
    );

    CREATE TABLE IF NOT EXISTS event_sources (
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      link_type TEXT DEFAULT 'supports',
      PRIMARY KEY (event_id, source_id, link_type)
    );

    CREATE TABLE IF NOT EXISTS geocode_cache (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      query TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(provider, query)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      project_id TEXT DEFAULT '',
      actor TEXT DEFAULT 'local-user',
      action TEXT NOT NULL,
      target_type TEXT DEFAULT '',
      target_id TEXT DEFAULT '',
      details_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entities_project ON entities(project_id);
    CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
    CREATE INDEX IF NOT EXISTS idx_relationships_project ON relationships(project_id);
    CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
    CREATE INDEX IF NOT EXISTS idx_sources_project ON sources(project_id);
    CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
  `);
}

export function id() {
  return randomUUID();
}

export function now() {
  return new Date().toISOString();
}

export function parseJson(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function asJson(value, fallback = []) {
  if (value === undefined) return JSON.stringify(fallback);
  if (value === null) return JSON.stringify(fallback);
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value);
}

function rowToCamel(row) {
  if (!row) return null;
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()).replace(/Json$/, '');
    out[camel] = key.endsWith('_json') || jsonColumns.has(camel) ? parseJson(value, key.endsWith('_json') ? [] : value) : value;
  }
  return out;
}

function rowsToCamel(rows) {
  return rows.map(rowToCamel);
}

function requireProject(database, projectId) {
  const project = database.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) throw Object.assign(new Error('Project not found'), { status: 404 });
}

function audit(database, { projectId = '', action, targetType = '', targetId = '', details = {} }) {
  database
    .prepare(
      `INSERT INTO audit_log (id, project_id, action, target_type, target_id, details_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id(), projectId, action, targetType, targetId, asJson(details, {}), now());
}

function getCoreEntity(database, entityId) {
  const entity = database.prepare('SELECT * FROM entities WHERE id = ?').get(entityId);
  return rowToCamel(entity);
}

function detailForEntity(database, entity) {
  if (!entity) return null;
  const table = entityDetailTables[entity.type];
  if (!table) return entity;
  const row = database.prepare(`SELECT * FROM ${table} WHERE entity_id = ?`).get(entity.id);
  return { ...entity, details: rowToCamel(row) ?? {} };
}

function insertEntityDetail(database, entity, payload) {
  const detail = payload.details ?? payload;
  if (entity.type === 'person') {
    database
      .prepare(
        `INSERT OR REPLACE INTO people (
          entity_id, full_name, native_name, transliterations_json, date_of_birth, date_of_death,
          nationality, role_title, rank, organization_id, sub_organization_id, faction, status,
          influence_level, access_level, known_family_members_json, known_associates_json,
          known_locations_json, last_known_location_id, current_role_start_date, current_role_end_date,
          profile_summary, analyst_notes, attachments_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entity.id,
        detail.fullName ?? entity.name,
        detail.nativeName ?? '',
        asJson(detail.transliterations, []),
        detail.dateOfBirth ?? '',
        detail.dateOfDeath ?? '',
        detail.nationality ?? '',
        detail.roleTitle ?? detail.role ?? '',
        detail.rank ?? '',
        detail.organizationId ?? '',
        detail.subOrganizationId ?? '',
        detail.faction ?? '',
        detail.status ?? '',
        detail.influenceLevel ?? '',
        detail.accessLevel ?? '',
        asJson(detail.knownFamilyMembers, []),
        asJson(detail.knownAssociates, []),
        asJson(detail.knownLocations, []),
        detail.lastKnownLocationId ?? '',
        detail.currentRoleStartDate ?? '',
        detail.currentRoleEndDate ?? '',
        detail.profileSummary ?? entity.summary ?? '',
        detail.analystNotes ?? entity.notes ?? '',
        asJson(detail.attachments, [])
      );
  }

  if (entity.type === 'organization' || entity.type === 'sub-organization') {
    database
      .prepare(
        `INSERT OR REPLACE INTO organizations (
          entity_id, name, aliases_json, org_type, parent_organization_id, child_organization_ids_json,
          known_members_json, leadership_json, operating_locations_json, headquarters_location_id,
          active_dates_json, ideology_or_function, public_designations_json, sanctions_json, summary, analyst_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entity.id,
        detail.name ?? entity.name,
        asJson(detail.aliases ?? entity.aliases, []),
        detail.orgType ?? detail.type ?? (entity.type === 'sub-organization' ? 'Sub-organization' : ''),
        detail.parentOrganizationId ?? '',
        asJson(detail.childOrganizationIds, []),
        asJson(detail.knownMembers, []),
        asJson(detail.leadership, []),
        asJson(detail.operatingLocations, []),
        detail.headquartersLocationId ?? '',
        asJson(detail.activeDates, {}),
        detail.ideologyOrFunction ?? '',
        asJson(detail.publicDesignations, []),
        asJson(detail.sanctions, []),
        detail.summary ?? entity.summary ?? '',
        detail.analystNotes ?? entity.notes ?? ''
      );
  }

  if (entity.type === 'location') {
    database
      .prepare(
        `INSERT OR REPLACE INTO locations (
          entity_id, name, aliases_json, location_type, latitude, longitude, address, city, region,
          country, precision_level, geocode_source, original_query, resolved_name, bounding_box_json,
          linked_entities_json, linked_events_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entity.id,
        detail.name ?? entity.name,
        asJson(detail.aliases ?? entity.aliases, []),
        detail.locationType ?? detail.type ?? '',
        numberOrNull(detail.latitude),
        numberOrNull(detail.longitude),
        detail.address ?? '',
        detail.city ?? '',
        detail.provinceOrState ?? detail.region ?? '',
        detail.country ?? '',
        detail.precisionLevel ?? 'Unknown',
        detail.geocodeSource ?? '',
        detail.originalQuery ?? '',
        detail.resolvedName ?? '',
        asJson(detail.boundingBox, []),
        asJson(detail.linkedEntities, []),
        asJson(detail.linkedEvents, [])
      );
  }
}

function numberOrNull(value) {
  if (value === '' || value === undefined || value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function validateConfidence(value) {
  return confidenceValues.has(value) ? value : 'unknown';
}

function validateRelationshipType(value) {
  return relationshipTypes.has(value) ? value : 'custom';
}

export const store = {
  database: getDb,

  listProjects() {
    const database = getDb();
    return rowsToCamel(database.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all());
  },

  getProject(projectId) {
    const database = getDb();
    const project = rowToCamel(database.prepare('SELECT * FROM projects WHERE id = ?').get(projectId));
    if (!project) return null;
    return { ...project, stats: this.projectStats(projectId) };
  },

  createProject(payload) {
    const database = getDb();
    const timestamp = now();
    const project = {
      id: payload.id ?? id(),
      title: payload.title?.trim() || 'Untitled Project',
      description: payload.description ?? '',
      category: payload.category ?? 'General research',
      status: payload.status ?? 'active',
      tags: payload.tags ?? [],
      defaultMapCenter: payload.defaultMapCenter ?? { lat: 30.1798, lng: 66.975, label: 'Quetta, Balochistan, Pakistan' },
      defaultMapZoom: payload.defaultMapZoom ?? 5,
      notes: payload.notes ?? '',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    database
      .prepare(
        `INSERT INTO projects (
          id, title, description, category, status, tags_json, default_map_center_json,
          default_map_zoom, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        project.id,
        project.title,
        project.description,
        project.category,
        project.status,
        asJson(project.tags),
        asJson(project.defaultMapCenter, {}),
        project.defaultMapZoom,
        project.notes,
        project.createdAt,
        project.updatedAt
      );
    audit(database, { projectId: project.id, action: 'created project', targetType: 'project', targetId: project.id });
    return this.getProject(project.id);
  },

  updateProject(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const existing = this.getProject(projectId);
    const merged = { ...existing, ...payload, updatedAt: now() };
    database
      .prepare(
        `UPDATE projects SET title = ?, description = ?, category = ?, status = ?, tags_json = ?,
          default_map_center_json = ?, default_map_zoom = ?, notes = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        merged.title,
        merged.description ?? '',
        merged.category ?? 'General research',
        merged.status ?? 'active',
        asJson(merged.tags, []),
        asJson(merged.defaultMapCenter, {}),
        merged.defaultMapZoom ?? 5,
        merged.notes ?? '',
        merged.updatedAt,
        projectId
      );
    audit(database, { projectId, action: 'edited project', targetType: 'project', targetId: projectId });
    return this.getProject(projectId);
  },

  deleteProject(projectId) {
    const database = getDb();
    const result = database.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    audit(database, { projectId, action: 'deleted project', targetType: 'project', targetId: projectId });
    return result.changes > 0;
  },

  projectStats(projectId) {
    const database = getDb();
    const scalar = (sql, params = [projectId]) => database.prepare(sql).get(...params)?.count ?? 0;
    return {
      entities: scalar('SELECT COUNT(*) AS count FROM entities WHERE project_id = ?'),
      relationships: scalar('SELECT COUNT(*) AS count FROM relationships WHERE project_id = ?'),
      events: scalar('SELECT COUNT(*) AS count FROM events WHERE project_id = ?'),
      sources: scalar('SELECT COUNT(*) AS count FROM sources WHERE project_id = ?'),
      locations: scalar("SELECT COUNT(*) AS count FROM entities WHERE project_id = ? AND type = 'location'"),
      unsourcedClaims: scalar("SELECT COUNT(*) AS count FROM claims WHERE project_id = ? AND json_array_length(source_ids_json) = 0"),
      lowConfidenceRelationships: scalar(
        "SELECT COUNT(*) AS count FROM relationships WHERE project_id = ? AND confidence IN ('low','unknown','contradicted')"
      ),
      contradictions: scalar("SELECT COUNT(*) AS count FROM claims WHERE project_id = ? AND status = 'contradicted'"),
      openQuestions: scalar("SELECT COUNT(*) AS count FROM open_questions WHERE project_id = ? AND status != 'resolved'")
    };
  },

  listEntities(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    const entities = rowsToCamel(database.prepare('SELECT * FROM entities WHERE project_id = ? ORDER BY updated_at DESC').all(projectId));
    return entities.map((entity) => detailForEntity(database, entity));
  },

  getEntity(entityId) {
    const database = getDb();
    const entity = detailForEntity(database, getCoreEntity(database, entityId));
    if (!entity) return null;
    const relationships = rowsToCamel(
      database
        .prepare(
          `SELECT r.*, s.name AS source_name, t.name AS target_name
           FROM relationships r
           LEFT JOIN entities s ON s.id = r.source_entity_id
           LEFT JOIN entities t ON t.id = r.target_entity_id
           WHERE r.source_entity_id = ? OR r.target_entity_id = ?
           ORDER BY r.updated_at DESC`
        )
        .all(entityId, entityId)
    );
    const notes = rowsToCamel(database.prepare('SELECT * FROM notes WHERE parent_id = ? ORDER BY updated_at DESC').all(entityId));
    const events = rowsToCamel(
      database
        .prepare(
          `SELECT * FROM events
           WHERE involved_person_ids_json LIKE ? OR involved_organization_ids_json LIKE ? OR location_id = ?
           ORDER BY COALESCE(date_start, created_at) DESC`
        )
        .all(`%${entityId}%`, `%${entityId}%`, entityId)
    );
    const sources = entity.sourceIds?.length
      ? rowsToCamel(
          database.prepare(`SELECT * FROM sources WHERE id IN (${entity.sourceIds.map(() => '?').join(',')})`).all(...entity.sourceIds)
        )
      : [];
    return { ...entity, relationships, notes, events, sources };
  },

  createEntity(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const timestamp = now();
    const type = payload.type || 'custom';
    const entity = {
      id: payload.id ?? id(),
      projectId,
      type,
      name: payload.name?.trim() || payload.fullName?.trim() || payload.title?.trim() || 'Untitled Entity',
      aliases: payload.aliases ?? [],
      imageFileId: payload.imageFileId ?? '',
      summary: payload.summary ?? payload.profileSummary ?? '',
      notes: payload.notes ?? payload.analystNotes ?? '',
      tags: payload.tags ?? [],
      confidence: validateConfidence(payload.confidence ?? 'unknown'),
      sourceIds: payload.sourceIds ?? payload.sources ?? [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    database
      .prepare(
        `INSERT INTO entities (
          id, project_id, type, name, aliases_json, image_file_id, summary, notes, tags_json,
          confidence, source_ids_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        entity.id,
        projectId,
        entity.type,
        entity.name,
        asJson(entity.aliases, []),
        entity.imageFileId,
        entity.summary,
        entity.notes,
        asJson(entity.tags, []),
        entity.confidence,
        asJson(entity.sourceIds, []),
        timestamp,
        timestamp
      );
    insertEntityDetail(database, entity, payload);
    audit(database, { projectId, action: 'created entity', targetType: 'entity', targetId: entity.id, details: { type: entity.type } });
    return this.getEntity(entity.id);
  },

  updateEntity(entityId, payload) {
    const database = getDb();
    const existing = this.getEntity(entityId);
    if (!existing) return null;
    const merged = { ...existing, ...payload, details: { ...(existing.details ?? {}), ...(payload.details ?? {}) }, updatedAt: now() };
    database
      .prepare(
        `UPDATE entities SET type = ?, name = ?, aliases_json = ?, image_file_id = ?, summary = ?, notes = ?,
          tags_json = ?, confidence = ?, source_ids_json = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        merged.type,
        merged.name,
        asJson(merged.aliases, []),
        merged.imageFileId ?? '',
        merged.summary ?? '',
        merged.notes ?? '',
        asJson(merged.tags, []),
        validateConfidence(merged.confidence),
        asJson(merged.sourceIds, []),
        merged.updatedAt,
        entityId
      );
    insertEntityDetail(database, merged, { ...payload, details: merged.details });
    audit(database, { projectId: existing.projectId, action: 'edited entity', targetType: 'entity', targetId: entityId });
    return this.getEntity(entityId);
  },

  deleteEntity(entityId) {
    const database = getDb();
    const existing = getCoreEntity(database, entityId);
    if (!existing) return false;
    const result = database.prepare('DELETE FROM entities WHERE id = ?').run(entityId);
    audit(database, { projectId: existing.projectId, action: 'deleted entity', targetType: 'entity', targetId: entityId });
    return result.changes > 0;
  },

  listRelationships(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(
      database
        .prepare(
          `SELECT r.*, s.name AS source_name, s.type AS source_type, t.name AS target_name, t.type AS target_type
           FROM relationships r
           LEFT JOIN entities s ON s.id = r.source_entity_id
           LEFT JOIN entities t ON t.id = r.target_entity_id
           WHERE r.project_id = ?
           ORDER BY r.updated_at DESC`
        )
        .all(projectId)
    );
  },

  createRelationship(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    if (!payload.sourceEntityId || !payload.targetEntityId) throw Object.assign(new Error('Relationship endpoints are required'), { status: 400 });
    const timestamp = now();
    const relationship = {
      id: payload.id ?? id(),
      projectId,
      sourceEntityId: payload.sourceEntityId,
      targetEntityId: payload.targetEntityId,
      relationshipType: validateRelationshipType(payload.relationshipType),
      direction: payload.direction ?? 'directed',
      startDate: payload.startDate ?? '',
      endDate: payload.endDate ?? '',
      status: payload.status ?? 'unknown',
      confidence: validateConfidence(payload.confidence ?? 'unknown'),
      sourceIds: payload.sourceIds ?? [],
      notes: payload.notes ?? '',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    database
      .prepare(
        `INSERT INTO relationships (
          id, project_id, source_entity_id, target_entity_id, relationship_type, direction, start_date,
          end_date, status, confidence, source_ids_json, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        relationship.id,
        projectId,
        relationship.sourceEntityId,
        relationship.targetEntityId,
        relationship.relationshipType,
        relationship.direction,
        relationship.startDate,
        relationship.endDate,
        relationship.status,
        relationship.confidence,
        asJson(relationship.sourceIds, []),
        relationship.notes,
        timestamp,
        timestamp
      );
    audit(database, { projectId, action: 'created relationship', targetType: 'relationship', targetId: relationship.id });
    return this.listRelationships(projectId).find((item) => item.id === relationship.id);
  },

  updateRelationship(relationshipId, payload) {
    const database = getDb();
    const existing = rowToCamel(database.prepare('SELECT * FROM relationships WHERE id = ?').get(relationshipId));
    if (!existing) return null;
    const merged = { ...existing, ...payload, updatedAt: now() };
    database
      .prepare(
        `UPDATE relationships SET source_entity_id = ?, target_entity_id = ?, relationship_type = ?, direction = ?,
          start_date = ?, end_date = ?, status = ?, confidence = ?, source_ids_json = ?, notes = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        merged.sourceEntityId,
        merged.targetEntityId,
        validateRelationshipType(merged.relationshipType),
        merged.direction ?? 'directed',
        merged.startDate ?? '',
        merged.endDate ?? '',
        merged.status ?? 'unknown',
        validateConfidence(merged.confidence),
        asJson(merged.sourceIds, []),
        merged.notes ?? '',
        merged.updatedAt,
        relationshipId
      );
    audit(database, {
      projectId: existing.projectId,
      action: 'edited relationship',
      targetType: 'relationship',
      targetId: relationshipId
    });
    return this.listRelationships(existing.projectId).find((item) => item.id === relationshipId);
  },

  deleteRelationship(relationshipId) {
    const database = getDb();
    const existing = rowToCamel(database.prepare('SELECT * FROM relationships WHERE id = ?').get(relationshipId));
    if (!existing) return false;
    const result = database.prepare('DELETE FROM relationships WHERE id = ?').run(relationshipId);
    audit(database, { projectId: existing.projectId, action: 'deleted relationship', targetType: 'relationship', targetId: relationshipId });
    return result.changes > 0;
  },

  listEvents(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM events WHERE project_id = ? ORDER BY COALESCE(date_start, created_at) DESC').all(projectId));
  },

  createEvent(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const timestamp = now();
    const event = {
      id: payload.id ?? id(),
      title: payload.title?.trim() || 'Untitled Event',
      eventType: payload.eventType ?? 'Other',
      dateStart: payload.dateStart ?? '',
      dateEnd: payload.dateEnd ?? '',
      timeKnown: payload.timeKnown ? 1 : 0,
      locationId: payload.locationId ?? '',
      latitude: numberOrNull(payload.latitude),
      longitude: numberOrNull(payload.longitude),
      involvedPersonIds: payload.involvedPersonIds ?? [],
      involvedOrganizationIds: payload.involvedOrganizationIds ?? [],
      sourceIds: payload.sourceIds ?? [],
      description: payload.description ?? '',
      analystNotes: payload.analystNotes ?? payload.notes ?? '',
      confidence: validateConfidence(payload.confidence ?? 'unknown'),
      tags: payload.tags ?? [],
      attachments: payload.attachments ?? [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    database
      .prepare(
        `INSERT INTO events (
          id, project_id, title, event_type, date_start, date_end, time_known, location_id, latitude, longitude,
          involved_person_ids_json, involved_organization_ids_json, source_ids_json, description, analyst_notes,
          confidence, tags_json, attachments_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        event.id,
        projectId,
        event.title,
        event.eventType,
        event.dateStart,
        event.dateEnd,
        event.timeKnown,
        event.locationId,
        event.latitude,
        event.longitude,
        asJson(event.involvedPersonIds, []),
        asJson(event.involvedOrganizationIds, []),
        asJson(event.sourceIds, []),
        event.description,
        event.analystNotes,
        event.confidence,
        asJson(event.tags, []),
        asJson(event.attachments, []),
        timestamp,
        timestamp
      );
    audit(database, { projectId, action: 'created event', targetType: 'event', targetId: event.id });
    return this.listEvents(projectId).find((item) => item.id === event.id);
  },

  updateEvent(eventId, payload) {
    const database = getDb();
    const existing = rowToCamel(database.prepare('SELECT * FROM events WHERE id = ?').get(eventId));
    if (!existing) return null;
    const merged = { ...existing, ...payload, updatedAt: now() };
    database
      .prepare(
        `UPDATE events SET title = ?, event_type = ?, date_start = ?, date_end = ?, time_known = ?,
          location_id = ?, latitude = ?, longitude = ?, involved_person_ids_json = ?, involved_organization_ids_json = ?,
          source_ids_json = ?, description = ?, analyst_notes = ?, confidence = ?, tags_json = ?,
          attachments_json = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        merged.title,
        merged.eventType,
        merged.dateStart ?? '',
        merged.dateEnd ?? '',
        merged.timeKnown ? 1 : 0,
        merged.locationId ?? '',
        numberOrNull(merged.latitude),
        numberOrNull(merged.longitude),
        asJson(merged.involvedPersonIds, []),
        asJson(merged.involvedOrganizationIds, []),
        asJson(merged.sourceIds, []),
        merged.description ?? '',
        merged.analystNotes ?? '',
        validateConfidence(merged.confidence),
        asJson(merged.tags, []),
        asJson(merged.attachments, []),
        merged.updatedAt,
        eventId
      );
    audit(database, { projectId: existing.projectId, action: 'edited event', targetType: 'event', targetId: eventId });
    return this.listEvents(existing.projectId).find((item) => item.id === eventId);
  },

  deleteEvent(eventId) {
    const database = getDb();
    const existing = rowToCamel(database.prepare('SELECT * FROM events WHERE id = ?').get(eventId));
    if (!existing) return false;
    const result = database.prepare('DELETE FROM events WHERE id = ?').run(eventId);
    audit(database, { projectId: existing.projectId, action: 'deleted event', targetType: 'event', targetId: eventId });
    return result.changes > 0;
  },

  listSources(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM sources WHERE project_id = ? ORDER BY updated_at DESC').all(projectId));
  },

  createSource(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const timestamp = now();
    const source = {
      id: payload.id ?? id(),
      title: payload.title?.trim() || 'Untitled Source',
      url: payload.url ?? '',
      publisher: payload.publisher ?? '',
      author: payload.author ?? '',
      publicationDate: payload.publicationDate ?? '',
      accessDate: payload.accessDate ?? timestamp.slice(0, 10),
      sourceType: payload.sourceType ?? 'Other',
      reliability: payload.reliability ?? 'D: Unknown',
      credibility: payload.credibility ?? '3: Possibly true',
      archivedFileId: payload.archivedFileId ?? '',
      citationText: payload.citationText ?? '',
      notes: payload.notes ?? '',
      linkedEntities: payload.linkedEntities ?? [],
      linkedRelationships: payload.linkedRelationships ?? [],
      linkedEvents: payload.linkedEvents ?? [],
      attachments: payload.attachments ?? []
    };
    database
      .prepare(
        `INSERT INTO sources (
          id, project_id, title, url, publisher, author, publication_date, access_date, source_type,
          reliability, credibility, archived_file_id, citation_text, notes, linked_entities_json,
          linked_relationships_json, linked_events_json, attachments_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        source.id,
        projectId,
        source.title,
        source.url,
        source.publisher,
        source.author,
        source.publicationDate,
        source.accessDate,
        source.sourceType,
        source.reliability,
        source.credibility,
        source.archivedFileId,
        source.citationText,
        source.notes,
        asJson(source.linkedEntities, []),
        asJson(source.linkedRelationships, []),
        asJson(source.linkedEvents, []),
        asJson(source.attachments, []),
        timestamp,
        timestamp
      );
    audit(database, { projectId, action: 'created source', targetType: 'source', targetId: source.id });
    return this.listSources(projectId).find((item) => item.id === source.id);
  },

  updateSource(sourceId, payload) {
    const database = getDb();
    const existing = rowToCamel(database.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId));
    if (!existing) return null;
    const merged = { ...existing, ...payload, updatedAt: now() };
    database
      .prepare(
        `UPDATE sources SET title = ?, url = ?, publisher = ?, author = ?, publication_date = ?, access_date = ?,
          source_type = ?, reliability = ?, credibility = ?, archived_file_id = ?, citation_text = ?, notes = ?,
          linked_entities_json = ?, linked_relationships_json = ?, linked_events_json = ?, attachments_json = ?,
          updated_at = ? WHERE id = ?`
      )
      .run(
        merged.title,
        merged.url ?? '',
        merged.publisher ?? '',
        merged.author ?? '',
        merged.publicationDate ?? '',
        merged.accessDate ?? '',
        merged.sourceType ?? 'Other',
        merged.reliability ?? 'D: Unknown',
        merged.credibility ?? '3: Possibly true',
        merged.archivedFileId ?? '',
        merged.citationText ?? '',
        merged.notes ?? '',
        asJson(merged.linkedEntities, []),
        asJson(merged.linkedRelationships, []),
        asJson(merged.linkedEvents, []),
        asJson(merged.attachments, []),
        merged.updatedAt,
        sourceId
      );
    audit(database, { projectId: existing.projectId, action: 'edited source', targetType: 'source', targetId: sourceId });
    return this.listSources(existing.projectId).find((item) => item.id === sourceId);
  },

  deleteSource(sourceId) {
    const database = getDb();
    const existing = rowToCamel(database.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId));
    if (!existing) return false;
    const result = database.prepare('DELETE FROM sources WHERE id = ?').run(sourceId);
    audit(database, { projectId: existing.projectId, action: 'deleted source', targetType: 'source', targetId: sourceId });
    return result.changes > 0;
  },

  listNotes(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY updated_at DESC').all(projectId));
  },

  createNote(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const timestamp = now();
    const note = {
      id: payload.id ?? id(),
      parentType: payload.parentType ?? 'project',
      parentId: payload.parentId ?? projectId,
      noteType: payload.noteType ?? 'project',
      title: payload.title ?? '',
      body: payload.body ?? '',
      color: payload.color ?? 'note',
      tags: payload.tags ?? [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    database
      .prepare(
        `INSERT INTO notes (id, project_id, parent_type, parent_id, note_type, title, body, color, tags_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(note.id, projectId, note.parentType, note.parentId, note.noteType, note.title, note.body, note.color, asJson(note.tags, []), timestamp, timestamp);
    audit(database, { projectId, action: 'created note', targetType: 'note', targetId: note.id });
    return this.listNotes(projectId).find((item) => item.id === note.id);
  },

  updateNote(noteId, payload) {
    const database = getDb();
    const existing = rowToCamel(database.prepare('SELECT * FROM notes WHERE id = ?').get(noteId));
    if (!existing) return null;
    const merged = { ...existing, ...payload, updatedAt: now() };
    database
      .prepare(
        `UPDATE notes SET parent_type = ?, parent_id = ?, note_type = ?, title = ?, body = ?, color = ?, tags_json = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        merged.parentType,
        merged.parentId,
        merged.noteType,
        merged.title ?? '',
        merged.body ?? '',
        merged.color ?? 'note',
        asJson(merged.tags, []),
        merged.updatedAt,
        noteId
      );
    audit(database, { projectId: existing.projectId, action: 'edited note', targetType: 'note', targetId: noteId });
    return this.listNotes(existing.projectId).find((item) => item.id === noteId);
  },

  deleteNote(noteId) {
    const database = getDb();
    const existing = rowToCamel(database.prepare('SELECT * FROM notes WHERE id = ?').get(noteId));
    if (!existing) return false;
    const result = database.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
    audit(database, { projectId: existing.projectId, action: 'deleted note', targetType: 'note', targetId: noteId });
    return result.changes > 0;
  },

  listFiles(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY created_at DESC').all(projectId));
  },

  createFile(projectId, file, payload = {}) {
    const database = getDb();
    requireProject(database, projectId);
    const buffer = fs.readFileSync(file.path);
    const hash = createHash('sha256').update(buffer).digest('hex');
    const timestamp = now();
    const record = {
      id: id(),
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      filePath: path.relative(rootDir, file.path),
      fileType: payload.fileType ?? (file.mimetype.startsWith('image/') ? 'image' : 'document'),
      hash,
      perceptualHash: hash.slice(0, 16),
      sourceId: payload.sourceId ?? '',
      notes: payload.notes ?? ''
    };
    database
      .prepare(
        `INSERT INTO files (id, project_id, file_name, original_name, mime_type, file_path, file_type, hash,
          perceptual_hash, source_id, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        record.id,
        projectId,
        record.fileName,
        record.originalName,
        record.mimeType,
        record.filePath,
        record.fileType,
        record.hash,
        record.perceptualHash,
        record.sourceId,
        record.notes,
        timestamp
      );
    audit(database, { projectId, action: 'added file', targetType: 'file', targetId: record.id });
    return rowToCamel(database.prepare('SELECT * FROM files WHERE id = ?').get(record.id));
  },

  getFile(fileId) {
    const database = getDb();
    return rowToCamel(database.prepare('SELECT * FROM files WHERE id = ?').get(fileId));
  },

  deleteFile(fileId) {
    const database = getDb();
    const existing = this.getFile(fileId);
    if (!existing) return false;
    const absolute = path.join(rootDir, existing.filePath);
    if (absolute.startsWith(paths.mediaRoot) && fs.existsSync(absolute)) fs.rmSync(absolute);
    const result = database.prepare('DELETE FROM files WHERE id = ?').run(fileId);
    audit(database, { projectId: existing.projectId, action: 'deleted file', targetType: 'file', targetId: fileId });
    return result.changes > 0;
  },

  listClaims(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM claims WHERE project_id = ? ORDER BY updated_at DESC').all(projectId));
  },

  createClaim(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const timestamp = now();
    const claimId = payload.id ?? id();
    database
      .prepare(
        `INSERT INTO claims (id, project_id, claim_text, claim_type, linked_entity_id, linked_relationship_id,
          linked_event_id, source_ids_json, confidence, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        claimId,
        projectId,
        payload.claimText ?? '',
        payload.claimType ?? 'general',
        payload.linkedEntityId ?? '',
        payload.linkedRelationshipId ?? '',
        payload.linkedEventId ?? '',
        asJson(payload.sourceIds, []),
        validateConfidence(payload.confidence ?? 'unknown'),
        payload.status ?? 'unverified',
        payload.notes ?? '',
        timestamp,
        timestamp
      );
    audit(database, { projectId, action: 'created claim', targetType: 'claim', targetId: claimId });
    return this.listClaims(projectId).find((item) => item.id === claimId);
  },

  listOpenQuestions(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM open_questions WHERE project_id = ? ORDER BY updated_at DESC').all(projectId));
  },

  createOpenQuestion(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const timestamp = now();
    const questionId = payload.id ?? id();
    database
      .prepare(
        `INSERT INTO open_questions (id, project_id, question, linked_entity_id, linked_relationship_id,
          linked_event_id, priority, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        questionId,
        projectId,
        payload.question ?? '',
        payload.linkedEntityId ?? '',
        payload.linkedRelationshipId ?? '',
        payload.linkedEventId ?? '',
        payload.priority ?? 'medium',
        payload.status ?? 'open',
        payload.notes ?? '',
        timestamp,
        timestamp
      );
    audit(database, { projectId, action: 'created open question', targetType: 'open_question', targetId: questionId });
    return this.listOpenQuestions(projectId).find((item) => item.id === questionId);
  },

  listStickyNotes(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM sticky_notes WHERE project_id = ? ORDER BY updated_at DESC').all(projectId));
  },

  createStickyNote(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const timestamp = now();
    const noteId = payload.id ?? id();
    database
      .prepare(
        `INSERT INTO sticky_notes (id, project_id, title, body, color, attached_to_node_id, attached_to_relationship_id,
          x, y, width, height, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        noteId,
        projectId,
        payload.title ?? '',
        payload.body ?? '',
        payload.color ?? 'note',
        payload.attachedToNodeId ?? '',
        payload.attachedToRelationshipId ?? '',
        Number(payload.x ?? 0),
        Number(payload.y ?? 0),
        Number(payload.width ?? 220),
        Number(payload.height ?? 160),
        timestamp,
        timestamp
      );
    audit(database, { projectId, action: 'created sticky note', targetType: 'sticky_note', targetId: noteId });
    return this.listStickyNotes(projectId).find((item) => item.id === noteId);
  },

  saveDiagramLayout(projectId, payload) {
    const database = getDb();
    requireProject(database, projectId);
    const timestamp = now();
    const layoutId = payload.id ?? id();
    database
      .prepare(
        `INSERT OR REPLACE INTO diagram_layouts (id, project_id, diagram_type, name, nodes_json, edges_json, viewport_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM diagram_layouts WHERE id = ?), ?), ?)`
      )
      .run(
        layoutId,
        projectId,
        payload.diagramType ?? 'freeform',
        payload.name ?? 'Working board',
        asJson(payload.nodes, []),
        asJson(payload.edges, []),
        asJson(payload.viewport, {}),
        layoutId,
        timestamp,
        timestamp
      );
    audit(database, { projectId, action: 'saved diagram layout', targetType: 'diagram_layout', targetId: layoutId });
    return rowToCamel(database.prepare('SELECT * FROM diagram_layouts WHERE id = ?').get(layoutId));
  },

  listDiagramLayouts(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM diagram_layouts WHERE project_id = ? ORDER BY updated_at DESC').all(projectId));
  },

  search(projectId, query) {
    const database = getDb();
    requireProject(database, projectId);
    const q = `%${query.toLowerCase()}%`;
    const entities = rowsToCamel(
      database
        .prepare(
          `SELECT 'entity' AS result_type, id, type, name AS title, summary AS snippet, updated_at
           FROM entities
           WHERE project_id = ? AND (
             lower(name) LIKE ? OR lower(summary) LIKE ? OR lower(notes) LIKE ? OR lower(aliases_json) LIKE ? OR lower(tags_json) LIKE ?
           )
           LIMIT 25`
        )
        .all(projectId, q, q, q, q, q)
    );
    const sources = rowsToCamel(
      database
        .prepare(
          `SELECT 'source' AS result_type, id, source_type AS type, title, url AS snippet, updated_at
           FROM sources
           WHERE project_id = ? AND (lower(title) LIKE ? OR lower(url) LIKE ? OR lower(notes) LIKE ?)
           LIMIT 25`
        )
        .all(projectId, q, q, q)
    );
    const events = rowsToCamel(
      database
        .prepare(
          `SELECT 'event' AS result_type, id, event_type AS type, title, description AS snippet, updated_at
           FROM events
           WHERE project_id = ? AND (lower(title) LIKE ? OR lower(description) LIKE ? OR lower(analyst_notes) LIKE ?)
           LIMIT 25`
        )
        .all(projectId, q, q, q)
    );
    const notes = rowsToCamel(
      database
        .prepare(
          `SELECT 'note' AS result_type, id, note_type AS type, title, body AS snippet, updated_at
           FROM notes
           WHERE project_id = ? AND (lower(title) LIKE ? OR lower(body) LIKE ?)
           LIMIT 25`
        )
        .all(projectId, q, q)
    );
    return { query, groups: { entities, sources, events, notes } };
  },

  getAudit(projectId) {
    const database = getDb();
    requireProject(database, projectId);
    return rowsToCamel(database.prepare('SELECT * FROM audit_log WHERE project_id = ? ORDER BY created_at DESC LIMIT 100').all(projectId));
  },

  exportProject(projectId) {
    const database = getDb();
    const project = this.getProject(projectId);
    if (!project) return null;
    return {
      metadata: {
        app: 'TAOSINT',
        version: '0.1.0',
        exportedAt: now(),
        safety: {
          localFirst: true,
          noEmbeddedAi: true,
          noLiveTracking: true,
          sourceConfidenceRequiredByUi: true
        }
      },
      project,
      entities: this.listEntities(projectId),
      relationships: this.listRelationships(projectId),
      events: this.listEvents(projectId),
      sources: this.listSources(projectId),
      notes: this.listNotes(projectId),
      claims: this.listClaims(projectId),
      openQuestions: this.listOpenQuestions(projectId),
      files: this.listFiles(projectId),
      stickyNotes: this.listStickyNotes(projectId),
      diagramLayouts: this.listDiagramLayouts(projectId),
      auditLog: this.getAudit(projectId)
    };
  },

  async exportZip(projectId) {
    const bundle = this.exportProject(projectId);
    if (!bundle) return null;
    const zip = new JSZip();
    zip.file('project.json', JSON.stringify(bundle.project, null, 2));
    zip.file('entities.json', JSON.stringify(bundle.entities, null, 2));
    zip.file('relationships.json', JSON.stringify(bundle.relationships, null, 2));
    zip.file('events.json', JSON.stringify(bundle.events, null, 2));
    zip.file('sources.json', JSON.stringify(bundle.sources, null, 2));
    zip.file('notes.json', JSON.stringify(bundle.notes, null, 2));
    zip.file('claims.json', JSON.stringify(bundle.claims, null, 2));
    zip.file('diagram_layouts.json', JSON.stringify(bundle.diagramLayouts, null, 2));
    zip.file('sticky_notes.json', JSON.stringify(bundle.stickyNotes, null, 2));
    zip.file('locations.geojson', JSON.stringify(this.exportGeoJson(projectId), null, 2));
    zip.file('export_metadata.json', JSON.stringify(bundle.metadata, null, 2));
    zip.file('README.txt', 'TAOSINT local-first project export. Re-import through the TAOSINT import workflow.');

    const mediaFolder = zip.folder('media');
    for (const file of bundle.files) {
      const filePath = path.join(rootDir, file.filePath);
      if (fs.existsSync(filePath)) {
        mediaFolder.file(file.fileName, fs.readFileSync(filePath));
      }
    }
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  },

  importProject(bundle) {
    const database = getDb();
    const timestamp = now();
    const projectInput = bundle.project ?? bundle;
    const projectId = projectInput.id ?? id();
    const exists = database.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    const project = exists
      ? this.updateProject(projectId, { ...projectInput, title: `${projectInput.title ?? 'Imported Project'} (imported ${timestamp.slice(0, 10)})` })
      : this.createProject({ ...projectInput, id: projectId });

    const insertSafe = (label, items, handler) => {
      if (!Array.isArray(items)) return;
      for (const item of items) {
        try {
          handler(item);
        } catch (error) {
          console.warn(`Skipped imported ${label}:`, error.message);
        }
      }
    };

    insertSafe('entity', bundle.entities, (entity) => this.createEntity(project.id, { ...entity, projectId: project.id }));
    insertSafe('source', bundle.sources, (source) => this.createSource(project.id, { ...source, projectId: project.id }));
    insertSafe('relationship', bundle.relationships, (relationship) => this.createRelationship(project.id, { ...relationship, projectId: project.id }));
    insertSafe('event', bundle.events, (event) => this.createEvent(project.id, { ...event, projectId: project.id }));
    insertSafe('note', bundle.notes, (note) => this.createNote(project.id, { ...note, projectId: project.id }));
    insertSafe('claim', bundle.claims, (claim) => this.createClaim(project.id, { ...claim, projectId: project.id }));
    insertSafe('sticky note', bundle.stickyNotes, (note) => this.createStickyNote(project.id, { ...note, projectId: project.id }));
    insertSafe('diagram layout', bundle.diagramLayouts, (layout) => this.saveDiagramLayout(project.id, { ...layout, projectId: project.id }));
    audit(database, { projectId: project.id, action: 'imported project', targetType: 'project', targetId: project.id });
    return this.getProject(project.id);
  },

  exportGeoJson(projectId) {
    const entities = this.listEntities(projectId);
    const events = this.listEvents(projectId);
    const locationFeatures = entities
      .filter((entity) => entity.type === 'location' && entity.details?.latitude !== null && entity.details?.longitude !== null)
      .map((entity) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(entity.details.longitude), Number(entity.details.latitude)]
        },
        properties: {
          id: entity.id,
          name: entity.name,
          entityType: entity.type,
          precisionLevel: entity.details.precisionLevel,
          confidence: entity.confidence,
          sourceIds: entity.sourceIds
        }
      }));
    const eventFeatures = events
      .filter((event) => event.latitude !== null && event.longitude !== null)
      .map((event) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [Number(event.longitude), Number(event.latitude)] },
        properties: {
          id: event.id,
          title: event.title,
          eventType: event.eventType,
          dateStart: event.dateStart,
          confidence: event.confidence,
          sourceIds: event.sourceIds
        }
      }));
    return { type: 'FeatureCollection', features: [...locationFeatures, ...eventFeatures] };
  },

  exportGraphMl(projectId) {
    const entities = this.listEntities(projectId);
    const relationships = this.listRelationships(projectId);
    const escape = (value = '') =>
      String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    const nodes = entities
      .map(
        (entity) => `
    <node id="${escape(entity.id)}">
      <data key="name">${escape(entity.name)}</data>
      <data key="type">${escape(entity.type)}</data>
      <data key="confidence">${escape(entity.confidence)}</data>
    </node>`
      )
      .join('');
    const edges = relationships
      .map(
        (relationship) => `
    <edge id="${escape(relationship.id)}" source="${escape(relationship.sourceEntityId)}" target="${escape(relationship.targetEntityId)}">
      <data key="relationshipType">${escape(relationship.relationshipType)}</data>
      <data key="confidence">${escape(relationship.confidence)}</data>
      <data key="status">${escape(relationship.status)}</data>
    </edge>`
      )
      .join('');
    return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="confidence" for="all" attr.name="confidence" attr.type="string"/>
  <key id="relationshipType" for="edge" attr.name="relationshipType" attr.type="string"/>
  <key id="status" for="edge" attr.name="status" attr.type="string"/>
  <graph id="${escape(projectId)}" edgedefault="directed">${nodes}${edges}
  </graph>
</graphml>`;
  },

  exportMarkdown(projectId) {
    const project = this.getProject(projectId);
    const entities = this.listEntities(projectId);
    const relationships = this.listRelationships(projectId);
    const events = this.listEvents(projectId);
    const sources = this.listSources(projectId);
    const entityLines = entities
      .map((entity) => {
        const entityRelationships = relationships.filter((rel) => rel.sourceEntityId === entity.id || rel.targetEntityId === entity.id);
        const entitySources = sources.filter((source) => entity.sourceIds?.includes(source.id));
        return `---\ntype: ${entity.type}\nname: ${entity.name}\nconfidence: ${entity.confidence}\naliases: ${(entity.aliases ?? []).join(', ')}\n---\n\n# ${entity.name}\n\n## Summary\n${entity.summary || '_No summary yet._'}\n\n## Connections\n${entityRelationships.map((rel) => `- ${rel.sourceName} ${rel.relationshipType} ${rel.targetName} (${rel.confidence})`).join('\n') || '- No relationships recorded.'}\n\n## Timeline\n${events
          .filter((event) => event.involvedPersonIds?.includes(entity.id) || event.involvedOrganizationIds?.includes(entity.id) || event.locationId === entity.id)
          .map((event) => `- ${event.dateStart || 'Undated'}: ${event.title}`)
          .join('\n') || '- No timeline items recorded.'}\n\n## Sources\n${entitySources.map((source) => `- ${source.title}${source.url ? ` (${source.url})` : ''}`).join('\n') || '- Unsourced.'}\n\n## Notes\n${entity.notes || '_No notes yet._'}\n`;
      })
      .join('\n\n');
    return `# ${project.title}\n\n${project.description ?? ''}\n\n## Project Notes\n${project.notes ?? ''}\n\n${entityLines}`;
  },

  exportEntityMarkdown(entityId) {
    const entity = this.getEntity(entityId);
    if (!entity) return null;
    return `---\ntype: ${entity.type}\nname: ${entity.name}\nconfidence: ${entity.confidence}\naliases: ${(entity.aliases ?? []).join(', ')}\n---\n\n# ${entity.name}\n\n## Summary\n${entity.summary || entity.details?.profileSummary || '_No summary yet._'}\n\n## Details\n\n- Type: ${entity.type}\n- Confidence: ${entity.confidence}\n- Source count: ${(entity.sourceIds ?? []).length}\n\n## Connections\n${entity.relationships?.map((rel) => `- ${rel.sourceName} ${rel.relationshipType} ${rel.targetName} (${rel.confidence})`).join('\n') || '- No relationships recorded.'}\n\n## Timeline\n${entity.events?.map((event) => `- ${event.dateStart || 'Undated'}: ${event.title}`).join('\n') || '- No timeline items recorded.'}\n\n## Sources\n${entity.sources?.map((source) => `- ${source.title}${source.url ? ` (${source.url})` : ''}`).join('\n') || '- Unsourced.'}\n\n## Notes\n${entity.notes || entity.details?.analystNotes || '_No notes yet._'}\n`;
  },

  pathBetween(projectId, sourceEntityId, targetEntityId, maxDepth = 5) {
    const relationships = this.listRelationships(projectId);
    const adjacency = new Map();
    for (const rel of relationships) {
      if (!adjacency.has(rel.sourceEntityId)) adjacency.set(rel.sourceEntityId, []);
      adjacency.get(rel.sourceEntityId).push(rel);
      if (rel.direction !== 'directed') {
        if (!adjacency.has(rel.targetEntityId)) adjacency.set(rel.targetEntityId, []);
        adjacency.get(rel.targetEntityId).push({ ...rel, sourceEntityId: rel.targetEntityId, targetEntityId: rel.sourceEntityId });
      }
    }
    const queue = [{ id: sourceEntityId, path: [] }];
    const visited = new Set([sourceEntityId]);
    while (queue.length) {
      const current = queue.shift();
      if (current.id === targetEntityId) return current.path;
      if (current.path.length >= maxDepth) continue;
      for (const edge of adjacency.get(current.id) ?? []) {
        if (visited.has(edge.targetEntityId)) continue;
        visited.add(edge.targetEntityId);
        queue.push({ id: edge.targetEntityId, path: [...current.path, edge] });
      }
    }
    return [];
  }
};

export function tableCounts() {
  const database = getDb();
  const tables = ['projects', 'entities', 'relationships', 'events', 'sources', 'notes'];
  return Object.fromEntries(tables.map((table) => [table, database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count]));
}
