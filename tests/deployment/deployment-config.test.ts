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
  it('keeps the Front Door origin host header bound to the Function hostname', () => {
    const source = readRepositoryFile('infra/brief-delivery/edge.bicep');
    expect(source).toContain('originHostHeader: functionOriginHostname');
    expect(source).not.toContain("originHostHeader: 'briefs.hardmagic.com'");
  });

  it('leaves the shared Front Door WAF binding under Terraform ownership', () => {
    const source = readRepositoryFile('infra/brief-delivery/edge.bicep');
    expect(source).not.toContain('Microsoft.Cdn/profiles/securityPolicies');
    expect(source).not.toContain('wafPolicyId');
    expect(source).not.toContain('securityPolicyId');
    expect(source).toContain('shared profile-level WAF binding is owned by the authoritative Terraform');
  });

  it('counts sampled failures and suppresses one decorated Flex lifecycle sequence', () => {
    const source = readRepositoryFile('infra/brief-delivery/modules/brief-lock.bicep');
    expect(source).toContain('"node exited with code 143 (0x8F)"');
    expect(source).toContain('AlertMessage in (benignSigtermMessages)');
    expect(source).toContain('let workerExitPrefix="Language Worker Process exited. Pid="');
    expect(source).toContain('AlertMessage startswith workerExitPrefix');
    expect(source).toContain('isnotnull(toint(substring(AlertMessage');
    expect(source).toContain('let connectionAbortedProblemId="Microsoft.AspNetCore.Connections.ConnectionAbortedException at Grpc.AspNetCore.Server.Internal.PipeExtensions+<ReadStreamMessageAsync>d__15`1.MoveNext"');
    expect(source).toContain('ExceptionOuterMessage == "The request stream was aborted."');
    expect(source).toContain('ExceptionInnermostMessage == "The HTTP/2 connection faulted."');
    expect(source).toContain('ExceptionProblemId == connectionAbortedProblemId');
    expect(source).toContain('IsBenignConnectionAbort=IsException');
    expect(source).toContain('countif(IsBenignSigterm)');
    expect(source).toContain('countif(IsBenignWorkerExit)');
    expect(source).toContain('countif(IsBenignConnectionAbort)');
    expect(source).toContain('benignConnectionAbortCount <= 1');
    expect(source).toContain('nonLifecycleCount=countif(not(IsBenignLifecycle))');
    expect(source).toContain('and IsBenignLifecycle');
    expect(source).toContain('let eventStreamMessage="Exception encountered while listening to EventStream"');
    expect(source).toContain('IsBenignEventStream=IsLifecycleTrace and AlertMessage == eventStreamMessage');
    expect(source).toContain('AppRoleName=tostring(column_ifexists("AppRoleName", ""))');
    expect(source).toContain('_ResourceId=tostring(column_ifexists("_ResourceId", ""))');
    expect(source).toContain('let expectedAppRoleName="${functionAppName}"');
    expect(source).toContain('let expectedResourceId="${functionResourceId}"');
    expect(source).toContain('AppRoleName == expectedAppRoleName');
    expect(source).toContain('tolower(_ResourceId) == tolower(expectedResourceId)');
    expect(source).toContain('where isnotempty(AppRoleInstance)');
    expect(source).toContain('by _ResourceId, AppRoleName, AppRoleInstance');
    expect(source).toContain('benignEventStreamCount <= 1');
    expect(source).toContain('benignSigtermCount == 0');
    expect(source).toContain('benignWorkerExitCount == 0');
    expect(source).toContain('benignConnectionAbortCount == 1');
    expect(source).toContain('benignEventStreamCount == 1');
    expect(source).toContain('join kind=leftouter benignLifecycleKeys on _ResourceId, AppRoleName, AppRoleInstance');
    expect(source).toContain('AppRoleInstance');
    expect(source).not.toContain('bin(TimeGenerated, 1s)');
    expect(source).not.toContain('AlertMessage == "Language Worker Process exited"');
    expect(source).not.toContain('OperationId=tostring');
    expect(source).not.toContain('ParentId=tostring');
    expect(source).toContain('FailureCount=sum(FailureCount)');
    expect(source).not.toContain('toscalar');
    expect(source).toContain('AppExceptions');
    expect(source).toContain('AppTraces | where SeverityLevel >= 3');
    expect(source).not.toContain('AlertMessage has_any');
  });

  it('keeps Azure telemetry frugal without dropping failure signals', () => {
    const infrastructure = readRepositoryFile('infra/brief-delivery/modules/brief-lock.bicep');
    const host = JSON.parse(readRepositoryFile('infra/brief-delivery/function/host.json')) as {
      logging: { applicationInsights: { samplingSettings: { excludedTypes: string } }; logLevel: Record<string, string> };
    };
    const edge = readRepositoryFile('infra/brief-delivery/edge.bicep');

    expect(host.logging.applicationInsights.samplingSettings.excludedTypes).toBe('Exception');
    expect(host.logging.logLevel.default).toBe('Warning');
    expect(host.logging.logLevel.Function).toBe('Warning');
    expect(infrastructure).toContain("{ category: 'StorageRead', enabled: false }");
    expect(infrastructure).toContain("{ category: 'StorageWrite', enabled: true }");
    expect(infrastructure).toContain("{ category: 'StorageDelete', enabled: true }");
    expect(infrastructure).toContain("logs: [ { category: 'FunctionAppLogs', enabled: true } ]");
    expect(infrastructure).not.toContain("categoryGroup: 'allLogs'");
    expect(infrastructure).toContain("{ category: 'AllMetrics', enabled: false }");
    expect(infrastructure).toContain("prefixMatch: [ 'ledger/rate/' ]");
    expect(infrastructure).toContain("policyConfig.rateLimitRetentionDays");
    expect(infrastructure).toContain("prefixMatch: [ 'ledger/locks/contact/' ]");
    expect(infrastructure).toContain("policyConfig.contactLockRetentionDays");
    expect(edge).toContain('probeIntervalInSeconds: 255');
    expect(infrastructure).toContain("runtime: { name: 'node', version: '24' }");
  });

  it('keeps the Dataverse bridge role local-only and source-checkpointed', () => {
    const snapshot = JSON.parse(readRepositoryFile('infra/brief-delivery/dataverse/role-hardmagic-brief-delivery.json')) as {
      snapshot: {
        role: {
          globalPrivilegeCount: number;
          privileges: Array<{ name: string; depth: string }>;
          forbiddenPrivilegeNames: string[];
        };
      };
    };
    expect(snapshot.snapshot.role.globalPrivilegeCount).toBe(0);
    expect(snapshot.snapshot.role.privileges).toHaveLength(16);
    expect(snapshot.snapshot.role.privileges.every((privilege) => privilege.depth === 'Local')).toBe(true);
    expect(snapshot.snapshot.role.privileges.map((privilege) => privilege.name)).toContain('prvAppendToAccount');
    expect(snapshot.snapshot.role.forbiddenPrivilegeNames).toContain('prvWriteSharePointData');
  });

  it('runs what-if automatically and keeps production deployment blocking and manual', () => {
    const source = readRepositoryFile('.gitlab/ci/brief-delivery.yml');
    const whatIf = source.slice(source.indexOf('brief_lock_what_if:'), source.indexOf('brief_lock_deploy:'));
    const deploy = source.slice(source.indexOf('brief_lock_deploy:'));
    expect(whatIf).toContain('when: on_success');
    expect(whatIf).toContain('allow_failure: false');
    expect(whatIf).toContain('--no-prompt true');
    expect(whatIf).toContain('(.properties.changes // .changes)');
    expect(whatIf).toContain('.changeType == "Delete"');
    expect(whatIf).toContain('refusing to deploy');
    expect(deploy).toContain('brief_lock_what_if');
    expect(deploy).toContain('when: manual');
    expect(deploy).toContain('manual_confirmation:');
    expect(deploy).toContain('allow_failure: false');
    expect(deploy).not.toContain('BRIEF_WAF_POLICY_ID');
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
  const sitemap = artifactReady && target !== 'demo' ? readFileSync(join(artifactRoot, 'sitemap-0.xml'), 'utf8') : '';

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
      expect(sitemapUrls).toHaveLength(0);
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
