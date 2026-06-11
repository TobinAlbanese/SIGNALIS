import { useMemo, useRef, useState } from 'react';
import { CircleDot, Download, LocateFixed, MapPin, Plus, Ruler, Search } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { toJpeg, toPng } from 'html-to-image';
import { confidenceValues, precisionLevels } from '../constants';
import { api, downloadBlob, downloadUrl } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import type { Confidence, Entity } from '../types';
import { ConfidenceBadge, TypeBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Field, Select, TextArea, TextInput } from '../components/ui/Form';
import { Modal } from '../components/ui/Modal';
import { SectionHeader } from '../components/ui/SectionHeader';

type TileKey = 'osm' | 'cartoLight' | 'cartoDark' | 'topo' | 'blank';

const tiles: Record<TileKey, { label: string; url: string; attribution: string }> = {
  osm: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
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
  topo: {
    label: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap contributors'
  },
  blank: {
    label: 'Blank analyst',
    url: '',
    attribution: ''
  }
};

export function MapView() {
  const { activeProject, activeProjectId, entities, events, createEntity, selectItem } = useWorkspace();
  const [tileKey, setTileKey] = useState<TileKey>('cartoDark');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [manualPin, setManualPin] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeQuery, setGeocodeQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<any[]>([]);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const mapRef = useRef<HTMLDivElement>(null);

  const center = activeProject?.defaultMapCenter ?? { lat: 30.1798, lng: 66.975 };

  const markers = useMemo(() => {
    const locationMarkers = entities
      .filter((entity) => entity.type === 'location')
      .filter((entity) => confidenceFilter === 'all' || entity.confidence === confidenceFilter)
      .filter((entity) => typeFilter === 'all' || entity.type === typeFilter)
      .map((entity) => {
        const lat = Number(entity.details?.latitude);
        const lng = Number(entity.details?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          id: entity.id,
          kind: 'entity' as const,
          title: entity.name,
          type: entity.type,
          confidence: entity.confidence,
          precision: entity.details?.precisionLevel ?? 'Unknown',
          lat,
          lng,
          record: entity
        };
      })
      .filter(Boolean);

    const eventMarkers = events
      .filter((event) => confidenceFilter === 'all' || event.confidence === confidenceFilter)
      .map((event) => {
        const lat = Number(event.latitude);
        const lng = Number(event.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          id: event.id,
          kind: 'event' as const,
          title: event.title,
          type: event.eventType,
          confidence: event.confidence,
          precision: 'Event coordinate',
          lat,
          lng,
          record: event
        };
      })
      .filter(Boolean);

    return [...locationMarkers, ...eventMarkers] as Array<{
      id: string;
      kind: 'entity' | 'event';
      title: string;
      type: string;
      confidence: Confidence;
      precision: string;
      lat: number;
      lng: number;
      record: any;
    }>;
  }, [confidenceFilter, entities, events, typeFilter]);

  async function searchPlace() {
    if (!geocodeQuery.trim()) return;
    const result = await api<{ results: any[] }>('/api/geocode/search', { method: 'POST', body: JSON.stringify({ query: geocodeQuery }) });
    setGeocodeResults(result.results);
  }

  async function exportMapImage(format: 'png' | 'jpg') {
    const target = mapRef.current;
    if (!target) return;
    const options = { cacheBust: true, pixelRatio: 2, backgroundColor: '#181818' };
    const dataUrl = format === 'png' ? await toPng(target, options) : await toJpeg(target, { ...options, quality: 0.96 });
    const blob = await (await fetch(dataUrl)).blob();
    downloadBlob(blob, `taosint-map.${format}`);
  }

  const distanceKm = measurePoints.length >= 2 ? haversineKm(measurePoints[0], measurePoints[1]).toFixed(2) : '';

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[620px] flex-col">
      <SectionHeader
        title="Map Board"
        eyebrow="Locations"
        actions={
          <>
            <Button icon={<Ruler size={16} />} variant={measureMode ? 'primary' : 'secondary'} onClick={() => setMeasureMode((value) => !value)}>
              Measure
            </Button>
            <Button icon={<Download size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/geojson`)}>
              GeoJSON
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

      <div className="mb-3 grid gap-2 xl:grid-cols-[180px_180px_1fr_auto]">
        <Select value={tileKey} onChange={(event) => setTileKey(event.target.value as TileKey)} aria-label="Map layer">
          {Object.entries(tiles).map(([key, tile]) => (
            <option key={key} value={key}>
              {tile.label}
            </option>
          ))}
        </Select>
        <Select value={confidenceFilter} onChange={(event) => setConfidenceFilter(event.target.value)} aria-label="Confidence filter">
          <option value="all">All confidence</option>
          {confidenceValues.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </Select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
          <TextInput
            className="w-full pl-9"
            value={geocodeQuery}
            onChange={(event) => setGeocodeQuery(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && searchPlace()}
            placeholder="Search place name"
          />
        </div>
        <Button icon={<LocateFixed size={16} />} onClick={searchPlace}>
          Search
        </Button>
      </div>

      {geocodeResults.length ? (
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          {geocodeResults.slice(0, 3).map((result) => (
            <button
              key={result.placeId}
              className="rounded-md border border-white/10 bg-black/20 p-3 text-left text-sm hover:bg-white/[0.06]"
              onClick={() => setManualPin({ lat: result.latitude, lng: result.longitude })}
            >
              <div className="font-medium">{result.resolvedName}</div>
              <div className="mt-1 text-xs text-[color:var(--c-text-secondary)]">
                {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)} / {result.precisionLevel}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {measureMode ? (
        <div className="mb-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm">
          <span className="font-medium">Measurement:</span>{' '}
          {distanceKm ? `${distanceKm} km` : 'Click two points on the map.'}
          <Button className="ml-3" variant="ghost" onClick={() => setMeasurePoints([])}>
            Clear
          </Button>
        </div>
      ) : null}

      <div ref={mapRef} className="surface min-h-0 flex-1 overflow-hidden rounded-lg">
        <MapContainer center={[center.lat, center.lng]} zoom={activeProject?.defaultMapZoom ?? 5} className="h-full" scrollWheelZoom>
          {tileKey !== 'blank' ? <TileLayer attribution={tiles[tileKey].attribution} url={tiles[tileKey].url} /> : null}
          <MapEvents
            measureMode={measureMode}
            onMeasure={(point) => setMeasurePoints((current) => [...current.slice(-1), point])}
            onManualPin={(point) => !measureMode && setManualPin(point)}
          />
          {markers.map((marker) => (
            <Marker
              key={`${marker.kind}-${marker.id}`}
              position={[marker.lat, marker.lng]}
              icon={markerIcon(marker.kind === 'event' ? 'E' : 'L', marker.confidence)}
              eventHandlers={{
                click: () => selectItem({ kind: marker.kind, id: marker.id } as any)
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
          {manualPin ? <Marker position={[manualPin.lat, manualPin.lng]} icon={markerIcon('+', 'medium')} /> : null}
        </MapContainer>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {markers.slice(0, 6).map((marker) => (
          <button
            key={`list-${marker.kind}-${marker.id}`}
            className="rounded-md border border-white/10 bg-black/20 p-3 text-left text-sm hover:bg-white/[0.06]"
            onClick={() => selectItem({ kind: marker.kind, id: marker.id } as any)}
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

      {manualPin ? (
        <ManualPinModal
          point={manualPin}
          onClose={() => setManualPin(null)}
          onSave={async (payload) => {
            await createEntity({ ...payload, type: 'location' });
            setManualPin(null);
          }}
        />
      ) : null}
    </div>
  );
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

function ManualPinModal({
  point,
  onClose,
  onSave
}: {
  point: { lat: number; lng: number };
  onClose: () => void;
  onSave: (payload: Partial<Entity>) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    name: '',
    precisionLevel: 'Unknown',
    confidence: 'unknown',
    notes: '',
    city: '',
    region: '',
    country: ''
  });

  return (
    <Modal
      title="Add Location Pin"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() =>
              onSave({
                name: draft.name || `Location ${point.lat.toFixed(3)}, ${point.lng.toFixed(3)}`,
                confidence: draft.confidence as Confidence,
                summary: draft.notes,
                notes: draft.notes,
                details: {
                  latitude: point.lat,
                  longitude: point.lng,
                  precisionLevel: draft.precisionLevel,
                  city: draft.city,
                  region: draft.region,
                  country: draft.country,
                  geocodeSource: 'Manual pin'
                }
              })
            }
          >
            Save pin
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-yellow-400/25 bg-yellow-400/10 p-3 text-sm text-yellow-100 md:col-span-2">
          Manual coordinates need a precision label. Use city, province, or country-level when the source is vague.
        </div>
        <Field label="Name">
          <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} autoFocus />
        </Field>
        <Field label="Confidence">
          <Select value={draft.confidence} onChange={(event) => setDraft({ ...draft, confidence: event.target.value })}>
            {confidenceValues.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </Field>
        <Field label="Latitude">
          <TextInput value={point.lat.toFixed(6)} readOnly />
        </Field>
        <Field label="Longitude">
          <TextInput value={point.lng.toFixed(6)} readOnly />
        </Field>
        <Field label="Precision">
          <Select value={draft.precisionLevel} onChange={(event) => setDraft({ ...draft, precisionLevel: event.target.value })}>
            {precisionLevels.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </Select>
        </Field>
        <Field label="City">
          <TextInput value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
        </Field>
        <Field label="Region">
          <TextInput value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })} />
        </Field>
        <Field label="Country">
          <TextInput value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })} />
        </Field>
        <Field label="Notes">
          <TextArea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function markerIcon(label: string, confidence: Confidence) {
  const color = confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#3b82f6' : confidence === 'low' ? '#eab308' : confidence === 'contradicted' ? '#d62827' : '#94a3b8';
  return L.divIcon({
    className: '',
    html: `<div class="map-marker" style="background:${color}">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
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
