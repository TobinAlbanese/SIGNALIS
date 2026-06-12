import { create } from 'zustand';
import type {
  AuditLogRecord,
  Claim,
  Entity,
  EventRecord,
  FileRecord,
  MapDraft,
  NoteRecord,
  OpenQuestion,
  Project,
  Relationship,
  SearchResults,
  SelectedItem,
  SourceRecord,
  StickyNote
} from '../types';
import { api } from '../lib/api';

interface WorkspaceState {
  projects: Project[];
  activeProjectId: string;
  activeProject?: Project;
  entities: Entity[];
  relationships: Relationship[];
  events: EventRecord[];
  sources: SourceRecord[];
  notes: NoteRecord[];
  claims: Claim[];
  openQuestions: OpenQuestion[];
  stickyNotes: StickyNote[];
  files: FileRecord[];
  auditLog: AuditLogRecord[];
  selectedItem: SelectedItem;
  mapDraft?: MapDraft;
  loading: boolean;
  error: string;
  searchResults?: SearchResults;
  loadProjects: () => Promise<void>;
  setActiveProject: (projectId: string) => Promise<void>;
  refreshProjectData: () => Promise<void>;
  selectItem: (item: SelectedItem) => void;
  startMapDraft: (draft: MapDraft) => void;
  clearMapDraft: () => void;
  createProject: (payload: Partial<Project>) => Promise<Project>;
  updateProject: (projectId: string, payload: Partial<Project>) => Promise<void>;
  createEntity: (payload: Partial<Entity> & Record<string, any>) => Promise<Entity>;
  updateEntity: (entityId: string, payload: Partial<Entity> & Record<string, any>) => Promise<void>;
  createRelationship: (payload: Partial<Relationship>) => Promise<Relationship>;
  updateRelationship: (relationshipId: string, payload: Partial<Relationship>) => Promise<void>;
  createEvent: (payload: Partial<EventRecord>) => Promise<EventRecord>;
  updateEvent: (eventId: string, payload: Partial<EventRecord>) => Promise<void>;
  createSource: (payload: Partial<SourceRecord>) => Promise<SourceRecord>;
  updateSource: (sourceId: string, payload: Partial<SourceRecord>) => Promise<void>;
  createNote: (payload: Partial<NoteRecord>) => Promise<NoteRecord>;
  updateNote: (noteId: string, payload: Partial<NoteRecord>) => Promise<void>;
  createStickyNote: (payload: Partial<StickyNote>) => Promise<StickyNote>;
  uploadFile: (file: File, payload?: Record<string, string>) => Promise<FileRecord>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
}

async function loadAll(projectId: string) {
  const [activeProject, entities, relationships, events, sources, notes, claims, openQuestions, stickyNotes, files, auditLog] = await Promise.all([
    api<Project>(`/api/projects/${projectId}`),
    api<Entity[]>(`/api/projects/${projectId}/entities`),
    api<Relationship[]>(`/api/projects/${projectId}/relationships`),
    api<EventRecord[]>(`/api/projects/${projectId}/events`),
    api<SourceRecord[]>(`/api/projects/${projectId}/sources`),
    api<NoteRecord[]>(`/api/projects/${projectId}/notes`),
    api<Claim[]>(`/api/projects/${projectId}/claims`),
    api<OpenQuestion[]>(`/api/projects/${projectId}/open-questions`),
    api<StickyNote[]>(`/api/projects/${projectId}/sticky-notes`),
    api<FileRecord[]>(`/api/projects/${projectId}/files`),
    api<AuditLogRecord[]>(`/api/projects/${projectId}/audit-log`)
  ]);
  return { activeProject, entities, relationships, events, sources, notes, claims, openQuestions, stickyNotes, files, auditLog };
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  projects: [],
  activeProjectId: '',
  activeProject: undefined,
  entities: [],
  relationships: [],
  events: [],
  sources: [],
  notes: [],
  claims: [],
  openQuestions: [],
  stickyNotes: [],
  files: [],
  auditLog: [],
  selectedItem: null,
  mapDraft: undefined,
  loading: false,
  error: '',

  async loadProjects() {
    set({ loading: true, error: '' });
    try {
      const projects = await api<Project[]>('/api/projects');
      const activeProjectId = get().activeProjectId || projects[0]?.id || '';
      set({ projects, activeProjectId });
      if (activeProjectId) {
        const data = await loadAll(activeProjectId);
        set(data);
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load projects' });
    } finally {
      set({ loading: false });
    }
  },

  async setActiveProject(projectId) {
    set({ activeProjectId: projectId, selectedItem: null, loading: true });
    try {
      const data = await loadAll(projectId);
      set(data);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to switch project' });
    } finally {
      set({ loading: false });
    }
  },

  async refreshProjectData() {
    const projectId = get().activeProjectId;
    if (!projectId) return;
    const data = await loadAll(projectId);
    const projects = await api<Project[]>('/api/projects');
    set({ ...data, projects });
  },

  selectItem(item) {
    set({ selectedItem: item });
  },

  startMapDraft(draft) {
    set({ mapDraft: draft, selectedItem: { kind: 'mapDraft', id: 'active' } });
  },

  clearMapDraft() {
    set({ mapDraft: undefined, selectedItem: null });
  },

  async createProject(payload) {
    const currentProjectId = get().activeProjectId;
    if (currentProjectId) {
      try {
        await api(`/api/projects/${currentProjectId}/archive`, { method: 'POST' });
      } catch (error) {
        console.warn('Project archive skipped before creating a new project:', error);
      }
    }
    const project = await api<Project>('/api/projects', { method: 'POST', body: JSON.stringify(payload) });
    await get().loadProjects();
    await get().setActiveProject(project.id);
    return project;
  },

  async updateProject(projectId, payload) {
    await api<Project>(`/api/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(payload) });
    await get().refreshProjectData();
  },

  async createEntity(payload) {
    const projectId = get().activeProjectId;
    const entity = await api<Entity>(`/api/projects/${projectId}/entities`, { method: 'POST', body: JSON.stringify(payload) });
    await get().refreshProjectData();
    set({ selectedItem: { kind: 'entity', id: entity.id } });
    return entity;
  },

  async updateEntity(entityId, payload) {
    await api<Entity>(`/api/entities/${entityId}`, { method: 'PUT', body: JSON.stringify(payload) });
    await get().refreshProjectData();
  },

  async createRelationship(payload) {
    const projectId = get().activeProjectId;
    const relationship = await api<Relationship>(`/api/projects/${projectId}/relationships`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    await get().refreshProjectData();
    set({ selectedItem: { kind: 'relationship', id: relationship.id } });
    return relationship;
  },

  async updateRelationship(relationshipId, payload) {
    await api<Relationship>(`/api/relationships/${relationshipId}`, { method: 'PUT', body: JSON.stringify(payload) });
    await get().refreshProjectData();
  },

  async createEvent(payload) {
    const projectId = get().activeProjectId;
    const event = await api<EventRecord>(`/api/projects/${projectId}/events`, { method: 'POST', body: JSON.stringify(payload) });
    await get().refreshProjectData();
    set({ selectedItem: { kind: 'event', id: event.id } });
    return event;
  },

  async updateEvent(eventId, payload) {
    await api<EventRecord>(`/api/events/${eventId}`, { method: 'PUT', body: JSON.stringify(payload) });
    await get().refreshProjectData();
  },

  async createSource(payload) {
    const projectId = get().activeProjectId;
    const source = await api<SourceRecord>(`/api/projects/${projectId}/sources`, { method: 'POST', body: JSON.stringify(payload) });
    await get().refreshProjectData();
    set({ selectedItem: { kind: 'source', id: source.id } });
    return source;
  },

  async updateSource(sourceId, payload) {
    await api<SourceRecord>(`/api/sources/${sourceId}`, { method: 'PUT', body: JSON.stringify(payload) });
    await get().refreshProjectData();
  },

  async createNote(payload) {
    const projectId = get().activeProjectId;
    const note = await api<NoteRecord>(`/api/projects/${projectId}/notes`, { method: 'POST', body: JSON.stringify(payload) });
    await get().refreshProjectData();
    set({ selectedItem: { kind: 'note', id: note.id } });
    return note;
  },

  async updateNote(noteId, payload) {
    await api<NoteRecord>(`/api/notes/${noteId}`, { method: 'PUT', body: JSON.stringify(payload) });
    await get().refreshProjectData();
  },

  async createStickyNote(payload) {
    const projectId = get().activeProjectId;
    const note = await api<StickyNote>(`/api/projects/${projectId}/sticky-notes`, { method: 'POST', body: JSON.stringify(payload) });
    await get().refreshProjectData();
    set({ selectedItem: { kind: 'sticky', id: note.id } });
    return note;
  },

  async uploadFile(file, payload = {}) {
    const projectId = get().activeProjectId;
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
    const record = await api<FileRecord>(`/api/projects/${projectId}/files`, { method: 'POST', body: formData });
    await get().refreshProjectData();
    return record;
  },

  async search(query) {
    const projectId = get().activeProjectId;
    if (!projectId || !query.trim()) {
      set({ searchResults: undefined });
      return;
    }
    const results = await api<SearchResults>(`/api/projects/${projectId}/search?q=${encodeURIComponent(query)}`);
    set({ searchResults: results });
  },

  clearSearch() {
    set({ searchResults: undefined });
  }
}));
