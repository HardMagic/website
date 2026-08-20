import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);
const root = path.resolve(process.cwd(), argv.find((arg) => !arg.startsWith('--')) || 'dist');
const origin = (process.env.AUDIT_ORIGIN || 'https://hardmagic.com').replace(/\/$/, '');
const ledgerFile = path.resolve(process.cwd(), process.env.AUDIT_ROUTE_LEDGER || 'docs/route-ledger.json');
const failures = new Set();
const failure = (value) => failures.add(value);
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
const xmlFiles = files.filter((file) => /^sitemap(?:-\d+)?\.xml$/.test(path.basename(file))).sort();
const routeFromFile = (file) => {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (relative === '404.html') return '/404/';
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return '/' + relative.slice(0, -'/index.html'.length) + '/';
  return '/' + relative.replace(/\.html$/, '');
};
const routeFiles = new Map(htmlFiles.map((file) => [routeFromFile(file), file]));
const decode = (value) => String(value || '').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const tags = (html, name) => [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi'))].map((match) => match[0]);
const attr = (token, name) => {
  const match = String(token || '').match(new RegExp("\\b" + name + "\\s*=\\s*(?:\\\"([^\\\"]*)\\\"|'([^']*)')", "i"));
  return decode(match ? (match[1] == null ? match[2] : match[1]) : '');
};
const firstHtml = htmlFiles.find((file) => !file.endsWith('/404.html')) || htmlFiles[0];
const baseHref = firstHtml ? attr(tags(read(firstHtml), 'base')[0] || '', 'href') : '/';
let baseUrl;
try { baseUrl = new URL(baseHref || origin + '/', origin); } catch { failure('invalid build base URL'); baseUrl = new URL(origin + '/'); }
const basePath = baseUrl.pathname === '/' ? '/' : (baseUrl.pathname.endsWith('/') ? baseUrl.pathname : baseUrl.pathname + '/');
const stripBase = (pathname) => {
  if (basePath === '/') return pathname || '/';
  if (pathname === basePath.slice(0, -1)) return '/';
  return pathname.startsWith(basePath) ? pathname.slice(basePath.length - 1) || '/' : null;
};
const normalizeRoute = (pathname) => {
  let route = pathname || '/';
  if (!route.startsWith('/')) route = '/' + route;
  if (route === '/404.html') return '/404/';
  if (route.endsWith('/index.html')) route = route.slice(0, -'index.html'.length);
  if (route.endsWith('.html')) return route;
  return route.endsWith('/') ? route : route + '/';
};
const states = new Map();
for (const [route, file] of routeFiles) {
  const html = read(file);
  const meta = tags(html, 'meta');
  const robots = attr(meta.find((tag) => attr(tag, 'name').toLowerCase() === 'robots') || '', 'content');
  const refresh = meta.find((tag) => attr(tag, 'http-equiv').toLowerCase() === 'refresh');
  const isNoindex = /(^|[\s,])noindex([\s,]|$)/i.test(robots);
  const kind = route === '/404/' ? 'error' : refresh ? 'redirect' : route.endsWith('/thanks/') ? 'success' : isNoindex ? 'noindex' : 'canonical';
  states.set(route, { kind, noindex: isNoindex });
}

const locs = (xml) => [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map((match) => decode(match[1].trim()));
const indexFile = path.join(root, 'sitemap-index.xml');
if (!fs.existsSync(indexFile)) failure('missing sitemap-index.xml');
const reachable = new Set();
const sitemapRows = [];
const queue = fs.existsSync(indexFile) ? [indexFile] : xmlFiles;
while (queue.length) {
  const file = queue.shift();
  if (reachable.has(file) || !fs.existsSync(file)) continue;
  reachable.add(file);
  const xml = read(file);
  if (/<sitemapindex\b/i.test(xml)) {
    for (const loc of locs(xml)) {
      try {
        const url = new URL(loc, origin + basePath);
        if (url.origin !== origin) { failure('sitemap index child leaves site: ' + loc); continue; }
        const stripped = stripBase(url.pathname);
        if (stripped === null) { failure('sitemap index child bypasses base: ' + loc); continue; }
        const child = path.resolve(root, stripped.replace(/^\/+/, ''));
        if (!child.startsWith(root + path.sep) || !fs.existsSync(child)) failure('missing sitemap child: ' + loc);
        else queue.push(child);
      } catch { failure('invalid sitemap child: ' + loc); }
    }
  } else if (/<urlset\b/i.test(xml)) {
    for (const loc of locs(xml)) {
      try {
        const url = new URL(loc, origin + basePath);
        if (url.origin !== origin) { failure('sitemap URL leaves site: ' + loc); continue; }
        const stripped = stripBase(url.pathname);
        if (stripped === null) { failure('sitemap URL bypasses base: ' + loc); continue; }
        sitemapRows.push({ file: path.relative(root, file).replaceAll(path.sep, '/'), url: url.href, route: normalizeRoute(stripped) });
      } catch { failure('invalid sitemap URL: ' + loc); }
    }
  } else failure(path.relative(root, file) + ' is not sitemap XML');
}
for (const file of xmlFiles) if (!reachable.has(file)) failure('unreferenced sitemap file: ' + path.relative(root, file));
sitemapRows.sort((left, right) => (left.route + '\0' + left.url).localeCompare(right.route + '\0' + right.url));
const counts = new Map();
for (const row of sitemapRows) counts.set(row.route, (counts.get(row.route) || 0) + 1);
for (const [route, count] of [...counts.entries()].sort()) if (count !== 1) failure('sitemap route appears ' + count + ' times: ' + route);
for (const [route, state] of [...states.entries()].sort()) {
  const count = counts.get(route) || 0;
  if (state.kind === 'canonical' && count !== 1) failure('canonical route missing from sitemap: ' + route);
  if (state.kind !== 'canonical' && count) failure(state.kind + ' route is in sitemap: ' + route);
}
for (const route of [...counts.keys()].sort()) if (!states.has(route)) failure('sitemap references unbuilt route: ' + route);

const robotsFile = path.join(root, 'robots.txt');
if (!fs.existsSync(robotsFile)) failure('missing dist/robots.txt');
else {
  const robots = read(robotsFile);
  const sitemapLines = [...robots.matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)].map((match) => match[1]);
  if (sitemapLines.length !== 1) failure('robots.txt must have exactly one Sitemap directive');
  else {
    try {
      const declared = new URL(sitemapLines[0], origin + '/');
      const expected = new URL(origin + basePath + 'sitemap-index.xml');
      if (declared.href !== expected.href) failure('robots sitemap does not match build sitemap index: ' + declared.href);
    } catch { failure('robots Sitemap directive is invalid'); }
  }
  const disallow = [...robots.matchAll(/^\s*Disallow:\s*(\S*)\s*$/gim)].map((match) => match[1]);
  const escapeRegex = (part) => part.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  const matches = (pattern, route) => new RegExp('^' + pattern.split('*').map(escapeRegex).join('.*')).test(route);
  for (const [route, state] of [...states.entries()].sort()) if (state.kind === 'canonical' && disallow.some((pattern) => pattern && matches(pattern, route))) failure('robots disallows canonical route: ' + route);
}

if (fs.existsSync(ledgerFile)) {
  try {
    const ledger = JSON.parse(read(ledgerFile));
    const ledgerRoutes = new Map((ledger.routes || []).map((row) => [row.route, row]));
    for (const route of [...states.keys()].sort()) {
      if (!ledgerRoutes.has(route)) failure('route ledger missing route: ' + route);
      else if (Boolean(ledgerRoutes.get(route).sitemap) !== counts.has(route)) failure('route ledger sitemap membership differs: ' + route);
    }
    for (const route of [...ledgerRoutes.keys()].sort()) if (!states.has(route)) failure('route ledger contains unbuilt route: ' + route);
  } catch (error) { failure('route ledger JSON is invalid: ' + error.message); }
}

const summary = {
  buildRoot: path.relative(process.cwd(), root).replaceAll(path.sep, '/'),
  basePath,
  html: states.size,
  canonical: [...states.values()].filter((state) => state.kind === 'canonical').length,
  noindex: [...states.values()].filter((state) => state.kind !== 'canonical').length,
  success: [...states.values()].filter((state) => state.kind === 'success').length,
  redirects: [...states.values()].filter((state) => state.kind === 'redirect').length,
  errors: [...states.values()].filter((state) => state.kind === 'error').length,
  sitemap: sitemapRows.length,
  sitemapFiles: [...reachable].map((file) => path.relative(root, file).replaceAll(path.sep, '/')).sort(),
  robots: fs.existsSync(robotsFile),
  failures: [...failures].sort(),
};
console.log('Sitemap audit: ' + summary.html + ' HTML routes, ' + summary.sitemap + ' sitemap URLs, ' + summary.failures.length + ' failures.');
for (const value of summary.failures) console.error('- failure: ' + value);
if (summary.failures.length) process.exitCode = 1;
