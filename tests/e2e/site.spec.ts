import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  '/', '/products/', '/products/wiremark/', '/products/studio/', '/products/cli/', '/products/web-magic/', '/products/photo-curator/', '/products/gpu-router/',
  '/services/', '/services/creative-direction/', '/engagements/fractional-creative-office/', '/industries/media-entertainment/', '/methods/human-agent-creative-loop/',
  '/insights/creative-direction-after-model-abundance/', '/briefs/', '/briefs/generative-media-operating-system/', '/briefs/generative-media-operating-system/thanks/',
  '/company/', '/company/history/', '/portfolio/', '/portfolio/state-parks/', '/portfolio/focuspass/', '/contact/', '/contact/genai/', '/responsible-ai/', '/privacy/', '/sitemap/',
];
for (const route of routes) {
  test(`${route} renders without automated accessibility defects`, async ({ page }, testInfo) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveTitle(/HardMagic/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    if (['/', '/company/', '/contact/', '/briefs/', '/portfolio/', '/portfolio/state-parks/', '/services/creative-direction/', '/briefs/generative-media-operating-system/'].includes(route)) {
      const name = route === '/' ? 'home' : route.split('/').filter(Boolean).at(-1);
      await page.screenshot({ path: `screenshots/${testInfo.project.name}/${name}.png`, fullPage: testInfo.project.name !== 'wide-firefox' });
    }
  });
}

test('mega menu exposes deep navigation and behaves as one disclosure at a time', async ({ page }, testInfo) => {
  await page.goto('/');
  const menus = page.locator('.mega-item');
  const productsMenu = menus.filter({ has: page.locator('summary').filter({ hasText: /^Products$/ }) });
  const workMenu = menus.filter({ has: page.locator('summary').filter({ hasText: /^Work$/ }) });
  await productsMenu.locator('summary').click();
  await expect(productsMenu).toHaveAttribute('open', '');
  await expect(page.getByRole('link', { name: 'Source intelligence' })).toBeVisible();
  if (testInfo.project.name === 'desktop' || testInfo.project.name === 'wide-firefox') {
    await workMenu.locator('summary').click();
    await expect(productsMenu).not.toHaveAttribute('open', '');
    await expect(workMenu).toHaveAttribute('open', '');
  } else {
    await page.keyboard.press('Escape');
    await expect(productsMenu).not.toHaveAttribute('open', '');
  }
});

test('portfolio preserves legacy routes and defers YouTube until consent', async ({ page }) => {
  const oldRoute = await page.goto('/portfolio-item/airikai/');
  expect(oldRoute?.status()).toBe(200);
  await expect(page).toHaveURL(/\/portfolio\/airikai\/$/);
  await page.goto('/portfolio/');
  await expect(page.locator('.video-frame iframe')).toHaveCount(0);
  await page.getByRole('button', { name: /Load OpenBuk/ }).click();
  await expect(page.locator('.video-frame iframe')).toHaveCount(1);
  await expect(page.locator('.video-frame iframe')).toHaveAttribute('src', /youtube-nocookie\.com/);
});

test('home art direction and image priority are explicit', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('.current-hero-art img');
  await expect(hero).toHaveAttribute('fetchpriority', 'high');
  await expect(hero).toHaveAttribute('loading', 'eager');
  await expect(hero).toHaveAttribute('alt', /AI-generated campaign scene/i);
  await expect(page.locator('.hero-disclosure')).toBeVisible();
  await expect(page.locator('.home-media-card img').first()).toHaveAttribute('loading', 'lazy');

  const wordmarkSource = await page.locator('.wordmark img').first().getAttribute('src');
  expect(wordmarkSource).toBeTruthy();
  const wordmarkSvg = await page.evaluate(async (src) => (await fetch(src!)).text(), wordmarkSource);
  expect(wordmarkSvg).not.toContain('<text');
});

test('nested fragment links stay on their route and reach their targets', async ({ page }) => {
  await page.goto('/briefs/');
  await page.getByRole('link', { name: 'Choose by decision' }).click();
  await expect(page).toHaveURL(/\/briefs\/#choose$/);
  await expect(page.locator('#choose')).toBeVisible();

  await page.goto('/briefs/generative-media-operating-system/');
  await page.getByRole('link', { name: 'Request the brief' }).click();
  await expect(page).toHaveURL(/\/briefs\/generative-media-operating-system\/#request$/);
  await expect(page.locator('#request')).toBeVisible();

  await page.goto('/company/');
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/company\/#main$/);
  await expect(page.locator('#main')).toBeFocused();
});

test('public follow-up routes do not claim direct visits prove receipt', async ({ page }) => {
  await page.goto('/briefs/generative-media-operating-system/thanks/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByText(/reaching this public page does not itself confirm receipt/i)).toBeVisible();
  await expect(page.getByText(/we received your request/i)).toHaveCount(0);

  await page.goto('/contact/thanks/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('heading', { level: 1 })).not.toContainText('Inquiry Received');
});

test('magic display copy reflows at 320 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const [route, selector] of [['/', 'h1'], ['/company/', '#hollywood-title'], ['/contact/', 'h1']] as const) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  }
});
