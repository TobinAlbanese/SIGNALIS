export type Confidence = '' | 'high' | 'medium' | 'low' | 'unknown' | 'contradicted';

export type EntityType =
  | 'person'
  | 'organization'
  | 'sub-organization'
  | 'role'
  | 'location'
  | 'event'
  | 'source'
  | 'document'
  | 'image'
  | 'alias'
  | 'family-group'
  | 'account'
  | 'vehicle'
  | 'financial-entity'
  | 'custom';

export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  tags: string[];
  defaultMapCenter: { lat: number; lng: number; label?: string };
  defaultMapZoom: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  stats?: ProjectStats;
}

export interface ProjectStats {
  entities: number;
  relationships: number;
  events: number;
  sources: number;
  locations: number;
  unsourcedClaims: number;
  lowConfidenceRelationships: number;
  contradictions: number;
  openQuestions: number;
}

export interface Entity {
  id: string;
  projectId: string;
  type: EntityType;
  name: string;
  aliases: string[];
  imageFileId?: string;
  summary: string;
  notes: string;
  tags: string[];
  confidence: Confidence;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
  details?: Record<string, any>;
  relationships?: Relationship[];
  events?: EventRecord[];
  sources?: SourceRecord[];
}

export interface Relationship {
  id: string;
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  direction: 'directed' | 'bidirectional' | 'undirected';
  startDate: string;
  endDate: string;
  status: 'active' | 'former' | 'alleged' | 'disputed' | 'unknown';
  confidence: Confidence;
  sourceIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  sourceName?: string;
  sourceType?: EntityType;
  targetName?: string;
  targetType?: EntityType;
}

export interface EventRecord {
  id: string;
  projectId: string;
  title: string;
  eventType: string;
  dateStart: string;
  dateEnd: string;
  timeKnown: number | boolean;
  locationId: string;
  latitude: number | null;
  longitude: number | null;
  involvedPersonIds: string[];
  involvedOrganizationIds: string[];
  sourceIds: string[];
  description: string;
  analystNotes: string;
  confidence: Confidence;
  tags: string[];
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SourceRecord {
  id: string;
  projectId: string;
  title: string;
  url: string;
  publisher: string;
  author: string;
  publicationDate: string;
  accessDate: string;
  sourceType: string;
  reliability: string;
  credibility: string;
  archivedFileId: string;
  citationText: string;
  notes: string;
  linkedEntities: string[];
  linkedRelationships: string[];
  linkedEvents: string[];
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: string;
  projectId: string;
  parentType: string;
  parentId: string;
  noteType: string;
  title: string;
  body: string;
  color: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Claim {
  id: string;
  projectId: string;
  claimText: string;
  claimType: string;
  linkedEntityId: string;
  linkedRelationshipId: string;
  linkedEventId: string;
  sourceIds: string[];
  confidence: Confidence;
  status: 'supported' | 'disputed' | 'contradicted' | 'unverified' | 'hypothesis';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OpenQuestion {
  id: string;
  projectId: string;
  question: string;
  linkedEntityId: string;
  linkedRelationshipId: string;
  linkedEventId: string;
  priority: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StickyNote {
  id: string;
  projectId: string;
  title: string;
  body: string;
  color: string;
  attachedToNodeId: string;
  attachedToRelationshipId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

export interface FileRecord {
  id: string;
  projectId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  filePath: string;
  fileType: string;
  hash: string;
  perceptualHash: string;
  sourceId: string;
  notes: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  projectId: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface MapDraft {
  lat: number;
  lng: number;
}

export type SelectedItem =
  | { kind: 'project'; id: string }
  | { kind: 'entity'; id: string }
  | { kind: 'relationship'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'source'; id: string }
  | { kind: 'note'; id: string }
  | { kind: 'file'; id: string }
  | { kind: 'sticky'; id: string }
  | { kind: 'mapDraft'; id: 'active' }
  | null;

export interface SearchResults {
  query: string;
  groups: {
    entities: Array<{ id: string; resultType: string; type: string; title: string; snippet: string; updatedAt: string }>;
    sources: Array<{ id: string; resultType: string; type: string; title: string; snippet: string; updatedAt: string }>;
    events: Array<{ id: string; resultType: string; type: string; title: string; snippet: string; updatedAt: string }>;
    notes: Array<{ id: string; resultType: string; type: string; title: string; snippet: string; updatedAt: string }>;
  };
}
