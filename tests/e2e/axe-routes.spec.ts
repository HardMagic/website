import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { waitForRedirect, waitForRenderedPage } from '../qa/browser-helpers';
import { highRiskRoutes, readRenderedRouteManifest, routeLabel } from '../qa/rendered-route-manifest';

const manifest = readRenderedRouteManifest();
const axeScope = process.env.QA_AXE_SCOPE ?? 'all';
if (axeScope !== 'all' && axeScope !== 'representative') {
  throw new Error(`QA_AXE_SCOPE must be all or representative; received ${axeScope}.`);
}
const scopedRoutes = axeScope === 'all' ? manifest.routes : highRiskRoutes(manifest.routes);
const requestedRoute = process.env.QA_ROUTE_FILTER;
const routes = requestedRoute ? scopedRoutes.filter((route) => route.path === requestedRoute) : scopedRoutes;
if (requestedRoute && routes.length !== 1) throw new Error(`QA_ROUTE_FILTER did not match one ${axeScope} route: ${requestedRoute}`);

for (const route of routes) {
  test(`${routeLabel(route)} passes axe WCAG 2 AA`, async ({ page }, testInfo) => {
    testInfo.annotations.push({ type: 'axe-scope', description: axeScope });
    const response = await test.step('navigate', () => page.goto(route.requestPath, { waitUntil: 'domcontentloaded', timeout: 15_000 }));
    expect(response, `${routeLabel(route)} returned no response`).not.toBeNull();
    if (route.state === 'not-found') expect(response?.status(), routeLabel(route)).toBe(404);
    else expect(response?.status(), routeLabel(route)).toBe(200);
    await test.step('follow static redirect state', () => waitForRedirect(page, route));
    await test.step('wait for rendered media and fonts', () => waitForRenderedPage(page));

    const results = await test.step('axe wcag2a + wcag2aa analysis', () => new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze());
    expect(results.violations, `${routeLabel(route)}: ${JSON.stringify(results.violations)}`).toEqual([]);
  });
}
