import { useEffect, useState } from 'react';
import { Database, Download, Folder, Save, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { downloadUrl } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import { Button } from '../components/ui/Button';
import { Field, Select, TextInput, TextArea } from '../components/ui/Form';
import { SectionHeader } from '../components/ui/SectionHeader';

export function SettingsView() {
  const { activeProject, activeProjectId, updateProject } = useWorkspace();
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [safeExport, setSafeExport] = useState(() => ({
    hideNotes: localStorage.getItem('taosint.safe.hideNotes') !== 'false',
    hideExactCoordinates: localStorage.getItem('taosint.safe.hideExactCoordinates') !== 'false',
    hideLowConfidence: localStorage.getItem('taosint.safe.hideLowConfidence') === 'true',
    hideImages: localStorage.getItem('taosint.safe.hideImages') === 'true'
  }));

  useEffect(() => {
    if (!activeProject) return;
    setDraft({
      title: activeProject.title,
      description: activeProject.description,
      category: activeProject.category,
      status: activeProject.status,
      notes: activeProject.notes,
      mapLat: activeProject.defaultMapCenter?.lat ?? '',
      mapLng: activeProject.defaultMapCenter?.lng ?? '',
      mapLabel: activeProject.defaultMapCenter?.label ?? '',
      mapZoom: activeProject.defaultMapZoom ?? 5
    });
  }, [activeProject]);

  function saveSafeExport(next = safeExport) {
    localStorage.setItem('taosint.safe.hideNotes', String(next.hideNotes));
    localStorage.setItem('taosint.safe.hideExactCoordinates', String(next.hideExactCoordinates));
    localStorage.setItem('taosint.safe.hideLowConfidence', String(next.hideLowConfidence));
    localStorage.setItem('taosint.safe.hideImages', String(next.hideImages));
    setSafeExport(next);
  }

  if (!activeProject || !activeProjectId) return null;

  return (
    <div>
      <SectionHeader title="Settings" eyebrow="Local workspace" />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <section className="surface rounded-lg p-4">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <SlidersHorizontal size={18} />
            Project controls
          </h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              updateProject(activeProjectId, {
                title: draft.title,
                description: draft.description,
                category: draft.category,
                status: draft.status,
                notes: draft.notes,
                defaultMapCenter: {
                  lat: Number(draft.mapLat) || activeProject.defaultMapCenter?.lat || 0,
                  lng: Number(draft.mapLng) || activeProject.defaultMapCenter?.lng || 0,
                  label: draft.mapLabel
                },
                defaultMapZoom: Number(draft.mapZoom) || 5
              });
            }}
          >
            <Field label="Project title">
              <TextInput value={draft.title ?? ''} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={draft.status ?? 'active'} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="archived">archived</option>
                <option value="review">review</option>
              </Select>
            </Field>
            <Field label="Category">
              <TextInput value={draft.category ?? ''} onChange={(event) => setDraft({ ...draft, category: event.target.value })} />
            </Field>
            <Field label="Default map label">
              <TextInput value={draft.mapLabel ?? ''} onChange={(event) => setDraft({ ...draft, mapLabel: event.target.value })} />
            </Field>
            <Field label="Default map latitude">
              <TextInput value={draft.mapLat ?? ''} onChange={(event) => setDraft({ ...draft, mapLat: event.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Default map longitude">
              <TextInput value={draft.mapLng ?? ''} onChange={(event) => setDraft({ ...draft, mapLng: event.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Default map zoom">
              <TextInput value={draft.mapZoom ?? ''} onChange={(event) => setDraft({ ...draft, mapZoom: event.target.value })} inputMode="numeric" />
            </Field>
            <Field label="Description">
              <TextArea value={draft.description ?? ''} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            </Field>
            <Field label="Project notes">
              <TextArea value={draft.notes ?? ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </Field>
            <div className="flex items-end">
              <Button variant="primary" type="submit" icon={<Save size={16} />}>
                Save project settings
              </Button>
            </div>
          </form>
        </section>

        <aside className="grid content-start gap-4">
          <section className="surface rounded-lg p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <ShieldAlert size={18} />
              Public-safe defaults
            </h2>
            <div className="grid gap-2 text-sm">
              {[
                ['hideNotes', 'Hide analyst notes'],
                ['hideExactCoordinates', 'Hide exact coordinates'],
                ['hideLowConfidence', 'Hide low-confidence claims'],
                ['hideImages', 'Hide selected images']
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 p-3">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(safeExport[key as keyof typeof safeExport])}
                    onChange={(event) => saveSafeExport({ ...safeExport, [key]: event.target.checked })}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="surface rounded-lg p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Download size={18} />
              Project exports
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => downloadUrl(`/api/projects/${activeProjectId}/export/json`)}>JSON</Button>
              <Button onClick={() => downloadUrl(`/api/projects/${activeProjectId}/export/zip`)}>ZIP</Button>
              <Button onClick={() => downloadUrl(`/api/projects/${activeProjectId}/export/geojson`)}>GeoJSON</Button>
              <Button onClick={() => downloadUrl(`/api/projects/${activeProjectId}/export/graphml`)}>GraphML</Button>
            </div>
          </section>

          <section className="surface rounded-lg p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Folder size={18} />
              Storage
            </h2>
            <div className="grid gap-2 text-sm text-[color:var(--c-text-secondary)]">
              <div>Database: data/taosint.sqlite</div>
              <div>Images: media/images</div>
              <div>Documents: media/documents</div>
              <div>Exports: exports</div>
              <div>Backups: backups</div>
            </div>
          </section>

          <section className="surface rounded-lg p-4">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Database size={18} />
              Safety constraints
            </h2>
            <div className="grid gap-2 text-sm text-[color:var(--c-text-secondary)]">
              <div>No live tracking.</div>
              <div>No automated doxxing or private-account scraping.</div>
              <div>No automatic sensitive-data inference.</div>
              <div>Location precision labels are required for mapped claims.</div>
              <div>Unsourced and low-confidence material stays visibly marked.</div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
