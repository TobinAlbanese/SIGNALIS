import { useMemo, useState } from 'react';
import { CalendarDays, Filter } from 'lucide-react';
import { confidenceValues } from '../constants';
import { compactDate, formatRelationshipType } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import { ConfidenceBadge, TypeBadge } from '../components/ui/Badge';
import { Select, TextInput } from '../components/ui/Form';
import { SectionHeader } from '../components/ui/SectionHeader';

type TimelineItem = {
  id: string;
  kind: 'event' | 'relationship' | 'source';
  title: string;
  date: string;
  body: string;
  confidence?: string;
  type: string;
};

export function TimelineView() {
  const { events, relationships, sources, entities, selectItem } = useWorkspace();
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [query, setQuery] = useState('');

  const items = useMemo<TimelineItem[]>(() => {
    const eventItems = events.map((event) => ({
      id: event.id,
      kind: 'event' as const,
      title: event.title,
      date: event.dateStart || event.createdAt,
      body: event.description,
      confidence: event.confidence,
      type: event.eventType,
      relatedIds: [event.locationId, ...(event.involvedPersonIds ?? []), ...(event.involvedOrganizationIds ?? [])].filter(Boolean)
    }));
    const relationshipItems = relationships
      .filter((relationship) => relationship.startDate || relationship.endDate)
      .flatMap((relationship) => [
        relationship.startDate
          ? {
              id: `${relationship.id}-start`,
              sourceId: relationship.id,
              kind: 'relationship' as const,
              title: `${relationship.sourceName} ${formatRelationshipType(relationship.relationshipType)} ${relationship.targetName}`,
              date: relationship.startDate,
              body: relationship.notes,
              confidence: relationship.confidence,
              type: 'Relationship start',
              relatedIds: [relationship.sourceEntityId, relationship.targetEntityId]
            }
          : null,
        relationship.endDate
          ? {
              id: `${relationship.id}-end`,
              sourceId: relationship.id,
              kind: 'relationship' as const,
              title: `${relationship.sourceName} ${formatRelationshipType(relationship.relationshipType)} ${relationship.targetName}`,
              date: relationship.endDate,
              body: relationship.notes,
              confidence: relationship.confidence,
              type: 'Relationship end',
              relatedIds: [relationship.sourceEntityId, relationship.targetEntityId]
            }
          : null
      ])
      .filter(Boolean) as Array<TimelineItem & { sourceId: string; relatedIds: string[] }>;
    const sourceItems = sources
      .filter((source) => source.publicationDate)
      .map((source) => ({
        id: source.id,
        kind: 'source' as const,
        title: source.title,
        date: source.publicationDate,
        body: source.publisher || source.url,
        type: 'Source publication',
        relatedIds: source.linkedEntities ?? []
      }));

    return [...eventItems, ...relationshipItems, ...sourceItems]
      .filter((item: any) => confidenceFilter === 'all' || item.confidence === confidenceFilter)
      .filter((item: any) => entityFilter === 'all' || item.relatedIds?.includes(entityFilter))
      .filter((item) => !query.trim() || `${item.title} ${item.body} ${item.type}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [confidenceFilter, entityFilter, events, query, relationships, sources]);

  return (
    <div>
      <SectionHeader title="Timeline" eyebrow="Chronology" />

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter timeline" />
        <Select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)} aria-label="Entity filter">
          <option value="all">All entities</option>
          {entities.map((entity) => (
            <option key={entity.id} value={entity.id}>
              {entity.name}
            </option>
          ))}
        </Select>
        <Select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)} aria-label="Confidence filter">
          <option value="all">All confidence</option>
          {confidenceValues.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
      </div>

      <div className="surface rounded-lg p-4">
        <div className="relative grid gap-3 before:absolute before:left-[18px] before:top-0 before:h-full before:w-px before:bg-white/10">
          {items.map((item) => (
            <button
              key={`${item.kind}-${item.id}`}
              className="relative ml-10 rounded-md border border-white/10 bg-black/20 p-3 text-left transition hover:bg-white/[0.06]"
              onClick={() => selectItem({ kind: item.kind === 'relationship' ? 'relationship' : item.kind, id: (item as any).sourceId ?? item.id } as any)}
            >
              <span className="absolute -left-[31px] top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-[#181818] text-[color:var(--c-accent)]">
                <CalendarDays size={16} />
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-[color:var(--c-text-secondary)]">{compactDate(item.date)}</div>
              </div>
              <div className="mt-2 text-sm text-[color:var(--c-text-secondary)]">{item.body}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <TypeBadge value={item.type} />
                {item.confidence ? <ConfidenceBadge value={item.confidence} /> : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
