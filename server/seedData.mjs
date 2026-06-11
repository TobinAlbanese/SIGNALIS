export const demoData = {
  project: {
    id: 'demo-fictional-regional-organization-study',
    title: 'Fictional Regional Organization Study',
    description:
      'A safe fictional project showing manual entity records, relationships, locations, events, sources, notes, diagrams, and export workflows.',
    category: 'Public-source organizational analysis',
    status: 'active',
    tags: ['demo', 'fictional', 'training'],
    defaultMapCenter: { lat: 30.1798, lng: 66.975, label: 'Quetta, Balochistan, Pakistan' },
    defaultMapZoom: 5,
    notes:
      'This demo intentionally uses fictional people and organizations only. It is designed for lawful public-source research workflows and does not include operational targeting features.'
  },
  sources: [
    {
      id: 'source-1',
      title: 'Fictional Public Registry Entry',
      url: 'https://example.org/fictional-registry-entry',
      publisher: 'Example Civic Archive',
      author: 'Registry Desk',
      publicationDate: '2025-02-14',
      accessDate: '2026-06-11',
      sourceType: 'Website',
      reliability: 'B: Usually reliable',
      credibility: '2: Probably true',
      citationText: 'Example Civic Archive, Fictional Public Registry Entry, 2025.',
      notes: 'Training-only source used to prove source linking.'
    }
  ],
  entities: [
    {
      id: 'person-a',
      type: 'person',
      name: 'Person A',
      aliases: ['A. Example'],
      summary: 'Fictional senior leader used for demonstration.',
      confidence: 'medium',
      tags: ['leadership'],
      sourceIds: ['source-1'],
      details: {
        fullName: 'Person A',
        roleTitle: 'Leader',
        nationality: 'Fictional',
        profileSummary: 'Fictional senior leader used for demonstration.',
        status: 'active'
      }
    },
    {
      id: 'person-b',
      type: 'person',
      name: 'Person B',
      aliases: ['B. Example'],
      summary: 'Fictional deputy in the sample network.',
      confidence: 'medium',
      tags: ['leadership'],
      details: {
        fullName: 'Person B',
        roleTitle: 'Deputy',
        nationality: 'Fictional',
        profileSummary: 'Fictional deputy in the sample network.'
      }
    },
    {
      id: 'person-c',
      type: 'person',
      name: 'Person C',
      aliases: ['C. Regional'],
      summary: 'Fictional regional official connected to a sub-organization.',
      confidence: 'low',
      tags: ['regional'],
      sourceIds: ['source-1'],
      details: {
        fullName: 'Person C',
        roleTitle: 'Regional Official',
        nationality: 'Fictional',
        lastKnownLocationId: 'location-1',
        profileSummary: 'Fictional regional official connected to a sub-organization.'
      }
    },
    {
      id: 'organization-x',
      type: 'organization',
      name: 'Organization X',
      aliases: ['Org X'],
      summary: 'Fictional umbrella organization for the seed project.',
      confidence: 'medium',
      tags: ['organization'],
      details: {
        name: 'Organization X',
        orgType: 'Fictional civic organization',
        ideologyOrFunction: 'Training-only structure mapping',
        leadership: ['person-a', 'person-b']
      }
    },
    {
      id: 'sub-organization-y',
      type: 'sub-organization',
      name: 'Sub-organization Y',
      aliases: ['Unit Y'],
      summary: 'Fictional regional unit nested below Organization X.',
      confidence: 'medium',
      tags: ['subunit'],
      details: {
        name: 'Sub-organization Y',
        orgType: 'Regional office',
        parentOrganizationId: 'organization-x',
        knownMembers: ['person-c']
      }
    },
    {
      id: 'location-1',
      type: 'location',
      name: 'Location 1',
      aliases: ['Fictional District Office'],
      summary: 'Fictional city-level location marker near Quetta for map testing.',
      confidence: 'medium',
      tags: ['map'],
      details: {
        name: 'Location 1',
        locationType: 'City-level area',
        latitude: 30.1798,
        longitude: 66.975,
        city: 'Quetta',
        region: 'Balochistan',
        country: 'Pakistan',
        precisionLevel: 'City-level',
        geocodeSource: 'Manual demo coordinate',
        originalQuery: 'Quetta, Balochistan, Pakistan',
        resolvedName: 'Quetta'
      }
    }
  ],
  relationships: [
    {
      id: 'rel-person-a-leader-org-x',
      sourceEntityId: 'person-a',
      targetEntityId: 'organization-x',
      relationshipType: 'leader_of',
      direction: 'directed',
      status: 'active',
      confidence: 'medium',
      sourceIds: ['source-1'],
      notes: 'Demo relationship with a linked source.'
    },
    {
      id: 'rel-person-b-reports-person-a',
      sourceEntityId: 'person-b',
      targetEntityId: 'person-a',
      relationshipType: 'reports_to',
      direction: 'directed',
      status: 'active',
      confidence: 'medium',
      notes: 'Fictional command relationship.'
    },
    {
      id: 'rel-person-c-member-sub-y',
      sourceEntityId: 'person-c',
      targetEntityId: 'sub-organization-y',
      relationshipType: 'member_of',
      direction: 'directed',
      status: 'alleged',
      confidence: 'low',
      sourceIds: ['source-1'],
      notes: 'Marked low confidence to show visual uncertainty.'
    },
    {
      id: 'rel-sub-y-part-org-x',
      sourceEntityId: 'sub-organization-y',
      targetEntityId: 'organization-x',
      relationshipType: 'part_of',
      direction: 'directed',
      status: 'active',
      confidence: 'medium'
    },
    {
      id: 'rel-person-c-located-location-1',
      sourceEntityId: 'person-c',
      targetEntityId: 'location-1',
      relationshipType: 'located_in',
      direction: 'directed',
      status: 'unknown',
      confidence: 'low',
      sourceIds: ['source-1'],
      notes: 'City-level only. Exact location is intentionally not asserted.'
    },
    {
      id: 'rel-source-1-supports-person-c-sub-y',
      sourceEntityId: 'person-c',
      targetEntityId: 'sub-organization-y',
      relationshipType: 'source_supports',
      direction: 'directed',
      status: 'active',
      confidence: 'medium',
      sourceIds: ['source-1']
    }
  ],
  events: [
    {
      id: 'event-1',
      title: 'Event 1: Fictional Regional Appointment',
      eventType: 'Appointment',
      dateStart: '2025-03-01',
      locationId: 'location-1',
      latitude: 30.1798,
      longitude: 66.975,
      involvedPersonIds: ['person-c'],
      involvedOrganizationIds: ['sub-organization-y'],
      sourceIds: ['source-1'],
      description: 'Fictional appointment event for timeline, map, and graph testing.',
      analystNotes: 'City-level location precision only.',
      confidence: 'medium',
      tags: ['demo', 'appointment']
    }
  ],
  notes: [
    {
      id: 'note-project-demo',
      parentType: 'project',
      parentId: 'demo-fictional-regional-organization-study',
      noteType: 'project',
      title: 'Research Tasks',
      body: '- [ ] Add another fictional source\\n- [ ] Compare hierarchy and spider views\\n- [ ] Export a sanitized public viewer bundle',
      color: 'task',
      tags: ['task']
    },
    {
      id: 'note-person-c',
      parentType: 'entity',
      parentId: 'person-c',
      noteType: 'entity',
      title: 'Precision caution',
      body: 'Location is city-level only. Do not convert this into an exact address without a source.',
      color: 'warning',
      tags: ['precision', 'safety']
    }
  ],
  claims: [
    {
      id: 'claim-person-c-membership',
      claimText: 'Person C is reported as a member of Sub-organization Y.',
      claimType: 'relationship',
      linkedEntityId: 'person-c',
      linkedRelationshipId: 'rel-person-c-member-sub-y',
      sourceIds: ['source-1'],
      confidence: 'low',
      status: 'supported',
      notes: 'Supported by fictional source only.'
    }
  ],
  openQuestions: [
    {
      id: 'question-person-c-role',
      question: 'Is Person C still active in Sub-organization Y?',
      linkedEntityId: 'person-c',
      priority: 'medium',
      status: 'open',
      notes: 'Demo open question for dashboard and notes workflows.'
    }
  ],
  stickyNotes: [
    {
      id: 'sticky-demo-warning',
      title: 'Precision',
      body: 'City-level marker only. Keep the public-safe export setting in mind.',
      color: 'warning',
      attachedToNodeId: 'location-1',
      x: 620,
      y: 180,
      width: 240,
      height: 150
    }
  ]
};

export function seedDemo(store) {
  const existing = store.getProject(demoData.project.id);
  if (existing) return existing;
  const project = store.createProject(demoData.project);
  for (const source of demoData.sources) store.createSource(project.id, source);
  for (const entity of demoData.entities) store.createEntity(project.id, entity);
  for (const relationship of demoData.relationships) store.createRelationship(project.id, relationship);
  for (const event of demoData.events) store.createEvent(project.id, event);
  for (const note of demoData.notes) store.createNote(project.id, note);
  for (const claim of demoData.claims) store.createClaim(project.id, claim);
  for (const question of demoData.openQuestions) store.createOpenQuestion(project.id, question);
  for (const sticky of demoData.stickyNotes) store.createStickyNote(project.id, sticky);
  return store.getProject(project.id);
}
