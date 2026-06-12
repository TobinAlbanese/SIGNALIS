import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarPlus, FileText, GitBranch, Landmark, MapPin, Plus, StickyNote, UserRound } from 'lucide-react';
import { confidenceValues, entityTypes, eventTypes, precisionLevels, relationshipTypes, sourceCredibility, sourceReliability, sourceTypes } from '../constants';
import { formatRelationshipType, splitList } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import type { Confidence, Entity, EntityType } from '../types';
import { Button } from './ui/Button';
import { Field, Select, TextArea, TextInput } from './ui/Form';
import { Modal } from './ui/Modal';

type AddKind = 'entity' | 'relationship' | 'event' | 'location' | 'source' | 'note' | 'project';

const labels: Array<{ value: AddKind; label: string; icon: JSX.Element }> = [
  { value: 'entity', label: 'Entity', icon: <UserRound size={16} /> },
  { value: 'relationship', label: 'Connection', icon: <GitBranch size={16} /> },
  { value: 'event', label: 'Event', icon: <CalendarPlus size={16} /> },
  { value: 'location', label: 'Location', icon: <MapPin size={16} /> },
  { value: 'source', label: 'Source', icon: <FileText size={16} /> },
  { value: 'note', label: 'Note', icon: <StickyNote size={16} /> },
  { value: 'project', label: 'Project', icon: <Landmark size={16} /> }
];

export function QuickAddModal({ onClose, defaultKind = 'entity' }: { onClose: () => void; defaultKind?: AddKind }) {
  const [kind, setKind] = useState<AddKind>(defaultKind);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const { entities, sources, createEntity, createRelationship, createEvent, createSource, createNote, createProject, uploadFile } = useWorkspace();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting }
  } = useForm<Record<string, string>>({
    defaultValues: {
      type: 'person',
      confidence: '',
      relationshipType: 'associate_of',
      status: 'unknown',
      direction: 'directed',
      eventType: 'Other',
      sourceType: 'Website',
      reliability: 'D: Unknown',
      credibility: '3: Possibly true',
      precisionLevel: 'Unknown'
    }
  });

  const groupedEntities = useMemo(() => groupEntitiesForSelect(entities), [entities]);
  const selectedEntityType = watch('type') || 'person';

  async function submit(raw: Record<string, string>) {
    if (kind === 'project') {
      const parsed = z.object({ title: z.string().min(1), description: z.string().optional() }).parse(raw);
      await createProject({
        title: parsed.title,
        description: parsed.description ?? '',
        category: raw.category || 'General research',
        status: raw.status || 'active',
        tags: splitList(raw.tags ?? ''),
        notes: raw.notes ?? ''
      });
    }

    if (kind === 'entity') {
      const parsed = z.object({ name: z.string().min(1), type: z.string().min(1), confidence: z.string().optional() }).parse(raw);
      const imageRecord = selectedImage ? await uploadFile(selectedImage, { fileType: 'image' }) : null;
      await createEntity({
        type: parsed.type as EntityType,
        name: parsed.name,
        aliases: splitList(raw.aliases ?? ''),
        summary: raw.summary ?? '',
        notes: raw.notes ?? '',
        imageFileId: imageRecord?.id ?? '',
        confidence: parsed.confidence as Confidence,
        tags: splitList(raw.tags ?? ''),
        sourceIds: raw.sourceId ? [raw.sourceId] : [],
        details:
          parsed.type === 'location'
            ? {
                latitude: raw.latitude,
                longitude: raw.longitude,
                city: raw.city,
                region: raw.region,
                country: raw.country,
                precisionLevel: raw.precisionLevel,
                geocodeSource: raw.geocodeSource || 'Manual entry'
              }
            : {
                roleTitle: raw.roleTitle,
                organizationId: raw.organizationId,
                lastKnownLocationId: raw.lastKnownLocationId,
                analystNotes: raw.notes
              }
      });
    }

    if (kind === 'location') {
      const parsed = z.object({ name: z.string().min(1), confidence: z.string().optional() }).parse(raw);
      await createEntity({
        type: 'location',
        name: parsed.name,
        aliases: splitList(raw.aliases ?? ''),
        summary: raw.summary ?? raw.notes ?? '',
        notes: raw.notes ?? '',
        confidence: parsed.confidence as Confidence,
        tags: splitList(raw.tags ?? ''),
        sourceIds: raw.sourceId ? [raw.sourceId] : [],
        details: {
          latitude: raw.latitude,
          longitude: raw.longitude,
          city: raw.city,
          region: raw.region,
          country: raw.country,
          precisionLevel: raw.precisionLevel,
          geocodeSource: raw.geocodeSource || 'Manual entry',
          originalQuery: raw.originalQuery
        }
      });
    }

    if (kind === 'relationship') {
      const parsed = z
        .object({
          sourceEntityId: z.string().min(1),
          targetEntityId: z.string().min(1),
          relationshipType: z.string().min(1),
          confidence: z.string().optional()
        })
        .parse(raw);
      await createRelationship({
        ...parsed,
        confidence: parsed.confidence as Confidence,
        direction: raw.direction as any,
        status: (raw.status as any) || 'unknown',
        startDate: raw.startDate ?? '',
        endDate: raw.endDate ?? '',
        notes: raw.notes ?? '',
        sourceIds: raw.sourceId ? [raw.sourceId] : []
      });
    }

    if (kind === 'event') {
      const parsed = z.object({ title: z.string().min(1), eventType: z.string().min(1), confidence: z.string().optional() }).parse(raw);
      await createEvent({
        title: parsed.title,
        eventType: parsed.eventType,
        dateStart: raw.dateStart ?? '',
        dateEnd: raw.dateEnd ?? '',
        locationId: raw.locationId ?? '',
        latitude: raw.latitude ? Number(raw.latitude) : null,
        longitude: raw.longitude ? Number(raw.longitude) : null,
        involvedPersonIds: raw.involvedPersonId ? [raw.involvedPersonId] : [],
        involvedOrganizationIds: raw.involvedOrganizationId ? [raw.involvedOrganizationId] : [],
        sourceIds: raw.sourceId ? [raw.sourceId] : [],
        description: raw.description ?? '',
        analystNotes: raw.notes ?? '',
        confidence: parsed.confidence as any,
        tags: splitList(raw.tags ?? '')
      });
    }

    if (kind === 'source') {
      const parsed = z.object({ title: z.string().min(1), sourceType: z.string().min(1) }).parse(raw);
      await createSource({
        title: parsed.title,
        url: raw.url ?? '',
        publisher: raw.publisher ?? '',
        author: raw.author ?? '',
        publicationDate: raw.publicationDate ?? '',
        accessDate: raw.accessDate ?? new Date().toISOString().slice(0, 10),
        sourceType: parsed.sourceType,
        reliability: raw.reliability,
        credibility: raw.credibility,
        citationText: raw.citationText ?? '',
        notes: raw.notes ?? ''
      });
    }

    if (kind === 'note') {
      const parsed = z.object({ title: z.string().min(1) }).parse(raw);
      await createNote({
        title: parsed.title,
        body: raw.body ?? '',
        parentType: raw.parentType || 'project',
        parentId: raw.parentId || '',
        noteType: raw.noteType || 'project',
        color: raw.color || 'note',
        tags: splitList(raw.tags ?? '')
      });
    }

    reset();
    setSelectedImage(null);
    onClose();
  }

  return (
    <Modal
      title="Quick Add"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="quick-add-form" disabled={isSubmitting} icon={<Plus size={16} />}>
            Save
          </Button>
        </div>
      }
    >
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-7">
        {labels.map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={kind === item.value ? 'primary' : 'secondary'}
            onClick={() => setKind(item.value)}
            icon={item.icon}
            className="justify-start"
          >
            {item.label}
          </Button>
        ))}
      </div>

      <form id="quick-add-form" className="grid gap-4" onSubmit={handleSubmit(submit)}>
        {kind === 'project' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <TextInput {...register('title')} autoFocus />
            </Field>
            <Field label="Category">
              <TextInput {...register('category')} placeholder="Public-source organizational analysis" />
            </Field>
            <Field label="Tags">
              <TextInput {...register('tags')} placeholder="demo, training" />
            </Field>
            <Field label="Status">
              <TextInput {...register('status')} placeholder="active" />
            </Field>
            <Field label="Description">
              <TextArea {...register('description')} className="md:col-span-2" />
            </Field>
            <Field label="Notes">
              <TextArea {...register('notes')} />
            </Field>
          </div>
        ) : null}

        {kind === 'entity' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Type">
              <Select {...register('type')}>
                {entityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Confidence">
              <Select {...register('confidence')}>
                {confidenceValues.map((value) => (
                  <option key={value} value={value}>
                    {value || 'No confidence'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Name">
              <TextInput {...register('name')} autoFocus />
            </Field>
            <Field label="Headshot / image">
              <TextInput type="file" accept="image/*" onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)} />
            </Field>
            <Field label="Aliases">
              <TextInput {...register('aliases')} placeholder="comma separated" />
            </Field>
            <Field label="Role / title">
              <TextInput {...register('roleTitle')} />
            </Field>
            <Field label="Organization">
              <Select {...register('organizationId')}>
                <option value="">None</option>
                {entities
                  .filter((entity) => entity.type === 'organization' || entity.type === 'sub-organization')
                  .map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Last known location">
              <Select {...register('lastKnownLocationId')}>
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
            {selectedEntityType !== 'person' ? (
              <Field label="Primary source">
                <Select {...register('sourceId')}>
                  <option value="">Unsourced</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.title}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label="Latitude">
              <TextInput {...register('latitude')} inputMode="decimal" />
            </Field>
            <Field label="Longitude">
              <TextInput {...register('longitude')} inputMode="decimal" />
            </Field>
            <Field label="Precision">
              <Select {...register('precisionLevel')}>
                {precisionLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </Select>
            </Field>
            <Field label="Tags">
              <TextInput {...register('tags')} placeholder="comma separated" />
            </Field>
            <Field label="Summary">
              <TextArea {...register('summary')} />
            </Field>
            <Field label="Notes">
              <TextArea {...register('notes')} />
            </Field>
          </div>
        ) : null}

        {kind === 'relationship' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Source entity">
              <Select {...register('sourceEntityId')} autoFocus>
                <option value="">Select entity</option>
                {groupedEntities.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Target entity">
              <Select {...register('targetEntityId')}>
                <option value="">Select entity</option>
                {groupedEntities.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Relationship type">
              <Select {...register('relationshipType')}>
                {relationshipTypes.map((type) => (
                  <option key={type} value={type}>
                    {formatRelationshipType(type)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Confidence">
              <Select {...register('confidence')}>
                {confidenceValues.map((value) => (
                  <option key={value} value={value}>
                    {value || 'No confidence'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select {...register('status')}>
                {['active', 'former', 'alleged', 'disputed', 'unknown'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Source">
              <Select {...register('sourceId')}>
                <option value="">Unsourced</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Start date">
              <TextInput type="date" {...register('startDate')} />
            </Field>
            <Field label="End date">
              <TextInput type="date" {...register('endDate')} />
            </Field>
            <Field label="Notes">
              <TextArea {...register('notes')} />
            </Field>
          </div>
        ) : null}

        {kind === 'location' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Location name">
              <TextInput {...register('name')} autoFocus />
            </Field>
            <Field label="Confidence">
              <Select {...register('confidence')}>
                {confidenceValues.map((value) => (
                  <option key={value} value={value}>
                    {value || 'No confidence'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Latitude">
              <TextInput {...register('latitude')} inputMode="decimal" />
            </Field>
            <Field label="Longitude">
              <TextInput {...register('longitude')} inputMode="decimal" />
            </Field>
            <Field label="Precision">
              <Select {...register('precisionLevel')}>
                {precisionLevels.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </Select>
            </Field>
            <Field label="Country">
              <TextInput {...register('country')} />
            </Field>
            <Field label="City">
              <TextInput {...register('city')} />
            </Field>
            <Field label="Region">
              <TextInput {...register('region')} />
            </Field>
            <Field label="Primary source">
              <Select {...register('sourceId')}>
                <option value="">Unsourced</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tags">
              <TextInput {...register('tags')} placeholder="comma separated" />
            </Field>
            <Field label="Notes">
              <TextArea {...register('notes')} />
            </Field>
          </div>
        ) : null}

        {kind === 'event' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <TextInput {...register('title')} autoFocus />
            </Field>
            <Field label="Event type">
              <Select {...register('eventType')}>
                {eventTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </Field>
            <Field label="Date start">
              <TextInput type="date" {...register('dateStart')} />
            </Field>
            <Field label="Date end">
              <TextInput type="date" {...register('dateEnd')} />
            </Field>
            <Field label="Location">
              <Select {...register('locationId')}>
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
            <Field label="Confidence">
              <Select {...register('confidence')}>
                {confidenceValues.map((value) => (
                  <option key={value} value={value}>
                    {value || 'No confidence'}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Latitude">
              <TextInput {...register('latitude')} inputMode="decimal" />
            </Field>
            <Field label="Longitude">
              <TextInput {...register('longitude')} inputMode="decimal" />
            </Field>
            <Field label="Person">
              <Select {...register('involvedPersonId')}>
                <option value="">None</option>
                {entities
                  .filter((entity) => entity.type === 'person')
                  .map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Organization">
              <Select {...register('involvedOrganizationId')}>
                <option value="">None</option>
                {entities
                  .filter((entity) => entity.type === 'organization' || entity.type === 'sub-organization')
                  .map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Source">
              <Select {...register('sourceId')}>
                <option value="">Unsourced</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tags">
              <TextInput {...register('tags')} placeholder="comma separated" />
            </Field>
            <Field label="Description">
              <TextArea {...register('description')} />
            </Field>
            <Field label="Notes">
              <TextArea {...register('notes')} />
            </Field>
          </div>
        ) : null}

        {kind === 'source' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <TextInput {...register('title')} autoFocus />
            </Field>
            <Field label="Source type">
              <Select {...register('sourceType')}>
                {sourceTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </Field>
            <Field label="URL">
              <TextInput {...register('url')} />
            </Field>
            <Field label="Publisher">
              <TextInput {...register('publisher')} />
            </Field>
            <Field label="Author">
              <TextInput {...register('author')} />
            </Field>
            <Field label="Publication date">
              <TextInput type="date" {...register('publicationDate')} />
            </Field>
            <Field label="Access date">
              <TextInput type="date" {...register('accessDate')} />
            </Field>
            <Field label="Reliability">
              <Select {...register('reliability')}>
                {sourceReliability.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Credibility">
              <Select {...register('credibility')}>
                {sourceCredibility.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Citation">
              <TextArea {...register('citationText')} />
            </Field>
            <Field label="Notes">
              <TextArea {...register('notes')} />
            </Field>
          </div>
        ) : null}

        {kind === 'note' ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <TextInput {...register('title')} autoFocus />
            </Field>
            <Field label="Color">
              <Select {...register('color')}>
                {['note', 'warning', 'hypothesis', 'contradiction', 'task', 'verified'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Parent type">
              <Select {...register('parentType')}>
                {['project', 'entity', 'event', 'relationship', 'source'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </Field>
            <Field label="Linked entity">
              <Select {...register('parentId')}>
                <option value="">Project note</option>
                {groupedEntities.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Field label="Tags">
              <TextInput {...register('tags')} placeholder="comma separated" />
            </Field>
            <Field label="Body">
              <TextArea {...register('body')} className="min-h-44" />
            </Field>
          </div>
        ) : null}
      </form>
    </Modal>
  );
}

function groupEntitiesForSelect(entities: Entity[]): Array<{ label: string; items: Array<{ value: string; label: string }> }> {
  const optionFor = (entity: Entity) => ({ value: entity.id, label: entity.name });
  const groups = [
    { label: 'People', items: entities.filter((entity) => entity.type === 'person').map(optionFor) },
    {
      label: 'Organizations',
      items: entities.filter((entity) => entity.type === 'organization' || entity.type === 'sub-organization').map(optionFor)
    },
    { label: 'Locations', items: entities.filter((entity) => entity.type === 'location').map(optionFor) },
    {
      label: 'Events / Records',
      items: entities.filter((entity) => entity.type === 'event' || entity.type === 'role' || entity.type === 'family-group').map(optionFor)
    },
    {
      label: 'Files / Evidence',
      items: entities.filter((entity) => entity.type === 'document' || entity.type === 'image' || entity.type === 'alias').map(optionFor)
    },
    {
      label: 'Other',
      items: entities.filter((entity) => ['account', 'vehicle', 'financial-entity', 'custom'].includes(entity.type)).map(optionFor)
    }
  ];
  return groups
    .map((group) => ({ ...group, items: group.items.sort((a, b) => a.label.localeCompare(b.label)) }))
    .filter((group) => group.items.length);
}
