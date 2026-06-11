import { useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { Download, Filter, Plus, Search } from 'lucide-react';
import { entityTypes } from '../constants';
import { downloadUrl } from '../lib/api';
import { useWorkspace } from '../store/useWorkspace';
import type { Entity } from '../types';
import { QuickAddModal } from '../components/QuickAddModal';
import { ConfidenceBadge, SourceBadge, TypeBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select, TextInput } from '../components/ui/Form';
import { SectionHeader } from '../components/ui/SectionHeader';

export function EntitiesView() {
  const { entities, activeProjectId, selectItem } = useWorkspace();
  const [quickAdd, setQuickAdd] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [globalFilter, setGlobalFilter] = useState('');

  const data = useMemo(
    () => (typeFilter === 'all' ? entities : entities.filter((entity) => entity.type === typeFilter)),
    [entities, typeFilter]
  );

  const columns = useMemo<ColumnDef<Entity>[]>(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => (
          <button className="text-left font-medium hover:text-[color:var(--c-accent)]" onClick={() => selectItem({ kind: 'entity', id: row.original.id })}>
            {row.original.name}
            <div className="text-xs font-normal text-[color:var(--c-text-secondary)]">{row.original.aliases?.join(', ')}</div>
          </button>
        )
      },
      {
        header: 'Type',
        accessorKey: 'type',
        cell: ({ row }) => <TypeBadge value={row.original.type} />
      },
      {
        header: 'Role / location',
        cell: ({ row }) => (
          <span className="text-sm text-[color:var(--c-text-secondary)]">
            {row.original.details?.roleTitle || row.original.details?.city || row.original.details?.orgType || row.original.summary || 'No detail'}
          </span>
        )
      },
      {
        header: 'Confidence',
        accessorKey: 'confidence',
        cell: ({ row }) => <ConfidenceBadge value={row.original.confidence} />
      },
      {
        header: 'Sources',
        cell: ({ row }) => <SourceBadge count={row.original.sourceIds?.length ?? 0} />
      },
      {
        header: 'Tags',
        cell: ({ row }) => <span className="text-xs text-[color:var(--c-text-secondary)]">{row.original.tags?.join(', ')}</span>
      }
    ],
    [selectItem]
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <div>
      <SectionHeader
        title="Entities"
        eyebrow="Structured records"
        actions={
          <>
            <Button icon={<Download size={16} />} onClick={() => activeProjectId && downloadUrl(`/api/projects/${activeProjectId}/export/csv/entities`)}>
              CSV
            </Button>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => setQuickAdd(true)}>
              Entity
            </Button>
          </>
        }
      />

      <div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
          <TextInput
            className="w-full pl-9"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Filter table"
            aria-label="Filter entities"
          />
        </div>
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" size={16} />
          <Select className="w-full pl-9" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Entity type filter">
            <option value="all">All entity types</option>
            {entityTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="surface overflow-hidden rounded-lg">
        <div className="overflow-auto subtle-scroll">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-[#181818] text-left text-xs uppercase tracking-[0.14em] text-[color:var(--c-text-secondary)]">
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
      {quickAdd ? <QuickAddModal defaultKind="entity" onClose={() => setQuickAdd(false)} /> : null}
    </div>
  );
}
