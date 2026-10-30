import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../..');

interface CiRule {
  if?: string;
  when?: string;
  allow_failure?: boolean;
}

interface CiJob {
  script?: unknown;
  when?: string;
  allow_failure?: boolean | { exit_codes: unknown };
  rules?: CiRule[];
}

interface CiFile {
  include?: Array<{ local?: string }>;
  [name: string]: unknown;
}

const readCi = (path: string): CiFile => {
  const text = readFileSync(join(repositoryRoot, path), 'utf8');
  return parse(text, { merge: true }) as CiFile;
};

const loadJobs = (): Map<string, CiJob> => {
  const root = readCi('.gitlab-ci.yml');
  const files = [root, ...(root.include ?? []).flatMap((entry) => (entry.local ? [readCi(entry.local.replace(/^\//, ''))] : []))];
  const jobs = new Map<string, CiJob>();
  for (const file of files) {
    for (const [name, value] of Object.entries(file)) {
      if (name.startsWith('.') || typeof value !== 'object' || value === null || Array.isArray(value)) continue;
      const job = value as CiJob;
      if (job.script !== undefined || job.rules !== undefined) jobs.set(name, job);
    }
  }
  return jobs;
};

// A `when: manual` job with `allow_failure: false` is a blocking manual action: every pipeline
// that includes it ends in status `manual`, never `success`. Release and deploy jobs run on demand
// through a variable (RUN_PUBLIC_RELEASE, RUN_BRIEF_LOCK_DEPLOY) instead.
const blockingManualRules = (job: CiJob): string[] => {
  const jobAllowsFailure = job.allow_failure === true;
  if (!job.rules) return job.when === 'manual' && !jobAllowsFailure ? ['(job-level when: manual)'] : [];
  return job.rules
    .filter((rule) => rule.when === 'manual' && !(rule.allow_failure ?? jobAllowsFailure))
    .map((rule) => rule.if ?? '(unconditional)');
};

describe('GitLab CI config', () => {
  const jobs = loadJobs();

  it('finds the pipeline jobs', () => {
    expect([...jobs.keys()]).toEqual(expect.arrayContaining(['pages', 'public_release', 'mirror_public_release', 'brief_lock_deploy']));
  });

  it('has no blocking manual jobs that strand the demo pipeline at status manual', () => {
    const offenders: Record<string, string[]> = {};
    for (const [name, job] of jobs) {
      const rules = blockingManualRules(job);
      if (rules.length > 0) offenders[name] = rules;
    }
    expect(offenders).toEqual({});
  });

  it('keeps public release and the BriefLock deploy on explicit variables', () => {
    const conditions = (name: string) => (jobs.get(name)?.rules ?? []).map((rule) => rule.if ?? '').join(' ');
    expect(conditions('public_release')).toContain('RUN_PUBLIC_RELEASE');
    expect(conditions('mirror_public_release')).toContain('RUN_PUBLIC_RELEASE == "publish"');
    expect(conditions('brief_lock_deploy')).toContain('RUN_BRIEF_LOCK_DEPLOY');
  });
});
