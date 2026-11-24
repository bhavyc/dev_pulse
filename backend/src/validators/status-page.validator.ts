import { z } from 'zod';

export const createStatusPageSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    slug: z
      .string()
      .min(3, 'Slug must be at least 3 characters')
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    description: z.string().max(250).optional().nullable(),
    isPublic: z.boolean().default(true),
    monitorIds: z.array(z.string().uuid()).min(1, 'Select at least one monitor to display'),
  }),
});

export const updateStatusPageSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    slug: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    description: z.string().max(250).optional().nullable(),
    isPublic: z.boolean().optional(),
    monitorIds: z.array(z.string().uuid()).optional(),
  }),
});
