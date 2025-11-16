/**
 * Content Collection Configuration
 * Defines Zod schemas for documentation content validation
 */

import { defineCollection, z } from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().max(100, 'Title must be 100 characters or less'),
    description: z.string().max(200, 'Description must be 200 characters or less'),
    category: z.enum([
      'getting-started',
      'commands',
      'concepts',
      'examples',
    ], {
      errorMap: () => ({ message: 'Category must be one of: getting-started, commands, concepts, examples' }),
    }),
    order: z.number().int().positive({ message: 'Order must be a positive integer' }),
    lastUpdated: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = {
  docs: docsCollection,
};
