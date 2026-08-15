export type HorizonAudience =
  | "Creative Directors"
  | "CMOs"
  | "Artists"
  | "Media Operators"
  | "Technical Leaders";

export type HorizonConfidence = "high" | "medium" | "speculative";

export interface HorizonCitation {
  readonly id: string;
  readonly title: string;
  readonly publisher: string;
  readonly published: string;
  readonly url: `https://${string}`;
  readonly supports: string;
}

export interface HorizonScenarioEssay {
  readonly slug: string;
  readonly number: number;
  readonly title: string;
  readonly dek: string;
  readonly audiences: readonly [HorizonAudience, ...HorizonAudience[]];
  readonly horizon: 2035;
  readonly confidence: HorizonConfidence;
  readonly thesis: string;
  readonly signals2026: readonly [string, string, ...string[]];
  readonly scenario2035: readonly [string, string, ...string[]];
  readonly strategicImplications: readonly [string, string, ...string[]];
  readonly movesToMakeNow: readonly [string, string, string, ...string[]];
  readonly uncertainties: readonly [string, string, ...string[]];
  readonly citations: readonly [
    HorizonCitation,
    HorizonCitation,
    ...HorizonCitation[],
  ];
}

const citation = (
  id: string,
  title: string,
  publisher: string,
  published: string,
  url: `https://${string}`,
  supports: string,
): HorizonCitation => ({ id, title, publisher, published, url, supports });

const aiIndex2025 = citation(
  "stanford-ai-index-2025",
  "Artificial Intelligence Index Report 2025",
  "Stanford Institute for Human-Centered Artificial Intelligence",
  "2025-04",
  "https://hai.stanford.edu/assets/files/hai_ai_index_report_2025.pdf",
  "Documents rapid reductions in inference cost, improving small-model capability, and the narrowing performance gap between open-weight and closed models.",
);

const copyrightability = citation(
  "usco-ai-copyrightability-2025",
  "Copyright and Artificial Intelligence, Part 2: Copyrightability",
  "United States Copyright Office",
  "2025-01",
  "https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf",
  "Concludes that generative-AI material can participate in copyrightable work when a human determines sufficient expressive elements, while prompts alone generally do not supply that authorship.",
);

const digitalReplicas = citation(
  "usco-ai-digital-replicas-2024",
  "Copyright and Artificial Intelligence, Part 1: Digital Replicas",
  "United States Copyright Office",
  "2024-07",
  "https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-1-Digital-Replicas-Report.pdf",
  "Finds gaps in protections against unauthorized digital replicas and recommends a federal right covering all individuals.",
);

const c2pa22 = citation(
  "c2pa-specification-2-2",
  "C2PA Technical Specification 2.2",
  "Coalition for Content Provenance and Authenticity",
  "Version 2.2",
  "https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html",
  "Defines signed, tamper-evident Content Credentials that bind provenance assertions to media while preserving the distinction between provenance and truth.",
);

const euAiAct = citation(
  "eu-ai-act-2024",
  "Regulation (EU) 2024/1689: Artificial Intelligence Act",
  "European Union",
  "2024-07",
  "https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=en",
  "Establishes transparency duties for certain AI-generated or manipulated content, including deep fakes, with provisions for artistic works and editorial responsibility.",
);

const nistGenAi = citation(
  "nist-ai-600-1",
  "Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile",
  "National Institute of Standards and Technology",
  "2024-07",
  "https://doi.org/10.6028/NIST.AI.600-1",
  "Provides lifecycle actions for mapping, measuring, managing, and governing generative-AI risks rather than treating safety as a final review step.",
);

const mlperf50 = citation(
  "mlperf-inference-5-0",
  "MLPerf Inference v5.0 Benchmark Results",
  "MLCommons",
  "2025-04",
  "https://mlcommons.org/2025/04/mlperf-inference-v5-0-results/",
  "Reports reproducible results from 23 submitting organizations, major year-over-year generative-AI performance gains, and new interactive and edge benchmarks.",
);

const energyAndAi = citation(
  "iea-energy-and-ai-2025",
  "Energy and AI",
  "International Energy Agency",
  "2025-04",
  "https://www.iea.org/reports/energy-and-ai/",
  "Models global data-centre electricity demand, supply, emissions, and uncertainty through 2035, including AI as a principal growth driver.",
);

const ofcom2025 = citation(
  "ofcom-media-nations-2025",
  "Media Nations 2025: UK Report",
  "Ofcom",
  "2025-07",
  "https://www.ofcom.org.uk/siteassets/resources/documents/research-and-data/multi-sector/media-nations/2025/media-nations-2025-uk-report.pdf",
  "Measures cross-platform viewing and pronounced age differences across live television, broadcaster video on demand, streaming, and video-sharing platforms.",
);

const nielsenStreaming = citation(
  "nielsen-gauge-may-2025",
  "Streaming Reaches Historic TV Milestone",
  "Nielsen",
  "2025-06",
  "https://www.nielsen.com/news-center/2025/streaming-reaches-historic-tv-milestone-eclipses-combined-broadcast-and-cable-viewing-for-first-time/",
  "Reports that streaming represented 44.8 percent of measured U.S. television viewing in May 2025, exceeding broadcast and cable combined for the first time in The Gauge.",
);

const iabCreator2025 = citation(
  "iab-creator-economy-2025",
  "2025 Creator Economy Ad Spend & Strategy Report",
  "Interactive Advertising Bureau and Advertiser Perceptions",
  "2025-11",
  "https://www.iab.com/wp-content/uploads/2025/11/IAB_Creator_Ad_Spend_and_Strategy_Report_2025.pdf",
  "Combines a survey of more than 450 U.S. ad-spend decision-makers with executive interviews, projecting $37 billion in 2025 creator ad spend and identifying measurement and partner selection as persistent problems.",
);

const iabRevenue2025 = citation(
  "iab-internet-ad-revenue-2025",
  "IAB/PwC Internet Advertising Revenue Report: Full Year 2025",
  "Interactive Advertising Bureau and PwC",
  "2026-04",
  "https://www.iab.com/insights/internet-advertising-revenue-report-full-year-2025/",
  "Measures nearly $300 billion in 2025 U.S. digital advertising revenue and continued movement toward video, social, commerce media, creators, and performance channels.",
);

const creativeEconomy2024 = citation(
  "unctad-creative-economy-2024",
  "Creative Economy Outlook 2024",
  "UN Trade and Development",
  "2024-07",
  "https://unctad.org/publication/creative-economy-outlook-2024",
  "Reports growth in creative-services trade while documenting platform concentration, digital opportunity, uneven participation, copyright concerns, and quality-control challenges.",
);

const cultAi2025 = citation(
  "unesco-culture-ai-2025",
  "Report of the Independent Expert Group on Artificial Intelligence and Culture",
  "UNESCO",
  "2025-09",
  "https://www.unesco.org/sites/default/files/medias/fichiers/2025/09/CULTAI_Report%20of%20the%20Independent%20Expert%20Group%20on%20Artificial%20Intelligence%20and%20Culture%20%28final%20online%20version%29%201.pdf",
  "Frames cultural AI around transparency, participatory design, accountability, cultural sovereignty, compensation, pluralism, and equitable access.",
);

const surveillancePricing = citation(
  "ftc-surveillance-pricing-2025",
  "Surveillance Pricing Market Study: Initial Staff Perspective",
  "United States Federal Trade Commission",
  "2025-01",
  "https://www.ftc.gov/system/files/ftc_gov/pdf/p246202_surveillancepricing6bstudy_researchsummaries_redacted.pdf",
  "Documents how intermediaries can use location, browsing, shopping, inferred, and behavioral data to influence the prices or promotions shown to people.",
);

const webXr = citation(
  "w3c-webxr-2026",
  "WebXR Device API",
  "World Wide Web Consortium",
  "2026-03",
  "https://www.w3.org/TR/webxr/",
  "Defines a web interface for virtual- and augmented-reality devices while identifying consent, fingerprinting, tracking, comfort, and interoperability concerns.",
);

const wcag22 = citation(
  "w3c-wcag-2-2",
  "Web Content Accessibility Guidelines (WCAG) 2.2",
  "World Wide Web Consortium",
  "2024-12",
  "https://www.w3.org/TR/WCAG22/",
  "Defines testable, technology-independent accessibility criteria for perceivable, operable, understandable, and robust digital content.",
);

const disabilityInclusion = citation(
  "who-disability-inclusion",
  "Implementing the UN Disability Inclusion Strategy",
  "World Health Organization",
  "Current in 2026",
  "https://www.who.int/health-topics/disability/implementing-the-un-disability-inclusion-strategy",
  "Estimates that 1.3 billion people, about one in six worldwide, experience significant disability.",
);

const itu2025 = citation(
  "itu-facts-and-figures-2025",
  "Facts and Figures 2025",
  "International Telecommunication Union",
  "2025-11",
  "https://www.itu.int/itu-d/reports/statistics/facts-figures-2025/",
  "Estimates global connectivity while documenting persistent divides in affordability, quality, devices, location, gender, and digital skills.",
);

const locDigitalStrategy = citation(
  "loc-digital-strategy",
  "Digital Strategy at the Library of Congress",
  "Library of Congress",
  "Current in 2026",
  "https://www.loc.gov/digital-strategy/",
  "Describes digital stewardship as a continuing institutional capability and identifies responsible AI experimentation as one way to improve access and analysis.",
);

const locPreservation = citation(
  "loc-bit-level-preservation",
  "Bit Level Preservation and Long Term Usability",
  "Library of Congress",
  "Current in 2026",
  "https://www.loc.gov/programs/digital-collections-management/digital-formats/bit-level-preservation-and-long-term-usability/",
  "Explains that authentic bit-level preservation is foundational but does not alone guarantee future usability, renderability, or rights-compatible access.",
);

export const horizon2035Scenarios = [
  {
    slug: "direction-after-infinite-production",
    number: 1,
    title: "Direction After Infinite Production",
    dek: "By 2035, making another image will be trivial. Deciding what deserves to exist will be the scarce act.",
    audiences: ["Creative Directors", "Artists", "CMOs"],
    horizon: 2035,
    confidence: "high",
    thesis:
      "Creative direction is moving from supervision of execution to governance of possibility. As capable generation becomes inexpensive and ubiquitous, the valuable unit is no longer the isolated artifact; it is a legible sequence of choices that establishes intent, rejects plausible alternatives, preserves human authorship, and builds a coherent body of culture over time.",
    signals2026: [
      "The 2025 AI Index documents a greater than 280-fold fall in the inference cost of a model at a fixed GPT-3.5-level benchmark between late 2022 and late 2024, alongside increasingly capable small models. That is not proof that every creative task is solved, but it is strong evidence that access to useful generation is broadening faster than traditional production structures can adapt.",
      "The U.S. Copyright Office distinguishes assistance from authorship: AI use does not disqualify a work, but prompts alone generally do not establish protectable expression. Selection, arrangement, transformation, and other human expressive contributions therefore become operationally important, not merely philosophical.",
      "The immediate bottleneck in ambitious teams is already shifting from first output to comparison, continuity, rights review, and the ability to explain why one treatment advances the idea while ninety-nine competent alternatives do not.",
    ],
    scenario2035: [
      "A 2035 creative department begins with a direction model: a maintained corpus of references, exclusions, cultural context, audience promises, risk boundaries, and recorded decisions. Production systems can generate complete campaign worlds against that model, but nothing graduates merely because it is technically polished.",
      "The Creative Director conducts possibility rather than requesting deliverables. They allocate novelty, control narrative distance, stage productive disagreement among human and machine collaborators, and leave a record of consequential decisions. Artists are commissioned for point of view, embodied knowledge, and the ability to break the system intelligently—not for being faster endpoints in a content queue.",
      "The portfolio review resembles jurisprudence. Teams inspect what was proposed, what was refused, whose expression remains visible, how the work changes across contexts, and whether repetition is creating memory or merely volume. The most respected brands publish less than they could and make the restraint perceptible.",
    ],
    strategicImplications: [
      "A studio that sells production capacity will face relentless substitution. A studio that owns a recognizable theory of selection, a trusted critique practice, and a defensible authorship record can become more valuable as production abundance rises.",
      "CMOs should measure creative systems by accumulated distinction, learning velocity, and memory—not asset count. Procurement must stop equating efficiency with more variants and start buying accountable direction.",
      "Career ladders will need to reward editorial judgment, cultural research, systems literacy, and the ability to articulate rejection. Junior talent still needs craft practice; delegating every formative execution step to a model would hollow out the future directing class.",
    ],
    movesToMakeNow: [
      "Build a decision record that records references, rejected routes, critique, approvals, rights, and what the team learned after release.",
      "Separate generative throughput metrics from creative-quality metrics. Place a human decision and named owner at every irreversible publication gate.",
      "Commission artists before a visual language is settled, and contract for authorship, exploration, and knowledge transfer rather than only finished files.",
      "Train directors to work across models without allowing model defaults to become the house style. Run critiques where outputs are shown without tool labels, then inspect whether the rationale survives attribution.",
    ],
    uncertainties: [
      "Generation costs may plateau, regulation may make some workflows expensive, and audiences may assign premium value to explicitly non-synthetic work. None of those outcomes restores scarcity to generic execution; each increases the value of declared intent and trustworthy authorship.",
      "Copyright doctrine and contract practice will continue to vary by jurisdiction. Teams should treat current U.S. guidance as a signal for documentation, not as universal legal advice or a settled global boundary.",
    ],
    citations: [aiIndex2025, copyrightability, nistGenAi],
  },
  {
    slug: "brand-memory-becomes-an-operating-system",
    number: 2,
    title: "Brand Memory Becomes an Operating System",
    dek: "The 2035 brand is not a book of rules. It is a living memory that can explain, retrieve, refuse, and evolve.",
    audiences: ["CMOs", "Creative Directors", "Technical Leaders"],
    horizon: 2035,
    confidence: "high",
    thesis:
      "Generative systems make style reproducible while making meaning easier to lose. The durable enterprise response is brand memory: a governed, queryable record of decisions, source material, audience commitments, exclusions, rights, outcomes, and unresolved tensions that both people and machines can use without collapsing the brand into a visual average.",
    signals2026: [
      "Creator advertising is becoming a core media channel while buyers report continuing difficulty selecting partners and proving outcomes. The signal is not simply that creators are growing; it is that brand meaning now travels through many independent voices and operating contexts.",
      "Digital advertising continues to concentrate around measurable performance channels. Meanwhile, the FTC has documented the breadth of behavioral and inferred data available to systems that tailor commercial treatment. Optimization can therefore become extraordinarily specific while remaining strategically empty or socially corrosive.",
      "Current brand repositories usually preserve approved outputs but omit the arguments, exceptions, source rights, audience reactions, and cultural context that made those outputs appropriate. Models trained or retrieved against this residue learn surfaces without reasons.",
    ],
    scenario2035: [
      "Every serious brand maintains a memory plane alongside its asset estate. A campaign agent can retrieve the origin of a phrase, understand where a symbol is welcome or harmful, see which promises have already been made to a community, and identify whether a proposed variation extends a living pattern or merely resembles earlier work.",
      "Brand memory is federated. Creators retain attribution and negotiated permissions; regions can preserve local interpretation; product teams contribute observed customer language; legal teams attach constraints without rewriting the cultural record. The system shows disagreement rather than forcing a false single truth.",
      "The CMO reads memory health as an executive instrument. Warning signs include narrowing reference diversity, unexplained tonal drift, repeated extraction from the same communities, declining creator reciprocity, and campaigns that optimize response while weakening long-term recognition.",
    ],
    strategicImplications: [
      "Static guidelines become the visible constitution, not the whole government. Competitive advantage resides in the maintained evidence and decision practice behind them.",
      "Marketing technology architecture must support provenance, permissions, temporal context, and revocation. A vector database alone is not brand memory; similarity without authority can retrieve precisely the wrong precedent.",
      "Agencies can become custodians of institutional imagination, but only if clients can export the memory, inspect its sources, and continue operating after the engagement ends.",
    ],
    movesToMakeNow: [
      "Capture the rationale, context, rights status, and named decision owner whenever a major artifact enters the brand library.",
      "Create a controlled vocabulary for promises, taboos, recurring tensions, audience communities, cultural sources, and acceptable transformation—not only colors and tone adjectives.",
      "Test retrieval with adversarial questions: ask the system to justify a harmful imitation, a stale trope, and a locally inappropriate campaign. Record where it fails to refuse.",
      "Give creators a reviewable record of what enters memory, how it may be reused, and how permission can expire or change.",
    ],
    uncertainties: [
      "Brands may over-centralize memory and suppress the local contradiction from which culture grows. Governance should preserve plurality and dissent, not produce a perfectly consistent synthetic voice.",
      "No retrieval design eliminates human interpretation. Memory quality will depend on sustained editorial labor, rights maintenance, and organizational willingness to retain uncomfortable lessons.",
    ],
    citations: [iabCreator2025, iabRevenue2025, surveillancePricing, c2pa22],
  },
  {
    slug: "provenance-is-the-new-publishing-layer",
    number: 3,
    title: "Provenance Is the New Publishing Layer",
    dek: "By 2035, a media file without inspectable lineage will feel as operationally incomplete as a page without a URL.",
    audiences: ["Media Operators", "Technical Leaders", "Creative Directors"],
    horizon: 2035,
    confidence: "high",
    thesis:
      "Provenance will mature from a defensive label into a publishing substrate. The valuable system will not claim to certify truth; it will preserve verifiable statements about origin, edits, ingredients, authority, and delivery so that people and machines can make better trust decisions across an asset’s life.",
    signals2026: [
      "C2PA 2.2 specifies signed manifests, content bindings, ingredients, actions, and trust mechanisms across common media formats. Its own guidance carefully limits the claim: valid provenance indicates that assertions are bound and untampered, not that the depicted event is true.",
      "The EU AI Act establishes disclosure duties for defined classes of generated or manipulated media while recognizing artistic and editorial contexts. The U.S. Copyright Office separately emphasizes identifiable human expression and warns about unauthorized digital replicas. Together these are signals that origin and responsibility are becoming part of media operations.",
      "Many current workflows still strip metadata at export, sever derivatives from sources, and ask a final publisher to reconstruct lineage after dozens of transformations. That architecture cannot scale to abundant synthetic and hybrid media.",
    ],
    scenario2035: [
      "Capture devices, creative tools, models, review systems, and distribution platforms contribute to a chain of signed assertions. A viewer can inspect a useful summary; a newsroom can validate a deeper chain; a rights holder can locate transformations; a governed collection can preserve the package for later interpretation.",
      "Provenance becomes compositional. Directors choose which process details improve the audience’s understanding, artists can disclose synthetic intervention without flattening the experience into a warning label, and documentary teams can protect sensitive sources while still establishing institutional accountability.",
      "The absence of credentials remains possible and sometimes necessary. Rather than treating unsigned work as automatically false, systems communicate what is known, unknown, redacted, broken, or unverifiable. Trust design becomes an editorial discipline of calibrated claims.",
    ],
    strategicImplications: [
      "Media supply chains need identity, signing, preservation, and verification capabilities at every handoff. Adding a badge at publication will not repair lost lineage.",
      "Organizations that preserve provenance can license, localize, retract, audit, and reuse work with lower ambiguity. The return is operational as much as reputational.",
      "Creative teams must help design disclosure. If provenance interfaces are built only by compliance teams, they may be technically correct and culturally unreadable.",
    ],
    movesToMakeNow: [
      "Map where metadata, identity, and source relationships disappear from capture through distribution; prioritize the first irreversible break.",
      "Pilot C2PA signing and validation on one bounded workflow, including derivatives, redactions, offline transfer, and a deliberately broken credential.",
      "Write a provenance language guide that distinguishes verified origin, declared process, editorial review, identity, and truth.",
      "Store original assets and manifests independently of any single vendor, and rehearse key rotation, revocation, and long-term validation.",
    ],
    uncertainties: [
      "Platform support may remain uneven, credentials can be removed, signers can misrepresent events, and trust lists can reproduce institutional power. Provenance is evidence infrastructure, not an oracle.",
      "Disclosure rules will vary across jurisdictions and genres. Privacy-preserving redaction and protection for vulnerable creators must develop alongside greater transparency.",
    ],
    citations: [c2pa22, euAiAct, copyrightability, digitalReplicas],
  },
  {
    slug: "the-story-is-assembled-at-the-edge",
    number: 4,
    title: "The Story Is Assembled at the Edge",
    dek: "A 2035 release is not one master delivered everywhere. It is a governed story system rendered for a moment, device, place, and audience.",
    audiences: [
      "Creative Directors",
      "Media Operators",
      "CMOs",
      "Technical Leaders",
    ],
    horizon: 2035,
    confidence: "medium",
    thesis:
      "Distribution fragmentation will evolve into contextual assembly. Media organizations will author durable narrative structures, performance boundaries, and visual worlds whose final pacing, format, language, density, and interaction are rendered near the audience—without surrendering editorial identity to opaque personalization.",
    signals2026: [
      "Nielsen measured streaming at 44.8 percent of U.S. television viewing in May 2025, narrowly exceeding broadcast and cable combined for the first time in its Gauge. Ofcom’s 2025 evidence shows that the same transition is not uniform: platform choices and broadcaster consumption differ sharply by age.",
      "The ITU estimates that roughly three quarters of the world was online in 2025 while documenting material divides in affordability, quality, location, device access, and skills. A single bandwidth-heavy canonical experience is therefore neither global nor neutral.",
      "Current campaigns already fracture into ratios, durations, languages, captions, creator versions, retail surfaces, feeds, and connected television. Most teams still treat each derivative as a smaller deliverable rather than as a governed rendering of shared narrative intent.",
    ],
    scenario2035: [
      "The master is a story graph: scenes, claims, performances, evidence, rights, emotional arcs, accessibility alternatives, and forbidden adjacencies. A runtime assembles an edition under declared constraints such as available time, screen, bandwidth, locale, accessibility preference, and previously seen chapters.",
      "A five-minute communal film, a silent storefront sequence, an audio-first commute edition, and a spatial installation can belong to one work without becoming interchangeable. The director authors invariant moments and permitted variation; the system logs the edition actually encountered.",
      "Public-interest and premium publishers make adaptation legible. People can choose continuity over personalization, inspect why an edition changed, reset remembered context, and share a stable edition with another person. The social object survives even when delivery is adaptive.",
    ],
    strategicImplications: [
      "The unit of production becomes a narrative system with version policy, not a pile of platform exports. Editorial architecture and distribution engineering converge.",
      "Measurement must distinguish useful adaptation from behavioral manipulation. Completion and conversion alone cannot reveal whether the audience received the intended argument or merely the easiest stimulus.",
      "Rights contracts need to describe transformation domains—translation, synthesis, duration, performance, spatialization, and recombination—in machine-readable and human-readable form.",
    ],
    movesToMakeNow: [
      "For one campaign, define its invariant idea, optional modules, forbidden combinations, accessibility alternatives, and the evidence each module carries.",
      "Adopt stable content identifiers across edits and channels so exposure, rights, and learning can be reconciled without pretending every impression is equivalent.",
      "Design low-bandwidth and nonvisual editions at concept stage. Test whether they preserve the same promise rather than merely summarizing the hero film.",
      "Give audiences an adaptation control and compare trust, comprehension, and recall—not only response rate.",
    ],
    uncertainties: [
      "Audiences may reject adaptive storytelling when it weakens shared culture or feels invasive. Regulation may restrict the data available for assembly, and platform runtimes may resist publisher-controlled logic.",
      "The cost of maintaining narrative graphs may exceed their value for short-lived work. The approach is strongest where stories persist, travel across contexts, or carry meaningful rights and accessibility obligations.",
    ],
    citations: [nielsenStreaming, ofcom2025, itu2025, wcag22],
  },
  {
    slug: "the-sovereign-microstudio",
    number: 5,
    title: "The Sovereign Microstudio",
    dek: "The defining media company of 2035 may be six people, a rights library, an audience covenant, and a network of temporary machines.",
    audiences: ["Artists", "Creative Directors", "CMOs", "Media Operators"],
    horizon: 2035,
    confidence: "medium",
    thesis:
      "Falling production barriers will not automatically democratize creative power. The consequential organizational form will be the sovereign microstudio: a small, senior, culturally specific team that owns its audience relationship, provenance, reusable production intelligence, and negotiating leverage while assembling specialist capability around each work.",
    signals2026: [
      "IAB research places U.S. creator advertising at a projected $37 billion in 2025 and reports that nearly half of surveyed buyers consider creators a must-buy channel. Yet buyers still identify partner selection, measurement, and fragmented operations as central problems.",
      "UN Trade and Development reports expanding creative-services trade and lower distribution barriers alongside uneven national participation and platform concentration. UNESCO’s AI and culture work warns that scale can marginalize independent artists and cultural diversity without transparency, accountability, access, and alternative economic models.",
      "Generative tools can give a small group broad production reach, but distribution dependence, rights ambiguity, weak collection practices, and platform-mediated customer access can leave that group less sovereign despite producing more.",
    ],
    scenario2035: [
      "A sovereign microstudio owns a compact canon of worlds, characters, methods, performances, and audience commitments. It uses rented frontier compute when required, local models for sensitive continuity, and federated specialists for live action, craft, scholarship, and regional interpretation.",
      "Its financial model combines commissions, memberships, limited licenses, physical encounters, learning, and selective brand alliances. It does not attempt to fill every feed. Scarcity is applied to access, collaboration, context, and live presence rather than artificially limiting reproducible files.",
      "The studio’s operating record makes collaboration portable: contributors can see how work will be transformed, receive attribution, negotiate downstream reuse, and carry validated contributions into future engagements. Reputation attaches to the network of makers, not only the platform that distributed the output.",
    ],
    strategicImplications: [
      "Large agencies will compete with microstudios by offering capital, reach, complex risk management, and orchestration—not by claiming exclusive access to production machinery.",
      "Brands should treat creator relationships as durable capability and shared world-building, not rented authenticity. Extractive one-off briefs will lose the best partners.",
      "Artists need business architecture as urgently as tool fluency: identity, rights, provenance, audience data custody, pricing, continuity, and succession.",
    ],
    movesToMakeNow: [
      "Inventory what the studio actually owns: direct audience permissions, source files, character and format rights, process knowledge, credentials, and reusable infrastructure.",
      "Write a contributor covenant covering attribution, training use, synthetic transformation, revenue participation, revocation, and portfolio evidence.",
      "Create one productized recurring format that can compound audience memory without requiring platform-scale output volume.",
      "Build an export path from every critical platform and test whether the studio can publish, communicate, transact, and verify identity after a platform failure.",
    ],
    uncertainties: [
      "Platform concentration may deepen faster than independent infrastructure matures. Conversely, audience fatigue with synthetic abundance may increase demand for small, accountable cultural institutions.",
      "Microstudios can reproduce exclusion and precarity if sovereignty stops at the founder. Shared ownership, clear credit, and contributor bargaining power are design requirements, not decorative values.",
    ],
    citations: [iabCreator2025, creativeEconomy2024, cultAi2025, c2pa22],
  },
  {
    slug: "agentic-media-needs-a-control-room",
    number: 6,
    title: "Agentic Media Needs a Control Room",
    dek: "In 2035, autonomous production will be ordinary. Recoverable, inspectable autonomous production will remain exceptional.",
    audiences: ["Media Operators", "Technical Leaders", "Creative Directors"],
    horizon: 2035,
    confidence: "high",
    thesis:
      "Media agents will move from assisting discrete tasks to coordinating briefs, assets, models, rights, vendors, localization, publishing, and measurement. The winning architecture will not maximize autonomy; it will make authority, evidence, cost, provenance, and recovery visible enough for humans to direct a continuously operating creative system.",
    signals2026: [
      "NIST’s Generative AI Profile treats risk as a lifecycle practice involving governance, context mapping, measurement, and management. That is a more useful foundation for media automation than a one-time safety review after content has already propagated.",
      "MLPerf’s 2025 inference suite added larger generative models, low-latency interactive tests, and edge workloads, while reporting major performance gains and broad vendor participation. The infrastructure for responsive, distributed machine work is becoming measurable and competitive.",
      "Current agent pilots reveal a structural mismatch: tools are granted broad account access but receive thin work contracts. They can act before they can explain the decision boundary, identify authoritative evidence, or restore the system after a mistaken publication.",
    ],
    scenario2035: [
      "A media control room displays active objectives, delegated authority, asset lineage, budget burn, model and vendor health, audience constraints, unresolved exceptions, and all publications awaiting or bypassing human review. Operators supervise portfolios of work, not chat windows.",
      "Agents negotiate routine production among themselves, but every action carries an identity, scoped capability, evidence packet, and rollback policy. High-consequence acts—identity simulation, factual claims, rights expansion, crisis response, spend escalation, and final publication—require explicit human authority.",
      "Creative Directors can enter at the level of meaning. They inspect where systems are converging on generic solutions, change the critique model, introduce a dissonant reference, or freeze a promising branch. Technical leaders maintain the observability and containment that make this freedom responsible.",
    ],
    strategicImplications: [
      "The agent interface is an organizational design problem. Roles, decision rights, service levels, and escalation paths must be represented in software or autonomy will amplify ambiguity.",
      "Media operations talent becomes more strategic. Operators need editorial judgment, incident command, rights literacy, model evaluation, and enough systems knowledge to distinguish creative failure from infrastructure failure.",
      "Vendor portability matters because model quality, pricing, policy, and availability will change. Store intent, state, evidence, and provenance outside any single agent runtime.",
    ],
    movesToMakeNow: [
      "Define a machine-readable work contract for one workflow: objective, authoritative inputs, prohibited actions, budget, review gates, evidence, timeout, and rollback.",
      "Give agents the least privilege needed for the current stage and use separate identities for research, production, approval, and publication.",
      "Instrument rejected outputs, human overrides, provenance breaks, rights exceptions, and recovery time—not only successful completions.",
      "Run a controlled incident exercise in which an agent publishes the wrong version, loses a vendor, encounters conflicting rights, and exhausts its budget.",
    ],
    uncertainties: [
      "Reliable long-horizon autonomy may progress unevenly, and the most valuable systems may remain tightly bounded. The control-room model still applies because even modest agents can create consequences at machine speed.",
      "Observability can become workplace surveillance. Governance must protect contributor dignity and evaluate system decisions without reducing human creative practice to keystroke telemetry.",
    ],
    citations: [nistGenAi, mlperf50, c2pa22, copyrightability],
  },
  {
    slug: "identity-rights-become-production-infrastructure",
    number: 7,
    title: "Identity Rights Become Production Infrastructure",
    dek: "The synthetic performer of 2035 is not a file. It is a revocable relationship among a person, a role, a model, a territory, and a moment.",
    audiences: [
      "Artists",
      "Media Operators",
      "Creative Directors",
      "Technical Leaders",
    ],
    horizon: 2035,
    confidence: "high",
    thesis:
      "Digital replicas will force identity permissions out of contract records and into production systems. Responsible studios will treat voice, face, movement, style claims, and biographical identity as scoped, time-bound capabilities whose use can be inspected, compensated, renewed, challenged, and revoked.",
    signals2026: [
      "The U.S. Copyright Office’s digital-replica report identifies gaps in the existing patchwork of protections and recommends a federal right for all individuals against knowing distribution of unauthorized replicas. The issue extends beyond famous performers.",
      "The EU AI Act requires disclosure for defined deep-fake uses while providing context-sensitive treatment for evidently artistic, fictional, satirical, and analogous works. C2PA supplies technical building blocks for recording assertions and transformations, but it does not decide whether consent was valid or a use was fair.",
      "Production contracts commonly describe permitted uses in prose that cannot travel with a model, derivative, or distribution request. This creates a widening gap between legal intent and executable media operations.",
    ],
    scenario2035: [
      "A performer grants a role credential rather than surrendering an unrestricted likeness asset. It specifies character, emotional range, prohibited contexts, languages, territories, duration, review thresholds, compensation events, training boundaries, and posthumous policy.",
      "When a director requests a synthetic pickup, the production system checks the credential, records the model and transformation, routes required review, attaches provenance, and calculates the contracted participation. A revoked or expired permission cannot silently continue through a cached model endpoint.",
      "Identity stewardship becomes a creative service. Performers maintain authorized expressive models that preserve nuance across languages and access needs while retaining the right to refuse contexts that would damage personal or cultural integrity.",
    ],
    strategicImplications: [
      "Rights management must move closer to render time. A signed PDF in a document system cannot govern thousands of automated transformations without executable policy and human escalation.",
      "Casting expands rather than disappears when synthetic extension is treated as collaboration. The performer’s authored range, consent, and ongoing participation become part of the work’s value.",
      "Studios need an identity incident practice for unauthorized use, credential compromise, contested similarity, model leakage, and removal across derivative chains.",
    ],
    movesToMakeNow: [
      "Stop using perpetual, all-media synthetic-reuse language as a default. Separate capture, training, generation, transformation, distribution, and preservation permissions.",
      "Create a rights object that production tools can query while preserving the controlling human-readable agreement and a named escalation owner.",
      "Attach identity and transformation records to test assets, then verify that restrictions survive editing, transcoding, localization, and third-party delivery.",
      "Establish compensation and review rules before capturing material capable of generating a replica, including for employees and non-celebrity participants.",
    ],
    uncertainties: [
      "Law will differ by territory, and technical policy will not resolve contested resemblance, parody, public interest, or collective cultural rights. Human adjudication remains essential.",
      "Strict identity controls could privilege people with sophisticated representation while leaving others exposed. Industry infrastructure should support low-cost registration, challenge, and remedy.",
    ],
    citations: [digitalReplicas, euAiAct, c2pa22, copyrightability],
  },
  {
    slug: "compute-becomes-a-creative-material",
    number: 8,
    title: "Compute Becomes a Creative Material",
    dek: "By 2035, energy, latency, locality, and model scale will shape the aesthetic—not merely the cloud bill.",
    audiences: ["Technical Leaders", "Creative Directors", "Media Operators"],
    horizon: 2035,
    confidence: "high",
    thesis:
      "The next decade will make inference simultaneously cheaper per useful operation and more consequential in aggregate. Creative organizations will treat compute placement as a medium-level decision, composing across device, studio, regional edge, and cloud according to privacy, responsiveness, continuity, energy availability, and the expressive needs of the work.",
    signals2026: [
      "The IEA projects that data-centre electricity consumption will more than double by 2030 in its base case and models substantial uncertainty through 2035. AI is a major driver, but electricity supply, grids, geography, and deployment timing constrain what nominally cheap computation can become.",
      "Stanford’s AI Index documents rapidly falling inference cost and improving smaller models. MLPerf records major gains across datacentre, interactive, and edge scenarios. These trends support broader placement choices; they do not guarantee that total demand or environmental impact will fall.",
      "Creative teams already experience the trade: a remote frontier model may offer capability, a local model may protect unreleased material, an edge model may enable live interaction, and a queued batch may use energy and budget more responsibly than instant generation.",
    ],
    scenario2035: [
      "A production plan includes a compute score beside the shot list. Live, embodied work reserves low-latency local inference; confidential development stays within controlled environments; exploratory bulk generation follows budget and carbon-aware schedules; exceptional scenes earn frontier-scale computation.",
      "Directors understand model scale as they understand lens, stock, or ensemble size. Deliberately constrained models create coherent vernaculars. Offline generation becomes an aesthetic and resilience choice. Expensive inference is used for moments where additional capability remains perceptible to the audience.",
      "The operating system routes workloads against policy and real conditions, then records the decision. A campaign can explain not only what model touched an asset but where, under whose authority, at what quality threshold, and with what measured resource cost.",
    ],
    strategicImplications: [
      "Cloud-only and local-only doctrines both become liabilities. A portable workload and evaluation layer creates negotiating power and continuity.",
      "Sustainability claims must connect to measured workloads and energy sources rather than generic model labels. Efficiency per inference can coexist with rapidly increasing aggregate use.",
      "Creative and infrastructure planning should converge early. A spatial live work, private source-library model, and global localization pipeline have fundamentally different compute geometries.",
    ],
    movesToMakeNow: [
      "Classify workflows by sensitivity, latency, quality threshold, availability, volume, and energy tolerance before selecting a provider or model.",
      "Benchmark representative creative tasks across at least two model sizes and two deployment locations; retain quality judgments alongside latency, cost, and energy data.",
      "Make queues, graceful degradation, and offline continuation part of the creative brief for experiences that must survive network or provider loss.",
      "Set an explicit escalation rule for frontier-scale inference so greater expenditure requires an observable creative benefit.",
    ],
    uncertainties: [
      "Model efficiency, energy supply, hardware availability, regulation, and rebound effects can move in opposing directions. Forecasts should be revisited annually rather than embedded as a permanent infrastructure assumption.",
      "Comparable energy and emissions data at workload level remains difficult. Teams should state measurement boundaries and avoid false precision.",
    ],
    citations: [energyAndAi, aiIndex2025, mlperf50],
  },
  {
    slug: "media-escapes-the-frame",
    number: 9,
    title: "Media Escapes the Frame",
    dek: "The 2035 canvas is a room, a street, a body, a vehicle, a shared table—and still, when needed, a simple page.",
    audiences: [
      "Creative Directors",
      "Artists",
      "Technical Leaders",
      "Media Operators",
    ],
    horizon: 2035,
    confidence: "speculative",
    thesis:
      "Spatial media will matter when it stops imitating rectangular screens and begins directing attention, memory, sound, movement, and social presence across physical context. Its mature form will be multimodal and gracefully reducible, allowing one authored world to meet people through immersive, ambient, handheld, audio, and conventional web editions.",
    signals2026: [
      "The WebXR Device API continues through the W3C standards process with interfaces for augmented and virtual reality devices and explicit treatment of consent, tracking, fingerprinting, comfort, and varied hardware capability. The web is developing an interoperable path even while the specification remains a work in progress.",
      "Global connectivity continues to expand, but ITU data shows persistent differences in quality, affordability, skills, and devices. Spatial media cannot responsibly assume continuous high-bandwidth headsets as the universal endpoint.",
      "WCAG 2.2 requires content to remain perceivable, operable, understandable, and robust across technologies. Spatial authorship therefore needs alternatives for sensory, mobility, cognitive, and device differences from the beginning—not a flattened accessibility transcript after launch.",
    ],
    scenario2035: [
      "A product story begins as a choreography of attention: what approaches, what remains peripheral, what can be touched, what is heard privately, what becomes communal, and what persists after the experience ends. Frames are one possible view into that choreography.",
      "The same authored world may appear as a location-aware installation, a tabletop model, a binaural walk, a tactile score, a browser-based 3D scene, and a linear film. These are not downgraded ports. Each edition uses its medium to preserve the central dramatic relationship.",
      "Consent becomes part of mise-en-scène. Experiences ask before mapping a room, recording gaze, identifying bystanders, or retaining spatial memory. A visible boundary can be aesthetically integrated rather than hidden inside a permission dialog.",
    ],
    strategicImplications: [
      "Spatial direction needs new collaboration among production design, theatre, game systems, architecture, sound, accessibility, privacy, and real-time engineering.",
      "Brands should build spatial grammar and reusable world assets only after identifying a durable behavior or story that earns embodiment. Novelty alone will not support the operating cost.",
      "The canonical source should be semantic and multimodal enough to generate appropriate editions without making the most instrumented device the definition of the work.",
    ],
    movesToMakeNow: [
      "Prototype one story as a screen, audio-only, and room-scale edition; test whether each preserves agency, comprehension, and emotional sequence.",
      "Create a spatial privacy map listing sensed data, bystanders, retention, local processing, visible indicators, and the consequence of refusing permission.",
      "Develop a comfort and accessibility review with disabled participants before choosing interaction primitives or camera movement.",
      "Use open web formats and graceful fallbacks where possible; preserve the scene, assets, behavior, and documentation separately from a headset vendor runtime.",
    ],
    uncertainties: [
      "Head-worn adoption may remain episodic, platform-specific, or concentrated in work and entertainment niches. Ambient audio, projection, vehicles, and handheld devices may carry more spatial storytelling than glasses.",
      "Standards, social norms, and hardware form factors remain unsettled. Investment should emphasize portable world logic and human craft over speculative device exclusivity.",
    ],
    citations: [webXr, itu2025, wcag22],
  },
  {
    slug: "accessibility-becomes-generative-art-direction",
    number: 10,
    title: "Accessibility Becomes Generative Art Direction",
    dek: "By 2035, accessibility is not a compliant copy of the work. It is the discipline that lets the work transform without losing itself.",
    audiences: [
      "Creative Directors",
      "Artists",
      "Technical Leaders",
      "Media Operators",
    ],
    horizon: 2035,
    confidence: "high",
    thesis:
      "Multimodal generation can turn accessibility from a late remediation task into a first-order creative system, but only when disabled people direct the transformations. The objective is not automatic conversion; it is authored equivalence across vision, hearing, motion, language, cognition, input, bandwidth, and context.",
    signals2026: [
      "The World Health Organization estimates that 1.3 billion people—about one in six worldwide—experience significant disability. Accessibility is therefore a central audience and authorship condition, not an edge case.",
      "WCAG 2.2 establishes testable criteria across perception, operation, understanding, and robustness, while acknowledging that conformance does not address every user need. Standards create a floor; editorial quality remains a human responsibility.",
      "Generative systems can produce descriptions, captions, translations, summaries, voice, and alternate layouts at scale, but NIST identifies confabulation, bias, information integrity, privacy, and human-AI configuration risks that can turn automatic access into confident misrepresentation.",
    ],
    scenario2035: [
      "Every major work contains an accessibility score: the intended emotional and informational beats, which sensory channels carry them, where timing matters, and which transformations are artistically permitted. Generative tools render candidate editions against that score.",
      "A blind viewer can select a concise spatial description, a poetic director-authored track, or an exploratory object layer. A Deaf viewer can choose captions, signed performance, haptic rhythm, or a visual sound composition. People can reduce motion, complexity, glare, or interaction pressure without being expelled from the narrative.",
      "Disabled artists lead the practice. Their methods reshape the primary work: captions become typography, description changes blocking, tactile thinking changes composition, and cognitive clarity improves narrative structure for everyone without pretending every audience wants the same simplification.",
    ],
    strategicImplications: [
      "Accessibility assets become authored source material with rights, versions, provenance, and review—not disposable derivatives generated at the distribution edge.",
      "Quality assurance must test equivalence and dignity, not only technical conformance. A fluent but incorrect description can be more harmful than an obvious failure.",
      "Organizations gain resilience because a well-structured multimodal source can adapt to new devices, environments, languages, and temporary impairments.",
    ],
    movesToMakeNow: [
      "Include disabled creators and audience members in concept development, budget, critique, and credit—not only final usability testing.",
      "For one flagship work, write the accessibility score before production and use it to shape framing, sound, text, interaction, and alternatives.",
      "Require human review for generated descriptions, captions, sign-language representations, and cognitive adaptations; record the reviewer and source edition.",
      "Test keyboard, screen reader, zoom, reduced motion, captions, contrast, target size, authentication, and low-bandwidth behavior in the actual production experience.",
    ],
    uncertainties: [
      "High-quality transformation remains culturally and contextually difficult. Model capability may improve faster than organizations build the human review and participatory practice required to use it well.",
      "Personalization can expose disability information or create segregated experiences. Preference storage should be minimal, controlled by the person, and unnecessary for receiving a strong default experience.",
    ],
    citations: [disabilityInclusion, wcag22, nistGenAi, itu2025],
  },
  {
    slug: "the-media-library-starts-making-decisions",
    number: 11,
    title: "The Media Library Starts Making Decisions",
    dek: "In 2035, the media library is no longer where campaigns go to sleep. It is where the institution remembers enough to act without repeating itself.",
    audiences: [
      "Media Operators",
      "Creative Directors",
      "Technical Leaders",
      "CMOs",
    ],
    horizon: 2035,
    confidence: "high",
    thesis:
      "Media libraries will evolve into governed intelligence estates that can retrieve precedent, expose rights, assemble source material, identify repetition, and support new creation. Their value will depend less on model novelty than on preservation, description, relationships, permissions, and the editorial authority to decide what should remain dormant.",
    signals2026: [
      "The Library of Congress frames digital stewardship across collection, preservation, access, and responsible experimentation with AI. Its preservation guidance is explicit that authentic bit-level copies are foundational but insufficient for future usability when formats, software, hardware, or rights become unavailable.",
      "C2PA provides a structure for carrying ingredients and edit lineage with assets. Copyright guidance emphasizes the human expressive contribution within AI-assisted work. Together, these signals favor media libraries that preserve relationships and authorship rather than only final renditions.",
      "Most commercial asset libraries still optimize filename search and campaign folders. They rarely preserve why an image was rejected, whether a performance may be synthesized, which source claim was later corrected, or what audience context made a reuse harmful.",
    ],
    scenario2035: [
      "A media library answers institutional questions. It can surface every existing promise to a community, distinguish original capture from generated extension, show the rights remaining on a performance, and explain why a familiar visual motif was retired.",
      "Models operate as temporary interpreters over preserved sources rather than becoming the media library itself. Curators can replace an embedding model, challenge a generated relationship, restrict sensitive collections, and reproduce the evidence behind a recommendation.",
      "The media library participates in creation through bounded agents: locating underused work, proposing combinations grounded in documented context, warning about repetition, and preparing rights-ready source packets. Publication remains a new editorial act, not an automatic consequence of retrieval.",
    ],
    strategicImplications: [
      "Preservation, rights, metadata, and creative operations become one investment case. Without source integrity and permissions, an AI-ready media library is merely a faster ambiguity engine.",
      "Media libraries should retain significant refusals, corrections, and context—not every machine-generated intermediate. Selection policy is essential because infinite retention can increase risk while obscuring memory.",
      "Brands with deep bodies of work can build strategic differentiation when they preserve the conditions of use and invite reinterpretation rather than chasing superficial resemblance.",
    ],
    movesToMakeNow: [
      "Select one high-value collection and reconcile originals, derivatives, rights, contributors, dates, decisions, and known gaps before adding generative retrieval.",
      "Preserve fixity-checked originals, open or documented derivatives, technical metadata, and the software or instructions needed to render significant work.",
      "Separate source evidence from generated descriptions and inferred relationships; store confidence, model, date, reviewer, and correction record for each inference.",
      "Define collections that must not train models, must not leave a controlled environment, require cultural authority, or expire from operational access.",
    ],
    uncertainties: [
      "Automated interpretation can canonize existing catalog bias and make missing communities less visible. Institutions must fund acquisition, repair, and participatory description—not only retrieval.",
      "Long-term model and credential verification practices will change. Durable source preservation and exportable metadata are safer investments than dependence on one vendor’s intelligence layer.",
    ],
    citations: [locDigitalStrategy, locPreservation, c2pa22, copyrightability],
  },
  {
    slug: "marketing-after-surveillance",
    number: 12,
    title: "Marketing After Surveillance",
    dek: "The highest-performing brand of 2035 may know less about each person—and keep more of its promises to them.",
    audiences: [
      "CMOs",
      "Creative Directors",
      "Technical Leaders",
      "Media Operators",
    ],
    horizon: 2035,
    confidence: "medium",
    thesis:
      "Marketing will move from covert inference about individuals toward explicit audience covenants: declared exchanges in which people choose what a brand may remember, adapt, and measure. Competitive advantage will come from compelling participation, distinctive media, trustworthy first-party relationships, and causal learning—not the maximum extraction of behavioral exhaust.",
    signals2026: [
      "The FTC’s surveillance-pricing study documents intermediaries’ access to location, browsing, shopping, inferred, and behavioral data that can influence the price or promotion a person sees. The finding makes personalization an issue of treatment and power, not merely relevance.",
      "IAB/PwC measures nearly $300 billion in 2025 U.S. digital advertising revenue with growth concentrated in performance-oriented channels. IAB’s creator study simultaneously reports rapid creator investment and continuing challenges around selection, measurement, and fragmented tooling.",
      "The creative economy’s platform dependence and concentration are documented by UN Trade and Development. Optimizing inside dominant channels can produce immediate response while weakening direct audience knowledge, bargaining power, and cultural distinctiveness.",
    ],
    scenario2035: [
      "A person enters a brand environment through a plain covenant: choose continuity, locality, offers, accessibility preferences, or no memory at all. Each choice names the benefit, retention period, and consequence. Refusing memory still yields a complete, dignified experience.",
      "Adaptive treatment uses declared context and session intent before inferred vulnerability. A brand can remember that someone follows a story world without constructing an invisible identity graph. Sensitive inferences and individualized pricing require exceptional justification, conspicuous explanation, and meaningful recourse—or are rejected entirely.",
      "Marketing measurement becomes portfolio evidence. Teams combine experiments, aggregated behavior, direct response, qualitative research, creator learning, retail outcomes, and long-term brand memory. No universal identity spine pretends to make every exposure deterministic.",
    ],
    strategicImplications: [
      "Trust becomes an operating feature that can improve data quality: people provide better signals when the exchange is understandable, bounded, and reversible.",
      "Creative quality matters more when targeting precision is constrained. Strong worlds, useful services, creator relationships, and recognizable points of view travel beyond a purchased profile.",
      "CMOs need governance over algorithmic treatment, not only data collection. Price, offer, message, pacing, and access are all consequential outputs that should be reviewable for unfair difference.",
    ],
    movesToMakeNow: [
      "Inventory every inferred attribute, decision, vendor, retention period, and customer consequence in the marketing stack; remove collection that has no named use or owner.",
      "Prototype a preference covenant in plain language with a strong no-memory path and controls to inspect, change, export, and delete what the brand retains.",
      "Establish review thresholds for individualized price, scarcity, urgency, eligibility, and emotionally sensitive messaging.",
      "Shift a portion of optimization budget into owned editorial formats, creator partnerships, direct community, and experiments that can learn without person-level surveillance.",
    ],
    uncertainties: [
      "Privacy regulation, platform policy, and technical identifiers will continue to vary. Some markets may intensify surveillance while others constrain it, creating fragmented operating requirements.",
      "Declared preferences can still be manipulated or burdensome. A covenant is credible only when defaults are fair, refusal is easy, and the organization limits what it asks people to manage.",
    ],
    citations: [
      surveillancePricing,
      iabRevenue2025,
      iabCreator2025,
      creativeEconomy2024,
    ],
  },
] as const satisfies readonly HorizonScenarioEssay[];

export type Horizon2035Scenario = (typeof horizon2035Scenarios)[number];
export type Horizon2035Slug = Horizon2035Scenario["slug"];

export const horizon2035BySlug = Object.fromEntries(
  horizon2035Scenarios.map((scenario) => [scenario.slug, scenario]),
) as Readonly<Record<Horizon2035Slug, Horizon2035Scenario>>;

export const getHorizon2035Scenario = (
  slug: string,
): Horizon2035Scenario | undefined =>
  horizon2035Scenarios.find((scenario) => scenario.slug === slug);
