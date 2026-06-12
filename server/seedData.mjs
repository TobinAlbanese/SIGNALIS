import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const PROJECT_ID = 'alqaeda-framework-public-1984-2026';
const FRAMEWORK_FILE = path.join(process.cwd(), 'data', 'alqaeda-framework-notes.md');
const LOCAL_SOURCE_ID = 'source-user-pasted-framework';

function readFrameworkText() {
  if (!fs.existsSync(FRAMEWORK_FILE)) {
    return 'THE ALQAEDA FRAMEWORK\n\nSource attachment was not found in data/alqaeda-framework-notes.md.';
  }
  return fs
    .readFileSync(FRAMEWORK_FILE, 'utf8')
    .replace(/\u2028/g, '\n')
    .replace(/\u2029/g, '\n')
    .replace(/\r\n/g, '\n');
}

function slug(value = 'item') {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'item';
}

function shortHash(value) {
  return createHash('sha1').update(String(value)).digest('hex').slice(0, 8);
}

function stableId(prefix, value) {
  return `${prefix}-${slug(value)}-${shortHash(value)}`;
}

function cleanUrl(rawUrl = '') {
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete('utm_source');
    return url.toString();
  } catch {
    return rawUrl.replace(/\?utm_source=chatgpt\.com$/, '');
  }
}

function hostFor(url = '') {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function sourcePublisher(url = '', title = '') {
  const host = hostFor(url);
  if (host.includes('dni.gov') || host.includes('odni.gov')) return 'Director of National Intelligence / NCTC';
  if (host.includes('fbi.gov')) return 'Federal Bureau of Investigation';
  if (host.includes('rewardsforjustice.net')) return 'Rewards for Justice';
  if (host.includes('state.gov')) return 'U.S. Department of State';
  if (host.includes('treasury.gov')) return 'U.S. Department of the Treasury';
  if (host.includes('cia.gov')) return 'Central Intelligence Agency';
  if (host.includes('9-11commission.gov') || host.includes('govinfo.gov')) return '9/11 Commission';
  if (host.includes('un.org')) return 'United Nations';
  if (host.includes('britannica.com')) return 'Encyclopaedia Britannica';
  if (host.includes('apnews.com')) return 'AP News';
  if (host.includes('theguardian.com')) return 'The Guardian';
  if (host.includes('longwarjournal.org')) return "FDD's Long War Journal";
  if (host.includes('counterextremism.com')) return 'Counter Extremism Project';
  if (host.includes('wikipedia.org')) return 'Wikipedia';
  return title.includes('NCTC') ? 'Director of National Intelligence / NCTC' : host || 'Public web source';
}

function sourceType(url = '', title = '') {
  const publisher = sourcePublisher(url, title);
  if (url.toLowerCase().endsWith('.pdf')) return 'PDF';
  if (
    publisher.includes('Director of National Intelligence') ||
    publisher.includes('Federal Bureau') ||
    publisher.includes('Rewards for Justice') ||
    publisher.includes('Department') ||
    publisher.includes('Central Intelligence') ||
    publisher.includes('United Nations') ||
    publisher.includes('9/11 Commission')
  ) {
    return 'Government report';
  }
  if (publisher === 'Encyclopaedia Britannica' || publisher === 'Counter Extremism Project') return 'Website';
  return 'News article';
}

function sourceReliabilityFor(url = '', title = '') {
  const publisher = sourcePublisher(url, title);
  if (
    publisher.includes('Director of National Intelligence') ||
    publisher.includes('Federal Bureau') ||
    publisher.includes('Rewards for Justice') ||
    publisher.includes('Department') ||
    publisher.includes('Central Intelligence') ||
    publisher.includes('United Nations') ||
    publisher.includes('9/11 Commission')
  ) {
    return 'A: Very reliable';
  }
  if (publisher === 'Encyclopaedia Britannica' || publisher === 'AP News') return 'B: Usually reliable';
  if (publisher === 'Wikipedia') return 'C: Mixed reliability';
  return 'B: Usually reliable';
}

function extractSources(text) {
  const records = [
    {
      id: LOCAL_SOURCE_ID,
      title: 'User pasted public-source framework notes',
      url: '',
      publisher: 'User-provided OSINT notes',
      author: 'Tobinalbanese research notes',
      publicationDate: '',
      accessDate: '2026-06-12',
      sourceType: 'Other',
      reliability: 'B: Usually reliable',
      credibility: '2: Probably true',
      citationText: 'User-provided pasted framework notes stored at data/alqaeda-framework-notes.md.',
      notes:
        'Primary local archive for this remake. The text says it is derived from online public sources. Part 5 and the later Part Nine/relationship-map block are intentionally stored as notes-only analytical material.'
    }
  ];
  const seen = new Set();
  for (const match of text.matchAll(/^\[(\d+)\]:\s+(\S+)(?:\s+"([^"]+)")?/gm)) {
    const url = cleanUrl(match[2]);
    const title = (match[3] || url).trim();
    const key = `${url}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({
      id: stableId('source', key),
      title,
      url,
      publisher: sourcePublisher(url, title),
      author: '',
      publicationDate: '',
      accessDate: '2026-06-12',
      sourceType: sourceType(url, title),
      reliability: sourceReliabilityFor(url, title),
      credibility: sourceReliabilityFor(url, title).startsWith('A') ? '1: Confirmed' : '2: Probably true',
      citationText: `${title}. ${url}`,
      notes: `Footnote ${match[1]} from the pasted AL-QAEDA FRAMEWORK notes.`
    });
  }
  return records;
}

function findSourceId(sources, pattern) {
  const lower = pattern.toLowerCase();
  return sources.find((source) => `${source.title} ${source.url} ${source.publisher}`.toLowerCase().includes(lower))?.id;
}

function sectionBetween(text, start, end) {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) return '';
  const contentStart = startIndex + start.length;
  const endIndex = end ? text.indexOf(end, contentStart) : -1;
  return text.slice(contentStart, endIndex < 0 ? text.length : endIndex).trim();
}

const fieldPattern =
  /^(Type|Status|Primary period|Primary geography|Primary geographies|Founded|Predecessor|Merger components|Key leaders|Key figures|Relationship role|Relationship to Al-Qaeda|Source confidence|Notes|Aliases|Born|Died|Nationality|Organizations|Roles|Family tie|Family ties|Locations|Connected events|Relationship|Role|Child|Children publicly associated|Pledge|Source anchor|Safety note|Connected tie)\s*:\s*(.*)$/i;

function parseFields(body = '') {
  const fields = {};
  const narrative = [];
  for (const line of body.split('\n').map((item) => item.trim()).filter(Boolean)) {
    const match = line.match(fieldPattern);
    if (match) fields[slug(match[1]).replaceAll('-', '')] = match[2].trim();
    else narrative.push(line);
  }
  return { fields, narrative: narrative.join('\n') };
}

function parseIndexEntries(section = '') {
  const skipHeaders = new Set([
    'Core Al-Qaeda events',
    'AQAP events',
    'AQIM / JNIM events',
    'Al-Shabaab events',
    'AQIS events',
    'Syria / Hurras events',
    'Core sanctuary and origin locations',
    'Affiliate base locations',
    'Attack-symbolic locations',
    'Official prosecution layer',
    'AQSL screenshot context names',
    'AQI screenshot-derived names',
    'AQIM Mali Group screenshot-derived names'
  ]);
  const entries = [];
  let current = null;
  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const isEntryHeader =
      line.length < 150 &&
      !line.includes(':') &&
      !line.startsWith('*') &&
      !line.startsWith('Source anchor') &&
      !line.startsWith('Covered above') &&
      !line.startsWith('These are') &&
      !line.startsWith('Recommended platform') &&
      !line.startsWith('Source confidence') &&
      !/^\d+\./.test(line) &&
      !skipHeaders.has(line);
    if (isEntryHeader) {
      if (current) entries.push(current);
      current = { name: line, body: '' };
    } else if (current) {
      current.body += `${current.body ? '\n' : ''}${line}`;
    }
  }
  if (current) entries.push(current);
  return entries;
}

function primaryName(name) {
  return name
    .split(' — ')[0]
    .split(' / ')[0]
    .replace(/\s+\([^)]*\)/g, '')
    .trim();
}

function aliasesFor(name, fields = {}) {
  const aliases = new Set();
  if (name.includes(' — ')) {
    for (const part of name.split(' — ')) aliases.add(part.trim());
  }
  if (name.includes(' / ')) {
    for (const part of name.split(' / ')) aliases.add(part.trim());
  }
  if (fields.aliases) {
    for (const part of fields.aliases.split(/[;,]/)) aliases.add(part.trim());
  }
  aliases.delete(name);
  aliases.delete(primaryName(name));
  return Array.from(aliases).filter(Boolean);
}

function confidenceFromText(value = '') {
  const text = value.toLowerCase();
  if (text.includes('contested') || text.includes('screenshot') || text.includes('chart-derived')) return 'low';
  if (text.includes('official-high') || text.includes('official') || text.includes('research-high') || text.includes('public-high')) return 'high';
  if (text.includes('public-reported') || text.includes('public')) return 'medium';
  return 'medium';
}

function tagsFromText(...values) {
  const text = values.join(' ').toLowerCase();
  const tags = new Set(['al-qaeda-framework']);
  if (text.includes('official-high')) tags.add('official-high');
  if (text.includes('research-high')) tags.add('research-high');
  if (text.includes('public-reported') || text.includes('public-high')) tags.add('public-reported');
  if (text.includes('contested')) tags.add('contested');
  if (text.includes('chart-derived')) tags.add('chart-derived');
  if (text.includes('screenshot-derived')) tags.add('screenshot-derived');
  if (text.includes('needs corroboration')) tags.add('needs-corroboration');
  if (text.includes('not al-qaeda') || text.includes('not an al-qaeda branch')) tags.add('contextual-not-al-qaeda');
  if (text.includes('former')) tags.add('former');
  return Array.from(tags);
}

function splitList(value = '') {
  return value
    .split(/,|;|\band\b/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSourceHelpers(sources) {
  const core = findSourceId(sources, 'terrorist_groups/al_qaida') || LOCAL_SOURCE_ID;
  return {
    core,
    aqap: findSourceId(sources, 'terrorist_groups/aqap') || core,
    aqis: findSourceId(sources, 'terrorist_groups/aqis') || core,
    aqim: findSourceId(sources, 'terrorist_groups/aqim') || core,
    jnim: findSourceId(sources, 'terrorist_groups/jnim') || core,
    shabaab: findSourceId(sources, 'terrorist_groups/al_shabaab') || findSourceId(sources, 'groups/al_shabaab') || core,
    hurras: findSourceId(sources, 'terrorist_groups/hurras') || core,
    haqqani: findSourceId(sources, 'haqqani_network') || core,
    fbi: findSourceId(sources, 'fbi.gov') || core,
    rfj: findSourceId(sources, 'rewardsforjustice') || core,
    commission: findSourceId(sources, '9/11 Commission') || findSourceId(sources, '911Report') || core,
    cia: findSourceId(sources, 'cia.gov') || core,
    un: findSourceId(sources, 'Security Council') || findSourceId(sources, 'un.org') || core,
    local: LOCAL_SOURCE_ID
  };
}

function inferSourceIds(name, body, sourceIds) {
  const text = `${name} ${body}`.toLowerCase();
  const ids = new Set([sourceIds.local]);
  if (text.includes('aqap') || text.includes('yemen') || text.includes('al-awlaki')) ids.add(sourceIds.aqap);
  if (text.includes('aqis') || text.includes('bangladesh') || text.includes('south asia')) ids.add(sourceIds.aqis);
  if (text.includes('aqim') || text.includes('gspc') || text.includes('maghreb')) ids.add(sourceIds.aqim);
  if (text.includes('jnim') || text.includes('mali') || text.includes('sahel') || text.includes('burkina')) ids.add(sourceIds.jnim);
  if (text.includes('shabaab') || text.includes('somalia') || text.includes('kenya')) ids.add(sourceIds.shabaab);
  if (text.includes('hurras') || text.includes('nusra') || text.includes('syria') || text.includes('hts')) ids.add(sourceIds.hurras);
  if (text.includes('haqqani') || text.includes('taliban')) ids.add(sourceIds.haqqani);
  if (text.includes('fbi') || text.includes('wanted')) ids.add(sourceIds.fbi);
  if (text.includes('rewards for justice') || text.includes('rfj')) ids.add(sourceIds.rfj);
  if (text.includes('9/11 commission') || text.includes('commission')) ids.add(sourceIds.commission);
  if (text.includes('cia') || text.includes('abbottabad')) ids.add(sourceIds.cia);
  if (text.includes('un ') || text.includes('security council')) ids.add(sourceIds.un);
  ids.add(sourceIds.core);
  return Array.from(ids).filter(Boolean);
}

function organizationEntity(entry, sourceIds) {
  const { fields, narrative } = parseFields(entry.body);
  const name = entry.name;
  const typeText = fields.type || '';
  const orgType = typeText.includes('media') ? 'Media organ' : typeText || 'Organization';
  const summary = fields.notes || narrative || fields.relationshiptoalqaeda || orgType;
  const primary = primaryName(name);
  return {
    id: stableId('org', primary),
    type: 'organization',
    name,
    aliases: aliasesFor(name, fields),
    summary,
    notes: entry.body,
    confidence: confidenceFromText(fields.sourceconfidence || entry.body),
    tags: tagsFromText(fields.sourceconfidence, typeText, fields.notes, entry.body),
    sourceIds: inferSourceIds(name, entry.body, sourceIds),
    details: {
      orgType,
      activeDates: { label: fields.primaryperiod || fields.founded || fields.status || '' },
      ideologyOrFunction: fields.relationshiprole || fields.relationshiptoalqaeda || fields.type || '',
      leadership: splitList(fields.keyleaders || fields.keyfigures || ''),
      operatingLocations: splitList(fields.primarygeographies || fields.primarygeography || ''),
      publicDesignations: fields.status ? [fields.status] : [],
      summary,
      analystNotes: entry.body
    }
  };
}

function personEntity(entry, sourceIds) {
  const { fields, narrative } = parseFields(entry.body);
  const name = primaryName(entry.name);
  const summary = fields.roles || fields.role || fields.relationship || fields.notes || narrative || 'Person record from the pasted framework.';
  return {
    id: stableId('person', name),
    type: 'person',
    name,
    aliases: aliasesFor(entry.name, fields),
    summary,
    notes: entry.body,
    confidence: confidenceFromText(fields.sourceconfidence || entry.body),
    tags: tagsFromText(fields.sourceconfidence, fields.status, fields.notes, entry.body),
    sourceIds: inferSourceIds(entry.name, entry.body, sourceIds),
    details: {
      fullName: name,
      dateOfBirth: fields.born || '',
      dateOfDeath: fields.died || '',
      nationality: fields.nationality || '',
      roleTitle: fields.roles || fields.role || '',
      status: fields.status || '',
      influenceLevel: fields.sourceconfidence || '',
      knownFamilyMembers: splitList(fields.familytie || fields.familyties || fields.relationship || ''),
      knownAssociates: splitList(fields.organizations || ''),
      knownLocations: splitList(fields.locations || ''),
      profileSummary: summary,
      analystNotes: entry.body
    }
  };
}

function supplementalOrganizations(sourceIds) {
  const items = [
    ['GSPC — Salafist Group for Preaching and Combat', 'Predecessor to AQIM; Algeria-based GIA splinter that aligned with Al-Qaeda and became AQIM.'],
    ['Ansar al-Din', 'Mali-based group that merged into JNIM in 2017.'],
    ['Al-Murabitun', 'Sahel group associated with Mokhtar Belmokhtar and later merged into JNIM.'],
    ['Macina Liberation Front / Katibat Macina', 'Central Mali component that merged into JNIM.'],
    ['AQIM Sahara Emirate', 'AQIM Sahara subgroup that merged into JNIM.'],
    ['Hayat Tahrir al-Sham / HTS', 'Breakaway successor lineage from Jabhat al-Nusra; not current Al-Qaeda.'],
    ['Jabhat Fatah al-Sham / JFS', 'Nusra rebrand after the public break from Al-Qaeda; predecessor to HTS.'],
    ['Al-Sahab Media', 'Al-Qaeda Core media arm and leadership messaging channel.'],
    ['Al-Malahem Media', 'AQAP media wing and claims/propaganda channel.'],
    ['Inspire', 'AQAP English-language propaganda magazine; catalog as artifact only.'],
    ['Resurgence', 'Al-Qaeda/AQIS-associated propaganda magazine; catalog as artifact only.'],
    ['Al-Kataib Media', 'al-Shabaab media wing.'],
    ['Armed Islamic Group / GIA', 'Algerian predecessor environment from which GSPC split.'],
    ['Islamic State of Iraq', 'Successor path from AQI before ISIS; rival lineage, not Al-Qaeda.'],
    ['Ansar al-Sharia Yemen', 'AQAP-associated local governance/branding label in Yemen.'],
    ['Al-Qaeda Shura Council', 'Consultative leadership structure described in public Al-Qaeda histories.'],
    ['Al-Qaeda Military Committee', 'Military/security leadership layer associated with Al-Qaeda Core.'],
    ['Al-Qaeda External Communications Office', 'Affiliate coordination and external communications layer associated with al-Maghrebi.']
  ];
  return items.map(([name, summary]) => ({
    id: stableId('org', primaryName(name)),
    type: name.includes('Media') || ['Inspire', 'Resurgence'].includes(name) ? 'sub-organization' : 'organization',
    name,
    aliases: aliasesFor(name),
    summary,
    notes: summary,
    confidence: name.includes('HTS') || name.includes('Inspire') || name.includes('Resurgence') ? 'medium' : 'high',
    tags: ['al-qaeda-framework', name.includes('not current') || summary.includes('not Al-Qaeda') ? 'contextual-not-al-qaeda' : 'relationship-map'],
    sourceIds: inferSourceIds(name, summary, sourceIds),
    details: {
      orgType: name.includes('Media') || ['Inspire', 'Resurgence'].includes(name) ? 'Media organ' : 'Organization',
      ideologyOrFunction: summary,
      summary,
      analystNotes: summary
    }
  }));
}

function supplementalPeople(sourceIds) {
  const rows = [
    ['Hassan al-Banna', 'Founder of the Muslim Brotherhood; ideological background node, not an operational Al-Qaeda command link.', 'dead', 'ideological-background'],
    ['Sayyid Qutb', 'Muslim Brotherhood ideologue whose writings influenced later militant Islamist currents; ideological analysis only.', 'dead', 'ideological-background'],
    ['Abdullah Azzam', 'Palestinian cleric, Afghan jihad mobilizer, and MAK co-founder; killed in Peshawar in 1989.', 'dead', 'origin-network'],
    ['Abu Zubaydah', 'Post-9/11 capture/detention figure linked in public records to training/facilitation debates.', 'detained', 'detention-index'],
    ['Abd al-Rahim al-Nashiri', 'USS Cole case figure detained at Guantanamo.', 'detained', 'detention-index'],
    ['Zacarias Moussaoui', 'Arrested before 9/11 and later pleaded guilty in connection with the 9/11 conspiracy.', 'convicted', 'detention-index'],
    ['Hambali', 'Jemaah Islamiyah / Al-Qaeda-linked Southeast Asia figure captured in 2003.', 'detained', 'detention-index'],
    ['Abu Faraj al-Libi', 'Senior Al-Qaeda figure captured in Pakistan in 2004.', 'detained', 'detention-index']
  ];
  return rows.map(([name, summary, status, tag]) => ({
    id: stableId('person', name),
    type: 'person',
    name,
    aliases: [],
    summary,
    notes: summary,
    confidence: tag === 'ideological-background' ? 'medium' : 'high',
    tags: ['al-qaeda-framework', tag],
    sourceIds: inferSourceIds(name, summary, sourceIds),
    details: {
      fullName: name,
      roleTitle: tag === 'ideological-background' ? 'Ideological background' : 'Capture/detention index figure',
      status,
      profileSummary: summary,
      analystNotes: summary
    }
  }));
}

function locationSpecs(sourceIds) {
  const rows = [
    ['Afghanistan', 33.9391, 67.71, 'Country', 'Original sanctuary, Afghan jihad geography, Taliban context, and AQIS safe-haven concern.'],
    ['Pakistan', 30.3753, 69.3451, 'Country', 'Peshawar hub, post-9/11 refuge/capture geography, Abbottabad, AQIS corridor.'],
    ['Peshawar, Pakistan', 34.0151, 71.5249, 'City', 'MAK and Afghan jihad support hub in public historical accounts.'],
    ['Abbottabad, Pakistan', 34.1688, 73.2215, 'City', 'Location of the May 2011 Bin Laden raid.'],
    ['Rawalpindi, Pakistan', 33.5651, 73.0169, 'City', 'Khalid Sheikh Mohammed capture geography.'],
    ['Sudan', 12.8628, 30.2176, 'Country', 'Bin Laden organizational-building base during the 1992-1996 period.'],
    ['Iran', 32.4279, 53.688, 'Country', 'Senior-leadership and facilitation geography in public U.S. reporting; not an Al-Qaeda branch.'],
    ['Yemen', 15.5527, 48.5164, 'Country', 'AQAP base geography.'],
    ['Sanaa, Yemen', 15.3694, 44.191, 'City', 'AQAP prison-break and Yemeni government target geography.'],
    ['Aden, Yemen', 12.7855, 45.0187, 'City', 'USS Cole and Yemen maritime attack geography.'],
    ['Mukalla, Yemen', 14.5425, 49.1242, 'City', 'AQAP territorial and revenue peak geography.'],
    ['Somalia', 5.1521, 46.1996, 'Country', 'al-Shabaab base geography.'],
    ['Mogadishu, Somalia', 2.0469, 45.3182, 'City', 'al-Shabaab urban attack geography.'],
    ['Kenya', -0.0236, 37.9062, 'Country', 'al-Shabaab regional attack theater and 1998 embassy bombing context.'],
    ['Nairobi, Kenya', -1.2921, 36.8219, 'City', '1998 embassy bombing, Westgate, and DusitD2 attack geography.'],
    ['Manda Bay, Kenya', -2.1804, 40.9131, 'Region', 'Camp Simba / Manda Bay attack geography.'],
    ['Tanzania', -6.369, 34.8888, 'Country', '1998 embassy bombing country context.'],
    ['Dar es Salaam, Tanzania', -6.7924, 39.2083, 'City', '1998 U.S. Embassy bombing geography.'],
    ['Mali', 17.5707, -3.9962, 'Country', 'AQIM/JNIM base and Sahel insurgency geography.'],
    ['Bamako, Mali', 12.6392, -8.0029, 'City', 'Radisson Blu and JNIM capital-pressure attack geography.'],
    ['Kidal, Mali', 18.4411, 1.4078, 'City', 'Northern Mali / JNIM strategic geography.'],
    ['Timbuktu, Mali', 16.7666, -3.0026, 'City', 'Northern Mali and UN base attack geography.'],
    ['Burkina Faso', 12.2383, -1.5616, 'Country', 'JNIM expansion geography.'],
    ['Djibo, Burkina Faso', 14.0994, -1.6279, 'City', 'JNIM 2025 town seizure geography.'],
    ['Barsalogho, Burkina Faso', 13.449, -1.058, 'City', '2024 JNIM mass-casualty attack geography.'],
    ['Algeria', 28.0339, 1.6596, 'Country', 'GSPC/AQIM root geography.'],
    ['Algiers, Algeria', 36.7538, 3.0588, 'City', 'AQIM 2007 bombing geography.'],
    ['Libya', 26.3351, 17.2283, 'Country', 'Veteran-network, Benghazi case-file, and North Africa/Syria movement context.'],
    ['Egypt', 26.8206, 30.8025, 'Country', 'EIJ and Egyptian senior-cadre origin geography.'],
    ['Morocco', 31.7917, -7.0926, 'Country', 'North Africa public-source context and al-Maghrebi nationality context.'],
    ['Cote dIvoire', 7.54, -5.5471, 'Country', 'AQIM/JNIM coastal expansion attack geography.'],
    ['Grand-Bassam, Cote dIvoire', 5.2118, -3.7388, 'City', '2016 AQIM coastal attack geography.'],
    ['Syria', 34.8021, 38.9968, 'Country', 'Nusra, HTS, and Hurras al-Din theater.'],
    ['Idlib, Syria', 35.9306, 36.6339, 'City', 'Northwest Syria / former affiliate theater context.'],
    ['Kabul, Afghanistan', 34.5553, 69.2075, 'City', 'Zawahiri death and Taliban/AQ safe-haven controversy geography.'],
    ['Iraq', 33.2232, 43.6793, 'Country', 'AQI-to-ISIS legacy geography.'],
    ['Bangladesh', 23.685, 90.3563, 'Country', 'AQIS assassination campaign geography.'],
    ['India', 20.5937, 78.9629, 'Country', 'AQIS target/recruitment narrative geography.'],
    ['Saudi Arabia', 23.8859, 45.0792, 'Country', 'Bin Laden origin, Gulf War grievance, and AQAP Saudi/Yemen merger context.'],
    ['United States', 39.8283, -98.5795, 'Country', '9/11, Pensacola, legal/prosecution, and target geography.'],
    ['New York, United States', 40.7128, -74.006, 'City', '9/11 attack and 1993 WTC bombing geography.'],
    ['Washington, DC, United States', 38.9072, -77.0369, 'City', '9/11 attack and U.S. government/legal geography.'],
    ['Pensacola, Florida, United States', 30.4213, -87.2169, 'City', 'AQAP-claimed 2019 attack geography.'],
    ['Paris, France', 48.8566, 2.3522, 'City', 'Charlie Hebdo attack geography.']
  ];
  return rows.map(([name, lat, lng, level, summary]) => ({
    id: stableId('loc', name),
    type: 'location',
    name,
    aliases: [],
    summary,
    notes: summary,
    confidence: 'high',
    tags: ['al-qaeda-framework', 'broad-public-geography'],
    sourceIds: inferSourceIds(name, summary, sourceIds),
    details: {
      name,
      latitude: lat,
      longitude: lng,
      precisionLevel: level === 'City' ? 'City-level' : level === 'Region' ? 'Province-level' : 'Country-level',
      locationType: level,
      country: name.includes(',') ? name.split(',').at(-1).trim() : name,
      geocodeSource: 'Seeded broad public coordinates',
      originalQuery: name,
      resolvedName: name
    }
  }));
}

function parseScreenshotPeople(text, sourceIds) {
  const section = sectionBetween(text, '13. Benghazi screenshot-derived people index', '14. Event entity index');
  const names = [];
  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.includes(':') || line.startsWith('These are') || line.startsWith('Recommended')) continue;
    if (['Official prosecution layer', 'AQSL screenshot context names', 'AQI screenshot-derived names', 'AQIM Mali Group screenshot-derived names'].includes(line)) continue;
    for (const part of line.split(/\s{2,}|,/)) {
      const cleaned = part.replace(/\s+—.*$/, '').trim();
      if (cleaned && cleaned.length > 3) names.push(cleaned);
    }
  }
  return names.map((name) => ({
    id: stableId('person', name),
    type: 'person',
    name,
    aliases: [],
    summary: 'Screenshot-derived Benghazi/AQI/AQIM case-file name; stored for later corroboration only.',
    notes:
      'This name appears in the pasted screenshot-derived index. The pasted framework explicitly says these names should not be merged into confirmed Al-Qaeda profiles until matched to court records, State/Treasury designations, FBI/DOJ filings, UN listings, or reliable investigative reporting.',
    confidence: 'low',
    tags: ['al-qaeda-framework', 'screenshot-derived', 'needs-corroboration', 'case-file'],
    sourceIds: [sourceIds.local],
    details: {
      fullName: name,
      roleTitle: 'Screenshot-derived case-file name',
      status: 'Needs corroboration',
      profileSummary: 'Screenshot-derived case-file name; not treated as confirmed Al-Qaeda role.',
      analystNotes:
        'Preserve as a separate case-file layer. Do not treat as a confirmed operational relationship until independently sourced.'
    }
  }));
}

function eventRows(sourceIds) {
  const rows = [
    ['MAK formation / Afghan jihad mobilization', '1984', 'Relationship change', 'Peshawar, Pakistan', 'Origin event for the MAK / Arab-Afghan support network.'],
    ['Al-Qaeda founding', '1988', 'Relationship change', 'Afghanistan', 'Core organizational birth from the Afghan jihad support environment.'],
    ['Abdullah Azzam assassinated', '1989-11-24', 'Death', 'Peshawar, Pakistan', 'Azzam killed by car bomb with two sons.'],
    ['Sudan organizational-building period begins', '1992', 'Reported location', 'Sudan', 'Bin Laden builds business, logistics, and militant relationships in Sudan.'],
    ['Bin Laden returns to Afghanistan', '1996', 'Reported location', 'Afghanistan', 'Renewed Taliban-protected sanctuary phase.'],
    ['World Islamic Front declaration', '1998-02', 'Source publication', 'Afghanistan', 'Anti-U.S. ideological escalation associated with Bin Laden and Zawahiri.'],
    ['U.S. Embassy bombings in Kenya and Tanzania', '1998-08-07', 'Conflict event', 'Nairobi, Kenya', 'Al-Qaeda bombings of U.S. embassies in Nairobi and Dar es Salaam.'],
    ['Al-Qaeda designated U.S. FTO', '1999-10', 'Sanction/designation', 'United States', 'U.S. Foreign Terrorist Organization designation.'],
    ['USS Cole bombing', '2000-10-12', 'Conflict event', 'Aden, Yemen', 'Al-Qaeda attack against USS Cole in Aden harbor.'],
    ['September 11 attacks', '2001-09-11', 'Conflict event', 'New York, United States', 'Al-Qaeda attacks in New York, Washington, and Pennsylvania.'],
    ['U.S.-led invasion of Afghanistan', '2001-10', 'Conflict event', 'Afghanistan', 'Taliban sanctuary disrupted and Al-Qaeda leadership dispersed.'],
    ['Khalid Sheikh Mohammed captured', '2003-03-01', 'Arrest', 'Rawalpindi, Pakistan', 'KSM captured in Pakistan.'],
    ['Zarqawi pledges allegiance to Bin Laden', '2004-10', 'Relationship change', 'Iraq', 'Zarqawi network becomes Al-Qaeda in Iraq / AQI.'],
    ['Sanaa prison escape', '2006-02', 'Other', 'Sanaa, Yemen', 'Prison escape that helped seed AQAP leadership networks.'],
    ['GSPC aligns with Al-Qaeda', '2006-09', 'Relationship change', 'Algeria', 'GSPC alignment before adopting AQIM name.'],
    ['AQIM name adopted', '2007-01', 'Relationship change', 'Algeria', 'GSPC becomes AQIM.'],
    ['al-Shabaab designated U.S. FTO', '2008-03', 'Sanction/designation', 'Somalia', 'U.S. FTO designation for al-Shabaab.'],
    ['AQAP formation announced', '2009-01', 'Relationship change', 'Yemen', 'AQAP formed from Saudi and Yemeni extremist elements.'],
    ['Northwest Flight 253 attempted bombing', '2009-12-25', 'Conflict event', 'United States', 'AQAP attempted aviation attack.'],
    ['AQAP cargo bomb plot', '2010-10-29', 'Conflict event', 'Yemen', 'AQAP attempted cargo aircraft bomb plot.'],
    ['Osama bin Laden killed in Abbottabad', '2011-05-02', 'Death', 'Abbottabad, Pakistan', 'U.S. raid killed Bin Laden.'],
    ['Ayman al-Zawahiri succeeds Bin Laden', '2011-06', 'Leadership change', 'Afghanistan', 'Zawahiri becomes Al-Qaeda emir.'],
    ['AQAP / Ansar al-Sharia seizes territory in Abyan', '2011', 'Conflict event', 'Yemen', 'AQAP territorial/governance phase.'],
    ['al-Shabaab pledges loyalty to Al-Qaeda', '2012-02', 'Relationship change', 'Somalia', 'Formal public pledge to Al-Qaeda.'],
    ['Benghazi attack case layer', '2012-09', 'Conflict event', 'Libya', 'Stored as separate case-file layer with screenshot-derived names needing corroboration.'],
    ['Jabhat al-Nusra emerges in Syria', '2012', 'Relationship change', 'Syria', 'Al-Qaeda-aligned Syria organization emerges.'],
    ['Northern Mali jihadist takeover', '2012', 'Conflict event', 'Mali', 'AQIM/Ansar al-Din/MUJAO/Tuareg dynamics create major Sahel phase.'],
    ['In Amenas hostage crisis', '2013-01', 'Conflict event', 'Algeria', 'Sahel hostage crisis associated with Belmokhtar/al-Murabitun lineage.'],
    ['Westgate Mall attack', '2013-09', 'Conflict event', 'Nairobi, Kenya', 'al-Shabaab attack in Nairobi.'],
    ['Al-Qaeda disavows ISIS', '2014-02', 'Relationship change', 'Syria', 'Al-Qaeda/ISIS split becomes irreversible.'],
    ['AQIS formally announced', '2014-09', 'Relationship change', 'Afghanistan', 'Zawahiri announces Al-Qaeda in the Indian Subcontinent.'],
    ['AQIS Karachi Naval Dockyard attack attempt', '2014-09-06', 'Conflict event', 'Pakistan', 'Early AQIS attack attempt.'],
    ['Ahmed Abdi Godane killed', '2014-09', 'Death', 'Somalia', 'al-Shabaab leadership transition to Ahmed Diriye.'],
    ['Charlie Hebdo attack claimed by AQAP', '2015-01-07', 'Conflict event', 'Paris, France', 'AQAP claimed responsibility for the attack.'],
    ['AQAP seizes Mukalla', '2015-04', 'Conflict event', 'Mukalla, Yemen', 'AQAP territorial/revenue peak.'],
    ['Garissa University attack', '2015-04-02', 'Conflict event', 'Kenya', 'al-Shabaab mass-casualty attack in Kenya.'],
    ['Nasir al-Wuhayshi killed', '2015-06', 'Death', 'Yemen', 'AQAP founder killed.'],
    ['Radisson Blu Bamako attack', '2015-11-20', 'Conflict event', 'Bamako, Mali', 'AQIM/al-Murabitun hotel attack.'],
    ['Sayf al-Adl released from Iranian custody / restriction', '2015', 'Reported location', 'Iran', 'RFJ-described release in prisoner exchange.'],
    ['Grand-Bassam attack', '2016-03-13', 'Conflict event', 'Grand-Bassam, Cote dIvoire', 'AQIM coastal attack event.'],
    ['Xulhaz Mannan and Mahbub Tonoy murdered', '2016-04-25', 'Conflict event', 'Bangladesh', 'AQIS-claimed Bangladesh attack.'],
    ['Jabhat al-Nusra breaks from Al-Qaeda and rebrands', '2016-07', 'Relationship change', 'Syria', 'Nusra becomes Jabhat Fatah al-Sham path.'],
    ['HTS forms', '2017-01', 'Relationship change', 'Syria', 'HTS forms from JFS and other factions.'],
    ['JNIM forms', '2017-03', 'Relationship change', 'Mali', 'Ansar al-Din, al-Murabitun, Macina Liberation Front, and AQIM Sahara Emirate merge.'],
    ['Mogadishu truck bombing', '2017-10-14', 'Conflict event', 'Mogadishu, Somalia', 'al-Shabaab deadliest attack in Somalia.'],
    ['Hurras al-Din becomes Al-Qaeda Syria presence', '2018-02', 'Relationship change', 'Syria', 'Al-Qaeda-loyalist Syria affiliate forms after Nusra/HTS break.'],
    ['JNIM designated U.S. FTO', '2018-09', 'Sanction/designation', 'Mali', 'U.S. FTO designation.'],
    ['DusitD2 Hotel attack', '2019-01-15', 'Conflict event', 'Nairobi, Kenya', 'al-Shabaab Nairobi attack.'],
    ['Asim Umar killed', '2019', 'Death', 'Afghanistan', 'AQIS founder killed.'],
    ['Hamza bin Laden killed', '2019', 'Death', 'Afghanistan', 'U.S. confirms death in Afghanistan/Pakistan region.'],
    ['Pensacola attack', '2019-12-06', 'Conflict event', 'Pensacola, Florida, United States', 'AQAP later claimed the attack.'],
    ['Camp Simba / Manda Bay attack', '2020-01-05', 'Conflict event', 'Manda Bay, Kenya', 'al-Shabaab attack on U.S.-Kenyan facility.'],
    ['Qasim al-Raymi killed', '2020', 'Death', 'Yemen', 'AQAP leadership transition.'],
    ['Abdelmalek Droukdel killed', '2020-06', 'Death', 'Mali', 'AQIM leadership transition.'],
    ['Taliban returns to power in Afghanistan', '2021-08', 'Relationship change', 'Afghanistan', 'Safe-haven context shift for AQIS and Al-Qaeda remnants.'],
    ['Ayman al-Zawahiri killed in Kabul', '2022-07-31', 'Death', 'Kabul, Afghanistan', 'U.S. drone strike killed Zawahiri.'],
    ['Khalid Batarfi dies; Saad al-Awlaki succeeds', '2024-03', 'Leadership change', 'Yemen', 'AQAP succession.'],
    ['Lido Beach attack', '2024-08-02', 'Conflict event', 'Mogadishu, Somalia', 'al-Shabaab attack in Mogadishu.'],
    ['Barsalogho massacre', '2024-08-24', 'Conflict event', 'Barsalogho, Burkina Faso', 'JNIM mass-casualty attack according to pasted notes.'],
    ['Khalil Haqqani killed in Kabul', '2024-12', 'Death', 'Kabul, Afghanistan', 'Haqqani/Taliban event relevant to sanctuary network layer.'],
    ['Hurras al-Din announces dissolution', '2025-01', 'Relationship change', 'Syria', 'NCTC notes public dissolution in early 2025.'],
    ['JNIM seizes Djibo for hours', '2025-05-11', 'Conflict event', 'Djibo, Burkina Faso', 'JNIM temporary town seizure.'],
    ['JNIM fuel import blockade in Mali', '2025-09', 'Conflict event', 'Mali', 'Economic warfare/blockade event.'],
    ['Coordinated JNIM / Front for the Liberation of Azawad attacks across Mali', '2026-04-25', 'Conflict event', 'Kidal, Mali', 'NCTC-described coordinated attacks and Kidal capture.'],
    ['NCTC Al-Qaeda profile: decentralized affiliate network', '2026-05', 'Source publication', 'United States', 'Current public profile anchor in pasted notes.']
  ];
  return rows.map(([title, dateStart, eventType, locationName, description]) => ({
    id: stableId('event', title),
    title,
    eventType,
    dateStart,
    dateEnd: '',
    timeKnown: 0,
    locationId: stableId('loc', locationName),
    latitude: null,
    longitude: null,
    involvedPersonIds: [],
    involvedOrganizationIds: [],
    sourceIds: inferSourceIds(title, description, sourceIds),
    description,
    analystNotes: description,
    confidence: title.includes('Benghazi') ? 'low' : 'high',
    tags: ['al-qaeda-framework', 'timeline']
  }));
}

function noteFromSlice(text, title, start, end, tags = []) {
  const body = sectionBetween(text, start, end);
  return {
    id: stableId('note', title),
    parentType: 'project',
    parentId: PROJECT_ID,
    noteType: 'framework',
    title,
    body: body || `${start}\n\nSection not found in pasted framework archive.`,
    color: 'note',
    tags: ['al-qaeda-framework', ...tags]
  };
}

function frameworkNotes(text) {
  return [
    {
      id: 'note-framework-overview',
      parentType: 'project',
      parentId: PROJECT_ID,
      noteType: 'overview',
      title: 'Framework build notes and confidence limits',
      color: 'note',
      tags: ['al-qaeda-framework', 'source-confidence'],
      body:
        '# AL-QAEDA FRAMEWORK remake\n\n' +
        'This project was rebuilt from the pasted public-source framework stored at `data/alqaeda-framework-notes.md`.\n\n' +
        'Confidence handling:\n' +
        '- **High**: official or near-primary public sources such as NCTC, FBI, Rewards for Justice, State, Treasury, CIA, UN Monitoring Team, and the 9/11 Commission.\n' +
        '- **Medium**: reputable public reporting, encyclopedic summaries, and research-source synthesis.\n' +
        '- **Low / needs corroboration**: chart-derived or screenshot-derived claims, disputed deaths/statuses, and case-file names that the pasted notes say should be matched against court records, sanctions records, FBI/DOJ filings, UN listings, or reliable investigative reporting.\n\n' +
        'Parts 5 and the later Part Nine relationship-map block were intentionally stored as notes-only analytical material. Broad public locations and historical events from those sections may appear as map/timeline records, but financing, facilitation, courier, and media-infrastructure material is not converted into tactical graph instructions.'
    },
    noteFromSlice(text, 'Part 1: Public-source framework, origins, core, affiliates, timeline', '## Public-source framework, 1984–2026', '# PART 2', [
      'part-1'
    ]),
    noteFromSlice(text, 'Part 2: Affiliate depth', '# PART 2', '# PART 3', ['part-2']),
    noteFromSlice(text, 'Part 3: People, family networks, inner circles, rosters', '# PART 3', 'PART 4', ['part-3']),
    noteFromSlice(text, 'Part 4: Death, capture, detention, designation, sanctions index', 'PART 4', 'Part 5 should be financing', ['part-4']),
    noteFromSlice(text, 'Part 5 NOTES ONLY: Financing, facilitation, couriers, media, communications', 'PART 5 IS ONLY FOR NOTES', 'PART 6', [
      'part-5',
      'notes-only'
    ]),
    noteFromSlice(text, 'Part 6: Location, sanctuary, training-camp, regional geography', 'PART 6', 'PART 7', ['part-6']),
    noteFromSlice(text, 'Part 7: Master event timeline, 1984-2026', 'PART 7', 'PART 8', ['part-7']),
    noteFromSlice(text, 'Part 8: Organization-by-organization relationship map', 'PART 8', 'PART NINE IS ALSO NOTES', ['part-8']),
    noteFromSlice(text, 'Part 9 NOTES ONLY: Relationship map duplicate and analytical matrix', 'PART NINE IS ALSO NOTES', 'PART 10', [
      'part-9',
      'notes-only'
    ]),
    noteFromSlice(text, 'Part 10: Master entity list and platform structure', 'PART 10', '', ['part-10', 'master-index'])
  ];
}

function addOrMergeEntity(map, entity) {
  const existing = map.get(entity.id);
  if (!existing) {
    map.set(entity.id, entity);
    return;
  }
  const unique = (...lists) => Array.from(new Set(lists.flat().filter(Boolean)));
  map.set(entity.id, {
    ...existing,
    aliases: unique(existing.aliases, entity.aliases),
    summary: existing.summary || entity.summary,
    notes: unique([existing.notes, entity.notes]).join('\n\n'),
    confidence: existing.confidence === 'high' ? existing.confidence : entity.confidence,
    tags: unique(existing.tags, entity.tags),
    sourceIds: unique(existing.sourceIds, entity.sourceIds),
    details: {
      ...(existing.details || {}),
      ...(entity.details || {}),
      analystNotes: unique([existing.details?.analystNotes, entity.details?.analystNotes]).join('\n\n')
    }
  });
}

function buildEntities(text, sourceIds) {
  const part10 = text.slice(text.indexOf('PART 10') > -1 ? text.indexOf('PART 10') : 0);
  const entityMap = new Map();
  const orgSection = sectionBetween(part10, '2. Master organization index', '3. Al-Qaeda Core people index');
  for (const entry of parseIndexEntries(orgSection)) addOrMergeEntity(entityMap, organizationEntity(entry, sourceIds));
  for (const entity of supplementalOrganizations(sourceIds)) addOrMergeEntity(entityMap, entity);

  const peopleSections = [
    ['3. Al-Qaeda Core people index', '4. Bin Laden family index'],
    ['4. Bin Laden family index', '5. Zawahiri / Egyptian Islamic Jihad index'],
    ['5. Zawahiri / Egyptian Islamic Jihad index', '6. Haqqani / Taliban contextual people index'],
    ['6. Haqqani / Taliban contextual people index', '7. AQAP people index'],
    ['7. AQAP people index', '8. AQIM / GSPC / JNIM people index'],
    ['8. AQIM / GSPC / JNIM people index', '9. Al-Shabaab people index'],
    ['9. Al-Shabaab people index', '10. AQIS people index'],
    ['10. AQIS people index', '11. Syria / Nusra / HTS / Hurras index'],
    ['11. Syria / Nusra / HTS / Hurras index', '12. AQI / ISIS legacy people index'],
    ['12. AQI / ISIS legacy people index', '13. Benghazi screenshot-derived people index']
  ];
  for (const [start, end] of peopleSections) {
    for (const entry of parseIndexEntries(sectionBetween(part10, start, end))) addOrMergeEntity(entityMap, personEntity(entry, sourceIds));
  }
  for (const entity of supplementalPeople(sourceIds)) addOrMergeEntity(entityMap, entity);
  for (const entity of parseScreenshotPeople(part10, sourceIds)) addOrMergeEntity(entityMap, entity);
  for (const entity of locationSpecs(sourceIds)) addOrMergeEntity(entityMap, entity);
  return Array.from(entityMap.values());
}

function idFor(name, type = 'org') {
  if (type === 'person') return stableId('person', primaryName(name));
  if (type === 'loc') return stableId('loc', name);
  return stableId('org', primaryName(name));
}

function buildRelationships(entities, sourceIds) {
  const entityIds = new Set(entities.map((entity) => entity.id));
  const relationships = [];
  const seen = new Set();
  function add(sourceId, targetId, relationshipType, notes, status = 'active', confidence = 'high') {
    if (!entityIds.has(sourceId) || !entityIds.has(targetId)) return;
    const key = `${sourceId}|${targetId}|${relationshipType}|${status}`;
    if (seen.has(key)) return;
    seen.add(key);
    relationships.push({
      id: stableId('rel', key),
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      relationshipType,
      direction: 'directed',
      startDate: '',
      endDate: '',
      status,
      confidence,
      sourceIds: [sourceIds.local, sourceIds.core].filter(Boolean),
      notes
    });
  }
  const rels = [
    ['Maktab al-Khidamat', 'Al-Qaeda Core', 'predecessor_of', 'MAK is mapped as the predecessor/incubator network for Al-Qaeda Core.'],
    ['Egyptian Islamic Jihad', 'Al-Qaeda Core', 'predecessor_of', 'EIJ is mapped as merger cadre and predecessor/infusion network.'],
    ['AQAP', 'Al-Qaeda Core', 'part_of', 'Formal Al-Qaeda affiliate in Yemen.'],
    ['AQIM', 'Al-Qaeda Core', 'part_of', 'Formal Al-Qaeda affiliate in North Africa/Sahel.'],
    ['AQIS', 'Al-Qaeda Core', 'part_of', 'Formal Al-Qaeda affiliate in South Asia.'],
    ['Al-Shabaab', 'Al-Qaeda Core', 'part_of', 'Formal affiliate after public pledge in 2012.'],
    ['Hurras al-Din', 'Al-Qaeda Core', 'part_of', 'Former formal Syria affiliate; public dissolution in early 2025.', 'former'],
    ['Jabhat al-Nusra', 'Al-Qaeda Core', 'part_of', 'Former Syria affiliate before breakaway/rebrand.', 'former'],
    ['AQI', 'Al-Qaeda Core', 'part_of', 'Former Iraq branch and legacy branch.', 'former'],
    ['Taliban', 'Al-Qaeda Core', 'ally_of', 'Separate organization; sanctuary/protection relationship, not an affiliate.'],
    ['Haqqani Network', 'Al-Qaeda Core', 'ally_of', 'Separate Taliban-linked sanctuary and relationship network.'],
    ['Haqqani Network', 'Taliban', 'part_of', 'Taliban-linked militant-family network.'],
    ['Taliban', 'AQIS', 'ally_of', 'AQIS pledged allegiance to Taliban leader partly to secure safe haven according to pasted NCTC notes.'],
    ['GSPC', 'AQIM', 'predecessor_of', 'GSPC aligned with Al-Qaeda and became AQIM.'],
    ['Armed Islamic Group', 'GSPC', 'predecessor_of', 'GSPC emerged from the Algerian GIA environment.'],
    ['Ansar al-Din', 'JNIM', 'predecessor_of', 'One of the groups that merged into JNIM.'],
    ['Al-Murabitun', 'JNIM', 'predecessor_of', 'One of the groups that merged into JNIM.'],
    ['Macina Liberation Front', 'JNIM', 'predecessor_of', 'One of the groups that merged into JNIM.'],
    ['AQIM Sahara Emirate', 'JNIM', 'predecessor_of', 'AQIM Sahara subgroup merged into JNIM.'],
    ['Jabhat al-Nusra', 'Jabhat Fatah al-Sham', 'predecessor_of', 'Nusra rebrand after public break from Al-Qaeda.'],
    ['Jabhat Fatah al-Sham', 'Hayat Tahrir al-Sham', 'predecessor_of', 'JFS lineage becomes part of HTS.'],
    ['Jabhat al-Nusra', 'Hurras al-Din', 'predecessor_of', 'Nusra loyalists formed Hurras al-Din.'],
    ['AQI', 'Islamic State of Iraq', 'predecessor_of', 'AQI evolved into Islamic State of Iraq path.'],
    ['Islamic State of Iraq', 'Islamic State', 'predecessor_of', 'Islamic State of Iraq evolved into ISIS path.'],
    ['Islamic State', 'Al-Qaeda Core', 'rival_of', 'ISIS is a rival successor movement, not Al-Qaeda.'],
    ['Ansar al-Sharia Yemen', 'AQAP', 'part_of', 'Local governance/branding face associated with AQAP in Yemen.'],
    ['Al-Sahab Media', 'Al-Qaeda Core', 'part_of', 'Core media arm.'],
    ['Al-Malahem Media', 'AQAP', 'part_of', 'AQAP media wing.'],
    ['Inspire', 'AQAP', 'part_of', 'AQAP propaganda artifact; do not reproduce operational content.'],
    ['Resurgence', 'AQIS', 'part_of', 'AQIS/Al-Qaeda-associated propaganda environment.'],
    ['Al-Kataib Media', 'Al-Shabaab', 'part_of', 'al-Shabaab media wing.'],
    ['Al-Qaeda Shura Council', 'Al-Qaeda Core', 'part_of', 'Consultative leadership structure.'],
    ['Al-Qaeda Military Committee', 'Al-Qaeda Core', 'part_of', 'Military/security committee layer.'],
    ['Al-Qaeda External Communications Office', 'Al-Qaeda Core', 'part_of', 'External communications and affiliate coordination layer.']
  ];
  for (const [source, target, type, notes, status = 'active'] of rels) add(idFor(source), idFor(target), type, notes, status);

  const personLinks = [
    ['Osama bin Laden', 'Al-Qaeda Core', 'founded'],
    ['Osama bin Laden', 'Maktab al-Khidamat', 'co_founder_of'],
    ['Abdullah Azzam', 'Maktab al-Khidamat', 'co_founder_of'],
    ['Ayman al-Zawahiri', 'Al-Qaeda Core', 'leader_of'],
    ['Ayman al-Zawahiri', 'Egyptian Islamic Jihad', 'leader_of'],
    ['Sayf al-Adl', 'Al-Qaeda Core', 'head_of'],
    ['Sayf al-Adl', 'Al-Qaeda Military Committee', 'head_of'],
    ['Abd al-Rahman al-Maghrebi', 'Al-Sahab Media', 'head_of'],
    ['Abd al-Rahman al-Maghrebi', 'Al-Qaeda External Communications Office', 'head_of'],
    ['Yasin al-Suri', 'Al-Qaeda Core', 'liaison_to'],
    ['Muhsin al-Fadhli', 'Al-Qaeda Core', 'liaison_to'],
    ['Khalid Sheikh Mohammed', 'Al-Qaeda Core', 'member_of'],
    ['Abu Musab al-Zarqawi', 'AQI', 'leader_of'],
    ['Abu Bakr al-Baghdadi', 'Islamic State', 'leader_of'],
    ['Nasir al-Wuhayshi', 'AQAP', 'leader_of'],
    ['Qasim al-Raymi', 'AQAP', 'leader_of'],
    ['Khalid Batarfi', 'AQAP', 'leader_of'],
    ['Saad bin Atef al-Awlaki', 'AQAP', 'leader_of'],
    ['Ibrahim al-Banna', 'AQAP', 'member_of'],
    ['Ibrahim Ahmed Mahmoud al-Qosi', 'AQAP', 'member_of'],
    ['Anwar al-Awlaki', 'AQAP', 'member_of'],
    ['Samir Khan', 'AQAP', 'member_of'],
    ['Asim Umar', 'AQIS', 'leader_of'],
    ['Usama Mahmood', 'AQIS', 'leader_of'],
    ['Muhammad Maruf', 'AQIS', 'member_of'],
    ['Abdelmalek Droukdel', 'AQIM', 'leader_of'],
    ['Abu Ubaydah Yusuf al-Anabi', 'AQIM', 'leader_of'],
    ['Mokhtar Belmokhtar', 'Al-Murabitun', 'leader_of'],
    ['Iyad ag Ghali', 'JNIM', 'leader_of'],
    ['Iyad ag Ghali', 'Ansar al-Din', 'leader_of'],
    ['Amadou Kouffa', 'Macina Liberation Front', 'leader_of'],
    ['Ahmed Abdi Godane', 'Al-Shabaab', 'leader_of'],
    ['Ahmed Diriye', 'Al-Shabaab', 'leader_of'],
    ['Abukar Ali Adan', 'Al-Shabaab', 'deputy_of'],
    ['Mahad Karate', 'Al-Shabaab', 'head_of'],
    ['Jehad Serwan Mostafa', 'Al-Shabaab', 'member_of'],
    ['Abu Muhammad al-Julani', 'Jabhat al-Nusra', 'leader_of'],
    ['Abu Muhammad al-Julani', 'Hayat Tahrir al-Sham', 'leader_of'],
    ['Faruq al-Suri', 'Hurras al-Din', 'leader_of'],
    ['Sami al-Uraydi', 'Hurras al-Din', 'member_of'],
    ['Jalaluddin Haqqani', 'Haqqani Network', 'leader_of'],
    ['Sirajuddin Haqqani', 'Haqqani Network', 'leader_of'],
    ['Mullah Omar', 'Taliban', 'leader_of'],
    ['Haibatullah Akhundzada', 'Taliban', 'leader_of'],
    ['Mullah Yaqoob Mujahid', 'Taliban', 'member_of']
  ];
  for (const [person, org, type] of personLinks) add(idFor(person, 'person'), idFor(org), type, `${person} ${type.replaceAll('_', ' ')} ${org}.`);

  const familyLinks = [
    ['Osama bin Laden', 'Hamza bin Laden', 'parent_of'],
    ['Osama bin Laden', 'Saad bin Laden', 'parent_of'],
    ['Osama bin Laden', 'Khalid bin Laden', 'parent_of'],
    ['Osama bin Laden', 'Omar bin Laden', 'parent_of'],
    ['Osama bin Laden', 'Muhammad bin Laden', 'parent_of'],
    ['Muhammad Awad bin Laden', 'Osama bin Laden', 'parent_of'],
    ['Najwa Ghanem', 'Saad bin Laden', 'parent_of'],
    ['Najwa Ghanem', 'Omar bin Laden', 'parent_of'],
    ['Khairiah Sabar', 'Hamza bin Laden', 'parent_of'],
    ['Siham Sabar', 'Khalid bin Laden', 'parent_of'],
    ['Abd al-Rahman al-Maghrebi', 'Ayman al-Zawahiri', 'son_in_law_of'],
    ['Khalil Haqqani', 'Sirajuddin Haqqani', 'family_member_of'],
    ['Jalaluddin Haqqani', 'Sirajuddin Haqqani', 'parent_of']
  ];
  for (const [source, target, type] of familyLinks) add(idFor(source, 'person'), idFor(target, 'person'), type, `${source} ${type.replaceAll('_', ' ')} ${target}.`);

  const locations = [
    ['Al-Qaeda Core', 'Afghanistan'],
    ['Al-Qaeda Core', 'Pakistan'],
    ['Al-Qaeda Core', 'Sudan'],
    ['Al-Qaeda Core', 'Iran'],
    ['AQAP', 'Yemen'],
    ['AQIM', 'Algeria'],
    ['AQIM', 'Mali'],
    ['JNIM', 'Mali'],
    ['JNIM', 'Burkina Faso'],
    ['Al-Shabaab', 'Somalia'],
    ['Al-Shabaab', 'Kenya'],
    ['AQIS', 'Afghanistan'],
    ['AQIS', 'Pakistan'],
    ['AQIS', 'Bangladesh'],
    ['Hurras al-Din', 'Syria'],
    ['Jabhat al-Nusra', 'Syria'],
    ['AQI', 'Iraq'],
    ['Taliban', 'Afghanistan'],
    ['Haqqani Network', 'Afghanistan'],
    ['Haqqani Network', 'Pakistan']
  ];
  for (const [org, loc] of locations) add(idFor(org), idFor(loc, 'loc'), 'operates_in', `${org} operates in or is historically tied to ${loc}.`);
  return relationships;
}

function linkEvents(events, entities) {
  const byName = new Map(entities.map((entity) => [entity.name.toLowerCase(), entity.id]));
  const orgKeywords = [
    ['aqap', 'AQAP'],
    ['aqim', 'AQIM'],
    ['jnim', 'JNIM'],
    ['shabaab', 'Al-Shabaab'],
    ['aqis', 'AQIS'],
    ['hurras', 'Hurras al-Din'],
    ['nusra', 'Jabhat al-Nusra'],
    ['isis', 'Islamic State / ISIS'],
    ['aqi', 'AQI — Al-Qaeda in Iraq'],
    ['taliban', 'Taliban'],
    ['haqqani', 'Haqqani Network'],
    ['gspc', 'GSPC — Salafist Group for Preaching and Combat'],
    ['al-qaeda', 'Al-Qaeda Core / AQC']
  ];
  const peopleKeywords = [
    ['bin laden', 'Osama bin Laden'],
    ['zawahiri', 'Ayman al-Zawahiri'],
    ['sayf al-adl', 'Sayf al-Adl'],
    ['khalid sheikh mohammed', 'Khalid Sheikh Mohammed'],
    ['zarqawi', 'Abu Musab al-Zarqawi'],
    ['hamza bin laden', 'Hamza bin Laden'],
    ['asim umar', 'Asim Umar'],
    ['droukdel', 'Abdelmalek Droukdel'],
    ['godane', 'Ahmed Abdi Godane'],
    ['khalil haqqani', 'Khalil Haqqani'],
    ['nasir al-wuhayshi', 'Nasir al-Wuhayshi']
  ];
  return events.map((event) => {
    const text = `${event.title} ${event.description}`.toLowerCase();
    const involvedOrganizationIds = orgKeywords
      .filter(([keyword]) => text.includes(keyword))
      .map(([, name]) => byName.get(name.toLowerCase()))
      .filter(Boolean);
    const involvedPersonIds = peopleKeywords
      .filter(([keyword]) => text.includes(keyword))
      .map(([, name]) => byName.get(name.toLowerCase()))
      .filter(Boolean);
    return {
      ...event,
      involvedOrganizationIds: Array.from(new Set(involvedOrganizationIds)),
      involvedPersonIds: Array.from(new Set(involvedPersonIds))
    };
  });
}

function buildClaims(sourceIds) {
  return [
    {
      id: 'claim-core-plus-affiliates',
      claimText:
        'Al-Qaeda is best understood as a weakened core leadership network plus regional affiliates rather than a single centralized army.',
      claimType: 'network-structure',
      linkedEntityId: idFor('Al-Qaeda Core'),
      sourceIds: [sourceIds.core, sourceIds.local].filter(Boolean),
      confidence: 'high',
      status: 'supported',
      notes: 'Anchored to the pasted NCTC 2026 framing and analyst notes.'
    },
    {
      id: 'claim-taliban-not-branch',
      claimText: 'The Taliban and Haqqani Network are contextual sanctuary/alliance nodes, not Al-Qaeda branches.',
      claimType: 'classification',
      linkedEntityId: idFor('Taliban'),
      sourceIds: [sourceIds.haqqani, sourceIds.aqis, sourceIds.local].filter(Boolean),
      confidence: 'high',
      status: 'supported',
      notes: 'Used as a classification boundary throughout the graph.'
    },
    {
      id: 'claim-screenshot-names-uncorroborated',
      claimText: 'Benghazi/AQI/AQIM screenshot-derived names require corroboration before being treated as confirmed Al-Qaeda profiles.',
      claimType: 'source-confidence',
      linkedEntityId: '',
      sourceIds: [sourceIds.local],
      confidence: 'high',
      status: 'supported',
      notes: 'The pasted framework explicitly recommends separate case-file treatment.'
    }
  ];
}

function buildOpenQuestions() {
  return [
    {
      id: 'open-question-chart-shura-claims',
      question: 'Which TIC chart Shura Council or military-committee labels can be independently corroborated?',
      priority: 'high',
      status: 'open',
      notes: 'Keep chart-derived claims tagged until matched to official, court, UN, RFJ/FBI, or reliable research sources.'
    },
    {
      id: 'open-question-benghazi-screenshot-derived',
      question: 'Which Benghazi screenshot-derived names match court records, DOJ/FBI filings, sanctions records, or reliable reporting?',
      priority: 'high',
      status: 'open',
      notes: 'Do not merge these into confirmed Al-Qaeda profiles until corroborated.'
    },
    {
      id: 'open-question-current-statuses',
      question: 'Which contested or public-reported deaths/statuses need a fresh update check before publication?',
      priority: 'medium',
      status: 'open',
      notes: 'Especially use for older Sahel, Syria, and Iran-based leadership claims.'
    }
  ];
}

function buildStickyNotes() {
  return [
    {
      id: 'sticky-notes-only-parts',
      title: 'Notes-only guardrail',
      body: 'Part 5 and Part 9 are stored as notebook material. Use broad events/locations only; avoid tactical graphing of facilitation details.',
      color: 'yellow',
      attachedToNodeId: '',
      attachedToRelationshipId: '',
      x: 120,
      y: 120,
      width: 280,
      height: 150
    },
    {
      id: 'sticky-confidence',
      title: 'Confidence rule',
      body: 'Official-high = high. Public-reported = medium/high. Chart or screenshot-derived = low until corroborated.',
      color: 'blue',
      attachedToNodeId: '',
      attachedToRelationshipId: '',
      x: 430,
      y: 120,
      width: 280,
      height: 150
    }
  ];
}

function buildFrameworkData() {
  const text = readFrameworkText();
  const sources = extractSources(text);
  const sourceIds = buildSourceHelpers(sources);
  const entities = buildEntities(text, sourceIds);
  const relationships = buildRelationships(entities, sourceIds);
  const events = linkEvents(eventRows(sourceIds), entities);
  const notes = frameworkNotes(text);
  return {
    project: {
      id: PROJECT_ID,
      title: 'AL-QAEDA FRAMEWORK',
      description:
        'Public-source OSINT framework covering Al-Qaeda Core, affiliates, contextual sanctuary networks, legacy branches, family networks, timeline events, locations, sources, and notes-only infrastructure analysis.',
      category: 'Public-source terrorism network research',
      status: 'active',
      tags: ['al-qaeda-framework', 'public-source', 'osint', '1984-2026', 'notes-only-parts-5-and-9'],
      defaultMapCenter: { lat: 18.5, lng: 31, label: 'Afghanistan, Middle East, Africa, and South Asia overview' },
      defaultMapZoom: 3,
      notes:
        'Remade from the pasted public-source AL-QAEDA FRAMEWORK notes. Parts 5 and 9 are intentionally notes-only except for broad public locations/events. Source confidence is ranked conservatively: official-high, research-high, public-reported, contested, chart-derived, screenshot-derived.'
    },
    sources,
    entities,
    relationships,
    events,
    notes,
    claims: buildClaims(sourceIds),
    openQuestions: buildOpenQuestions(),
    stickyNotes: buildStickyNotes()
  };
}

export const frameworkData = buildFrameworkData();

export function seedDemo(store) {
  const existing = store.getProject(frameworkData.project.id);
  if (existing) return existing;
  const project = store.createProject(frameworkData.project);
  for (const source of frameworkData.sources) store.createSource(project.id, source);
  for (const entity of frameworkData.entities) store.createEntity(project.id, entity);
  for (const relationship of frameworkData.relationships) store.createRelationship(project.id, relationship);
  for (const event of frameworkData.events) store.createEvent(project.id, event);
  for (const note of frameworkData.notes) store.createNote(project.id, note);
  for (const claim of frameworkData.claims) store.createClaim(project.id, claim);
  for (const question of frameworkData.openQuestions) store.createOpenQuestion(project.id, question);
  for (const stickyNote of frameworkData.stickyNotes) store.createStickyNote(project.id, stickyNote);
  return store.getProject(project.id);
}
