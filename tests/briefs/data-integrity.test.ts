import { describe, expect, it } from 'vitest';
import { briefs } from '../../src/data/briefs';

const sourceUrlPattern = /https:\/\/\S+/g;
const claimClassPattern = /^\[(Evidence|Inference|Recommendation|Uncertainty|Boundary)\]/;

describe('technical brief source data', () => {
  it('keeps all eight editions structurally complete and chapter-addressable', () => {
    expect(briefs).toHaveLength(8);
    expect(new Set(briefs.map(({ slug }) => slug)).size).toBe(briefs.length);
    expect(new Set(briefs.map(({ title }) => title)).size).toBe(briefs.length);

    for (const brief of briefs) {
      expect(brief.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)+$/);
      expect(brief.title.trim()).not.toBe('');
      expect(brief.topics.length).toBeGreaterThanOrEqual(4);
      expect(new Set(brief.topics).size).toBe(brief.topics.length);
      expect(brief.editorial.coreArgument.length).toBeGreaterThan(80);
      expect(brief.editorial.operatingTest.length).toBeGreaterThan(80);
      expect(brief.editorial.firstMove.length).toBeGreaterThan(80);
      expect(brief.editorial.stopSignal.length).toBeGreaterThan(80);

      const occupied = new Set<number>();
      for (const chapter of brief.chapters) {
        expect(chapter.title.trim()).not.toBe('');
        expect(chapter.focus?.trim(), `${brief.slug}: missing chapter focus`).not.toBe('');
        expect(chapter.pages.start).toBeGreaterThanOrEqual(1);
        expect(chapter.pages.end).toBeGreaterThanOrEqual(chapter.pages.start);
        for (let page = chapter.pages.start; page <= chapter.pages.end; page += 1) {
          expect(occupied.has(page), `${brief.slug}: duplicate chapter page ${page}`).toBe(false);
          occupied.add(page);
        }
      }
      expect([...occupied].sort((a, b) => a - b)).toEqual(
        Array.from({ length: brief.pageCount }, (_, index) => index + 1),
      );

      expect(brief.publication.briefId).toBe(brief.slug);
      expect(brief.publication.fileName).toBe(`${brief.slug}.pdf`);
      expect(brief.publication.storageObject).toBe(brief.publication.fileName);
      expect(brief.publication.version).toMatch(/draft$/);
      expect(brief.publication.editionDate).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(brief.publication.sourceCutoff).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(brief.publication.language).toBe('en-US');
      expect(brief.publication.author.trim()).not.toBe('');
      expect(brief.publication.reviewer.trim()).not.toBe('');
      expect(brief.publication.contact).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
      expect(brief.publication.accessibility.semanticHtmlAlternative).toBe(true);
      expect(brief.publication.accessibility.taggedPdfRequested).toBe(true);
      expect(brief.publication.accessibility.outlineRequested).toBe(true);

      for (const claim of [...brief.evidenceNeeds, ...brief.limitations]) {
        expect(claim, `${brief.slug}: unlabeled claim`).toMatch(claimClassPattern);
      }

      expect(brief.sources.length).toBeGreaterThanOrEqual(4);
      expect(new Set(brief.sources.map(({ id }) => id)).size).toBe(brief.sources.length);
      for (const source of brief.sources) {
        expect(source.claimClass).toBe('evidence');
        expect(source.sourceType).toBe('primary');
        expect(source.url).toMatch(/^https:\/\//);
        expect(source.url.match(sourceUrlPattern)).toHaveLength(1);
        expect(source.citation).toContain(source.url);
        expect(source.title.trim()).not.toBe('');
        expect(source.publisher.trim()).not.toBe('');
        expect(source.published.trim()).not.toBe('');
        expect(source.supports.trim()).not.toBe('');
        expect(source.provenance).toMatch(/primary-source URL declared/i);
      }
    }
  });
});
