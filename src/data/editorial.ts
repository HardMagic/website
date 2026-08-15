export type EditorialFamily =
  | 'front-door'
  | 'product'
  | 'service'
  | 'engagement'
  | 'industry'
  | 'method'
  | 'insight'
  | 'brief'
  | 'brief-confirmation'
  | 'company'
  | 'contact'
  | 'trust';

export type VisualModes = readonly [string, string, string, ...string[]];

export interface EditorialSection {
  heading: string;
  copy?: readonly [string, string, ...string[]];
  bullets?: readonly [string, string, ...string[]];
}

export interface EditorialRoute {
  path: `/${string}`;
  family: EditorialFamily;
  title: string;
  deck: string;
  thesis: string;
  readerJob: string;
  primaryAction: string;
  earlyAction: string;
  visualModes: VisualModes;
  topics: readonly [string, string, string, ...string[]];
  relatedPaths: readonly `/${string}`[];
  sections: readonly [EditorialSection, EditorialSection, EditorialSection, EditorialSection, EditorialSection];
}

type Seed = readonly [
  path: `/${string}`,
  title: string,
  readerJob: string,
  thesis: string,
  primaryAction: string,
  earlyAction: string,
  topics: readonly [string, string, string, ...string[]],
  relatedPaths: readonly `/${string}`[],
  visualModes: VisualModes,
];

const t = (...topics: [string, string, string, ...string[]]) => topics;
const v = (...modes: [string, string, string, ...string[]]) => modes;
const rel = (...paths: `/${string}`[]) => paths;

const boundaries: Record<EditorialFamily, string> = {
  'front-door': 'This page orients rather than compressing every supporting argument into one corporate claim.',
  product: 'Capabilities, availability, integrations, and deployment details must reflect current product evidence and status.',
  service: 'The appropriate scope depends on the decision, internal ownership, available evidence, and authority to act.',
  engagement: 'An engagement model is useful only when decision rights, inputs, deliverables, and exit conditions are explicit.',
  industry: 'Sector context informs the work, but it does not justify invented outcomes, customers, or universal prescriptions.',
  method: 'This method structures judgment; it does not replace practitioner expertise or guarantee a particular result.',
  insight: 'This is an authored interpretation whose recommendations should remain open to counterevidence and revision.',
  brief: 'The public summary must stand on its own; the private brief adds depth without hiding the core thesis behind a form.',
  'brief-confirmation': 'This state confirms a request without exposing a private file, expanding consent, or promising a sales response.',
  company: 'Documented experience must identify context and role without implying endorsement of current products or services.',
  contact: 'Intake must avoid secrets and regulated data while collecting only enough context to route a requested conversation.',
  trust: 'Policies must describe actual practices, effective dates, known limitations, and a monitored path for questions.',
};

const sentence = (value: string) => /[.!?]$/.test(value) ? value : `${value}.`;
const lower = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

function publish(family: EditorialFamily, seed: Seed): EditorialRoute {
  const [path, title, readerJob, thesis, primaryAction, earlyAction, topics, relatedPaths, visualModes] = seed;
  const deck = `${title} connects ${topics[0]}, ${topics[1]}, and ${topics[2]} as one consequential decision.`;
  return {
    path,
    family,
    title,
    deck,
    thesis: sentence(thesis),
    readerJob: sentence(readerJob),
    primaryAction,
    earlyAction,
    visualModes,
    topics,
    relatedPaths,
    sections: [
      {
        heading: 'The decision in front of you',
        copy: [deck, sentence(thesis)],
      },
      {
        heading: `Why ${topics[0]} changes the work`,
        copy: [
          `This page helps readers ${lower(sentence(readerJob))}`,
          `It treats ${topics[0]}, ${topics[1]}, and ${topics[2]} as connected operating concerns rather than isolated deliverables.`,
        ],
      },
      {
        heading: 'What to inspect',
        bullets: [
          `Use the ${visualModes[0]} to establish context, then inspect the ${visualModes[1]} for mechanism and decision points.`,
          `The ${visualModes[2]} should expose evidence, trade-offs, or a practical exercise instead of serving as decoration.`,
        ],
      },
      {
        heading: 'Boundaries and proof',
        copy: [
          boundaries[family],
          'Before publication, factual claims require inspectable product behavior, attributed first-party experience, or dated source notes.',
        ],
      },
      {
        heading: 'Choose the next depth',
        bullets: [
          `Ready readers can ${lower(sentence(primaryAction))}`,
          `Readers still framing the problem can ${lower(sentence(earlyAction))}`,
        ],
      },
    ],
  };
}

const frontDoors: readonly Seed[] = [
  ['/', 'HardMagic Corporation', 'Understand what this independent marketing studio can make possible', 'HardMagic joins strategy creative direction media GenAI and proprietary technology to make brands impossible to ignore', 'Start a project', 'See selected work', t('creative direction', 'intelligent media', 'brand experience'), rel('/services/', '/products/studio/'), v('studio manifesto', 'multimodal proof', 'creative work wall', 'proprietary instruments')],
  ['/products/', 'Products', 'Choose the right HardMagic product', 'HardMagic products connect intent, generation, observation, organization, and delivery', 'Choose a product', 'Understand the platform', t('product portfolio', 'creative workflow', 'platform architecture'), rel('/products/wiremark/', '/products/studio/'), v('product score', 'workflow map', 'status ledger', 'comparison matrix')],
  ['/services/', 'Services', 'Decide whether HardMagic can solve an operating problem', 'Services translate product intelligence into direct creative and organizational intervention', 'Discuss an engagement', 'Compare services', t('advisory work', 'creative operations', 'organizational change'), rel('/engagements/', '/contact/'), v('decision diagnostic', 'practice dossiers', 'engagement ladder', 'fit test')],
  ['/insights/', 'Insights', 'Find useful thinking rather than corporate news', 'HardMagic publishes operational arguments for people directing creative technology', 'Read the lead essay', 'Browse by topic', t('editorial arguments', 'creative technology', 'operating decisions'), rel('/methods/', '/briefs/'), v('editorial cover', 'thesis index', 'annotated figure', 'topic atlas')],
  ['/briefs/', 'Technical Briefs', 'Find a substantive decision guide', 'HardMagic briefs turn difficult media and GenAI decisions into inspectable operating models', 'Request a brief', 'Read public summaries', t('decision guides', 'technical architecture', 'operating models'), rel('/methods/', '/contact/genai/'), v('brief library', 'decision matrix', 'sample spreads', 'methodology note')],
];

const products: readonly Seed[] = [
  ['/products/wiremark/', 'WireMark', 'Determine whether visual-first product work fits the team', 'The running product should be the primary surface for understanding and directing software work', 'Explore WireMark', 'Read the workflow', t('visual product intelligence', 'source context', 'agent direction'), rel('/products/wiremark/canvas/', '/briefs/visual-product-development-field-guide/'), v('marked canvas', 'repository trace', 'evidence loop', 'privacy boundary')],
  ['/products/wiremark/canvas/', 'WireMark Canvas', 'Understand the visual workspace', 'Spatial context preserves intent that tickets and screenshots routinely discard', 'See a canvas session', 'Compare ticket workflows', t('spatial context', 'interface annotation', 'shared intent'), rel('/products/wiremark/', '/products/wiremark/source-intelligence/'), v('annotated viewport', 'gesture sequence', 'object anatomy', 'comparison spread')],
  ['/products/wiremark/source-intelligence/', 'Source Intelligence', 'See how visible interfaces connect to code', 'Source intelligence is useful when it begins with an observed product fact', 'Discuss integration', 'Inspect the trace model', t('source mapping', 'observed behavior', 'confidence'), rel('/products/wiremark/canvas/', '/products/wiremark/agent-handoff/'), v('DOM-to-source diagram', 'trace walkthrough', 'confidence legend', 'failure cases')],
  ['/products/wiremark/agent-handoff/', 'Agent Handoff', 'Evaluate agent-ready product direction', 'Agents need bounded observations, acceptance evidence, and review context rather than larger prompts', 'Pilot an agent workflow', 'Download the checklist', t('agent context', 'acceptance evidence', 'human review'), rel('/methods/human-agent-creative-loop/', '/products/cli/agent-skills/'), v('handoff packet', 'agent sequence', 'evidence checklist', 'review gate')],
  ['/products/wiremark/privacy-provenance/', 'Privacy & Provenance', 'Assess WireMark trust and deployment boundaries', 'Visual product intelligence must retain origin, authority, and access context', 'Review deployment needs', 'Read the trust model', t('privacy', 'provenance', 'access boundaries'), rel('/security/', '/insights/provenance-without-killing-creative-flow/'), v('trust-boundary map', 'provenance ledger', 'deployment choices', 'threat notes')],
  ['/products/studio/', 'HardMagic Studio', 'Evaluate a unified generative-media environment', 'Generative media becomes useful when model choice recedes behind coherent creative direction', 'Explore Studio', 'Study the operating model', t('multimodal generation', 'creative direction', 'hybrid compute'), rel('/products/studio/image/', '/services/creative-direction/'), v('multimodal opening', 'intent timeline', 'routing plane', 'asset lineage')],
  ['/products/studio/image/', 'Studio for Image', 'Understand directed image production', 'Image generation is an editorial process of art direction, comparison, and controlled refinement', 'Plan an image workflow', 'Review direction principles', t('image direction', 'variation', 'asset delivery'), rel('/products/studio/', '/services/campaign-production/'), v('contact-sheet hero', 'direction anatomy', 'variation tree', 'inspection loupe')],
  ['/products/studio/video/', 'Studio for Video', 'Assess GenAI video production', 'Useful generated video requires continuity, shot logic, timing, and post-production discipline', 'Discuss video production', 'Read the shot-planning guide', t('video generation', 'continuity', 'post-production'), rel('/products/studio/', '/services/media-management/'), v('storyboard strip', 'shot pipeline', 'continuity map', 'failure reel')],
  ['/products/studio/audio/', 'Studio for Audio', 'Explore voice, sound, and music workflows', 'Audio generation needs listening structure, rights awareness, and human editorial judgment', 'Design an audio workflow', 'Explore audio guardrails', t('audio generation', 'rights', 'editorial listening'), rel('/products/studio/', '/responsible-ai/'), v('waveform essay', 'listening stations', 'rights matrix', 'revision score')],
  ['/products/studio/hybrid-inference/', 'Studio Hybrid Inference', 'Understand local and cloud generation', 'Compute placement is a creative-control and governance decision rather than infrastructure plumbing', 'Review infrastructure', 'Read the architecture brief', t('compute placement', 'model routing', 'governance'), rel('/products/gpu-router/', '/methods/hybrid-inference/'), v('compute landscape', 'routing decision tree', 'latency-and-cost table', 'policy boundary')],
  ['/products/cli/', 'HardMagic Agent (CLI)', 'Decide whether HardMagic belongs in an automated workflow', 'Creative infrastructure should work equally well for people, scripts, and agents', 'Install hm', 'Browse command concepts', t('developer tooling', 'automation', 'machine-readable media'), rel('/products/cli/quickstart/', '/products/cli/agent-skills/'), v('terminal opening', 'command anatomy', 'pipeline diagram', 'output contract')],
  ['/products/cli/quickstart/', 'CLI Quickstart', 'Reach a first successful result', 'A useful quickstart proves identity, intent, result handling, and recovery rather than installation alone', 'Run the quickstart', 'Review prerequisites', t('authentication', 'first generation', 'error recovery'), rel('/products/cli/', '/products/cli/automation/'), v('prerequisite rail', 'command sequence', 'expected output', 'error clinic')],
  ['/products/cli/automation/', 'CLI Automation', 'Build repeatable media pipelines', 'Automation should preserve creative intent and result lineage across every execution', 'Build an automation', 'Inspect output formats', t('pipelines', 'structured output', 'result lineage'), rel('/products/cli/', '/methods/evidence-loop/'), v('pipeline score', 'output samples', 'retry state machine', 'audit trail')],
  ['/products/cli/agent-skills/', 'CLI Agent Skills', 'Connect HardMagic to agent harnesses', 'Small explicit skills outperform opaque all-purpose creative agents', 'Integrate a skill', 'Read the skill contract', t('agent skills', 'permissions', 'evaluation'), rel('/methods/human-agent-creative-loop/', '/products/wiremark/agent-handoff/'), v('skill manifest', 'invocation flow', 'permission envelope', 'evaluation rubric')],
  ['/products/cli/security/', 'CLI Security', 'Evaluate credentials and machine access', 'Automation is credible only when identity, scope, secrets, and logs are deliberately constrained', 'Review enterprise access', 'Read security practices', t('machine identity', 'credential scope', 'audit logs'), rel('/security/', '/products/cli/'), v('threat canvas', 'token lifecycle', 'scope table', 'redacted logs')],
  ['/products/web-magic/', 'Web Magic', 'Determine whether an existing site needs systematic remediation', 'A website is finished only when people can find, use, trust, and enjoy it', 'Request a web review', 'Study the audit model', t('web quality', 'remediation', 'delivery evidence'), rel('/products/web-magic/accessibility/', '/services/web-experience/'), v('live-site autopsy', 'audit spectrum', 'remediation loop', 'evidence packet')],
  ['/products/web-magic/accessibility/', 'Web Accessibility', 'Understand accessibility remediation', 'Accessibility is part of authorship and art direction rather than a compliance layer added at launch', 'Request an accessibility audit', 'Use the review checklist', t('accessibility', 'semantic structure', 'inclusive interaction'), rel('/methods/accessibility-as-editorial/', '/accessibility/'), v('keyboard journey', 'semantic cross-section', 'contrast lab', 'screen-reader transcript')],
  ['/products/web-magic/performance/', 'Web Performance', 'Diagnose experience speed', 'Performance work should connect network and rendering behavior to what the reader experiences', 'Benchmark a site', 'Read performance principles', t('rendering', 'network delivery', 'reader experience'), rel('/products/web-magic/', '/services/web-experience/'), v('request waterfall', 'critical-path map', 'visual timeline', 'budget worksheet')],
  ['/products/web-magic/seo/', 'Web Search Quality', 'Improve findability without content spam', 'Search visibility begins with clear information architecture and evidence-bearing pages', 'Review search architecture', 'Inspect the topic model', t('search visibility', 'information architecture', 'editorial evidence'), rel('/insights/', '/sitemap/'), v('search-result anatomy', 'topic graph', 'metadata clinic', 'crawler route')],
  ['/products/web-magic/delivery/', 'Web Delivery Quality', 'Make web quality repeatable', 'Quality gates belong in delivery systems rather than one-time launch audits', 'Add delivery gates', 'Review the release model', t('continuous delivery', 'quality gates', 'regression evidence'), rel('/products/web-magic/', '/methods/evidence-loop/'), v('CI gate diagram', 'regression ledger', 'release sequence', 'ownership matrix')],
  ['/products/photo-curator/', 'Photo Curator', 'Evaluate a large-library curation environment', 'A media library gains value when judgment becomes portable searchable memory', 'Discuss a media library', 'Tour the workflow', t('photo curation', 'library memory', 'portable decisions'), rel('/products/photo-curator/review/', '/briefs/intelligent-media-asset-estate/'), v('documentary contact sheet', 'curation gestures', 'memory model', 'library map')],
  ['/products/photo-curator/review/', 'Photo Review', 'Understand high-volume visual review', 'Review speed comes from preserving comparison context rather than simply enlarging thumbnails', 'Design a review room', 'Read the curation guide', t('visual review', 'comparison', 'selection rationale'), rel('/products/photo-curator/', '/products/photo-curator/duplicates/'), v('edit desk', 'sequence comparison', 'keyboard map', 'selection rationale')],
  ['/products/photo-curator/duplicates/', 'Duplicate Discovery', 'Reduce near-duplicate overload', 'Similarity detection should organize human judgment rather than silently delete media', 'Evaluate a collection', 'Learn the grouping model', t('visual similarity', 'human judgment', 'reversible action'), rel('/products/photo-curator/review/', '/methods/collection-to-intelligence/'), v('similarity clusters', 'distance explanation', 'keeper decision tree', 'edge cases')],
  ['/products/photo-curator/metadata/', 'Portable Metadata', 'Preserve editorial decisions', 'Ratings and annotations are valuable only when they survive the application that created them', 'Plan metadata strategy', 'Download the field map', t('metadata', 'portability', 'library stewardship'), rel('/products/photo-curator/connectors/', '/methods/collection-to-intelligence/'), v('metadata anatomy', 'sidecar flow', 'vocabulary table', 'migration scenario')],
  ['/products/photo-curator/connectors/', 'Media Connectors', 'Understand collection integration', 'Connectors must respect source ownership and avoid turning ingestion into forced migration', 'Discuss a connector', 'Review compatibility principles', t('connectors', 'source ownership', 'synchronization'), rel('/products/photo-curator/', '/services/media-management/'), v('collection landscape', 'connector contracts', 'sync-state diagram', 'conflict cases')],
  ['/products/gpu-router/', 'GPU Router', 'Evaluate the HardMagic inference substrate', 'Creative systems need a resilient routing plane independent of any one model or provider', 'Discuss infrastructure', 'Explore the architecture', t('GPU inference', 'workload routing', 'provider resilience'), rel('/products/gpu-router/architecture/', '/briefs/hybrid-ai-media-infrastructure/'), v('infrastructure panorama', 'request journey', 'capability registry', 'workload lanes')],
  ['/products/gpu-router/architecture/', 'GPU Router Architecture', 'Understand components and trust boundaries', 'Separating intent policy execution and result handling makes inference governable', 'Request architecture review', 'Inspect component roles', t('system architecture', 'trust boundaries', 'data flow'), rel('/products/gpu-router/', '/products/gpu-router/routing/'), v('layered system map', 'component dossiers', 'data-flow sequence', 'failure containment')],
  ['/products/gpu-router/routing/', 'Capability-Aware Routing', 'Learn how workloads select compute', 'Routing quality depends on explicit capabilities and policy rather than a universal model ranking', 'Model a workload', 'Review routing criteria', t('routing policy', 'model capability', 'fallbacks'), rel('/products/gpu-router/architecture/', '/methods/hybrid-inference/'), v('routing tree', 'capability matrix', 'policy examples', 'fallback choreography')],
  ['/products/gpu-router/observability/', 'Inference Observability', 'See how generation jobs remain explainable', 'Observability should reconstruct why a creative request ran where it did and what happened next', 'Review telemetry needs', 'Read the event model', t('job telemetry', 'state transitions', 'privacy'), rel('/products/gpu-router/', '/products/gpu-router/benchmarks/'), v('job trace', 'state timeline', 'event vocabulary', 'incident walkthrough')],
  ['/products/gpu-router/benchmarks/', 'Inference Benchmarks', 'Evaluate capacity and workload fit', 'Benchmarks are decisions with declared workloads and constraints rather than marketing leaderboards', 'Plan a benchmark', 'Read methodology', t('benchmarking', 'workload design', 'uncertainty'), rel('/products/gpu-router/routing/', '/briefs/hybrid-ai-media-infrastructure/'), v('test-bench opening', 'methodology sheet', 'scenario charts', 'replication checklist')],
];

const services: readonly Seed[] = [
  ['/services/creative-direction/', 'Creative Direction', 'Give an ambitious future one unmistakable reality', 'Creative direction is practical magic: sensing the idea naming it clearly and aligning every medium behavior and production choice around its force', 'Request creative direction', 'Read the engagement guide', t('future sensing', 'creative authority', 'world building'), rel('/engagements/fractional-creative-office/', '/contact/creative-direction/'), v('director desk', 'incantation-to-world sequence', 'critique excerpts', 'deliverable folio')],
  ['/services/genai-strategy/', 'GenAI Strategy', 'Turn GenAI interest into an operating decision', 'Strategy should specify workflows ownership controls and evidence before choosing models', 'Schedule a strategy session', 'Take the readiness diagnostic', t('GenAI strategy', 'governance', 'workflow selection'), rel('/engagements/genai-lab/', '/contact/genai/'), v('executive question', 'capability landscape', 'use-case triage', 'governance map')],
  ['/services/media-management/', 'Media Management', 'Bring order to fragmented media operations', 'Media management connects library integrity rights production distribution and reuse', 'Assess a media estate', 'Review the lifecycle', t('media operations', 'rights', 'library lifecycle'), rel('/products/photo-curator/', '/contact/media-management/'), v('media estate map', 'lifecycle flow', 'rights ledger', 'operating roles')],
  ['/services/marketing-consulting/', 'Marketing Consulting', 'Turn market intuition into a movement people can enter', 'Marketing works when the right words images rituals channels and operating cadence make a new reality feel inevitable', 'Discuss marketing direction', 'Read the diagnostic', t('market intuition', 'audience imagination', 'operating cadence'), rel('/industries/founder-led-companies/', '/contact/marketing-consulting/'), v('market omen', 'narrative architecture', 'audience threshold', 'operating calendar')],
  ['/services/brand-systems/', 'Brand Systems', 'Transform an organization into one coherent world', 'A brand is a shared spell: language symbol behavior media and memory aligning people around what the organization is becoming', 'Build a brand system', 'Review brand-memory principles', t('brand transformation', 'symbolic systems', 'organizational memory'), rel('/methods/brand-memory/', '/briefs/generative-media-operating-system/'), v('brand grammar', 'symbol specimen', 'voice contrasts', 'generation boundaries')],
  ['/services/creative-technology/', 'Creative Technology', 'Connect ambitious concepts to working systems', 'Creative technology engineers expressive possibility under real constraints', 'Propose a prototype', 'Explore our methods', t('prototyping', 'systems design', 'production feasibility'), rel('/products/', '/engagements/transformation-sprint/'), v('prototype theater', 'system cutaway', 'experiment log', 'feasibility matrix')],
  ['/services/content-operations/', 'Content Operations', 'Establish repeatable editorial production', 'Content scale comes from clear decisions and reusable evidence rather than publishing pressure', 'Redesign content operations', 'Audit the workflow', t('editorial workflow', 'content models', 'quality gates'), rel('/insights/marketing-operations-for-small-expert-teams/', '/methods/evidence-loop/'), v('editorial control room', 'workflow lanes', 'content model', 'quality gates')],
  ['/services/campaign-production/', 'Campaign Production', 'Cast one idea across every medium', 'A campaign is an invitation into another reality and every image voice object screen event and release should strengthen the same spell', 'Plan a campaign', 'Review production stages', t('campaign spell', 'multimedia production', 'audience transformation'), rel('/products/studio/', '/engagements/product-launch-room/'), v('campaign spine', 'medium enchantments', 'production calendar', 'risk board')],
  ['/services/web-experience/', 'Web Experience', 'Create or transform a substantive corporate site', 'Corporate websites should operate as durable publications and product surfaces', 'Discuss a web program', 'Review the site framework', t('web publishing', 'editorial architecture', 'experience quality'), rel('/products/web-magic/', '/insights/static-websites-as-durable-media/'), v('reader map', 'editorial grid', 'prototype frames', 'quality ledger')],
  ['/services/executive-advisory/', 'Executive Advisory', 'Get senior counsel without starting a large program', 'Executives need an independent synthesis of creative technical and organizational consequences', 'Request an advisory session', 'Submit a decision question', t('executive decisions', 'scenario analysis', 'independent counsel'), rel('/engagements/transformation-sprint/', '/contact/'), v('decision memo', 'scenario room', 'dissent panel', 'recommendation tree')],
];

const engagements: readonly Seed[] = [
  ['/engagements/', 'Engagements', 'Select a working relationship', 'HardMagic engagements vary by decision horizon embeddedness and ownership transfer', 'Choose an engagement', 'Compare working models', t('engagement design', 'decision horizon', 'ownership transfer'), rel('/services/', '/contact/'), v('engagement spectrum', 'comparison table', 'fit questions', 'sample cadence')],
  ['/engagements/transformation-sprint/', 'Transformation Sprint', 'Resolve a bounded strategic problem quickly', 'A sprint should create an evidence-backed decision and executable next move', 'Scope a sprint', 'See required inputs', t('decision sprint', 'fieldwork', 'executable recommendations'), rel('/services/executive-advisory/', '/methods/30-60-90-activation/'), v('five-day clock', 'question framing', 'fieldwork wall', 'handoff map')],
  ['/engagements/fractional-creative-office/', 'Fractional Creative Office', 'Add sustained creative leadership', 'Fractional leadership works when authority cadence and capability transfer are explicit', 'Discuss fractional leadership', 'Review the operating cadence', t('fractional leadership', 'decision rights', 'capability transfer'), rel('/services/creative-direction/', '/company/operating-model/'), v('embedded-week diary', 'decision rights', 'critique rhythm', 'exit conditions')],
  ['/engagements/genai-lab/', 'GenAI Lab', 'Explore GenAI without uncontrolled experimentation', 'A lab converts hypotheses into governed measured production candidates', 'Design a lab', 'Read the experiment protocol', t('GenAI experiments', 'evaluation', 'governance'), rel('/services/genai-strategy/', '/insights/how-to-evaluate-a-genai-pilot/'), v('hypothesis board', 'sandbox architecture', 'experiment cards', 'promotion gate')],
  ['/engagements/managed-media-desk/', 'Managed Media Desk', 'Delegate ongoing media coordination', 'A managed desk creates continuity across intake rights production library and distribution', 'Scope a media desk', 'Review service boundaries', t('managed media', 'service levels', 'library operations'), rel('/services/media-management/', '/products/photo-curator/'), v('daily control room', 'intake queue', 'rights checkpoint', 'monthly review')],
  ['/engagements/product-launch-room/', 'Product Launch Room', 'Coordinate an important launch', 'Launches succeed when narrative product truth media and operational response share one room', 'Open a launch room', 'Use the readiness checklist', t('product launch', 'narrative', 'operational readiness'), rel('/services/campaign-production/', '/industries/software-platforms/'), v('countdown opening', 'audience map', 'asset wall', 'readiness board')],
];

const industries: readonly Seed[] = [
  ['/industries/', 'Industries', 'Find sector-relevant expertise', 'Industry value comes from understanding different control points rather than changing nouns in a service template', 'Select a dossier', 'Browse common decisions', t('sector context', 'operating tensions', 'relevant capabilities'), rel('/services/', '/briefs/'), v('sector atlas', 'tension index', 'capability crossings', 'issue map')],
  ['/industries/media-entertainment/', 'Media & Entertainment', 'Modernize media production and libraries', 'Media companies must join rights-aware collections multimodal production and durable audience experiences', 'Discuss a media program', 'Read the operating brief', t('media production', 'rights', 'audience experience'), rel('/services/media-management/', '/products/studio/'), v('rights landscape', 'production pipeline', 'collection excavation', 'audience surface')],
  ['/industries/consumer-brands/', 'Consumer Brands', 'Protect distinction amid content abundance', 'Consumer brands need stronger memory and direction as generation makes execution inexpensive', 'Review brand readiness', 'Explore brand systems', t('consumer branding', 'content abundance', 'brand memory'), rel('/services/brand-systems/', '/briefs/generative-media-operating-system/'), v('shelf-to-feed journey', 'brand-memory system', 'content economics', 'governance tension')],
  ['/industries/sports-wellness/', 'Sports & Wellness', 'Coordinate trust community performance and media', 'Sports and wellness brands grow through lived credibility rather than synthetic lifestyle volume', 'Discuss brand direction', 'Read the trust framework', t('community trust', 'sports media', 'wellness claims'), rel('/services/creative-direction/', '/services/marketing-consulting/'), v('field documentary', 'trust map', 'community loop', 'seasonal calendar')],
  ['/industries/agencies/', 'Agencies', 'Add owned AI capability without erasing craft', 'Agencies can use AI to deepen judgment and operational leverage rather than commoditize themselves', 'Build an agency lab', 'Assess current capability', t('agency operations', 'AI augmentation', 'craft'), rel('/engagements/genai-lab/', '/services/content-operations/'), v('agency value chain', 'margin pressure', 'augmented roles', 'capability roadmap')],
  ['/industries/software-platforms/', 'Software Platforms', 'Make technical products legible and compelling', 'Software marketing improves when the running product becomes the evidence surface', 'Plan a product narrative', 'Explore WireMark', t('software products', 'technical narrative', 'product evidence'), rel('/products/wiremark/', '/engagements/product-launch-room/'), v('product observation', 'source trace', 'technical narrative', 'launch choreography')],
  ['/industries/retail-commerce/', 'Retail & Commerce', 'Connect catalog story media and experience', 'Commerce systems need media intelligence and brand coherence across constantly changing inventory', 'Review commerce media', 'Read the media model', t('commerce media', 'catalog operations', 'brand coherence'), rel('/services/media-management/', '/products/photo-curator/'), v('catalog anatomy', 'media supply chain', 'experience storyboard', 'reuse graph')],
  ['/industries/education-culture/', 'Education & Culture', 'Apply GenAI while preserving institutional responsibility', 'Cultural and educational organizations should expand interpretation without obscuring provenance', 'Discuss a responsible pilot', 'Read provenance principles', t('cultural collections', 'education', 'provenance'), rel('/responsible-ai/', '/insights/provenance-without-killing-creative-flow/'), v('collection opening', 'interpretation layers', 'provenance map', 'stewardship questions')],
  ['/industries/founder-led-companies/', 'Founder-Led Companies', 'Build mature presence without corporate dilution', 'Founder-led firms need systems that preserve conviction while making expertise transferable', 'Request founder advisory', 'Take the narrative diagnostic', t('founder knowledge', 'brand maturity', 'organizational memory'), rel('/company/founder/', '/services/marketing-consulting/'), v('founder thesis', 'tacit-knowledge map', 'brand translation', 'operating milestones')],
];

const methods: readonly Seed[] = [
  ['/methods/', 'Methods', 'Understand how HardMagic thinks and works', 'Methods make judgment inspectable without pretending creative work is mechanical', 'Apply a method', 'Browse the atlas', t('operating methods', 'creative judgment', 'practical exercises'), rel('/insights/', '/services/'), v('method atlas', 'shared vocabulary', 'exercise library', 'limitations note')],
  ['/methods/intent-to-system/', 'Intent to System', 'Translate ambition into an operable system', 'Intent survives execution when expressed as decisions constraints and evidence', 'Run an intent workshop', 'Download the canvas', t('intent', 'constraints', 'system design'), rel('/services/creative-technology/', '/methods/evidence-loop/'), v('intent statement', 'decomposition map', 'constraint ledger', 'system blueprint')],
  ['/methods/evidence-loop/', 'The Evidence Loop', 'Make iterative work verifiable', 'Every meaningful change should produce evidence that updates the next decision', 'Build an evidence loop', 'Use the review rubric', t('evidence', 'iteration', 'review'), rel('/products/wiremark/', '/products/web-magic/delivery/'), v('loop diagram', 'evidence taxonomy', 'review ritual', 'scorecard')],
  ['/methods/hybrid-inference/', 'Hybrid Inference Method', 'Decide where AI workloads should run', 'Inference placement balances capability control latency cost and continuity', 'Model an inference estate', 'Read the factors', t('inference policy', 'workload placement', 'continuity'), rel('/products/gpu-router/', '/briefs/hybrid-ai-media-infrastructure/'), v('five-factor compass', 'decision tree', 'scenario table', 'policy worksheet')],
  ['/methods/collection-to-intelligence/', 'Source Collection to Intelligence', 'Turn underused media into usable memory', 'Source collections become intelligent through curation relationships rights and retrieval context', 'Assess a source collection', 'Use the collection scorecard', t('source collections', 'curation', 'retrieval context'), rel('/products/photo-curator/', '/briefs/intelligent-media-asset-estate/'), v('collection layers', 'curation funnel', 'metadata graph', 'reuse scenario')],
  ['/methods/accessibility-as-editorial/', 'Accessibility as Editorial Practice', 'Integrate accessibility into creative practice', 'Accessible work becomes more precise because hierarchy language and interaction must be intentional', 'Run an inclusive review', 'Download the checklist', t('accessibility', 'art direction', 'interaction'), rel('/products/web-magic/accessibility/', '/accessibility/'), v('reading journey', 'sensory transformations', 'interface clinic', 'critique prompts')],
  ['/methods/human-agent-creative-loop/', 'Human-Agent Creative Loop', 'Design useful human and agent collaboration', 'Agents should accelerate bounded production while humans retain direction critique and accountability', 'Design an agent workflow', 'Read the role model', t('human-agent work', 'accountability', 'review gates'), rel('/products/cli/agent-skills/', '/briefs/autonomous-web-publishing-control-plane/'), v('role choreography', 'task envelope', 'review gates', 'failure theater')],
  ['/methods/brand-memory/', 'Brand Memory', 'Encode brand judgment for generative systems', 'Brand memory is a governed body of examples boundaries vocabulary and decisions', 'Build brand memory', 'Audit current guidance', t('brand knowledge', 'generation boundaries', 'stewardship'), rel('/services/brand-systems/', '/briefs/generative-media-operating-system/'), v('memory architecture', 'example taxonomy', 'retrieval flow', 'drift diagnosis')],
  ['/methods/30-60-90-activation/', '30/60/90 Activation', 'Move from interest to operating capability', 'A 90-day program should produce one governed workflow and internal ownership rather than a parade of demos', 'Plan an activation', 'Download the roadmap', t('activation roadmap', 'governance', 'ownership transfer'), rel('/engagements/genai-lab/', '/briefs/generative-media-operating-system/'), v('three-horizon roadmap', 'dependency map', 'evidence gates', 'ownership transfer')],
];

const insights: readonly Seed[] = [
  ['/insights/creative-direction-after-model-abundance/', 'Creative Direction After Model Abundance', 'Reconsider the value of creative direction', 'As execution becomes abundant selection coherence and responsibility become more valuable', 'Discuss creative direction', 'Read the key takeaways', t('creative direction', 'generation abundance', 'responsibility'), rel('/services/creative-direction/', '/briefs/creative-direction-after-the-prompt/'), v('provocation deck', 'abundance diagram', 'critique room', 'counterargument')],
  ['/insights/the-running-product-is-the-brief/', 'The Running Product Is the Brief', 'Improve product communication', 'Observed behavior is a more reliable shared object than prose describing an imagined interface', 'Explore WireMark', 'Try the observation exercise', t('product observation', 'shared evidence', 'implementation intent'), rel('/products/wiremark/', '/briefs/visual-product-development-field-guide/'), v('product vignette', 'translation-loss map', 'annotated screen', 'working exercise')],
  ['/insights/from-prompting-to-production-systems/', 'From Prompting to Production Systems', 'Move beyond isolated prompting', 'Production GenAI depends on state evaluation rights routing and recovery', 'Assess a workflow', 'Read the system map', t('GenAI production', 'evaluation', 'system controls'), rel('/services/genai-strategy/', '/briefs/provenance-ready-content-supply-chain/'), v('prompt fragment', 'system expansion', 'control-plane diagram', 'failure catalog')],
  ['/insights/hybrid-inference-is-a-governance-decision/', 'Hybrid Inference Is a Governance Decision', 'Frame infrastructure choices correctly', 'Local versus cloud is a policy portfolio rather than an ideological binary', 'Review infrastructure', 'Compare scenarios', t('hybrid inference', 'governance', 'workload policy'), rel('/products/gpu-router/', '/methods/hybrid-inference/'), v('competing scenarios', 'governance compass', 'workload table', 'dissent note')],
  ['/insights/why-media-collections-lose-their-value/', 'Why Media Collections Lose Their Value', 'Diagnose collection decay', 'Collections lose value when decisions relationships and rights disappear around the files', 'Assess a collection', 'Read the decay signals', t('collection decay', 'metadata', 'rights'), rel('/products/photo-curator/', '/briefs/intelligent-media-asset-estate/'), v('collection excavation', 'decay timeline', 'metadata autopsy', 'recovery sequence')],
  ['/insights/accessibility-is-art-direction/', 'Accessibility Is Art Direction', 'Connect accessibility and aesthetics', 'Constraints of perception and interaction can sharpen hierarchy and authorship', 'Request an accessibility review', 'Use the critique prompts', t('accessibility', 'aesthetics', 'hierarchy'), rel('/methods/accessibility-as-editorial/', '/products/web-magic/accessibility/'), v('visual essay', 'keyboard narrative', 'typography clinic', 'opposing view')],
  ['/insights/the-case-for-agent-readable-creative-operations/', 'The Case for Agent-Readable Creative Operations', 'Prepare operations for agents', 'Agent readiness begins with explicit work contracts rather than autonomous tool access', 'Design an operating contract', 'Take the readiness check', t('agent readiness', 'work contracts', 'permissions'), rel('/methods/human-agent-creative-loop/', '/briefs/autonomous-web-publishing-control-plane/'), v('work-contract anatomy', 'human-agent swimlane', 'permission envelope', 'incident scenario')],
  ['/insights/brand-memory-in-generative-systems/', 'Brand Memory in Generative Systems', 'Prevent generative brand drift', 'Style guides describe outputs while brand memory preserves the reasons behind choices', 'Build brand memory', 'Audit existing guidance', t('brand memory', 'generative systems', 'drift'), rel('/methods/brand-memory/', '/briefs/generative-media-operating-system/'), v('style-guide fragment', 'memory graph', 'retrieval walkthrough', 'drift examples')],
  ['/insights/what-a-modern-media-control-room-needs/', 'What a Modern Media Control Room Needs', 'Design media operations', 'Modern control rooms coordinate assets rights work compute channels and decisions', 'Scope media operations', 'Inspect the blueprint', t('media operations', 'control rooms', 'decision rights'), rel('/services/media-management/', '/engagements/managed-media-desk/'), v('control-room panorama', 'signal map', 'role stations', 'escalation timeline')],
  ['/insights/how-to-evaluate-a-genai-pilot/', 'How to Evaluate a GenAI Pilot', 'Judge whether a pilot merits expansion', 'A pilot succeeds only when it proves operating value controllability and ownership', 'Review a pilot', 'Download the rubric', t('GenAI pilots', 'evaluation', 'ownership'), rel('/engagements/genai-lab/', '/methods/30-60-90-activation/'), v('evaluation score', 'evidence requirements', 'pilot tribunal', 'decision worksheet')],
  ['/insights/the-cost-of-model-first-product-design/', 'The Cost of Model-First Product Design', 'Avoid model-driven product mistakes', 'Starting with a model creates brittle experiences when user decisions and failure states remain undefined', 'Review a product concept', 'Read the anti-patterns', t('product design', 'model selection', 'failure states'), rel('/services/creative-technology/', '/products/wiremark/'), v('model carousel', 'user-decision map', 'failure branches', 'alternative sequence')],
  ['/insights/provenance-without-killing-creative-flow/', 'Provenance Without Killing Creative Flow', 'Balance traceability and momentum', 'Provenance works when captured as a byproduct of normal creative action', 'Design provenance', 'Review the minimum record', t('provenance', 'creative flow', 'traceability'), rel('/products/wiremark/privacy-provenance/', '/responsible-ai/'), v('creative session', 'provenance trail', 'friction heatmap', 'minimum record')],
  ['/insights/static-websites-as-durable-media/', 'Static Websites as Durable Media', 'Reconsider static publishing', 'Static-first publishing can provide speed longevity inspectability and editorial control', 'Discuss a publication', 'Review the trade-offs', t('static publishing', 'durability', 'editorial control'), rel('/services/web-experience/', '/products/web-magic/'), v('publishing record', 'delivery cross-section', 'resilience comparison', 'dynamic exceptions')],
  ['/insights/marketing-operations-for-small-expert-teams/', 'Marketing Operations for Small Expert Teams', 'Scale a small team without content churn', 'Expert teams win through concentrated authority and reusable evidence rather than imitating content factories', 'Review marketing operations', 'Use the cadence worksheet', t('marketing operations', 'small teams', 'evidence reuse'), rel('/services/marketing-consulting/', '/services/content-operations/'), v('small-team diary', 'attention portfolio', 'evidence reuse map', 'cadence experiment')],
  ['/insights/25-years-from-brand-studio-to-ai-company/', 'From Brand Studio to AI Company', 'Understand the HardMagic evolution', 'GenAI continues HardMagic work joining imagination media and operating systems', 'Read the company story', 'Explore current products', t('company continuity', 'creative practice', 'GenAI products'), rel('/company/history/', '/products/'), v('documented essay', 'era timeline', 'work fragments', 'invention turn')],
];

const briefDefinitions = [
  ['generative-media-operating-system', 'The Generative Media Operating System', 'Design an enterprise operating model', 'GenAI media needs joined decision rights across creative technology legal security and operations', 'operating model', 'decision rights', 'enterprise governance'],
  ['creative-direction-after-the-prompt', 'Creative Direction After the Prompt', 'Reframe creative leadership', 'Generation abundance increases the strategic value of direction and critique', 'creative direction', 'generation abundance', 'critique'],
  ['provenance-ready-content-supply-chain', 'The Provenance-Ready Content Supply Chain', 'Design accountable media operations', 'Provenance must travel through creation review delivery and reuse rather than being added at the end', 'provenance', 'content operations', 'accountability'],
  ['hybrid-ai-media-infrastructure', 'Hybrid AI Media Infrastructure', 'Evaluate inference deployment options', 'Workload-specific portfolios outperform provider-wide or local-only commitments', 'hybrid inference', 'workload evidence', 'buying criteria'],
  ['visual-product-development-field-guide', 'The Visual Product Development Field Guide', 'Improve product observation and handoff', 'Product teams need a shared evidence surface connected to implementation', 'product observation', 'source context', 'agent handoff'],
  ['autonomous-web-publishing-control-plane', 'The Autonomous Web Publishing Control Plane', 'Govern agent-supported publishing', 'Autonomous publishing requires explicit editorial authority evidence quality gates and recovery paths', 'web publishing', 'agent controls', 'quality evidence'],
  ['intelligent-media-asset-estate', 'The Intelligent Media Asset Estate', 'Recover value from a media estate', 'Media intelligence begins with judgment rights relationships and portable metadata', 'media libraries', 'portable metadata', 'rights'],
  ['modern-media-agency-transformation-playbook', 'The Modern Media Agency Transformation Playbook', 'Redesign the agency capability model', 'Independent media organizations can join senior creative authority owned products and AI-enabled operations', 'agency transformation', 'capability ownership', 'operating model'],
] as const;

const briefs: EditorialRoute[] = briefDefinitions.flatMap(([slug, title, readerJob, thesis, a, b, c]) => {
  const path = `/briefs/${slug}/` as const;
  const thanksPath = `/briefs/${slug}/thanks/` as const;
  return [
    publish('brief', [path, title, readerJob, thesis, 'Request the private brief', 'Read the executive summary', t(a, b, c), rel(thanksPath, '/briefs/'), v('executive memo', 'technical diagram', 'worksheet preview', 'qualification form')]),
    publish('brief-confirmation', [thanksPath, `${title}: Request Confirmed`, 'Understand delivery and prepare the next useful step', 'Private delivery should be clear consent-aware and separate from broader marketing', 'Check email', 'Explore the related method', t('private delivery', a, 'preparation'), rel(path, '/methods/'), v('confirmation', 'delivery timeline', 'preparation checklist', 'related reading')]),
  ];
});

const company: readonly Seed[] = [
  ['/company/', 'Company', 'Assess HardMagic as a creative and strategic partner', 'HardMagic is a privately owned studio that has made magic for organizations and audiences since 1999 by joining creative authority contemporary media GenAI production and proprietary technology', 'Start a conversation', 'Explore the studio model', t('creative magic', 'intelligent media', 'private ownership'), rel('/services/', '/company/operating-model/'), v('studio incantation', 'creative operating model', 'proprietary instruments', 'selected continuity')],
  ['/company/history/', 'Continuity', 'Understand the magic that connects every HardMagic era', 'For more than twenty-five years HardMagic has sensed possible futures and manifested them through brand media technology and lived experience', 'Discuss the next chapter', 'Browse the timeline', t('company continuity', 'abracadabra', 'future sensing'), rel('/company/', '/insights/25-years-from-brand-studio-to-ai-company/'), v('continuity timeline', 'era essays', 'artifact gallery', 'turning points')],
  ['/company/founder/', 'Founder', 'Understand the founder perspective and experience', 'Matt Hackney work across media brands technology and creative systems shapes the HardMagic point of view', 'Request founder advisory', 'Read the founder perspective', t('founder', 'creative leadership', 'multidisciplinary practice'), rel('/company/history/', '/services/executive-advisory/'), v('portrait essay', 'career constellation', 'experience context', 'founder principles')],
  ['/company/principles/', 'Principles', 'Test alignment with HardMagic values', 'Imagination is a force and it becomes trustworthy magic when language evidence responsibility cultural respect and durable ownership coexist', 'Discuss mutual fit', 'Read the principles', t('imagination', 'respectful magic', 'responsibility'), rel('/company/operating-model/', '/responsible-ai/'), v('principle manifesto', 'cultural lineages', 'behavior examples', 'rejection criteria')],
  ['/company/selected-experience/', 'Selected Experience', 'Examine relevant documented experience', 'Selected Disney ABC ZICO Jamba Juice and other experience informs the practice without becoming borrowed authority', 'Discuss relevant experience', 'Explore the experience record', t('selected experience', 'brand practice', 'media work'), rel('/company/history/', '/company/founder/'), v('experience index', 'contextual essays', 'role boundaries', 'provenance note')],
  ['/company/operating-model/', 'Operating Model', 'Understand how HardMagic works', 'Small senior teams owned products and specialist collaborators create focused accountability', 'Discuss a working model', 'Review engagement options', t('operating model', 'decision rights', 'specialist network'), rel('/engagements/', '/company/partners/'), v('operating-system map', 'role topology', 'engagement rhythm', 'decision rights')],
  ['/company/partners/', 'Partners', 'Explore partnership opportunities', 'HardMagic partners where complementary capability creates a better whole without blurring ownership', 'Propose a partnership', 'Review partner criteria', t('partnerships', 'complementary capability', 'ownership'), rel('/contact/partnerships/', '/company/operating-model/'), v('partner landscape', 'fit criteria', 'collaboration models', 'boundary examples')],
  ['/company/careers/', 'Careers', 'Determine whether working with HardMagic fits', 'HardMagic values multidisciplinary practitioners who move between ideas systems and accountable delivery', 'Introduce yourself', 'Read how we work', t('careers', 'multidisciplinary practice', 'accountability'), rel('/company/principles/', '/company/operating-model/'), v('practitioner profile', 'workday narratives', 'standards ledger', 'open application')],
];

const contacts: readonly Seed[] = [
  ['/contact/', 'Contact HardMagic', 'Choose the correct conversation', 'Intake should route intent clearly without forcing every visitor into one sales form', 'Start an inquiry', 'Browse engagement models', t('intake', 'conversation routing', 'privacy'), rel('/engagements/', '/privacy/'), v('conversation map', 'practice paths', 'expectation timeline', 'privacy contract')],
  ['/contact/creative-direction/', 'Creative Direction Inquiry', 'Name the future you want people to enter', 'The useful starting point is the transformation audience feeling and authority gap rather than a predetermined deliverable', 'Request creative direction', 'Read the service guide', t('creative direction', 'future vision', 'audience imagination'), rel('/services/creative-direction/', '/engagements/fractional-creative-office/'), v('manifestation prompt', 'situation taxonomy', 'fit examples', 'compact intake')],
  ['/contact/genai/', 'GenAI Inquiry', 'Discuss GenAI strategy or production', 'GenAI intake should capture workflow constraints ownership and decision horizon without collecting sensitive data', 'Start a GenAI inquiry', 'Take the readiness diagnostic', t('GenAI intake', 'workflow constraints', 'decision horizon'), rel('/services/genai-strategy/', '/briefs/generative-media-operating-system/'), v('readiness ladder', 'challenge chooser', 'guardrail notice', 'qualified intake')],
  ['/contact/media-management/', 'Media Management Inquiry', 'Seek help with media libraries or operations', 'Media problems become tractable when scope ownership rights and lifecycle are visible', 'Request a media assessment', 'Use the media scorecard', t('media intake', 'library scope', 'rights'), rel('/services/media-management/', '/methods/collection-to-intelligence/'), v('media-estate sketch', 'issue paths', 'complexity bands', 'assessment intake')],
  ['/contact/marketing-consulting/', 'Marketing Consulting Inquiry', 'Turn a market instinct into something people can believe', 'The first conversation begins with the future you sense the audience you want to move and what keeps that vision from becoming real', 'Request a consultation', 'Read the marketing diagnostic', t('market intuition', 'audience movement', 'manifestation barriers'), rel('/services/marketing-consulting/', '/insights/marketing-operations-for-small-expert-teams/'), v('future-question deck', 'decision categories', 'engagement choices', 'preparation notes')],
  ['/contact/partnerships/', 'Partnership Inquiry', 'Propose a product technology or media partnership', 'Partnership intake should distinguish strategic complement from generic business development', 'Propose a partnership', 'Review fit criteria', t('partnership intake', 'strategic fit', 'mutual contribution'), rel('/company/partners/', '/company/operating-model/'), v('partnership thesis', 'fit matrix', 'contribution exchange', 'proposal intake')],
  ['/contact/thanks/', 'After an Inquiry', 'Know what may happen after submission', 'If a visitor just submitted an inquiry HardMagic can explain the review path without treating a public route as proof of receipt or silently subscribing the visitor', 'Prepare for the conversation', 'Continue exploring', t('follow-up', 'response expectations', 'consent'), rel('/contact/', '/privacy/'), v('follow-up path', 'response timeline', 'consent summary', 'preparation prompt')],
];

const trust: readonly Seed[] = [
  ['/privacy/', 'Privacy', 'Understand data collection and use', 'HardMagic should collect the minimum information required for a requested relationship', 'Exercise a privacy right', 'Return to the trust center', t('privacy', 'data minimization', 'individual rights'), rel('/contact/', '/responsible-ai/'), v('plain summary', 'data table', 'retention map', 'rights process')],
  ['/accessibility/', 'Accessibility', 'Understand accessibility commitments', 'Accessibility is an ongoing editorial and engineering responsibility', 'Report an issue', 'Review accessibility methods', t('accessibility', 'support', 'continuous improvement'), rel('/methods/accessibility-as-editorial/', '/products/web-magic/accessibility/'), v('commitment summary', 'support matrix', 'known limitations', 'feedback process')],
  ['/responsible-ai/', 'Responsible AI', 'Understand AI principles and boundaries', 'Responsible AI requires declared human ownership provenance rights security and evaluation practices', 'Discuss governance', 'Read production controls', t('responsible AI', 'human accountability', 'provenance'), rel('/briefs/provenance-ready-content-supply-chain/', '/security/'), v('principle ledger', 'lifecycle controls', 'prohibited uses', 'open questions')],
  ['/security/', 'Security', 'Assess the public security posture', 'Trust comes from clear boundaries and reporting channels rather than vague claims of absolute safety', 'Report a vulnerability', 'Review security scope', t('security', 'disclosure', 'deployment boundaries'), rel('/privacy/', '/products/cli/security/'), v('security summary', 'deployment boundaries', 'disclosure process', 'dependency posture')],
  ['/terms/', 'Terms', 'Understand site and resource terms', 'Terms should be readable stable and proportionate to the site actual functions', 'Contact legal', 'Return to company', t('terms', 'site use', 'responsibilities'), rel('/privacy/', '/company/'), v('plain-language summary', 'anchored terms', 'responsibility table', 'revision record')],
  ['/editorial-policy/', 'Editorial Policy', 'Evaluate HardMagic publishing standards', 'Corporate publishing should distinguish evidence interpretation recommendation and promotion', 'Report a correction', 'Review recent insights', t('editorial standards', 'sourcing', 'corrections'), rel('/insights/', '/company/principles/'), v('editorial contract', 'claim labels', 'sourcing standard', 'corrections process')],
  ['/sitemap/', 'Sitemap', 'Find any public page', 'A human sitemap should reveal conceptual structure rather than reproduce an alphabetical URL dump', 'Open a route', 'Return home', t('wayfinding', 'information architecture', 'route families'), rel('/', '/products/'), v('topic constellation', 'route families', 'compact index', 'conversion paths')],
];

const seededGroups: readonly [EditorialFamily, readonly Seed[]][] = [
  ['front-door', frontDoors],
  ['product', products],
  ['service', services],
  ['engagement', engagements],
  ['industry', industries],
  ['method', methods],
  ['insight', insights],
  ['company', company],
  ['contact', contacts],
  ['trust', trust],
];

export const editorialRoutes: readonly EditorialRoute[] = [
  ...seededGroups.flatMap(([family, seeds]) => seeds.map((seed) => publish(family, seed))),
  ...briefs,
];

const routePaths = new Set(editorialRoutes.map(({ path }) => path));

if (editorialRoutes.length < 100) {
  throw new Error(`Editorial route contract requires at least 100 records; received ${editorialRoutes.length}.`);
}

if (routePaths.size !== editorialRoutes.length) {
  throw new Error('Editorial route contract contains duplicate paths.');
}

for (const route of editorialRoutes) {
  if (route.visualModes.length < 3 || route.sections.length < 4 || route.sections.length > 6) {
    throw new Error(`Editorial route ${route.path} does not meet its composition contract.`);
  }
  if (route.path === '/404.html') {
    throw new Error('The 404 route is not a publishable editorial record.');
  }
}

export const editorialRouteByPath = new Map(editorialRoutes.map((route) => [route.path, route] as const));
