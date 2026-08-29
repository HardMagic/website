import { defineConfig } from 'astro/config';
import type { AstroIntegration } from 'astro';
import sitemap from '@astrojs/sitemap';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEPLOYMENT_TARGET_ENV = 'HARDMAGIC_DEPLOY_TARGET';
export const PUBLIC_SITE_ORIGIN = 'https://hardmagic.com';
export const DEMO_BASE_PATH = '/hardmagic';
export const DEPLOYMENT_TARGETS = ['local', 'public', 'demo'] as const;
export type DeploymentTarget = (typeof DEPLOYMENT_TARGETS)[number];

export interface DeploymentSettings {
  readonly target: DeploymentTarget;
  readonly base: '/' | typeof DEMO_BASE_PATH;
  readonly noindex: boolean;
}

const settingsByTarget: Record<DeploymentTarget, DeploymentSettings> = {
  local: { target: 'local', base: '/', noindex: false },
  public: { target: 'public', base: '/', noindex: false },
  demo: { target: 'demo', base: DEMO_BASE_PATH, noindex: true },
};

export function resolveDeploymentTarget(value: string | undefined, ci = Boolean(process.env.CI)): DeploymentTarget {
  const candidate = value?.trim() || (ci ? undefined : 'local');
  if (!candidate || !DEPLOYMENT_TARGETS.includes(candidate as DeploymentTarget)) {
    throw new Error(
      `${DEPLOYMENT_TARGET_ENV} must be one of ${DEPLOYMENT_TARGETS.join(', ')}; received ${JSON.stringify(value)}`,
    );
  }
  return candidate as DeploymentTarget;
}

export function deploymentSettingsFor(target: DeploymentTarget): DeploymentSettings {
  return settingsByTarget[target];
}

export function applyDemoDocumentPolicy(html: string): string {
  const robots = '<meta name="robots" content="noindex, nofollow">';
  const existing = html.match(/<meta\b[^>]*\bname=["']robots["'][^>]*>/i);
  if (existing) return html.replace(existing[0], robots);
  return html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}${robots}`);
}

async function htmlFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.name.endsWith('.html')) files.push(absolute);
    }
  };
  await visit(root);
  return files;
}

const demoPolicyIntegration: AstroIntegration = {
  name: 'hardmagic-demo-release-policy',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const outputRoot = fileURLToPath(dir);
      await Promise.all((await htmlFiles(outputRoot)).map(async (file) => {
        const html = await readFile(file, 'utf8');
        await writeFile(file, applyDemoDocumentPolicy(html));
      }));
      await writeFile(
        join(outputRoot, 'robots.txt'),
        'User-agent: *\nDisallow: /\n',
        'utf8',
      );
    },
  },
};

const deploymentTarget = resolveDeploymentTarget(process.env[DEPLOYMENT_TARGET_ENV]);
const deployment = deploymentSettingsFor(deploymentTarget);
const integrations = [
  ...(!deployment.noindex ? [sitemap({
    filter: (page) => !page.includes('/thanks/') && !page.includes('/portfolio-item/'),
  })] : []),
  ...(deployment.noindex ? [demoPolicyIntegration] : []),
];

if (process.env.CI && !process.env[DEPLOYMENT_TARGET_ENV]) {
  throw new Error(`Set ${DEPLOYMENT_TARGET_ENV} explicitly for CI builds.`);
}

export default defineConfig({
  site: PUBLIC_SITE_ORIGIN,
  base: deployment.base,
  output: 'static',
  trailingSlash: 'always',
  compressHTML: 'jsx',
  build: {
    // GitHub Pages/Jekyll treats underscore-prefixed directories as private.
    // Keep the generated static assets directly servable on the gh-pages branch.
    assets: 'assets',
  },
  image: {
    responsiveStyles: true,
  },
  integrations,
});
