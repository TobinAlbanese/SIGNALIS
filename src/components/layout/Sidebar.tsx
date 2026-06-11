import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  Database,
  FileStack,
  FileText,
  FolderOpen,
  Map,
  Network,
  NotebookTabs,
  Settings,
  UsersRound
} from 'lucide-react';
import clsx from 'clsx';

const nav = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/entities', label: 'Entities', icon: UsersRound },
  { to: '/graph', label: 'Graph', icon: Network },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/timeline', label: 'Timeline', icon: CalendarDays },
  { to: '/sources', label: 'Sources', icon: Database },
  { to: '/files', label: 'Files', icon: FolderOpen },
  { to: '/notes', label: 'Notes', icon: NotebookTabs },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings }
];

export function Sidebar() {
  return (
    <aside className="left-sidebar panel min-h-0 overflow-auto border-r p-2 subtle-scroll" aria-label="Workspace navigation">
      <div className="grid gap-1">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-[color:var(--c-accent)] text-white'
                    : 'text-[color:var(--c-text-secondary)] hover:bg-white/[0.06] hover:text-[color:var(--c-text)]'
                )
              }
            >
              <Icon size={18} />
              <span className="hidden lg:inline">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
      <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 text-xs text-[color:var(--c-text-secondary)]">
        <FileStack className="mb-2 text-[color:var(--c-accent)]" size={18} />
        Public-safe exports can hide notes, exact coordinates, low-confidence claims, private paths, and selected media.
      </div>
    </aside>
  );
}
