import { expect, test } from '@playwright/test';
import {
  assertBrowserMetadata,
  assertNoHorizontalOverflow,
  captureViewport,
  waitForRedirect,
  waitForRenderedPage,
} from '../qa/browser-helpers';
import { highRiskRoutes, readRenderedRouteManifest, routeLabel } from '../qa/rendered-route-manifest';

const manifest = readRenderedRouteManifest();
const allRoutes = highRiskRoutes(manifest.routes);
const requestedRoute = process.env.QA_ROUTE_FILTER;
const routes = requestedRoute ? allRoutes.filter((route) => route.path === requestedRoute) : allRoutes;
if (requestedRoute && routes.length !== 1) throw new Error(`QA_ROUTE_FILTER did not match one high-risk route: ${requestedRoute}`);

for (const route of routes) {
  test(`${routeLabel(route)} survives the browser/viewport matrix`, async ({ page }, testInfo) => {
    const response = await page.goto(route.requestPath, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    expect(response, `${routeLabel(route)} returned no response`).not.toBeNull();
    if (route.state === 'not-found') expect(response?.status(), routeLabel(route)).toBe(404);
    else expect(response?.status(), routeLabel(route)).toBe(200);
    await waitForRedirect(page, route);
    await waitForRenderedPage(page);
    await assertBrowserMetadata(page, route);
    await assertNoHorizontalOverflow(page, `${testInfo.project.name} ${routeLabel(route)}`);
    await captureViewport(page, testInfo, route);
  });
}

test('keyboard focus reaches the skip link and main content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('nojs'), 'The no-JavaScript project validates the static reading path.');
  await page.goto('/company/', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('mega navigation has one open disclosure and an Escape path', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('nojs'), 'The no-JavaScript project validates the static reading path.');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const menus = page.locator('.mega-item');
  const first = menus.first();
  const second = menus.nth(1);
  await first.locator('summary').click();
  await expect(first).toHaveAttribute('open', '');
  await second.locator('summary').click();
  await expect(first).not.toHaveAttribute('open', '');
  await expect(second).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(second).not.toHaveAttribute('open', '');
});

test('important touch controls retain a usable minimum target', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.isMobile && !testInfo.project.name.includes('forced-colors'), 'Touch target check is reserved for touch and forced-colors probes.');
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  const undersized = await page.locator('a.button, button, summary, input[type="checkbox"]').evaluateAll((controls) => controls
    .filter((control) => {
      const element = (control.closest('label') ?? control) as HTMLElement;
      if (element.offsetParent === null) return false;
      const rect = element.getBoundingClientRect();
      return rect.width < 24 || rect.height < 24;
    })
    .map((control) => ({ tag: control.tagName, text: control.textContent?.trim().slice(0, 60) })));
  expect(undersized).toEqual([]);
});

test('declared reduced-motion and forced-colors states are observable', async ({ page }, testInfo) => {
  const reducedMotion = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const forcedColors = await page.evaluate(() => window.matchMedia('(forced-colors: active)').matches);
  if (testInfo.project.name.includes('zoom')) expect(reducedMotion).toBe(true);
  if (testInfo.project.name.includes('forced-colors')) expect(forcedColors).toBe(true);
});

test('no-JavaScript pages keep landmarks, headings, and forms readable', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('nojs'), 'This is a no-JavaScript project check.');
  await page.goto('/contact/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('form')).toHaveCount(1);
  await assertNoHorizontalOverflow(page, 'no-JavaScript /contact/');
});
