// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://speck.dev', // Will use cloudflare.pages.dev subdomain until custom domain configured
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'), // Exclude 404 page from sitemap
    }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
  vite: {
    optimizeDeps: {
      include: ['asciinema-player'],
    },
    ssr: {
      noExternal: ['asciinema-player'],
    },
  },
});
