import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);
const root = path.resolve(process.cwd(), argv.find((arg) => !arg.startsWith('--')) || 'dist');
const checkOnly = argv.includes('--check-only');
const offline = argv.includes('--offline') || argv.includes('--no-external');
const strictExternal = argv.includes('--strict-external');
const origin = (process.env.AUDIT_ORIGIN || 'https://hardmagic.com').replace(/\/$/, '');
const deploymentTarget = (process.env.HARDMAGIC_DEPLOYMENT_TEST_TARGET || process.env.HARDMAGIC_DEPLOY_TARGET || 'local').trim();
const isDemoBuild = deploymentTarget === 'demo';
const timeoutMs = Number.parseInt(process.env.AUDIT_EXTERNAL_TIMEOUT_MS || '5000', 10);
const retries = Number.parseInt(process.env.AUDIT_EXTERNAL_RETRIES || '2', 10);

if (!fs.existsSync(root)) {
  console.error('Missing build directory: ' + root);
  process.exit(1);
}

const read = (file) => fs.readFileSync(file, 'utf8');
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true })
  .sort((a, b) => a.name.localeCompare(b.name))
  .flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
const files = walk(root).filter((file) => !path.relative(root, file).split(path.sep).includes('.prerender'));
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const decode = (value) => String(value || '')
  .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"').replaceAll('&#39;', "'")
  .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)))
  .replace(/&#([0-9]+);/g, (_, value) => String.fromCodePoint(parseInt(value, 10)));
const text = (value) => decode(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
const attrs = (token) => {
  const output = {};
  const expression = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))/g;
  for (const match of String(token || '').matchAll(expression)) output[match[1].toLowerCase()] = decode(match[2] == null ? (match[3] == null ? match[4] : match[3]) : match[2]);
  return output;
};
const attr = (token, name) => attrs(token)[name.toLowerCase()] || '';
const hasAttr = (token, name) => new RegExp('\\b' + name + '\\s*=', 'i').test(token);
const tags = (html, names) => [...html.matchAll(new RegExp('<(' + names.join('|') + ')\\b[^>]*>', 'gis'))].map((match) => ({
  name: match[1].toLowerCase(), raw: match[0], start: match.index, end: match.index + match[0].length,
}));
const oneText = (html, name) => text(html.match(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'i'))?.[1] || '');
const allText = (html, name) => [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '>', 'gi'))].map((match) => text(match[1]));
const idsIn = (html) => [
  ...[...html.matchAll(/\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((match) => decode(match[1] == null ? match[2] : match[1])),
  ...[...html.matchAll(/<a\b[^>]*\bname\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((match) => decode(match[1] == null ? match[2] : match[1])),
].filter(Boolean);
const labelFor = (html, tag) => {
  if (tag.name === 'a' || tag.name === 'area') {
    const end = html.indexOf('</' + tag.name + '>', tag.end);
    return text(end >= 0 ? html.slice(tag.end, end) : '') || attr(tag.raw, 'aria-label');
  }
  if (tag.name === 'img' || tag.name === 'source') return attr(tag.raw, 'alt');
  if (tag.name === 'form') {
    const end = html.indexOf('</form>', tag.end);
    const body = end >= 0 ? html.slice(tag.end, end) : '';
    return oneText(body, 'h1') || oneText(body, 'h2') || attr(tag.raw, 'aria-label') || 'form';
  }
  return attr(tag.raw, 'rel') || attr(tag.raw, 'property') || attr(tag.raw, 'name');
};
const csv = (value) => '"' + String(value == null ? '' : value).replaceAll('"', '""') + '"';
const csvRow = (values) => values.map(csv).join(',');
const markdown = (value) => String(value || '').replaceAll('|', '\\|').replaceAll('\n', ' ');
const routeFromFile = (file) => {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (relative === '404.html') return '/404/';
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return '/' + relative.slice(0, -'/index.html'.length) + '/';
  return '/' + relative.replace(/\.html$/, '');
};
const normalizeRoute = (pathname) => {
  let route = pathname || '/';
  if (!route.startsWith('/')) route = '/' + route;
  if (route === '/404.html') return '/404/';
  if (route.endsWith('/index.html')) route = route.slice(0, -'index.html'.length);
  if (route.endsWith('.html')) return route;
  return route.endsWith('/') ? route : route + '/';
};
const basePathOf = (url) => url.pathname === '/' ? '/' : (url.pathname.endsWith('/') ? url.pathname : url.pathname + '/');
const stripBase = (pathname, basePath) => {
  if (basePath === '/') return pathname || '/';
  if (pathname === basePath.slice(0, -1)) return '/';
  return pathname.startsWith(basePath) ? pathname.slice(basePath.length - 1) || '/' : null;
};
const routeResolution = (url, basePath) => {
  if (url.origin !== origin) return { route: '', outside: false };
  const stripped = stripBase(url.pathname, basePath);
  return { route: normalizeRoute(stripped === null ? url.pathname : stripped), outside: stripped === null };
};
const assetPath = (url, basePath) => {
  if (url.origin !== origin) return null;
  const stripped = stripBase(url.pathname, basePath);
  if (stripped === null) return null;
  let decoded = stripped;
  try { decoded = decodeURIComponent(stripped); } catch {}
  const candidate = path.resolve(root, decoded.replace(/^\/+/, ''));
  return candidate.startsWith(root + path.sep) || candidate === root ? candidate : null;
};
const rootAssetPath = (url) => {
  if (url.origin !== origin) return null;
  let decoded = url.pathname;
  try { decoded = decodeURIComponent(decoded); } catch {}
  const candidate = path.resolve(root, decoded.replace(/^\/+/, ''));
  return candidate.startsWith(root + path.sep) || candidate === root ? candidate : null;
};
const owner = (type, url) => type === 'form' ? (url?.hostname === 'briefs.hardmagic.com' ? 'brief-delivery' : 'external-form') : type === 'external' ? 'external-source' : type === 'asset' ? 'site-build' : type === 'metadata' ? 'seo' : 'route-owner';
const noindex = (robots) => /(^|[\s,])noindex([\s,]|$)/i.test(robots);
const isHttp = (url) => url.protocol === 'http:' || url.protocol === 'https:';

const routeFiles = new Map(htmlFiles.map((file) => [routeFromFile(file), file]));
const htmlContent = new Map();
for (const file of htmlFiles) if (fs.existsSync(file)) htmlContent.set(routeFromFile(file), read(file));
const routes = [];
const links = [];
const failures = new Set();
const warnings = new Set();
const failure = (value) => failures.add(value);
const warning = (value) => warnings.add(value);
let buildBase = null;

for (const file of htmlFiles) {
  const route = routeFromFile(file);
  const html = htmlContent.get(route) || '';
  if (!html) failure(route + ': rendered HTML disappeared during audit');
  const baseTagList = tags(html, ['base']);
  const documentRoot = new URL(origin + '/');
  let baseUrl = documentRoot;
  let basePath = '/';
  if (baseTagList.length) {
    const href = attr(baseTagList[0].raw, 'href');
    try {
      baseUrl = new URL(href || documentRoot.href, new URL(origin + route));
      basePath = basePathOf(baseUrl);
      if (baseUrl.origin !== origin) failure(route + ': <base> leaves ' + origin);
    } catch {
      failure(route + ': invalid <base>');
    }
    if (buildBase === null) buildBase = basePath;
    if (buildBase !== basePath) failure(route + ': inconsistent <base> path ' + basePath);
  }
  if (baseTagList.length > 1) failure(route + ': multiple <base> elements');
  const documentUrl = new URL(origin + basePath + route.replace(/^\//, ''));
  const meta = tags(html, ['meta']);
  const canonicalTags = tags(html, ['link']).filter((tag) => attr(tag.raw, 'rel').toLowerCase().split(/\s+/).includes('canonical'));
  const canonical = attr(canonicalTags[0]?.raw, 'href');
  const robots = attr(meta.find((tag) => attr(tag.raw, 'name').toLowerCase() === 'robots')?.raw, 'content');
  const description = attr(meta.find((tag) => attr(tag.raw, 'name').toLowerCase() === 'description')?.raw, 'content');
  const ogUrl = attr(meta.find((tag) => attr(tag.raw, 'property').toLowerCase() === 'og:url')?.raw, 'content');
  const ogImage = attr(meta.find((tag) => ['og:image', 'twitter:image'].includes((attr(tag.raw, 'property') || attr(tag.raw, 'name')).toLowerCase()))?.raw, 'content');
  const refresh = meta.find((tag) => attr(tag.raw, 'http-equiv').toLowerCase() === 'refresh');
  const refreshTarget = attr(refresh?.raw, 'content').split(';').slice(1).join(';').match(/url\s*=\s*(.*)$/i)?.[1]?.trim().replace(/^['"]|['"]$/g, '') || '';
  const scriptRedirect = /(?:window\.)?location(?:\.href|\.assign|\.replace)?\s*=/i.test(html);
  const isRedirect = Boolean(refreshTarget || scriptRedirect);
  const isError = route === '/404/';
  const isSuccess = route.endsWith('/thanks/');
  const robotsNoindex = noindex(robots);
  const kind = isError ? 'error' : isRedirect ? 'redirect' : isSuccess ? 'success' : robotsNoindex ? 'noindex' : 'canonical';
  let canonicalRoute = '';
  if (canonical) {
    try {
      const parsed = new URL(canonical, documentUrl);
      canonicalRoute = routeResolution(parsed, basePath).route;
      if (parsed.origin !== origin || parsed.search || parsed.hash) failure(route + ': canonical is not a clean same-origin absolute URL');
    } catch {
      failure(route + ': invalid canonical ' + canonical);
    }
  }
  let redirectRoute = '';
  if (refreshTarget) {
    try {
      const parsed = new URL(refreshTarget, documentUrl);
      const resolved = routeResolution(parsed, basePath);
      redirectRoute = resolved.route;
      if (resolved.outside || parsed.origin !== origin) failure(route + ': redirect target bypasses <base> or leaves the site');
      if (!routeFiles.has(redirectRoute)) failure(route + ': redirect target missing ' + redirectRoute);
      if (redirectRoute === route) failure(route + ': redirect targets itself');
      warning(route + ': static meta-refresh needs deployed HTTP 301/308 edge verification');
    } catch {
      failure(route + ': invalid redirect target ' + refreshTarget);
    }
  }
  if (canonicalTags.length !== 1 && !isError) failure(route + ': expected one canonical link, found ' + canonicalTags.length);
  if (kind === 'canonical' && canonicalRoute !== route) failure(route + ': canonical resolves to ' + (canonicalRoute || '(missing)'));
  if (kind === 'redirect' && redirectRoute && canonicalRoute !== redirectRoute) failure(route + ': redirect canonical does not match ' + redirectRoute);
  if (kind !== 'redirect' && kind !== 'error' && !baseTagList.length) failure(route + ': missing <base>');
  if (!oneText(html, 'title')) failure(route + ': missing title');
  if (kind === 'canonical' && !description) failure(route + ': missing meta description');
  if (kind === 'canonical' && allText(html, 'h1').length !== 1) failure(route + ': expected one h1');
  if (isSuccess && !robotsNoindex) failure(route + ': success state must be noindex');
  if (isRedirect && !robotsNoindex) failure(route + ': redirect state must be noindex');
  if (kind === 'canonical' && robotsNoindex) failure(route + ': canonical route is noindex');
  if (kind === 'canonical' && (!ogUrl || ogUrl !== canonical)) failure(route + ': og:url does not match canonical');
  if (ogImage) {
    try {
      const imageUrl = new URL(ogImage, documentUrl);
      if (imageUrl.origin === origin) {
        const imageFile = assetPath(imageUrl, basePath) || rootAssetPath(imageUrl);
        if (!imageFile || !fs.existsSync(imageFile)) failure(route + ': missing og:image asset');
      }
    } catch {
      failure(route + ': invalid og:image');
    }
  }
  const ids = idsIn(html);
  for (const id of [...new Set(ids.filter((value, index) => ids.indexOf(value) !== index))].sort()) failure(route + ': duplicate fragment target #' + id);

  const references = [];
  for (const tag of tags(html, ['a', 'area', 'form', 'link', 'img', 'script', 'source', 'video', 'audio', 'iframe', 'object'])) {
    const attribute = tag.name === 'form' ? 'action' : ['img', 'source', 'script', 'iframe', 'object'].includes(tag.name) ? 'src' : 'href';
    const present = hasAttr(tag.raw, attribute);
    const raw = attr(tag.raw, attribute).trim();
    const rel = attr(tag.raw, 'rel').toLowerCase();
    const hint = tag.name === 'link' && rel.includes('canonical') ? 'metadata' : tag.name === 'link' && (rel.includes('stylesheet') || rel.includes('icon') || rel.includes('preload')) ? 'asset' : '';
    if (tag.name === 'form' || present || tag.name === 'a' || tag.name === 'area') references.push({ tag, attribute, raw, defaultAction: tag.name === 'form' && (!present || !raw), hint });
    if ((tag.name === 'a' || tag.name === 'area') && !present) failure(route + ': anchor has no href');
    const srcset = attr(tag.raw, 'srcset');
    if (srcset) for (const value of srcset.split(',').map((item) => item.trim()).filter(Boolean)) references.push({ tag, attribute: 'srcset', raw: value.split(/\s+/)[0], defaultAction: false, hint: 'asset' });
  }
  for (const tag of meta) {
    const key = (attr(tag.raw, 'property') || attr(tag.raw, 'name')).toLowerCase();
    if (['og:url', 'og:image', 'og:video', 'og:audio', 'twitter:image'].includes(key) && attr(tag.raw, 'content')) references.push({ tag, attribute: 'content', raw: attr(tag.raw, 'content'), defaultAction: false, hint: 'metadata' });
  }
  for (const reference of references) {
    let type = reference.hint || (reference.tag.name === 'form' ? 'form' : 'internal');
    let status = 'ok';
    const raw = reference.raw;
    const label = labelFor(html, reference.tag);
    if (!raw && !reference.defaultAction) {
      status = reference.tag.name === 'form' ? 'form-default' : 'empty-href';
      if (status === 'empty-href') warning(route + ': empty ' + reference.attribute + ' resolves to the current document; review route intent');
      links.push({ source: route, element: reference.tag.name, attribute: reference.attribute, label, raw, resolved: documentUrl.href, type, status, finalUrl: documentUrl.href, fragment: '', targetRoute: '', owner: owner(type) });
      continue;
    }
    if (/^javascript:/i.test(raw)) {
      failure(route + ': javascript URL is not allowed');
      links.push({ source: route, element: reference.tag.name, attribute: reference.attribute, label, raw, resolved: '', type: 'invalid', status: 'invalid', finalUrl: '', fragment: '', targetRoute: '', owner: 'route-owner' });
      continue;
    }
    if (raw.startsWith('data:')) {
      links.push({ source: route, element: reference.tag.name, attribute: reference.attribute, label, raw, resolved: raw.slice(0, 32), type: 'asset', status: 'inline-asset', finalUrl: raw.slice(0, 32), fragment: '', targetRoute: '', owner: 'site-build' });
      continue;
    }
    let parsed;
    try { parsed = new URL(raw || documentUrl.href, reference.defaultAction ? documentUrl : baseUrl); } catch {
      failure(route + ': invalid URL ' + raw);
      links.push({ source: route, element: reference.tag.name, attribute: reference.attribute, label, raw, resolved: '', type: 'invalid', status: 'invalid', finalUrl: '', fragment: '', targetRoute: '', owner: 'route-owner' });
      continue;
    }
    const fragment = decode(parsed.hash.replace(/^#/, ''));
    if (reference.tag.name === 'form') type = 'form';
    if (parsed.origin !== origin || (!isHttp(parsed) && parsed.protocol)) {
      type = reference.tag.name === 'form' ? 'form' : 'external';
      status = offline ? (type === 'form' ? 'form-unchecked' : 'external-unchecked') : (type === 'form' ? 'form-pending' : 'external-pending');
    } else {
      const resolved = routeResolution(parsed, basePath);
      if (resolved.outside && reference.hint !== 'metadata') {
        status = 'base-bypass';
        failure(route + ': ' + raw + ' bypasses <base ' + basePath + '>');
      } else if (routeFiles.has(resolved.route)) {
        const targetIds = new Set(idsIn(htmlContent.get(resolved.route) || ''));
        if (fragment && !targetIds.has(fragment)) {
          status = 'missing-fragment';
          failure(route + ': missing fragment #' + fragment + ' on ' + resolved.route);
        }
      } else if ((assetPath(parsed, basePath) || (reference.hint === 'metadata' && rootAssetPath(parsed))) && fs.existsSync(assetPath(parsed, basePath) || rootAssetPath(parsed))) {
        status = 'asset-ok';
        if (type !== 'metadata') type = 'asset';
      } else {
        status = 'missing';
        failure(route + ': missing internal target ' + (resolved.route || parsed.pathname));
      }
    }
    links.push({ source: route, element: reference.tag.name, attribute: reference.attribute, label, raw, resolved: parsed.href, type, status, finalUrl: parsed.href, fragment, targetRoute: type === 'internal' || type === 'asset' || type === 'metadata' ? routeResolution(parsed, basePath).route : '', owner: owner(type, parsed) });
  }
  routes.push({ route, file: path.relative(root, file).replaceAll(path.sep, '/'), kind, indexability: kind === 'canonical' ? 'indexable' : 'noindex', title: oneText(html, 'title'), h1: allText(html, 'h1'), description, canonical, canonicalRoute, robots, base: basePath, redirect: isRedirect ? (refreshTarget ? 'meta-refresh' : 'script') : '', redirectTarget: redirectRoute, sitemap: false, links: 0, forms: 0 });
}

const externalUrls = [...new Set(links.filter((row) => (row.type === 'external' || row.type === 'form') && /^https?:/i.test(row.resolved)).map((row) => row.resolved.split('#')[0]))].sort();
const evidence = new Map();
const reviewCodes = new Set([401, 403, 405, 406, 408, 418, 429, 451]);
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const checkExternal = async (url, isForm) => {
  // A form action must not be probed with a GET/HEAD request: the edge may
  // intentionally reject reads even while accepting the documented POST.
  // End-to-end form canaries own that proof.
  if (isForm) return { status: 'form-unchecked', httpStatus: null, finalUrl: url, attempts: 0 };
  if (offline) return { status: isForm ? 'form-unchecked' : 'external-unchecked', httpStatus: null, finalUrl: url, attempts: 0 };
  let errorText = '';
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'HardMagic-link-audit/1.0' } });
      if (!isForm && [403, 404, 405, 501].includes(response.status)) response = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'HardMagic-link-audit/1.0', range: 'bytes=0-0' } });
      const status = response.status;
      const finalUrl = response.url || url;
      response.body?.cancel();
      clearTimeout(timer);
      if (reviewCodes.has(status)) return { status: 'external-review', httpStatus: status, finalUrl, attempts: attempt };
      if (status >= 200 && status < 400) return { status: 'external-ok', httpStatus: status, finalUrl, attempts: attempt };
      if (status >= 500 && attempt <= retries) { await pause(attempt * 100); continue; }
      return { status: 'external-failed', httpStatus: status, finalUrl, attempts: attempt };
    } catch (error) {
      clearTimeout(timer);
      errorText = error?.name === 'AbortError' ? 'timeout' : error?.message || 'network-error';
      if (attempt <= retries) { await pause(attempt * 100); continue; }
    }
  }
  return { status: 'external-unreachable', httpStatus: null, finalUrl: url, attempts: retries + 1, error: errorText };
};
for (const url of externalUrls) evidence.set(url, await checkExternal(url, links.some((row) => row.type === 'form' && row.resolved.split('#')[0] === url)));
for (const link of links) {
  const result = evidence.get(link.resolved.split('#')[0]);
  if (!result) continue;
  link.status = link.type === 'form' && result.status === 'external-ok' ? 'form-endpoint-reachable' : link.type === 'form' && result.status === 'external-review' ? 'form-endpoint-review' : result.status;
  link.finalUrl = result.finalUrl;
  link.httpStatus = result.httpStatus;
  if (result.status === 'external-review') warning(link.resolved + ': HTTP ' + result.httpStatus + ' needs source review');
  if (result.status === 'form-unchecked') warning(link.resolved + ': form POST requires a controlled canary; read-only link audit skipped it');
  if (result.status === 'external-unreachable') warning(link.source + ': ' + link.resolved + ' external-unreachable; source owner must recheck');
  if (result.status === 'external-failed') failure(link.source + ': ' + link.resolved + ' ' + result.status);
}
if (offline && externalUrls.length) warning('External checks skipped (--offline); ' + externalUrls.length + ' unique HTTP URLs are unverified');
if (strictExternal && [...evidence.values()].some((result) => result.status !== 'external-ok')) failure('Strict external mode requires every HTTP URL to return 2xx or 3xx');

const xmlFiles = files.filter((file) => /^sitemap(?:-\d+)?\.xml$/.test(path.basename(file))).sort();
const indexFile = path.join(root, 'sitemap-index.xml');
const sitemapFiles = new Set();
const sitemapRows = [];
const locs = (xml) => [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decode(match[1].trim()));
if (isDemoBuild) {
  if (xmlFiles.length) failure('demo build must not publish sitemap XML');
} else {
  const queue = fs.existsSync(indexFile) ? [indexFile] : xmlFiles;
  while (queue.length) {
    const file = queue.shift();
    if (sitemapFiles.has(file) || !fs.existsSync(file)) continue;
    sitemapFiles.add(file);
    const xml = read(file);
    if (/<sitemapindex\b/i.test(xml)) {
      for (const loc of locs(xml)) {
        try {
          const parsed = new URL(loc, origin + (buildBase || '/'));
          const candidate = assetPath(parsed, buildBase || '/');
          if (!candidate || !fs.existsSync(candidate)) failure('sitemap index references missing file ' + loc);
          else queue.push(candidate);
        } catch { failure('invalid sitemap child ' + loc); }
      }
    } else if (/<urlset\b/i.test(xml)) {
      for (const loc of locs(xml)) {
        try {
          const parsed = new URL(loc, origin + (buildBase || '/'));
          const resolved = routeResolution(parsed, buildBase || '/');
          if (parsed.origin !== origin || resolved.outside) failure('sitemap URL outside build base ' + loc);
          sitemapRows.push({ file: path.relative(root, file).replaceAll(path.sep, '/'), url: parsed.href, route: resolved.route });
        } catch { failure('invalid sitemap URL ' + loc); }
      }
    } else failure(path.relative(root, file) + ' is not sitemap XML');
  }
  for (const file of xmlFiles) if (!sitemapFiles.has(file)) failure('unreferenced sitemap file ' + path.relative(root, file));
}
sitemapRows.sort((a, b) => (a.route + '\0' + a.url).localeCompare(b.route + '\0' + b.url));
const sitemapCount = new Map();
for (const row of sitemapRows) sitemapCount.set(row.route, (sitemapCount.get(row.route) || 0) + 1);
for (const [route, count] of [...sitemapCount.entries()].sort()) if (count !== 1) failure('sitemap route ' + route + ' appears ' + count + ' times');
for (const route of routes) {
  const inSitemap = sitemapCount.has(route.route);
  route.sitemap = inSitemap;
  route.links = links.filter((link) => link.source === route.route).length;
  route.forms = links.filter((link) => link.source === route.route && link.type === 'form').length;
  if (!isDemoBuild && route.kind === 'canonical' && !inSitemap) failure(route.route + ': canonical route missing from sitemap');
  if ((!isDemoBuild && route.kind !== 'canonical' && inSitemap) || (isDemoBuild && inSitemap)) failure(route.route + ': ' + route.kind + ' route is present in sitemap');
}
routes.sort((a, b) => a.route.localeCompare(b.route));

const hash = crypto.createHash('sha256');
for (const file of files) { hash.update(path.relative(root, file).replaceAll(path.sep, '/')); hash.update('\0'); hash.update(fs.readFileSync(file)); hash.update('\0'); }
const fingerprint = hash.digest('hex');
const ledger = {
  schemaVersion: 2,
  build: { root: path.relative(process.cwd(), root).replaceAll(path.sep, '/'), origin, basePath: buildBase || '/', sha256: fingerprint },
  policy: { indexableKind: 'canonical', sitemap: 'canonical routes only', redirects: 'static meta-refresh needs edge status verification', externalChecks: offline ? 'offline' : 'bounded HEAD/GET with review statuses for anti-bot responses' },
  counts: {
    html: routes.length, canonical: routes.filter((row) => row.kind === 'canonical').length, noindex: routes.filter((row) => row.indexability === 'noindex').length,
    success: routes.filter((row) => row.kind === 'success').length, redirects: routes.filter((row) => row.kind === 'redirect').length, errors: routes.filter((row) => row.kind === 'error').length,
    links: links.length, internal: links.filter((row) => row.type === 'internal').length, fragments: links.filter((row) => row.fragment).length, assets: links.filter((row) => row.type === 'asset').length,
    forms: links.filter((row) => row.type === 'form').length, external: links.filter((row) => row.type === 'external').length, externalUnique: externalUrls.length, sitemap: sitemapRows.length,
  },
  routes,
  sitemap: { index: fs.existsSync(indexFile) ? 'sitemap-index.xml' : null, files: [...sitemapFiles].map((file) => path.relative(root, file).replaceAll(path.sep, '/')).sort(), urls: sitemapRows },
  external: [...evidence.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([url, result]) => ({ url, ...result })),
  failures: [...failures].sort(),
  warnings: [...warnings].sort(),
};
const fence = String.fromCharCode(96).repeat(3);
const groups = new Map();
for (const row of routes.filter((item) => item.kind === 'canonical')) { const group = row.route.split('/').filter(Boolean)[0] || 'home'; if (!groups.has(group)) groups.set(group, []); groups.get(group).push(row.route); }
const visual = ['# Visual sitemap', '', 'Build fingerprint: ' + fingerprint.slice(0, 16) + ' | base: ' + (buildBase || '/') + ' | canonical routes: ' + ledger.counts.canonical + '.', '', 'Redirect, success/noindex, and error states remain in the route ledger but are omitted from the canonical navigation graph.', '', fence + 'mermaid', 'flowchart TD', '  home["/"]'];
for (const [group, groupRoutes] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const id = 'g_' + group.replace(/[^a-z0-9]+/gi, '_');
  visual.push('  home --> ' + id + '["/' + group + '/ · ' + groupRoutes.length + ' canonical routes"]');
  for (const route of groupRoutes.filter((item) => item !== '/' + group + '/').sort()) visual.push('  ' + id + ' --> r_' + route.replace(/[^a-z0-9]+/gi, '_') + '["' + route + '"]');
}
visual.push(fence, '', '## Canonical route families', '');
for (const [group, groupRoutes] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) visual.push('### /' + group + '/', '', ...groupRoutes.sort().map((route) => '- [' + route + '](' + route + ')'), '');
visual.push('## Excluded rendered states', '', ...routes.filter((row) => row.kind !== 'canonical').map((row) => '- ' + row.route + ' — ' + row.kind + (row.redirectTarget ? ' -> ' + row.redirectTarget : '')), '');
const routeMarkdown = ['# Rendered route ledger', '', 'Build fingerprint: ' + fingerprint + ' | base: ' + (buildBase || '/') + ' | origin: ' + origin + '.', '', 'Counts: ' + JSON.stringify(ledger.counts) + '.', '', '| Route | Kind | Indexability | Sitemap | Canonical | Base | Links | Forms |', '| --- | --- | --- | --- | --- | --- | ---: | ---: |', ...routes.map((row) => '| ' + row.route + ' | ' + row.kind + ' | ' + row.indexability + ' | ' + (row.sitemap ? 'yes' : 'no') + ' | ' + markdown(row.canonical) + ' | ' + row.base + ' | ' + row.links + ' | ' + row.forms + ' |'), '', 'Redirect note: static Astro output exposes legacy redirects as meta-refresh documents. This audit records the target and does not represent that document as HTTP 301/308; deployed edge status remains a release check.', '', 'Failures:', ...(ledger.failures.length ? ledger.failures.map((value) => '- ' + value) : ['- none']), '', 'Warnings:', ...(ledger.warnings.length ? ledger.warnings.map((value) => '- ' + value) : ['- none']), ''].join('\n');
const linkHeader = ['source_route', 'element', 'attribute', 'label', 'raw_url', 'resolved_url', 'type', 'status', 'final_url', 'fragment', 'target_route', 'owner'];
const linkCsv = [linkHeader.join(','), ...links.map((row) => csvRow([row.source, row.element, row.attribute, row.label, row.raw, row.resolved, row.type, row.status, row.finalUrl, row.fragment, row.targetRoute, row.owner]))].join('\n') + '\n';
if (!checkOnly) {
  const docs = path.resolve(process.cwd(), 'docs');
  fs.mkdirSync(docs, { recursive: true });
  fs.writeFileSync(path.join(docs, 'route-ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
  fs.writeFileSync(path.join(docs, 'route-ledger.md'), routeMarkdown);
  fs.writeFileSync(path.join(docs, 'link-ledger.csv'), linkCsv);
  fs.writeFileSync(path.join(docs, 'visual-sitemap.md'), visual.join('\n') + '\n');
}
console.log('Link graph audit: ' + ledger.counts.html + ' HTML routes, ' + ledger.counts.links + ' references, ' + ledger.counts.sitemap + ' sitemap URLs, ' + ledger.failures.length + ' failures, ' + ledger.warnings.length + ' review warnings.');
for (const value of ledger.warnings.slice(0, 20)) console.warn('- review: ' + value);
for (const value of ledger.failures.slice(0, 80)) console.error('- failure: ' + value);
if (ledger.failures.length > 80) console.error('- failure: … ' + (ledger.failures.length - 80) + ' more');
if (ledger.failures.length) process.exitCode = 1;
