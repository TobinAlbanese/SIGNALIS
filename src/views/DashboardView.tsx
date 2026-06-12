import { AlertTriangle, CircleHelp, Database, GitBranch, MapPinned, NotebookTabs, ShieldCheck, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { compactDate } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import { ConfidenceBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';

const metricIcons = {
  entities: UsersRound,
  relationships: GitBranch,
  events: NotebookTabs,
  sources: Database,
  locations: MapPinned,
  unsourcedClaims: AlertTriangle,
  lowConfidenceRelationships: ShieldCheck,
  contradictions: AlertTriangle,
  openQuestions: CircleHelp
};

export function DashboardView() {
  const { activeProject, entities, relationships, events, sources, notes, openQuestions, claims, auditLog, selectItem } = useWorkspace();
  const navigate = useNavigate();

  if (!activeProject) return <EmptyState title="Loading project" body="Preparing the local workspace." />;

  const stats = activeProject.stats ?? {
    entities: entities.length,
    relationships: relationships.length,
    events: events.length,
    sources: sources.length,
    locations: entities.filter((entity) => entity.type === 'location').length,
    unsourcedClaims: claims.filter((claim) => !claim.sourceIds?.length).length,
    lowConfidenceRelationships: relationships.filter((rel) => ['low', 'unknown', 'contradicted'].includes(rel.confidence)).length,
    contradictions: claims.filter((claim) => claim.status === 'contradicted').length,
    openQuestions: openQuestions.filter((question) => question.status !== 'resolved').length
  };
  const metricTargets: Record<string, string> = {
    entities: '/entities',
    relationships: '/graph',
    events: '/timeline',
    sources: '/sources',
    locations: '/map',
    unsourcedClaims: '/notes',
    lowConfidenceRelationships: '/graph',
    contradictions: '/notes',
    openQuestions: '/notes'
  };

  return (
    <div>
      <SectionHeader title={activeProject.title} eyebrow="Project dashboard" />

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Object.entries(stats).map(([key, value]) => {
          const Icon = metricIcons[key as keyof typeof metricIcons] ?? Database;
          return (
            <button
              key={key}
              className="surface rounded-lg p-4 text-left transition hover:border-[color:var(--c-accent)] hover:bg-white/[0.04]"
              onClick={() => navigate(metricTargets[key] ?? '/')}
            >
              <div className="flex items-center justify-between gap-2">
                <Icon size={18} className="text-[color:var(--c-accent)]" />
                <span className="text-2xl font-semibold">{value}</span>
              </div>
              <div className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--c-text-secondary)]">
                {key.replace(/([A-Z])/g, ' $1')}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="surface rounded-lg p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Project breakdown</h2>
            <span className="badge">{entities.length} active records</span>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'People', count: entities.filter((entity) => entity.type === 'person').length, path: '/entities' },
              { label: 'Organizations', count: entities.filter((entity) => entity.type === 'organization' || entity.type === 'sub-organization').length, path: '/entities' },
              { label: 'Mapped locations', count: entities.filter((entity) => entity.type === 'location').length, path: '/map' },
              { label: 'Source-backed edges', count: relationships.filter((relationship) => relationship.sourceIds?.length).length, path: '/graph' }
            ].map((item) => (
              <button key={item.label} className="rounded-md border border-white/10 bg-black/20 p-3 text-left hover:bg-white/[0.06]" onClick={() => navigate(item.path)}>
                <div className="text-2xl font-semibold">{item.count}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--c-text-secondary)]">{item.label}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="surface rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recently edited records</h2>
            <span className="badge">{auditLog.length} changes</span>
          </div>
          <div className="grid gap-2">
            {auditLog.slice(0, 8).map((record) => (
              <button
                key={record.id}
                className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3 text-left text-sm hover:bg-white/[0.06]"
                onClick={() => record.targetType && selectItem({ kind: record.targetType as any, id: record.targetId })}
              >
                <span>
                  <span className="font-medium">{record.action}</span>
                  <span className="ml-2 text-[color:var(--c-text-secondary)]">{record.targetType}</span>
                </span>
                <span className="text-xs text-[color:var(--c-text-secondary)]">{compactDate(record.createdAt)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="surface rounded-lg p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Source discipline</h2>
            <span className="badge confidence-low">{relationships.filter((rel) => !rel.sourceIds?.length).length} unsourced edges</span>
          </div>
          <div className="grid gap-3">
            {relationships.slice(0, 5).map((relationship) => (
              <button
                key={relationship.id}
                className="rounded-md border border-white/10 bg-black/20 p-3 text-left text-sm hover:bg-white/[0.06]"
                onClick={() => selectItem({ kind: 'relationship', id: relationship.id })}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{relationship.sourceName}</span>
                  <span className="text-[color:var(--c-text-secondary)]">{relationship.relationshipType}</span>
                  <span className="font-medium">{relationship.targetName}</span>
                </div>
                <div className="mt-2 flex gap-2">
                  <ConfidenceBadge value={relationship.confidence} />
                  <span className={relationship.sourceIds?.length ? 'badge confidence-high' : 'badge confidence-low'}>
                    {relationship.sourceIds?.length ? 'Source-backed' : 'Unsourced'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <section className="surface rounded-lg p-4">
          <h2 className="mb-3 font-semibold">Open questions</h2>
          <div className="grid gap-2">
            {openQuestions.slice(0, 5).map((question) => (
              <div key={question.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                <div className="text-sm font-medium">{question.question}</div>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="badge">{question.priority}</span>
                  <span className="badge">{question.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="surface rounded-lg p-4">
          <h2 className="mb-3 font-semibold">Contradictions</h2>
          <div className="grid gap-2">
            {claims.filter((claim) => claim.status === 'contradicted').length ? (
              claims
                .filter((claim) => claim.status === 'contradicted')
                .slice(0, 5)
                .map((claim) => (
                  <div key={claim.id} className="rounded-md border border-red-500/25 bg-red-500/10 p-3 text-sm">
                    {claim.claimText}
                  </div>
                ))
            ) : (
              <p className="text-sm text-[color:var(--c-text-secondary)]">No contradictions marked.</p>
            )}
          </div>
        </section>
        <section className="surface rounded-lg p-4">
          <h2 className="mb-3 font-semibold">Recent sources</h2>
          <div className="grid gap-2">
            {sources.slice(0, 5).map((source) => (
              <button
                key={source.id}
                className="rounded-md border border-white/10 bg-black/20 p-3 text-left text-sm hover:bg-white/[0.06]"
                onClick={() => selectItem({ kind: 'source', id: source.id })}
              >
                <div className="font-medium">{source.title}</div>
                <div className="mt-1 text-xs text-[color:var(--c-text-secondary)]">{source.reliability} / {source.credibility}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
