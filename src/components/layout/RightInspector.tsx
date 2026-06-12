import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileDown, Plus, Save, ShieldAlert, X } from 'lucide-react';
import { confidenceValues, entityTypes, precisionLevels, relationshipTypes, sourceCredibility, sourceReliability, sourceTypes } from '../../constants';
import { downloadUrl, formatRelationshipType, splitList } from '../../lib/api';
import { useWorkspace } from '../../store/useWorkspace';
import type { Confidence, Entity, EventRecord, MapDraft, NoteRecord, Relationship, SourceRecord, StickyNote } from '../../types';
import { ConfidenceBadge, SourceBadge, TypeBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Field, Select, TextArea, TextInput } from '../ui/Form';
import { MarkdownPreview } from '../ui/MarkdownPreview';

type Draft = Record<string, any>;

export function RightInspector() {
  const {
    selectedItem,
    activeProject,
    entities,
    relationships,
    events,
    sources,
    notes,
    files,
    stickyNotes,
    mapDraft,
    createEntity,
    createEvent,
    createNote,
    updateEntity,
    updateRelationship,
    updateEvent,
    updateSource,
    updateNote,
    uploadFile,
    clearMapDraft
  } = useWorkspace();

  const selected = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.kind === 'project') return activeProject ? { kind: 'project', item: activeProject } : null;
    if (selectedItem.kind === 'entity') return { kind: 'entity', item: entities.find((item) => item.id === selectedItem.id) };
    if (selectedItem.kind === 'relationship') return { kind: 'relationship', item: relationships.find((item) => item.id === selectedItem.id) };
    if (selectedItem.kind === 'event') return { kind: 'event', item: events.find((item) => item.id === selectedItem.id) };
    if (selectedItem.kind === 'source') return { kind: 'source', item: sources.find((item) => item.id === selectedItem.id) };
    if (selectedItem.kind === 'note') return { kind: 'note', item: notes.find((item) => item.id === selectedItem.id) };
    if (selectedItem.kind === 'file') return { kind: 'file', item: files.find((item) => item.id === selectedItem.id) };
    if (selectedItem.kind === 'sticky') return { kind: 'sticky', item: stickyNotes.find((item) => item.id === selectedItem.id) };
    if (selectedItem.kind === 'mapDraft') return mapDraft ? { kind: 'mapDraft', item: mapDraft } : null;
    return null;
  }, [activeProject, entities, events, files, mapDraft, notes, relationships, selectedItem, sources, stickyNotes]);

  if (!selected?.item) {
    return (
      <aside className="right-inspector panel min-h-0 overflow-auto border-l p-4 subtle-scroll" aria-label="Inspector">
        <div className="rounded-md border border-white/10 bg-black/20 p-4">
          <div className="text-sm font-semibold">Inspector</div>
          <p className="mt-2 text-sm text-[color:var(--c-text-secondary)]">Select a node, edge, marker, event, source, note, or file.</p>
        </div>
        <div className="mt-3 rounded-md border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-100">
          <ShieldAlert className="mb-2" size={16} />
          Exact personal addresses are not shown by default. Location records should keep precision labels attached.
        </div>
      </aside>
    );
  }

  return (
    <aside className="right-inspector panel min-h-0 overflow-auto border-l p-4 subtle-scroll" aria-label="Inspector">
      {selected.kind === 'entity' ? <EntityInspector entity={selected.item as Entity} updateEntity={updateEntity} uploadFile={uploadFile} sources={sources} entities={entities} /> : null}
      {selected.kind === 'relationship' ? (
        <RelationshipInspector relationship={selected.item as Relationship} updateRelationship={updateRelationship} entities={entities} sources={sources} />
      ) : null}
      {selected.kind === 'event' ? <EventInspector event={selected.item as EventRecord} updateEvent={updateEvent} entities={entities} sources={sources} /> : null}
      {selected.kind === 'source' ? <SourceInspector source={selected.item as SourceRecord} updateSource={updateSource} /> : null}
      {selected.kind === 'note' ? <NoteInspector note={selected.item as NoteRecord} updateNote={updateNote} /> : null}
      {selected.kind === 'file' ? <FileInspector file={selected.item as any} /> : null}
      {selected.kind === 'sticky' ? <StickyInspector note={selected.item as StickyNote} /> : null}
      {selected.kind === 'mapDraft' ? (
        <MapDraftInspector
          draftPoint={selected.item as MapDraft}
          entities={entities}
          createEntity={createEntity}
          createEvent={createEvent}
          createNote={createNote}
          clearMapDraft={clearMapDraft}
        />
      ) : null}
      {selected.kind === 'project' ? (
        <div>
          <Header title={(selected.item as any).title} subtitle="project" />
          <p className="text-sm text-[color:var(--c-text-secondary)]">{(selected.item as any).description}</p>
        </div>
      ) : null}
    </aside>
  );
}

function Header({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 border-b border-white/10 pb-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--c-accent)]">{subtitle}</div>
      <div className="mt-1 flex items-start justify-between gap-2">
        <h2 className="text-lg font-semibold leading-tight">{title}</h2>
        {actions}
      </div>
    </div>
  );
}

type MapDraftKind = 'location' | 'person' | 'event' | 'note';

function MapDraftInspector({
  draftPoint,
  entities,
  createEntity,
  createEvent,
  createNote,
  clearMapDraft
}: {
  draftPoint: MapDraft;
  entities: Entity[];
  createEntity: (payload: Partial<Entity> & Record<string, any>) => Promise<Entity>;
  createEvent: (payload: Partial<EventRecord>) => Promise<EventRecord>;
  createNote: (payload: Partial<NoteRecord>) => Promise<NoteRecord>;
  clearMapDraft: () => void;
}) {
  const [kind, setKind] = useState<MapDraftKind>('location');
  const [draft, setDraft] = useState<Draft>({
    name: '',
    precisionLevel: 'Unknown',
    confidence: '',
    notes: '',
    city: '',
    region: '',
    country: '',
    dateStart: '',
    organizationId: ''
  });
  const organizations = entities.filter((entity) => entity.type === 'organization' || entity.type === 'sub-organization');

  async function save() {
    if (kind === 'event') {
      await createEvent({
        title: draft.name || `Event ${draftPoint.lat.toFixed(3)}, ${draftPoint.lng.toFixed(3)}`,
        eventType: 'Reported location',
        dateStart: draft.dateStart,
        latitude: draftPoint.lat,
        longitude: draftPoint.lng,
        involvedOrganizationIds: draft.organizationId ? [draft.organizationId] : [],
        description: draft.notes,
        analystNotes: draft.notes,
        confidence: draft.confidence as Confidence
      });
    } else if (kind === 'note') {
      await createNote({
        title: draft.name || `Map note ${draftPoint.lat.toFixed(3)}, ${draftPoint.lng.toFixed(3)}`,
        body: `${draft.notes}\n\nCoordinates: ${draftPoint.lat.toFixed(6)}, ${draftPoint.lng.toFixed(6)}`,
        parentType: 'project',
        noteType: 'map',
        color: 'note',
        tags: ['map-note', draft.country].filter(Boolean)
      });
    } else {
      await createEntity({
        type: kind === 'person' ? 'person' : 'location',
        name: draft.name || `${kind === 'person' ? 'Person' : 'Location'} ${draftPoint.lat.toFixed(3)}, ${draftPoint.lng.toFixed(3)}`,
        confidence: draft.confidence as Confidence,
        summary: draft.notes,
        notes: draft.notes,
        tags: [],
        details: {
          latitude: draftPoint.lat,
          longitude: draftPoint.lng,
          precisionLevel: draft.precisionLevel,
          city: draft.city,
          region: draft.region,
          country: draft.country,
          geocodeSource: 'Manual map pin',
          roleTitle: kind === 'person' ? 'Mapped person' : undefined,
          organizationId: draft.organizationId,
          knownLocations: kind === 'person' ? [] : undefined
        }
      });
    }
    clearMapDraft();
  }

  return (
    <div>
      <Header
        title="Add map marker"
        subtitle="map tool"
        actions={<Button aria-label="Cancel marker" icon={<X size={16} />} variant="ghost" onClick={clearMapDraft} />}
      />
      <div className="mb-4 rounded-md border border-yellow-400/25 bg-yellow-400/10 p-3 text-xs text-yellow-100">
        Manual markers need precision labels. Use city, province, or country level when the source is vague.
      </div>
      <div className="grid gap-3">
        <Field label="Marker type">
          <Select value={kind} onChange={(event) => setKind(event.target.value as MapDraftKind)}>
            <option value="location">Location</option>
            <option value="person">Person</option>
            <option value="event">Event</option>
            <option value="note">Map note</option>
          </Select>
        </Field>
        <Field label="Name / title">
          <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Latitude">
            <TextInput value={draftPoint.lat.toFixed(6)} readOnly />
          </Field>
          <Field label="Longitude">
            <TextInput value={draftPoint.lng.toFixed(6)} readOnly />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Confidence">
            <Select value={draft.confidence} onChange={(event) => setDraft({ ...draft, confidence: event.target.value })}>
              {confidenceValues.map((value) => (
                <option key={value} value={value}>
                  {value || 'No confidence'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Precision">
            <Select value={draft.precisionLevel} onChange={(event) => setDraft({ ...draft, precisionLevel: event.target.value })}>
              {precisionLevels.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Organization">
          <Select value={draft.organizationId} onChange={(event) => setDraft({ ...draft, organizationId: event.target.value })}>
            <option value="">None</option>
            {organizations.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </Select>
        </Field>
        {kind === 'event' ? (
          <Field label="Event date">
            <TextInput type="date" value={draft.dateStart} onChange={(event) => setDraft({ ...draft, dateStart: event.target.value })} />
          </Field>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field label="City">
            <TextInput value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
          </Field>
          <Field label="Country">
            <TextInput value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })} />
          </Field>
        </div>
        <Field label="Region / province">
          <TextInput value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })} />
        </Field>
        <Field label="Notes">
          <TextArea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </Field>
        <Button variant="primary" icon={<Plus size={16} />} onClick={save}>
          Save marker
        </Button>
      </div>
    </div>
  );
}

function EntityInspector({
  entity,
  updateEntity,
  uploadFile,
  sources,
  entities
}: {
  entity: Entity;
  updateEntity: (id: string, payload: Draft) => Promise<void>;
  uploadFile: (file: File, payload?: Record<string, string>) => Promise<any>;
  sources: SourceRecord[];
  entities: Entity[];
}) {
  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => {
    setDraft({
      ...entity,
      aliasesText: (entity.aliases ?? []).join(', '),
      tagsText: (entity.tags ?? []).join(', '),
      ...(entity.details ?? {}),
      knownLocationTrailText: (entity.details?.knownLocationTrail ?? []).join(' -> ')
    });
  }, [entity]);

  const linkedSources = sources.filter((source) => entity.sourceIds?.includes(source.id));

  return (
    <div>
      <Header
        title={entity.name}
        subtitle={entity.type}
        actions={
          <Button
            aria-label="Export entity dossier"
            icon={<FileDown size={16} />}
            onClick={() => downloadUrl(`/api/entities/${entity.id}/export/markdown`)}
          />
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <ConfidenceBadge value={entity.confidence} />
        <SourceBadge count={entity.sourceIds?.length ?? 0} />
        <TypeBadge value={entity.type} />
      </div>
      {entity.imageFileId ? (
        <img
          src={`/api/files/${entity.imageFileId}`}
          alt={`${entity.name} headshot`}
          className="mb-4 h-40 w-full rounded-md border border-white/10 object-cover"
        />
      ) : null}
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateEntity(entity.id, {
            type: draft.type,
            name: draft.name,
            aliases: splitList(draft.aliasesText ?? ''),
            imageFileId: draft.imageFileId ?? entity.imageFileId ?? '',
            summary: draft.summary,
            notes: draft.notes,
            confidence: draft.confidence,
            tags: splitList(draft.tagsText ?? ''),
            sourceIds: draft.sourceId ? [draft.sourceId] : entity.sourceIds ?? [],
            details: {
              fullName: draft.fullName,
              roleTitle: draft.roleTitle,
              organizationId: draft.organizationId,
              lastKnownLocationId: draft.lastKnownLocationId,
              latitude: draft.latitude,
              longitude: draft.longitude,
              city: draft.city,
              region: draft.region,
              country: draft.country,
              precisionLevel: draft.precisionLevel,
              knownLocationTrail: splitList(String(draft.knownLocationTrailText ?? '').replaceAll('->', ',')),
              analystNotes: draft.notes
            }
          });
        }}
      >
        <Field label="Name">
          <TextInput value={draft.name ?? ''} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="Headshot / image">
          <TextInput
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const record = await uploadFile(file, { fileType: 'image' });
              setDraft({ ...draft, imageFileId: record.id });
              await updateEntity(entity.id, { imageFileId: record.id });
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Type">
            <Select value={draft.type ?? entity.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {formatRelationshipType(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Confidence">
            <Select value={draft.confidence ?? entity.confidence} onChange={(event) => setDraft({ ...draft, confidence: event.target.value })}>
              {confidenceValues.map((value) => (
                <option key={value} value={value}>
                  {value || 'No confidence'}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Aliases">
          <TextInput value={draft.aliasesText ?? ''} onChange={(event) => setDraft({ ...draft, aliasesText: event.target.value })} />
        </Field>
        {entity.type === 'person' ? (
          <>
            <Field label="Role">
              <TextInput value={draft.roleTitle ?? ''} onChange={(event) => setDraft({ ...draft, roleTitle: event.target.value })} />
            </Field>
            <Field label="Organization">
              <Select value={draft.organizationId ?? ''} onChange={(event) => setDraft({ ...draft, organizationId: event.target.value })}>
                <option value="">None</option>
                {entities
                  .filter((item) => item.type === 'organization' || item.type === 'sub-organization')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Last known location">
              <Select value={draft.lastKnownLocationId ?? ''} onChange={(event) => setDraft({ ...draft, lastKnownLocationId: event.target.value })}>
                <option value="">None</option>
                {entities
                  .filter((item) => item.type === 'location')
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Location trail">
              <TextInput
                value={draft.knownLocationTrailText ?? ''}
                onChange={(event) => setDraft({ ...draft, knownLocationTrailText: event.target.value })}
                placeholder="Quetta -> Islamabad -> Kabul"
              />
            </Field>
          </>
        ) : null}
        {entity.type === 'location' ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude">
                <TextInput value={draft.latitude ?? ''} onChange={(event) => setDraft({ ...draft, latitude: event.target.value })} />
              </Field>
              <Field label="Longitude">
                <TextInput value={draft.longitude ?? ''} onChange={(event) => setDraft({ ...draft, longitude: event.target.value })} />
              </Field>
            </div>
            <Field label="Precision">
              <Select value={draft.precisionLevel ?? 'Unknown'} onChange={(event) => setDraft({ ...draft, precisionLevel: event.target.value })}>
                {precisionLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </Select>
            </Field>
          </>
        ) : null}
        {entity.type !== 'person' ? (
          <Field label="Primary source">
            <Select value={draft.sourceId ?? entity.sourceIds?.[0] ?? ''} onChange={(event) => setDraft({ ...draft, sourceId: event.target.value })}>
              <option value="">Unsourced</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Summary">
          <TextArea value={draft.summary ?? ''} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
        </Field>
        <Field label="Notes">
          <TextArea value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </Field>
        <Button variant="primary" type="submit" icon={<Save size={16} />}>
          Save
        </Button>
      </form>
      <div className="mt-4 grid gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--c-text-secondary)]">Linked sources</div>
        {linkedSources.length ? (
          linkedSources.map((source) => (
            <a key={source.id} className="rounded-md border border-white/10 bg-black/20 p-2 text-sm hover:bg-white/[0.06]" href={source.url} target="_blank" rel="noreferrer">
              {source.title}
            </a>
          ))
        ) : (
          <div className="rounded-md border border-yellow-400/25 bg-yellow-400/10 p-2 text-xs text-yellow-100">Unsourced entity attributes should be treated as analyst notes or hypotheses.</div>
        )}
      </div>
    </div>
  );
}

function RelationshipInspector({
  relationship,
  updateRelationship,
  entities,
  sources
}: {
  relationship: Relationship;
  updateRelationship: (id: string, payload: Draft) => Promise<void>;
  entities: Entity[];
  sources: SourceRecord[];
}) {
  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => setDraft({ ...relationship }), [relationship]);

  return (
    <div>
      <Header title={formatRelationshipType(relationship.relationshipType)} subtitle="relationship" />
      <div className="mb-4 flex flex-wrap gap-2">
        <ConfidenceBadge value={relationship.confidence} />
        <SourceBadge count={relationship.sourceIds?.length ?? 0} />
        <TypeBadge value={relationship.status} />
      </div>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateRelationship(relationship.id, draft);
        }}
      >
        <Field label="Source entity">
          <Select value={draft.sourceEntityId ?? ''} onChange={(event) => setDraft({ ...draft, sourceEntityId: event.target.value })}>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Target entity">
          <Select value={draft.targetEntityId ?? ''} onChange={(event) => setDraft({ ...draft, targetEntityId: event.target.value })}>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Type">
          <Select value={draft.relationshipType ?? ''} onChange={(event) => setDraft({ ...draft, relationshipType: event.target.value })}>
            {relationshipTypes.map((type) => (
              <option key={type} value={type}>
                {formatRelationshipType(type)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Confidence">
            <Select value={draft.confidence ?? 'unknown'} onChange={(event) => setDraft({ ...draft, confidence: event.target.value })}>
              {confidenceValues.map((value) => (
                <option key={value} value={value}>
                  {value || 'No confidence'}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={draft.status ?? 'unknown'} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              {['active', 'former', 'alleged', 'disputed', 'unknown'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Source">
          <Select
            value={draft.sourceIds?.[0] ?? ''}
            onChange={(event) => setDraft({ ...draft, sourceIds: event.target.value ? [event.target.value] : [] })}
          >
            <option value="">Unsourced</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes">
          <TextArea value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </Field>
        <Button variant="primary" type="submit" icon={<Save size={16} />}>
          Save
        </Button>
      </form>
    </div>
  );
}

function EventInspector({
  event,
  updateEvent,
  entities,
  sources
}: {
  event: EventRecord;
  updateEvent: (id: string, payload: Draft) => Promise<void>;
  entities: Entity[];
  sources: SourceRecord[];
}) {
  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => setDraft({ ...event }), [event]);

  return (
    <div>
      <Header title={event.title} subtitle="event" />
      <form
        className="grid gap-3"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          updateEvent(event.id, draft);
        }}
      >
        <Field label="Title">
          <TextInput value={draft.title ?? ''} onChange={(change) => setDraft({ ...draft, title: change.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Start">
            <TextInput type="date" value={draft.dateStart ?? ''} onChange={(change) => setDraft({ ...draft, dateStart: change.target.value })} />
          </Field>
          <Field label="Confidence">
            <Select value={draft.confidence ?? 'unknown'} onChange={(change) => setDraft({ ...draft, confidence: change.target.value })}>
              {confidenceValues.map((value) => (
                <option key={value} value={value}>
                  {value || 'No confidence'}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Location">
          <Select value={draft.locationId ?? ''} onChange={(change) => setDraft({ ...draft, locationId: change.target.value })}>
            <option value="">None</option>
            {entities
              .filter((entity) => entity.type === 'location')
              .map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Source">
          <Select value={draft.sourceIds?.[0] ?? ''} onChange={(change) => setDraft({ ...draft, sourceIds: change.target.value ? [change.target.value] : [] })}>
            <option value="">Unsourced</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <TextArea value={draft.description ?? ''} onChange={(change) => setDraft({ ...draft, description: change.target.value })} />
        </Field>
        <Button variant="primary" type="submit" icon={<Save size={16} />}>
          Save
        </Button>
      </form>
    </div>
  );
}

function SourceInspector({ source, updateSource }: { source: SourceRecord; updateSource: (id: string, payload: Draft) => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => setDraft({ ...source }), [source]);
  return (
    <div>
      <Header
        title={source.title}
        subtitle="source"
        actions={
          source.url ? (
            <Button aria-label="Open source" icon={<ExternalLink size={16} />} onClick={() => window.open(source.url, '_blank', 'noreferrer')} />
          ) : null
        }
      />
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateSource(source.id, draft);
        }}
      >
        <Field label="Title">
          <TextInput value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </Field>
        <Field label="URL">
          <TextInput value={draft.url ?? ''} onChange={(event) => setDraft({ ...draft, url: event.target.value })} />
        </Field>
        <Field label="Source type">
          <Select value={draft.sourceType ?? 'Other'} onChange={(event) => setDraft({ ...draft, sourceType: event.target.value })}>
            {sourceTypes.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Reliability">
            <Select value={draft.reliability ?? 'D: Unknown'} onChange={(event) => setDraft({ ...draft, reliability: event.target.value })}>
              {sourceReliability.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </Field>
          <Field label="Credibility">
            <Select value={draft.credibility ?? '3: Possibly true'} onChange={(event) => setDraft({ ...draft, credibility: event.target.value })}>
              {sourceCredibility.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <TextArea value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </Field>
        <Button variant="primary" type="submit" icon={<Save size={16} />}>
          Save
        </Button>
      </form>
    </div>
  );
}

function NoteInspector({ note, updateNote }: { note: NoteRecord; updateNote: (id: string, payload: Draft) => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>({});
  useEffect(() => setDraft({ ...note }), [note]);
  return (
    <div>
      <Header title={note.title || 'Untitled note'} subtitle={note.noteType} />
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateNote(note.id, draft);
        }}
      >
        <Field label="Title">
          <TextInput value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </Field>
        <Field label="Body">
          <TextArea className="min-h-44" value={draft.body ?? ''} onChange={(event) => setDraft({ ...draft, body: event.target.value })} />
        </Field>
        <Button variant="primary" type="submit" icon={<Save size={16} />}>
          Save
        </Button>
      </form>
      <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3">
        <MarkdownPreview body={draft.body ?? ''} />
      </div>
    </div>
  );
}

function FileInspector({ file }: { file: any }) {
  const fileUrl = `/api/files/${file.id}`;
  return (
    <div>
      <Header
        title={file.originalName}
        subtitle={file.fileType}
        actions={<Button aria-label="Open file" icon={<ExternalLink size={16} />} onClick={() => window.open(fileUrl, '_blank', 'noreferrer')} />}
      />
      {file.mimeType?.startsWith('image/') ? (
        <img src={fileUrl} alt={file.originalName} className="mb-4 max-h-56 w-full rounded-md border border-white/10 object-cover" />
      ) : null}
      <div className="grid gap-2 text-sm text-[color:var(--c-text-secondary)]">
        <div>Type: {file.mimeType}</div>
        <div>SHA-256: {file.hash?.slice(0, 24)}...</div>
        <div>pHash: {file.perceptualHash}</div>
      </div>
    </div>
  );
}

function StickyInspector({ note }: { note: StickyNote }) {
  return (
    <div>
      <Header title={note.title || 'Sticky note'} subtitle={note.color} />
      <div className={`sticky-node ${note.color} rounded-md p-3`}>
        <div className="font-semibold">{note.title}</div>
        <p className="mt-2 text-sm">{note.body}</p>
      </div>
    </div>
  );
}
