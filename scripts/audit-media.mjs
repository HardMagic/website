import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const distRoot = resolve(process.env.HARDMAGIC_DIST ?? fileURLToPath(new URL('../dist', import.meta.url)));
const sourceRoot = fileURLToPath(new URL('../src/data/media.ts', import.meta.url));

async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? walk(join(path, entry.name)) : join(path, entry.name)))).flat();
}
const files = await walk(distRoot);
const images = files.filter((file) => /\.(avif|webp|png|jpe?g|svg)$/i.test(file));
const generatedWebp = files.filter((file) => (file.includes('/_astro/') || file.includes('/assets/')) && /\.webp$/i.test(file));
const oversized = [];
for (const file of images) if ((await stat(file)).size > 650_000) oversized.push(file);
if (!images.some((file) => /\.avif$/i.test(file))) throw new Error('Responsive AVIF hero output was not produced.');
if (generatedWebp.length) throw new Error(`Generated WebP output is forbidden: ${generatedWebp.join(', ')}`);
if (oversized.length) throw new Error(`Oversized media: ${oversized.join(', ')}`);

const sourceCatalog = await readFile(sourceRoot, 'utf8');
const origin = process.env.HARDMAGIC_SITE_ORIGIN ?? 'https://hardmagic.com';

function routeForFile(file) {
  const relative = file.slice(distRoot.length).replaceAll('\\', '/');
  if (relative === '/index.html') return '/';
  return `/${relative.replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/^\//, '')}/`;
}

function htmlAssetUrls(html, baseHref) {
  const urls = new Set();
  for (const match of html.matchAll(/<(?:img|source)\b[^>]*?(?:src|srcset)=["']([^"']+)["'][^>]*>/gi)) {
    for (const candidate of match[1].split(',').map((value) => value.trim().split(/\s+/)[0]).filter(Boolean)) urls.add(candidate);
  }
  for (const match of html.matchAll(/\bposter=["']([^"']+)["']/gi)) urls.add(match[1]);
  return [...urls].map((raw) => {
    try {
      const url = new URL(raw, new URL(baseHref, origin));
      return url.origin === origin ? url.pathname : null;
    } catch {
      return null;
    }
  }).filter((value) => value && /\.(avif|webp|png|jpe?g|svg)(?:$|[?#])/i.test(value));
}

function basename(value) {
  return value.split('/').pop()?.split(/[?#]/)[0] ?? '';
}

function sourceMatch(outputName) {
  const normalized = basename(outputName).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[._-][a-z0-9]{6,}$/i, '');
  const candidates = [...sourceCatalog.matchAll(/['"]([^'"]+\.(?:avif|webp|png|jpe?g|svg))['"]/gi)]
    .map((match) => match[1])
    .filter((candidate) => normalized.includes(basename(candidate).replace(/\.[a-z0-9]+$/, '').toLowerCase()));
  return candidates[0] ?? null;
}

const htmlFiles = files.filter((file) => file.endsWith('.html'));
const assetRoutes = new Map();
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const baseHref = html.match(/<base\b[^>]*href=["']([^"']+)["']/i)?.[1] ?? '/';
  const route = routeForFile(file);
  for (const url of htmlAssetUrls(html, baseHref)) {
    const entry = assetRoutes.get(url) ?? { routes: new Set(), alt: new Set(), disclosures: new Set() };
    entry.routes.add(route);
    for (const image of html.matchAll(new RegExp(`<img\\b[^>]*src=["'][^"']*${basename(url).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}[^"']*["'][^>]*>`, 'gi'))) {
      const alt = image[0].match(/\balt=["']([^"']*)["']/i)?.[1];
      if (alt !== undefined) entry.alt.add(alt);
    }
    const surrounding = html.slice(Math.max(0, html.indexOf(basename(url)) - 500), html.indexOf(basename(url)) + 500);
    if (/AI-generated|generated conceptual|conceptual artwork|scenario illustration/i.test(surrounding)) entry.disclosures.add('generated/conceptual disclosure present');
    else entry.disclosures.add('no generated disclosure detected');
    assetRoutes.set(url, entry);
  }
}

const ledger = [...assetRoutes.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([url, entry]) => {
  const source = sourceMatch(url);
  return {
    asset: url,
    source: source ?? 'Rendered asset; source catalog match not found',
    provenanceStatus: source ? 'catalog-match' : 'review-required',
    routes: [...entry.routes].sort(),
    routeCount: entry.routes.size,
    altText: [...entry.alt].sort(),
    disclosure: [...entry.disclosures].sort(),
    rightsReview: source ? 'Source catalog entry requires owner/license confirmation.' : 'No source catalog match; owner/license/disclosure review required.',
  };
});
const generatedAt = process.env.HARDMAGIC_BUILD_TIMESTAMP ?? new Date().toISOString();
await writeFile(fileURLToPath(new URL('../docs/media-ledger.json', import.meta.url)), `${JSON.stringify({ generatedAt, assetCount: ledger.length, assets: ledger }, null, 2)}\n`);
const markdown = [
  '# Rendered media ledger',
  '',
  `Generated from \`dist/\` at ${generatedAt}. This is a build artifact, not an approval: \`review-required\` and rights notes remain launch blockers until an owner signs them.`,
  '',
  `Rendered image references: **${ledger.length}** across **${new Set(ledger.flatMap((asset) => asset.routes)).size}** HTML routes.`,
  '',
  '| Rendered asset | Routes | Source catalog | Disclosure | Alt samples | Rights gate |',
  '| --- | ---: | --- | --- | --- | --- |',
  ...ledger.map((asset) => `| \`${asset.asset}\` | ${asset.routeCount} | ${asset.provenanceStatus} | ${asset.disclosure.join('<br>')} | ${asset.altText.slice(0, 2).join('<br>').replaceAll('|', '\\|') || 'missing'} | ${asset.rightsReview} |`),
  '',
].join('\n');
await writeFile(fileURLToPath(new URL('../docs/media-ledger.md', import.meta.url)), `${markdown}\n`);

console.log(`Media audit passed: ${images.length} assets, no file over 650 KB; rendered ledger contains ${ledger.length} referenced assets.`);
