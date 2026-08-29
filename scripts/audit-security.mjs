#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, resolve } from 'node:path';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];

function argumentValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function parseHeaders(source) {
  const headers = new Map();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('/')) continue;
    const separator = trimmed.indexOf(':');
    if (separator < 1) continue;
    headers.set(trimmed.slice(0, separator).trim().toLowerCase(), trimmed.slice(separator + 1).trim());
  }
  return headers;
}

function headerValue(headers, name) {
  return headers.get(name.toLowerCase()) ?? '';
}

function assertSecurityHeaders(headers, label) {
  const prefix = label ? `${label}: ` : '';
  const required = {
    'strict-transport-security': /max-age=\d+\s*;\s*includeSubDomains/i,
    'permissions-policy': /(?:^|[,;\s])camera=\(\)/i,
    'x-frame-options': /^DENY$/i,
    'cross-origin-opener-policy': /^same-origin$/i,
    'cross-origin-resource-policy': /^same-origin$/i,
    'x-content-type-options': /^nosniff$/i,
    'referrer-policy': /^strict-origin-when-cross-origin$/i,
    'x-permitted-cross-domain-policies': /^none$/i,
  };

  for (const [name, pattern] of Object.entries(required)) {
    const value = headerValue(headers, name);
    check(value && pattern.test(value), `${prefix}${name} is missing or incompatible.`);
  }

  const csp = headerValue(headers, 'content-security-policy');
  check(Boolean(csp), `${prefix}content-security-policy is missing.`);
  if (!csp) return;
  check(/(?:^|;)\s*default-src\s+'none'/i.test(csp), `${prefix}CSP must default to none.`);
  check(/(?:^|;)\s*object-src\s+'none'/i.test(csp), `${prefix}CSP must disable object sources.`);
  check(/(?:^|;)\s*base-uri\s+'self'/i.test(csp), `${prefix}CSP must restrict base-uri.`);
  check(/(?:^|;)\s*frame-ancestors\s+'none'/i.test(csp), `${prefix}CSP must deny framing.`);
  check(/(?:^|;)\s*form-action\s+'self'(?:\s|;|$)/i.test(csp), `${prefix}CSP must keep same-origin form actions.`);
  const scriptSource = csp.match(/(?:^|;)\s*script-src\s+([^;]+)/i)?.[1] ?? '';
  check(Boolean(scriptSource), `${prefix}CSP must declare script-src.`);
  check(!/unsafe-inline/i.test(scriptSource), `${prefix}CSP script-src must not allow unsafe-inline.`);
  check(/https:\/\/challenges\.cloudflare\.com/i.test(scriptSource), `${prefix}CSP script-src must allow Turnstile.`);
  check(/https:\/\/static\.cloudflareinsights\.com/i.test(scriptSource), `${prefix}CSP script-src must allow Cloudflare Insights.`);
  check(/(?:^|;)\s*script-src-attr\s+'none'/i.test(csp), `${prefix}CSP must disable inline script attributes.`);
  check(/(?:^|;)\s*frame-src\s+[^;]*https:\/\/www\.youtube-nocookie\.com/i.test(csp), `${prefix}CSP must allow the consent-gated YouTube iframe.`);
  check(/(?:^|;)\s*connect-src\s+[^;]*cloudflareinsights\.com/i.test(csp), `${prefix}CSP must allow Cloudflare Insights connections.`);
  check(/(?:^|;)\s*img-src\s+[^;]*'self'/i.test(csp), `${prefix}CSP must allow local images.`);
  check(/(?:^|;)\s*font-src\s+[^;]*'self'/i.test(csp), `${prefix}CSP must allow local fonts.`);
  check(/(?:^|;)\s*style-src\s+[^;]*'self'/i.test(csp), `${prefix}CSP must allow local styles.`);
}

function parseAttributes(source) {
  const attributes = {};
  const pattern = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g;
  let match;
  while ((match = pattern.exec(source))) attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return attributes;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else files.push(file);
  }
  return files;
}

function assertNoExecutableInlineScripts(html, file) {
  const nonExecutableTypes = new Set([
    'application/json',
    'application/ld+json',
    'importmap',
    'speculationrules',
    'text/plain',
    'text/x-handlebars-template',
  ]);
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    const attributes = parseAttributes(match[1] ?? '');
    if (attributes.src) continue;
    const type = (attributes.type ?? '').split(';', 1)[0].trim().toLowerCase();
    if (nonExecutableTypes.has(type)) continue;
    if (match[2].trim()) failures.push(`Built HTML contains an executable inline script: ${relative(repositoryRoot, file)}`);
  }
}

async function assertSecurityTxt(file) {
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    failures.push(`Missing security.txt: ${relative(repositoryRoot, file)}`);
    return;
  }

  const fields = new Map();
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf(':');
    if (separator > 0) fields.set(trimmed.slice(0, separator).toLowerCase(), trimmed.slice(separator + 1).trim());
  }
  const contact = fields.get('contact') ?? '';
  const policy = fields.get('policy') ?? '';
  const canonical = fields.get('canonical') ?? '';
  const languages = fields.get('preferred-languages') ?? '';
  const expires = fields.get('expires') ?? '';
  check(/^mailto:/i.test(contact), 'security.txt must provide a mailto Contact.');
  check(/^https:\/\//i.test(policy), 'security.txt Policy must be an HTTPS URL.');
  check(canonical === 'https://hardmagic.com/.well-known/security.txt', 'security.txt Canonical must identify the public security.txt URL.');
  check(/\ben\b/i.test(languages), 'security.txt must declare English as a preferred language.');
  const expiresAt = Date.parse(expires);
  check(Number.isFinite(expiresAt) && expiresAt > Date.now(), 'security.txt Expires must be a valid future timestamp.');
}

async function assertLiveHeaders(url) {
  let response;
  try {
    response = await fetch(url, { redirect: 'follow', headers: { accept: 'text/html' } });
  } catch (error) {
    failures.push(`LIVE_SITE_URL could not be fetched: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  check(response.ok, `LIVE_SITE_URL returned HTTP ${response.status}.`);
  const headers = new Map();
  response.headers.forEach((value, key) => headers.set(key.toLowerCase(), value));
  assertSecurityHeaders(headers, 'LIVE_SITE_URL');
}

async function main() {
  const headersFile = resolve(repositoryRoot, argumentValue('--headers', process.env.HARDMAGIC_HEADERS_FILE ?? 'public/_headers'));
  const securityFile = resolve(repositoryRoot, argumentValue('--security-txt', process.env.HARDMAGIC_SECURITY_TXT_FILE ?? 'public/.well-known/security.txt'));
  const builtRoot = resolve(repositoryRoot, argumentValue('--built-dir', process.env.HARDMAGIC_DIST ?? 'dist'));

  let headerSource = '';
  try {
    headerSource = await readFile(headersFile, 'utf8');
  } catch {
    failures.push(`Missing public headers contract: ${relative(repositoryRoot, headersFile)}`);
  }
  if (headerSource) {
    const firstDirective = headerSource.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    check(firstDirective === '/*', 'public/_headers must apply the contract to all paths with /*.');
    assertSecurityHeaders(parseHeaders(headerSource), 'public/_headers');
  }

  await assertSecurityTxt(securityFile);

  let builtFiles = [];
  try {
    builtFiles = await walk(builtRoot);
  } catch {
    failures.push(`Missing built output for security audit: ${relative(repositoryRoot, builtRoot)}`);
  }
  check(builtFiles.length > 0, `Built output is empty: ${relative(repositoryRoot, builtRoot)}`);
  if (builtFiles.length) {
    check(builtFiles.includes(join(builtRoot, '_headers')), 'Built output is missing _headers.');
    check(builtFiles.includes(join(builtRoot, '.well-known', 'security.txt')), 'Built output is missing .well-known/security.txt.');
    const htmlFiles = builtFiles.filter((file) => file.endsWith('.html'));
    for (const file of htmlFiles) assertNoExecutableInlineScripts(await readFile(file, 'utf8'), file);
    console.log(`Built security scan inspected ${htmlFiles.length} HTML files.`);
  }

  const liveSiteUrl = process.env.LIVE_SITE_URL?.trim();
  if (liveSiteUrl) {
    let parsed;
    try { parsed = new URL(liveSiteUrl); } catch { parsed = null; }
    check(Boolean(parsed && ['http:', 'https:'].includes(parsed.protocol)), 'LIVE_SITE_URL must be an HTTP(S) URL.');
    if (parsed && ['http:', 'https:'].includes(parsed.protocol)) await assertLiveHeaders(parsed);
  }

  if (failures.length) {
    console.error(`Security audit failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log('Security audit passed: headers, security.txt, built inline-script policy, and optional live headers are valid.');
}

await main();
