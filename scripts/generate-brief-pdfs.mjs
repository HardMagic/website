import { createHash } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { briefs } from '../src/data/briefs.ts';

const output = resolve('infra/brief-delivery/source-pdfs');
const evidenceOutput = resolve('docs/release-evidence/briefs');
const sourceDate = Number(process.env.SOURCE_DATE_EPOCH);
const generatedAt = Number.isFinite(sourceDate) && sourceDate > 0
  ? new Date(sourceDate * 1000).toISOString()
  : new Date().toISOString();

await mkdir(output, { recursive: true });
await mkdir(evidenceOutput, { recursive: true });

const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[char]);

const pick = (items, index) => items[index % items.length];
const publicPath = (brief) => `/briefs/${brief.slug}/`;

const pageLenses = [
  {
    key: 'orientation',
    label: 'Orientation / name the boundary',
    title: 'Name the boundary before choosing the tool',
    question: 'What decision is this chapter making possible, and what would be out of scope?',
  },
  {
    key: 'evidence',
    label: 'Evidence / inspect the signal',
    title: 'Read the signal at its actual boundary',
    question: 'What does the cited source establish, and what does it leave for the organization to measure?',
  },
  {
    key: 'system',
    label: 'System / connect the work',
    title: 'Make the handoff inspectable',
    question: 'Which owner, record, interface, or control has to connect for the proposed system to work?',
  },
  {
    key: 'authority',
    label: 'Authority / keep judgment visible',
    title: 'Keep approval and dissent visible',
    question: 'Who may approve, pause, reverse, or challenge the next move?',
  },
  {
    key: 'workshop',
    label: 'Workshop / make a reversible move',
    title: 'Turn the argument into a small test',
    question: 'What can be tested with a real workflow, a named owner, and a 30-day evidence return?',
  },
  {
    key: 'counterevidence',
    label: 'Counterevidence / define the stop',
    title: 'Write the condition that would change the plan',
    question: 'What result, constraint, or loss of context would disconfirm this direction?',
  },
];

function sourceLink(source) {
  return `<a href="${escape(source.url)}" rel="noreferrer">Open the inspectable primary source ↗</a>`;
}

function pageContent(brief, pageNumber) {
  const chapterIndex = brief.chapters.findIndex(({ pages }) => pageNumber >= pages.start && pageNumber <= pages.end);
  const chapter = brief.chapters[chapterIndex] ?? brief.chapters.at(-1);
  const localPage = pageNumber - (chapter?.pages.start ?? pageNumber) + 1;
  const lens = pageLenses[(pageNumber + brief.slug.length) % pageLenses.length];
  const source = brief.sources.length ? pick(brief.sources, pageNumber - 2) : null;
  const limitation = pick(brief.limitations, pageNumber - 2);
  const audience = pick(brief.audience, pageNumber - 2);
  const topic = pick(brief.topics, pageNumber - 2);
  const diagram = pick(brief.diagrams, pageNumber - 2);
  const worksheet = pick(brief.worksheets, pageNumber - 2);
  if (!chapter?.focus) throw new Error(`${brief.slug}: missing authored focus for chapter ${chapterIndex + 1}`);
  const chapterFocus = chapter.focus;
  const pageId = `${brief.slug}-page-${pageNumber}`;
  const figureId = `${pageId}-figure`;

  if (pageNumber === 1) {
    return `<header class="cover-grid" aria-labelledby="document-title">
      <p>HARDMAGIC / TECHNICAL BRIEF</p>
      <h1 id="document-title">${escape(brief.title)}</h1>
      <blockquote class="cover-thesis">${escape(brief.thesis)}</blockquote>
      <p class="cover-promise"><strong>${escape(brief.squeeze.headline)}</strong> ${escape(brief.squeeze.promise)}</p>
      <p class="cover-audience"><b>Written for:</b> ${escape(brief.audience.join(' · '))}</p>
      <p class="cover-topics"><b>Brief ID:</b> ${escape(brief.publication.briefId)} · <b>Topics:</b> ${escape(brief.topics.join(' · '))}</p>
      <dl class="publication-record">
        <div><dt>Edition</dt><dd>${escape(brief.publication.editionDate)} · ${escape(brief.publication.version)}</dd></div>
        <div><dt>Depth</dt><dd>${brief.pageCount} pages · ${escape(brief.publication.confidentiality)}</dd></div>
        <div><dt>Author</dt><dd>${escape(brief.publication.author)}</dd></div>
        <div><dt>Review</dt><dd>${escape(brief.publication.reviewer)}</dd></div>
        <div><dt>Source cutoff</dt><dd>${escape(brief.publication.sourceCutoff)}</dd></div>
        <div><dt>Distribution</dt><dd>${escape(brief.publication.distribution)}</dd></div>
      </dl>
      <p class="cover-contact">Questions or corrections: <a href="mailto:${escape(brief.publication.contact)}">${escape(brief.publication.contact)}</a></p>
    </header>`;
  }

  if (pageNumber === brief.pageCount) {
    return `<section class="closing" aria-labelledby="closing-title">
      <p class="kicker">HARDMAGIC CORPORATION / PRIVATE EDITION</p>
      <h2 id="closing-title">Make the next decision inspectable.</h2>
      <p>${escape(brief.decision)}</p>
      <p class="closing-argument">${escape(brief.editorial.firstMove)}</p>
      <div class="rule"></div>
      <dl class="closing-record">
        <div><dt>Edition</dt><dd>${escape(brief.publication.version)} · ${escape(brief.publication.editionDate)}</dd></div>
        <div><dt>Source cutoff</dt><dd>${escape(brief.publication.sourceCutoff)}</dd></div>
        <div><dt>Contact</dt><dd><a href="mailto:${escape(brief.publication.contact)}">${escape(brief.publication.contact)}</a></dd></div>
      </dl>
      <p class="closing-note">This document is decision support, not legal, financial, security, investment, or accessibility certification. Validate the recommendation against the participating organization’s actual systems, obligations, and approval process.</p>
      <b>DREAM IN REALITY.</b>
    </section>`;
  }

  const narrative = {
    orientation: `${chapterFocus} ${brief.editorial.coreArgument} In “${chapter.title},” that position becomes a boundary-setting exercise: ${lens.question}`,
    evidence: `${chapterFocus} ${source ? `${source.title} is the inspectable starting point for this page. ${source.supports}` : brief.editorial.coreArgument} The source note is evidence for a bounded observation, not proof of the 2035 scenario; ${lens.question.toLowerCase()}`,
    system: `${chapterFocus} ${brief.editorial.operatingTest} This chapter names the connection that makes the move durable, then asks ${lens.question.toLowerCase()}`,
    authority: `${chapterFocus} ${brief.editorial.coreArgument} The practical test is whether a human authority can explain the trade-off in “${chapter.title},” preserve dissent, and still answer: ${lens.question}`,
    workshop: `${chapterFocus} ${brief.editorial.firstMove} Use “${chapter.title}” as the scope for the exercise, and record the return evidence before expanding it. ${lens.question}`,
    counterevidence: `${chapterFocus} ${brief.editorial.stopSignal} The limitation below is a live boundary for “${chapter.title},” not a disclaimer added after the decision. ${lens.question}`,
  }[lens.key];

  const feature = {
    orientation: `<div class="decision-card"><span>CHAPTER DECISION</span><p>${escape(brief.decision)}</p><small>Scope: ${escape(topic)} · Chapter ${chapterIndex + 1} · local page ${localPage}</small></div>`,
    evidence: source
      ? `<div class="source-card"><span>PRIMARY SOURCE NOTE</span><h3>${escape(source.title)}</h3><p class="source-byline">${escape(source.publisher)} · ${escape(source.published)}</p><p>${escape(source.supports)}</p>${sourceLink(source)}<small>${escape(source.provenance)}</small></div>`
      : `<div class="source-card"><span>SOURCE REGISTER</span><p>No direct source record is attached to this page. Treat the argument as editorial interpretation and return to the source register before publication.</p></div>`,
    system: `<div class="system-card"><span>OPERATING TEST</span><h3>${escape(brief.editorial.operatingTest)}</h3><p>Trace the handoff through ${escape(chapter.title.toLowerCase())}; record the owner, evidence threshold, exception, and fallback.</p></div>`,
    authority: `<div class="authority-card"><span>DECISION RIGHT</span><h3>${escape(audience)}</h3><p>${escape(brief.editorial.coreArgument)}</p><dl><div><dt>Primary path</dt><dd>${escape(brief.routing.primaryDestination)}</dd></div><div><dt>Stop owner</dt><dd>Named human authority for this workflow</dd></div></dl></div>`,
    workshop: `<div class="worksheet-card"><span>WORKING INSTRUMENT</span><h3>${escape(worksheet)}</h3><table><caption>Evidence record for ${escape(chapter.title)}</caption><thead><tr><th scope="col">Field</th><th scope="col">Write before acting</th></tr></thead><tbody><tr><th scope="row">Decision</th><td>${escape(brief.decision)}</td></tr><tr><th scope="row">Owner</th><td>Accountable human authority</td></tr><tr><th scope="row">Proof</th><td>Observed result and unresolved objection</td></tr><tr><th scope="row">Next move</th><td>Reversible 30-day test</td></tr></tbody></table></div>`,
    counterevidence: `<div class="boundary-card"><span>PROJECTION BOUNDARY</span><h3>${escape(limitation)}</h3><p>${escape(brief.editorial.stopSignal)}</p></div>`,
  }[lens.key];

  return `<article class="running mode-${escape(lens.key)}" aria-labelledby="${pageId}-title">
    <header class="running-header" role="banner"><span>${escape(brief.title)}</span><b aria-label="Page ${pageNumber} of ${brief.pageCount}">${String(pageNumber).padStart(2, '0')} / ${brief.pageCount}</b></header>
    <main id="${pageId}">
      <p class="kicker">${escape(lens.label)} · ${escape(chapter.title)} · ${localPage} / ${chapter.pages.end - chapter.pages.start + 1}</p>
      <h2 id="${pageId}-title">${escape(lens.title)}</h2>
      <p class="chapter-line">Chapter ${chapterIndex + 1} / ${escape(chapter.title)}</p>
      <p class="lead">${escape(narrative)}</p>
      <div class="feature" aria-label="${escape(lens.label)}">${feature}</div>
      <div class="columns">
        <div>
          <h3>The question in this chapter</h3>
          <p>${escape(lens.question)}</p>
          <h3>Reader position</h3>
          <p>Written for ${escape(audience)}. Translate ${escape(topic)} into the role’s real authority, constraints, evidence, and consequences.</p>
          <h3>Editorial focus</h3>
          <p>${escape(chapterFocus)} Record what changed in the workflow, who noticed it, and which claim remains uncertain.</p>
        </div>
        <figure aria-labelledby="${figureId}-caption">
          <div class="diagram" role="img" aria-label="Conceptual operating diagram for ${escape(diagram)}"><i></i><i></i><i></i><b>HM</b></div>
          <figcaption id="${figureId}-caption"><strong>${escape(diagram)}</strong><span>Conceptual operating diagram. Validate every boundary against the participating organization’s real systems.</span></figcaption>
        </figure>
      </div>
    </main>
    <footer class="running-footer">HardMagic Corporation · ${escape(brief.publication.sourceCutoff)} source cutoff · Scenario, not prediction · <a href="https://hardmagic.com${publicPath(brief)}">Public summary and request page</a></footer>
  </article>`;
}

function documentFor(brief) {
  const pages = Array.from({ length: brief.pageCount }, (_, index) => `<section class="page" aria-label="Page ${index + 1} of ${brief.pageCount}">${pageContent(brief, index + 1)}</section>`).join('');
  const topics = brief.topics.map((topic) => `<li>${escape(topic)}</li>`).join('');
  return `<!doctype html>
<html lang="${escape(brief.publication.language)}" dir="ltr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="author" content="${escape(brief.publication.author)}">
    <meta name="description" content="${escape(brief.squeeze.promise)}">
    <meta name="subject" content="${escape(brief.decision)}">
    <meta name="keywords" content="${escape(brief.topics.join(', '))}">
    <meta name="generator" content="HardMagic brief generator; source: src/data/briefs.ts">
    <title>${escape(brief.title)}</title>
    <style>
      @page{size:Letter;margin:0}
      *{box-sizing:border-box}
      html{font-size:12px}
      body{margin:0;color:#150c0f;background:#fff;font:11px/1.38 Arial,sans-serif}
      a{color:#7d1234;text-decoration:underline;text-underline-offset:2px}
      .document,.page{width:8.5in}
      .page{position:relative;height:11in;overflow:hidden;padding:.56in;background:#f5eee6;break-after:page;page-break-after:always}
      .page:nth-child(4n+2){background:#efe3d7}
      .page:last-child{break-after:auto;page-break-after:auto}
      .cover-grid{height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:.12in;background:radial-gradient(circle at 70% 18%,#c52a5266,transparent 2in),linear-gradient(145deg,#090608,#4f0a20 65%,#a4143d);color:#fff}
      .cover-grid>p,.kicker,.running-header,.running-footer,.cover-grid dt,.closing dt,.feature span,.source-byline{font-size:8px;font-weight:700;letter-spacing:.13em;text-transform:uppercase}
      .cover-grid h1{max-width:6.5in;margin:0;font:46px/.91 Georgia,serif;letter-spacing:-.045em}
      .cover-thesis{max-width:6.5in;margin:0;font:15px/1.3 Georgia,serif}
      .cover-promise{max-width:6.5in;margin:0;color:#f8e9ee;font-size:10px;line-height:1.3}.cover-promise strong{display:block;margin-bottom:3px;color:#fff;font:13px/1.1 Georgia,serif}
      .cover-audience,.cover-topics{max-width:6.5in;margin:0;color:#e8dbe0;font-size:8px;line-height:1.25}.cover-audience b,.cover-topics b{color:#fff}
      .publication-record,.closing-record{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin:0;padding:14px 0;border-top:1px solid #ffffff55}
      .publication-record div,.closing-record div{min-width:0}
      .publication-record dd,.closing-record dd{margin:3px 0 0;color:#e8dbe0;font-size:10px}
      .cover-contact{margin:0;color:#e8dbe0;font-size:10px}
      .cover-contact a,.closing a{color:#ffd1dc}
      .running{height:100%;display:grid;grid-template-rows:auto 1fr auto}
      .running-header{display:flex;justify-content:space-between;padding-bottom:10px;border-bottom:1px solid #baaeb0;color:#685a5e}
      .running main{min-height:0;padding-top:.24in}
      .kicker{margin:0;color:#99143a;line-height:1.25}
      .running h2{max-width:6.9in;margin:8px 0 5px;font:29px/.98 Georgia,serif;letter-spacing:-.035em}
      .chapter-line{margin:0 0 9px;color:#99143a;font-size:8px;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
      .lead{max-width:6.9in;margin:0 0 10px;font-size:11px;line-height:1.36}
      .feature{min-height:1.22in;margin:9px 0;padding:11px 13px;border:1px solid #aa969d;background:#fffaf4}
      .feature h3{margin:4px 0 0;font:14px/1.15 Georgia,serif}
      .feature p{margin:5px 0 0}
      .feature small{display:block;margin-top:5px;color:#66595d;font-size:8px;line-height:1.25}
      .feature a{display:inline-block;margin-top:5px;font-size:9px;font-weight:700}
      .source-byline{margin:4px 0 0!important;color:#685a5e}
      .mode-authority .feature,.mode-counterevidence .feature{background:#170d12;color:#fff;border-color:#5e3b48}
      .mode-authority .feature small,.mode-counterevidence .feature small{color:#d8c8cd}
      .mode-authority .feature a,.mode-counterevidence .feature a{color:#f57a9c}
      .system-card h3,.boundary-card h3{font-size:13px}
      .authority-card dl{display:grid;grid-template-columns:1fr 1fr;gap:7px 16px;margin:8px 0 0}
      .authority-card dd{margin:2px 0 0;font-size:9px}
      table{width:100%;border-collapse:collapse;margin-top:7px;font-size:8.5px}
      caption{text-align:left;margin-bottom:4px;font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
      th,td{padding:4px 6px;border:1px solid #b8aaad;text-align:left;vertical-align:top}
      th{background:#f0e2d8;font-weight:700}
      .columns{display:grid;grid-template-columns:1.08fr .92fr;gap:.26in;margin-top:12px}
      .columns h3{margin:0 0 3px;font-size:11px}
      .columns h3:not(:first-child){margin-top:9px}
      .columns p{margin:0;color:#51464a;font-size:9.5px;line-height:1.34}
      figure{margin:0;padding:11px;background:#140d10;color:#fff}
      .diagram{position:relative;height:1.1in;margin:0 0 8px;background:radial-gradient(circle,#9b153d 0 10%,#35131d 11% 35%,#140d10 36%)}
      .diagram i{position:absolute;left:50%;top:50%;width:43%;height:1px;background:#9a7781;transform-origin:left}.diagram i:nth-child(1){transform:rotate(20deg)}.diagram i:nth-child(2){transform:rotate(140deg)}.diagram i:nth-child(3){transform:rotate(260deg)}.diagram b{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);font-size:11px}
      figcaption{display:grid;gap:4px;font-size:9px;line-height:1.25}figcaption span{color:#c9bdc0;font-size:8px}
      .running-footer{padding-top:9px;border-top:1px solid #baaeb0;color:#75686c;line-height:1.25}
      .running-footer a{font-size:8px;text-transform:none;letter-spacing:0}
      .closing{height:100%;display:flex;flex-direction:column;justify-content:center;background:radial-gradient(circle at 70% 25%,#85123555,transparent 2.5in),#090608;color:#fff;padding:.58in}
      .closing .kicker{color:#f57a9c}.closing h2{margin:.18in 0;font:48px/.91 Georgia,serif;letter-spacing:-.045em}.closing p{max-width:6in;color:#cdbfc2;font-size:13px;line-height:1.4}.closing-argument{font-family:Georgia,serif}.closing-record{max-width:6in;margin:.18in 0;border-color:#ffffff55}.closing-note{max-width:6.2in!important;font-size:9px!important}.closing .rule{width:1.4in;height:4px;margin:.2in 0;background:#c52a52}.closing>b{margin-top:.25in;color:#e34a70;letter-spacing:.18em}
      ul{margin:5px 0;padding-left:18px}.document-topics{display:none}
    </style>
  </head>
  <body>
    <main class="document" aria-label="${escape(brief.title)}">
      <ul class="document-topics" aria-label="Topics">${topics}</ul>
      ${pages}
    </main>
  </body>
</html>`;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function normalizePdfDates(buffer, editionDate) {
  const pdfText = buffer.toString('latin1');
  const pdfDate = `D:${editionDate.replaceAll('-', '')}000000+00'00'`;
  return Buffer.from(
    pdfText.replace(/\/CreationDate \(D:[^)]*\)/g, `/CreationDate (${pdfDate})`).replace(/\/ModDate \(D:[^)]*\)/g, `/ModDate (${pdfDate})`),
    'latin1',
  );
}

function pdfPageCount(buffer) {
  const pdfText = buffer.toString('latin1');
  return (pdfText.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
}

function normalizedPageText(text) {
  return text
    .replace(/\b\d{2}\s*\/\s*\d+\b/g, '')
    .replace(/HardMagic Corporation · .*?Public summary and request page/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function auditRenderedDocument(page, brief) {
  const pages = await page.locator('.page').evaluateAll((elements) => elements.map((element) => ({
    text: element.innerText,
    wordCount: element.innerText.trim().split(/\s+/).filter(Boolean).length,
    overflow: element.scrollHeight > element.clientHeight + 1,
    headings: element.querySelectorAll('h1,h2,h3').length,
    links: element.querySelectorAll('a[href]').length,
    figures: element.querySelectorAll('figure[aria-labelledby]').length,
    tables: element.querySelectorAll('table').length,
  })));
  const fingerprints = pages.map(({ text }) => sha256(Buffer.from(normalizedPageText(text))));
  const uniquePageCount = new Set(fingerprints).size;
  const overflowPages = pages.flatMap((entry, index) => (entry.overflow ? [index + 1] : []));
  const minimumPageWordCount = Math.min(...pages.map(({ wordCount }) => wordCount));

  if (pages.length !== brief.pageCount) throw new Error(`${brief.slug}: HTML page count ${pages.length} does not match declared ${brief.pageCount}`);
  if (overflowPages.length) throw new Error(`${brief.slug}: content overflows page(s) ${overflowPages.join(', ')}`);
  if (uniquePageCount !== pages.length) throw new Error(`${brief.slug}: repeated page content detected (${uniquePageCount}/${pages.length} unique)`);
  if (minimumPageWordCount < 45) throw new Error(`${brief.slug}: page has only ${minimumPageWordCount} words; editorial review required`);

  return {
    pages: pages.length,
    uniquePageCount,
    minimumPageWordCount,
    overflowPages,
    links: pages.reduce((total, pageEntry) => total + pageEntry.links, 0),
    figures: pages.reduce((total, pageEntry) => total + pageEntry.figures, 0),
    tables: pages.reduce((total, pageEntry) => total + pageEntry.tables, 0),
    headings: pages.reduce((total, pageEntry) => total + pageEntry.headings, 0),
  };
}

function claimClass(value) {
  return value.match(/^\[([^\]]+)\]/)?.[1]?.toLowerCase() ?? 'unlabeled';
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const editions = [];

try {
  for (const brief of briefs) {
    const html = documentFor(brief);
    const htmlPath = resolve(output, `${brief.slug}.html`);
    const pdfPath = resolve(output, brief.publication.fileName);
    await writeFile(htmlPath, html, 'utf8');
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => document.fonts?.ready);

    const contentAudit = await auditRenderedDocument(page, brief);
    const generatedPdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      outline: true,
      tagged: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    const pdf = normalizePdfDates(generatedPdf, brief.publication.editionDate);
    await writeFile(pdfPath, pdf);

    const pages = pdfPageCount(pdf);
    if (pages !== brief.pageCount) throw new Error(`${brief.slug}: PDF page count ${pages} does not match declared ${brief.pageCount}`);
    const metadataText = pdf.toString('latin1');
    const file = await stat(pdfPath);
    const sha = sha256(pdf);
    const sourceClaims = brief.evidenceNeeds.map((claim) => ({ claimClass: claimClass(claim), text: claim }));
    const entry = {
      briefId: brief.slug,
      title: brief.title,
      version: brief.publication.version,
      editionDate: brief.publication.editionDate,
      sourceCutoff: brief.publication.sourceCutoff,
      author: brief.publication.author,
      reviewer: brief.publication.reviewer,
      confidentiality: brief.publication.confidentiality,
      distribution: brief.publication.distribution,
      language: brief.publication.language,
      contact: brief.publication.contact,
      fileName: brief.publication.fileName,
      bytes: file.size,
      pages,
      sha256: sha,
      checksumAlgorithm: 'SHA-256',
      landing: {
        publicPath: publicPath(brief),
        title: brief.title,
        thesis: brief.thesis,
        promise: brief.squeeze.promise,
        headline: brief.squeeze.headline,
        audience: [...brief.audience],
        decision: brief.decision,
        pageCount: brief.pageCount,
        topics: [...brief.topics],
      },
      provenance: {
        sourceCount: brief.sources.length,
        sources: brief.sources,
        sourceClaims,
        policy: 'Evidence notes link directly to named primary sources; inference, recommendation, uncertainty, and boundary claims remain explicitly labeled.',
      },
      contentAudit,
      accessibility: {
        ...brief.publication.accessibility,
        htmlAlternative: {
          fileName: `${brief.slug}.html`,
          sourcePath: `infra/brief-delivery/source-pdfs/${brief.slug}.html`,
          protection: 'Source-only artifact; deliver behind the same private access control if used as an alternative.',
        },
        automated: {
          htmlLanguage: brief.publication.language,
          semanticHeadings: contentAudit.headings > 0,
          figureCaptions: contentAudit.figures === brief.pageCount - 2,
          taggedPdf: /\/StructTreeRoot\b/.test(metadataText),
          documentOutline: /\/Outlines\b/.test(metadataText),
          selectableText: contentAudit.minimumPageWordCount >= 45,
        },
        manualReview: {
          status: 'pending',
          required: ['PDF/UA screen-reader traversal', 'keyboard and zoom review of the HTML alternative', 'contrast and figure-description review'],
        },
      },
      storageObject: brief.publication.storageObject,
      storageVersion: null,
      uploadTime: null,
      deliveryState: 'not-uploaded',
      replacementProcedure: 'Approve a new version, regenerate the manifest, upload the exact filename with Entra ID, record the immutable storage version and checksum, then run a delivery canary.',
      rollbackProcedure: 'Stop delivery of the candidate object, restore the last approved object/version, verify its SHA-256 against the signed evidence, and rerun the exact-brief selection and expiry checks.',
    };
    editions.push(entry);
    console.log(`${brief.slug}: ${pages} pages, ${file.size} bytes, SHA-256 ${sha}`);
  }
} finally {
  await browser.close();
}

const manifest = {
  schemaVersion: 'brief-release-manifest.v1',
  generatedAt,
  generatedBy: 'scripts/generate-brief-pdfs.mjs',
  sourceOfTruth: 'src/data/briefs.ts',
  artifactDirectory: 'infra/brief-delivery/source-pdfs',
  releaseStatus: 'source-generated; not uploaded or deployed',
  briefCount: editions.length,
  editions,
};

await writeFile(resolve(evidenceOutput, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${editions.length}-edition manifest to docs/release-evidence/briefs/manifest.json`);
