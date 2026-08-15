export interface HomeMarketEvidence {
  readonly id: string;
  readonly label: string;
  readonly metric: string;
  readonly context: string;
  readonly publisher: string;
  readonly date: string;
  readonly url: `https://${string}`;
  readonly boundaries: readonly string[];
}

export interface HomeFutureInference {
  readonly id: string;
  readonly label: string;
  readonly claim: string;
  readonly implication: string;
  readonly boundary: string;
}

export interface HomeMarketSignals {
  readonly evidence: readonly HomeMarketEvidence[];
  readonly inference: readonly HomeFutureInference[];
}

export const homeInferenceDisclosure =
  "HardMagic inference / 2035 — not a guarantee" as const;

export const homeMarketSignals = {
  evidence: [
    {
      id: "pwc-entertainment-media",
      label: "Scale / global entertainment & media",
      metric: "US$4.2T by 2030",
      context:
        "PwC forecasts global entertainment and media revenue will reach US$4.2 trillion in 2030 across 12 segments and 53 countries and territories.",
      publisher: "PwC",
      date: "2026-06-22",
      url: "https://www.pwc.com/gx/en/news-room/press-releases/2026/pwc-2026-global-entertainment-media-outlook.html",
      boundaries: [
        "Forecast, not observed revenue.",
        "PwC says the segment forecasts use third-party data sets.",
        "A global aggregate does not predict a specific company, category, or channel.",
      ],
    },
    {
      id: "pwc-global-advertising",
      label: "Scale / global advertising",
      metric: "US$1.4T by 2030",
      context:
        "PwC projects global advertising revenue will hit US$1.4 trillion in 2030, with AI-powered real-time personalization supporting growth.",
      publisher: "PwC",
      date: "2026-06-22",
      url: "https://www.pwc.com/gx/en/news-room/press-releases/2026/pwc-2026-global-entertainment-media-outlook.html",
      boundaries: [
        "Forecast, not observed revenue or a promise of AI-driven growth.",
        "The figure is a global total; it does not establish channel-level economics.",
        "PwC's stated market outlook is not a company-specific business case.",
      ],
    },
    {
      id: "iab-video-creative-genai",
      label: "Ad adoption / video creative",
      metric: "86% use or plan to use GenAI",
      context:
        "IAB reports that 86% of surveyed U.S. buyers are using or planning to use GenAI to build video advertising creative.",
      publisher: "IAB",
      date: "2025",
      url: "https://www.iab.com/insights/video-ad-spend-report-2025/",
      boundaries: [
        "Buyer use or intent is not measured creative quality, effectiveness, or return on investment.",
        "The result is U.S. survey evidence from IAB's digital video advertising research, not a census of every buyer.",
        "Read the official report for sample, fieldwork, and market definitions before applying it locally.",
      ],
    },
    {
      id: "adobe-content-volume-speed",
      label: "Production / content supply",
      metric: "76% report better volume and speed",
      context:
        "Adobe's 2026 AI and Digital Trends research says 76% of respondents report that GenAI moderately or significantly improved content ideation and production volume and speed.",
      publisher: "Adobe",
      date: "2026",
      url: "https://business.adobe.com/resources/reports/content-management-digital-trends.html",
      boundaries: [
        "Self-reported improvement is not causal lift or audited output.",
        "The global survey covers 3,000 executives and practitioners; it is not a guarantee for a specific organization.",
        "Volume and speed do not by themselves establish quality, distinctiveness, or trust.",
      ],
    },
    {
      id: "iab-ai-trust-gap",
      label: "Trust / perception gap",
      metric: "82% executives vs 45% consumers",
      context:
        "IAB finds a 37-point gap between ad executives who think Gen Z and Millennial consumers feel positive about AI-generated ads and consumers who say they do.",
      publisher: "IAB",
      date: "2026-01-15",
      url: "https://www.iab.com/insights/the-ai-gap-widens/",
      boundaries: [
        "U.S. survey evidence from 505 Gen Z and Millennial consumers and 104 ad executives; it does not represent every audience.",
        "The question concerns sentiment about AI-generated ads, not every use of AI.",
        "A perception snapshot is not a universal trust measure or a prediction of behavior.",
      ],
    },
  ],
  inference: [
    {
      id: "adaptive-campaigns",
      label: "Adaptive campaigns",
      claim:
        "Campaigns will behave less like a fixed flight and more like a governed system that adapts creative, audience, channel, and timing around live signals.",
      implication:
        "Design reusable world rules, review gates, and evidence loops before scaling variants.",
      boundary:
        "Inference from the evidence above; not a forecast or guarantee. Adaptation remains constrained by consent, brand, rights, platform policy, and measurement quality.",
    },
    {
      id: "human-led-agentic-studios",
      label: "Human-led agentic studios",
      claim:
        "Human-led agentic studios will pair named creative authority with agents that research, route, generate, test, and prepare variants.",
      implication:
        "Give people explicit decision rights and let agents carry the repeatable work, with reviewable handoffs rather than invisible autonomy.",
      boundary:
        "Inference from the evidence above; not a forecast or guarantee. Agent capability, labor practice, policy, and organizational appetite can change the sequence.",
    },
    {
      id: "provenance-rights-infrastructure",
      label: "Provenance / rights infrastructure",
      claim:
        "Provenance and rights will become production infrastructure: every work item will need an inspectable chain of authority, consent, transformation, and release.",
      implication:
        "Treat source records, permissions, lineage, and release conditions as first-class production data—not a late legal handoff.",
      boundary:
        "Inference from the evidence above; not a forecast or guarantee. Law, standards, contracts, and interoperability are moving constraints.",
    },
    {
      id: "direction-and-trust",
      label: "Direction / trust over raw volume",
      claim:
        "When volume is cheap, direction and earned trust will do more to differentiate a brand than output count alone.",
      implication:
        "Invest in a point of view, a visible standard, and audience feedback that can stop a fast but wrong production loop.",
      boundary:
        "Inference from the evidence above; not a forecast or guarantee. Distinctiveness and trust are context-dependent and cannot be reduced to one metric.",
    },
  ],
} as const satisfies HomeMarketSignals;
