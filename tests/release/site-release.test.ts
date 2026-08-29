import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const releaseConfig = readFileSync(join(repositoryRoot, '.gitlab/ci/site-release.yml'), 'utf8');
const rootConfig = readFileSync(join(repositoryRoot, '.gitlab-ci.yml'), 'utf8');
const manifestScript = join(repositoryRoot, '.gitlab/ci/generate-release-manifest.mjs');

const ciEnvironment = {
  ...process.env,
  CI_COMMIT_SHA: 'a'.repeat(40),
  CI_COMMIT_REF_NAME: 'demo',
  CI_PIPELINE_ID: '12345',
  HARDMAGIC_BUILD_TIMESTAMP: '2026-08-29T00:00:00.000Z',
};

function runManifest(...arguments_: string[]): string {
  return execFileSync(process.execPath, [manifestScript, ...arguments_], {
    cwd: repositoryRoot,
    env: ciEnvironment,
    encoding: 'utf8',
  });
}

function expectManifestFailure(...arguments_: string[]): void {
  expect(() => execFileSync(process.execPath, [manifestScript, ...arguments_], {
    cwd: repositoryRoot,
    env: ciEnvironment,
    stdio: ['ignore', 'pipe', 'ignore'],
  })).toThrow();
}

describe('public release promotion contract', () => {
  it('keeps the legacy Pages preview protected and separate from the mirror', () => {
    expect(rootConfig).toContain('$CI_COMMIT_BRANCH == "demo" && $CI_COMMIT_REF_PROTECTED == "true"');
    expect(rootConfig).toContain('GitLab Pages as the internal, noindex demo preview only');
    expect(rootConfig).toContain('- when: never');

    const publicRelease = releaseConfig.slice(0, releaseConfig.indexOf('mirror_public_release:'));
    expect(publicRelease).toContain('HARDMAGIC_DEPLOY_TARGET: public');
    expect(publicRelease).toContain('when: manual');
    expect(publicRelease).toContain('allow_failure: false');
    expect(publicRelease).toContain('$CI_COMMIT_BRANCH == "demo" && $CI_COMMIT_REF_PROTECTED == "true"');
    expect(publicRelease).toContain('- when: never');

    const mirror = releaseConfig.slice(releaseConfig.indexOf('mirror_public_release:'));
    expect(releaseConfig).toContain('public_release:');
    expect(mirror).toContain('job: public_release');
    expect(mirror).toContain('artifacts: true');
    expect(mirror).toContain('when: manual');
    expect(mirror).toContain('allow_failure: false');
    expect(mirror).toContain('GIT_STRATEGY: empty');
    expect(releaseConfig).toContain('- .gitlab/ci/generate-release-manifest.mjs');
    expect(mirror).toContain('set -o pipefail');
    expect(mirror).toContain('GIT_AUTHOR_DATE="$CI_COMMIT_TIMESTAMP"');
    expect(mirror).toContain('${GITLAB_MIRROR_USERNAME:?');
    expect(mirror).toContain('${GITLAB_MIRROR_TOKEN:?');
    expect(mirror).toContain('${GITHUB_APP_ID:?');
    expect(mirror).toContain('${GITHUB_APP_INSTALLATION_ID:?');
    expect(mirror).toContain('${GITHUB_APP_PRIVATE_KEY_B64:?');
    expect(mirror).toContain('/app/installations/$GITHUB_APP_INSTALLATION_ID/access_tokens');
    expect(mirror).toContain('export GITHUB_TOKEN');
    expect(mirror).toContain('${GITLAB_PROVENANCE_PRIVATE_KEY_B64:?');
    expect(mirror).toContain('--verify');
    expect(mirror).toContain('public-release-${CI_COMMIT_SHA}');
    expect(mirror).toContain('tag -s');
    expect(mirror).toContain('gitlab_release_commit');
    expect(mirror).toContain('resume_existing_release=false');
    expect(mirror).toContain('existing_gitlab_release_commit');
    expect(mirror).toContain('existing_github_commit');
    expect(mirror).toContain('test "$gitlab_branch_commit" = "$existing_gitlab_release_commit"');
    expect(mirror).toContain('resumed_artifact_commit');
    expect(mirror).toContain('missing GitHub push');
    expect(mirror).toContain('push --atomic origin');
    expect(mirror).toContain('refs/heads/$GITHUB_PAGES_BRANCH');
    expect(mirror).toContain('push origin "$artifact_commit:refs/heads/$GITHUB_PAGES_BRANCH"');
    const existingReleaseCheck = mirror.indexOf('if git -C "$gitlab_repo" ls-remote --exit-code origin "refs/tags/$provenance_tag"');
    const firstReleaseCommitDerivation = mirror.indexOf('gitlab_release_commit="$(git -C "$gitlab_repo" commit-tree');
    expect(existingReleaseCheck).toBeGreaterThanOrEqual(0);
    expect(firstReleaseCommitDerivation).toBeGreaterThan(existingReleaseCheck);
    expect(mirror).not.toMatch(/git push[^\n]*--force/);
    expect(mirror).not.toMatch(/git (reset|clean|rm)\b/);
  });

  it('generates and fail-closed verifies the exact public artifact manifest', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'hardmagic-release-'));
    const artifactRoot = join(fixtureRoot, 'public');
    const manifestPath = join(fixtureRoot, 'release-manifest.json');
    mkdirSync(join(artifactRoot, 'assets'), { recursive: true });
    writeFileSync(join(artifactRoot, 'index.html'), '<!doctype html><title>HardMagic</title>\n');
    writeFileSync(join(artifactRoot, 'assets', 'app.js'), 'console.log("approved");\n');

    runManifest('--target', 'public', '--artifact-root', artifactRoot, '--output', manifestPath);
    expect(runManifest('--verify', '--target', 'public', '--artifact-root', artifactRoot, '--manifest', manifestPath))
      .toContain('Verified approved public artifact');

    writeFileSync(join(artifactRoot, 'assets', 'app.js'), 'console.log("changed");\n');
    expectManifestFailure('--verify', '--target', 'public', '--artifact-root', artifactRoot, '--manifest', manifestPath);
  });
});
