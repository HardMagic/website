import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { briefs } from '../../src/data/briefs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const manifestPath = resolve(root, 'docs/release-evidence/briefs/manifest.json');
const pdfDirectory = resolve(root, 'infra/brief-delivery/source-pdfs');

interface BriefManifest {
  schemaVersion: string;
  releaseStatus: string;
  briefCount: number;
  editions: Array<{
    briefId: string;
    title: string;
    fileName: string;
    bytes: number;
    pages: number;
    sha256: string;
    storageObject: string;
    storageVersion: string | null;
    uploadTime: string | null;
    deliveryState: string;
    landing: {
      publicPath: string;
      title: string;
      thesis: string;
      promise: string;
      headline: string;
      audience: string[];
      decision: string;
      pageCount: number;
      topics: string[];
    };
    provenance: { sourceCount: number; sources: Array<{ url: string; citation: string }> };
    contentAudit: {
      pages: number;
      uniquePageCount: number;
      minimumPageWordCount: number;
      overflowPages: number[];
    };
    accessibility: {
      automated: { htmlLanguage: string; semanticHeadings: boolean; figureCaptions: boolean; taggedPdf: boolean; documentOutline: boolean; selectableText: boolean };
      manualReview: { status: string };
    };
  }>;
}

function pdfPageCount(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
}

function sha256(pdf: Buffer): string {
  return createHash('sha256').update(pdf).digest('hex');
}

describe('generated technical brief evidence', () => {
  it('records checksum, parity, source, and delivery state for every edition', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as BriefManifest;

    expect(manifest.schemaVersion).toBe('brief-release-manifest.v1');
    expect(manifest.releaseStatus).toMatch(/not uploaded or deployed/);
    expect(manifest.briefCount).toBe(8);
    expect(manifest.editions).toHaveLength(8);

    const manifestIds = new Set<string>();
    for (const entry of manifest.editions) {
      manifestIds.add(entry.briefId);
      const brief = briefs.find(({ slug }) => slug === entry.briefId);
      expect(brief, `missing source data for ${entry.briefId}`).toBeDefined();
      if (!brief) continue;

      expect(entry.title).toBe(brief.title);
      expect(entry.fileName).toBe(brief.publication.fileName);
      expect(entry.storageObject).toBe(brief.publication.storageObject);
      expect(entry.landing).toEqual({
        publicPath: `/briefs/${brief.slug}/`,
        title: brief.title,
        thesis: brief.thesis,
        promise: brief.squeeze.promise,
        headline: brief.squeeze.headline,
        audience: [...brief.audience],
        decision: brief.decision,
        pageCount: brief.pageCount,
        topics: [...brief.topics],
      });
      expect(entry.pages).toBe(brief.pageCount);
      expect(entry.contentAudit.pages).toBe(brief.pageCount);
      expect(entry.contentAudit.uniquePageCount).toBe(brief.pageCount);
      expect(entry.contentAudit.overflowPages).toEqual([]);
      expect(entry.contentAudit.minimumPageWordCount).toBeGreaterThanOrEqual(45);

      const pdfPath = resolve(pdfDirectory, entry.fileName);
      const pdf = readFileSync(pdfPath);
      expect(entry.bytes).toBe(statSync(pdfPath).size);
      expect(entry.sha256).toBe(sha256(pdf));
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(pdfPageCount(pdf)).toBe(brief.pageCount);
      expect(pdf.toString('latin1')).toContain('/StructTreeRoot');
      expect(pdf.toString('latin1')).toContain('/Outlines');

      expect(entry.provenance.sourceCount).toBe(brief.sources.length);
      expect(entry.provenance.sources).toHaveLength(brief.sources.length);
      expect(entry.provenance.sources.every(({ url, citation }) => citation.includes(url))).toBe(true);
      expect(entry.accessibility.automated).toEqual({
        htmlLanguage: 'en-US',
        semanticHeadings: true,
        figureCaptions: true,
        taggedPdf: true,
        documentOutline: true,
        selectableText: true,
      });
      expect(entry.accessibility.manualReview.status).toBe('pending');
      expect(entry.storageVersion).toBeNull();
      expect(entry.uploadTime).toBeNull();
      expect(entry.deliveryState).toBe('not-uploaded');

      const html = readFileSync(resolve(pdfDirectory, `${brief.slug}.html`), 'utf8');
      expect(html).toContain('<html lang="en-US"');
      expect(html).toContain('<h1 id="document-title">');
      expect(html).toContain('<figure aria-labelledby=');
      expect(html).toContain('<table>');
    }

    expect(manifestIds).toEqual(new Set(briefs.map(({ slug }) => slug)));
  });
});
