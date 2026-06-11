import { useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, getFilteredRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { Download, ExternalLink, Plus, Search } from 'lucide-react';
import { downloadUrl } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import type { SourceRecord } from '../types';
import { QuickAddModal } from '../components/QuickAddModal';
import { Button } from '../components/ui/Button';
import { TextInput } from '../components/ui/Form';
import { SectionHeader } from '../components/ui/SectionHeader';

export function SourcesView() {
  const { sources, activeProjectId, selectItem } = useWorkspace();
  const [globalFilter, setGlobalFilter] = useState('');
  const [quickAdd, setQuickAdd] = useState(false);

  const columns = useMemo<ColumnDef<SourceRecord>[]>(
    () => [
      {
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }) => (
          <button className="text-left font-medium hover:text-[color:var(--c-accent)]" onClick={() => selectItem({ kind: 'source', id: row.original.id })}>
            {row.original.title}
            <div className="text-xs font-normal text-[color:var(--c-text-secondary)]">{row.original.url}</div>
          </button>
        )
      },
      { header: 'Type', accessorKey: 'sourceType' },
      { header: 'Publisher', accessorKey: 'publisher' },
      { header: 'Published', accessorKey: 'publicationDate' },
      { header: 'Reliability', accessorKey: 'reliability' },
      { header: 'Credibility', accessorKey: 'credibility' },
      {
        header: '',
        cell: ({ row }) =>
          row.original.url ? (
            <Button variant="ghost" icon={<ExternalLink size={16} />} onClick={() => window.open(row.original.url, '_blank', 'noreferrer')} aria-label="Open source" />
          ) : null
      }
    ],
    [selectItem]
  );

  const table = useReactTable({
    data: sources,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <div>
      <SectionHeader
        title="Sources"
        eyebrow="Evidence"
        actions={
          <>
            <Button icon={<Download size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/csv/sources`)}>
              CSV
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setQuickAdd(true)}>
              Source
            </Button>
          </>
        }
      />
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
        <TextInput className="w-full pl-9" value={globalFilter} onChange={(event) => setGlobalFilter(event.target.value)} placeholder="Filter sources" />
      </div>
      <div className="surface overflow-hidden rounded-lg">
        <div className="overflow-auto subtle-scroll">
          <table className="min-w-full text-sm">
            <thead className="bg-[#181818] text-left text-xs uppercase tracking-[0.14em] text-[color:var(--c-text-secondary)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="border-b border-white/10 px-3 py-3">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.035]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {quickAdd ? <QuickAddModal defaultKind="source" onClose={() => setQuickAdd(false)} /> : null}
    </div>
  );
}
