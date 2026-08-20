export interface NavLink { label: string; href: string; note?: string }
export interface NavGroup { title: string; links: NavLink[] }
export interface MegaMenu { label: string; href: string; feature: { eyebrow: string; title: string; href: string }; groups: NavGroup[] }

const megaMenuCatalog: MegaMenu[] = [
  {
    label: 'Products', href: 'products/',
    feature: { eyebrow: 'The product constellation', title: 'One system from creative intent to verified delivery.', href: 'products/' },
    groups: [
      { title: 'Visual intelligence', links: [
        { label: 'WireMark', href: 'products/wiremark/', note: 'Repository to canvas' },
        { label: 'Canvas', href: 'products/wiremark/canvas/' }, { label: 'Source intelligence', href: 'products/wiremark/source-intelligence/' },
        { label: 'Agent handoff', href: 'products/wiremark/agent-handoff/' }, { label: 'Privacy & provenance', href: 'products/wiremark/privacy-provenance/' },
      ]},
      { title: 'Generative production', links: [
        { label: 'HardMagic Studio', href: 'products/studio/', note: 'Image · motion · sound · form' },
        { label: 'Image', href: 'products/studio/image/' }, { label: 'Video', href: 'products/studio/video/' },
        { label: 'Audio', href: 'products/studio/audio/' }, { label: 'Hybrid inference', href: 'products/studio/hybrid-inference/' },
      ]},
      { title: 'Developer infrastructure', links: [
        { label: 'HardMagic Agent (CLI)', href: 'products/cli/', note: 'The `hm` command' },
        { label: 'Quickstart', href: 'products/cli/quickstart/' }, { label: 'Automation', href: 'products/cli/automation/' },
        { label: 'Agent skills', href: 'products/cli/agent-skills/' }, { label: 'Security', href: 'products/cli/security/' },
      ]},
      { title: 'Media & delivery', links: [
        { label: 'Photo Curator', href: 'products/photo-curator/' }, { label: 'GPU Router', href: 'products/gpu-router/' },
        { label: 'Web Magic', href: 'products/web-magic/' }, { label: 'All products', href: 'products/' },
      ]},
    ],
  },
  {
    label: 'Work', href: 'portfolio/',
    feature: { eyebrow: 'Selected creative practice', title: 'Brands, campaigns, images, experiences, and intelligent media built to leave a mark.', href: 'portfolio/' },
    groups: [
      { title: 'Agentic workflows', links: [
        { label: 'Human + agent loop', href: 'methods/human-agent-creative-loop/', note: 'Intent to evidence' },
        { label: 'Agent handoff', href: 'products/wiremark/agent-handoff/' },
        { label: 'Agent skills', href: 'products/cli/agent-skills/' },
        { label: 'GenAI production', href: 'insights/from-prompting-to-production-systems/' },
      ]},
      { title: 'Product proof', links: [
        { label: 'HardMagic Studio', href: 'products/studio/', note: 'Multimodal production' },
        { label: 'WireMark', href: 'products/wiremark/', note: 'Canvas to source' },
        { label: 'HardMagic Agent (CLI)', href: 'products/cli/' },
        { label: 'Web Magic', href: 'products/web-magic/' },
      ]},
      { title: 'Creative direction', links: [
        { label: 'State Parks', href: 'portfolio/state-parks/', note: 'Documentary · place' },
        { label: 'FashionX', href: 'portfolio/fashionx/', note: 'Art direction · production' },
        { label: 'Pranashama', href: 'portfolio/pranashama/', note: 'Brand · editorial commerce' },
        { label: 'Tao Cottage', href: 'portfolio/tao-cottage/', note: 'Experience · hospitality' },
      ]},
      { title: 'Selected case studies', links: [
        { label: 'FocusPass', href: 'portfolio/focuspass/' },
        { label: 'Pedadida', href: 'portfolio/pedadida/' },
        { label: 'Airikai', href: 'portfolio/airikai/' },
        { label: 'Taolo', href: 'portfolio/taolo/' },
      ]},
    ],
  },
  {
    label: 'Work with us', href: 'services/',
    feature: { eyebrow: 'Independent senior practice', title: 'Bring us the decision that crosses creative, technical, and organizational boundaries.', href: 'services/executive-advisory/' },
    groups: [
      { title: 'Leadership', links: [
        { label: 'Executive advisory', href: 'services/executive-advisory/', note: 'Senior counsel for consequential decisions' }, { label: 'Creative direction', href: 'services/creative-direction/' },
        { label: 'Marketing consulting', href: 'services/marketing-consulting/' }, { label: 'Brand systems', href: 'services/brand-systems/' },
      ]},
      { title: 'Transformation', links: [
        { label: 'GenAI strategy', href: 'services/genai-strategy/' }, { label: 'Creative technology', href: 'services/creative-technology/' },
        { label: 'Media management', href: 'services/media-management/' }, { label: 'Content operations', href: 'services/content-operations/' },
      ]},
      { title: 'Engagements', links: [
        { label: 'Compare engagement models', href: 'engagements/', note: 'Choose the right working relationship' }, { label: 'Transformation sprint', href: 'engagements/transformation-sprint/' },
        { label: 'Fractional creative office', href: 'engagements/fractional-creative-office/' },
        { label: 'GenAI lab', href: 'engagements/genai-lab/' }, { label: 'Managed media desk', href: 'engagements/managed-media-desk/' },
        { label: 'Product launch room', href: 'engagements/product-launch-room/' },
      ]},
      { title: 'Industries', links: [
        { label: 'Media & entertainment', href: 'industries/media-entertainment/' }, { label: 'Consumer brands', href: 'industries/consumer-brands/' },
        { label: 'Sports & wellness', href: 'industries/sports-wellness/' }, { label: 'Software platforms', href: 'industries/software-platforms/' },
        { label: 'All industry dossiers', href: 'industries/' },
      ]},
    ],
  },
  {
    label: 'Ideas', href: 'insights/',
    feature: { eyebrow: 'HardMagic / Horizon 2035', title: 'Twelve sourced future scenarios for the people deciding what media becomes.', href: 'horizon/' },
    groups: [
      { title: 'Intelligence', links: [
        { label: 'Latest insights', href: 'insights/', note: 'Operational arguments for decision-makers' }, { label: 'Technical briefs', href: 'briefs/', note: 'Private, evidence-led decision guides' },
        { label: 'Horizon 2035', href: 'horizon/', note: 'Twelve future scenarios' },
        { label: 'Methods', href: 'methods/' }, { label: 'Editorial policy', href: 'editorial-policy/' },
      ]},
      { title: 'Creative systems', links: [
        { label: 'Creative direction', href: 'insights/creative-direction-after-model-abundance/' }, { label: 'Brand memory', href: 'insights/brand-memory-in-generative-systems/' },
        { label: 'Human + agent loop', href: 'methods/human-agent-creative-loop/' }, { label: 'Accessibility as editorial', href: 'methods/accessibility-as-editorial/' },
      ]},
      { title: 'Technical systems', links: [
        { label: 'Hybrid inference', href: 'methods/hybrid-inference/' }, { label: 'Agent operations', href: 'insights/the-case-for-agent-readable-creative-operations/' },
        { label: 'Provenance', href: 'insights/provenance-without-killing-creative-flow/' }, { label: 'Static publishing', href: 'insights/static-websites-as-durable-media/' },
      ]},
      { title: 'Media systems', links: [
        { label: 'Media control room', href: 'insights/what-a-modern-media-control-room-needs/' }, { label: 'Collection intelligence', href: 'methods/collection-to-intelligence/' },
        { label: 'GenAI production', href: 'insights/from-prompting-to-production-systems/' }, { label: '90-day activation', href: 'methods/30-60-90-activation/' },
      ]},
    ],
  },
  {
    label: 'Company', href: 'company/',
    feature: { eyebrow: 'Independent agentic media company', title: 'A privately owned Delaware corporation building for the long horizon.', href: 'company/' },
    groups: [
      { title: 'HardMagic', links: [
        { label: 'Corporation', href: 'company/' }, { label: 'Continuity', href: 'company/history/' }, { label: 'Founder', href: 'company/founder/' },
        { label: 'Selected experience', href: 'company/selected-experience/' },
      ]},
      { title: 'How we work', links: [
        { label: 'Principles', href: 'company/principles/' }, { label: 'Operating model', href: 'company/operating-model/' },
        { label: 'Partners', href: 'company/partners/' }, { label: 'Careers', href: 'company/careers/' },
      ]},
      { title: 'Trust', links: [
        { label: 'Responsible AI', href: 'responsible-ai/' }, { label: 'Security', href: 'security/' },
        { label: 'Accessibility', href: 'accessibility/' }, { label: 'Privacy', href: 'privacy/' },
      ]},
      { title: 'Talk to us', links: [
        { label: 'Advisory intake', href: 'services/executive-advisory/', note: 'Route a consequential decision' }, { label: 'Creative direction', href: 'contact/creative-direction/' }, { label: 'GenAI', href: 'contact/genai/' },
        { label: 'Media management', href: 'contact/media-management/' }, { label: 'Start a conversation', href: 'contact/' },
      ]},
    ],
  },
];

const menuOrder = ['Work', 'Work with us', 'Ideas', 'Products', 'Company'];
export const megaMenus = menuOrder.map((label) => megaMenuCatalog.find((menu) => menu.label === label)!) satisfies MegaMenu[];

/**
 * The footer keeps the high-intent routes visible without adding another
 * top-level disclosure to the header. Keep these links relative: BaseLayout
 * supplies the deployment base path for both local and project builds.
 */
export const footerNavGroups: NavGroup[] = [
  {
    title: 'Advisory',
    links: [
      { label: 'Executive advisory', href: 'services/executive-advisory/' },
      { label: 'Engagement models', href: 'engagements/' },
      { label: 'Transformation sprint', href: 'engagements/transformation-sprint/' },
      { label: 'Explore executive advisory', href: 'services/executive-advisory/' },
    ],
  },
  {
    title: 'Briefs',
    links: [
      { label: 'Technical briefs', href: 'briefs/' },
      { label: 'Generative media operating system', href: 'briefs/generative-media-operating-system/' },
      { label: 'Intelligent media asset estate', href: 'briefs/intelligent-media-asset-estate/' },
    ],
  },
  {
    title: 'Insights',
    links: [
      { label: 'Latest insights', href: 'insights/' },
      { label: 'Horizon 2035', href: 'horizon/' },
      { label: 'Methods', href: 'methods/' },
    ],
  },
  {
    title: 'Products',
    links: [
      { label: 'WireMark', href: 'products/wiremark/' },
      { label: 'HardMagic Studio', href: 'products/studio/' },
      { label: 'HardMagic Agent (CLI)', href: 'products/cli/' },
      { label: 'Web Magic', href: 'products/web-magic/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About HardMagic', href: 'company/' },
      { label: 'Operating model', href: 'company/operating-model/' },
      { label: 'Privacy', href: 'privacy/' },
    ],
  },
];
