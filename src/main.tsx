import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@xyflow/react/dist/style.css';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import { AppShell } from './components/layout/AppShell';
import { DashboardView } from './views/DashboardView';
import { EntitiesView } from './views/EntitiesView';
import { GraphView } from './views/GraphView';
import { MapView } from './views/MapView';
import { TimelineView } from './views/TimelineView';
import { SourcesView } from './views/SourcesView';
import { NotesView } from './views/NotesView';
import { FilesView } from './views/FilesView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<DashboardView />} />
          <Route path="entities" element={<EntitiesView />} />
          <Route path="graph" element={<GraphView />} />
          <Route path="map" element={<MapView />} />
          <Route path="timeline" element={<TimelineView />} />
          <Route path="sources" element={<SourcesView />} />
          <Route path="files" element={<FilesView />} />
          <Route path="notes" element={<NotesView />} />
          <Route path="reports" element={<ReportsView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
