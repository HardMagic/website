import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type RenderedRouteState = 'canonical' | 'redirect' | 'thanks' | 'not-found';

export interface RenderedRoute {
  path: string;
  requestPath: string;
  sourceFile: string;
  state: RenderedRouteState;
  redirectTarget: string | null;
  baseHref: string;
  title: string;
  description: string;
  robots: string;
  canonical: string;
  h1Count: number;
  referenceCount: number;
  issues: Array<{ code: string; message: string; raw?: string; target?: string }>;
}

export interface RenderedRouteManifest {
  schemaVersion: number;
  buildFingerprint: string;
  routeCount: number;
  stateCounts: Record<string, number>;
  routes: RenderedRoute[];
}

const manifestPath = resolve(process.cwd(), 'docs/release-evidence/visual/rendered-route-manifest.json');

export function readRenderedRouteManifest(): RenderedRouteManifest {
  let manifest: RenderedRouteManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RenderedRouteManifest;
  } catch (error) {
    throw new Error(`Missing rendered route manifest at ${manifestPath}. Run node scripts/audit-rendered-routes.mjs after building dist.`, { cause: error });
  }
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.routes) || manifest.routeCount !== manifest.routes.length) {
    throw new Error(`Invalid rendered route manifest at ${manifestPath}.`);
  }
  return manifest;
}

export function routeId(route: Pick<RenderedRoute, 'path' | 'state'>): string {
  const path = route.path === '/' ? 'home' : route.path.replace(/^\//, '').replace(/\/$/, '').replace(/[^a-zA-Z0-9]+/g, '-');
  return `${path || 'root'}--${route.state}`;
}

export function routeLabel(route: Pick<RenderedRoute, 'path' | 'state'>): string {
  return `${route.path} [${route.state}]`;
}

export function representativeRoutes(routes: readonly RenderedRoute[]): RenderedRoute[] {
  const wanted = [
    '/',
    '/404/',
    '/products/',
    '/products/studio/image/',
    '/services/creative-direction/',
    '/industries/media-entertainment/',
    '/methods/accessibility-as-editorial/',
    '/insights/creative-direction-after-model-abundance/',
    '/briefs/',
    '/briefs/generative-media-operating-system/',
    '/briefs/generative-media-operating-system/thanks/',
    '/horizon/',
    '/horizon/direction-after-infinite-production/',
    '/portfolio/',
    '/portfolio/state-parks/',
    '/contact/',
    '/contact/thanks/',
    '/privacy/',
    '/security/',
    '/sitemap/',
    '/portfolio-item/airikai/',
  ];
  const byPath = new Map(routes.map((route) => [route.path, route]));
  return wanted.flatMap((path) => {
    const route = byPath.get(path);
    return route ? [route] : [];
  });
}

export function highRiskRoutes(routes: readonly RenderedRoute[]): RenderedRoute[] {
  const representative = representativeRoutes(routes);
  const byState = new Map<RenderedRouteState, RenderedRoute>();
  for (const route of routes) if (!byState.has(route.state)) byState.set(route.state, route);
  return [...new Map([...representative, ...byState.values()].map((route) => [route.path, route])).values()];
}
