import { expect, test } from '@playwright/test';
import {
  assertBrowserMetadata,
  assertNoHorizontalOverflow,
  assertRenderedLinks,
  captureViewport,
  waitForRedirect,
  waitForRenderedPage,
} from '../qa/browser-helpers';
import { readRenderedRouteManifest, routeLabel } from '../qa/rendered-route-manifest';

const manifest = readRenderedRouteManifest();
const requestedRoute = process.env.QA_ROUTE_FILTER;
const routes = requestedRoute ? manifest.routes.filter((route) => route.path === requestedRoute) : manifest.routes;
if (requestedRoute && routes.length !== 1) throw new Error(`QA_ROUTE_FILTER did not match one rendered route: ${requestedRoute}`);

for (const route of routes) {
  test(`${routeLabel(route)} renders, stays in bounds, and exposes usable links`, async ({ page }, testInfo) => {
    await test.step('rendered audit has no preflight defects', () => {
      expect(route.issues, `${routeLabel(route)}: ${JSON.stringify(route.issues)}`).toEqual([]);
    });

    const response = await test.step('navigate', () => page.goto(route.requestPath, { waitUntil: 'domcontentloaded', timeout: 15_000 }));
    expect(response, `${routeLabel(route)} returned no response`).not.toBeNull();
    if (route.state === 'not-found') expect(response?.status(), routeLabel(route)).toBe(404);
    else expect(response?.status(), routeLabel(route)).toBe(200);
    await test.step('follow static redirect state', () => waitForRedirect(page, route));

    await test.step('wait for rendered media and fonts', () => waitForRenderedPage(page));
    await test.step('metadata and state smoke', () => assertBrowserMetadata(page, route));
    await test.step('page-level overflow smoke', () => assertNoHorizontalOverflow(page, routeLabel(route)));
    await test.step('internal link smoke', () => assertRenderedLinks(page, manifest.routes, route));
    await test.step('viewport capture', () => captureViewport(page, testInfo, route));
  });
}
