import { useMemo, useState } from 'react';
import { Download, ExternalLink, Link2, Plus, Search } from 'lucide-react';
import { sourceTypes } from '../constants';
import { compactDate, downloadUrl } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import type { SourceRecord } from '../types';
import { QuickAddModal } from '../components/QuickAddModal';
import { Button } from '../components/ui/Button';
import { Select, TextInput } from '../components/ui/Form';
import { SectionHeader } from '../components/ui/SectionHeader';

export function SourcesView() {
  const { sources, entities, relationships, events, activeProjectId, selectItem } = useWorkspace();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [quickAdd, setQuickAdd] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState('');

  const filteredSources = useMemo(
    () =>
      sources.filter((source) => {
        const haystack = `${source.title} ${source.url} ${source.publisher} ${source.author} ${source.notes} ${source.citationText}`.toLowerCase();
        return (typeFilter === 'all' || source.sourceType === typeFilter) && (!query.trim() || haystack.includes(query.toLowerCase()));
      }),
    [query, sources, typeFilter]
  );

  const selectedSource = sources.find((source) => source.id === selectedSourceId) ?? filteredSources[0] ?? sources[0];
  const linkedEntities = selectedSource ? entities.filter((entity) => entity.sourceIds?.includes(selectedSource.id) || selectedSource.linkedEntities?.includes(entity.id)) : [];
  const linkedRelationships = selectedSource
    ? relationships.filter((relationship) => relationship.sourceIds?.includes(selectedSource.id) || selectedSource.linkedRelationships?.includes(relationship.id))
    : [];
  const linkedEvents = selectedSource ? events.filter((event) => event.sourceIds?.includes(selectedSource.id) || selectedSource.linkedEvents?.includes(event.id)) : [];

  return (
    <div>
      <SectionHeader
        title="Sources"
        eyebrow="Evidence library"
        actions={
          <>
            <Button icon={<Download size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/csv/sources`)}>
              CSV
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setQuickAdd(true)}>
              Source
            </Button>
          </>
        }
      />

      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
          <TextInput className="w-full pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search source library" />
        </div>
        <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Source type filter">
          <option value="all">All source types</option>
          {sourceTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </Select>
      </div>

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="surface overflow-hidden rounded-lg">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--c-text-secondary)]">Active sources</div>
            <div className="badge">{filteredSources.length}</div>
          </div>
          <div className="max-h-[calc(100vh-250px)] overflow-auto p-3 subtle-scroll">
            {filteredSources.map((source) => (
              <button
                key={source.id}
                className={`mb-3 grid w-full gap-2 rounded-md border p-3 text-left transition ${
                  selectedSource?.id === source.id ? 'border-[color:var(--c-accent)] bg-red-500/10' : 'border-white/10 bg-black/20 hover:bg-white/[0.06]'
                }`}
                onClick={() => {
                  setSelectedSourceId(source.id);
                  selectItem({ kind: 'source', id: source.id });
                }}
              >
                <span className="line-clamp-2 text-sm font-semibold">{source.title}</span>
                <span className="line-clamp-2 text-xs leading-relaxed text-[color:var(--c-text-secondary)]">{source.publisher || source.url || source.sourceType}</span>
                <span className="flex flex-wrap gap-1.5 pt-1">
                  <span className="badge">{source.sourceType}</span>
                  <span className="badge">{source.reliability?.split(':')[0] || 'Reliability ?'}</span>
                  <span className="badge">{source.credibility?.split(':')[0] || 'Credibility ?'}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="surface rounded-lg p-5">
          {selectedSource ? (
            <SourceDetail
              source={selectedSource}
              linkedEntities={linkedEntities}
              linkedRelationships={linkedRelationships}
              linkedEvents={linkedEvents}
              onSelectEntity={(id) => selectItem({ kind: 'entity', id })}
              onSelectRelationship={(id) => selectItem({ kind: 'relationship', id })}
              onSelectEvent={(id) => selectItem({ kind: 'event', id })}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-[color:var(--c-text-secondary)]">No sources yet.</div>
          )}
        </section>
      </div>

      {quickAdd ? <QuickAddModal defaultKind="source" onClose={() => setQuickAdd(false)} /> : null}
    </div>
  );
}

function SourceDetail({
  source,
  linkedEntities,
  linkedRelationships,
  linkedEvents,
  onSelectEntity,
  onSelectRelationship,
  onSelectEvent
}: {
  source: SourceRecord;
  linkedEntities: any[];
  linkedRelationships: any[];
  linkedEvents: any[];
  onSelectEntity: (id: string) => void;
  onSelectRelationship: (id: string) => void;
  onSelectEvent: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--c-accent)]">{source.sourceType}</div>
          <h2 className="mt-1 text-2xl font-semibold leading-tight">{source.title}</h2>
          <div className="mt-2 text-sm text-[color:var(--c-text-secondary)]">
            {source.publisher || 'Unknown publisher'} {source.publicationDate ? ` / ${compactDate(source.publicationDate)}` : ''}
          </div>
        </div>
        {source.url ? (
          <Button icon={<ExternalLink size={16} />} onClick={() => window.open(source.url, '_blank', 'noreferrer')}>
            Open
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Meta label="Website / URL" value={source.url || 'No URL recorded'} />
        <Meta label="Author" value={source.author || 'Unknown'} />
        <Meta label="Publication date" value={source.publicationDate || 'Unknown'} />
        <Meta label="Access date" value={source.accessDate || 'Unknown'} />
        <Meta label="Reliability" value={source.reliability} />
        <Meta label="Credibility" value={source.credibility} />
      </div>

      <div className="mt-5 rounded-md border border-white/10 bg-black/20 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--c-text-secondary)]">Citation</div>
        <p className="text-sm text-[color:var(--c-text-secondary)]">{source.citationText || 'No citation text recorded.'}</p>
      </div>

      <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--c-text-secondary)]">Notes</div>
        <p className="whitespace-pre-wrap text-sm text-[color:var(--c-text-secondary)]">{source.notes || 'No notes recorded.'}</p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--c-text-secondary)]">Evidence links</div>
        <div className="grid gap-4 2xl:grid-cols-3">
        <LinkedList title="Linked entities" items={linkedEntities} onClick={onSelectEntity} />
        <LinkedList
          title="Linked relationships"
          items={linkedRelationships.map((relationship) => ({
            ...relationship,
            name: `${relationship.sourceName} ${relationship.relationshipType.replaceAll('_', ' ')} ${relationship.targetName}`
          }))}
          onClick={onSelectRelationship}
        />
        <LinkedList title="Linked events" items={linkedEvents.map((event) => ({ ...event, name: event.title }))} onClick={onSelectEvent} />
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--c-text-secondary)]">{label}</div>
      <div className="mt-1 break-words text-sm">{value}</div>
    </div>
  );
}

function LinkedList({ title, items, onClick }: { title: string; items: any[]; onClick: (id: string) => void }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--c-text-secondary)]">
        <Link2 size={14} />
        {title}
      </div>
      <div className="grid gap-2">
        {items.length ? (
          items.slice(0, 8).map((item) => (
            <button key={item.id} className="rounded-md bg-white/[0.04] px-2 py-2 text-left text-sm hover:bg-white/[0.08]" onClick={() => onClick(item.id)}>
              {item.name}
            </button>
          ))
        ) : (
          <div className="text-sm text-[color:var(--c-text-secondary)]">No links recorded.</div>
        )}
      </div>
    </div>
  );
}
