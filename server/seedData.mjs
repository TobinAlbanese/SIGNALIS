export const frameworkData = {
  project: {
    id: 'taosint-fresh-framework',
    title: 'TAOSINT Fresh Research Workspace',
    description: 'A clean local-first workspace ready for a new manually sourced project.',
    category: 'Public-source research workspace',
    status: 'active',
    tags: ['fresh-start', 'manual-research'],
    defaultMapCenter: { lat: 30.1798, lng: 66.975, label: 'Quetta, Pakistan' },
    defaultMapZoom: 4,
    notes:
      'Fresh workspace. Add people, organizations, locations, events, sources, claims, notes, and graph layouts manually. No seeded real-world entities are included.'
  },
  sources: [],
  entities: [],
  relationships: [],
  events: [],
  notes: [],
  claims: [],
  openQuestions: [],
  stickyNotes: []
};

export function seedDemo(store) {
  const existing = store.getProject(frameworkData.project.id);
  if (existing) return existing;
  return store.createProject(frameworkData.project);
}
