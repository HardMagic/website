import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.env.HARDMAGIC_DIST ?? fileURLToPath(new URL('../dist/', import.meta.url)));
const output = fileURLToPath(new URL('../docs/cta-ledger.csv', import.meta.url));
const origin = process.env.HARDMAGIC_SITE_ORIGIN ?? 'https://hardmagic.com';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : entry.name.endsWith('.html') ? [path] : [];
  }));
  return nested.flat();
}

function routeForFile(file) {
  const relativePath = relative(root, file).replaceAll('\\', '/');
  if (relativePath === 'index.html') return '/';
  return `/${relativePath.replace(/\/index\.html$/, '').replace(/\.html$/, '')}/`;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match?.[2] ?? '';
}

function textContent(value) {
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function csv(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function classifyTarget(raw, baseHref) {
  if (!raw) return { resolved: '', target: '', kind: 'missing', strength: 'fail', solution: 'Unmapped' };
  if (raw.startsWith('mailto:')) return { resolved: raw, target: raw, kind: 'email-fallback', strength: 'strong', solution: 'Direct human fallback' };
  if (raw.startsWith('tel:')) return { resolved: raw, target: raw, kind: 'phone-fallback', strength: 'strong', solution: 'Direct human fallback' };

  let resolved;
  try {
    resolved = new URL(raw, new URL(baseHref, origin)).toString();
  } catch {
    return { resolved: '', target: raw, kind: 'invalid', strength: 'fail', solution: 'Unmapped' };
  }
  const url = new URL(resolved);
  if (url.origin !== origin && url.origin !== 'https://briefs.hardmagic.com') {
    return { resolved, target: url.pathname, kind: 'external', strength: 'review', solution: 'External dependency' };
  }
  if (url.origin === 'https://briefs.hardmagic.com') {
    const solution = url.pathname.includes('brief-request') ? 'BriefLock private delivery' : url.pathname.includes('contact-request') ? 'Qualified consultation intake' : 'Brief delivery edge';
    return { resolved, target: `${url.pathname}${url.search}`, kind: 'application', strength: 'strong', solution };
  }
  const target = `${url.pathname}${url.hash}`;
  const path = url.pathname;
  if (path === '/' && url.hash) {
    return { resolved, target, kind: 'anchor-navigation', strength: 'intentional', solution: 'In-page decision navigation' };
  }
  if (path === '/') {
    return { resolved, target, kind: 'utility-navigation', strength: 'intentional', solution: 'Home navigation' };
  }
  const solution = path.startsWith('/contact') ? 'Qualified consultation intake'
    : path.startsWith('/briefs') ? 'BriefLock private delivery'
      : path.startsWith('/services') ? 'Specific service solution'
        : path.startsWith('/engagements') ? 'Specific engagement solution'
          : path.startsWith('/products') ? 'Product-qualified evaluation'
            : path.startsWith('/methods') || path.startsWith('/insights') || path.startsWith('/horizon') ? 'Research or method path'
              : path.startsWith('/portfolio') ? 'Relevant experience proof'
                : path.startsWith('/company') ? 'Company context'
                  : 'Review target';
  const strong = /\/(contact|briefs|services|engagements|products|methods|insights|horizon|portfolio|company)(\/|$)/.test(path);
  return { resolved, target, kind: 'internal', strength: strong ? 'strong' : 'review', solution };
}

function stageFor(className, isForm) {
  if (isForm || /\bbutton\b|\bsubmit\b/i.test(className)) return 'primary';
  if (/\btext-link\b|\bconfirmation-link\b|\bcta\b/i.test(className)) return 'early-stage';
  return 'utility-action';
}

const rows = [];
for (const file of (await walk(root)).sort()) {
  const html = await readFile(file, 'utf8');
  const route = routeForFile(file);
  const baseHref = html.match(/<base\b[^>]*href=["']([^"']+)["']/i)?.[1] ?? '/';

  for (const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const tag = match[0];
    const formAttrs = match[1] ?? '';
    const action = attr(`<form ${formAttrs}>`, 'action');
    if (!action) continue;
    const submit = (match[2] ?? '').match(/<button\b[^>]*>([\s\S]*?)<\/button>/i);
    const label = textContent(submit?.[1] ?? '') || 'Submit request';
    const target = classifyTarget(action, baseHref);
    rows.push({ route, element: 'form', label, raw: action, ...target, stage: 'primary', position: 'form' });
  }

  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = match[1] ?? '';
    const className = attr(`<a ${attrs}>`, 'class');
    if (!/\bbutton\b|\btext-link\b|\bconfirmation-link\b|\bconfirmation-summary-link\b|\bcta\b/i.test(className)) continue;
    const raw = attr(`<a ${attrs}>`, 'href');
    const target = classifyTarget(raw, baseHref);
    rows.push({ route, element: 'a', label: textContent(match[2] ?? ''), raw, ...target, stage: stageFor(className, false), position: className });
  }
}

rows.sort((left, right) => left.route.localeCompare(right.route) || left.stage.localeCompare(right.stage) || left.label.localeCompare(right.label));
const header = ['route', 'audience_intent', 'cta_copy', 'position', 'target', 'solution', 'funnel_stage', 'target_type', 'resolved_url', 'strength'];
const csvRows = [header, ...rows.map((row) => [
  row.route,
  'Declared page intent; confirm against editorial brief.',
  row.label,
  row.position,
  row.raw,
  row.solution,
  row.stage,
  row.kind,
  row.resolved,
  row.strength,
])].map((row) => row.map(csv).join(',')).join('\n') + '\n';
await writeFile(output, csvRows, 'utf8');

const failures = rows.filter((row) => row.strength === 'fail');
if (!rows.length) throw new Error('CTA audit found no action rows.');
if (failures.length) throw new Error(`CTA audit found ${failures.length} unmapped action targets.`);
const primaryRoutes = new Set(rows.filter((row) => row.stage === 'primary').map((row) => row.route));
const earlyStageRoutes = new Set(rows.filter((row) => row.stage === 'early-stage').map((row) => row.route));
console.log(`CTA audit passed: ${rows.length} actions across ${new Set(rows.map((row) => row.route)).size} routes; ${primaryRoutes.size} primary and ${earlyStageRoutes.size} early-stage routes; ${rows.filter((row) => row.strength === 'review').length} targets require editorial review.`);
