import { useMemo, useRef, useState } from 'react';
import { Download, LocateFixed, MapPin, Ruler, Search } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { toCanvas, toJpeg, toPng } from 'html-to-image';
import { confidenceValues } from '../constants';
import { api, downloadBlob, downloadUrl, formatRelationshipType } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import type { Confidence, Entity, EventRecord } from '../types';
import { ConfidenceBadge, TypeBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select, TextInput } from '../components/ui/Form';
import { SectionHeader } from '../components/ui/SectionHeader';

type TileKey = 'osm' | 'cartoLight' | 'cartoDark' | 'topo' | 'blank';
type RouteMode = 'manual' | 'timeline' | 'visible';

const tiles: Record<TileKey, { label: string; url: string; attribution: string }> = {
  osm: { label: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors' },
  cartoLight: {
    label: 'CARTO light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  cartoDark: {
    label: 'CARTO dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  },
  topo: { label: 'OpenTopoMap', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenTopoMap contributors' },
  blank: { label: 'Blank analyst', url: '', attribution: '' }
};

const countryCenters: Record<string, { lat: number; lng: number }> = {
  Afghanistan: { lat: 33.9, lng: 67.7 },
  Algeria: { lat: 28, lng: 1.6 },
  Bangladesh: { lat: 23.7, lng: 90.3 },
  'Burkina Faso': { lat: 12.2, lng: -1.6 },
  Cameroon: { lat: 5.7, lng: 12.7 },
  Chad: { lat: 15.4, lng: 18.7 },
  Egypt: { lat: 26.8, lng: 30.8 },
  India: { lat: 22.8, lng: 78.9 },
  Indonesia: { lat: -2.4, lng: 117.2 },
  Iran: { lat: 32.4, lng: 53.7 },
  Iraq: { lat: 33.2, lng: 43.7 },
  Israel: { lat: 31, lng: 35 },
  Jordan: { lat: 31.2, lng: 36.6 },
  Kenya: { lat: 0.1, lng: 37.9 },
  Lebanon: { lat: 33.9, lng: 35.8 },
  Libya: { lat: 26.3, lng: 17.2 },
  Mali: { lat: 17.5, lng: -3.9 },
  Malaysia: { lat: 4.2, lng: 101.9 },
  Mauritania: { lat: 20.2, lng: -10.3 },
  Morocco: { lat: 31.8, lng: -7.1 },
  Myanmar: { lat: 21.9, lng: 95.9 },
  Niger: { lat: 17.6, lng: 8.1 },
  Nigeria: { lat: 9.1, lng: 8.7 },
  Oman: { lat: 21.5, lng: 55.9 },
  Pakistan: { lat: 30.4, lng: 69.3 },
  Philippines: { lat: 12.9, lng: 122.8 },
  'Saudi Arabia': { lat: 23.9, lng: 45.1 },
  Somalia: { lat: 5.1, lng: 46.2 },
  Syria: { lat: 35, lng: 38.5 },
  Tajikistan: { lat: 38.9, lng: 71 },
  Thailand: { lat: 15.8, lng: 101 },
  Tunisia: { lat: 34, lng: 9.5 },
  Turkey: { lat: 39, lng: 35 },
  Turkmenistan: { lat: 38.9, lng: 59.5 },
  Uzbekistan: { lat: 41.4, lng: 64.6 },
  'Western Sahara': { lat: 24.2, lng: -12.9 },
  Yemen: { lat: 15.5, lng: 47.5 }
};

function isMapMarker(marker: MapMarker | null | undefined): marker is MapMarker {
  return Boolean(marker);
}

export function MapView() {
  const { activeProject, activeProjectId, entities, relationships, events, mapDraft, startMapDraft, selectItem } = useWorkspace();
  const [tileKey, setTileKey] = useState<TileKey>('cartoDark');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [organizationFilter, setOrganizationFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<any[]>([]);
  const [measureMode, setMeasureMode] = useState(false);
  const [routeMode, setRouteMode] = useState<RouteMode>('manual');
  const [measurePoints, setMeasurePoints] = useState<Array<{ lat: number; lng: number; label?: string }>>([]);
  const mapRef = useRef<HTMLDivElement>(null);

  const center = activeProject?.defaultMapCenter ?? { lat: 30.1798, lng: 66.975 };
  const organizations = entities.filter((entity) => entity.type === 'organization' || entity.type === 'sub-organization');
  const people = entities.filter((entity) => entity.type === 'person');
  const entityById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);
  const locationById = useMemo(() => new Map(entities.filter((entity) => entity.type === 'location').map((entity) => [entity.id, entity])), [entities]);

  const markers = useMemo(() => {
    const entityMarkers = entities
      .flatMap((entity) => markerFromEntity(entity, entityById, locationById, relationships, events))
      .filter(isMapMarker)
      .filter((marker) => confidenceFilter === 'all' || marker.confidence === confidenceFilter)
      .filter((marker) => countryFilter === 'all' || marker.country === countryFilter)
      .filter((marker) => personFilter === 'all' || marker.id === personFilter || marker.relatedPersonIds.includes(personFilter))
      .filter((marker) => organizationFilter === 'all' || marker.id === organizationFilter || marker.relatedOrganizationIds.includes(organizationFilter));

    const eventMarkers = events
      .map((event) => markerFromEvent(event, locationById))
      .filter(isMapMarker)
      .filter((marker) => confidenceFilter === 'all' || marker.confidence === confidenceFilter)
      .filter((marker) => countryFilter === 'all' || marker.country === countryFilter)
      .filter((marker) => personFilter === 'all' || marker.relatedPersonIds.includes(personFilter))
      .filter((marker) => organizationFilter === 'all' || marker.relatedOrganizationIds.includes(organizationFilter));

    return [...entityMarkers, ...eventMarkers] as MapMarker[];
  }, [confidenceFilter, countryFilter, entities, entityById, events, locationById, organizationFilter, personFilter, relationships]);

  const countries = useMemo(
    () => Array.from(new Set(markers.map((marker) => marker.country).filter(Boolean))).sort(),
    [markers]
  );

  const countryHighlights = useMemo(() => {
    const countryNames = countryFilter === 'all' ? countries : [countryFilter];
    return countryNames.map((country) => ({ country, center: countryCenters[country] })).filter((item) => item.center);
  }, [countries, countryFilter]);

  const timelineRoute = useMemo(
    () =>
      events
        .map((event) => markerFromEvent(event, locationById))
        .filter(isMapMarker)
        .filter((marker) => countryFilter === 'all' || marker.country === countryFilter)
        .filter((marker) => personFilter === 'all' || marker.relatedPersonIds.includes(personFilter))
        .filter((marker) => organizationFilter === 'all' || marker.relatedOrganizationIds.includes(organizationFilter))
        .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
        .map((marker) => ({ lat: marker.lat, lng: marker.lng, label: marker.title })),
    [countryFilter, events, locationById, organizationFilter, personFilter]
  );

  const routePoints =
    routeMode === 'timeline'
      ? timelineRoute
      : routeMode === 'visible'
        ? markers.map((marker) => ({ lat: marker.lat, lng: marker.lng, label: marker.title }))
        : measurePoints;
  const routeDistanceKm = routePoints.length >= 2 ? routeDistance(routePoints).toFixed(2) : '';

  async function searchPlace() {
    if (!geocodeQuery.trim()) return;
    const result = await api<{ results: any[] }>('/api/geocode/search', { method: 'POST', body: JSON.stringify({ query: geocodeQuery }) });
    setGeocodeResults(result.results);
  }

  async function exportMapImage(format: 'png' | 'jpg' | 'webp') {
    const target = mapRef.current;
    if (!target) return;
    const options = { cacheBust: true, pixelRatio: 2, backgroundColor: '#181818', filter: (node: HTMLElement) => !node.classList?.contains('map-tool-panel') };
    if (format === 'webp') {
      const canvas = await toCanvas(target, options);
      canvas.toBlob((blob) => blob && downloadBlob(blob, 'taosint-map.webp'), 'image/webp', 0.96);
      return;
    }
    const dataUrl = format === 'png' ? await toPng(target, options) : await toJpeg(target, { ...options, quality: 0.96 });
    const blob = await (await fetch(dataUrl)).blob();
    downloadBlob(blob, `taosint-map.${format}`);
  }

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[620px] flex-col">
      <SectionHeader
        title="Map Board"
        eyebrow="Locations"
        actions={
          <>
            <Button icon={<MapPin size={16} />} onClick={() => startMapDraft({ lat: center.lat, lng: center.lng })}>
              Add pin
            </Button>
            <Button icon={<Ruler size={16} />} variant={measureMode ? 'primary' : 'secondary'} onClick={() => setMeasureMode((value) => !value)}>
              Measure
            </Button>
            <Button icon={<Download size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/geojson`)}>
              GeoJSON
            </Button>
            <Button icon={<Download size={16} />} onClick={() => exportMapImage('webp')}>
              WebP
            </Button>
            <Button icon={<Download size={16} />} onClick={() => exportMapImage('png')}>
              PNG
            </Button>
            <Button icon={<Download size={16} />} onClick={() => exportMapImage('jpg')}>
              JPG
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select className="h-10 w-40" value={tileKey} onChange={(event) => setTileKey(event.target.value as TileKey)} aria-label="Map layer">
          {Object.entries(tiles).map(([key, tile]) => (
            <option key={key} value={key}>
              {tile.label}
            </option>
          ))}
        </Select>
        <Select className="h-10 w-40" value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)} aria-label="Confidence filter">
          <option value="all">All confidence</option>
          {confidenceValues.map((value) => (
            <option key={value} value={value}>
              {value || 'No confidence'}
            </option>
          ))}
        </Select>
        <Select className="h-10 w-56" value={organizationFilter} onChange={(event) => setOrganizationFilter(event.target.value)} aria-label="Organization filter">
          <option value="all">All organizations</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </Select>
        <Select className="h-10 w-52" value={personFilter} onChange={(event) => setPersonFilter(event.target.value)} aria-label="Individual filter">
          <option value="all">All individuals</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
        <Select className="h-10 w-44" value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)} aria-label="Country focus">
          <option value="all">All countries</option>
          {countries.map((country) => (
            <option key={country}>{country}</option>
          ))}
        </Select>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
          <TextInput
            className="w-full pl-9"
            value={geocodeQuery}
            onChange={(event) => setGeocodeQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && searchPlace()}
            placeholder="Search place name"
          />
        </div>
        <Button className="h-10 px-3" icon={<LocateFixed size={16} />} onClick={searchPlace}>
          Search
        </Button>
      </div>

      {measureMode ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-black/20 p-3 text-sm">
          <span className="font-medium">Route:</span>
          <Select className="w-44" value={routeMode} onChange={(event) => setRouteMode(event.target.value as RouteMode)}>
            <option value="manual">Manual clicks</option>
            <option value="timeline">Timeline events</option>
            <option value="visible">Visible markers</option>
          </Select>
          <span>{routeDistanceKm ? `${routeDistanceKm} km across ${routePoints.length} points` : 'Click points to draw a red route line.'}</span>
          <Button variant="ghost" onClick={() => setMeasurePoints([])}>
            Clear
          </Button>
          {routePoints.length ? (
            <div className="basis-full overflow-x-auto pt-2 text-xs text-[color:var(--c-text-secondary)] subtle-scroll">
              <div className="flex min-w-max gap-2">
                {routePoints.slice(0, 12).map((point, index) => (
                  <span key={`${point.lat}-${point.lng}-${index}`} className="rounded-md border border-white/10 bg-black/20 px-2 py-1">
                    {index + 1}. {point.label ?? `${point.lat.toFixed(2)}, ${point.lng.toFixed(2)}`}
                  </span>
                ))}
                {routePoints.length > 12 ? <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1">+{routePoints.length - 12} more</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {geocodeResults.length ? (
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          {geocodeResults.slice(0, 3).map((result) => (
            <button
              key={result.placeId}
              className="rounded-md border border-white/10 bg-black/20 p-3 text-left text-sm hover:bg-white/[0.06]"
              onClick={() => startMapDraft({ lat: result.latitude, lng: result.longitude })}
            >
              <div className="font-medium">{result.resolvedName}</div>
              <div className="mt-1 text-xs text-[color:var(--c-text-secondary)]">
                {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)} / {result.precisionLevel}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div ref={mapRef} className="surface relative min-h-0 flex-1 overflow-hidden rounded-lg">
        <MapContainer center={[center.lat, center.lng]} zoom={activeProject?.defaultMapZoom ?? 5} className="h-full" scrollWheelZoom>
          {tileKey !== 'blank' ? <TileLayer attribution={tiles[tileKey].attribution} url={tiles[tileKey].url} /> : null}
          <MapEvents
            measureMode={measureMode && routeMode === 'manual'}
            onMeasure={(point) => setMeasurePoints((current) => [...current, point])}
            onManualPin={(point) => startMapDraft(point)}
          />
          {routePoints.length >= 2 ? (
            <Polyline positions={routePoints.map((point) => [point.lat, point.lng])} pathOptions={{ color: '#d62827', weight: 3, opacity: 0.92 }} />
          ) : null}
          {routePoints.map((point, index) => (
            <CircleMarker
              key={`${point.lat}-${point.lng}-${index}`}
              center={[point.lat, point.lng]}
              radius={6}
              pathOptions={{ color: '#fff', fillColor: '#d62827', fillOpacity: 1, weight: 2 }}
            >
              <Tooltip permanent direction="top" offset={[0, -7]}>
                {index + 1}
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <strong>{index + 1}. {point.label ?? 'Route point'}</strong>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {countryHighlights.map((item) => (
            <Marker key={`country-label-${item.country}`} position={[item.center.lat, item.center.lng]} icon={countryLabelIcon(item.country)} interactive={false} zIndexOffset={-300} />
          ))}
          {markers.map((marker) => (
            <Marker
              key={`${marker.kind}-${marker.id}`}
              position={[marker.lat, marker.lng]}
              icon={markerIcon(marker.label, marker.confidence)}
              eventHandlers={{
                click: () => selectItem({ kind: marker.kind === 'entity' ? 'entity' : 'event', id: marker.id } as any)
              }}
            >
              <Popup>
                <div className="grid gap-2 text-sm">
                  <strong>{marker.title}</strong>
                  <span>{marker.precision}</span>
                  <span>{marker.confidence}</span>
                </div>
              </Popup>
            </Marker>
          ))}
          {mapDraft ? <Marker position={[mapDraft.lat, mapDraft.lng]} icon={markerIcon('+', 'medium')} /> : null}
        </MapContainer>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {markers.slice(0, 6).map((marker) => (
          <button
            key={`list-${marker.kind}-${marker.id}`}
            className="rounded-md border border-white/10 bg-black/20 p-3 text-left text-sm hover:bg-white/[0.06]"
            onClick={() => selectItem({ kind: marker.kind === 'entity' ? 'entity' : 'event', id: marker.id } as any)}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{marker.title}</span>
              <TypeBadge value={marker.type} />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <ConfidenceBadge value={marker.confidence} />
              <span className="badge">{marker.precision}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

interface MapMarker {
  id: string;
  kind: 'entity' | 'event';
  title: string;
  type: string;
  label: string;
  confidence: Confidence;
  precision: string;
  lat: number;
  lng: number;
  country: string;
  relatedOrganizationIds: string[];
  relatedPersonIds: string[];
  date?: string;
}

function markerFromEntity(entity: Entity, entityById: Map<string, Entity>, locationById: Map<string, Entity>, relationships: any[], events: EventRecord[]): MapMarker[] {
  const points: MapMarker[] = [];

  const relatedOrganizationIds = new Set<string>();
  const relatedPersonIds = new Set<string>();
  if (entity.type === 'person') relatedPersonIds.add(entity.id);
  if (entity.type === 'organization' || entity.type === 'sub-organization') relatedOrganizationIds.add(entity.id);
  if (entity.details?.organizationId) relatedOrganizationIds.add(entity.details.organizationId);
  relationships.forEach((relationship) => {
    if (relationship.sourceEntityId !== entity.id && relationship.targetEntityId !== entity.id) return;
    const linkedId = relationship.sourceEntityId === entity.id ? relationship.targetEntityId : relationship.sourceEntityId;
    const linked = entityById.get(linkedId);
    if (!linked) return;
    if (linked.type === 'person') relatedPersonIds.add(linkedId);
    if (linked.type === 'organization' || linked.type === 'sub-organization') relatedOrganizationIds.add(linkedId);
  });
  events.forEach((event) => {
    const eventTouchesLocation = event.locationId === entity.id;
    const eventTouchesEntity = event.involvedPersonIds?.includes(entity.id) || event.involvedOrganizationIds?.includes(entity.id);
    if (eventTouchesLocation || eventTouchesEntity) {
      event.involvedPersonIds?.forEach((id) => relatedPersonIds.add(id));
      event.involvedOrganizationIds?.forEach((id) => relatedOrganizationIds.add(id));
    }
  });

  const locationCandidates = collectEntityLocations(entity, entityById, locationById, relationships);
  locationCandidates.forEach((candidate, index) => {
    points.push({
      id: index === 0 ? entity.id : `${entity.id}:${candidate.id ?? index}`,
      kind: 'entity',
      title: candidate.label ? `${entity.name} / ${candidate.label}` : entity.name,
      type: entity.type,
      label: labelForEntity(entity),
      confidence: entity.confidence,
      precision: candidate.precision,
      lat: candidate.lat,
      lng: candidate.lng,
      country: candidate.country,
      relatedOrganizationIds: Array.from(relatedOrganizationIds),
      relatedPersonIds: Array.from(relatedPersonIds)
    });
  });
  return points;
}

function collectEntityLocations(entity: Entity, entityById: Map<string, Entity>, locationById: Map<string, Entity>, relationships: any[]) {
  const locations = new Map<string, { id?: string; label?: string; lat: number; lng: number; country: string; precision: string }>();
  const addPoint = (key: string, value: { id?: string; label?: string; lat: number; lng: number; country?: string; precision?: string }) => {
    if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) return;
    locations.set(key, {
      ...value,
      country: value.country ?? '',
      precision: value.precision ?? 'Unknown'
    });
  };
  const addLocationEntity = (locationId?: string, label?: string) => {
    if (!locationId) return;
    const location = locationById.get(locationId) ?? entityById.get(locationId);
    if (!location) return;
    addPoint(locationId, {
      id: location.id,
      label: label ?? location.name,
      lat: Number(location.details?.latitude),
      lng: Number(location.details?.longitude),
      country: location.details?.country,
      precision: location.details?.precisionLevel
    });
  };
  const addCountryFallback = (country?: string, label?: string) => {
    if (!country) return;
    const center = countryCenters[country];
    if (!center) return;
    addPoint(`${entity.id}:country:${country}`, {
      id: entity.id,
      label: label ?? country,
      lat: center.lat,
      lng: center.lng,
      country,
      precision: 'Country-level'
    });
  };

  addPoint(`${entity.id}:direct`, {
    id: entity.id,
    label: entity.details?.city || entity.details?.country || 'direct coordinate',
    lat: Number(entity.details?.latitude),
    lng: Number(entity.details?.longitude),
    country: entity.details?.country,
    precision: entity.details?.precisionLevel
  });
  addCountryFallback(entity.details?.country, entity.details?.city ? `${entity.details.city}, ${entity.details.country}` : entity.details?.country);

  addLocationEntity(entity.details?.lastKnownLocationId, 'last known');
  addLocationEntity(entity.details?.headquartersLocationId, 'headquarters');
  for (const locationId of [...(entity.details?.knownLocations ?? []), ...(entity.details?.operatingLocations ?? [])]) {
    addLocationEntity(locationId);
  }
  relationships.forEach((relationship) => {
    const locationTypes = ['located_in', 'last_seen_at', 'operates_in', 'traveled_to'];
    if (!locationTypes.includes(relationship.relationshipType)) return;
    if (relationship.sourceEntityId === entity.id) addLocationEntity(relationship.targetEntityId, formatRelationshipType(relationship.relationshipType));
    if (relationship.targetEntityId === entity.id) addLocationEntity(relationship.sourceEntityId, formatRelationshipType(relationship.relationshipType));
  });

  return Array.from(locations.values());
}

function markerFromEvent(event: EventRecord, locationById: Map<string, Entity>): MapMarker | null {
  const directLat = Number(event.latitude);
  const directLng = Number(event.longitude);
  const linkedLocation = event.locationId ? locationById.get(event.locationId) : undefined;
  const linkedLat = Number(linkedLocation?.details?.latitude);
  const linkedLng = Number(linkedLocation?.details?.longitude);
  const lat = Number.isFinite(directLat) ? directLat : linkedLat;
  const lng = Number.isFinite(directLng) ? directLng : linkedLng;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: event.id,
    kind: 'event',
    title: event.title,
    type: event.eventType,
    label: 'E',
    confidence: event.confidence,
    precision: linkedLocation?.details?.precisionLevel ?? 'Event coordinate',
    lat,
    lng,
    country: linkedLocation?.details?.country ?? '',
    relatedOrganizationIds: event.involvedOrganizationIds ?? [],
    relatedPersonIds: event.involvedPersonIds ?? [],
    date: event.dateStart
  };
}

function MapEvents({
  measureMode,
  onMeasure,
  onManualPin
}: {
  measureMode: boolean;
  onMeasure: (point: { lat: number; lng: number }) => void;
  onManualPin: (point: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(event) {
      const point = { lat: event.latlng.lat, lng: event.latlng.lng };
      if (measureMode) onMeasure(point);
      else onManualPin(point);
    }
  });
  return null;
}

function labelForEntity(entity: Entity) {
  if (entity.tags?.includes('map-note')) return 'N';
  if (entity.type === 'person') return 'P';
  if (entity.type === 'organization' || entity.type === 'sub-organization') return 'O';
  return 'L';
}

function markerIcon(label: string, confidence: Confidence) {
  const color =
    confidence === 'high'
      ? '#22c55e'
      : confidence === 'medium'
        ? '#3b82f6'
        : confidence === 'low'
          ? '#eab308'
          : confidence === 'contradicted'
            ? '#d62827'
            : '#94a3b8';
  return L.divIcon({
    className: '',
    html: `<div class="map-marker" style="background:${color}">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function countryLabelIcon(label: string) {
  return L.divIcon({
    className: '',
    html: `<div class="country-map-label">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

function routeDistance(points: Array<{ lat: number; lng: number }>) {
  return points.slice(1).reduce((sum, point, index) => sum + haversineKm(points[index], point), 0);
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return earthKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
