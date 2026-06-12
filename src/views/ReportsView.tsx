import { useMemo, useState } from 'react';
import { Download, FileText, GitCommitHorizontal, ShieldCheck } from 'lucide-react';
import { api, downloadBlob, downloadUrl, formatRelationshipType } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import { Button } from '../components/ui/Button';
import { Field, Select } from '../components/ui/Form';
import { SectionHeader } from '../components/ui/SectionHeader';

export function ReportsView() {
  const { activeProjectId, activeProject, entities, relationships, events, sources } = useWorkspace();
  const [entityId, setEntityId] = useState(entities[0]?.id ?? '');
  const [pathFrom, setPathFrom] = useState('');
  const [pathTo, setPathTo] = useState('');
  const [pathResult, setPathResult] = useState<any[]>([]);
  const entityGroups = useMemo(() => groupEntities(entities), [entities]);

  const entity = useMemo(() => entities.find((item) => item.id === entityId), [entities, entityId]);
  const entityRelationships = relationships.filter((relationship) => relationship.sourceEntityId === entityId || relationship.targetEntityId === entityId);
  const entityEvents = events.filter((event) => event.involvedPersonIds?.includes(entityId) || event.involvedOrganizationIds?.includes(entityId) || event.locationId === entityId);
  const entitySources = sources.filter((source) => entity?.sourceIds?.includes(source.id));

  async function exportHtmlDossier() {
    if (!entity) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${entity.name}</title><style>body{font-family:system-ui;margin:40px;line-height:1.5}h1{color:#d62827}</style></head><body><h1>${entity.name}</h1><p>${entity.summary ?? ''}</p><h2>Connections</h2><ul>${entityRelationships
      .map((relationship) => `<li>${relationship.sourceName} ${formatRelationshipType(relationship.relationshipType)} ${relationship.targetName} (${relationship.confidence})</li>`)
      .join('')}</ul><h2>Timeline</h2><ul>${entityEvents.map((event) => `<li>${event.dateStart || 'Undated'}: ${event.title}</li>`).join('')}</ul><h2>Sources</h2><ul>${entitySources
      .map((source) => `<li>${source.title}</li>`)
      .join('')}</ul></body></html>`;
    downloadBlob(new Blob([html], { type: 'text/html' }), `${entity.name.replaceAll(' ', '-')}-dossier.html`);
  }

  async function findPath() {
    if (!activeProjectId || !pathFrom || !pathTo) return;
    const result = await api<{ path: any[] }>(`/api/projects/${activeProjectId}/path?from=${pathFrom}&to=${pathTo}`);
    setPathResult(result.path);
  }

  return (
    <div>
      <SectionHeader
        title="Reports"
        eyebrow="Dossiers and exports"
        actions={
          <>
            <Button icon={<Download size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/markdown`)}>
              Project MD
            </Button>
            <Button icon={<Download size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/zip`)}>
              Project ZIP
            </Button>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="surface rounded-lg p-4">
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Field label="Entity dossier">
              <Select value={entityId} onChange={(event) => setEntityId(event.target.value)}>
                {entityGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <Button icon={<FileText size={16} />} onClick={() => entity && downloadUrl(`/api/entities/${entity.id}/export/markdown`)}>
              Markdown
            </Button>
            <Button icon={<FileText size={16} />} onClick={exportHtmlDossier}>
              HTML
            </Button>
          </div>
          {entity ? (
            <article className="rounded-lg border border-white/10 bg-black/20 p-5">
              <h2 className="text-2xl font-semibold">{entity.name}</h2>
              <div className="mt-2 text-sm text-[color:var(--c-text-secondary)]">{entity.type} / {entity.confidence}</div>
              <p className="mt-4 text-sm leading-relaxed text-[color:var(--c-text-secondary)]">{entity.summary || 'No summary yet.'}</p>
              <h3 className="mt-5 font-semibold">Connections</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {entityRelationships.map((relationship) => (
                  <li key={relationship.id} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                    {relationship.sourceName} {formatRelationshipType(relationship.relationshipType)} {relationship.targetName}
                  </li>
                ))}
              </ul>
              <h3 className="mt-5 font-semibold">Timeline</h3>
              <ul className="mt-2 grid gap-2 text-sm">
                {entityEvents.map((event) => (
                  <li key={event.id} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                    {event.dateStart || 'Undated'}: {event.title}
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </section>

        <aside className="grid content-start gap-4">
          <section className="surface rounded-lg p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <GitCommitHorizontal size={18} />
              Path finder
            </h2>
            <div className="grid gap-3">
              <Select value={pathFrom} onChange={(event) => setPathFrom(event.target.value)}>
                <option value="">From entity</option>
                {entityGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <Select value={pathTo} onChange={(event) => setPathTo(event.target.value)}>
                <option value="">To entity</option>
                {entityGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <Button variant="primary" onClick={findPath}>
                Find path
              </Button>
              <div className="grid gap-2 text-sm">
                {pathResult.length ? (
                  pathResult.map((edge) => (
                    <div key={edge.id} className="rounded-md border border-white/10 bg-black/20 p-2">
                      {edge.sourceName ?? edge.sourceEntityId} {formatRelationshipType(edge.relationshipType)} {edge.targetName ?? edge.targetEntityId}
                    </div>
                  ))
                ) : (
                  <div className="text-[color:var(--c-text-secondary)]">No path selected.</div>
                )}
              </div>
            </div>
          </section>
          <section className="surface rounded-lg p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <ShieldCheck size={18} />
              Public viewer plan
            </h2>
            <div className="grid gap-2 text-sm text-[color:var(--c-text-secondary)]">
              <div className="rounded-md border border-white/10 bg-black/20 p-3">Read-only graph, map, timeline, profiles, and source list.</div>
              <div className="rounded-md border border-white/10 bg-black/20 p-3">Export settings reserve controls for notes, exact coordinates, low confidence relationships, images, and private paths.</div>
              <div className="rounded-md border border-white/10 bg-black/20 p-3">Sanitized bundles can later emit viewer.html, project-public.json, media, and assets.</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function groupEntities(entities: any[]) {
  return [
    { label: 'People', items: entities.filter((entity) => entity.type === 'person') },
    { label: 'Organizations', items: entities.filter((entity) => entity.type === 'organization' || entity.type === 'sub-organization') },
    { label: 'Locations', items: entities.filter((entity) => entity.type === 'location') },
    { label: 'Sources / Documents / Other', items: entities.filter((entity) => !['person', 'organization', 'sub-organization', 'location'].includes(entity.type)) }
  ].filter((group) => group.items.length);
}
