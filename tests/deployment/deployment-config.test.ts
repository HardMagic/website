import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const readRepositoryFile = (path: string) => readFileSync(join(repositoryRoot, path), 'utf8');

process.env.HARDMAGIC_DEPLOY_TARGET ??= 'local';
const {
  applyDemoDocumentPolicy,
  DEMO_BASE_PATH,
  deploymentSettingsFor,
  DEPLOYMENT_TARGET_ENV,
  PUBLIC_SITE_ORIGIN,
  resolveDeploymentTarget,
} = await import('../../astro.config');

describe('BriefLock deployment contracts', () => {
  it('sets the documented public host as the Front Door origin host header', () => {
    const source = readRepositoryFile('infra/brief-delivery/edge.bicep');
    expect(source).toContain("originHostHeader: 'briefs.hardmagic.com'");
    expect(source).not.toContain('originHostHeader: functionOriginHostname');
  });

  it('suppresses only the known benign lifecycle messages in the failure alert', () => {
    const source = readRepositoryFile('infra/brief-delivery/modules/brief-lock.bicep');
    expect(source).toContain('node exited with code 143');
    expect(source).toContain('Language Worker Process exited');
    expect(source).toContain('AlertMessage in (benignSigtermMessages)');
    expect(source).toContain('AlertMessage == "Language Worker Process exited"');
    expect(source).toContain('benignSigtermPresent');
    expect(source).toContain('benignWorkerExitPresent');
    expect(source).toContain('not (benignSigtermPresent and benignWorkerExitPresent and AlertMessage in (benignLifecycleMessages))');
    expect(source).toContain('AppExceptions');
    expect(source).toContain('AppTraces | where SeverityLevel >= 3');
    expect(source).not.toContain('AlertMessage has_any');
  });
});

describe('deployment target contract', () => {
  it('keeps local and public builds at the origin root', () => {
    expect(deploymentSettingsFor(resolveDeploymentTarget(undefined, false))).toMatchObject({
      target: 'local',
      base: '/',
      noindex: false,
    });
    expect(deploymentSettingsFor(resolveDeploymentTarget('public', true))).toMatchObject({
      target: 'public',
      base: '/',
      noindex: false,
    });
  });

  it('uses the explicit GitLab demo project path and noindex policy', () => {
    expect(deploymentSettingsFor(resolveDeploymentTarget('demo', true))).toEqual({
      target: 'demo',
      base: DEMO_BASE_PATH,
      noindex: true,
    });
    expect(applyDemoDocumentPolicy('<html><head><title>Demo</title></head></html>')).toContain(
      '<meta name="robots" content="noindex, nofollow">',
    );
  });

  it('fails closed for missing CI targets and unknown values', () => {
    expect(() => resolveDeploymentTarget(undefined, true)).toThrow(DEPLOYMENT_TARGET_ENV);
    expect(() => resolveDeploymentTarget('staging', true)).toThrow(DEPLOYMENT_TARGET_ENV);
    expect(() => resolveDeploymentTarget('demo ', true)).not.toThrow();
  });
});

const artifactTarget = process.env.HARDMAGIC_DEPLOYMENT_TEST_TARGET;
const artifactRoot = process.env.HARDMAGIC_DEPLOYMENT_TEST_ROOT ?? join(process.cwd(), 'dist');
const artifactReady = Boolean(artifactTarget && existsSync(join(artifactRoot, 'index.html')));
const artifactHtmlFiles = (root: string): string[] => {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) files.push(...artifactHtmlFiles(absolute));
    else if (entry.name.endsWith('.html')) files.push(absolute);
  }
  return files;
};
const renderedHtmlFiles = artifactReady ? artifactHtmlFiles(artifactRoot) : [];

describe.skipIf(!artifactReady)('rendered deployment URL contract', () => {
  const target = resolveDeploymentTarget(artifactTarget ?? 'local', true);
  const settings = deploymentSettingsFor(target);
  const base = settings.base === '/' ? '/' : `${settings.base}/`;
  const index = artifactReady ? readFileSync(join(artifactRoot, 'index.html'), 'utf8') : '';
  const nested = artifactReady
    ? readFileSync(join(artifactRoot, 'briefs', 'generative-media-operating-system', 'index.html'), 'utf8')
    : '';
  const sitemap = artifactReady ? readFileSync(join(artifactRoot, 'sitemap-0.xml'), 'utf8') : '';

  it('keeps canonical and Open Graph URLs on the public origin', () => {
    for (const html of [index, nested]) {
      expect(html).toContain(`<base href="${base}">`);
      expect(html).toContain(`<link rel="canonical" href="${PUBLIC_SITE_ORIGIN}/`);
      expect(html).toContain(`<meta property="og:url" content="${PUBLIC_SITE_ORIGIN}/`);
      expect(html).toContain(`<meta property="og:image" content="${PUBLIC_SITE_ORIGIN}/`);
    }
    const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
      .map((match) => match[1])
      .filter((url): url is string => Boolean(url));
    expect(sitemapUrls.every((url) => url.startsWith(PUBLIC_SITE_ORIGIN))).toBe(true);
    if (target === 'demo') {
      expect(sitemapUrls.every((url) => url.startsWith(`${PUBLIC_SITE_ORIGIN}${DEMO_BASE_PATH}/`))).toBe(true);
    } else {
      expect(sitemapUrls.every((url) => !url.startsWith(`${PUBLIC_SITE_ORIGIN}${DEMO_BASE_PATH}/`))).toBe(true);
    }
  });

  it('resolves generated styles and media under the configured base', () => {
    for (const html of [index, nested]) {
      const assetUrls = [...html.matchAll(/(?:href|src)="([^"]*assets\/[^"#?]+)/g)]
        .map((match) => match[1])
        .filter((url): url is string => Boolean(url));
      expect(assetUrls.length).toBeGreaterThan(0);
      expect(assetUrls.every((url) => url.startsWith(base))).toBe(true);
      expect(html).not.toMatch(/(?:href|src)="\/_astro\//);
    }
  });

  it('marks demo output private while leaving public output indexable', () => {
    const robots = artifactReady ? readFileSync(join(artifactRoot, 'robots.txt'), 'utf8') : '';
    if (target === 'demo') {
      expect(index).toContain('<meta name="robots" content="noindex, nofollow">');
      expect(robots).toContain('Disallow: /');
      expect(renderedHtmlFiles.length).toBeGreaterThan(0);
      expect(renderedHtmlFiles.every((file) => readFileSync(file, 'utf8').includes('<meta name="robots" content="noindex, nofollow">'))).toBe(true);
    } else {
      expect(index).not.toContain('<meta name="robots"');
      expect(robots).toContain(`Sitemap: ${PUBLIC_SITE_ORIGIN}/sitemap-index.xml`);
    }
  });
});
