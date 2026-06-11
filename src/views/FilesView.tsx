import { ChangeEvent, useMemo, useState } from 'react';
import { ExternalLink, FileUp, Image, Search } from 'lucide-react';
import { useWorkspace } from '../store/useWorkspace';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Form';
import { SectionHeader } from '../components/ui/SectionHeader';

export function FilesView() {
  const { files, uploadFile, selectItem } = useWorkspace();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => files.filter((file) => `${file.originalName} ${file.mimeType} ${file.notes}`.toLowerCase().includes(query.toLowerCase())),
    [files, query]
  );

  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, typeof files>();
    files.forEach((file) => {
      if (!file.perceptualHash) return;
      groups.set(file.perceptualHash, [...(groups.get(file.perceptualHash) ?? []), file]);
    });
    return Array.from(groups.values()).filter((group) => group.length > 1);
  }, [files]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await uploadFile(file);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  return (
    <div>
      <SectionHeader
        title="Files"
        eyebrow="Local media library"
        actions={
          <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-[color:var(--c-accent)] bg-[color:var(--c-accent)] px-3 text-sm font-medium text-white">
            <FileUp size={16} />
            {busy ? 'Uploading' : 'Upload'}
            <input className="sr-only" type="file" onChange={handleUpload} />
          </label>
        }
      />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
        <TextInput className="w-full pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter files" />
      </div>
      {duplicateGroups.length ? (
        <div className="mb-4 rounded-md border border-yellow-400/25 bg-yellow-400/10 p-3 text-sm text-yellow-100">
          {duplicateGroups.length} possible duplicate image group found from local perceptual hashes.
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((file) => {
          const url = `/api/files/${file.id}`;
          return (
            <button key={file.id} className="surface overflow-hidden rounded-lg text-left hover:border-[color:var(--c-accent)]" onClick={() => selectItem({ kind: 'file', id: file.id })}>
              {file.mimeType.startsWith('image/') ? (
                <img src={url} alt={file.originalName} className="h-40 w-full object-cover" />
              ) : (
                <div className="grid h-40 place-items-center bg-black/20 text-[color:var(--c-accent)]">
                  <Image size={42} />
                </div>
              )}
              <div className="grid gap-2 p-3">
                <div className="line-clamp-1 text-sm font-medium">{file.originalName}</div>
                <div className="text-xs text-[color:var(--c-text-secondary)]">{file.mimeType}</div>
                <div className="flex flex-wrap gap-2">
                  <a className="badge hover:text-white" href={url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                    <ExternalLink size={12} /> Open
                  </a>
                  {file.mimeType.startsWith('image/') ? (
                    <>
                      <a
                        className="badge hover:text-white"
                        href={`https://images.google.com/searchbyimage?image_url=${encodeURIComponent(window.location.origin + url)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Google image
                      </a>
                      <a
                        className="badge hover:text-white"
                        href={`https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(window.location.origin + url)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                      >
                        Yandex image
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
