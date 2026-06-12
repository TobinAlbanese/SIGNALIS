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

function datePrecision(value = '') {
  if (/^\d{4}$/.test(value)) return 'year';
  if (/^\d{4}-\d{2}$/.test(value)) return 'month';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'day';
  return value ? 'text' : 'unknown';
}

function locationFunctionTags(summary = '') {
  const text = summary.toLowerCase();
  const tags = [];
  if (text.includes('sanctuary') || text.includes('safe-haven') || text.includes('refuge')) tags.push('function-sanctuary');
  if (text.includes('training')) tags.push('function-training-geography');
  if (text.includes('transit') || text.includes('corridor') || text.includes('pipeline')) tags.push('function-transit-corridor');
  if (text.includes('base')) tags.push('function-affiliate-base');
  if (text.includes('attack')) tags.push('function-attack-theater');
  if (text.includes('revenue') || text.includes('finance') || text.includes('funding')) tags.push('function-finance-geography');
  if (text.includes('media') || text.includes('communications')) tags.push('function-media-communications-node');
  if (text.includes('prison') || text.includes('detention') || text.includes('capture')) tags.push('function-prison-detention-geography');
  if (text.includes('symbolic') || text.includes('narrative')) tags.push('function-symbolic-geography');
  return tags;
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
    ['Al-Qaeda External Communications Office', 'Affiliate coordination and external communications layer associated with al-Maghrebi.'],
    ['AQAP Prison Network', 'AQAP reconstitution layer tied to prison escapes, former detainees, and leadership recruitment effects.'],
    ['AQAP Former Detainee Layer', 'AQAP personnel layer involving former detainees and later leadership/media roles.'],
    ['AQAP Territorial Governance Layer', 'AQAP/Ansar al-Sharia local governance and territorial-control layer in Yemen.'],
    ['AQAP Aviation Plot Cell', 'AQAP external aviation-plot case-file layer for Flight 253 and cargo/printer-cartridge attempts.'],
    ['AQIM Sahara Kidnapping Economy', 'AQIM/Sahel hostage, ransom, and desert-mobility economy described in the affiliate-depth notes.'],
    ['JNIM Siege and Blockade Economy', 'JNIM coercive route-control, blockade, and siege pressure layer in Mali/Sahel.'],
    ['al-Shabaab Amniyat', 'al-Shabaab intelligence/security wing; tied to internal security, coercion, and attacks in public-source reporting.'],
    ['al-Shabaab Finance Wing', 'al-Shabaab taxation/extortion and finance bureaucracy described in public-source reporting.'],
    ['al-Shabaab Military Wing', 'al-Shabaab military command and battlefield structure.'],
    ['AQIS Recruitment Network', 'AQIS recruitment and South Asia outreach layer associated with Muhammad Maruf and regional propaganda.'],
    ['AQIS Bangladesh Attack Cell', 'AQIS Bangladesh assassination-campaign case-file layer from the notes.'],
    ['Syria Split File', 'Nusra, ISIS, JFS, HTS, and Hurras relationship-chain case-file layer.'],
    ['Hurras al-Din Remnants', 'Former Hurras al-Din members and post-dissolution threat layer after early 2025.'],
    ['Libyan Islamic Fighting Group / LIFG', 'Historical Libyan veteran-network overlap; not a clean formal Al-Qaeda affiliate.'],
    ['Tehrik-e-Taliban Pakistan / TTP', 'Pakistan/Afghanistan borderland overlap network; separate from Al-Qaeda.'],
    ['Islamic Movement of Uzbekistan / IMU', 'Central Asian militant ecosystem overlap in Afghanistan/Pakistan.'],
    ['Islamic Jihad Union / IJU', 'Central Asian militant ecosystem overlap in Afghanistan/Pakistan.'],
    ['Turkistan Islamic Party / ETIM', 'Theater-overlap group in Afghanistan/Pakistan and Syria; not a formal Al-Qaeda branch.'],
    ['Lashkar-e-Taiba / LeT', 'South Asian ecosystem-overlap group; not an Al-Qaeda affiliate.'],
    ['Jaish-e-Mohammed / JeM', 'South Asian ecosystem-overlap group; not an Al-Qaeda affiliate.'],
    ['Jemaah Islamiyah / JI', 'Southeast Asian Al-Qaeda-linked historical partner network.'],
    ['Abu Sayyaf Group', 'Southeast Asian overlap group with historical links in parts and later fragmentation.'],
    ['Ansaru', 'West Africa AQIM/JNIM-adjacent overlap group; more relevant than Boko Haram for Al-Qaeda mapping.'],
    ['Boko Haram', 'West Africa contextual actor; later ISIS alignment dominates.'],
    ['ISWAP', 'ISIS-aligned West Africa actor; contextual rival/overlap, not Al-Qaeda.'],
    ['Hezbollah', 'Contextual regional actor; not an Al-Qaeda branch.'],
    ['IRGC / Quds Force', 'Iran-context actor for the Iran-based Al-Qaeda file; not an Al-Qaeda branch.'],
    ['Hamas', 'Contextual regional actor; not an Al-Qaeda branch.'],
    ['Palestinian Islamic Jihad', 'Contextual regional actor; not an Al-Qaeda branch.'],
    ['Houthis', 'Yemen contextual enemy/target relationship for AQAP; not Al-Qaeda.'],
    ['U.S. State Department', 'Legal designation source for FTO and SDGT records.'],
    ['Federal Bureau of Investigation', 'Wanted, case-history, and investigative source layer.'],
    ['Rewards for Justice', 'Reward-offer and wanted-profile source layer.'],
    ['U.S. Department of the Treasury', 'Sanctions and terrorism-finance designation source layer.'],
    ['United Nations Security Council Monitoring Team', 'UN ISIL/Al-Qaeda monitoring and sanctions report source layer.']
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
    ['Abu Faraj al-Libi', 'Senior Al-Qaeda figure captured in Pakistan in 2004.', 'detained', 'detention-index'],
    ['Hamza Salih bin Said al-Ghamdi', 'Senior Al-Qaeda figure in the pasted core leadership notes; wanted and tied to Bin Laden inner-circle/security context.', 'wanted', 'core-leadership'],
    ['Nabila al-Zawahiri', 'Publicly identified daughter of Ayman al-Zawahiri and wife of Abd al-Rahman al-Maghrebi.', 'public-reported', 'zawahiri-family'],
    ['Azza Ahmed Nowari', 'Publicly discussed wife of Ayman al-Zawahiri; family-context node only.', 'dead', 'zawahiri-family'],
    ['Mohammed al-Zawahiri', 'Child of Ayman al-Zawahiri publicly reported killed after a U.S. strike in Afghanistan in late 2001.', 'dead', 'zawahiri-family'],
    ['Aisha al-Zawahiri', 'Child of Ayman al-Zawahiri publicly reported killed after a U.S. strike in Afghanistan in late 2001.', 'dead', 'zawahiri-family'],
    ['Khadijah', 'Publicly listed wife of Osama bin Laden; divorced 1995; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Unknown wife of Osama bin Laden', 'Briefly married to Osama bin Laden in 1996 according to public profiles; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Abdullah bin Laden', 'Publicly listed son of Osama bin Laden and Najwa Ghanem; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Abdul Rahman bin Laden', 'Publicly listed son of Osama bin Laden and Najwa Ghanem; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Osman bin Laden', 'Publicly listed son of Osama bin Laden and Najwa Ghanem; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Fatima bin Laden', 'Publicly listed daughter of Osama bin Laden and Najwa Ghanem; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Iman bin Laden', 'Publicly listed daughter of Osama bin Laden and Najwa Ghanem; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Ladin Bakir bin Laden', 'Publicly listed child of Osama bin Laden and Najwa Ghanem; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Rukhaiya bin Laden', 'Publicly listed daughter of Osama bin Laden and Najwa Ghanem; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Nour bin Laden', 'Publicly listed child of Osama bin Laden and Najwa Ghanem; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Ali bin Laden', 'Publicly listed child of Osama bin Laden and Khadijah; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Amer bin Laden', 'Publicly listed child of Osama bin Laden and Khadijah; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Aisha bin Laden', 'Publicly listed child of Osama bin Laden and Khadijah; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Khadijah bin Laden', 'Publicly listed daughter of Osama bin Laden and Siham Sabar; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Miriam bin Laden', 'Publicly listed daughter of Osama bin Laden and Siham Sabar; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Sumaiya bin Laden', 'Publicly listed daughter of Osama bin Laden and Siham Sabar; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Safiyah bin Laden', 'Publicly listed child of Osama bin Laden and Amal Ahmed al-Sadah; Abbottabad household context.', 'public-reported', 'bin-laden-family'],
    ['Aasia bin Laden', 'Publicly listed child of Osama bin Laden and Amal Ahmed al-Sadah; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Ibrahim bin Laden', 'Publicly listed child of Osama bin Laden and Amal Ahmed al-Sadah; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Zainab bin Laden', 'Publicly listed child of Osama bin Laden and Amal Ahmed al-Sadah; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Hussain bin Laden', 'Publicly listed child of Osama bin Laden and Amal Ahmed al-Sadah; family-context node.', 'public-reported', 'bin-laden-family'],
    ['Haji Mali Khan', 'Haqqani Network figure included in the Haqqani/Taliban contextual people index.', 'public-reported', 'haqqani-family'],
    ['Avijit Roy', 'Bangladesh secular writer killed in the AQIS-linked attack sequence; victim/case-file node.', 'dead', 'aqis-bangladesh-case'],
    ['Faisal Arefin Dipan', 'Bangladesh publisher killed in the AQIS-linked attack sequence; victim/case-file node.', 'dead', 'aqis-bangladesh-case'],
    ['Xulhaz Mannan', 'Bangladesh LGBTQIA+ activist killed in AQIS-claimed 2016 attack; victim/case-file node.', 'dead', 'aqis-bangladesh-case'],
    ['Mahbub Tonoy', 'Bangladesh activist killed in AQIS-claimed 2016 attack; victim/case-file node.', 'dead', 'aqis-bangladesh-case']
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
    ['Abyan, Yemen', 13.6343, 46.0563, 'Region', 'AQAP territorial phase and Zinjibar/Abyan governance geography.'],
    ['Zinjibar, Yemen', 13.1287, 45.3807, 'City', 'AQAP/Ansar al-Sharia territorial-control geography in Abyan.'],
    ['Shabwah, Yemen', 14.7546, 46.5163, 'Region', 'Broad AQAP base and conflict geography.'],
    ['Hadramawt, Yemen', 16.9304, 49.3653, 'Region', 'AQAP base and Mukalla territorial/revenue geography.'],
    ['al-Bayda, Yemen', 14.2073, 45.4498, 'Region', 'AQAP broad operating area and Yakla/al-Bayda raid geography.'],
    ['Marib, Yemen', 15.4707, 45.3229, 'Region', 'Broad AQAP/Yemen conflict geography.'],
    ['Somalia', 5.1521, 46.1996, 'Country', 'al-Shabaab base geography.'],
    ['Mogadishu, Somalia', 2.0469, 45.3182, 'City', 'al-Shabaab urban attack geography.'],
    ['Lower Shabelle, Somalia', 1.8766, 44.737, 'Region', 'al-Shabaab base, taxation, and military geography.'],
    ['Jubaland, Somalia', 0.526, 42.772, 'Region', 'al-Shabaab base and Kenya-border projection geography.'],
    ['Bay and Bakool, Somalia', 3.216, 43.65, 'Region', 'al-Shabaab southern/central Somalia operating geography.'],
    ['Kenya', -0.0236, 37.9062, 'Country', 'al-Shabaab regional attack theater and 1998 embassy bombing context.'],
    ['Nairobi, Kenya', -1.2921, 36.8219, 'City', '1998 embassy bombing, Westgate, and DusitD2 attack geography.'],
    ['Garissa, Kenya', -0.4532, 39.6461, 'City', 'al-Shabaab Garissa University attack geography.'],
    ['Manda Bay, Kenya', -2.1804, 40.9131, 'Region', 'Camp Simba / Manda Bay attack geography.'],
    ['Tanzania', -6.369, 34.8888, 'Country', '1998 embassy bombing country context.'],
    ['Dar es Salaam, Tanzania', -6.7924, 39.2083, 'City', '1998 U.S. Embassy bombing geography.'],
    ['Mali', 17.5707, -3.9962, 'Country', 'AQIM/JNIM base and Sahel insurgency geography.'],
    ['Bamako, Mali', 12.6392, -8.0029, 'City', 'Radisson Blu and JNIM capital-pressure attack geography.'],
    ['Kidal, Mali', 18.4411, 1.4078, 'City', 'Northern Mali / JNIM strategic geography.'],
    ['Gao, Mali', 16.263, -0.027, 'City', 'Northern Mali AQIM/JNIM and 2012 takeover geography.'],
    ['Mopti, Mali', 14.4843, -4.1829, 'Region', 'Central Mali / Macina and JNIM rural-expansion geography.'],
    ['Timbuktu, Mali', 16.7666, -3.0026, 'City', 'Northern Mali and UN base attack geography.'],
    ['Burkina Faso', 12.2383, -1.5616, 'Country', 'JNIM expansion geography.'],
    ['Ouagadougou, Burkina Faso', 12.3714, -1.5197, 'City', 'AQIM/JNIM-linked hotel and capital attack geography.'],
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
    ['Aleppo, Syria', 36.2021, 37.1343, 'City', 'Syria bombing-wave and former affiliate theater geography.'],
    ['Damascus, Syria', 33.5138, 36.2765, 'City', 'Syria attack geography including Hurras-linked bus attack notes.'],
    ['Raqqah, Syria', 35.9594, 39.0079, 'Region', 'Hurras al-Din 2021 attack geography.'],
    ['Latakia, Syria', 35.5317, 35.7901, 'Region', '2023/2025 Syria former-Hurras and Ansar al-Islam violence geography.'],
    ['Tartus, Syria', 34.8959, 35.8867, 'Region', '2025 former-Hurras violence geography in the pasted notes.'],
    ['Kabul, Afghanistan', 34.5553, 69.2075, 'City', 'Zawahiri death and Taliban/AQ safe-haven controversy geography.'],
    ['Iraq', 33.2232, 43.6793, 'Country', 'AQI-to-ISIS legacy geography.'],
    ['Karachi, Pakistan', 24.8607, 67.0011, 'City', 'AQIS Karachi Naval Dockyard attack attempt and Pakistan urban attack geography.'],
    ['Bangladesh', 23.685, 90.3563, 'Country', 'AQIS assassination campaign geography.'],
    ['Dhaka, Bangladesh', 23.8103, 90.4125, 'City', 'AQIS Bangladesh blogger/publisher and Xulhaz/Mahbub attack geography.'],
    ['India', 20.5937, 78.9629, 'Country', 'AQIS target/recruitment narrative geography.'],
    ['Kashmir', 34.0837, 74.7973, 'Region', 'AQIS/South Asia narrative and recruitment geography.'],
    ['Saudi Arabia', 23.8859, 45.0792, 'Country', 'Bin Laden origin, Gulf War grievance, and AQAP Saudi/Yemen merger context.'],
    ['Riyadh, Saudi Arabia', 24.7136, 46.6753, 'City', 'Bin Laden origin and Saudi militancy context.'],
    ['Kuwait', 29.3117, 47.4818, 'Country', 'Khalid Sheikh Mohammed public birth-place context.'],
    ['Guantanamo Bay', 19.906, -75.096, 'Region', 'Detention geography for publicly detained Al-Qaeda case figures.'],
    ['Germany', 51.1657, 10.4515, 'Country', 'Hamburg cell and al-Maghrebi public biography context.'],
    ['Hamburg, Germany', 53.5511, 9.9937, 'City', '9/11 Hamburg cell planning/recruitment geography.'],
    ['Southeast Asia', 8.0, 115.0, 'Region', 'Jemaah Islamiyah, Hambali, Bali, and Al-Qaeda-linked regional ecosystem geography.'],
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
    tags: ['al-qaeda-framework', 'broad-public-geography', ...locationFunctionTags(summary)],
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
  rows.push(
    ['Limburg tanker bombing', '2002-10', 'Conflict event', 'Yemen', 'Al-Qaeda-linked militants attacked the French oil tanker Limburg off Yemen.'],
    ['U.S. Embassy attack in Sanaa', '2008', 'Conflict event', 'Sanaa, Yemen', 'Pre-AQAP escalation event in Yemen.'],
    ['Attempted assassination of Saudi Prince Mohammed bin Nayef', '2009-08', 'Conflict event', 'Saudi Arabia', 'AQAP attempted to assassinate Saudi Arabia counterterrorism chief.'],
    ['AQAP designated U.S. FTO and SDGT', '2010-01', 'Sanction/designation', 'United States', 'AQAP designated as a Foreign Terrorist Organization and SDGT entity.'],
    ['Inspire begins', '2010', 'Source publication', 'Yemen', 'AQAP begins English-language Inspire media era; catalogue as propaganda artifact only.'],
    ['Anwar al-Awlaki and Samir Khan killed', '2011-09', 'Death', 'Yemen', 'AQAP English-language media figures killed.'],
    ['Sanaa military parade rehearsal bombing', '2012-05', 'Conflict event', 'Sanaa, Yemen', 'AQAP-linked attack against Yemeni soldiers.'],
    ['Yemen Ministry of Defense attack', '2013-12', 'Conflict event', 'Sanaa, Yemen', 'AQAP attack against Yemen Ministry of Defense complex.'],
    ['Sanaa central prison break', '2014-02', 'Other', 'Sanaa, Yemen', 'AQAP frees prisoners from Sana’a Central Prison.'],
    ['AQAP Mukalla governance period', '2015', 'Other', 'Mukalla, Yemen', 'AQAP governance/territorial-control period around Mukalla.'],
    ['AQAP pushed from Mukalla', '2016-04', 'Conflict event', 'Mukalla, Yemen', 'AQAP loses major territorial/revenue base.'],
    ['Yakla / al-Bayda raid', '2017-01', 'Conflict event', 'al-Bayda, Yemen', 'Yakla/al-Bayda raid in AQAP-related geography.'],
    ['GSPC formed', '1998', 'Relationship change', 'Algeria', 'GSPC formed as AQIM predecessor.'],
    ['European tourist kidnappings in the Sahara', '2003', 'Conflict event', 'Algeria', 'Sahara kidnapping economy event in AQIM/GSPC lineage.'],
    ['Christopher Leggett killing', '2009-06', 'Conflict event', 'Mali', 'AQIM/Sahel event from the affiliate-depth notes.'],
    ['Michel Germaneau hostage execution', '2010', 'Conflict event', 'Mali', 'AQIM hostage case in the Sahel.'],
    ['Arab Spring and Libya weapons dispersal', '2011', 'Other', 'Libya', 'Regional destabilization and weapons dispersal context for AQIM/Sahel networks.'],
    ['Algiers bombings', '2007-04', 'Conflict event', 'Algiers, Algeria', 'AQIM conducts major bombings in Algeria.'],
    ['Algiers UN and Constitutional Court bombings', '2007-12-11', 'Conflict event', 'Algiers, Algeria', 'AQIM car bomb attacks against UN offices and Algeria Constitutional Court.'],
    ['Ouagadougou attack', '2016-01-15', 'Conflict event', 'Ouagadougou, Burkina Faso', 'AQIM militants attacked a luxury hotel and police station.'],
    ['Ouagadougou attacks', '2018-03', 'Conflict event', 'Ouagadougou, Burkina Faso', 'JNIM-linked Ouagadougou attacks from the affiliate-depth notes.'],
    ['Timbuktu UN base attack', '2018-04-14', 'Conflict event', 'Timbuktu, Mali', 'JNIM complex attack near Timbuktu Airport against UN base.'],
    ['Central Mali expansion', '2019', 'Conflict event', 'Mopti, Mali', 'JNIM and Macina/Katibat Macina rural expansion phase.'],
    ['JNIM kidnapping and extortion networks expand', '2023', 'Other', 'Mali', 'JNIM kidnapping/extortion network phase from the notes.'],
    ['JNIM kidnaps UAE royal family member near Bamako', '2025-09-26', 'Conflict event', 'Bamako, Mali', 'JNIM hostage/ransom event near Bamako.'],
    ['al-Shabaab emerges from ICU environment', '2006', 'Relationship change', 'Somalia', 'al-Shabaab emerges after Islamic Courts Union military-wing environment.'],
    ['Hargeisa and Bosaso bombings', '2008', 'Conflict event', 'Somalia', 'al-Shabaab attack sequence in the affiliate-depth notes.'],
    ['Beledweyne bombing', '2009', 'Conflict event', 'Somalia', 'al-Shabaab bombing event in the affiliate-depth notes.'],
    ['Kampala World Cup bombings', '2010-07', 'Conflict event', 'Somalia', 'al-Shabaab regional external attack capability event.'],
    ['Mogadishu offensive / famine-era attacks', '2011', 'Conflict event', 'Mogadishu, Somalia', 'al-Shabaab Mogadishu offensive and famine-era attack context.'],
    ['Mogadishu 2011 truck bombing', '2011-10', 'Conflict event', 'Mogadishu, Somalia', 'al-Shabaab truck bombing in Mogadishu.'],
    ['El Adde attack', '2016-01', 'Conflict event', 'Somalia', 'al-Shabaab attack against Kenya Defense Forces base.'],
    ['Kulbiyow attack', '2017-01', 'Conflict event', 'Somalia', 'al-Shabaab attack from the affiliate-depth notes.'],
    ['Elite Hotel attack', '2020-08', 'Conflict event', 'Mogadishu, Somalia', 'al-Shabaab Elite Hotel attack.'],
    ['Hayat Hotel attack', '2022-08', 'Conflict event', 'Mogadishu, Somalia', 'al-Shabaab prolonged hotel siege in Mogadishu.'],
    ['Mogadishu Education Ministry bombings', '2022-10', 'Conflict event', 'Mogadishu, Somalia', 'al-Shabaab Education Ministry bombing event.'],
    ['Bulo Marer AU base attack', '2023-05', 'Conflict event', 'Somalia', 'al-Shabaab attack against AU base.'],
    ['Attempted assassination of Somali President Hassan Sheikh Mohamud', '2025-03', 'Conflict event', 'Mogadishu, Somalia', 'al-Shabaab attempted assassination event.'],
    ['Bangladesh secular blogger and publisher attacks', '2015', 'Conflict event', 'Dhaka, Bangladesh', 'AQIS Bangladesh secular writer/publisher attack sequence.'],
    ['Avijit Roy murdered', '2015-02-26', 'Conflict event', 'Dhaka, Bangladesh', 'Bangladesh secular writer murder in the AQIS-linked attack sequence.'],
    ['Faisal Arefin Dipan murdered', '2015-10-31', 'Conflict event', 'Dhaka, Bangladesh', 'Bangladesh publisher murder in the AQIS-linked attack sequence.'],
    ['AQIS FTO designation', '2016-06', 'Sanction/designation', 'United States', 'AQIS designated as FTO and SDGT.'],
    ['AQIS leadership pressure period', '2017', 'Other', 'Afghanistan', 'AQIS leadership pressure phase after 2017.'],
    ['Jabhat al-Nusra Damascus/Aleppo bombing wave', '2012', 'Conflict event', 'Syria', 'Nusra-era Syria bombing wave.'],
    ['ISIS / Nusra split begins', '2013-04', 'Relationship change', 'Syria', 'Baghdadi merger claim, Julani rejection, and pledge to Zawahiri.'],
    ['Nusra participates in Idlib offensive', '2015', 'Conflict event', 'Idlib, Syria', 'Nusra participates in Idlib offensive.'],
    ['Hurras al-Din designated', '2019-09', 'Sanction/designation', 'Syria', 'State designates Hurras al-Din and Faruq al-Suri as SDGT.'],
    ['Hurras al-Din attack in Ar Raqqah Province', '2021-01', 'Conflict event', 'Raqqah, Syria', 'Hurras attack outside Russian military base in Ar Raqqah Province according to notes.'],
    ['Hurras al-Din attack in Damascus', '2021-08', 'Conflict event', 'Damascus, Syria', 'Hurras attack against Syrian Republican Guard bus in Damascus according to notes.'],
    ['Hurras al-Din participates in Latakia attack', '2023-04', 'Conflict event', 'Latakia, Syria', 'Hurras participation in Ansar al-Islam-led attack in Latakia.'],
    ['Former Hurras members participate in Latakia/Tartus violence', '2025-03', 'Conflict event', 'Latakia, Syria', 'Former Hurras members participate in violence in Latakia and Tartus according to notes.'],
    ['Ramzi Yousef captured', '1995', 'Arrest', 'Pakistan', 'Capture/detention event from the Part 4 status index.'],
    ['Zacarias Moussaoui arrested', '2001', 'Arrest', 'United States', 'Pre-9/11 arrest and later conviction case.'],
    ['Abu Zubaydah captured', '2002', 'Arrest', 'Pakistan', 'Post-9/11 high-value capture/detention event.'],
    ['Abd al-Rahim al-Nashiri captured', '2002', 'Arrest', 'United States', 'USS Cole case capture/detention event.'],
    ['Hambali captured', '2003', 'Arrest', 'Southeast Asia', 'Jemaah Islamiyah / Al-Qaeda-linked Southeast Asia capture event.'],
    ['Abu Faraj al-Libi captured', '2004', 'Arrest', 'Pakistan', 'Senior Al-Qaeda figure captured in Pakistan.']
  );
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
    analystNotes: `${description}\n\nDate precision: ${datePrecision(dateStart)}.`,
    confidence: title.includes('Benghazi') ? 'low' : 'high',
    tags: ['al-qaeda-framework', 'timeline', `date-precision-${datePrecision(dateStart)}`]
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

  const grammarRels = [
    ['AQAP', 'Al-Qaeda Core', 'formal_affiliate_of', 'Formal affiliate relationship, Yemen.'],
    ['AQIM', 'Al-Qaeda Core', 'formal_affiliate_of', 'Formal affiliate relationship, North Africa/Sahel.'],
    ['AQIS', 'Al-Qaeda Core', 'formal_affiliate_of', 'Formal affiliate relationship, South Asia.'],
    ['Al-Shabaab', 'Al-Qaeda Core', 'formal_affiliate_of', 'Formal affiliate relationship after 2012 pledge.'],
    ['Hurras al-Din', 'Al-Qaeda Core', 'formal_affiliate_of', 'Former formal Syria affiliate before public dissolution in 2025.', 'former'],
    ['Jabhat al-Nusra', 'Al-Qaeda Core', 'formal_affiliate_of', 'Former formal Syria affiliate before breakaway path.', 'former'],
    ['AQI', 'Al-Qaeda Core', 'legacy_branch_of', 'Former Iraq branch that evolved into the Islamic State pathway.', 'former'],
    ['Islamic State', 'Al-Qaeda Core', 'rival_successor_of', 'Rival successor movement from AQI lineage; not Al-Qaeda.', 'former'],
    ['Taliban', 'Al-Qaeda Core', 'sanctuary_provider_for', 'Separate organization; sanctuary/protection relationship, not affiliate.'],
    ['Haqqani Network', 'Al-Qaeda Core', 'sanctuary_provider_for', 'Separate Taliban-linked sanctuary bridge and relationship network.'],
    ['AQIS', 'Taliban', 'pledged_allegiance_to', 'AQIS pledged allegiance to Taliban leader partly to secure safe haven.'],
    ['JNIM', 'AQIM', 'pledged_allegiance_to', 'JNIM allegiance chain through AQIM emir.'],
    ['JNIM', 'Al-Qaeda Core', 'pledged_allegiance_to', 'JNIM pledge to Al-Qaeda emir.'],
    ['JNIM', 'Taliban', 'pledged_allegiance_to', 'JNIM pledge included Taliban leader as symbolic allegiance target.'],
    ['Ansar al-Din', 'JNIM', 'merged_into', 'Sahel merger component.'],
    ['Al-Murabitun', 'JNIM', 'merged_into', 'Sahel merger component.'],
    ['Macina Liberation Front', 'JNIM', 'merged_into', 'Sahel merger component.'],
    ['AQIM Sahara Emirate', 'JNIM', 'merged_into', 'Sahel merger component.'],
    ['Jabhat al-Nusra', 'Al-Qaeda Core', 'broke_from', 'Nusra broke from Al-Qaeda and followed the JFS/HTS path.', 'former'],
    ['Hayat Tahrir al-Sham', 'Al-Qaeda Core', 'breakaway_from', 'HTS is a former-branch lineage, not current Al-Qaeda.', 'former'],
    ['Hassan al-Banna', 'Sayyid Qutb', 'ideological_influence_on', 'Ideological background lineage only.', 'former', 'medium'],
    ['Sayyid Qutb', 'Al-Qaeda Core', 'ideological_influence_on', 'Ideological influence, not operational command.', 'former', 'medium'],
    ['Abdullah Azzam', 'Al-Qaeda Core', 'ideological_influence_on', 'Azzam helped shape the environment from which Al-Qaeda emerged.', 'former', 'high']
  ];
  for (const [source, target, type, notes, status = 'active', confidence = 'high'] of grammarRels) {
    add(
      source.includes('Hassan') || source.includes('Sayyid') || source.includes('Abdullah Azzam') ? idFor(source, 'person') : idFor(source),
      target.includes('Sayyid') ? idFor(target, 'person') : idFor(target),
      type,
      notes,
      status,
      confidence
    );
  }

  const structuralRels = [
    ['AQAP Prison Network', 'AQAP', 'part_of'],
    ['AQAP Former Detainee Layer', 'AQAP', 'part_of'],
    ['AQAP Territorial Governance Layer', 'AQAP', 'part_of'],
    ['AQAP Aviation Plot Cell', 'AQAP', 'part_of'],
    ['AQIM Sahara Kidnapping Economy', 'AQIM', 'part_of'],
    ['JNIM Siege and Blockade Economy', 'JNIM', 'part_of'],
    ['al-Shabaab Amniyat', 'Al-Shabaab', 'part_of'],
    ['al-Shabaab Finance Wing', 'Al-Shabaab', 'part_of'],
    ['al-Shabaab Military Wing', 'Al-Shabaab', 'part_of'],
    ['AQIS Recruitment Network', 'AQIS', 'part_of'],
    ['AQIS Bangladesh Attack Cell', 'AQIS', 'part_of'],
    ['Syria Split File', 'Jabhat al-Nusra', 'part_of'],
    ['Hurras al-Din Remnants', 'Hurras al-Din', 'part_of']
  ];
  for (const [source, target, type] of structuralRels) add(idFor(source), idFor(target), type, `${source} ${type.replaceAll('_', ' ')} ${target}.`);

  const successionRels = [
    ['Osama bin Laden', 'Ayman al-Zawahiri', 'succeeded_by'],
    ['Ayman al-Zawahiri', 'Sayf al-Adl', 'succeeded_by'],
    ['Nasir al-Wuhayshi', 'Qasim al-Raymi', 'succeeded_by'],
    ['Qasim al-Raymi', 'Khalid Batarfi', 'succeeded_by'],
    ['Khalid Batarfi', 'Saad bin Atef al-Awlaki', 'succeeded_by'],
    ['Asim Umar', 'Usama Mahmood', 'succeeded_by'],
    ['Abdelmalek Droukdel', 'Abu Ubaydah Yusuf al-Anabi', 'succeeded_by'],
    ['Ahmed Abdi Godane', 'Ahmed Diriye', 'succeeded_by'],
    ['Mullah Omar', 'Haibatullah Akhundzada', 'succeeded_by']
  ];
  for (const [source, target, type] of successionRels) add(idFor(source, 'person'), idFor(target, 'person'), type, `${source} ${type.replaceAll('_', ' ')} ${target}.`);

  const spouseLinks = [
    ['Osama bin Laden', 'Najwa Ghanem'],
    ['Osama bin Laden', 'Khadijah'],
    ['Osama bin Laden', 'Khairiah Sabar'],
    ['Osama bin Laden', 'Siham Sabar'],
    ['Osama bin Laden', 'Amal Ahmed al-Sadah'],
    ['Osama bin Laden', 'Unknown wife of Osama bin Laden'],
    ['Abd al-Rahman al-Maghrebi', 'Nabila al-Zawahiri']
  ];
  for (const [source, target] of spouseLinks) add(idFor(source, 'person'), idFor(target, 'person'), 'spouse_of', `${source} spouse_of ${target}.`);

  const childLinks = [
    ['Najwa Ghanem', 'Abdullah bin Laden'],
    ['Najwa Ghanem', 'Abdul Rahman bin Laden'],
    ['Najwa Ghanem', 'Saad bin Laden'],
    ['Najwa Ghanem', 'Omar bin Laden'],
    ['Najwa Ghanem', 'Osman bin Laden'],
    ['Najwa Ghanem', 'Muhammad bin Laden'],
    ['Najwa Ghanem', 'Fatima bin Laden'],
    ['Najwa Ghanem', 'Iman bin Laden'],
    ['Najwa Ghanem', 'Ladin Bakir bin Laden'],
    ['Najwa Ghanem', 'Rukhaiya bin Laden'],
    ['Najwa Ghanem', 'Nour bin Laden'],
    ['Khadijah', 'Ali bin Laden'],
    ['Khadijah', 'Amer bin Laden'],
    ['Khadijah', 'Aisha bin Laden'],
    ['Khairiah Sabar', 'Hamza bin Laden'],
    ['Siham Sabar', 'Khadijah bin Laden'],
    ['Siham Sabar', 'Khalid bin Laden'],
    ['Siham Sabar', 'Miriam bin Laden'],
    ['Siham Sabar', 'Sumaiya bin Laden'],
    ['Amal Ahmed al-Sadah', 'Safiyah bin Laden'],
    ['Amal Ahmed al-Sadah', 'Aasia bin Laden'],
    ['Amal Ahmed al-Sadah', 'Ibrahim bin Laden'],
    ['Amal Ahmed al-Sadah', 'Zainab bin Laden'],
    ['Amal Ahmed al-Sadah', 'Hussain bin Laden'],
    ['Osama bin Laden', 'Abdullah bin Laden'],
    ['Osama bin Laden', 'Abdul Rahman bin Laden'],
    ['Osama bin Laden', 'Osman bin Laden'],
    ['Osama bin Laden', 'Fatima bin Laden'],
    ['Osama bin Laden', 'Iman bin Laden'],
    ['Osama bin Laden', 'Ladin Bakir bin Laden'],
    ['Osama bin Laden', 'Rukhaiya bin Laden'],
    ['Osama bin Laden', 'Nour bin Laden'],
    ['Osama bin Laden', 'Ali bin Laden'],
    ['Osama bin Laden', 'Amer bin Laden'],
    ['Osama bin Laden', 'Aisha bin Laden'],
    ['Osama bin Laden', 'Khadijah bin Laden'],
    ['Osama bin Laden', 'Miriam bin Laden'],
    ['Osama bin Laden', 'Sumaiya bin Laden'],
    ['Osama bin Laden', 'Safiyah bin Laden'],
    ['Osama bin Laden', 'Aasia bin Laden'],
    ['Osama bin Laden', 'Ibrahim bin Laden'],
    ['Osama bin Laden', 'Zainab bin Laden'],
    ['Osama bin Laden', 'Hussain bin Laden'],
    ['Ayman al-Zawahiri', 'Nabila al-Zawahiri'],
    ['Ayman al-Zawahiri', 'Mohammed al-Zawahiri'],
    ['Ayman al-Zawahiri', 'Aisha al-Zawahiri'],
    ['Azza Ahmed Nowari', 'Mohammed al-Zawahiri'],
    ['Azza Ahmed Nowari', 'Aisha al-Zawahiri'],
    ['Mullah Omar', 'Mullah Yaqoob Mujahid'],
    ['Jalaluddin Haqqani', 'Khalil Haqqani'],
    ['Jalaluddin Haqqani', 'Nasiruddin Haqqani'],
    ['Jalaluddin Haqqani', 'Badruddin Haqqani'],
    ['Jalaluddin Haqqani', 'Anas Haqqani'],
    ['Jalaluddin Haqqani', 'Yahya Haqqani'],
    ['Jalaluddin Haqqani', 'Aziz Haqqani']
  ];
  for (const [source, target] of childLinks) add(idFor(source, 'person'), idFor(target, 'person'), 'parent_of', `${source} parent_of ${target}.`);

  const statusRels = [
    ['Al-Qaeda Core', 'U.S. State Department', 'designated_by'],
    ['AQAP', 'U.S. State Department', 'designated_by'],
    ['AQIM', 'U.S. State Department', 'designated_by'],
    ['Al-Shabaab', 'U.S. State Department', 'designated_by'],
    ['AQIS', 'U.S. State Department', 'designated_by'],
    ['JNIM', 'U.S. State Department', 'designated_by'],
    ['Hurras al-Din', 'U.S. State Department', 'designated_by'],
    ['Sayf al-Adl', 'Federal Bureau of Investigation', 'wanted_by'],
    ['Sayf al-Adl', 'Rewards for Justice', 'wanted_by'],
    ['Abd al-Rahman al-Maghrebi', 'Federal Bureau of Investigation', 'wanted_by'],
    ['Abd al-Rahman al-Maghrebi', 'Rewards for Justice', 'wanted_by'],
    ['Hamza Salih bin Said al-Ghamdi', 'Federal Bureau of Investigation', 'wanted_by'],
    ['Saad bin Atef al-Awlaki', 'Rewards for Justice', 'wanted_by'],
    ['Ibrahim al-Banna', 'Rewards for Justice', 'wanted_by'],
    ['Ibrahim Ahmed Mahmoud al-Qosi', 'Rewards for Justice', 'wanted_by'],
    ['Ahmed Diriye', 'U.S. State Department', 'designated_by'],
    ['Mahad Karate', 'United Nations Security Council Monitoring Team', 'designated_by'],
    ['Sami al-Uraydi', 'U.S. State Department', 'designated_by'],
    ['Khalid Sheikh Mohammed', 'Guantanamo Bay', 'located_in'],
    ['Ramzi Yousef', 'Federal Bureau of Investigation', 'captured_in'],
    ['Abu Zubaydah', 'Pakistan', 'captured_in'],
    ['Abd al-Rahim al-Nashiri', 'United States', 'captured_in'],
    ['Hambali', 'Southeast Asia', 'captured_in'],
    ['Abu Faraj al-Libi', 'Pakistan', 'captured_in']
  ];
  for (const [source, target, type] of statusRels) {
    const sourceIsPerson = !entityIds.has(idFor(source)) && entityIds.has(idFor(source, 'person'));
    const targetType = entityIds.has(idFor(target, 'loc')) ? 'loc' : 'org';
    add(sourceIsPerson ? idFor(source, 'person') : idFor(source), targetType === 'loc' ? idFor(target, 'loc') : idFor(target), type, `${source} ${type.replaceAll('_', ' ')} ${target}.`);
  }

  const personLocations = [
    ['Osama bin Laden', 'Saudi Arabia'],
    ['Osama bin Laden', 'Sudan'],
    ['Osama bin Laden', 'Afghanistan'],
    ['Osama bin Laden', 'Pakistan'],
    ['Osama bin Laden', 'Abbottabad, Pakistan'],
    ['Ayman al-Zawahiri', 'Egypt'],
    ['Ayman al-Zawahiri', 'Afghanistan'],
    ['Ayman al-Zawahiri', 'Pakistan'],
    ['Ayman al-Zawahiri', 'Kabul, Afghanistan'],
    ['Sayf al-Adl', 'Egypt'],
    ['Sayf al-Adl', 'Afghanistan'],
    ['Sayf al-Adl', 'Iran'],
    ['Abd al-Rahman al-Maghrebi', 'Morocco'],
    ['Abd al-Rahman al-Maghrebi', 'Germany'],
    ['Abd al-Rahman al-Maghrebi', 'Afghanistan'],
    ['Abd al-Rahman al-Maghrebi', 'Pakistan'],
    ['Abd al-Rahman al-Maghrebi', 'Iran'],
    ['Khalid Sheikh Mohammed', 'Kuwait'],
    ['Khalid Sheikh Mohammed', 'Rawalpindi, Pakistan'],
    ['Mohammed Atef', 'Egypt'],
    ['Mohammed Atef', 'Afghanistan'],
    ['Abu Muhammad al-Masri', 'Egypt'],
    ['Abu Muhammad al-Masri', 'Iran'],
    ['Yasin al-Suri', 'Iran'],
    ['Muhsin al-Fadhli', 'Iran'],
    ['Muhsin al-Fadhli', 'Syria']
  ];
  for (const [person, loc] of personLocations) add(idFor(person, 'person'), idFor(loc, 'loc'), 'located_in', `${person} broad public geography: ${loc}.`);

  const orgLocations = [
    ['AQAP', 'Abyan, Yemen'],
    ['AQAP', 'Zinjibar, Yemen'],
    ['AQAP', 'Shabwah, Yemen'],
    ['AQAP', 'Hadramawt, Yemen'],
    ['AQAP', 'al-Bayda, Yemen'],
    ['AQAP', 'Marib, Yemen'],
    ['JNIM', 'Kidal, Mali'],
    ['JNIM', 'Gao, Mali'],
    ['JNIM', 'Timbuktu, Mali'],
    ['JNIM', 'Bamako, Mali'],
    ['JNIM', 'Djibo, Burkina Faso'],
    ['Al-Shabaab', 'Mogadishu, Somalia'],
    ['Al-Shabaab', 'Lower Shabelle, Somalia'],
    ['Al-Shabaab', 'Jubaland, Somalia'],
    ['Al-Shabaab', 'Garissa, Kenya'],
    ['Al-Shabaab', 'Manda Bay, Kenya'],
    ['AQIS', 'Karachi, Pakistan'],
    ['AQIS', 'India'],
    ['AQIS', 'Dhaka, Bangladesh'],
    ['Hurras al-Din', 'Idlib, Syria'],
    ['Hurras al-Din', 'Latakia, Syria'],
    ['Hurras al-Din', 'Damascus, Syria']
  ];
  for (const [org, loc] of orgLocations) add(idFor(org), idFor(loc, 'loc'), 'operates_in', `${org} broad public operating/event geography: ${loc}.`);

  const lowConfidenceRels = [
    ['Hamza Salih bin Said al-Ghamdi', 'Al-Qaeda Shura Council', 'chart_claim_relationship', 'TIC chart/Shura-context claim; keep as chart-derived until corroborated.'],
    ['Khalil Haqqani', 'Al-Qaeda Core', 'chart_claim_relationship', 'TIC-style Al-Qaeda-member claim should remain chart-derived unless independently verified.'],
    ['Abdul Rauf Zakir', 'Al-Qaeda Shura Council', 'chart_claim_relationship', 'TIC chart Shura claim; needs corroboration.'],
    ['Boubaker al-Hakim', 'AQI', 'screenshot_derived_relationship', 'Benghazi/AQI screenshot-derived relationship; needs corroboration.'],
    ['Ali Ouni al-Harzi', 'AQI', 'screenshot_derived_relationship', 'Benghazi/AQI screenshot-derived relationship; needs corroboration.'],
    ['Tariq al-Harzi', 'AQI', 'screenshot_derived_relationship', 'Benghazi/AQI screenshot-derived relationship; needs corroboration.'],
    ['Mansour al-Shalaali', 'AQIM', 'screenshot_derived_relationship', 'Benghazi/AQIM screenshot-derived relationship; needs corroboration.'],
    ['Hashem Bousidra', 'AQIM', 'screenshot_derived_relationship', 'Benghazi/AQIM screenshot-derived relationship; needs corroboration.']
  ];
  for (const [source, target, type, notes] of lowConfidenceRels) {
    add(idFor(source, 'person'), idFor(target), type, notes, 'alleged', 'low');
  }
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
    },
    {
      id: 'claim-chart-derived-shura-labels',
      claimText: 'TIC chart-derived Shura Council and committee labels should be preserved but treated as unverified until independently corroborated.',
      claimType: 'chart-derived',
      linkedEntityId: idFor('Al-Qaeda Shura Council'),
      sourceIds: [sourceIds.local],
      confidence: 'low',
      status: 'unverified',
      notes: 'This claim powers the low-confidence chart-derived relationship layer.'
    },
    {
      id: 'claim-benghazi-screenshot-relationships',
      claimText: 'Benghazi/AQI/AQIM screenshot-derived relationship edges are case-file leads, not confirmed operational conclusions.',
      claimType: 'screenshot-derived',
      linkedEntityId: '',
      sourceIds: [sourceIds.local],
      confidence: 'low',
      status: 'unverified',
      notes: 'Stored to make the uncertainty visible in claims and dashboard metrics.'
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
