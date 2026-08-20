import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('rendered funnel contract', () => {
  it('keeps the main consultation anchor, endpoint, consent split, and no-JS fallback', () => {
    const source = read('src/pages/contact.astro');
    expect(source).toContain('id="intake"');
    expect(source).toContain('action="https://briefs.hardmagic.com/api/contact-request"');
    expect(source).toContain('data-funnel-form="contact"');
    expect(source).toContain('name="request_id"');
    expect(source).toContain('name="marketing_consent" value="no"');
    expect(source).toContain('name="marketing_consent" value="yes"');
    expect(source).toContain('name="consent" value="yes"');
    expect(source).toContain('<noscript>');
    expect(source).toContain('hello@hardmagic.com');
    expect(source).toContain('data-response-field-name="cf-turnstile-response"');
  });

  it('keeps the editorial contact variants on the same server contract', () => {
    const source = read('src/components/editorial/EditorialPage.astro');
    expect(source).toContain('id="intake"');
    expect(source).toContain('data-funnel-form="contact"');
    expect(source).toContain('action="https://briefs.hardmagic.com/api/contact-request"');
    expect(source).toContain('name="request_id"');
    expect(source).toContain('name="marketing_consent" value="no"');
    expect(source).toContain('name="marketing_consent" value="yes"');
    expect(source).toContain('name="consent" value="yes"');
    expect(source).toContain('source_campaign" value="corporate-intake"');
    expect(source).toContain('data-response-field-name="cf-turnstile-response"');
    expect(source).toContain('mailto:hello@hardmagic.com');
  });

  it('keeps each brief request exact, bounded, and corporate-email aware', () => {
    const source = read("src/pages/briefs/[slug].astro");
    expect(source).toContain('action="https://briefs.hardmagic.com/api/brief-request"');
    expect(source).toContain('data-funnel-form="brief"');
    expect(source).toContain('data-corporate-email-only');
    expect(source).toContain('name="report" value={brief.slug}');
    expect(source).toContain('name="request_id"');
    expect(source).toContain('name="marketing_consent" value="no"');
    expect(source).toContain('name="marketing_consent" value="yes"');
    expect(source).toContain('name="consent" value="yes"');
    expect(source).toContain('maxlength="500"');
    expect(source).toContain('maxlength="2000"');
    expect(source).toContain('<noscript>');
    expect(source).toContain('data-response-field-name="cf-turnstile-response"');
  });

  it('uses one browser helper for request IDs and accessible corporate-email errors', () => {
    const source = read('public/scripts/corporate-email-validation.js');
    expect(source).toContain('form[data-funnel-form]');
    expect(source).toContain('crypto?.randomUUID');
    expect(source).toContain("document.addEventListener('astro:page-load'");
    expect(source).toContain("error.setAttribute('role', 'alert')");
    expect(source).not.toContain("role', 'tooltip'");
  });

  it('keeps public confirmation states noindex and does not present them as delivery proof', () => {
    const briefThanks = read("src/pages/briefs/[slug]/thanks.astro");
    expect(briefThanks).toContain('noindex');
    expect(briefThanks).toMatch(/does not itself confirm receipt or delivery/i);
  });
});
