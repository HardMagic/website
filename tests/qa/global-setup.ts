import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readRenderedRouteManifest } from './rendered-route-manifest';

export default function globalSetup(): void {
  const auditScript = resolve(process.cwd(), 'scripts/audit-rendered-routes.mjs');
  try {
    execFileSync(process.execPath, [auditScript, '--allow-fail'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: process.env,
    });
  } catch (error) {
    throw new Error('Rendered-route audit could not produce a manifest. Build dist before running browser QA.', { cause: error });
  }

  const manifest = readRenderedRouteManifest();
  const expectedStates = { canonical: 135, 'not-found': 1, redirect: 8, thanks: 9 };
  const stateCountsMatch = Object.entries(expectedStates).every(([state, count]) => manifest.stateCounts[state] === count);
  if (manifest.routeCount !== 153 || !stateCountsMatch) {
    throw new Error(`Rendered-route manifest does not match the release route contract: expected 153 routes and ${JSON.stringify(expectedStates)}, received ${manifest.routeCount} and ${JSON.stringify(manifest.stateCounts)}.`);
  }
}
