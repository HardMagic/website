import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { expect } from '@playwright/test';
import type { RenderedRoute } from './rendered-route-manifest';
import { routeId, routeLabel } from './rendered-route-manifest';

export async function waitForRenderedPage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    if ('fonts' in document) await document.fonts.ready;
  });
  await page.waitForFunction(
    () => [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom >= -200 && rect.top <= window.innerHeight + 200;
    }).every((image) => image.complete),
    undefined,
    { timeout: 8_000 },
  );
  const failedImages = await page.locator('img').evaluateAll((images) => images
    .filter((element) => {
      const image = element as HTMLImageElement;
      const rect = image.getBoundingClientRect();
      return rect.bottom >= -200 && rect.top <= window.innerHeight + 200 && image.complete && image.naturalWidth === 0;
    })
    .map((element) => {
      const image = element as HTMLImageElement;
      return image.currentSrc || image.getAttribute('src') || '(unknown image)';
    }));
  expect(failedImages, `Visible rendered media failed to load: ${failedImages.join(', ')}`).toEqual([]);
}

export async function waitForRedirect(page: Page, route: RenderedRoute): Promise<void> {
  if (route.state !== 'redirect' || !route.redirectTarget) return;
  await page.waitForURL((url) => url.pathname === route.redirectTarget, { timeout: 10_000 });
}

export async function assertNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const dimensions = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const offenders = [...document.querySelectorAll<HTMLElement>('*')]
      .filter((element) => element.scrollWidth > element.clientWidth + 1)
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: typeof element.className === 'string' ? element.className : '',
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }));
    return {
      viewportWidth: root.clientWidth,
      documentWidth: root.scrollWidth,
      bodyWidth: body?.scrollWidth ?? 0,
      offenders,
    };
  });
  expect(dimensions.documentWidth, `${label}: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
  expect(dimensions.bodyWidth, `${label}: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

export async function assertBrowserMetadata(page: Page, route: RenderedRoute): Promise<void> {
  if (route.state === 'not-found') {
    expect(page.url()).toMatch(/__qa__\/missing-route/);
    expect(await page.locator('h1').count(), routeLabel(route)).toBe(1);
    return;
  }
  if (route.state === 'redirect') {
    expect(page.url()).toContain(route.redirectTarget ?? '');
    return;
  }
  await expect(page).toHaveTitle(/HardMagic/);
  await expect(page.locator('html[lang]')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('meta[name="description"]')).toHaveCount(1);
  await expect(page.locator('link[rel~="canonical"]')).toHaveCount(1);
  if (route.state === 'thanks') {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  }
}

export async function assertRenderedLinks(page: Page, routes: readonly RenderedRoute[], route: RenderedRoute): Promise<void> {
  const routePaths = new Set(routes.map(({ path }) => path));
  const base = await page.locator('base').getAttribute('href').catch(() => null);
  const links = await page.locator('a[href]').evaluateAll((anchors) => anchors.map((anchor) => {
    const element = anchor as HTMLAnchorElement;
    return { raw: element.getAttribute('href') ?? '', resolved: element.href };
  }));
  const failures: string[] = [];
  for (const link of links) {
    if (!link.raw || link.raw.startsWith('#') || /^(?:mailto|tel|javascript):/i.test(link.raw)) continue;
    let url: URL;
    try {
      url = new URL(link.resolved);
    } catch {
      failures.push(`${link.raw} (invalid resolved URL)`);
      continue;
    }
    if (url.origin !== new URL(page.url()).origin) continue;
    const baseUrl = new URL(base ?? '/', page.url());
    const basePath = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
    let path = url.pathname;
    if (basePath !== '/' && path.startsWith(basePath)) path = path.slice(basePath.length - 1) || '/';
    if (!path.endsWith('/') && !path.includes('.')) path = `${path}/`;
    if (!path.includes('.') && !routePaths.has(path)) failures.push(`${link.raw} → ${path}`);
  }
  expect(failures, `${routeLabel(route)} rendered internal links: ${failures.join('; ')}`).toEqual([]);
}

export async function captureViewport(page: Page, testInfo: TestInfo, route: RenderedRoute): Promise<void> {
  if (process.env.QA_CAPTURE === '0') return;
  const projectDirectory = resolve(process.cwd(), 'docs/release-evidence/visual/captures', testInfo.project.name);
  await mkdir(projectDirectory, { recursive: true });
  await page.screenshot({
    path: resolve(projectDirectory, `${routeId(route)}.png`),
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
    timeout: 10_000,
  });
  if (process.env.QA_FULL_PAGE === '1' && process.env.QA_FULL_PAGE_ROUTE === route.path) {
    await page.screenshot({
      path: resolve(projectDirectory, `${routeId(route)}--full-page.png`),
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      timeout: 10_000,
    });
  }
}
