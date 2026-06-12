import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
  type Viewport
} from '@xyflow/react';
import dagre from 'dagre';
import { Download, GitBranch, LayoutDashboard, Save, StickyNote } from 'lucide-react';
import { toCanvas, toJpeg, toPng, toSvg } from 'html-to-image';
import clsx from 'clsx';
import { confidenceValues, entityTone, familyRelationshipTypes, hierarchyRelationshipTypes, organizationChartTypes, relationshipTypes } from '../constants';
import { downloadBlob, formatRelationshipType } from '../lib/api';
import { api } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import type { Confidence, Entity, EventRecord, Relationship, SourceRecord } from '../types';
import { ConfidenceBadge, SourceBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field, Select, TextArea } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { SectionHeader } from '../components/ui/SectionHeader';

type DiagramMode = 'freeform' | 'hierarchy' | 'family' | 'spider' | 'organization' | 'event' | 'location' | 'source';
type DisplayMode = 'compact' | 'card' | 'full';

const nodeTypes = {
  entity: EntityNode,
  sticky: StickyNode
};

export function GraphView() {
  const {
    activeProjectId,
    entities,
    relationships,
    events,
    sources,
    stickyNotes,
    createRelationship,
    createStickyNote,
    selectItem,
    refreshProjectData
  } = useWorkspace();
  const [diagramMode, setDiagramMode] = useState<DiagramMode>('freeform');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('card');
  const [centralEntityId, setCentralEntityId] = useState('');
  const [entityScope, setEntityScope] = useState('all');
  const [organizationScope, setOrganizationScope] = useState('all');
  const [countryScope, setCountryScope] = useState('all');
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const graphRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const restoredProjectRef = useRef('');

  const organizations = useMemo(() => entities.filter((entity) => entity.type === 'organization' || entity.type === 'sub-organization'), [entities]);
  const countries = useMemo(
    () => Array.from(new Set(entities.map((entity) => entity.details?.country).filter(Boolean))).sort(),
    [entities]
  );

  const scoped = useMemo(() => buildGraphData({ entities, relationships, events, sources, stickyNotes, diagramMode, displayMode, centralEntityId, entityScope, organizationScope, countryScope }), [
    centralEntityId,
    countryScope,
    diagramMode,
    displayMode,
    entities,
    entityScope,
    events,
    organizationScope,
    relationships,
    sources,
    stickyNotes
  ]);

  useEffect(() => {
    const saved = loadGraphState(activeProjectId);
    const positions = saved.positions?.[diagramMode] ?? {};
    setNodes(scoped.nodes.map((node) => (positions[node.id] ? { ...node, position: positions[node.id] } : node)));
    setEdges(scoped.edges);
    const viewport = saved.viewports?.[diagramMode];
    if (viewport && flowRef.current) requestAnimationFrame(() => flowRef.current?.setViewport(viewport, { duration: 0 }));
    if (!viewport && flowRef.current) requestAnimationFrame(() => flowRef.current?.fitView({ padding: 0.16 }));
  }, [activeProjectId, diagramMode, scoped]);

  useEffect(() => {
    if (!activeProjectId || restoredProjectRef.current === activeProjectId) return;
    const saved = loadGraphState(activeProjectId);
    restoredProjectRef.current = activeProjectId;
    if (saved.diagramMode) setDiagramMode(saved.diagramMode);
    if (saved.displayMode) setDisplayMode(saved.displayMode);
    if (saved.centralEntityId) setCentralEntityId(saved.centralEntityId);
    if (saved.entityScope) setEntityScope(saved.entityScope);
    if (saved.organizationScope) setOrganizationScope(saved.organizationScope);
    if (saved.countryScope) setCountryScope(saved.countryScope);
  }, [activeProjectId]);

  useEffect(() => {
    saveGraphState(activeProjectId, {
      diagramMode,
      displayMode,
      centralEntityId,
      entityScope,
      organizationScope,
      countryScope
    });
  }, [activeProjectId, centralEntityId, countryScope, diagramMode, displayMode, entityScope, organizationScope]);

  const autoLayout = useCallback(() => {
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 60 });
    nodes.forEach((node) => {
      if (node.type === 'sticky') return;
      graph.setNode(node.id, { width: displayMode === 'compact' ? 170 : 255, height: displayMode === 'full' ? 180 : 124 });
    });
    edges.forEach((edge) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.setEdge(edge.source, edge.target);
    });
    dagre.layout(graph);
    setNodes((current) => {
      const nextNodes = current.map((node) => {
        if (node.type === 'sticky') return node;
        const point = graph.node(node.id);
        if (!point) return node;
        return { ...node, position: { x: point.x - 120, y: point.y - 60 } };
      });
      nextNodes.forEach((node) => persistGraphPosition(activeProjectId, diagramMode, node.id, node.position));
      return nextNodes;
    });
  }, [diagramMode, displayMode, edges, nodes]);

  async function saveLayout() {
    if (!activeProjectId) return;
    await api(`/api/projects/${activeProjectId}/diagram-layouts`, {
      method: 'POST',
      body: JSON.stringify({
        diagramType: diagramMode,
        name: `${diagramMode} working board`,
        nodes,
        edges,
        viewport: {}
      })
    });
  }

  async function addSticky() {
    await createStickyNote({
      title: 'Analyst note',
      body: 'Add context, uncertainty, tasking, or contradiction here.',
      color: 'note',
      x: 120,
      y: 120,
      width: 240,
      height: 150
    });
  }

  async function exportGraph(format: 'png' | 'jpg' | 'webp' | 'svg') {
    const target = graphRef.current?.querySelector('.react-flow') as HTMLElement | null;
    if (!target) return;
    const options = {
      backgroundColor: format === 'svg' ? undefined : '#181818',
      pixelRatio: 2,
      filter: (node: HTMLElement) => !node.classList?.contains('react-flow__panel')
    };
    if (format === 'png') {
      const dataUrl = await toPng(target, options);
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(blob, `taosint-${diagramMode}.png`);
    }
    if (format === 'jpg') {
      const dataUrl = await toJpeg(target, { ...options, quality: 0.96 });
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(blob, `taosint-${diagramMode}.jpg`);
    }
    if (format === 'webp') {
      const canvas = await toCanvas(target, options);
      canvas.toBlob((blob) => blob && downloadBlob(blob, `taosint-${diagramMode}.webp`), 'image/webp', 0.96);
    }
    if (format === 'svg') {
      const dataUrl = await toSvg(target, options);
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(blob, `taosint-${diagramMode}.svg`);
    }
  }

  const entityIds = new Set(entities.map((entity) => entity.id));

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[620px] flex-col">
      <SectionHeader
        title="Graph Board"
        eyebrow="Diagrams"
        actions={
          <>
            <Button icon={<StickyNote size={16} />} onClick={addSticky}>
              Sticky
            </Button>
            <Button icon={<LayoutDashboard size={16} />} onClick={autoLayout}>
              Layout
            </Button>
            <Button icon={<Save size={16} />} onClick={saveLayout}>
              Save
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select className="h-10 w-44" value={diagramMode} onChange={(event) => setDiagramMode(event.target.value as DiagramMode)} aria-label="Diagram mode">
          <option value="freeform">Freeform / custom graph</option>
          <option value="hierarchy">Hierarchy view</option>
          <option value="family">Family tree</option>
          <option value="spider">Spider diagram</option>
          <option value="organization">Organization chart</option>
          <option value="event">Event network</option>
          <option value="location">Location network</option>
          <option value="source">Source evidence graph</option>
        </Select>
        <Select className="h-10 w-36" value={displayMode} onChange={(event) => setDisplayMode(event.target.value as DisplayMode)} aria-label="Node display mode">
          <option value="compact">Compact</option>
          <option value="card">Card</option>
          <option value="full">Full profile</option>
        </Select>
        <Select className="h-10 min-w-[220px] flex-1" value={centralEntityId} onChange={(event) => setCentralEntityId(event.target.value)} aria-label="Central entity">
          <option value="">Central entity</option>
          {groupEntitiesForSelect(entities).map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <Select className="h-10 w-40" value={entityScope} onChange={(event) => setEntityScope(event.target.value)} aria-label="Entity scope">
          <option value="all">All records</option>
          <option value="person">People only</option>
          <option value="organization">Organizations</option>
          <option value="location">Countries / locations</option>
        </Select>
        <Select className="h-10 w-52" value={organizationScope} onChange={(event) => setOrganizationScope(event.target.value)} aria-label="Organization scope">
          <option value="all">All organizations</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </Select>
        <Select className="h-10 w-44" value={countryScope} onChange={(event) => setCountryScope(event.target.value)} aria-label="Country scope">
          <option value="all">All countries</option>
          {countries.map((country) => (
            <option key={country}>{country}</option>
          ))}
        </Select>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button className="h-10 px-3" icon={<Download size={16} />} onClick={() => exportGraph('jpg')}>
            JPG
          </Button>
          <Button className="h-10 px-3" icon={<Download size={16} />} onClick={() => exportGraph('webp')}>
            WebP
          </Button>
          <Button className="h-10 px-3" icon={<Download size={16} />} onClick={() => exportGraph('png')}>
            PNG
          </Button>
          <Button className="h-10 px-3" icon={<Download size={16} />} onClick={() => exportGraph('svg')}>
            SVG
          </Button>
        </div>
      </div>

      <div ref={graphRef} className="surface min-h-0 flex-1 overflow-hidden rounded-lg">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          minZoom={0.02}
          maxZoom={2.4}
          panOnScroll
          zoomOnScroll
          selectionOnDrag
          onInit={(instance) => {
            flowRef.current = instance;
            const viewport = loadGraphState(activeProjectId).viewports?.[diagramMode];
            if (viewport) instance.setViewport(viewport, { duration: 0 });
            else instance.fitView({ padding: 0.16 });
          }}
          onMoveEnd={(_, viewport) => persistGraphViewport(activeProjectId, diagramMode, viewport)}
          onNodesChange={(changes: NodeChange[]) =>
            setNodes((current) =>
              changes.reduce((acc, change) => {
                if (change.type === 'position' && change.position) {
                  persistGraphPosition(activeProjectId, diagramMode, change.id, change.position);
                  return acc.map((node) => (node.id === change.id ? { ...node, position: change.position ?? node.position } : node));
                }
                if (change.type === 'select') {
                  const node = acc.find((item) => item.id === change.id);
                  if (node?.data?.selectableId) selectItem({ kind: node.data.selectableKind, id: node.data.selectableId } as any);
                }
                return acc;
              }, current)
            )
          }
          onEdgesChange={(changes: EdgeChange[]) => {
            changes.forEach((change) => {
              if (change.type === 'select') {
                const edge = edges.find((item) => item.id === change.id);
                if (edge?.data?.relationshipId) selectItem({ kind: 'relationship', id: edge.data.relationshipId as string });
              }
            });
          }}
          onConnect={(connection: Connection) => {
            if (connection.source && connection.target && entityIds.has(connection.source) && entityIds.has(connection.target)) {
              setPendingConnection(connection);
            }
          }}
          onNodeClick={(_, node: Node) => {
            if (node.data?.selectableId) selectItem({ kind: node.data.selectableKind as any, id: node.data.selectableId as string });
          }}
          onEdgeClick={(_, edge: Edge) => {
            if (edge.data?.relationshipId) selectItem({ kind: 'relationship', id: edge.data.relationshipId as string });
          }}
        >
          <Background color="rgba(255,255,255,0.12)" gap={18} />
          <Controls />
          <Panel position="top-left">
            <div className="rounded-md border border-white/10 bg-black/70 px-3 py-2 text-xs text-white/80">
              {nodes.length} nodes / {edges.length} edges
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {pendingConnection ? (
        <EdgeEditorModal
          connection={pendingConnection}
          entities={entities}
          onClose={() => setPendingConnection(null)}
          onSave={async (payload) => {
            await createRelationship(payload);
            setPendingConnection(null);
            await refreshProjectData();
          }}
        />
      ) : null}
    </div>
  );
}

type SavedGraphState = {
  diagramMode?: DiagramMode;
  displayMode?: DisplayMode;
  centralEntityId?: string;
  entityScope?: string;
  organizationScope?: string;
  countryScope?: string;
  positions?: Record<string, Record<string, { x: number; y: number }>>;
  viewports?: Record<string, Viewport>;
};

function graphStateKey(projectId: string) {
  return `taosint:graph-state:${projectId || 'default'}`;
}

function loadGraphState(projectId: string): SavedGraphState {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(graphStateKey(projectId)) || '{}');
  } catch {
    return {};
  }
}

function saveGraphState(projectId: string, patch: SavedGraphState) {
  if (!projectId || typeof window === 'undefined') return;
  const current = loadGraphState(projectId);
  window.localStorage.setItem(graphStateKey(projectId), JSON.stringify({ ...current, ...patch }));
}

function persistGraphPosition(projectId: string, diagramMode: DiagramMode, nodeId: string, position: { x: number; y: number }) {
  if (!projectId) return;
  const current = loadGraphState(projectId);
  const positions = { ...(current.positions ?? {}) };
  positions[diagramMode] = { ...(positions[diagramMode] ?? {}), [nodeId]: position };
  saveGraphState(projectId, { positions });
}

function persistGraphViewport(projectId: string, diagramMode: DiagramMode, viewport: Viewport) {
  if (!projectId) return;
  const current = loadGraphState(projectId);
  const viewports = { ...(current.viewports ?? {}), [diagramMode]: viewport };
  saveGraphState(projectId, { viewports });
}

function EntityNode({ data }: NodeProps) {
  const entity = data.record as Entity | EventRecord | SourceRecord;
  const displayMode = data.displayMode as DisplayMode;
  const tone = data.tone || 'entity-custom';
  const sourceCount = 'sourceIds' in entity && Array.isArray(entity.sourceIds) ? entity.sourceIds.length : 0;
  const initials = 'name' in entity ? entity.name.slice(0, 2) : 'title' in entity ? entity.title.slice(0, 2) : 'TA';
  const title = 'name' in entity ? entity.name : 'title' in entity ? entity.title : 'Record';
  const imageFileId = 'imageFileId' in entity ? entity.imageFileId : '';
  const location =
    'details' in entity
      ? [entity.details?.city, entity.details?.region, entity.details?.country].filter(Boolean).join(', ') || entity.details?.lastKnownLocationName || 'No location'
      : 'locationId' in entity
        ? entity.locationId || 'No location'
        : '';
  const subtitle =
    'details' in entity
      ? entity.details?.roleTitle || entity.details?.city || entity.details?.orgType || entity.summary
      : 'eventType' in entity
        ? entity.eventType
        : 'sourceType' in entity
          ? entity.sourceType
          : '';

  return (
    <div className={clsx('ta-node rounded-md p-3', tone, displayMode)}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div className="grid gap-2">
        <div className="grid h-16 w-full place-items-center overflow-hidden rounded-md border border-white/10 bg-white/10 text-lg font-bold uppercase">
          {imageFileId ? <img src={`/api/files/${imageFileId}`} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold leading-tight">{title}</div>
          {displayMode !== 'compact' ? <div className="mt-1 line-clamp-1 text-xs text-white/60">{location}</div> : null}
          {displayMode !== 'compact' ? <div className="mt-1 line-clamp-2 text-xs text-white/50">{subtitle || data.kind}</div> : null}
        </div>
      </div>
      {displayMode !== 'compact' ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <ConfidenceBadge value={(entity as any).confidence as Confidence} />
          <SourceBadge count={sourceCount} />
        </div>
      ) : null}
      {displayMode === 'full' && 'summary' in entity ? <p className="mt-2 line-clamp-3 text-xs text-white/65">{entity.summary}</p> : null}
    </div>
  );
}

function StickyNode({ data }: NodeProps) {
  return (
    <div className={clsx('sticky-node rounded-md p-3', String(data.color ?? 'note'))}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className="mb-2 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[color:var(--c-accent)]" />
        <div className="text-sm font-semibold">{String(data.title || 'Sticky note')}</div>
      </div>
      <p className="text-xs leading-relaxed text-white/75">{String(data.body || '')}</p>
    </div>
  );
}

function EdgeEditorModal({
  connection,
  entities,
  onSave,
  onClose
}: {
  connection: Connection;
  entities: Entity[];
  onSave: (payload: Partial<Relationship>) => Promise<void>;
  onClose: () => void;
}): { nodes: Node[]; edges: Edge[] } {
  const [relationshipType, setRelationshipType] = useState('associate_of');
  const [confidence, setConfidence] = useState<Confidence>('unknown');
  const [status, setStatus] = useState('unknown');
  const [notes, setNotes] = useState('');
  const source = entities.find((entity) => entity.id === connection.source);
  const target = entities.find((entity) => entity.id === connection.target);

  return (
    <Modal
      title="Create Relationship"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<GitBranch size={16} />}
            onClick={() =>
              onSave({
                sourceEntityId: connection.source ?? '',
                targetEntityId: connection.target ?? '',
                relationshipType,
                confidence,
                status: status as Relationship['status'],
                direction: 'directed',
                notes
              })
            }
          >
            Create
          </Button>
        </div>
      }
    >
      <div className="mb-4 rounded-md border border-white/10 bg-black/20 p-3 text-sm">
        <span className="font-medium">{source?.name}</span>
        <span className="px-2 text-[color:var(--c-text-secondary)]">to</span>
        <span className="font-medium">{target?.name}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Relationship type">
          <Select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}>
            {relationshipTypes.map((type) => (
              <option key={type} value={type}>
                {formatRelationshipType(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Confidence">
          <Select value={confidence} onChange={(event) => setConfidence(event.target.value as Confidence)}>
            {confidenceValues.map((value) => (
              <option key={value} value={value}>
                {value || 'No confidence'}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            {['active', 'former', 'alleged', 'disputed', 'unknown'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </Field>
        <Field label="Notes">
          <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function buildGraphData({
  entities,
  relationships,
  events,
  sources,
  stickyNotes,
  diagramMode,
  displayMode,
  centralEntityId,
  entityScope,
  organizationScope,
  countryScope
}: {
  entities: Entity[];
  relationships: Relationship[];
  events: EventRecord[];
  sources: SourceRecord[];
  stickyNotes: any[];
  diagramMode: DiagramMode;
  displayMode: DisplayMode;
  centralEntityId: string;
  entityScope: string;
  organizationScope: string;
  countryScope: string;
}) {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const relationshipTouchesOrganization = (entityId: string) =>
    organizationScope === 'all' ||
    entityId === organizationScope ||
    relationships.some((relationship) => {
      if (relationship.sourceEntityId !== entityId && relationship.targetEntityId !== entityId) return false;
      return relationship.sourceEntityId === organizationScope || relationship.targetEntityId === organizationScope;
    }) ||
    events.some((event) => event.involvedOrganizationIds?.includes(organizationScope) && [...(event.involvedPersonIds ?? []), event.locationId].includes(entityId));

  const countryForEntity = (entity: Entity) => {
    if (entity.details?.country) return entity.details.country;
    if (entity.details?.lastKnownLocationId) return entityById.get(entity.details.lastKnownLocationId)?.details?.country ?? '';
    const locationRelationship = relationships.find(
      (relationship) =>
        relationship.sourceEntityId === entity.id &&
        ['located_in', 'last_seen_at', 'operates_in', 'traveled_to'].includes(relationship.relationshipType) &&
        entityById.get(relationship.targetEntityId)?.type === 'location'
    );
    return locationRelationship ? entityById.get(locationRelationship.targetEntityId)?.details?.country ?? '' : '';
  };

  const matchesScope = (entity: Entity) => {
    const typeMatch =
      entityScope === 'all' ||
      (entityScope === 'organization' && (entity.type === 'organization' || entity.type === 'sub-organization')) ||
      entity.type === entityScope;
    const orgMatch = relationshipTouchesOrganization(entity.id);
    const countryMatch = countryScope === 'all' || countryForEntity(entity) === countryScope || entity.name === countryScope;
    return typeMatch && orgMatch && countryMatch;
  };

  let scopedRelationships = relationships;
  if (diagramMode === 'freeform' && !centralEntityId && entityScope === 'all' && organizationScope === 'all' && countryScope === 'all') {
    const highSignal = relationships.filter((rel) => rel.confidence === 'high' || rel.confidence === 'medium' || rel.sourceIds?.length);
    scopedRelationships = (highSignal.length ? highSignal : relationships).slice(0, 180);
  }
  if (diagramMode === 'hierarchy') scopedRelationships = relationships.filter((rel) => hierarchyRelationshipTypes.has(rel.relationshipType));
  if (diagramMode === 'family') {
    scopedRelationships = relationships.filter((rel) => {
      const source = entityById.get(rel.sourceEntityId);
      const target = entityById.get(rel.targetEntityId);
      return familyRelationshipTypes.has(rel.relationshipType) && source?.type === 'person' && target?.type === 'person';
    });
  }
  if (diagramMode === 'organization') scopedRelationships = relationships.filter((rel) => organizationChartTypes.has(rel.relationshipType));
  if (diagramMode === 'location') scopedRelationships = relationships.filter((rel) => ['located_in', 'last_seen_at', 'operates_in', 'traveled_to'].includes(rel.relationshipType));
  if (diagramMode === 'spider' && centralEntityId) {
    scopedRelationships = relationships.filter((rel) => rel.sourceEntityId === centralEntityId || rel.targetEntityId === centralEntityId);
  } else if (centralEntityId) {
    scopedRelationships = scopedRelationships.filter((rel) => rel.sourceEntityId === centralEntityId || rel.targetEntityId === centralEntityId);
  }

  const relationshipScopedModes = new Set<DiagramMode>(['freeform', 'family', 'hierarchy', 'organization', 'location']);
  let visibleEntityIds =
    diagramMode === 'spider' && centralEntityId
      ? new Set([centralEntityId, ...scopedRelationships.flatMap((rel) => [rel.sourceEntityId, rel.targetEntityId])])
      : relationshipScopedModes.has(diagramMode)
        ? new Set(scopedRelationships.flatMap((rel) => [rel.sourceEntityId, rel.targetEntityId]))
        : new Set(entities.map((entity) => entity.id));

  if (diagramMode === 'freeform' && !centralEntityId && scopedRelationships.length === 0) {
    visibleEntityIds = new Set(entities.slice(0, 120).map((entity) => entity.id));
  }

  visibleEntityIds = new Set(
    Array.from(visibleEntityIds).filter((id) => {
      const entity = entityById.get(id);
      if (!entity) return false;
      if (diagramMode === 'family' && entity.type !== 'person') return false;
      return matchesScope(entity);
    })
  );

  scopedRelationships = scopedRelationships.filter((relationship) => visibleEntityIds.has(relationship.sourceEntityId) && visibleEntityIds.has(relationship.targetEntityId));

  const nodes: Node[] = entities
    .filter((entity) => visibleEntityIds.has(entity.id))
    .map((entity, index) => ({
      id: entity.id,
      type: 'entity',
      position: graphSeedPosition(index, diagramMode),
      data: {
        record: entity,
        displayMode,
        kind: entity.type,
        tone: entityTone[entity.type] ?? 'entity-custom',
        color: colorForEntity(entity),
        selectableKind: 'entity',
        selectableId: entity.id
      }
    }));

  if (diagramMode === 'event' || diagramMode === 'spider') {
    events.forEach((event, index) => {
      if (diagramMode === 'spider' && centralEntityId) {
        const touchesCentral =
          event.involvedPersonIds?.includes(centralEntityId) || event.involvedOrganizationIds?.includes(centralEntityId) || event.locationId === centralEntityId;
        if (!touchesCentral) return;
      }
      if (organizationScope !== 'all' && !event.involvedOrganizationIds?.includes(organizationScope)) return;
      if (countryScope !== 'all') {
        const eventLocation = event.locationId ? entityById.get(event.locationId) : undefined;
        if (eventLocation?.details?.country !== countryScope) return;
      }
      nodes.push({
        id: `event:${event.id}`,
        type: 'entity',
        position: { x: 160 + index * 280, y: 520 },
        data: {
          record: event,
          displayMode,
          kind: 'event',
          tone: 'entity-event',
          color: '#fb923c',
          selectableKind: 'event',
          selectableId: event.id
        }
      });
    });
  }

  if (diagramMode === 'source' || diagramMode === 'spider') {
    sources.forEach((source, index) => {
      const used =
        relationships.some((rel) => rel.sourceIds?.includes(source.id) && (diagramMode !== 'spider' || !centralEntityId || rel.sourceEntityId === centralEntityId || rel.targetEntityId === centralEntityId)) ||
        entities.some((entity) => entity.sourceIds?.includes(source.id) && (diagramMode !== 'spider' || !centralEntityId || entity.id === centralEntityId));
      if (!used) return;
      nodes.push({
        id: `source:${source.id}`,
        type: 'entity',
        position: { x: 80 + index * 260, y: 760 },
        data: {
          record: source,
          displayMode,
          kind: 'source',
          tone: 'entity-source',
          color: '#94a3b8',
          selectableKind: 'source',
          selectableId: source.id
        }
      });
    });
  }

  if (diagramMode === 'freeform') {
    stickyNotes.forEach((note) => {
      nodes.push({
        id: `sticky:${note.id}`,
        type: 'sticky',
        position: { x: note.x ?? 80, y: note.y ?? 80 },
        data: { ...note, selectableKind: 'sticky', selectableId: note.id }
      });
    });
  }

  const childToParentTypes = new Set(['child_of', 'son_of', 'daughter_of']);
  const edges: Edge[] = scopedRelationships.map((relationship) => {
    const invertFamilyEdge = diagramMode === 'family' && childToParentTypes.has(relationship.relationshipType);
    return {
      id: relationship.id,
      source: invertFamilyEdge ? relationship.targetEntityId : relationship.sourceEntityId,
      target: invertFamilyEdge ? relationship.sourceEntityId : relationship.targetEntityId,
      label: formatRelationshipType(relationship.relationshipType),
      markerEnd: relationship.direction === 'directed' ? { type: MarkerType.ArrowClosed } : undefined,
      animated: relationship.status === 'alleged' || relationship.confidence === 'low',
      style: {
        stroke: edgeColor(relationship.confidence),
        strokeDasharray: relationship.status === 'disputed' || relationship.confidence === 'contradicted' ? '6 4' : undefined
      },
      data: { relationshipId: relationship.id }
    };
  });

  if (diagramMode === 'event' || diagramMode === 'spider') {
    events.forEach((event) => {
      const eventNode = `event:${event.id}`;
      [...(event.involvedPersonIds ?? []), ...(event.involvedOrganizationIds ?? []), event.locationId].filter(Boolean).forEach((entityId) => {
        if (visibleEntityIds.has(entityId)) {
          edges.push({
            id: `${eventNode}-${entityId}`,
            source: eventNode,
            target: entityId,
            label: 'involves',
            style: { stroke: '#fb923c' }
          });
        }
      });
    });
  }

  if (diagramMode === 'source' || diagramMode === 'spider') {
    sources.forEach((source) => {
      entities
        .filter((entity) => entity.sourceIds?.includes(source.id) && visibleEntityIds.has(entity.id))
        .forEach((entity) => {
          edges.push({
            id: `source:${source.id}-${entity.id}`,
            source: `source:${source.id}`,
            target: entity.id,
            label: 'supports',
            style: { stroke: '#94a3b8' }
          });
        });
    });
  }

  const layoutedNodes = diagramMode === 'freeform' ? nodes : layoutNodes(nodes, edges, diagramMode, displayMode);
  return { nodes: layoutedNodes, edges };
}

function graphSeedPosition(index: number, diagramMode: DiagramMode) {
  if (diagramMode === 'hierarchy' || diagramMode === 'organization' || diagramMode === 'family') {
    return { x: 100 + (index % 6) * 320, y: 80 + Math.floor(index / 6) * 180 };
  }
  return { x: 90 + (index % 5) * 300, y: 70 + Math.floor(index / 5) * 210 };
}

function groupEntitiesForSelect(entities: Entity[]): Array<{ label: string; items: Entity[] }> {
  const groups = [
    { label: 'People', match: (entity: Entity) => entity.type === 'person' },
    { label: 'Organizations', match: (entity: Entity) => entity.type === 'organization' || entity.type === 'sub-organization' },
    { label: 'Locations', match: (entity: Entity) => entity.type === 'location' },
    { label: 'Events / Records', match: (entity: Entity) => entity.type === 'event' || entity.type === 'role' || entity.type === 'family-group' },
    { label: 'Files / Evidence', match: (entity: Entity) => entity.type === 'document' || entity.type === 'image' || entity.type === 'alias' },
    { label: 'Other', match: (entity: Entity) => ['account', 'vehicle', 'financial-entity', 'custom'].includes(entity.type) }
  ];
  return groups
    .map((group) => ({ label: group.label, items: entities.filter(group.match).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((group) => group.items.length);
}

function layoutNodes(nodes: Node[], edges: Edge[], diagramMode: DiagramMode, displayMode: DisplayMode) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'TB',
    ranksep: diagramMode === 'hierarchy' ? 150 : 118,
    nodesep: 70
  });
  nodes.forEach((node) => {
    if (node.type === 'sticky') return;
    graph.setNode(node.id, { width: displayMode === 'compact' ? 170 : 255, height: displayMode === 'full' ? 180 : 124 });
  });
  edges.forEach((edge) => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) graph.setEdge(edge.source, edge.target);
  });
  dagre.layout(graph);
  return nodes.map((node) => {
    if (node.type === 'sticky') return node;
    const point = graph.node(node.id);
    if (!point) return node;
    return { ...node, position: { x: point.x - 125, y: point.y - 62 } };
  });
}

function colorForEntity(entity: Entity) {
  if (entity.type === 'person') return '#60a5fa';
  if (entity.type === 'organization' || entity.type === 'sub-organization') return '#c084fc';
  if (entity.type === 'location') return '#4ade80';
  if (entity.type === 'event') return '#fb923c';
  if (entity.type === 'source') return '#94a3b8';
  return '#f87171';
}

function edgeColor(confidence: Confidence) {
  if (confidence === 'high') return '#86efac';
  if (confidence === 'medium') return '#93c5fd';
  if (confidence === 'low') return '#fde68a';
  if (confidence === 'contradicted') return '#f87171';
  return '#cbd5e1';
}
