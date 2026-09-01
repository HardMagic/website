import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readRenderedRouteManifest, routeId, type RenderedRouteManifest } from './rendered-route-manifest';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

async function readCaptureMetadata(capturePath: string): Promise<{ sha256: string | null; bytes: number | null }> {
  try {
    const contents = await readFile(capturePath);
    return {
      sha256: createHash('sha256').update(contents).digest('hex'),
      bytes: contents.byteLength,
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return { sha256: null, bytes: null };
    }
    throw error;
  }
}

export default async function globalTeardown(): Promise<void> {
  const evidenceDirectory = resolve(process.cwd(), 'docs/release-evidence/visual');
  await mkdir(evidenceDirectory, { recursive: true });
  let manifest: RenderedRouteManifest;
  try {
    manifest = readRenderedRouteManifest();
  } catch {
    return;
  }
  const projects = [
    { name: 'chromium-390', viewport: { width: 390, height: 844 } },
    { name: 'chromium-1440', viewport: { width: 1440, height: 900 } },
  ];
  const captures: Array<{
    project: string;
    viewport: { width: number; height: number };
    route: string;
    state: string;
    routeId: string;
    path: string;
    sha256: string | null;
    bytes: number | null;
  }> = [];
  for (const route of manifest.routes) {
    for (const project of projects) {
      const path = `captures/${project.name}/${routeId(route)}.png`;
      const metadata = await readCaptureMetadata(resolve(evidenceDirectory, path));
      captures.push({
        project: project.name,
        viewport: project.viewport,
        route: route.path,
        state: route.state,
        routeId: routeId(route),
        path,
        ...metadata,
      });
    }
  }
  await writeFile(resolve(evidenceDirectory, 'visual-capture-manifest.json'), `${JSON.stringify({
    schemaVersion: 1,
    buildFingerprint: manifest.buildFingerprint,
    routeCount: manifest.routeCount,
    projects,
    captureRoot: 'captures',
    captureContract: {
      sourceOfTruth: 'CI/object artifact evidence',
      retention: 'Retain according to the CI/object-artifact retention policy.',
      local: 'Untracked local captures are disposable and are not source truth.',
    },
    captures,
  }, null, 2)}\n`);
  const figures = captures.map((capture) => {
    const image = capture.path;
    const label = `${capture.route} [${capture.state}]`;
    return `<figure data-route="${escapeHtml(capture.route)}" data-state="${escapeHtml(capture.state)}"><a href="${image}"><img loading="lazy" src="${image}" alt="${escapeHtml(label)}" /></a><figcaption>${escapeHtml(label)} · ${capture.project}</figcaption></figure>`;
  });
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Rendered route contact sheet</title>
<style>body{margin:0;padding:2rem;background:#100b0d;color:#f2e9df;font:16px/1.4 system-ui,sans-serif}h1{max-width:70rem;margin:0 auto 1rem}p{max-width:70rem;margin:0 auto 2rem;color:#d8c9cb}.sheet{display:grid;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr));gap:1rem;max-width:120rem;margin:auto}figure{margin:0;border:1px solid #45333a;background:#1a1115}img{display:block;width:100%;aspect-ratio:16/10;object-fit:cover;background:#090709}figcaption{padding:.6rem .75rem;font-size:.78rem;overflow-wrap:anywhere}</style>
</head><body><h1>Rendered route contact sheet</h1><p>${manifest.routeCount} generated HTML outputs · fingerprint ${manifest.buildFingerprint}</p><main class="sheet">${figures.join('')}</main></body></html>
`;
  await writeFile(resolve(evidenceDirectory, 'contact-sheet.html'), html);
}
