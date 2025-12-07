/**
 * Raw Markdown Endpoint
 * Serves documentation pages as raw markdown for LLM consumption
 * Following the llms.txt specification: https://llmstxt.org/
 */

import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection('docs');
  // Filter out draft and redirect pages
  const publishedDocs = docs.filter((doc) => !doc.data.draft && !doc.data.redirect);

  return publishedDocs.map((doc) => ({
    params: { slug: doc.slug },
    props: { entry: doc },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { entry } = props as { entry: Awaited<ReturnType<typeof getCollection<'docs'>>>[number] };

  // Return raw markdown content
  return new Response(entry.body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
};
