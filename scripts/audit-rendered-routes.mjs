import { createHash } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceOrigin = 'https://rendered-route-audit.invalid';

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const distDirectory = resolve(repositoryRoot, argumentValue('--dist', 'dist'));
const evidenceDirectory = resolve(repositoryRoot, argumentValue('--out', 'docs/release-evidence/visual'));
const allowFail = process.argv.includes('--allow-fail');

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else files.push(file);
  }
  return files;
}

function normalizePath(value) {
  const normalized = `/${value.replace(/^\/+/, '')}`.replace(/\/+/g, '/');
  if (normalized === '/') return normalized;
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function routeFromFile(relativeFile) {
  const normalized = relativeFile.split(sep).join('/');
  if (normalized === '404.html') {
    return {
      path: '/404/',
      requestPath: '/__qa__/missing-route/',
      state: 'not-found',
    };
  }
  const directory = normalized === 'index.html'
    ? ''
    : normalized.endsWith('/index.html')
    ? normalized.slice(0, -'/index.html'.length)
    : normalized.slice(0, -'.html'.length);
  const path = normalizePath(directory);
  return {
    path,
    requestPath: path,
    state: path.includes('/thanks/') ? 'thanks' : path.startsWith('/portfolio-item/') ? 'redirect' : 'canonical',
  };
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseAttributes(source) {
  const attributes = {};
  const attributePattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attributePattern.exec(source))) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match;
    if (!name || name.toLowerCase() === 'html') continue;
    attributes[name.toLowerCase()] = decodeEntities(doubleQuoted ?? singleQuoted ?? unquoted ?? '');
  }
  return attributes;
}

function tags(html, name) {
  const pattern = new RegExp(`<${name}\\b([^>]*)>`, 'gi');
  return [...html.matchAll(pattern)].map((match) => parseAttributes(match[1] ?? ''));
}

function textContents(html, name) {
  const pattern = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'gi');
  return [...html.matchAll(pattern)].map((match) => (match[1] ?? '').replace(/<[^>]+>/g, '').trim());
}

function metaValue(html, attribute, value) {
  return tags(html, 'meta').filter((attributes) => attributes[attribute] && attributes[attribute].toLowerCase() === value)
    .map((attributes) => attributes.content ?? '')
    .filter(Boolean);
}

function firstBaseHref(html) {
  return tags(html, 'base')[0]?.href ?? '/';
}

function refreshTarget(html) {
  const refresh = metaValue(html, 'http-equiv', 'refresh')[0];
  return refresh?.match(/^[^;]+;\s*url=(.*)$/i)?.[1]?.trim() ?? null;
}

function normalizeBasePath(baseHref) {
  try {
    const pathname = new URL(baseHref, sourceOrigin).pathname;
    return pathname === '/' ? '/' : normalizePath(pathname);
  } catch {
    return '/';
  }
}

function stripBasePath(pathname, baseHref) {
  const basePath = normalizeBasePath(baseHref);
  if (basePath !== '/' && (pathname === basePath.slice(0, -1) || pathname.startsWith(basePath))) {
    const stripped = pathname.slice(basePath.length - 1);
    return stripped || '/';
  }
  return pathname || '/';
}

function isExternalOrIgnored(rawValue) {
  const value = rawValue.trim();
  return !value || value.startsWith('#') || /^(?:data|blob|javascript|mailto|tel):/i.test(value);
}

function resolveRenderedTarget(rawValue, routePath, baseHref) {
  if (isExternalOrIgnored(rawValue)) return null;
  let resolved;
  try {
    resolved = new URL(rawValue, new URL(baseHref || routePath, sourceOrigin));
  } catch {
    return { raw: rawValue, error: 'invalid URL' };
  }
  if (resolved.origin !== sourceOrigin) return null;
  return {
    raw: rawValue,
    path: stripBasePath(resolved.pathname, baseHref),
    fragment: resolved.hash ? decodeURIComponent(resolved.hash.slice(1)) : '',
  };
}

function assetCandidates(rawValue) {
  if (!rawValue) return [];
  if (rawValue.includes(',') || /\s/.test(rawValue)) {
    return rawValue.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]).filter(Boolean);
  }
  return [rawValue];
}

function assetPathForTarget(targetPath) {
  const clean = targetPath.replace(/^\/+/, '');
  return clean.endsWith('/') ? `${clean}index.html` : clean;
}

async function existingFile(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function routeKey(path) {
  const normalized = `/${path.replace(/^\/+/, '')}`.replace(/\/+/g, '/');
  if (normalized === '/') return normalized;
  return extname(normalized) ? normalized : normalizePath(normalized);
}

function sourceReferences(html) {
  const references = [];
  for (const tagName of ['a', 'area']) {
    for (const attributes of tags(html, tagName)) if (attributes.href) references.push({ kind: 'link', value: attributes.href });
  }
  for (const attributes of tags(html, 'link')) if (attributes.href) references.push({ kind: 'asset', value: attributes.href });
  for (const tagName of ['img', 'script', 'iframe', 'audio']) {
    for (const attributes of tags(html, tagName)) {
      if (attributes.src) references.push({ kind: 'asset', value: attributes.src });
      if (tagName === 'img' && attributes.srcset) {
        for (const value of assetCandidates(attributes.srcset)) references.push({ kind: 'asset', value });
      }
    }
  }
  for (const attributes of tags(html, 'source')) {
    for (const value of assetCandidates(attributes.srcset ?? attributes.src ?? '')) references.push({ kind: 'asset', value });
  }
  for (const attributes of tags(html, 'video')) if (attributes.poster) references.push({ kind: 'asset', value: attributes.poster });
  for (const attributes of tags(html, 'form')) if (attributes.action) references.push({ kind: 'form', value: attributes.action });
  return references;
}

function hasFragment(html, fragment) {
  if (!fragment) return true;
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:\\bid|\\bname)\\s*=\\s*["']${escaped}["']`, 'i').test(html);
}

function issue(code, message, details = {}) {
  return { code, message, ...details };
}

async function inspectRoute(file, relativeFile, route, fileByPath, htmlByPath) {
  const html = await readFile(file, 'utf8');
  const baseHref = firstBaseHref(html);
  const refresh = refreshTarget(html);
  if (refresh && route.state === 'canonical') route.state = 'redirect';
  const title = textContents(html, 'title');
  const descriptions = metaValue(html, 'name', 'description');
  const robots = metaValue(html, 'name', 'robots');
  const canonical = tags(html, 'link').filter((attributes) => (attributes.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  const h1Count = tags(html, 'h1').length;
  const issues = [];

  if (route.state === 'redirect') {
    if (!refresh) issues.push(issue('redirect-missing-target', 'Redirect output has no meta refresh target.'));
    route.redirectTarget = refresh ? resolveRenderedTarget(refresh, route.path, baseHref)?.path ?? refresh : null;
  } else {
    if (!/^\w{2,}(?:-[A-Za-z]{2,})?$/.test(tags(html, 'html')[0]?.lang ?? '')) issues.push(issue('missing-language', 'Rendered document has no usable html lang attribute.'));
    if (title.length !== 1 || !title[0]) issues.push(issue('title-count', `Expected one non-empty title; found ${title.length}.`));
    if (descriptions.length !== 1 || !descriptions[0]) issues.push(issue('description-count', `Expected one non-empty meta description; found ${descriptions.length}.`));
    if (canonical.length !== 1 || !canonical[0]?.href) issues.push(issue('canonical-count', `Expected one canonical link; found ${canonical.length}.`));
    if (h1Count !== 1) issues.push(issue('h1-count', `Expected one primary h1; found ${h1Count}.`));
    if (route.state === 'thanks' && !robots.some((value) => /noindex/i.test(value))) issues.push(issue('thanks-indexability', 'Thanks state is not marked noindex.'));
  }

  for (const attributes of tags(html, 'img')) {
    if (!Object.hasOwn(attributes, 'alt')) issues.push(issue('image-alt-missing', 'Rendered image has no alt attribute.'));
  }

  const references = sourceReferences(html);
  const targets = [];
  for (const reference of references) {
    const target = resolveRenderedTarget(reference.value, route.path, baseHref);
    if (!target) continue;
    if (target.error) {
      issues.push(issue('invalid-reference', `${reference.kind} reference is invalid.`, { raw: reference.value }));
      continue;
    }
    targets.push({ ...reference, ...target });
    const targetPath = routeKey(target.path);
    const routeReference = (reference.kind === 'link' || reference.kind === 'form') && !extname(targetPath);
    if (routeReference) {
      if (!fileByPath.has(targetPath)) issues.push(issue('broken-internal-link', `${reference.kind} target is not a generated route.`, { raw: reference.value, target: targetPath }));
      else if (target.fragment && !hasFragment(htmlByPath.get(targetPath) ?? '', target.fragment)) {
        issues.push(issue('broken-fragment', `Fragment #${target.fragment} is missing on its destination.`, { raw: reference.value, target: targetPath }));
      }
    } else {
      const assetFile = resolve(distDirectory, assetPathForTarget(targetPath));
      if (!assetFile.startsWith(`${distDirectory}${sep}`) || !(await existingFile(assetFile))) {
        issues.push(issue('missing-rendered-asset', 'Rendered asset reference does not exist in dist.', { raw: reference.value, target: targetPath }));
      }
    }
  }

  return {
    path: route.path,
    requestPath: route.requestPath,
    sourceFile: relativeFile.split(sep).join('/'),
    state: route.state,
    redirectTarget: route.redirectTarget ?? null,
    baseHref,
    title: title[0] ?? '',
    description: descriptions[0] ?? '',
    robots: robots[0] ?? '',
    canonical: canonical[0]?.href ?? '',
    h1Count,
    referenceCount: targets.length,
    issues,
  };
}

async function main() {
  if (!(await existingFile(distDirectory))) {
    throw new Error(`Missing ${relative(repositoryRoot, distDirectory)}. Run the production build before the rendered-route audit.`);
  }
  const files = (await walk(distDirectory)).filter((file) => extname(file).toLowerCase() === '.html');
  if (!files.length) throw new Error(`No HTML outputs found under ${relative(repositoryRoot, distDirectory)}.`);

  const discovered = files.map((file) => {
    const relativeFile = relative(distDirectory, file);
    return { file, relativeFile, ...routeFromFile(relativeFile) };
  });
  const fileByPath = new Map(discovered.map((entry) => [routeKey(entry.path), resolve(distDirectory, entry.relativeFile)]));
  const htmlByPath = new Map();
  for (const entry of discovered) htmlByPath.set(routeKey(entry.path), await readFile(entry.file, 'utf8'));

  const routes = [];
  for (const entry of discovered.sort((left, right) => left.path.localeCompare(right.path))) {
    routes.push(await inspectRoute(entry.file, entry.relativeFile, entry, fileByPath, htmlByPath));
  }
  const htmlHashes = [];
  for (const entry of discovered.sort((left, right) => left.relativeFile.localeCompare(right.relativeFile))) {
    htmlHashes.push(`${entry.relativeFile}\n${createHash('sha256').update(await readFile(entry.file)).digest('hex')}`);
  }
  const buildFingerprint = createHash('sha256').update(htmlHashes.join('\n')).digest('hex');
  const stateCounts = Object.fromEntries([...new Set(routes.map(({ state }) => state))].sort().map((state) => [state, routes.filter((route) => route.state === state).length]));
  const auditIssues = routes.flatMap((route) => route.issues.map((routeIssue) => ({ route: route.path, ...routeIssue })));
  const manifest = {
    schemaVersion: 1,
    buildFingerprint,
    routeCount: routes.length,
    stateCounts,
    routes,
  };
  const audit = {
    schemaVersion: 1,
    buildFingerprint,
    routeCount: routes.length,
    stateCounts,
    issueCount: auditIssues.length,
    issues: auditIssues,
  };
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(resolve(evidenceDirectory, 'rendered-route-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(resolve(evidenceDirectory, 'rendered-route-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);

  console.log(`Rendered route audit: ${routes.length} HTML outputs; fingerprint ${buildFingerprint.slice(0, 12)}; ${auditIssues.length} issue(s).`);
  if (auditIssues.length) {
    for (const routeIssue of auditIssues.slice(0, 40)) console.log(`- ${routeIssue.route}: ${routeIssue.code} — ${routeIssue.message}`);
    if (auditIssues.length > 40) console.log(`- … ${auditIssues.length - 40} additional issue(s) in rendered-route-audit.json`);
    if (!allowFail) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
