import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { navigation, productLinks } from '../src/data/site';
import { briefs } from '../src/data/briefs';
import { caseStudies, youtubeArchive } from '../src/data/portfolio';

const homeSource = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
const privacySource = readFileSync(new URL('../src/pages/privacy.astro', import.meta.url), 'utf8');
const consultationRouteSource = readFileSync(new URL('../src/components/editorial/EditorialPage.astro', import.meta.url), 'utf8');
const briefRouteSource = readFileSync(new URL('../src/pages/briefs/[slug].astro', import.meta.url), 'utf8');

describe('site information architecture', () => {
  it('ships the GitHub Pages asset passthrough marker', () => {
    expect(existsSync(new URL('../public/.nojekyll', import.meta.url))).toBe(true);
  });

  it('keeps primary navigation concise and internal', () => {
    expect(navigation).toHaveLength(3);
    expect(navigation.every(({ href }) => !href.includes('://') && !href.startsWith('//'))).toBe(true);
  });
  it('features the four primary products in the footer', () => {
    expect(productLinks.map(([name]) => name)).toEqual(['WireMark', 'HardMagic Studio', expect.stringMatching(/^HardMagic (?:CLI|Agent \(CLI\))$/), 'Web Magic']);
  });
  it('uses the Pranashama work as the homepage portfolio showcase', () => {
    expect(homeSource).toContain("study.slug === 'pranashama'");
    expect(homeSource).not.toContain('caseStudies[1]');
  });
});

describe('conversion and private-intake route contracts', () => {
  it('keeps a direct conversation CTA and a brief-oriented label on the home source', () => {
    expect(homeSource).toMatch(/href=["']contact\//);
    expect(homeSource).toMatch(/(?:impossible brief|private brief|working session|step into the magic)/i);
  });

  it('keeps the privacy notice aligned with the source-designed data boundaries', () => {
    for (const marker of [
      /deployed/i,
      /last verified/i,
      /qualification/i,
      /private delivery ledger/i,
      /email(?:ed| delivery)/i,
      /CRM projection/i,
      /marketing consent/i,
      /unsubscribe|suppression/i,
      /confidential/i,
      /395 days/i,
      /deletion/i,
      /hello@hardmagic\.com/i,
    ]) {
      expect(privacySource).toMatch(marker);
    }
  });

  it('keeps every published brief reachable through the dynamic request route', () => {
    expect(briefs.length).toBeGreaterThan(0);
    expect(new Set(briefs.map(({ slug }) => slug)).size).toBe(briefs.length);
    expect(briefRouteSource).toMatch(/getStaticPaths/);
    expect(briefRouteSource).toContain('action="https://briefs.hardmagic.com/api/brief-request"');
    for (const field of ['industry', 'organization_size', 'decision_stage', 'decision_horizon', 'intake_category', 'primary_challenge', 'preferred_next_step', 'consent', 'marketing_consent']) {
      expect(briefRouteSource).toContain(`name="${field}"`);
    }
  });

  it('keeps the consultation form aligned with the qualification contract', () => {
    expect(consultationRouteSource).toContain('action="https://briefs.hardmagic.com/api/contact-request"');
    for (const field of ['name', 'email', 'organization', 'role', 'intake_category', 'mandate', 'decision_horizon', 'preferred_next_step', 'consent', 'marketing_consent']) {
      expect(consultationRouteSource).toContain(`name="${field}"`);
    }
  });
});

describe('restored media archive', () => {
  it('publishes all eight legacy case studies with unique media', () => {
    expect(caseStudies).toHaveLength(8);
    expect(new Set(caseStudies.map(({ slug }) => slug)).size).toBe(8);
    expect(caseStudies.every(({ media, caveat }) => media.length >= 2 && caveat.length > 60)).toBe(true);
    const media = caseStudies.flatMap(({ media }) => media.flatMap((asset) => asset ? [asset.alt] : []));
    expect(new Set(media).size).toBe(media.length);
  });

  it('keeps the verified HardMagic YouTube archive explicit and consent-loaded', () => {
    expect(youtubeArchive).toHaveLength(6);
    expect(new Set(youtubeArchive.map(({ id }) => id)).size).toBe(6);
  });
});
