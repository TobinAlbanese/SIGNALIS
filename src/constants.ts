import type { Confidence, EntityType } from './types';

export const entityTypes: EntityType[] = [
  'person',
  'organization',
  'sub-organization',
  'role',
  'location',
  'event',
  'source',
  'document',
  'image',
  'alias',
  'family-group',
  'account',
  'vehicle',
  'financial-entity',
  'custom'
];

export const relationshipTypes = [
  'reports_to',
  'commands',
  'supervises',
  'member_of',
  'leader_of',
  'deputy_of',
  'subordinate_of',
  'appointed_by',
  'replaced_by',
  'predecessor_of',
  'successor_of',
  'family_member_of',
  'parent_of',
  'child_of',
  'sibling_of',
  'spouse_of',
  'associate_of',
  'ally_of',
  'rival_of',
  'owns',
  'controls',
  'funds',
  'communicates_with',
  'traveled_to',
  'located_in',
  'last_seen_at',
  'operates_in',
  'attended_event',
  'involved_in',
  'mentioned_in',
  'source_claims',
  'source_supports',
  'source_contradicts',
  'sanctioned_by',
  'designated_by',
  'part_of',
  'custom'
];

export const confidenceValues: Confidence[] = ['high', 'medium', 'low', 'unknown', 'contradicted'];

export const precisionLevels = [
  'Exact coordinate',
  'Street-level',
  'Neighborhood-level',
  'City-level',
  'Province-level',
  'Country-level',
  'Unknown'
];

export const eventTypes = [
  'Appointment',
  'Public appearance',
  'Reported location',
  'Meeting',
  'Conflict event',
  'Sanction/designation',
  'Death',
  'Arrest',
  'Leadership change',
  'Source publication',
  'Relationship change',
  'Other'
];

export const sourceTypes = [
  'News article',
  'Government report',
  'Sanctions record',
  'Court record',
  'Academic source',
  'Book',
  'PDF',
  'Image',
  'Video',
  'Social media post',
  'Website',
  'Other'
];

export const sourceReliability = [
  'A: Very reliable',
  'B: Usually reliable',
  'C: Mixed reliability',
  'D: Unknown',
  'E: Unreliable'
];

export const sourceCredibility = ['1: Confirmed', '2: Probably true', '3: Possibly true', '4: Doubtful', '5: Improbable'];

export const entityTone: Record<string, string> = {
  person: 'entity-person',
  organization: 'entity-organization',
  'sub-organization': 'entity-organization',
  location: 'entity-location',
  event: 'entity-event',
  source: 'entity-source',
  document: 'entity-source',
  image: 'entity-source',
  custom: 'entity-custom'
};

export const hierarchyRelationshipTypes = new Set([
  'reports_to',
  'commands',
  'supervises',
  'leader_of',
  'deputy_of',
  'subordinate_of',
  'appointed_by'
]);

export const familyRelationshipTypes = new Set(['parent_of', 'child_of', 'sibling_of', 'spouse_of', 'family_member_of']);

export const organizationChartTypes = new Set(['leader_of', 'member_of', 'reports_to', 'part_of', 'deputy_of']);
