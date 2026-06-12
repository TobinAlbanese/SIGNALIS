import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from '../store/useWorkspace';
import { QuickAddModal } from '../components/QuickAddModal';
import { Button } from '../components/ui/Button';
import { MarkdownPreview } from '../components/ui/MarkdownPreview';
import { SectionHeader } from '../components/ui/SectionHeader';

const PREVIEW_LIMIT = 1800;

function previewBody(body: string) {
  return body.length > PREVIEW_LIMIT ? `${body.slice(0, PREVIEW_LIMIT).trim()}\n\n...` : body;
}

export function NotesView() {
  const { notes, openQuestions, claims, selectItem } = useWorkspace();
  const [quickAdd, setQuickAdd] = useState(false);

  return (
    <div>
      <SectionHeader
        title="Notes"
        eyebrow="Research notebook"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setQuickAdd(true)}>
            Note
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="grid gap-3">
          {notes.map((note) => (
            <button key={note.id} className="surface rounded-lg p-4 text-left hover:border-[color:var(--c-accent)]" onClick={() => selectItem({ kind: 'note', id: note.id })}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-semibold">{note.title || 'Untitled note'}</span>
                <span className="badge">{note.noteType}</span>
                <span className="badge">{note.color}</span>
              </div>
              <MarkdownPreview body={previewBody(note.body)} />
            </button>
          ))}
        </div>
        <aside className="grid content-start gap-4">
          <section className="surface rounded-lg p-4">
            <h2 className="mb-3 font-semibold">Open questions</h2>
            <div className="grid gap-2">
              {openQuestions.map((question) => (
                <div key={question.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                  <div className="font-medium">{question.question}</div>
                  <div className="mt-2 flex gap-2">
                    <span className="badge">{question.priority}</span>
                    <span className="badge">{question.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="surface rounded-lg p-4">
            <h2 className="mb-3 font-semibold">Claims</h2>
            <div className="grid gap-2">
              {claims.map((claim) => (
                <div key={claim.id} className="rounded-md border border-white/10 bg-black/20 p-3 text-sm">
                  <div>{claim.claimText}</div>
                  <div className="mt-2 flex gap-2">
                    <span className="badge">{claim.status}</span>
                    <span className="badge">{claim.confidence}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
      {quickAdd ? <QuickAddModal defaultKind="note" onClose={() => setQuickAdd(false)} /> : null}
    </div>
  );
}
