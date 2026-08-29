import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith('--')) continue;
  const [name, value] = argument.slice(2).split('=', 2);
  const next = process.argv[index + 1];
  args.set(name, value ?? (next && !next.startsWith('--') ? process.argv[++index] : true));
}

const target = args.get('target');
const artifactRoot = resolve(args.get('artifact-root') ?? 'dist');
const defaultManifestPath = 'docs/release-evidence/release-manifest.json';
const output = resolve(args.get('output') ?? defaultManifestPath);
const manifestPath = resolve(args.get('manifest') ?? args.get('output') ?? defaultManifestPath);
const verify = args.get('verify') === true || args.get('verify') === 'true';
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
const pipeline = process.env.CI_PIPELINE_ID ?? null;
const buildTimestamp = process.env.HARDMAGIC_BUILD_TIMESTAMP
  ?? (process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString() : new Date().toISOString());
const artifact = {
  sha256: artifactHash.digest('hex'),
  bytes: artifactBytes,
  files: files.length,
};

if (verify) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const expected = [
    ['status', manifest.status, 'candidate'],
    ['release.commit', manifest.release?.commit, sourceCommit],
    ['release.branch', manifest.release?.branch, sourceBranch],
    ['release.pipeline', manifest.release?.pipeline, pipeline],
    ['release.target', manifest.release?.target, target],
    ['release.basePath', manifest.release?.basePath, baseByTarget[target]],
    ['release.environment.target', manifest.release?.environment?.target, target],
    ['release.environment.basePath', manifest.release?.environment?.basePath, baseByTarget[target]],
    ['release.artifact.sha256', manifest.release?.artifact?.sha256, artifact.sha256],
    ['release.artifact.bytes', manifest.release?.artifact?.bytes, artifact.bytes],
    ['release.artifact.files', manifest.release?.artifact?.files, artifact.files],
    ['hosting.sourceOfTruth', manifest.hosting?.sourceOfTruth, 'GitLab'],
    ['hosting.public.branch', manifest.hosting?.public?.branch, 'gh-pages'],
  ];
  const mismatches = expected
    .filter(([, actual, expectedValue]) => actual !== expectedValue)
    .map(([field, actual, expectedValue]) => `${field}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actual)}`);
  if (mismatches.length > 0) {
    throw new Error(`Release manifest does not approve this artifact:\n${mismatches.join('\n')}`);
  }
  console.log(`Verified approved ${target} artifact ${artifact.sha256} (${artifact.files} files, ${artifact.bytes} bytes).`);
  process.exit(0);
}

const packageLock = readFileSync('package-lock.json');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

const manifest = {
  schemaVersion: 1,
  status: 'candidate',
  generatedAt: buildTimestamp,
  release: {
    commit: sourceCommit,
    branch: sourceBranch,
    pipeline,
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
      ...artifact,
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
      workflow: 'mirror_public_release',
      artifactSource: 'GitLab public_release CI artifact',
      provenanceTag: sourceCommit ? `public-release-${sourceCommit}` : null,
      verified: false,
      assumptions: [
        'GitLab remains the source of truth for the release commit and artifact.',
        'The protected mirror_public_release job promotes only the verified GitLab public artifact to GitLab gh-pages and then GitHub Pages.',
        'The signed GitLab provenance tag is published atomically with the GitLab branch update before the GitHub branch push.',
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
