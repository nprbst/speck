// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
// Using 'server' output with prerender:true on static pages
// API routes use prerender:false for SSR
export default defineConfig({
  site: 'https://beta.speck.codes',
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true, // Enable local access to D1 bindings
    },
  }),
  integrations: [
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
});
