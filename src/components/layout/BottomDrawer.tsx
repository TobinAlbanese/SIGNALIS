import { ChevronUp, FileDown, NotebookTabs } from 'lucide-react';
import { useState } from 'react';
import { downloadUrl } from '../../lib/api';
import { useWorkspace } from '../../store/useWorkspace';
import { Button } from '../ui/Button';

export function BottomDrawer() {
  const [open, setOpen] = useState(false);
  const { activeProjectId, notes, sources, events } = useWorkspace();
  const recent = [...notes.slice(0, 2), ...sources.slice(0, 2)];

  return (
    <footer className="panel border-t">
      <button
        className="flex h-11 w-full items-center justify-between px-4 text-left text-sm text-[color:var(--c-text-secondary)]"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <NotebookTabs size={16} />
          Drawer
          <span className="badge">{notes.length} notes</span>
          <span className="badge">{events.length} timeline items</span>
          <span className="badge">{sources.length} sources</span>
        </span>
        <ChevronUp className={open ? '' : 'rotate-180'} size={16} />
      </button>
      {open ? (
        <div className="grid gap-3 border-t border-white/10 p-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {recent.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 bg-black/20 p-3">
                <div className="line-clamp-1 text-sm font-medium">{'title' in item ? item.title : 'Record'}</div>
                <div className="mt-1 line-clamp-2 text-xs text-[color:var(--c-text-secondary)]">
                  {'body' in item ? item.body : item.notes || item.url}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button icon={<FileDown size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/json`)}>
              JSON
            </Button>
            <Button icon={<FileDown size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/geojson`)}>
              GeoJSON
            </Button>
            <Button icon={<FileDown size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/markdown`)}>
              Markdown
            </Button>
          </div>
        </div>
      ) : null}
    </footer>
  );
}
