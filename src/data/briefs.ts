export interface BriefChapter {
  readonly title: string;
  readonly pages: {
    readonly start: number;
    readonly end: number;
  };
  readonly focus?: string;
}

export interface BriefSqueeze {
  readonly headline: string;
  readonly promise: string;
  readonly preview: string;
}

export interface BriefRoute {
  readonly destination: string;
  readonly when: readonly string[];
}

export type BriefClaimClass = "evidence" | "inference" | "recommendation" | "uncertainty" | "boundary";

export interface BriefSource {
  readonly id: string;
  readonly claimClass: "evidence";
  readonly sourceType: "primary";
  readonly title: string;
  readonly publisher: string;
  readonly published: string;
  readonly citation: string;
  readonly url: string;
  readonly supports: string;
  readonly provenance: string;
}

export interface BriefEditorial {
  readonly coreArgument: string;
  readonly operatingTest: string;
  readonly firstMove: string;
  readonly stopSignal: string;
}

export interface BriefPublication {
  readonly briefId: string;
  readonly version: string;
  readonly editionDate: string;
  readonly sourceCutoff: string;
  readonly author: string;
  readonly reviewer: string;
  readonly confidentiality: string;
  readonly distribution: string;
  readonly language: "en-US";
  readonly contact: string;
  readonly fileName: string;
  readonly storageObject: string;
  readonly supersedes: string | null;
  readonly releaseStatus: "draft" | "approved" | "superseded";
  readonly accessibility: {
    readonly semanticHtmlAlternative: true;
    readonly taggedPdfRequested: true;
    readonly outlineRequested: true;
    readonly textSelectable: true;
    readonly readingOrder: "linear";
    readonly pdfUa: "not-certified";
  };
}

export interface BriefRouting {
  readonly primaryDestination: string;
  readonly primarySignals: readonly string[];
  readonly secondaryRoutes: readonly BriefRoute[];
}

export type BriefFollowupTiming = "delivery" | "day-3" | "day-10" | "day-21";

export interface BriefFollowup {
  readonly timing: BriefFollowupTiming;
  readonly purpose: string;
  readonly message: string;
  readonly action: string;
}

export interface TechnicalBrief {
  readonly slug: string;
  readonly title: string;
  readonly audience: readonly string[];
  readonly decision: string;
  readonly thesis: string;
  readonly pageCount: number;
  readonly chapters: readonly BriefChapter[];
  readonly diagrams: readonly string[];
  readonly worksheets: readonly string[];
  readonly evidenceNeeds: readonly string[];
  readonly limitations: readonly string[];
  readonly topics: readonly string[];
  readonly sources: readonly BriefSource[];
  readonly editorial: BriefEditorial;
  readonly publication: BriefPublication;
  readonly squeeze: BriefSqueeze;
  readonly routing: BriefRouting;
  readonly followups: readonly BriefFollowup[];
}

type BriefSeed = Omit<TechnicalBrief, "topics" | "sources" | "editorial" | "publication">;

const briefSeeds = [
  {
    slug: "generative-media-operating-system",
    title: "The Generative Media Operating System",
    audience: [
      "Chief executive officers",
      "Chief marketing officers",
      "Chief digital officers",
      "Studio leaders",
      "Transformation sponsors",
    ],
    decision:
      "Whether generative AI should remain a collection of experiments or become a governed production capability spanning creative, media, technology, and operations.",
    thesis:
      "[2035 vantage — inference] The decisive shift of 2024–2026 was not that machines learned to make media; it was that media became a continuously generated, evaluated, rights-bearing system. By 2035, the organizations that retained creative distinction treated intent, human authority, models, assets, provenance, infrastructure, distribution, and learning as one operating system. [Recommendation] Build that system now around accountable decisions and portable evidence—not around whichever model is temporarily strongest. [Uncertainty] Model capability, law, energy availability, and audience tolerance remain moving constraints.",
    pageCount: 30,
    chapters: [
      { title: "Cover and publication record", pages: { start: 1, end: 1 } },
      {
        title:
          "A dispatch from 2035: how to read evidence, inference, recommendation, and uncertainty",
        pages: { start: 2, end: 2 },
      },
      {
        title: "The 2035 thesis: media became an operating system",
        pages: { start: 3, end: 4 },
      },
      {
        title:
          "Evidence from 2024–2026: multimodal generation enters production",
        pages: { start: 5, end: 6 },
      },
      {
        title:
          "When tool portfolios fail to become capabilities",
        pages: { start: 7, end: 8 },
      },
      {
        title:
          "Seven durable capabilities: intent, generation, curation, rights, provenance, delivery, and learning",
        pages: { start: 9, end: 11 },
      },
      {
        title:
          "Decision rights across brand, creative, legal, technology, and operations",
        pages: { start: 12, end: 14 },
      },
      {
        title: "Reference architecture for a governed media factory",
        pages: { start: 15, end: 17 },
      },
      {
        title: "Human creative authority when agents can execute",
        pages: { start: 18, end: 19 },
      },
      {
        title:
          "Economics without prophecy: scenarios, option value, and reversible bets",
        pages: { start: 20, end: 21 },
      },
      { title: "2035-back maturity diagnostic", pages: { start: 22, end: 23 } },
      {
        title: "The first 90 days of a ten-year capability",
        pages: { start: 24, end: 26 },
      },
      {
        title: "Disconfirming evidence, failure modes, and signals to stop",
        pages: { start: 27, end: 27 },
      },
      {
        title: "Security, privacy, rights, and workforce implications",
        pages: { start: 28, end: 28 },
      },
      {
        title: "Methodology, limitations, and source notes",
        pages: { start: 29, end: 29 },
      },
      {
        title: "HardMagic engagement paths and contact panel",
        pages: { start: 30, end: 30 },
      },
    ],
    diagrams: [
      "Generative-media operating-system map",
      "Creative intent through generation, review, provenance, publication, and reuse",
      "Decision-rights matrix by workflow stage",
      "Control-plane versus media-plane architecture",
      "Human and agent responsibility boundary",
      "Maturity ladder using qualitative stage definitions",
    ],
    worksheets: [
      "GenAI media portfolio inventory",
      "Operating-model maturity assessment",
      "Decision-rights assignment sheet",
      "Model and vendor dependency register",
      "30/60/90-day mobilization canvas",
      "Scenario-cost worksheet using reader-supplied assumptions",
    ],
    evidenceNeeds: [
      "[Evidence] Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile — National Institute of Standards and Technology, 26 July 2024 (updated 8 April 2026). NIST frames GenAI risk work across govern, map, measure, and manage over the lifecycle. https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence",
      "[Evidence] Sora System Card — OpenAI, 9 December 2024. The disclosed production stack combines model controls, product policy, human review, red teaming, and provenance; this supports a systems—not tool-only—view of generative media. https://openai.com/index/sora-system-card/",
      "[Evidence] 2025 Digital Video Ad Spend & Strategy Full Report — Interactive Advertising Bureau, 15 July 2025. IAB reported that 86% of surveyed buyers were using or planning to use GenAI for video-ad creative; this is adoption evidence, not proof of effectiveness. https://www.iab.com/insights/video-ad-spend-report-2025/",
      "[Evidence] Copyright and Artificial Intelligence, Part 2: Copyrightability — U.S. Copyright Office, January 2025. The Office concluded that copyright protection depends on sufficient human-authored expressive elements, while mere prompting is insufficient. https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf",
      "[Evidence] State of AI-assisted Software Development 2025 — DORA / Google Cloud, 2025. DORA characterizes AI as an amplifier of an organization’s existing strengths and weaknesses, supporting investment in the operating system around tools. https://dora.dev/research/2025/dora-report/",
      "[Inference] Taken together, the sources indicate that generation will become ordinary while accountable orchestration becomes differentiating; they do not establish a universal productivity or revenue gain.",
      "[Recommendation] Before approving investment, collect organization-specific media volume, approval time, rework, rights exceptions, energy use, vendor cost, and audience-response baselines with definitions and audit trails.",
      "[Uncertainty] Revalidate model documentation, law, labor agreements, platform policies, energy constraints, and provenance interoperability at each major decision gate.",
    ],
    limitations: [
      "[Uncertainty] A 2035 vantage is a disciplined scenario, not a prediction; discontinuities may invalidate its sequence or timing.",
      "[Uncertainty] The cited adoption findings do not establish causal return on investment, output quality, or audience acceptance.",
      "[Boundary] Legal interpretation, labor arrangements, brand risk, infrastructure, and media economics vary by organization and jurisdiction.",
      "[Recommendation] Treat every scenario exhibit as a planning instrument, publish assumptions, and never present it as a forecast.",
    ],
    squeeze: {
      headline: "Your GenAI experiments are not yet an operating system.",
      promise:
        "A practical architecture, governance model, diagnostic, and 90-day sequence for turning fragmented media experiments into a coherent production capability.",
      preview:
        "A legible operating-system diagram, the six-capability index, and three diagnostic questions; the complete worksheets remain in the privately delivered brief.",
    },
    routing: {
      primaryDestination: "GenAI transformation and media operations",
      primarySignals: [
        "An enterprise program spans multiple business units",
        "Governance or decision-right ambiguity is blocking progress",
        "The organization has an active transformation horizon",
        "Production tools and pilots are fragmented",
      ],
      secondaryRoutes: [
        {
          destination: "Creative Direction",
          when: [
            "Creative authority is unclear",
            "Brand coherence is the primary concern",
          ],
        },
        {
          destination: "HardMagic Studio",
          when: [
            "Multimodal production workflow is the primary need",
            "Generation and review need to be operationalized",
          ],
        },
        {
          destination: "GPU Router",
          when: [
            "Inference cost is material",
            "Privacy or deployment placement is the primary constraint",
          ],
        },
        {
          destination: "Media Management",
          when: [
            "Asset discovery, approval, rights, or reuse dominates the intake",
          ],
        },
        {
          destination: "Executive advisory",
          when: [
            "The decision remains ambiguous",
            "The request spans several executive functions",
          ],
        },
      ],
    },
    followups: [
      {
        timing: "delivery",
        purpose: "Deliver the requested resource and open a useful dialogue.",
        message: "Which operating capability is currently least owned?",
        action: "Invite a direct reply without requiring another form.",
      },
      {
        timing: "day-3",
        purpose: "Help the reader apply the brief.",
        message:
          "Use the maturity diagnostic to identify the two most ambiguous decision rights.",
        action: "Link back to the privately delivered worksheet.",
      },
      {
        timing: "day-10",
        purpose: "Add report-specific operating guidance.",
        message:
          "A short operating-model note tailored to the challenge selected in the intake.",
        action: "Offer the most relevant HardMagic capability path.",
      },
      {
        timing: "day-21",
        purpose: "Convert demonstrated intent into a bounded working session.",
        message: "Map one real campaign or media workflow with HardMagic.",
        action: "Invite the reader to schedule a working session.",
      },
    ],
  },
  {
    slug: "creative-direction-after-the-prompt",
    title: "Creative Direction After the Prompt",
    audience: [
      "Chief marketing officers",
      "Brand leaders",
      "Executive creative directors",
      "Agency principals",
      "Content leaders",
    ],
    decision:
      "How creative leadership, approval authority, and brand continuity should change when generative execution becomes abundant.",
    thesis:
      "[2035 vantage — inference] By 2035, synthetic execution is abundant but attention, trust, and coherent worlds are not. The creative director’s work has moved upstream—from selecting executions to defining the premise, canon, ethical boundary, audience contract, and stopping rule that fleets of human and machine makers can honor. [Recommendation] Preserve named human authorship and accountable approval while giving artists wider spaces for divergence. [Uncertainty] No evidence establishes that audiences will accept synthetic expression uniformly across genres, cultures, or contexts.",
    pageCount: 28,
    chapters: [
      { title: "Cover and publication record", pages: { start: 1, end: 1 } },
      {
        title: "A note from 2035: reading future signals responsibly",
        pages: { start: 2, end: 2 },
      },
      {
        title: "Executive thesis: abundance made direction more valuable",
        pages: { start: 3, end: 4 },
      },
      {
        title:
          "The creative director in 2035: premise, canon, consent, and consequence",
        pages: { start: 5, end: 6 },
      },
      {
        title:
          "The prompt interface: a transitional layer, not an operating model",
        pages: { start: 7, end: 8 },
      },
      {
        title: "Translating brand strategy into generative constraints",
        pages: { start: 9, end: 10 },
      },
      {
        title:
          "The intent stack: premise, audience, world, system, and execution",
        pages: { start: 11, end: 13 },
      },
      {
        title: "Critique loops for human and agent teams",
        pages: { start: 14, end: 16 },
      },
      {
        title:
          "Persistent worlds across campaigns, formats, agents, and communities",
        pages: { start: 17, end: 18 },
      },
      {
        title:
          "Judgment without false precision: quality, originality, and fitness",
        pages: { start: 19, end: 20 },
      },
      {
        title:
          "Embedded, fractional, campaign, and transformation engagement models",
        pages: { start: 21, end: 22 },
      },
      {
        title: "Creative-direction workshop and 30-day pilot",
        pages: { start: 23, end: 25 },
      },
      {
        title: "Failure modes and organizational tensions",
        pages: { start: 26, end: 26 },
      },
      {
        title: "Methodology, limitations, and evidence requirements",
        pages: { start: 27, end: 27 },
      },
      {
        title: "HardMagic creative-leadership contact panel",
        pages: { start: 28, end: 28 },
      },
    ],
    diagrams: [
      "Creative-intent stack",
      "Brief-to-output translation pipeline",
      "Human critique and agent revision loop",
      "Brand-world continuity graph",
      "Creative decision-rights map",
      "Divergence and convergence workflow for concept development",
    ],
    worksheets: [
      "Creative-authority audit",
      "Brand-world definition canvas",
      "Critique-language worksheet",
      "What must remain human decision sheet",
      "Campaign continuity checklist",
      "Fractional creative-director readiness diagnostic",
    ],
    evidenceNeeds: [
      "[Evidence] Copyright and Artificial Intelligence, Part 2: Copyrightability — U.S. Copyright Office, January 2025. The Office centers human-determined expressive elements and says prompts alone do not provide sufficient control for copyrightability. https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf",
      "[Evidence] Sora System Card — OpenAI, 9 December 2024. OpenAI reports feedback across more than 500,000 model requests from more than 300 early users in over 60 countries and describes layered safety and provenance controls; the sample is provider-selected and not an industry census. https://openai.com/index/sora-system-card/",
      "[Evidence] 2025 Creator Economy Ad Spend & Strategy Report — Interactive Advertising Bureau, 20 November 2025. IAB reports 95% of surveyed creator-ad buyers had concerns about AI, led by authenticity or loss of human connection. https://www.iab.com/insights/2025-creator-economy-ad-spend-strategy-report/",
      "[Evidence] The rise of virtual creators: a new frontier on YouTube — YouTube Culture & Trends, 17 April 2025. YouTube reports that a sample of 300 virtual creators received more than 15 billion views in 2024, while emphasizing the human connection behind their personas. https://blog.youtube/culture-and-trends/youtube-culture-trends-report-virtual-creators/",
      "[Evidence] YouTube study reveals the rise of ‘creative maximalism’ in content — YouTube Culture & Trends, 4 September 2025. YouTube describes surveyed teen media expectations as participatory, customizable, and borderless; this is platform research, not a universal youth profile. https://blog.youtube/culture-and-trends/next-gen-creativity/",
      "[Inference] Human authorship, recognizable world-building, and community participation are likely to become stronger differentiators as executable media becomes inexpensive; the evidence does not prove one winning aesthetic.",
      "[Recommendation] Require approved brand systems, real briefs, consented artist research, decision logs, and paired intent-to-output review before claiming continuity or quality.",
      "[Uncertainty] Reassess audience disclosure preferences, copyright doctrine, likeness rights, labor terms, and platform norms by market and medium.",
    ],
    limitations: [
      "[Boundary] Taste, cultural resonance, originality, and artistic consequence cannot be reduced to a universal score.",
      "[Recommendation] A model must not independently approve brand-sensitive work; assign an accountable human decision-maker and preserve the decision record.",
      "[Boundary] Examples must label creative interpretation, reported evidence, commissioned work, and synthetic demonstration separately.",
      "[Uncertainty] Virtual-creator and creator-advertising findings may not transfer across platforms, countries, genres, or audience ages.",
    ],
    squeeze: {
      headline: "When anyone can generate, who decides what deserves to exist?",
      promise:
        "A field guide for establishing creative authority, useful critique, and brand continuity across human and generative production.",
      preview:
        "The intent-stack graphic and a five-question creative-authority audit.",
    },
    routing: {
      primaryDestination: "Creative Director intake",
      primarySignals: [
        "Creative leadership is absent or overloaded",
        "Generated output is inconsistent with the brand",
        "The organization is preparing executive-level brand work",
        "A campaign or brand system needs reinvention",
        "An embedded or fractional creative leader is requested",
      ],
      secondaryRoutes: [
        {
          destination: "Marketing Consulting",
          when: [
            "Positioning is unresolved",
            "Portfolio strategy is the primary ambiguity",
          ],
        },
        {
          destination: "HardMagic Studio",
          when: [
            "The operating workflow needs implementation",
            "Multimodal production is the principal need",
          ],
        },
        {
          destination: "Media Management",
          when: [
            "Continuity, curation, or asset governance is the primary problem",
          ],
        },
        {
          destination: "Executive principal dialogue",
          when: [
            "The work is confidential",
            "The request is an executive brand transformation",
          ],
        },
      ],
    },
    followups: [
      {
        timing: "delivery",
        purpose: "Deliver the brief and identify the authority gap.",
        message: "Which creative decision currently has no clear owner?",
        action: "Invite a direct reply.",
      },
      {
        timing: "day-3",
        purpose: "Make the brief operational.",
        message:
          "Complete the creative-authority audit against one active initiative.",
        action: "Return the reader to the relevant worksheet.",
      },
      {
        timing: "day-10",
        purpose: "Deepen the report-specific argument.",
        message:
          "A concise note on building critique systems for human and agent teams.",
        action: "Offer the appropriate creative leadership path.",
      },
      {
        timing: "day-21",
        purpose: "Offer a bounded next step.",
        message:
          "Test the operating model against one current campaign or brand decision.",
        action: "Invite a creative operating-model working session.",
      },
    ],
  },
  {
    slug: "provenance-ready-content-supply-chain",
    title: "The Provenance-Ready Content Supply Chain",
    audience: [
      "Media executives",
      "Publishers",
      "Brand governance leaders",
      "Legal and trust teams",
      "Newsroom and studio operators",
      "Platform architects",
    ],
    decision:
      "How to preserve and communicate the origin, transformation record, approval state, and distribution context of media.",
    thesis:
      "[2035 vantage — inference] By 2035, trustworthy media is not defined by whether it is synthetic; it is defined by whether people and machines can inspect a durable chain of claims about origin, ingredients, transformations, authority, and distribution. [Recommendation] Treat provenance as a supply-chain control from capture or generation through reuse, with cryptographic evidence complementing—not replacing—editorial verification. [Uncertainty] Credentials can be removed, platforms can reinterpret labels, keys can be compromised, and provenance cannot establish that a depicted event is true.",
    pageCount: 32,
    chapters: [
      { title: "Cover and publication record", pages: { start: 1, end: 1 } },
      {
        title:
          "A dispatch from 2035: provenance, authenticity, identity, integrity, and truth",
        pages: { start: 2, end: 2 },
      },
      {
        title: "Executive thesis: trust became inspectable infrastructure",
        pages: { start: 3, end: 4 },
      },
      {
        title: "Evidence from 2024–2026: the trust stack begins to standardize",
        pages: { start: 5, end: 6 },
      },
      {
        title:
          "The future media lifecycle: where context survives and where it vanishes",
        pages: { start: 7, end: 9 },
      },
      {
        title: "Credentials, metadata, manifests, and evidence boundaries",
        pages: { start: 10, end: 12 },
      },
      {
        title: "Reference provenance architecture",
        pages: { start: 13, end: 15 },
      },
      {
        title: "Capture and ingestion controls",
        pages: { start: 16, end: 17 },
      },
      { title: "Generative and editing events", pages: { start: 18, end: 19 } },
      {
        title: "Approval, signing, and publication",
        pages: { start: 20, end: 21 },
      },
      {
        title: "Distribution, transformation, and platform behavior",
        pages: { start: 22, end: 23 },
      },
      {
        title:
          "Verification experiences for people, platforms, agents, and media libraries",
        pages: { start: 24, end: 25 },
      },
      {
        title: "Incident response and disputed media",
        pages: { start: 26, end: 27 },
      },
      {
        title: "Implementation roadmap and control assessment",
        pages: { start: 28, end: 29 },
      },
      {
        title: "Counterarguments and residual risks",
        pages: { start: 30, end: 30 },
      },
      {
        title: "Methodology, standards review, and limitations",
        pages: { start: 31, end: 31 },
      },
      {
        title: "HardMagic provenance workshop and contact panel",
        pages: { start: 32, end: 32 },
      },
    ],
    diagrams: [
      "End-to-end content-supply-chain sequence",
      "Trust-boundary and key-management architecture",
      "Provenance event model",
      "Transformation lineage graph",
      "Verification decision tree",
      "Incident-response sequence for disputed media",
    ],
    worksheets: [
      "Media-lifecycle inventory",
      "Context-loss risk assessment",
      "Provenance control matrix",
      "Signing-authority and key-custody worksheet",
      "Platform compatibility test plan",
      "Disputed-media response tabletop",
    ],
    evidenceNeeds: [
      "[Evidence] Content Credentials: C2PA Technical Specification 2.1 — Coalition for Content Provenance and Authenticity, September 2024. The specification defines signed manifests, assertions, ingredients, validation states, and richer ingredient workflows. https://spec.c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html",
      "[Evidence] C2PA Content Credentials Explained: Addressing Common Questions and Updates — C2PA Technical Working Group, September 2025. C2PA describes a Content Credential as a cryptographically bound structure recording an asset’s provenance record and explicitly addresses security, privacy, and human-rights considerations. https://c2pa.org/wp-content/uploads/sites/33/2025/10/content_credentials_wp_0925.pdf",
      "[Evidence] Sora System Card — OpenAI, 9 December 2024. OpenAI documents a multilayer provenance approach using C2PA metadata, visible watermarks by default, and an internal reverse-video-search capability. https://openai.com/index/sora-system-card/",
      "[Evidence] Labeling AI-Generated Images on Facebook, Instagram and Threads — Meta, 6 February 2024 (updated 1 April 2025). Meta describes detecting C2PA and IPTC indicators to label content and illustrates that platform presentation is a separate layer from embedded provenance. https://about.fb.com/news/2024/02/labeling-ai-generated-images-on-facebook-instagram-and-threads/",
      "[Evidence] IPTC Photo Metadata Standard 2025.1 — International Press Telecommunications Council, 26 November 2025. IPTC added AI Prompt Information, AI Prompt Writer Name, AI System Used, and AI System Version Used. https://www.iptc.org/std/photometadata/specification/IPTC-PhotoMetadata-2025.1.html",
      "[Inference] By 2035, provenance is likely to function as machine-readable chain-of-custody infrastructure, but its value will depend on adoption, preservation, key governance, and understandable interfaces.",
      "[Recommendation] Test credential survival across every actual editor, transcode, DAM, CDN, social platform, download, screenshot, and re-upload path; record failures by version and date.",
      "[Uncertainty] Standards support and platform behavior change; re-run interoperability tests and threat models rather than relying on vendor announcements.",
    ],
    limitations: [
      "[Boundary] Provenance can support claims about origin and integrity; it does not prove that depicted events are true or that a signer is trustworthy.",
      "[Uncertainty] Credentials may be stripped, become inaccessible, fail validation, or be rendered differently by distribution platforms.",
      "[Recommendation] Keep origin evidence, identity, integrity, editorial verification, and truth claims separate in both interfaces and policy.",
      "[Boundary] This report is architecture guidance, not cryptographic, legal, evidentiary, or journalistic certification.",
    ],
    squeeze: {
      headline: "A provenance badge cannot repair a broken media supply chain.",
      promise:
        "An implementation-oriented architecture and assessment for preserving trustworthy context from creation through distribution.",
      preview:
        "The media-lifecycle diagram with public labels; the complete control matrix remains in the private brief.",
    },
    routing: {
      primaryDestination: "Media governance and provenance architecture",
      primarySignals: [
        "An active trust or authenticity initiative exists",
        "Publishing teams are evaluating provenance controls",
        "Misinformation or disputed-media risk is material",
        "Media context is lost across editing or distribution systems",
      ],
      secondaryRoutes: [
        {
          destination: "Media Management",
          when: [
            "Metadata or catalog remediation is the primary need",
            "Existing media lacks reliable context",
          ],
        },
        {
          destination: "GenAI Consulting",
          when: [
            "Generated-content policy is the primary decision",
            "Model workflow governance is unresolved",
          ],
        },
        {
          destination: "Infrastructure Advisory",
          when: [
            "Signing, key custody, or private workflow boundaries dominate",
          ],
        },
        {
          destination: "Executive risk dialogue",
          when: [
            "The environment is regulated",
            "The request is reputation-sensitive or confidential",
          ],
        },
      ],
    },
    followups: [
      {
        timing: "delivery",
        purpose: "Locate the most consequential context break.",
        message: "At which lifecycle stage is media context most often lost?",
        action: "Invite a direct reply.",
      },
      {
        timing: "day-3",
        purpose: "Support a first internal assessment.",
        message:
          "Use the context-loss checklist on one representative media path.",
        action: "Return the reader to the checklist.",
      },
      {
        timing: "day-10",
        purpose: "Turn the thesis into a testable plan.",
        message: "A concise note on designing a platform-preservation test.",
        action: "Offer the relevant governance or architecture path.",
      },
      {
        timing: "day-21",
        purpose: "Offer a bounded technical exercise.",
        message:
          "Test a provenance architecture or disputed-media scenario with HardMagic.",
        action: "Invite an architecture workshop or incident tabletop.",
      },
    ],
  },
  {
    slug: "hybrid-ai-media-infrastructure",
    title: "Private, Hybrid, and Governed AI Media Infrastructure",
    audience: [
      "Chief information officers",
      "Chief technology officers",
      "AI platform owners",
      "Security leaders",
      "Studio technology executives",
      "Finance owners",
    ],
    decision:
      "Which AI media workloads belong on local infrastructure, private cloud, or managed inference, and how those placement decisions should be governed.",
    thesis:
      "[2035 vantage — inference] Media compute became a programmable production resource, but power, cooling, locality, rights, and latency kept it physical. The durable architecture was neither cloud-first nor on-premises-first: it was policy-directed placement across devices, studios, private clusters, sovereign regions, and managed inference. [Recommendation] Route each workload by sensitivity, model fitness, energy and capacity envelope, latency, provenance obligations, portability, and accountable ownership. [Uncertainty] Hardware efficiency, model architecture, provider pricing, grid access, and regulation can change faster than capital plans.",
    pageCount: 31,
    chapters: [
      { title: "Cover and publication record", pages: { start: 1, end: 1 } },
      {
        title: "A dispatch from 2035: compute remained physical",
        pages: { start: 2, end: 2 },
      },
      {
        title:
          "Executive thesis: placement policy outlived platform preference",
        pages: { start: 3, end: 4 },
      },
      {
        title:
          "2035 workload taxonomy for image, video, audio, spatial media, simulation, and agents",
        pages: { start: 5, end: 7 },
      },
      {
        title: "Placement criteria and policy boundaries",
        pages: { start: 8, end: 10 },
      },
      { title: "Hybrid reference architecture", pages: { start: 11, end: 13 } },
      {
        title: "GPU routing and capacity orchestration",
        pages: { start: 14, end: 16 },
      },
      { title: "Model and workflow lifecycle", pages: { start: 17, end: 18 } },
      {
        title: "Security, isolation, data movement, and logging",
        pages: { start: 19, end: 20 },
      },
      {
        title: "Reliability and graceful degradation",
        pages: { start: 21, end: 22 },
      },
      {
        title:
          "Energy, carbon, capacity, and cost scenarios without false certainty",
        pages: { start: 23, end: 24 },
      },
      {
        title: "Benchmarking and quality gates",
        pages: { start: 25, end: 26 },
      },
      {
        title: "Build, buy, or blend decision workshop",
        pages: { start: 27, end: 28 },
      },
      {
        title: "Failure modes and operational ownership",
        pages: { start: 29, end: 29 },
      },
      {
        title: "Methodology, limitations, and evidence",
        pages: { start: 30, end: 30 },
      },
      {
        title: "HardMagic infrastructure assessment",
        pages: { start: 31, end: 31 },
      },
    ],
    diagrams: [
      "Hybrid inference control plane",
      "Workload-placement decision tree",
      "GPU Router request and fallback sequence",
      "Data-residency and trust-boundary map",
      "Capacity queue and priority model",
      "Benchmark-to-release quality-gate loop",
    ],
    worksheets: [
      "Workload classification inventory",
      "Placement-policy matrix",
      "Data-movement register",
      "Model and provider portability assessment",
      "Capacity and scenario-cost workbook",
      "Benchmark design sheet",
      "Operational responsibility matrix",
    ],
    evidenceNeeds: [
      "[Evidence] Energy and AI — International Energy Agency, 10 April 2025. The IEA models electricity demand, supply, security, emissions, innovation, and affordability around AI and states that AI deployment depends on data-centre electricity. https://www.iea.org/reports/energy-and-ai/",
      "[Evidence] Data centre electricity use surged in 2025, even with tightening bottlenecks driving a scramble for solutions — International Energy Agency, 16 April 2026. The IEA reports that capital expenditure by five large technology companies exceeded $400 billion in 2025 and was set to rise further in 2026; this is sector concentration evidence, not a workload cost forecast. https://www.iea.org/news/data-centre-electricity-use-surged-in-2025-even-with-tightening-bottlenecks-driving-a-scramble-for-solutions",
      "[Evidence] NVIDIA Blackwell Ultra AI Factory Platform Paves Way for Age of AI Reasoning — NVIDIA, 18 March 2025. NVIDIA positions inference as a rack-scale systems problem spanning compute, networking, and orchestration; vendor claims require independent workload testing. https://nvidianews.nvidia.com/news/nvidia-blackwell-ultra-ai-factory-platform-paves-way-for-age-of-ai-reasoning",
      "[Evidence] Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile — National Institute of Standards and Technology, 26 July 2024 (updated 8 April 2026). NIST recommends lifecycle risk management based on context, risk tolerance, and resources. https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence",
      "[Evidence] Sora System Card — OpenAI, 9 December 2024. The disclosed video system uses asynchronous generation time for moderation and applies controls to inputs and outputs, illustrating that production inference includes safety workloads beyond generation. https://openai.com/index/sora-system-card/",
      "[Inference] Media infrastructure will increasingly optimize a portfolio of generation, evaluation, moderation, provenance, storage, and delivery workloads rather than a single model endpoint.",
      "[Recommendation] Benchmark approved workloads with disclosed hardware, model, precision, settings, queue policy, energy boundary, failure behavior, and acceptance criteria; retain raw results.",
      "[Uncertainty] Reprice and re-benchmark at every procurement gate because service limits, accelerators, models, energy markets, and contractual terms are volatile.",
    ],
    limitations: [
      "[Uncertainty] Hardware, model efficiency, provider pricing, grid availability, carbon intensity, and service limits change rapidly.",
      "[Boundary] Illustrative architecture is not a capacity, availability, security, residency, or cost guarantee.",
      "[Boundary] Benchmark findings are not transferable unless hardware, model, settings, workloads, controls, and acceptance criteria are comparable.",
      "[Recommendation] Keep exit paths, portable assets, reproducible evaluations, and at least one graceful-degradation mode for every critical workflow.",
    ],
    squeeze: {
      headline: "Cloud versus local is the wrong infrastructure question.",
      promise:
        "A workload-placement method, hybrid reference architecture, and benchmark plan for governed media inference.",
      preview:
        "The workload-placement decision tree and an unfilled policy matrix.",
    },
    routing: {
      primaryDestination: "GPU Router and AI infrastructure",
      primarySignals: [
        "Privacy or data-residency restrictions affect inference",
        "Inference spend is difficult to govern",
        "GPU capacity is contested or unpredictable",
        "Multiple inference environments must be coordinated",
        "The organization is actively procuring or redesigning an AI platform",
      ],
      secondaryRoutes: [
        {
          destination: "HardMagic Studio",
          when: [
            "Production workflow adoption is the primary need",
            "Creative teams need a usable generation environment",
          ],
        },
        {
          destination: "GenAI Advisory",
          when: [
            "Portfolio and operating-model decisions precede infrastructure selection",
          ],
        },
        {
          destination: "Security Architecture",
          when: [
            "Sensitive-data boundaries dominate the decision",
            "Isolation and data movement require review",
          ],
        },
        {
          destination: "Benchmark and inference tuning",
          when: [
            "Evaluation methodology is the primary gap",
            "Release quality gates need to be established",
          ],
        },
      ],
    },
    followups: [
      {
        timing: "delivery",
        purpose: "Identify the governing placement constraint.",
        message:
          "Which constraint dominates: sensitivity, cost, capacity, latency, or model access?",
        action: "Invite a direct reply.",
      },
      {
        timing: "day-3",
        purpose: "Help classify the workload portfolio.",
        message:
          "Apply the workload-classification worksheet to one representative workflow.",
        action: "Return the reader to the worksheet.",
      },
      {
        timing: "day-10",
        purpose: "Provide constraint-specific guidance.",
        message: "A placement-policy note tailored to the selected constraint.",
        action: "Offer the most relevant infrastructure path.",
      },
      {
        timing: "day-21",
        purpose: "Turn interest into a testable architecture decision.",
        message:
          "Design one controlled architecture and benchmark plan with HardMagic.",
        action: "Invite an architecture and benchmark session.",
      },
    ],
  },
  {
    slug: "visual-product-development-field-guide",
    title: "The Visual Product Development Field Guide",
    audience: [
      "Product leaders",
      "Design executives",
      "Engineering leaders",
      "Digital-agency principals",
      "AI development teams",
    ],
    decision:
      "How visual product review should connect to source code, agent execution, human approval, and verification evidence.",
    thesis:
      "[2035 vantage — inference] By 2035, product interfaces are continuously negotiated among people, agents, code, policy, and live evidence. The artifact that mattered was not the screenshot or ticket but the durable link from a human observation to rendered region, source context, authorized action, evaluation, and approval. [Recommendation] Make visual intent executable only inside bounded permissions and require agents to return proof a reviewer can inspect. [Uncertainty] AI-assisted coding evidence remains context-sensitive and does not show that autonomy improves delivery outcomes by itself.",
    pageCount: 29,
    chapters: [
      { title: "Cover and publication record", pages: { start: 1, end: 1 } },
      {
        title: "A dispatch from 2035: software became a negotiated medium",
        pages: { start: 2, end: 2 },
      },
      {
        title: "Executive thesis: preserve the chain from perception to proof",
        pages: { start: 3, end: 4 },
      },
      {
        title: "Evidence from 2024–2026: acceleration exposed context loss",
        pages: { start: 5, end: 6 },
      },
      {
        title: "Repository-to-canvas-to-agent operating model",
        pages: { start: 7, end: 9 },
      },
      {
        title: "Annotation as structured intent",
        pages: { start: 10, end: 11 },
      },
      {
        title: "Connecting visual regions to source",
        pages: { start: 12, end: 14 },
      },
      {
        title: "Agent handoff, least authority, and reversible execution",
        pages: { start: 15, end: 17 },
      },
      {
        title:
          "Proof-carrying changes: evidence, review, verification, and rollback",
        pages: { start: 18, end: 19 },
      },
      {
        title: "Collaboration and decision record",
        pages: { start: 20, end: 21 },
      },
      {
        title: "Privacy and repository boundaries",
        pages: { start: 22, end: 23 },
      },
      {
        title: "Pilot design and workflow diagnostic",
        pages: { start: 24, end: 26 },
      },
      {
        title: "Failure modes and inappropriate use cases",
        pages: { start: 27, end: 27 },
      },
      {
        title: "Methodology, limitations, and source needs",
        pages: { start: 28, end: 28 },
      },
      { title: "WireMark evaluation path", pages: { start: 29, end: 29 } },
    ],
    diagrams: [
      "Repository-to-canvas architecture",
      "Annotation object and context model",
      "Visual-region-to-source relationship",
      "Agent task lifecycle",
      "Evidence-return loop",
      "Human approval and rollback sequence",
    ],
    worksheets: [
      "Product-feedback context-loss audit",
      "Visual-review workflow map",
      "Annotation taxonomy builder",
      "Agent authorization boundary sheet",
      "Evidence acceptance checklist",
      "WireMark pilot scorecard",
    ],
    evidenceNeeds: [
      "[Evidence] Accelerate State of DevOps Report 2024 — DORA / Google Cloud, 2024 (site updated 13 April 2026). DORA found AI adoption associated with individual benefits but also with weaker delivery stability and throughput, reinforcing the need for small batches and robust testing. https://dora.dev/research/2024/dora-report/",
      "[Evidence] State of AI-assisted Software Development 2025 — DORA / Google Cloud, 2025. DORA describes AI as an amplifier and locates returns in the surrounding organizational system, not in tools alone. https://dora.dev/research/2025/dora-report/",
      "[Evidence] Anthropic Economic Index: AI’s impact on software development — Anthropic, 28 April 2025. Analysis of 500,000 coding interactions found agent use skewed toward automation and web/UI tasks, while also showing substantial review and iteration. https://www.anthropic.com/research/impact-software-development",
      "[Evidence] Agentic coding and persistent returns to expertise — Anthropic, 16 June 2026. Analysis of approximately 400,000 Claude Code sessions reports that people made most planning decisions while the agent made most execution decisions, and that domain expertise remained associated with success. https://www.anthropic.com/research/claude-code-expertise",
      "[Evidence] Web Content Accessibility Guidelines (WCAG) 2.2 — World Wide Web Consortium, Recommendation republished 12 December 2024. W3C requires conformance across complete responsive page variations and combines automated and human evaluation. https://www.w3.org/TR/2024/REC-WCAG22-20241212/",
      "[Inference] As execution becomes cheaper, preserving intent, authorization, and review context is likely to become more important than maximizing generated code volume.",
      "[Recommendation] Baseline real review cycles, rework, defects, accessibility outcomes, and rollback frequency; evaluate a bounded workflow against the baseline before making an efficiency claim.",
      "[Uncertainty] Provider telemetry studies may not generalize to other tools, repositories, organizations, skill levels, or consequential production systems.",
    ],
    limitations: [
      "[Boundary] Visual context does not replace requirements, architecture, security analysis, accessibility research, tests, or accountable engineering review.",
      "[Uncertainty] Source mapping may be incomplete in complex rendering systems and can become stale as code changes.",
      "[Recommendation] Agent execution requires explicit scope, least privilege, change isolation, evidence, human approval, and tested rollback.",
      "[Boundary] Product examples and performance claims require customer approval and auditable records; demos are not outcome evidence.",
    ],
    squeeze: {
      headline:
        "Your product feedback loses meaning before engineering receives it.",
      promise:
        "A field guide for connecting visual intent, source intelligence, agents, and verification in one review loop.",
      preview: "The context-loss diagram and the opening workflow diagnostic.",
    },
    routing: {
      primaryDestination: "WireMark product evaluation",
      primarySignals: [
        "A product team has recurring visual-review problems",
        "Quality assurance and engineering handoffs lose context",
        "Agent coordination is disconnected from product evidence",
        "Implementation verification is inconsistent",
      ],
      secondaryRoutes: [
        {
          destination: "Web Magic",
          when: [
            "The scope is primarily a website",
            "Automated site remediation is the immediate need",
          ],
        },
        {
          destination: "Product and design consulting",
          when: [
            "The review workflow itself needs redesign",
            "Team responsibilities are unresolved",
          ],
        },
        {
          destination: "Agent engineering",
          when: [
            "Repository-aware automation is the primary requirement",
            "Authorization boundaries need implementation",
          ],
        },
        {
          destination: "Creative Direction",
          when: [
            "The underlying experience intent is unresolved",
            "Visual decisions lack accountable leadership",
          ],
        },
      ],
    },
    followups: [
      {
        timing: "delivery",
        purpose: "Locate the context-loss point.",
        message:
          "Where is context lost: capture, triage, implementation, or verification?",
        action: "Invite a direct reply.",
      },
      {
        timing: "day-3",
        purpose: "Help the team observe its current workflow.",
        message:
          "Run the context-loss audit against one recent product change.",
        action: "Return the reader to the audit.",
      },
      {
        timing: "day-10",
        purpose: "Describe an appropriate pilot shape.",
        message:
          "A pilot-pattern note based on the team and workflow identified in the intake.",
        action: "Offer a bounded WireMark evaluation.",
      },
      {
        timing: "day-21",
        purpose: "Move from abstract interest to a real workflow.",
        message: "Map one approved route or product workflow in WireMark.",
        action: "Invite a product-workflow session.",
      },
    ],
  },
  {
    slug: "autonomous-web-publishing-control-plane",
    title: "The Autonomous Web Publishing Control Plane",
    audience: [
      "Digital leaders",
      "Web-platform owners",
      "Marketing operations leaders",
      "Accessibility leaders",
      "Digital agencies",
    ],
    decision:
      "How much website auditing and remediation can safely become agent-assisted, and what evidence and approval controls must govern it.",
    thesis:
      "[2035 vantage — inference] By 2035, websites are read and operated by people, search systems, personal agents, assistive technology, and publishing agents at once. Autonomy became safe only where a control plane connected each finding to a standard, source location, bounded change, preview, human authority, release record, and rollback. [Recommendation] Optimize for useful, accessible, non-commodity publishing—not page volume—and let agents propose or execute only within explicit risk tiers. [Uncertainty] Discovery interfaces, agent protocols, ranking systems, and browser behavior will continue to change.",
    pageCount: 30,
    chapters: [
      { title: "Cover and publication record", pages: { start: 1, end: 1 } },
      {
        title: "A dispatch from 2035: the web gained machine audiences",
        pages: { start: 2, end: 2 },
      },
      {
        title: "Thesis: autonomous publishing requires a control plane",
        pages: { start: 3, end: 4 },
      },
      {
        title:
          "The 2035 publishing surface: people, agents, search, feeds, and media libraries",
        pages: { start: 5, end: 7 },
      },
      {
        title:
          "Audit domains: accessibility, performance, SEO, security, and delivery",
        pages: { start: 8, end: 10 },
      },
      {
        title: "Finding-to-source architecture",
        pages: { start: 11, end: 13 },
      },
      {
        title: "Agent remediation and approval boundaries",
        pages: { start: 14, end: 16 },
      },
      {
        title: "Evidence and regression verification",
        pages: { start: 17, end: 18 },
      },
      {
        title: "Deployment, rollback, and branch strategy",
        pages: { start: 19, end: 20 },
      },
      {
        title: "Governance for multi-site, multi-agent publishing portfolios",
        pages: { start: 21, end: 22 },
      },
      {
        title: "Measures and scenario baselines",
        pages: { start: 23, end: 24 },
      },
      { title: "30/60/90-day adoption plan", pages: { start: 25, end: 27 } },
      {
        title: "Failure modes and unsafe automation",
        pages: { start: 28, end: 28 },
      },
      {
        title: "Methodology, limitations, and source policy",
        pages: { start: 29, end: 29 },
      },
      { title: "Web Magic assessment path", pages: { start: 30, end: 30 } },
    ],
    diagrams: [
      "Audit-to-remediation control loop",
      "Finding-to-source evidence chain",
      "Branch, preview, approval, and release topology",
      "Agent authorization boundary",
      "Multi-site governance model",
      "Regression-gate sequence",
    ],
    worksheets: [
      "Website portfolio inventory",
      "Automation-boundary matrix",
      "Remediation-priority worksheet",
      "Evidence acceptance checklist",
      "Branch and release-policy template",
      "90-day site-quality program",
    ],
    evidenceNeeds: [
      "[Evidence] Web Content Accessibility Guidelines (WCAG) 2.2 — World Wide Web Consortium, Recommendation republished 12 December 2024. W3C defines testable accessibility requirements and states that responsive variations are part of full-page conformance. https://www.w3.org/TR/2024/REC-WCAG22-20241212/",
      "[Evidence] What web creators should know about our March 2024 core update and new spam policies — Google Search Central, 5 March 2024. Google defines scaled content abuse by purpose and lack of user value, regardless of whether content is made by humans or automation. https://developers.google.com/search/blog/2024/03/core-update-spam-policies",
      "[Evidence] Google Search’s guidance on using generative AI content on your website — Google Search Central, 2025. Google advises accuracy, quality, relevance, creation context, and metadata, and warns against low-value scaled generation. https://developers.google.com/search/docs/fundamentals/using-gen-ai-content",
      "[Evidence] A new resource for optimizing for generative AI in Google Search — Google Search Central, 15 May 2026. Google emphasizes valuable non-commodity content and says established SEO foundations remain relevant to generative search features. https://developers.google.com/search/blog/2026/05/a-new-resource-for-optimizing",
      "[Evidence] State of AI-assisted Software Development 2025 — DORA / Google Cloud, 2025. DORA reports that AI amplifies the surrounding organizational system, implying that publishing automation inherits weak testing and governance. https://dora.dev/research/2025/dora-report/",
      "[Inference] The web of 2035 is likely to reward demonstrable usefulness, machine-legible structure, accessible interaction, and attributable expertise more than undifferentiated publishing volume.",
      "[Recommendation] Link every automated finding to exact route, release, standard, source diff, preview, regression evidence, approval, and rollback record; distinguish lab from field data.",
      "[Uncertainty] Search ranking, AI answer interfaces, browser agents, and platform policies are not contractual guarantees and must be revalidated continuously.",
    ],
    limitations: [
      "[Boundary] Automated audits do not constitute full accessibility, security, search, content-quality, or performance certification.",
      "[Recommendation] Agents must not publish unrestricted changes; risk-tier permissions, preview, human approval, and rollback are mandatory for consequential routes.",
      "[Uncertainty] Search visibility, generative-answer inclusion, conversion, and field-performance outcomes cannot be guaranteed.",
      "[Boundary] A large route count is not evidence of usefulness; each page needs a distinct reader decision, original contribution, and maintenance owner.",
    ],
    squeeze: {
      headline:
        "Finding website defects is easy. Safely changing the source is the hard part.",
      promise:
        "A control architecture for turning audits into governed, evidence-backed remediation across a web portfolio.",
      preview:
        "The control-loop diagram and a sample automation-boundary matrix.",
    },
    routing: {
      primaryDestination: "Web Magic and web portfolio assessment",
      primarySignals: [
        "The organization manages multiple websites",
        "Audit failures repeatedly return to the backlog",
        "A static-site modernization is active",
        "Publishing is Git-based",
        "Accessibility remediation needs a governed workflow",
      ],
      secondaryRoutes: [
        {
          destination: "Marketing Consulting",
          when: [
            "Content and conversion are the primary problems",
            "The site lacks a clear market argument",
          ],
        },
        {
          destination: "WireMark",
          when: [
            "Visual product review is the primary workflow",
            "Source-linked annotation is needed",
          ],
        },
        {
          destination: "GenAI Engineering",
          when: [
            "Agent controls and authorization need implementation",
            "Automation architecture is the primary scope",
          ],
        },
        {
          destination: "Media Management",
          when: ["Asset performance, rights, or media governance dominates"],
        },
      ],
    },
    followups: [
      {
        timing: "delivery",
        purpose: "Identify the recurring quality backlog.",
        message: "Which audit domain creates the greatest recurring backlog?",
        action: "Invite a direct reply.",
      },
      {
        timing: "day-3",
        purpose: "Define safe automation boundaries.",
        message:
          "Apply the automation-boundary worksheet to one class of site findings.",
        action: "Return the reader to the worksheet.",
      },
      {
        timing: "day-10",
        purpose: "Make the control plane concrete.",
        message:
          "A report-specific control-loop example for the selected audit domain.",
        action: "Offer the most relevant Web Magic path.",
      },
      {
        timing: "day-21",
        purpose: "Offer a bounded evaluation.",
        message:
          "Review one approved site or route set without granting unrestricted publishing authority.",
        action: "Invite a controlled site assessment.",
      },
    ],
  },
  {
    slug: "intelligent-media-asset-estate",
    title: "Media Memory: Building an Intelligent Asset Estate",
    audience: [
      "Media operations leaders",
      "Publishers",
      "Brand studios",
      "Digital asset management owners",
      "Collection stewards",
      "Creative operations teams",
    ],
    decision:
      "How to make a large media library discoverable, governed, rights-aware, portable, and reusable without discarding human curation.",
    thesis:
      "[2035 vantage — inference] By 2035, the competitive media estate is not the largest media library but the strongest institutional memory: assets carry interpretable lineage, rights, consent, provenance, relationships, audience context, and the reasons humans selected or rejected them. [Recommendation] Preserve machine enrichment beside—not over—human judgment, and make both portable across tools. [Uncertainty] Semantic models can misdescribe people and cultures; metadata can be incomplete; similarity never establishes ownership or permission.",
    pageCount: 28,
    chapters: [
      { title: "Cover and publication record", pages: { start: 1, end: 1 } },
      {
        title:
          "A dispatch from 2035: the media library became an active collaborator",
        pages: { start: 2, end: 2 },
      },
      {
        title: "Executive thesis: storage was never memory",
        pages: { start: 3, end: 4 },
      },
      {
        title:
          "The 2035 media-estate lifecycle: capture, generation, meaning, use, and remembrance",
        pages: { start: 5, end: 7 },
      },
      {
        title: "Metadata, taxonomy, and semantic enrichment",
        pages: { start: 8, end: 9 },
      },
      {
        title: "Human curation and review signals",
        pages: { start: 10, end: 12 },
      },
      {
        title: "Duplicate and near-duplicate relationships",
        pages: { start: 13, end: 14 },
      },
      {
        title: "Rights, restrictions, consent, and provenance",
        pages: { start: 15, end: 16 },
      },
      {
        title: "Connector and portability architecture",
        pages: { start: 17, end: 18 },
      },
      {
        title:
          "Search, agent retrieval, living collections, and responsible reuse",
        pages: { start: 19, end: 20 },
      },
      {
        title: "Governance and stewardship model",
        pages: { start: 21, end: 22 },
      },
      {
        title: "Estate diagnostic and remediation roadmap",
        pages: { start: 23, end: 25 },
      },
      {
        title: "Failure modes and migration risk",
        pages: { start: 26, end: 26 },
      },
      {
        title: "Methodology, limitations, and evidence",
        pages: { start: 27, end: 27 },
      },
      {
        title: "Photo Curator and media-management engagement",
        pages: { start: 28, end: 28 },
      },
    ],
    diagrams: [
      "Intelligent media-estate architecture",
      "Ingestion, enrichment, curation, and publication flow",
      "Metadata provenance model",
      "Near-duplicate relationship graph",
      "Rights and permitted-use decision tree",
      "Connector and portable-curation architecture",
    ],
    worksheets: [
      "Media-estate inventory",
      "Metadata completeness assessment",
      "Taxonomy decision canvas",
      "Curation-signal map",
      "Rights-risk register",
      "Migration and connector scorecard",
      "Stewardship responsibility matrix",
    ],
    evidenceNeeds: [
      "[Evidence] IPTC Photo Metadata Standard 2025.1 — International Press Telecommunications Council, 26 November 2025. IPTC added fields for AI prompt information, prompt writer, AI system, and system version while retaining descriptive, administrative, and rights metadata. https://www.iptc.org/std/photometadata/specification/IPTC-PhotoMetadata-2025.1.html",
      "[Evidence] IPTC Photo Metadata User Guide — International Press Telecommunications Council, 2025. The guide distinguishes trained algorithmic media, composite synthetic media, and other digital source types and recommends recording AI-system details without treating a prompt writer as the image creator. https://www.iptc.org/std/photometadata/documentation/userguide/",
      "[Evidence] IPTC Generative AI Opt-Out Best Practices — International Press Telecommunications Council, May 2025. IPTC documents ways content owners can express data-mining preferences in embedded metadata and related mechanisms. https://iptc.org/wp-content/uploads/2025/05/IPTC-Generative-AI-Opt-Out-Best-Practices.pdf",
      "[Evidence] Content Credentials: C2PA Technical Specification 2.1 — Coalition for Content Provenance and Authenticity, September 2024. C2PA ingredients and assertions provide a model for recording asset relationships and transformations beyond flat descriptive metadata. https://spec.c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html",
      "[Evidence] Copyright and Artificial Intelligence, Part 2: Copyrightability — U.S. Copyright Office, January 2025. The Office’s human-authorship analysis makes the creation record and human contribution operationally relevant to asset governance. https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf",
      "[Inference] By 2035, asset value is likely to depend on portable relationships among rights, provenance, creative decisions, performance context, and machine-readable representations—not semantic search alone.",
      "[Recommendation] Evaluate retrieval and duplicate detection with authorized representative collections and human relevance judgments; separately audit rights, consent, retention, and cultural-description errors.",
      "[Uncertainty] Metadata fields and provenance records can conflict, disappear during transformation, or encode biased description; designate stewards and preserve corrections as a record.",
    ],
    limitations: [
      "[Uncertainty] Automated enrichment can be wrong, culturally biased, temporally stale, or falsely confident.",
      "[Boundary] Similarity is not legal equivalence and does not establish duplicate ownership, authorship, or permission.",
      "[Boundary] Metadata completeness and a valid credential do not by themselves prove usage rights or factual truth.",
      "[Uncertainty] Migration outcomes depend on source access, export fidelity, identifier continuity, and preservation of relationships.",
      "[Recommendation] Retain human correction, dissent, and selection rationale instead of silently replacing existing descriptions.",
    ],
    squeeze: {
      headline:
        "Your media library remembers files. Does it remember why they mattered?",
      promise:
        "A practical model for joining curation, metadata, rights, similarity, and portable media operations.",
      preview: "The media-estate lifecycle and a short metadata diagnostic.",
    },
    routing: {
      primaryDestination: "Media Management and Photo Curator",
      primarySignals: [
        "A media-library or asset-management migration is active",
        "Metadata quality is limiting discovery or reuse",
        "Photo selection and collection-scale review are difficult",
        "Duplicate or near-duplicate assets create operational friction",
        "Media connectors or portable curation are required",
      ],
      secondaryRoutes: [
        {
          destination: "Provenance Advisory",
          when: [
            "Authenticity and lineage are the primary concerns",
            "Publishing context must survive transformation",
          ],
        },
        {
          destination: "Creative Direction",
          when: [
            "Editorial selection systems are the primary need",
            "Curation lacks accountable creative judgment",
          ],
        },
        {
          destination: "HardMagic Studio",
          when: [
            "Generated media must flow into governed libraries",
            "Production-to-library workflow is the primary scope",
          ],
        },
        {
          destination: "Marketing Consulting",
          when: [
            "Content reuse and channel activation drive the decision",
            "The estate must support a broader content strategy",
          ],
        },
      ],
    },
    followups: [
      {
        timing: "delivery",
        purpose: "Identify the immediate estate problem.",
        message:
          "Is the immediate problem discovery, rights, duplication, migration, or curation?",
        action: "Invite a direct reply.",
      },
      {
        timing: "day-3",
        purpose: "Establish the current-state inventory.",
        message:
          "Use the media-estate inventory on one representative collection.",
        action: "Return the reader to the worksheet.",
      },
      {
        timing: "day-10",
        purpose: "Provide problem-specific guidance.",
        message:
          "A concise report-specific note on the challenge selected in the intake.",
        action: "Offer the relevant media-management path.",
      },
      {
        timing: "day-21",
        purpose: "Offer a controlled technical evaluation.",
        message:
          "Assess an approved, non-sensitive sample of the media estate with HardMagic.",
        action: "Invite a sample assessment.",
      },
    ],
  },
  {
    slug: "modern-media-agency-transformation-playbook",
    title: "The Modern Media Agency Transformation Playbook",
    audience: [
      "Chief executive officers",
      "Chief marketing officers",
      "Agency leaders",
      "Procurement executives",
      "Private-company owners",
      "Business-unit leaders",
    ],
    decision:
      "Whether to hire an agency, assemble specialists, embed creative leadership, or build an internal GenAI and media capability.",
    thesis:
      "[2035 vantage — inference] The agency transformation of 2024–2035 did not end agencies; it dissolved the inherited boundary between client, studio, creator, platform, model, and audience. The enduring firms became capability systems that could compose executive intent, human creative authority, specialist craft, agentic production, creator communities, governed infrastructure, media memory, provenance, and market learning. [Recommendation] Own the decisions and institutional memory that differentiate the brand; procure modular execution where it creates advantage. [Uncertainty] The right ownership model remains contingent on category, geography, regulation, talent, scale, and leadership capacity.",
    pageCount: 35,
    chapters: [
      { title: "Cover and publication record", pages: { start: 1, end: 1 } },
      {
        title: "A dispatch from 2035: how to use future signals",
        pages: { start: 2, end: 2 },
      },
      {
        title:
          "Executive thesis: from agency roster to adaptive capability system",
        pages: { start: 3, end: 5 },
      },
      {
        title:
          "Evidence from 2024–2026: creator, video, AI, and consumption boundaries converge",
        pages: { start: 6, end: 8 },
      },
      {
        title: "The 2035 capability-system model",
        pages: { start: 9, end: 11 },
      },
      {
        title: "Brand strategy and executive intent",
        pages: { start: 12, end: 14 },
      },
      {
        title: "Creative direction and campaign systems",
        pages: { start: 15, end: 17 },
      },
      {
        title: "GenAI production and studio operations",
        pages: { start: 18, end: 20 },
      },
      {
        title: "Media management, provenance, and reuse",
        pages: { start: 21, end: 22 },
      },
      {
        title: "Web, product, and distribution operations",
        pages: { start: 23, end: 24 },
      },
      {
        title:
          "Owned, embedded, networked, creator-led, and managed engagement models",
        pages: { start: 25, end: 27 },
      },
      {
        title: "Governance, procurement, and commercial alignment",
        pages: { start: 28, end: 29 },
      },
      {
        title: "Transformation diagnostic and 90-day sequence",
        pages: { start: 30, end: 32 },
      },
      {
        title: "Counterarguments and conditions for traditional models",
        pages: { start: 33, end: 33 },
      },
      {
        title: "Methodology, limitations, and evidence policy",
        pages: { start: 34, end: 34 },
      },
      {
        title: "HardMagic principal dialogue and service pathways",
        pages: { start: 35, end: 35 },
      },
    ],
    diagrams: [
      "Modern media capability system",
      "Executive-intent-to-market-learning loop",
      "Internal, embedded, managed, and project engagement models",
      "Creative and technical decision-rights map",
      "Campaign-to-evergreen media value chain",
      "HardMagic product-and-advisory ecosystem map",
    ],
    worksheets: [
      "Agency-model fit assessment",
      "Capability ownership matrix",
      "Creative-leadership gap analysis",
      "Partner and vendor portfolio map",
      "Campaign operating-model canvas",
      "GenAI and media transformation backlog",
      "90-day executive action plan",
    ],
    evidenceNeeds: [
      "[Evidence] 2025 Creator Economy Ad Spend & Strategy Report — Interactive Advertising Bureau, 20 November 2025. IAB projected U.S. creator ad spend at $37 billion in 2025 and reported that 48% of surveyed creator buyers considered creators a must-buy; projections are not realized results. https://www.iab.com/insights/2025-creator-economy-ad-spend-strategy-report/",
      "[Evidence] 2025 Digital Video Ad Spend & Strategy Full Report — Interactive Advertising Bureau, 15 July 2025. IAB reported $64 billion in U.S. digital-video ad spend for 2024 and projected $72 billion for 2025, alongside broad planned use of GenAI creative. https://www.iab.com/insights/video-ad-spend-report-2025/",
      "[Evidence] Streaming Cranks Up the Heat in July, Accounts For Nearly Half of All TV Viewing in Nielsen’s The Gauge — Nielsen, 19 August 2025. Nielsen measured streaming at 47.3% of U.S. television viewing in July 2025; the measure covers viewing through a television screen and is not total media consumption. https://www.nielsen.com/news-center/2025/streaming-cranks-up-the-heat-in-july-accounts-for-nearly-half-of-all-tv-viewing-in-nielsens-the-gauge/",
      "[Evidence] An entertainment revolution 20 years in the making — YouTube Culture & Trends, 20 June 2025. YouTube reports operation in more than 100 countries and 80 languages and more than one billion hours watched daily, framing entertainment as creator-community collaboration; these are platform-reported figures. https://blog.youtube/culture-and-trends/trends-report-20th/",
      "[Evidence] Copyright and Artificial Intelligence, Part 2: Copyrightability — U.S. Copyright Office, January 2025. The Office’s emphasis on human-determined expression supports retaining accountable creative authorship inside AI-enabled operating models. https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf",
      "[Evidence] State of AI-assisted Software Development 2025 — DORA / Google Cloud, 2025. DORA’s finding that AI amplifies organizational conditions cautions against treating tool procurement as transformation. https://dora.dev/research/2025/dora-report/",
      "[Inference] The 2035 media firm is likely to be judged less by headcount or network breadth than by its ability to compose trusted talent, systems, rights, learning, and distinctive creative authority around each decision.",
      "[Recommendation] Compare engagement models using approved contracts plus organization-specific spend, cycle, quality, reuse, rights, workforce, channel, and outcome baselines; disclose definitions and attribution limits.",
      "[Uncertainty] Market projections, platform statistics, and U.S.-centric surveys may not transfer to a specific brand, geography, medium, or economic cycle.",
    ],
    limitations: [
      "[Boundary] Evidence does not establish that the traditional agency model is universally obsolete or that internalization is always superior.",
      "[Uncertainty] Specialist agencies, global networks, internal teams, creator partnerships, and mixed arrangements can each be optimal under different conditions.",
      "[Recommendation] Base ownership decisions on strategy, creative leadership, procurement, geography, regulation, talent access, and operating maturity—not fashion.",
      "[Boundary] Spend and adoption metrics describe markets or surveyed intentions; they do not prove campaign effectiveness, incrementality, or return on investment.",
    ],
    squeeze: {
      headline:
        "You do not need another agency roster. You need a coherent media capability.",
      promise:
        "A decision guide for choosing among embedded creative leadership, managed media operations, GenAI production, consulting, and internal capability building.",
      preview:
        "The capability-system map and an abbreviated engagement-model comparison.",
    },
    routing: {
      primaryDestination: "Executive media transformation intake",
      primarySignals: [
        "The organization is reconsidering its agency or partner model",
        "Several media and marketing capabilities lack clear ownership",
        "Internal capability building is being evaluated",
        "The request spans creative, technology, media, and operating-model decisions",
      ],
      secondaryRoutes: [
        {
          destination: "Creative Director",
          when: [
            "Brand reinvention or campaign leadership is primary",
            "Creative inconsistency lacks accountable ownership",
          ],
        },
        {
          destination: "GenAI Transformation",
          when: [
            "Tool fragmentation, workflow redesign, or governance dominates",
          ],
        },
        {
          destination: "Media Management",
          when: [
            "Asset curation, provenance, or production operations dominate",
          ],
        },
        {
          destination: "Marketing Consulting",
          when: [
            "Positioning, portfolio, go-to-market, or channel strategy dominates",
          ],
        },
        {
          destination: "HardMagic Studio",
          when: [
            "Multimodal production and studio workflow are the immediate need",
          ],
        },
        {
          destination: "WireMark",
          when: [
            "Digital-product review and agent-assisted development are primary",
          ],
        },
        {
          destination: "Web Magic",
          when: ["Website portfolio quality and remediation are primary"],
        },
        {
          destination: "Principal dialogue",
          when: [
            "The request is confidential, cross-functional, or still ambiguous",
          ],
        },
      ],
    },
    followups: [
      {
        timing: "delivery",
        purpose: "Identify the ownership gap.",
        message:
          "Which media capability currently lacks accountable ownership?",
        action: "Invite a direct reply.",
      },
      {
        timing: "day-3",
        purpose: "Help compare engagement models.",
        message:
          "Complete the agency-model fit assessment against the current partner portfolio.",
        action: "Return the reader to the worksheet.",
      },
      {
        timing: "day-10",
        purpose: "Provide intake-specific interpretation.",
        message:
          "One tailored operating-model observation based on the declared need.",
        action: "Offer the most relevant HardMagic service or product path.",
      },
      {
        timing: "day-21",
        purpose: "Offer a principal-level next step.",
        message: "Map capability ownership and decision rights with HardMagic.",
        action: "Invite a principal-level capability-mapping discussion.",
      },
    ],
  },
] as const satisfies readonly BriefSeed[];

export type BriefSlug = (typeof briefSeeds)[number]["slug"];

const briefTopics: Record<BriefSlug, readonly string[]> = {
  "generative-media-operating-system": [
    "GenAI operating model",
    "governed media production",
    "creative and technical decision rights",
    "rights and provenance",
    "90-day capability building",
  ],
  "creative-direction-after-the-prompt": [
    "creative authority",
    "brand-world continuity",
    "human authorship",
    "critique systems",
    "generative production leadership",
  ],
  "provenance-ready-content-supply-chain": [
    "content provenance",
    "C2PA and credentials",
    "media supply chains",
    "verification and disputed media",
    "trust boundaries",
  ],
  "hybrid-ai-media-infrastructure": [
    "hybrid inference",
    "workload placement",
    "GPU capacity and routing",
    "security and data residency",
    "benchmarking and graceful degradation",
  ],
  "visual-product-development-field-guide": [
    "visual product review",
    "source-linked intent",
    "agent authorization",
    "proof-carrying changes",
    "reversible product delivery",
  ],
  "autonomous-web-publishing-control-plane": [
    "agent-assisted publishing",
    "accessibility and quality audits",
    "finding-to-source traceability",
    "risk-tiered remediation",
    "release and rollback governance",
  ],
  "intelligent-media-asset-estate": [
    "media asset governance",
    "metadata and taxonomy",
    "human curation",
    "rights-aware reuse",
    "portable media operations",
  ],
  "modern-media-agency-transformation-playbook": [
    "media capability systems",
    "agency and ownership models",
    "executive intent",
    "creative and technical operations",
    "procurement and transformation",
  ],
};

const briefEditorial: Record<BriefSlug, BriefEditorial> = {
  "generative-media-operating-system": {
    coreArgument:
      "Generation becomes a durable capability only when intent, authority, rights, provenance, infrastructure, distribution, and learning are designed as one operating system.",
    operatingTest:
      "Trace one real media workflow from request to approved reuse, naming the decision owner, evidence threshold, rights exception, and reversible fallback at each handoff.",
    firstMove:
      "Select one active workflow and record its current volume, approval time, rework, rights exceptions, vendor dependencies, and audience-response baseline before buying another tool.",
    stopSignal:
      "Pause the program when no accountable person can approve the output, explain its provenance, or reverse the dependency that created it.",
  },
  "creative-direction-after-the-prompt": {
    coreArgument:
      "When execution is abundant, creative direction is the accountable work of defining the premise, canon, audience contract, ethical boundary, and stopping rule.",
    operatingTest:
      "Take one live campaign and separate premise, world, constraints, critique language, approval authority, and execution so the team can see which decisions remain human.",
    firstMove:
      "Name the creative decision that currently has no owner, then run a small critique loop where divergent proposals and the final human choice are preserved together.",
    stopSignal:
      "Stop scaling generated output when the team can produce variants faster than it can explain why one is faithful, original, consented, and fit for the audience.",
  },
  "provenance-ready-content-supply-chain": {
    coreArgument:
      "Provenance earns trust only when the record of origin, transformation, authority, and distribution survives the actual media path and remains distinct from a claim that the depiction is true.",
    operatingTest:
      "Follow one asset through capture or generation, editing, signing, DAM storage, CDN delivery, platform transformation, download, and reuse; record where context is lost.",
    firstMove:
      "Choose a representative asset class and write the minimum event, identity, rights, and verification record that every system in its lifecycle must preserve.",
    stopSignal:
      "Do not call a badge a trust solution when credentials can be stripped, a signer is unaccountable, or editorial verification is absent from the user experience.",
  },
  "hybrid-ai-media-infrastructure": {
    coreArgument:
      "The durable infrastructure choice is policy-directed workload placement across local, private, sovereign, and managed environments—not a permanent preference for cloud or on-premises.",
    operatingTest:
      "Classify one workload by sensitivity, model fitness, latency, energy and capacity envelope, provenance obligation, portability, and owner before comparing providers.",
    firstMove:
      "Benchmark a representative approved workload with hardware, model, precision, settings, queue policy, energy boundary, failure behavior, and acceptance criteria recorded.",
    stopSignal:
      "Reject an architecture that cannot degrade safely, disclose data movement, reproduce its benchmark, or exit a provider without losing the governed workflow.",
  },
  "visual-product-development-field-guide": {
    coreArgument:
      "A screenshot or ticket becomes useful product evidence only when it remains connected to the rendered region, source context, authorized action, evaluation, approval, and rollback record.",
    operatingTest:
      "Select one recent visual finding and trace it from observation through source location, least-authority implementation, rendered verification, accessibility check, and reviewer decision.",
    firstMove:
      "Define a small annotation vocabulary and pilot it on one route so product, design, engineering, and an agent share the same evidence object.",
    stopSignal:
      "Keep an agent in proposal mode when context is incomplete, the requested change crosses a security or accessibility boundary, or rollback evidence is missing.",
  },
  "autonomous-web-publishing-control-plane": {
    coreArgument:
      "Safe publishing autonomy is a control plane that joins standards, source locations, bounded changes, preview, human authority, release evidence, and rollback—not a larger queue of automated fixes.",
    operatingTest:
      "Take one recurring audit finding and require the complete chain: standard, route, source diff, preview, regression evidence, approval, release identity, and recovery step.",
    firstMove:
      "Set risk tiers for audit findings and allow automation to execute only the lowest-risk class until the review and rollback loop has earned broader authority.",
    stopSignal:
      "Do not publish automatically when the finding cannot be mapped to source, the page is consequential, or the proposed remediation would hide a content or governance decision.",
  },
  "intelligent-media-asset-estate": {
    coreArgument:
      "An intelligent media estate is institutional memory: machine enrichment sits beside human selection, rights, provenance, relationships, and the reasons an asset was trusted or rejected.",
    operatingTest:
      "Evaluate findability and duplicate detection on an authorized representative collection while separately reviewing rights, consent, retention, and cultural-description errors.",
    firstMove:
      "Inventory one collection’s identifiers, descriptive fields, rights state, provenance, curation signals, and export fidelity before designing a new semantic layer.",
    stopSignal:
      "Do not promote similarity or automated enrichment to permission, authorship, cultural truth, or editorial judgment without a named steward and correction record.",
  },
  "modern-media-agency-transformation-playbook": {
    coreArgument:
      "The modern media organization is a capability system that composes executive intent, human creative authority, specialist craft, governed production, media memory, provenance, and learning around each decision.",
    operatingTest:
      "Compare ownership models using the same definitions for spend, cycle time, quality, reuse, rights, workforce, channel, and outcome while disclosing attribution limits.",
    firstMove:
      "Map one active capability from executive intent to market learning and identify which decisions must remain owned internally versus which execution can be composed externally.",
    stopSignal:
      "Do not change the roster or internalize work when the proposed model has no accountable creative authority, operating baseline, procurement logic, or transition path.",
  },
};

const briefChapterFocus: Record<BriefSlug, readonly string[]> = {
  "generative-media-operating-system": [
    "Treat the cover as a decision record: identify the edition, its evidence boundary, and the reader who must act.",
    "Separate a 2035 vantage from present evidence so the scenario creates a test rather than a false forecast.",
    "Define the operating system as linked authority, media, rights, infrastructure, distribution, and learning decisions.",
    "Use current adoption signals to ask what production control is needed; adoption alone cannot establish effectiveness.",
    "Diagnose why a portfolio of tools remains a portfolio instead of becoming an owned, measured capability.",
    "Make the seven capabilities visible as a chain with failure at the handoff, not as an inventory of features.",
    "Assign approval, exception, and stop rights across brand, creative, legal, technology, and operations.",
    "Keep policy and media planes distinct enough to change a model or vendor without losing accountability.",
    "Preserve human creative authority where agents can execute, revise, and multiply outputs faster than critique.",
    "Use scenarios to compare option value and reversibility, never to smuggle an unsupported return-on-investment claim.",
    "Turn maturity into observable behavior: ownership, evidence, rights, recovery, and learning rather than a score alone.",
    "Sequence the first 90 days around one live workflow so a ten-year ambition returns evidence quickly.",
    "Name the failure signal that would stop investment before sunk cost turns a weak pilot into policy.",
    "Treat privacy, rights, security, labor, and energy as operating constraints that shape the design from the start.",
    "Record source methods, assumptions, limitations, and open questions so another reviewer can reproduce the argument.",
    "End with a bounded path from the brief to a real workflow, not a generic invitation to buy more tools.",
  ],
  "creative-direction-after-the-prompt": [
    "Use the publication record to name who owns the creative question and which claims still require review.",
    "Read future signals as prompts for creative governance, not as permission to predict a single aesthetic outcome.",
    "Make abundance the reason to clarify direction: premise, canon, consequence, and the value of saying no.",
    "Move the creative director upstream to define authorship, consent, audience contract, and stopping rules.",
    "Treat the prompt as a transitional interface; the operating model must preserve intent beyond one interaction.",
    "Translate brand strategy into constraints that enable divergence without losing recognition or responsibility.",
    "Use the intent stack to distinguish premise, audience, world, system, and execution before judging the output.",
    "Design critique loops where agents can revise but a named human explains the final convergence.",
    "Protect persistent worlds across campaigns and formats by recording canon, exceptions, and community participation.",
    "Judge quality, originality, and fitness with situated criteria rather than an attractive but false universal score.",
    "Choose an engagement model by the authority and continuity it supplies, not by the label on the contract.",
    "Run a 30-day pilot against a real creative decision and preserve both divergence and the human choice.",
    "Use failure modes to expose when throughput, imitation, or approval speed is replacing creative judgment.",
    "State the evidence policy clearly: reported findings, interpretation, commissioned work, and synthetic demonstration are different.",
    "Make the closing path a specific creative-leadership conversation tied to the authority gap identified in the brief.",
  ],
  "provenance-ready-content-supply-chain": [
    "Use the record page to distinguish a provenance claim from a claim that the depicted event is true.",
    "Keep authenticity, identity, integrity, origin, and truth separate when reading the 2035 dispatch.",
    "Frame trust as inspectable infrastructure: people need context, and systems need durable event relationships.",
    "Read standards signals as implementation constraints while leaving room for adoption, preservation, and key-governance uncertainty.",
    "Map where context survives or disappears from capture through generation, editing, storage, distribution, and reuse.",
    "Distinguish credentials, descriptive metadata, manifests, and editorial evidence so one record does not overclaim.",
    "Design the provenance architecture around trust boundaries, signing authority, correction, and verification experience.",
    "Make ingestion the first control point: identify the asset, source, consent, rights, and initial context.",
    "Record generative and editing events without confusing a transformation record with authorship or factual accuracy.",
    "Treat approval and signing as accountable acts with a release decision, not just a cryptographic operation.",
    "Test what platforms and transformations preserve, rewrite, hide, or strip before promising continuity to readers.",
    "Give people, platforms, agents, and libraries different verification views over the same bounded evidence.",
    "Prepare for disputed media with an incident path that preserves the record while investigating the claim.",
    "Sequence implementation by control risk and testable interoperability, not by the number of badges a system can display.",
    "Use counterarguments to show why provenance cannot substitute for editorial verification or a trustworthy signer.",
    "Document standards, methods, version boundaries, and unresolved interoperability questions for the next reviewer.",
    "Close with a workshop that tests one real media path and its exception handling rather than selling a badge.",
  ],
  "hybrid-ai-media-infrastructure": [
    "Use the publication record to anchor a volatile infrastructure argument to a version, cutoff, and accountable review.",
    "Treat the 2035 dispatch as a reminder that compute remains physical even when interfaces become abstract.",
    "Make placement policy outlive a provider preference by defining the constraints that actually govern each workload.",
    "Classify image, video, audio, spatial, simulation, and agent workloads by behavior before selecting an environment.",
    "Make sensitivity, latency, energy, capacity, provenance, portability, and ownership explicit policy boundaries.",
    "Separate hybrid control-plane decisions from media-plane execution so a placement can change without losing context.",
    "Route GPU demand with priority, capacity, fallback, and quality evidence instead of a single queue metric.",
    "Keep model and workflow lifecycle records connected to approved versions, evaluations, and release authority.",
    "Draw security, isolation, data movement, and logging boundaries before comparing throughput or cost.",
    "Design graceful degradation as a product requirement for critical media workflows, not as an outage afterthought.",
    "Use energy, carbon, capacity, and cost scenarios to expose assumptions rather than to promise a forecast.",
    "Benchmark with disclosed settings and comparable acceptance criteria so numbers can be reproduced and challenged.",
    "Compare build, buy, and blend choices by exit path, control, evidence, and operating ownership.",
    "Assign operational owners to failure modes before a platform becomes a production dependency.",
    "Keep methods, source boundaries, and benchmark limitations visible so vendor claims do not become architecture facts.",
    "End with a workload-specific assessment path that can produce a measured architecture decision.",
  ],
  "visual-product-development-field-guide": [
    "Use the cover as a compact evidence contract linking a visual observation to a source and an accountable review.",
    "Treat software as negotiated context: the future signal matters only when perception can become proof.",
    "Protect the chain from observation to source, authorized change, rendered evidence, approval, and rollback.",
    "Read acceleration evidence with its review and stability limits instead of treating faster execution as quality.",
    "Connect repository, canvas, and agent around one evidence object rather than three disconnected handoffs.",
    "Make annotations structured enough to carry intent, scope, risk, and the question a reviewer must answer.",
    "Link a visual region to the source and runtime context that produced it before authorizing a fix.",
    "Give agents the least authority needed and preserve reversible execution when the context is incomplete.",
    "Make changes proof-carrying: implementation, accessibility, regression, approval, and rollback should travel together.",
    "Preserve collaboration and dissent as a decision record, not as ephemeral comments around a screenshot.",
    "Keep private repository and user context within explicit boundaries when visual evidence is shared.",
    "Pilot the loop on a real workflow with an acceptance bar that includes product, engineering, and accessibility outcomes.",
    "Use failure modes to identify where visual direction is insufficient for architecture, security, or responsible automation.",
    "State what the sources establish and what a product team must baseline before making an efficiency claim.",
    "Make the WireMark path a bounded evaluation with evidence return, not unrestricted repository authority.",
  ],
  "autonomous-web-publishing-control-plane": [
    "Use the record page to mark the difference between a generated guide and a certified production release.",
    "Treat machine audiences as a reason to improve structure and evidence, not a reason to publish more pages.",
    "Make autonomous publishing a control plane that joins finding, source, preview, approval, release, and rollback.",
    "Inventory the web surface across people, agents, search, feeds, and media libraries before automating it.",
    "Keep accessibility, performance, SEO, security, and delivery as separate audit domains with shared evidence.",
    "Require every finding to point to a standard, exact source location, bounded change, and testable outcome.",
    "Tier agent remediation by risk and keep consequential changes behind human authority.",
    "Make regression evidence a release input, not a report appended after an automated fix.",
    "Preserve branch, preview, release, and rollback identity so publishing remains recoverable.",
    "Govern a portfolio by ownership, exception policy, and evidence freshness rather than a single automation score.",
    "Baseline measures with definitions and limitations before connecting them to a future publishing scenario.",
    "Sequence adoption from low-risk execution to broader authority only after the control loop works in practice.",
    "Use unsafe-automation cases to show where a tool cannot decide content, legal, accessibility, or governance questions.",
    "Document source policy and field boundaries so audit output is not mistaken for certification.",
    "Close with a Web Magic assessment that keeps the approved site and the publishing authority bounded.",
  ],
  "intelligent-media-asset-estate": [
    "Use the publication record to identify the collection, rights boundary, source cutoff, and review status of the guide.",
    "Treat the media library as an active collaborator only when its memory remains interpretable and correctable.",
    "Make storage distinct from memory by joining files to rights, provenance, relationships, context, and selection rationale.",
    "Map capture, generation, meaning, use, and remembrance before designing the next metadata layer.",
    "Use taxonomy and semantic enrichment to improve retrieval while keeping uncertainty and cultural-description error visible.",
    "Record human curation and review signals instead of silently replacing judgment with an automated score.",
    "Use duplicate and near-duplicate relationships to support decisions, never to infer ownership or permission.",
    "Keep rights, restrictions, consent, and provenance as separate fields with named stewards and correction history.",
    "Design connectors for identifier continuity and portable relationships, not just file export.",
    "Make retrieval and responsible reuse answer both what an asset is and whether it may be used here.",
    "Assign stewardship for metadata, rights, cultural context, correction, and retirement before scaling enrichment.",
    "Remediate an estate from an authorized representative collection with a measurable sequence and human review.",
    "Use migration failures to expose lost relationships, stale identifiers, and unsupported assumptions about export fidelity.",
    "Document evidence and limits so a complete metadata record is not mistaken for factual truth or permission.",
    "End with a Photo Curator path tied to one approved collection, its risks, and its curation objective.",
  ],
  "modern-media-agency-transformation-playbook": [
    "Use the publication record to state whose transformation decision is being supported and which market claims remain bounded.",
    "Read future signals as inputs to ownership design, not as a verdict that agencies or internal teams are obsolete.",
    "Define the adaptive capability system before comparing rosters, vendors, studios, or internalization.",
    "Read creator, video, AI, and consumption evidence with its population, geography, and projection limits.",
    "Join executive intent, creative authority, specialist craft, production, memory, provenance, and learning in one model.",
    "Keep brand strategy connected to the decisions and institutional memory that should not be casually outsourced.",
    "Treat campaign systems as a shared creative and operating problem, not a handoff between strategy and production.",
    "Make GenAI production accountable to workflow, rights, review, infrastructure, and the people who operate it.",
    "Preserve media management, provenance, and reuse as capability infrastructure rather than post-production administration.",
    "Include web, product, and distribution operations when evaluating the modern media estate.",
    "Compare owned, embedded, networked, creator-led, and managed models by continuity, authority, and transition cost.",
    "Align governance and procurement with the decisions, evidence, workforce, and commercial terms the model must sustain.",
    "Turn the transformation diagnostic into a 90-day sequence with a baseline, owner, and reversible learning loop.",
    "Use counterarguments to preserve conditions where traditional models remain the right fit.",
    "Document evidence policy, attribution limits, and source dates before turning market metrics into strategy.",
    "Close with a principal dialogue that begins from the capability ownership gap, not from a generic agency pitch.",
  ],
};

function parseEvidenceSource(slug: BriefSlug, citation: string, index: number): BriefSource | null {
  const url = citation.match(/https:\/\/\S+$/)?.[0];
  if (!url) return null;

  const withoutLabel = citation.replace(/^\[Evidence\]\s*/, "").slice(0, -url.length).trim().replace(/[.]$/, "");
  const dash = withoutLabel.lastIndexOf(" — ");
  const title = dash > 0 ? withoutLabel.slice(0, dash).trim() : withoutLabel;
  const publisherAndDate = dash > 0 ? withoutLabel.slice(dash + 3).trim() : "Editorial source note";
  const comma = publisherAndDate.lastIndexOf(", ");
  const publisher = comma > 0 ? publisherAndDate.slice(0, comma).trim() : publisherAndDate;
  const published = comma > 0 ? publisherAndDate.slice(comma + 2).trim() : "Publication date in citation note";
  const firstSentence = withoutLabel.indexOf(". ");
  const supports = firstSentence > 0 ? withoutLabel.slice(firstSentence + 2).trim() : withoutLabel;

  return {
    id: `${slug}-source-${String(index + 1).padStart(2, "0")}`,
    claimClass: "evidence",
    sourceType: "primary",
    title,
    publisher,
    published,
    citation,
    url,
    supports,
    provenance:
      "Primary-source URL declared in the editorial data. The source supports the bounded observation in this note; it does not validate the brief’s inference, recommendation, or scenario.",
  };
}

function publicationFor(brief: BriefSeed): BriefPublication {
  return {
    briefId: brief.slug,
    version: "2026.08-draft",
    editionDate: "2026-08-20",
    sourceCutoff: "2026-08-12",
    author: "HardMagic editorial desk",
    reviewer: "Editorial review pending",
    confidentiality: "Private technical brief",
    distribution: "Individual recipient; time-limited delivery; no public file path",
    language: "en-US",
    contact: "hello@hardmagic.com",
    fileName: `${brief.slug}.pdf`,
    storageObject: `${brief.slug}.pdf`,
    supersedes: null,
    releaseStatus: "draft",
    accessibility: {
      semanticHtmlAlternative: true,
      taggedPdfRequested: true,
      outlineRequested: true,
      textSelectable: true,
      readingOrder: "linear",
      pdfUa: "not-certified",
    },
  };
}

function chaptersFor(brief: BriefSeed & { readonly slug: BriefSlug }): readonly BriefChapter[] {
  const focuses = briefChapterFocus[brief.slug];
  if (focuses.length !== brief.chapters.length) {
    throw new Error(`${brief.slug}: chapter focus count does not match chapter count`);
  }

  return brief.chapters.map((chapter, index) => {
    const focus = focuses[index];
    if (!focus) throw new Error(`${brief.slug}: missing chapter focus ${index + 1}`);
    return { ...chapter, focus };
  });
}

export const briefs = briefSeeds.map((brief) => ({
  ...brief,
  chapters: chaptersFor(brief),
  topics: briefTopics[brief.slug],
  sources: brief.evidenceNeeds
    .map((citation, index) => parseEvidenceSource(brief.slug, citation, index))
    .filter((source): source is BriefSource => source !== null),
  editorial: briefEditorial[brief.slug],
  publication: publicationFor(brief),
})) as unknown as readonly [TechnicalBrief, ...TechnicalBrief[]];
