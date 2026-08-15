import { expect, test } from '@playwright/test';
import { briefs } from '../../src/data/briefs';

const sourceUrlPattern = /https:\/\/[^\s)\]}>"']+/g;
const overflowRoutes = [
  '/',
  '/briefs/generative-media-operating-system/',
  '/services/creative-direction/',
  '/insights/creative-direction-after-model-abundance/',
  '/horizon/',
  '/horizon/direction-after-infinite-production/',
  '/portfolio/',
  '/portfolio/state-parks/',
];

for (const route of overflowRoutes) {
  test(`${route} has no page-level responsive overflow`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBeTruthy();
    await page.locator('body').waitFor();
    await page.evaluate(() => document.fonts.ready);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }));
    expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    expect(dimensions.bodyScrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}

test('text-over-media fields retain a real shade and raised light copy', async ({ page }) => {
  await page.goto('/');
  const fields = page.locator('.current-hero, .studio-frame, .future-field');
  await expect(fields).toHaveCount(3);

  for (let index = 0; index < await fields.count(); index += 1) {
    const field = fields.nth(index);
    const shade = field.locator('[class*="shade"], [class*="scrim"], [class*="overlay"]').first();
    const copy = field.locator('[class*="copy"]').first();
    await expect(shade).toBeVisible();
    await expect(copy).toBeVisible();

    const treatment = await field.evaluate((element) => {
      const shadeElement = element.querySelector<HTMLElement>('[class*="shade"], [class*="scrim"], [class*="overlay"]');
      const copyElement = element.querySelector<HTMLElement>('[class*="copy"]');
      if (!shadeElement || !copyElement) return null;
      const fieldRect = element.getBoundingClientRect();
      const shadeRect = shadeElement.getBoundingClientRect();
      const shadeStyle = getComputedStyle(shadeElement);
      const copyStyle = getComputedStyle(copyElement);
      return {
        coverageX: shadeRect.width / fieldRect.width,
        coverageY: shadeRect.height / fieldRect.height,
        backgroundImage: shadeStyle.backgroundImage,
        shadePosition: shadeStyle.position,
        copyPosition: copyStyle.position,
        copyZIndex: copyStyle.zIndex,
        copyColor: copyStyle.color,
      };
    });

    expect(treatment).not.toBeNull();
    expect(treatment?.shadePosition).toMatch(/absolute|fixed/);
    expect(treatment?.backgroundImage).not.toBe('none');
    expect(treatment?.coverageX).toBeGreaterThanOrEqual(0.98);
    expect(treatment?.coverageY).toBeGreaterThanOrEqual(0.98);
    expect(treatment?.copyPosition).toMatch(/relative|absolute|fixed/);
    expect(treatment?.copyZIndex).toMatch(/^[1-9]\d*$/);
    expect(treatment?.copyColor).toMatch(/^rgba?\((?:2[0-5]\d|1\d\d)/);
  }
});

for (const brief of briefs) {
  test(`${brief.slug} exposes direct, inspectable source links`, async ({ page }) => {
    await page.goto(`/briefs/${brief.slug}/`);
    const expectedUrls = brief.evidenceNeeds.flatMap((item) => item.match(sourceUrlPattern) ?? []);
    expect(expectedUrls.length).toBeGreaterThanOrEqual(4);

    for (const url of expectedUrls) {
      const source = page.locator(`a[href="${url}"]`);
      await expect(source, `Source should be a link: ${url}`).toHaveCount(1);
      await expect(source).toHaveAccessibleName(/\S/);
    }
  });
}
