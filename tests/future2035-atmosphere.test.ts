import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { briefs } from '../src/data/briefs';
import { editorialRoutes } from '../src/data/editorial';
import { horizon2035Scenarios } from '../src/data/horizon2035';
import { homeInferenceDisclosure, homeMarketSignals } from '../src/data/home-market-signals';

const sourceUrlPattern = /https:\/\/[^\s)\]}>"']+/g;
const trackingParameters = /^(?:utm_.+|fbclid|gclid|dclid|mc_[ce]id|igshid|ref|referrer)$/i;
const indirectSourceHosts = new Set([
  'bit.ly',
  'buff.ly',
  'goo.gl',
  'linktr.ee',
  't.co',
  'tinyurl.com',
]);

function urlsIn(value: string): string[] {
  return value.match(sourceUrlPattern) ?? [];
}

function sourceProblem(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'is not a valid URL';
  }

  if (url.protocol !== 'https:') return 'does not use HTTPS';
  if (indirectSourceHosts.has(url.hostname)) return 'uses a redirect or link-shortening host';
  if (/^(?:www\.)?(?:google|bing)\./i.test(url.hostname) && url.pathname.startsWith('/search')) {
    return 'links to search results instead of a source';
  }
  if (/(?:example\.com|localhost|127\.0\.0\.1)$/i.test(url.hostname)) return 'uses a placeholder host';
  if ([...url.searchParams.keys()].some((key) => trackingParameters.test(key))) {
    return 'contains a tracking parameter';
  }
  return null;
}

function quantifiedClaim(value: string): boolean {
  const withoutYears = value
    .replace(/\b(?:19|20)\d{2}(?:\s*[–-]\s*(?:19|20)\d{2})?\b/g, '')
    .replace(/\b(?:page|pages|p\.|pp\.)\s*\d+(?:\s*[–-]\s*\d+)?\b/gi, '');

  return /(?:[$€£]\s*\d|\b\d+(?:\.\d+)?\s*(?:%|percent|fold|times|x\b|million|billion|trillion|basis points?|hours?|countries|languages|people|users?|buyers?|requests?|sessions?|organizations?)\b)/i.test(withoutYears);
}

function cssRule(css: string, className: string): string | null {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`\\.${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? null;
}

describe('future-facing editorial evidence', () => {
  it('separates homepage market evidence from HardMagic 2035 inference', () => {
    expect(homeMarketSignals.evidence).toHaveLength(5);
    expect(homeMarketSignals.inference).toHaveLength(4);
    expect(homeInferenceDisclosure).toMatch(/inference.+not a guarantee/i);

    for (const signal of homeMarketSignals.evidence) {
      expect(sourceProblem(signal.url)).toBeNull();
      expect(signal.publisher.trim()).not.toBe('');
      expect(signal.date.trim()).not.toBe('');
      expect(signal.boundaries.length).toBeGreaterThanOrEqual(2);
    }

    for (const forecast of homeMarketSignals.inference) {
      expect(forecast.boundary).toMatch(/inference.+not a forecast or guarantee/i);
    }
  });

  it('keeps more than 100 unique publishable editorial routes', () => {
    const paths = editorialRoutes.map(({ path }) => path);
    expect(paths.length).toBeGreaterThanOrEqual(100);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('gives every 2035 scenario a sourced signal base with hygienic direct links', () => {
    expect(horizon2035Scenarios.length).toBeGreaterThanOrEqual(6);

    const problems: string[] = [];
    for (const scenario of horizon2035Scenarios) {
      if (scenario.horizon !== 2035) problems.push(`${scenario.slug}: horizon is not 2035`);
      if (scenario.citations.length < 2) problems.push(`${scenario.slug}: fewer than two citations`);
      if (scenario.signals2026.length < 2) problems.push(`${scenario.slug}: fewer than two present-day signals`);

      for (const citation of scenario.citations) {
        const issue = sourceProblem(citation.url);
        if (issue) problems.push(`${scenario.slug}/${citation.id}: ${issue}`);
        if (!citation.publisher.trim() || !citation.published.trim() || !citation.supports.trim()) {
          problems.push(`${scenario.slug}/${citation.id}: incomplete source note`);
        }
      }

      if (scenario.signals2026.some(quantifiedClaim)) expect(scenario.citations.length).toBeGreaterThanOrEqual(2);
    }

    expect(problems, problems.join('\n')).toEqual([]);
  });

  it('labels 2035 brief inference and sources every evidence claim', () => {
    const problems: string[] = [];

    for (const brief of briefs) {
      if (brief.thesis.includes('2035')) {
        for (const marker of ['[2035 vantage — inference]', '[Recommendation]', '[Uncertainty]']) {
          if (!brief.thesis.includes(marker)) problems.push(`${brief.slug}: thesis is missing ${marker}`);
        }
      }

      const evidence = brief.evidenceNeeds.filter((item) => item.startsWith('[Evidence]'));
      if (brief.thesis.includes('2035') && evidence.length < 4) {
        problems.push(`${brief.slug}: fewer than four evidence notes support its 2035 scenario`);
      }

      for (const item of evidence) {
        const urls = urlsIn(item);
        if (urls.length !== 1) problems.push(`${brief.slug}: evidence note must contain exactly one direct source URL`);
        for (const url of urls) {
          const issue = sourceProblem(url);
          if (issue) problems.push(`${brief.slug}/${url}: ${issue}`);
        }
        if (quantifiedClaim(item) && urls.length === 0) {
          problems.push(`${brief.slug}: quantified evidence has no source URL: ${item}`);
        }
      }

      for (const item of [...brief.evidenceNeeds, ...brief.limitations]) {
        if (!quantifiedClaim(item) || item.startsWith('[Evidence]')) continue;
        if (!/^\[(?:Inference|Recommendation|Uncertainty|Boundary)\]/.test(item)) {
          problems.push(`${brief.slug}: unsourced numeric claim is not labeled as inference or guidance: ${item}`);
        }
      }
    }

    expect(problems, problems.join('\n')).toEqual([]);
  });
});

describe('dark media atmosphere contract', () => {
  it('pairs every text-over-media shade with a full-cover contrast rule and raised copy', async () => {
    const [home, studioProof, globalCss, homeCss] = await Promise.all([
      readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8'),
      readFile(new URL('../src/components/home/StudioSignal.astro', import.meta.url), 'utf8'),
      readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
      readFile(new URL('../src/styles/home-current.css', import.meta.url), 'utf8'),
    ]);
    const source = `${home}\n${studioProof}`;
    const css = `${globalCss}\n${homeCss}`;
    const shadeClasses = [...source.matchAll(/class="([^"]*(?:shade|scrim|overlay)[^"]*)"/g)]
      .flatMap((match) => (match[1] ?? '').split(/\s+/))
      .filter((className) => /(?:shade|scrim|overlay)/.test(className));

    expect(shadeClasses.length).toBeGreaterThanOrEqual(3);
    const problems: string[] = [];
    for (const shadeClass of new Set(shadeClasses)) {
      const rule = cssRule(css, shadeClass);
      if (!rule) {
        problems.push(`.${shadeClass}: missing CSS rule`);
        continue;
      }
      if (!/position\s*:\s*(?:absolute|fixed)/.test(rule)) problems.push(`.${shadeClass}: not positioned over media`);
      if (!/(?:inset\s*:\s*0|top\s*:\s*0[^}]*right\s*:\s*0[^}]*bottom\s*:\s*0[^}]*left\s*:\s*0)/.test(rule)) {
        problems.push(`.${shadeClass}: does not cover the media frame`);
      }
      if (!/background(?:-image)?\s*:[^;]*(?:gradient|rgba?\()/.test(rule)) {
        problems.push(`.${shadeClass}: has no contrast-oriented gradient or translucent field`);
      }

      const copyClass = shadeClass.replace(/(?:shade|scrim|overlay)$/, 'copy');
      const copyRule = cssRule(css, copyClass);
      if (!copyRule || !/z-index\s*:\s*[1-9]/.test(copyRule)) {
        problems.push(`.${copyClass}: copy is not explicitly raised above the shade`);
      }
    }

    expect(problems, problems.join('\n')).toEqual([]);
  });
});
