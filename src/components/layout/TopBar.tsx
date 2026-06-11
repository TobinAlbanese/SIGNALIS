import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Download, FileUp, Plus, Search, Settings, SlidersHorizontal, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../store/useWorkspace';
import { Button } from '../ui/Button';

export function TopBar({
  onQuickAdd,
  onExport,
  onImport,
  importing
}: {
  onQuickAdd: () => void;
  onExport: () => void;
  onImport: (file?: File) => void;
  importing: boolean;
}) {
  const navigate = useNavigate();
  const { projects, activeProjectId, setActiveProject, search, clearSearch, searchResults, selectItem } = useWorkspace();
  const [query, setQuery] = useState('');
  const timeout = useRef<number>();

  useEffect(() => {
    window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => {
      if (query.trim()) search(query);
      else clearSearch();
    }, 180);
    return () => window.clearTimeout(timeout.current);
  }, [query, search, clearSearch]);

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    onImport(event.target.files?.[0]);
    event.target.value = '';
  }

  const groupedCount = searchResults
    ? Object.values(searchResults.groups).reduce((total, group) => total + group.length, 0)
    : 0;

  return (
    <header className="panel z-20 flex items-center gap-3 border-b px-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[color:var(--c-accent)] font-black text-white">T</div>
        <select
          className="hidden min-h-9 max-w-[260px] rounded-md border border-white/10 bg-black/20 px-2 text-sm md:block"
          value={activeProjectId}
          onChange={(event) => setActiveProject(event.target.value)}
          aria-label="Project switcher"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </div>

      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search names, aliases, notes, sources, locations"
          className="h-9 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-[color:var(--c-text)] placeholder:text-white/35"
          aria-label="Global search"
        />
        {searchResults && query.trim() ? (
          <div className="absolute left-0 right-0 top-11 z-40 max-h-96 overflow-auto rounded-md border border-white/10 bg-[#151515] p-2 shadow-glow subtle-scroll">
            <div className="px-2 pb-2 text-xs uppercase tracking-[0.18em] text-[color:var(--c-text-secondary)]">{groupedCount} results</div>
            {Object.entries(searchResults.groups).map(([groupName, items]) =>
              items.length ? (
                <div key={groupName} className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--c-accent)]">{groupName}</div>
                  {items.map((item) => (
                    <button
                      key={`${item.resultType}-${item.id}`}
                      className="grid w-full gap-0.5 rounded-md px-2 py-2 text-left text-sm hover:bg-white/[0.06]"
                      onClick={() => {
                        selectItem({ kind: item.resultType as any, id: item.id });
                        setQuery('');
                        clearSearch();
                      }}
                    >
                      <span className="font-medium">{item.title}</span>
                      <span className="line-clamp-1 text-xs text-[color:var(--c-text-secondary)]">{item.snippet || item.type}</span>
                    </button>
                  ))}
                </div>
              ) : null
            )}
          </div>
        ) : null}
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Button variant="primary" icon={<Plus size={16} />} onClick={onQuickAdd}>
          Add
        </Button>
        <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm font-medium transition hover:bg-white/[0.1]">
          {importing ? <Upload size={16} /> : <FileUp size={16} />}
          Import
          <input className="sr-only" type="file" accept="application/json,.json" onChange={handleImport} />
        </label>
        <Button icon={<Download size={16} />} onClick={onExport}>
          Export
        </Button>
        <Button icon={<Settings size={16} />} onClick={() => navigate('/settings')} aria-label="Settings">
          Settings
        </Button>
      </div>
    </header>
  );
}
