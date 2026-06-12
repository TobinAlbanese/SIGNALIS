import { useEffect, useState, type CSSProperties } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Download, FileDown, FileUp, Plus, Settings } from 'lucide-react';
import { api, downloadUrl } from '../../lib/api';
import { useWorkspace } from '../../store/useWorkspace';
import { QuickAddModal } from '../QuickAddModal';
import { Button } from '../ui/Button';
import { BottomDrawer } from './BottomDrawer';
import { RightInspector } from './RightInspector';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const { loadProjects, activeProjectId, error, refreshProjectData } = useWorkspace();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(212);
  const [inspectorWidth, setInspectorWidth] = useState(340);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function importJson(file?: File) {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      await api('/api/projects/import/json', { method: 'POST', body: text });
      await loadProjects();
    } finally {
      setImporting(false);
    }
  }

  function beginResize(panel: 'sidebar' | 'inspector') {
    const onMove = (event: MouseEvent) => {
      if (panel === 'sidebar') {
        setSidebarWidth(Math.min(340, Math.max(72, event.clientX)));
      } else {
        setInspectorWidth(Math.min(520, Math.max(260, window.innerWidth - event.clientX)));
      }
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const workspaceStyle = {
    '--sidebar-width': `${sidebarWidth}px`,
    '--inspector-width': `${inspectorWidth}px`
  } as CSSProperties;

  return (
    <div className="app-shell">
      <TopBar
        onQuickAdd={() => setQuickAddOpen(true)}
        onExport={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/zip`)}
        onImport={importJson}
        importing={importing}
      />

      {error ? (
        <div className="border-y border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-100">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </span>
        </div>
      ) : null}

      <div className="workspace-grid min-h-0" style={workspaceStyle}>
        <Sidebar />
        <div
          className="workspace-resizer workspace-resizer-left"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onMouseDown={() => beginResize('sidebar')}
        />
        <main className="min-w-0 overflow-auto border-x border-white/10 subtle-scroll" aria-label="Main workspace">
          <div className="min-h-full p-4 lg:p-5">
            <Outlet />
          </div>
        </main>
        <div
          className="workspace-resizer workspace-resizer-right"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize inspector"
          onMouseDown={() => beginResize('inspector')}
        />
        <RightInspector />
      </div>

      <BottomDrawer />

      {quickAddOpen ? <QuickAddModal onClose={() => setQuickAddOpen(false)} /> : null}

      <div className="fixed bottom-4 right-4 z-30 flex gap-2 lg:hidden">
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => setQuickAddOpen(true)} aria-label="Quick add">
          Add
        </Button>
        <Button icon={<Settings size={18} />} aria-label="Settings" onClick={() => navigate('/settings')} variant={location.pathname === '/settings' ? 'primary' : 'secondary'}>
          Settings
        </Button>
        <Button icon={<FileDown size={18} />} aria-label="Export project" onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/zip`)}>
          Export
        </Button>
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 text-sm font-medium">
          <FileUp size={18} />
          Import
          <input
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => importJson(event.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  );
}
