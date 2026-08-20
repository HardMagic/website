import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith('--')) continue;
  const [name, value] = argument.slice(2).split('=', 2);
  args.set(name, value ?? process.argv[++index]);
}

const target = args.get('target');
const artifactRoot = resolve(args.get('artifact-root') ?? 'dist');
const output = resolve(args.get('output') ?? 'docs/release-evidence/release-manifest.json');
const baseByTarget = { local: '/', public: '/', demo: '/hardmagic' };
if (!Object.hasOwn(baseByTarget, target)) {
  throw new Error(`Unknown release target ${JSON.stringify(target)}; expected local, public, or demo.`);
}
if (!statSync(artifactRoot, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error(`Missing deployment artifact directory: ${artifactRoot}`);
}

const files = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else files.push(absolute);
  }
};
walk(artifactRoot);
files.sort();

const artifactHash = createHash('sha256');
let artifactBytes = 0;
for (const file of files) {
  const contents = readFileSync(file);
  artifactHash.update(relative(artifactRoot, file).replaceAll('\\', '/'));
  artifactHash.update('\0');
  artifactHash.update(contents);
  artifactBytes += contents.byteLength;
}

const packageLock = readFileSync('package-lock.json');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const git = (command, fallback = null) => {
  try {
    return execFileSync('git', command, { encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
};
const toolVersion = (command, fallback = null) => {
  try {
    return execFileSync(command, ['--version'], { encoding: 'utf8' }).trim() || fallback;
  } catch {
    return fallback;
  }
};
const sourceCommit = process.env.CI_COMMIT_SHA ?? git(['rev-parse', 'HEAD']);
const sourceBranch = process.env.CI_COMMIT_REF_NAME ?? git(['branch', '--show-current']);
const buildTimestamp = process.env.HARDMAGIC_BUILD_TIMESTAMP
  ?? (process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString() : new Date().toISOString());

const manifest = {
  schemaVersion: 1,
  status: 'candidate',
  generatedAt: buildTimestamp,
  release: {
    commit: sourceCommit,
    branch: sourceBranch,
    pipeline: process.env.CI_PIPELINE_ID ?? null,
    packageLockSha256: createHash('sha256').update(packageLock).digest('hex'),
    buildTime: buildTimestamp,
    environment: {
      target,
      basePath: baseByTarget[target],
    },
    target,
    basePath: baseByTarget[target],
    site: 'https://hardmagic.com',
    artifact: {
      root: relative(process.cwd(), artifactRoot) || '.',
      sha256: artifactHash.digest('hex'),
      bytes: artifactBytes,
      files: files.length,
    },
  },
  infrastructureVersions: {
    node: process.version,
    npm: toolVersion('npm'),
    astro: packageJson.dependencies?.astro ?? packageJson.devDependencies?.astro ?? null,
    adapter: 'static',
  },
  hosting: {
    sourceOfTruth: 'GitLab',
    demo: {
      branch: 'demo',
      basePath: '/hardmagic',
      noindex: true,
      accessControl: 'Ziti access control is required; deployment access was not verified here.',
    },
    public: {
      branch: 'gh-pages',
      basePath: '/',
      canonicalOrigin: 'https://hardmagic.com',
    },
    publicMirror: {
      provider: 'GitHub Pages',
      sourceBranch: 'gh-pages',
      verified: false,
      assumptions: [
        'GitLab remains the source of truth for the release commit and artifact.',
        'A protected external process mirrors the GitLab gh-pages artifact to GitHub Pages.',
        'The hardmagic.com DNS, TLS, CDN freshness, and rollback state require release-owner verification.',
      ],
    },
    responseHeaders: {
      policy: 'docs/release-evidence/hosting/headers-policy.json',
      publicEdgeVerified: false,
    },
  },
  verification: {
    renderedUrlTests: process.env.HARDMAGIC_DEPLOYMENT_TEST_TARGET === target,
    publicMirrorVerified: false,
    deployedHostVerified: false,
  },
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
