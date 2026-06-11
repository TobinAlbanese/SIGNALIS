import { Database, Folder, ShieldAlert } from 'lucide-react';
import { useWorkspace } from '../store/useWorkspace';
import { SectionHeader } from '../components/ui/SectionHeader';

export function SettingsView() {
  const { activeProject } = useWorkspace();
  return (
    <div>
      <SectionHeader title="Settings" eyebrow="Local workspace" />
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="surface rounded-lg p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Database size={18} />
            Project
          </h2>
          <div className="grid gap-2 text-sm text-[color:var(--c-text-secondary)]">
            <div>Title: {activeProject?.title}</div>
            <div>Status: {activeProject?.status}</div>
            <div>Category: {activeProject?.category}</div>
            <div>Default map: {activeProject?.defaultMapCenter?.label ?? 'Manual'}</div>
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
            <ShieldAlert size={18} />
            Responsible use
          </h2>
          <div className="grid gap-2 text-sm text-[color:var(--c-text-secondary)]">
            <div>No live tracking.</div>
            <div>No automated doxxing or private-account scraping.</div>
            <div>No automatic sensitive-data inference.</div>
            <div>Location precision labels are required for mapped claims.</div>
            <div>Unsourced and low-confidence material stays visibly marked.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
