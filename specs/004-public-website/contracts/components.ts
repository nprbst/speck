/**
 * Component API Contracts for Speck Public Website
 *
 * These TypeScript interfaces define the props for all Astro components.
 * Reference these types when implementing components to ensure consistency.
 *
 * Phase: 1 (Design & Contracts)
 * Date: 2025-11-15
 */

// ============================================================================
// Navigation Component
// ============================================================================

export interface NavigationLink {
  text: string;
  href: string;
  /** If true, opens in new tab (rel="noopener noreferrer") */
  external?: boolean;
}

export interface NavigationLogo {
  /** Path to SVG file or inline SVG string */
  src: string;
  alt: string;
  /** Usually "/" for homepage */
  href: string;
}

export interface NavigationProps {
  /** Current page URL path for active link highlighting */
  currentPath: string;
  /** Navigation links (shown in header and mobile menu) */
  links: NavigationLink[];
  /** Logo configuration */
  logo: NavigationLogo;
  /** Breakpoint (px) for switching to mobile hamburger menu. Default: 768 */
  mobileBreakpoint?: number;
}

// ============================================================================
// CodeBlock Component
// ============================================================================

export interface CodeBlockProps {
  /** Raw code string to display */
  code: string;
  /** Language for syntax highlighting (bash, typescript, json, etc.) */
  language: string;
  /** Optional filename or title shown above code block */
  title?: string;
  /** Show line numbers in gutter. Default: true */
  showLineNumbers?: boolean;
  /** Line numbers to highlight (1-indexed). Example: [2, 4, 5] */
  highlightLines?: number[];
  /** Show copy-to-clipboard button. Default: true */
  copyButton?: boolean;
}

// ============================================================================
// ThemeToggle Component
// ============================================================================

export type Theme = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeToggleProps {
  /** Default theme if no user preference stored. Default: 'dark' */
  defaultTheme?: Theme;
  /** Position hint for styling (affects icon placement). Default: 'header' */
  position?: 'header' | 'footer';
  /** Icon size in pixels. Default: 24 */
  iconSize?: number;
}

/** Persisted to localStorage */
export interface PersistedTheme {
  theme: Theme;
  /** Timestamp when preference was set */
  timestamp: number;
}

/**
 * localStorage Configuration:
 * - Key name: "speck-theme"
 * - Value: JSON.stringify(PersistedTheme)
 * - Example: localStorage.setItem("speck-theme", JSON.stringify({ theme: "dark", timestamp: Date.now() }))
 */
export const THEME_STORAGE_KEY = 'speck-theme';

// ============================================================================
// FeatureCard Component
// ============================================================================

export interface FeatureCardLink {
  text: string;
  href: string;
}

export interface FeatureCardProps {
  /** Feature title (e.g., "Claude-Native Commands") */
  title: string;
  /** Short description (1-2 sentences) */
  description: string;
  /** Icon identifier or inline SVG */
  icon: string;
  /** Optional link to learn more */
  link?: FeatureCardLink;
}

// ============================================================================
// SEO Metadata (for BaseLayout)
// ============================================================================

export interface SEOMetadata {
  /** Page title (<title> tag). Include site name if not homepage */
  title: string;
  /** Meta description (max 160 characters recommended) */
  description: string;
  /** Canonical URL (absolute path) */
  canonical: string;
  /** Open Graph image URL (absolute URL, 1200x630px recommended) */
  ogImage?: string;
  /** Open Graph type. Default: "website" */
  ogType?: 'website' | 'article';
  /** Twitter card type. Default: "summary_large_image" */
  twitterCard?: 'summary' | 'summary_large_image';
  /** Meta keywords (optional, array of strings) */
  keywords?: string[];
}

// ============================================================================
// Page Data Models (for content pages)
// ============================================================================

export interface HomePageHero {
  headline: string;
  subheadline: string;
  ctaPrimary: {
    text: string;
    href: string;
  };
  ctaSecondary: {
    text: string;
    href: string;
  };
}

export interface HomePageFeature {
  title: string;
  description: string;
  icon: string;
}

export interface HomePageComparison {
  title: string;
  speckHighlights: string[];
  specKitHighlights: string[];
  ctaLink: string;
}

export interface HomePageData {
  hero: HomePageHero;
  features: HomePageFeature[];
  comparison: HomePageComparison;
}

// ============================================================================
// Documentation Page Data
// ============================================================================

export interface DocHeading {
  /** Heading depth (2 = h2, 3 = h3, etc.) */
  depth: number;
  /** Heading text content */
  text: string;
  /** Anchor slug for linking (e.g., "quick-start") */
  slug: string;
}

export interface DocSidebarItem {
  title: string;
  slug: string;
  /** True if this is the current page */
  isActive: boolean;
}

export interface DocSidebarCategory {
  category: string;
  docs: DocSidebarItem[];
  /**
   * Optional subcategories for nested navigation.
   * Maximum nesting depth: 3 levels (category → subcategory → page).
   * Per FR-002, hierarchical navigation must remain manageable.
   */
  subcategories?: DocSidebarCategory[];
}

export interface Breadcrumb {
  title: string;
  href: string;
}

export interface DocsPageData {
  currentDoc: {
    slug: string;
    title: string;
    description: string;
    category: string;
    /** Rendered HTML content from markdown */
    content: string;
    /** Table of contents headings */
    headings: DocHeading[];
  };
  /** Sidebar navigation tree */
  sidebar: DocSidebarCategory[];
  /** Breadcrumb trail for current page */
  breadcrumbs: Breadcrumb[];
}

// ============================================================================
// Comparison Page Data
// ============================================================================

export interface ComparisonTableRow {
  feature: string;
  speck: string;
  specKit: string;
}

export interface MigrationStep {
  title: string;
  description: string;
  codeExample?: string;
}

export interface MigrationGuide {
  title: string;
  steps: MigrationStep[];
}

export interface ComparisonPageData {
  title: string;
  intro: string;
  comparisonTable: ComparisonTableRow[];
  whenToUseSpeck: string[];
  whenToUseSpecKit: string[];
  migrationGuide: MigrationGuide;
}

// ============================================================================
// Content Collection Schemas (Zod schemas)
// ============================================================================

export type DocCategory = 'getting-started' | 'commands' | 'concepts' | 'examples';

/**
 * Navigation Depth Limit:
 * - Maximum 3 levels: Category → Subcategory → Page
 * - Rationale: Mobile navigation becomes unwieldy beyond 3 levels
 * - Example: "Getting Started" → "Installation" → "Prerequisites"
 */

export interface DocFrontmatter {
  title: string;
  description: string;
  category: DocCategory;
  /** Positive integer for ordering within category */
  order: number;
  lastUpdated?: Date;
  tags?: string[];
}

// ============================================================================
// Utility Types
// ============================================================================

/** Astro component props that include children slot */
export interface AstroComponentProps {
  /** Astro slot content (rendered between opening/closing tags) */
  slot?: any;
}

/** Base layout props */
export interface BaseLayoutProps {
  seo: SEOMetadata;
  /** Optional class name for <body> tag */
  bodyClass?: string;
}

/** Documentation layout props */
export interface DocsLayoutProps extends BaseLayoutProps {
  sidebar: DocSidebarCategory[];
  breadcrumbs: Breadcrumb[];
}
