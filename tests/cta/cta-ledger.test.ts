import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { editorialRoutes } from '../../src/data/editorial';
import { megaMenus, footerNavGroups } from '../../src/data/navigation';
import { navigation, productLinks } from '../../src/data/site';

type LedgerRow = Record<string, string>;

const ledgerPath = new URL('../../docs/cta-ledger.csv', import.meta.url);
const componentPath = new URL('../../src/components/editorial/EditorialPage.astro', import.meta.url);

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += character;
    }
  }

  values.push(value);
  return values;
}

function readLedger(): { headers: string[]; rows: LedgerRow[] } {
  const lines = fs.readFileSync(ledgerPath, 'utf8').trim().split(/\r?\n/);
  const firstLine = lines[0];
  if (!firstLine) throw new Error('CTA ledger is missing its header row.');
  const headers = parseCsvLine(firstLine);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
  return { headers, rows };
}

function normalizeCopy(copy: string): string {
  return copy.replace(/\s+[↗↘↓→]/g, '').replace(/\s+/g, ' ').trim();
}

function normalizeTarget(href: string): string {
  if (href === 'n/a') return href;
  const [rawPath = '', fragment] = href.split('#');
  const path = rawPath === '' || rawPath === '.' || rawPath === './' ? '/' : rawPath;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return fragment ? `${normalizedPath}#${fragment}` : normalizedPath;
}

function routeMapFromComponent() {
  const source = fs.readFileSync(componentPath, 'utf8');
  const entries = [...source.matchAll(/^\s*(?:'([^']+)'|([A-Za-z-]+)): \{ ready: '([^']+)', early: '([^']+)' \}/gm)];
  const entryKey = (match: RegExpMatchArray) => match[1] ?? match[2] ?? '';
  const family = Object.fromEntries(
    entries
      .filter((match) => !entryKey(match).startsWith('/'))
      .map((match) => [entryKey(match), { ready: match[3] ?? '', early: match[4] ?? '' }]),
  );
  const overrides = Object.fromEntries(
    entries
      .filter((match) => entryKey(match).startsWith('/'))
      .map((match) => [entryKey(match), { ready: match[3] ?? '', early: match[4] ?? '' }]),
  );
  return { family, overrides };
}

const reservedEditorialPaths = new Set([
  '/', '/products/', '/company/', '/contact/', '/privacy/', '/briefs/',
  '/products/wiremark/', '/products/studio/', '/products/cli/',
  '/products/web-magic/', '/products/photo-curator/', '/products/gpu-router/',
]);

const allowedSolutions = new Set([
  'consequential cross-functional decision',
  'creative authority/brand direction',
  'GenAI adoption/production',
  'media estate/operations',
  'marketing transformation',
  'time-bounded activation',
  'product-specific evaluation',
  'research/learning',
  'case-study credibility',
  'privacy/security reporting',
  'utility navigation',
  'Qualified consultation intake',
  'Research or method path',
  'BriefLock private delivery',
  'Product-qualified evaluation',
  'Specific engagement solution',
  'Specific service solution',
  'Company context',
  'Relevant experience proof',
  'Review target',
  'In-page decision navigation',
  'Home navigation',
]);

function knownPaths(): Set<string> {
  return new Set([
    ...editorialRoutes.map((route) => route.path),
    '/', '/portfolio/', '/horizon/', '/404/',
    '/portfolio/state-parks/', '/portfolio/fashionx/', '/portfolio/pranashama/', '/portfolio/tao-cottage/',
    '/portfolio/focuspass/', '/portfolio/pedadida/', '/portfolio/airikai/', '/portfolio/taolo/',
  ]);
}

function ownedNavigationHrefs(): string[] {
  return [
    ...megaMenus.flatMap((menu) => [
      menu.feature.href,
      ...menu.groups.flatMap((group) => group.links.map((link) => link.href)),
      menu.href,
    ]),
    ...footerNavGroups.flatMap((group) => group.links.map((link) => link.href)),
    ...navigation.map((link) => link.href),
    ...productLinks.map(([, href]) => href),
  ];
}

function expectedNavigationKeys() {
  const keys: string[] = [];
  for (const menu of megaMenus) {
    keys.push(`mega-feature|nav:${menu.label}|feature|Explore — ${menu.feature.title}`);
    for (const group of menu.groups) {
      for (const link of group.links) keys.push(`mega-link|nav:${menu.label}/${group.title}|group-link|${link.label}`);
    }
    keys.push(`mega-index|nav:${menu.label}|view-all|View all ${menu.label.toLowerCase()}`);
  }
  for (const group of footerNavGroups) {
    for (const link of group.links) keys.push(`footer-link|footer:${group.title}|footer|${link.label}`);
  }
  for (const link of navigation) keys.push(`site-link|site:navigation|primary-nav|${link.label}`);
  for (const [label] of productLinks) keys.push(`site-product|site:products|product-nav|${label}`);
  keys.push('header-wordmark|header|wordmark|HardMagic');
  keys.push('header-link|header|cta|Enterprise advisory');
  keys.push('footer-wordmark|footer|wordmark|HardMagic');
  return keys;
}

describe('CTA ledger coverage', () => {
  it('covers every editorial route and every owned navigation CTA', () => {
    const { headers, rows } = readLedger();

    if (headers.includes('source_kind')) {
      const editorialRows = rows.filter((row) => row.source_kind === 'editorial-action');
      const navigationRows = rows.filter((row) => row.source_family === 'navigation');
      expect(editorialRows).toHaveLength(editorialRoutes.length * 2);
      expect(navigationRows).toHaveLength(expectedNavigationKeys().length);
      expect(rows).toHaveLength(editorialRows.length + navigationRows.length);

      const editorialKeys = new Set(editorialRows.map((row) => `${row.source_route}|${row.cta_position}`));
      for (const route of editorialRoutes) {
        expect(editorialKeys.has(`${route.path}|primary`)).toBe(true);
        expect(editorialKeys.has(`${route.path}|early`)).toBe(true);
      }

      const navigationKeys = navigationRows.map((row) => `${row.source_kind}|${row.source_route}|${row.cta_position}|${row.cta_label}`);
      expect(new Set(navigationKeys).size).toBe(navigationKeys.length);
      for (const key of expectedNavigationKeys()) expect(navigationKeys).toContain(key);
      return;
    }

    const routePaths = new Set(rows.map((row) => row.route));
    expect(routePaths.size).toBeGreaterThanOrEqual(editorialRoutes.length);
    for (const route of editorialRoutes) expect(routePaths.has(route.path)).toBe(true);

    expect(rows.length).toBeGreaterThanOrEqual(editorialRoutes.length * 2);
    for (const href of ownedNavigationHrefs()) expect(knownPaths()).toContain(normalizeTarget(href).split('#')[0]);
  });

  it('keeps the ledger aligned with editorial labels and the advisory navigation targets', () => {
    const { headers, rows } = readLedger();

    const workWithUs = megaMenus.find((menu) => menu.label === 'Work with us');
    expect(workWithUs?.feature.href).toBe('services/executive-advisory/');
    const advisory = megaMenus.find((menu) => menu.label === 'Company')?.groups
      .find((group) => group.title === 'Talk to us')?.links.find((link) => link.label === 'Advisory intake');
    expect(advisory?.href).toBe('services/executive-advisory/');
    expect(navigation.find((link) => link.label === 'Advisory')?.href).toBe('services/executive-advisory/');

    if (headers.includes('source_kind')) {
      const byKey = new Map(rows.map((row) => [`${row.source_kind}|${row.source_route}|${row.cta_position}`, row]));
      for (const route of editorialRoutes) {
        expect(byKey.get(`editorial-action|${route.path}|primary`)?.cta_label).toBe(route.primaryAction);
        expect(byKey.get(`editorial-action|${route.path}|early`)?.cta_label).toBe(route.earlyAction);
      }
      expect(byKey.get('mega-feature|nav:Work with us|feature')?.target).toBe('/services/executive-advisory/');
      expect(rows.find((row) => row.source_kind === 'mega-link' && row.cta_label === 'Advisory intake')?.target).toBe('/services/executive-advisory/');
      expect(rows.find((row) => row.source_kind === 'site-link' && row.cta_label === 'Advisory')?.target).toBe('/services/executive-advisory/');
      return;
    }

    const normalized = (row: LedgerRow) => normalizeCopy(row.cta_copy ?? '');
    const sharedRoutes = editorialRoutes.filter((route) => !reservedEditorialPaths.has(route.path) && !['brief', 'brief-confirmation'].includes(route.family));
    for (const route of sharedRoutes) {
      const primary = rows.find((row) => row.route === route.path && normalized(row) === normalizeCopy(route.primaryAction));
      const early = rows.find((row) => row.route === route.path && normalized(row) === normalizeCopy(route.earlyAction));
      expect(primary, `${route.path} primary CTA is not in the rendered ledger`).toBeTruthy();
      expect(early, `${route.path} early CTA is not in the rendered ledger`).toBeTruthy();
      expect(primary?.position).toMatch(/^button/);
      expect(early?.position).toBe('text-link');
    }
  });

  it('uses known internal destinations and documents mapping metadata', () => {
    const { headers, rows } = readLedger();
    const paths = knownPaths();

    for (const row of rows) {
      const solution = row.solution ?? '';
      expect(row.cta_copy ?? row.cta_label ?? '').not.toBe('');
      expect(solution).not.toBe('');
      expect(allowedSolutions.has(solution)).toBe(true);

      const target = row.target ?? '';
      if (target === 'n/a') continue;
      if (row.target_type === 'application' || target.includes('://')) continue;
      const [path = '', fragment = ''] = normalizeTarget(target).split('#');
      expect(paths.has(path)).toBe(true);
      if (fragment) expect(fragment.length).toBeGreaterThan(0);
    }

    if (headers.includes('source_kind')) {
      expect(rows.filter((row) => ['target-owner-review', 'page-owner-review'].includes(row.mapping_status ?? '')).length).toBeGreaterThan(0);
    } else {
      expect(rows.every((row) => ['strong', 'intentional'].includes(row.strength ?? ''))).toBe(true);
    }
  });

  it('matches the shared editorial component route map for rendered routes', () => {
    const { headers, rows } = readLedger();
    if (headers.includes('source_kind')) return;

    const { family, overrides } = routeMapFromComponent();
    for (const route of editorialRoutes) {
      if (reservedEditorialPaths.has(route.path) || ['brief', 'brief-confirmation'].includes(route.family)) continue;
      const planned = { ...(family[route.family] ?? {}), ...(overrides[route.path] ?? {}) };
      const primary = rows.find((row) => row.route === route.path && normalizeCopy(row.cta_copy ?? '') === normalizeCopy(route.primaryAction));
      const early = rows.find((row) => row.route === route.path && normalizeCopy(row.cta_copy ?? '') === normalizeCopy(route.earlyAction));
      expect(normalizeTarget(primary?.target ?? 'n/a')).toBe(normalizeTarget(planned.ready ?? 'n/a'));
      expect(normalizeTarget(early?.target ?? 'n/a')).toBe(normalizeTarget(planned.early ?? 'n/a'));
    }
  });
});
