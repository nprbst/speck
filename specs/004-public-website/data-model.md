# Data Model: Speck Public Website

**Phase**: 1 (Design & Contracts)
**Date**: 2025-11-15
**Purpose**: Define page structure, content types, and component data schemas for static site

## Overview

This is a static website with no database. The "data model" describes:
1. **Content Collections**: Markdown-based content with frontmatter schemas
2. **Page Types**: Different page layouts and their data requirements
3. **Component Props**: TypeScript interfaces for Astro component APIs

---

## 1. Content Collections

### 1.1 Documentation Collection (`docs`)

**Location**: `website/src/content/docs/`
**File Format**: Markdown with frontmatter
**Source**: Synced from main Speck repo via `scripts/sync-docs.ts`

**Schema**:
```typescript
// website/src/content/config.ts
import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum([
      'getting-started',
      'commands',
      'concepts',
      'examples',
    ]),
    order: z.number().int().positive(),
    lastUpdated: z.date().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  docs: docsCollection,
};
```

**Example Entry**:
```yaml
---
# website/src/content/docs/getting-started/quick-start.md
title: "Quick Start Guide"
description: "Install Speck and run your first command in under 10 minutes"
category: "getting-started"
order: 1
lastUpdated: 2025-11-15
tags: ["installation", "setup", "beginner"]
---

# Quick Start Guide

[Markdown content here...]
```

**Validation Rules**:
- `title`: Required, max 100 characters
- `description`: Required, max 200 characters (for SEO meta descriptions)
- `category`: Must be one of the 4 defined categories (enforced by Zod enum)
- `order`: Positive integer for sidebar ordering within category
- `lastUpdated`: ISO 8601 date (optional, auto-populated by sync script)
- `tags`: Array of strings for future search/filtering (optional)

**Relationships**:
- Each doc belongs to one category
- Sidebar navigation groups docs by category, sorts by `order` within group
- File path determines URL slug: `docs/getting-started/quick-start.md` → `/docs/getting-started/quick-start`

---

## 2. Page Types

### 2.1 Homepage (`pages/index.astro`)

**Purpose**: Marketing landing page to communicate Speck's value proposition

**Data Structure**:
```typescript
interface HomePageData {
  hero: {
    headline: string;          // e.g., "Opinionated feature specs for Claude Code"
    subheadline: string;        // e.g., "Transform spec-kit into a Bun-powered..."
    ctaPrimary: {
      text: string;             // e.g., "Get Started"
      href: string;             // e.g., "/docs/getting-started/quick-start"
    };
    ctaSecondary: {
      text: string;             // e.g., "View on GitHub"
      href: string;             // e.g., "https://github.com/nprbst/speck"
    };
  };
  features: Array<{
    title: string;              // e.g., "Claude-Native Commands"
    description: string;        // e.g., "Slash commands optimized for..."
    icon: string;               // SVG icon name or inline SVG
  }>;
  comparison: {
    title: string;              // e.g., "Why Speck?"
    speckHighlights: string[];  // Array of benefits
    specKitHighlights: string[];// Array of spec-kit features
    ctaLink: string;            // Link to full comparison page
  };
}
```

**Data Source**: Hardcoded in `index.astro` (no external data source)

**Example**:
```astro
---
// pages/index.astro
const homeData: HomePageData = {
  hero: {
    headline: "Opinionated feature specs for Claude Code",
    subheadline: "Transform spec-kit into a Bun-powered, Claude-native workflow",
    ctaPrimary: { text: "Get Started", href: "/docs/getting-started/quick-start" },
    ctaSecondary: { text: "View on GitHub", href: "https://github.com/nprbst/speck" },
  },
  features: [
    {
      title: "Claude-Native Commands",
      description: "Slash commands designed for Claude Code, not generic bash",
      icon: "command-line",
    },
    {
      title: "Bun-Powered Runtime",
      description: "Fast builds, TypeScript support, modern JavaScript tooling",
      icon: "lightning",
    },
    {
      title: "Upstream Sync",
      description: "Pull updates from spec-kit while keeping your customizations",
      icon: "sync",
    },
  ],
  comparison: {
    title: "Speck vs Spec-Kit",
    speckHighlights: [
      "Bun runtime (fast, modern)",
      "Claude-native slash commands",
      "Opinionated workflow",
    ],
    specKitHighlights: [
      "Bash-based (universal)",
      "Language-agnostic",
      "Flexible customization",
    ],
    ctaLink: "/comparison",
  },
};
---
```

---

### 2.2 Documentation Page (`pages/docs/[...slug].astro`)

**Purpose**: Display markdown documentation with sidebar navigation

**Data Structure**:
```typescript
interface DocsPageData {
  currentDoc: {
    slug: string;               // URL slug
    title: string;              // From frontmatter
    description: string;        // From frontmatter
    category: string;           // From frontmatter
    content: string;            // Rendered markdown HTML
    headings: Array<{           // Table of contents
      depth: number;            // h2, h3, etc.
      text: string;
      slug: string;             // Anchor link
    }>;
  };
  sidebar: Array<{
    category: string;           // e.g., "Getting Started"
    docs: Array<{
      title: string;
      slug: string;
      isActive: boolean;        // Current page
    }>;
  }>;
  breadcrumbs: Array<{
    title: string;
    href: string;
  }>;
}
```

**Data Source**: Astro Content Collections API (`getCollection('docs')`)

**Example**:
```astro
---
// pages/docs/[...slug].astro
import { getCollection, getEntry } from 'astro:content';

export async function getStaticPaths() {
  const docs = await getCollection('docs');
  return docs.map(doc => ({
    params: { slug: doc.slug },
    props: { doc },
  }));
}

const { doc } = Astro.props;
const { Content, headings } = await doc.render();

// Build sidebar data
const allDocs = await getCollection('docs');
const sidebar = buildSidebar(allDocs, doc.slug);
---
```

---

### 2.3 Comparison Page (`pages/comparison.astro`)

**Purpose**: Side-by-side comparison of Speck vs Spec-Kit

**Data Structure**:
```typescript
interface ComparisonPageData {
  title: string;
  intro: string;
  comparisonTable: Array<{
    feature: string;            // e.g., "Runtime Environment"
    speck: string;              // e.g., "Bun 1.0+ (TypeScript native)"
    specKit: string;            // e.g., "Bash (universal compatibility)"
  }>;
  whenToUseSpeck: string[];     // Array of use cases
  whenToUseSpecKit: string[];   // Array of use cases
  migrationGuide: {
    title: string;
    steps: Array<{
      title: string;
      description: string;
      codeExample?: string;
    }>;
  };
}
```

**Data Source**: Hardcoded in `comparison.astro`

**Example**:
```astro
---
// pages/comparison.astro
const comparisonData: ComparisonPageData = {
  title: "Speck vs Spec-Kit",
  intro: "Both tools help you write feature specifications...",
  comparisonTable: [
    {
      feature: "Runtime Environment",
      speck: "Bun 1.0+ (TypeScript native, fast startup)",
      specKit: "Bash (universal compatibility, minimal dependencies)",
    },
    {
      feature: "Command Style",
      speck: "Claude-native slash commands (/speck.specify)",
      specKit: "Generic templating (language-agnostic)",
    },
    {
      feature: "Workflow Philosophy",
      speck: "Opinionated (specify → clarify → plan → tasks)",
      specKit: "Flexible (adapt to your process)",
    },
  ],
  whenToUseSpeck: [
    "You use Claude Code daily",
    "You want fast, TypeScript-powered builds",
    "You prefer opinionated workflows",
  ],
  whenToUseSpecKit: [
    "You need language-agnostic specs",
    "You work in constrained environments (no Bun)",
    "You want maximum customization freedom",
  ],
  migrationGuide: {
    title: "Migrating from Spec-Kit to Speck",
    steps: [
      {
        title: "Install Speck prerequisites",
        description: "Bun 1.0+, Git 2.30+, Claude Code",
        codeExample: "curl -fsSL https://bun.sh/install | bash",
      },
      {
        title: "Clone Speck repository",
        description: "Replace spec-kit with Speck in your project",
        codeExample: "git clone https://github.com/nprbst/speck.git",
      },
      // ...
    ],
  },
};
---
```

---

## 3. Component Data Models

### 3.1 Navigation Component

**File**: `src/components/Navigation.astro`

**Props Interface**:
```typescript
interface NavigationProps {
  currentPath: string;          // Current page URL for active state
  links: Array<{
    text: string;
    href: string;
    external?: boolean;         // Open in new tab
  }>;
  logo: {
    src: string;                // SVG path or inline SVG
    alt: string;
    href: string;               // Usually "/"
  };
  mobileBreakpoint?: number;    // Px value for hamburger menu (default: 768)
}
```

**Example Usage**:
```astro
<Navigation
  currentPath={Astro.url.pathname}
  links={[
    { text: "Docs", href: "/docs/getting-started/quick-start" },
    { text: "Examples", href: "/docs/examples" },
    { text: "Comparison", href: "/comparison" },
    { text: "GitHub", href: "https://github.com/nprbst/speck", external: true },
  ]}
  logo={{ src: "/images/speck-logo.svg", alt: "Speck", href: "/" }}
/>
```

---

### 3.2 CodeBlock Component

**File**: `src/components/CodeBlock.astro`

**Props Interface**:
```typescript
interface CodeBlockProps {
  code: string;                 // Raw code string
  language: string;             // Syntax highlighting language
  title?: string;               // Optional filename/title
  showLineNumbers?: boolean;    // Default: true
  highlightLines?: number[];    // Lines to highlight (e.g., [2, 4, 5])
  copyButton?: boolean;         // Default: true
}
```

**Example Usage**:
```astro
<CodeBlock
  code={`bun install\nbun run dev`}
  language="bash"
  title="terminal"
  showLineNumbers={false}
  copyButton={true}
/>
```

---

### 3.3 ThemeToggle Component

**File**: `src/components/ThemeToggle.astro`

**Props Interface**:
```typescript
interface ThemeToggleProps {
  defaultTheme?: 'light' | 'dark'; // Default: 'dark'
  position?: 'header' | 'footer';  // Styling hint
  iconSize?: number;               // Px value (default: 24)
}
```

**State Management**:
```typescript
// Client-side state (stored in localStorage)
interface ThemeState {
  current: 'light' | 'dark';
  userPreference: 'light' | 'dark' | 'system';
}
```

**Example Usage**:
```astro
<ThemeToggle defaultTheme="dark" position="header" />
```

---

### 3.4 FeatureCard Component

**File**: `src/components/FeatureCard.astro`

**Props Interface**:
```typescript
interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;                 // Icon name or inline SVG
  link?: {
    text: string;
    href: string;
  };
}
```

**Example Usage**:
```astro
<FeatureCard
  title="Claude-Native Commands"
  description="Slash commands optimized for Claude Code workflow"
  icon="command-line"
  link={{ text: "Learn more", href: "/docs/commands" }}
/>
```

---

## 4. State Management

**Philosophy**: No client-side state management library needed. Use:
1. **Browser APIs**: `localStorage` for theme preference
2. **URL State**: Query params for search (if implemented)
3. **Server State**: N/A (static site, no server)

**Theme Persistence**:
```typescript
// Saved to localStorage as JSON
interface PersistedTheme {
  theme: 'light' | 'dark';
  timestamp: number;            // When preference was set
}

// Example
localStorage.setItem('speck-theme', JSON.stringify({
  theme: 'dark',
  timestamp: Date.now(),
}));
```

---

## 5. Validation Rules

### 5.1 Content Validation (Zod Schemas)

**Location**: `website/src/content/config.ts`

**Rules**:
- All frontmatter fields validated against Zod schema at build time
- Build fails if invalid frontmatter detected (e.g., missing `title`, invalid `category`)
- Content Collections API provides TypeScript types automatically

### 5.2 Component Prop Validation

**Approach**: TypeScript interfaces enforce prop types at compile time

**Example**:
```typescript
// Type error if props don't match interface
<CodeBlock
  code="bun install"
  language="bash"
  invalidProp="value"  // ❌ TypeScript error
/>
```

---

## 6. Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────┐
│ Main Speck Repo (/docs directory)                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Git sparse checkout (build time)
                 │ via scripts/sync-docs.ts
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Website Repo (website/src/content/docs/)                │
│ - Markdown files with frontmatter                       │
│ - Validated by Zod schema                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Astro Content Collections API
                 │ getCollection('docs')
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Astro Pages (pages/docs/[...slug].astro)                │
│ - Render markdown to HTML                               │
│ - Build sidebar navigation                              │
│ - Generate static HTML files                            │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Astro build (bun run build)
                 │ Outputs to dist/
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Cloudflare Pages (CDN)                                  │
│ - Serves static HTML/CSS/JS                             │
│ - Global edge caching                                   │
│ - Auto-rebuilds on GitHub webhook                       │
└─────────────────────────────────────────────────────────┘
```

---

## 7. File Naming Conventions

**Content Files**:
- Lowercase kebab-case: `quick-start.md`, `command-reference.md`
- Category prefix in slug: `getting-started/quick-start.md`

**Component Files**:
- PascalCase: `Navigation.astro`, `CodeBlock.astro`, `ThemeToggle.astro`

**Page Files**:
- Lowercase kebab-case: `index.astro`, `comparison.astro`
- Dynamic routes: `[...slug].astro`, `[category].astro`

**Style Files**:
- Lowercase kebab-case: `global.css`, `theme.css`

---

## 8. SEO Metadata Model

**Location**: `src/layouts/BaseLayout.astro`

**Schema**:
```typescript
interface SEOMetadata {
  title: string;                // Page title (<title> tag)
  description: string;          // Meta description (max 160 chars)
  canonical: string;            // Canonical URL
  ogImage?: string;             // Open Graph image URL
  ogType?: string;              // Open Graph type (default: "website")
  twitterCard?: string;         // Twitter card type (default: "summary_large_image")
  keywords?: string[];          // Meta keywords (optional)
}
```

**Example**:
```astro
---
// layouts/BaseLayout.astro
interface Props {
  seo: SEOMetadata;
}

const { seo } = Astro.props;
---

<head>
  <title>{seo.title}</title>
  <meta name="description" content={seo.description} />
  <link rel="canonical" href={seo.canonical} />
  <meta property="og:title" content={seo.title} />
  <meta property="og:description" content={seo.description} />
  <meta property="og:image" content={seo.ogImage} />
  <meta property="og:type" content={seo.ogType || 'website'} />
  <meta name="twitter:card" content={seo.twitterCard || 'summary_large_image'} />
  {seo.keywords && <meta name="keywords" content={seo.keywords.join(', ')} />}
</head>
```

---

## Summary

**Total Content Types**: 1 (Documentation Collection)
**Total Page Types**: 3 (Homepage, Docs, Comparison)
**Total Components**: 4 (Navigation, CodeBlock, ThemeToggle, FeatureCard)

**Key Relationships**:
- Docs collection → Documentation pages (1:N)
- Homepage → Feature cards (1:N)
- All pages → Navigation (N:1)

**Validation Strategy**:
- Build-time Zod validation for content
- Compile-time TypeScript validation for components
- Runtime accessibility validation via Axe-core tests

**Next**: Generate component API contracts in `contracts/`
