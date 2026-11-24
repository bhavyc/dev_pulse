import { z } from 'zod';
import { HttpMethod } from '@devpulse/shared';

const validIntervals = [300, 600, 900, 1800]; // 5m, 10m, 15m, 30m

export const createMonitorSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Monitor name must be at least 2 characters').max(100),
    url: z.string().url('Please enter a valid HTTP or HTTPS URL'),
    httpMethod: z.nativeEnum(HttpMethod).default(HttpMethod.GET),
    checkIntervalSeconds: z
      .number()
      .refine((val) => validIntervals.includes(val), {
        message: 'Monitoring interval must be 300, 600, 900, or 1800 seconds (min. 5 minutes)',
      })
      .default(300),
    timeoutSeconds: z.number().min(1).max(30).default(10),
    expectedStatusCodes: z.array(z.number().int()).min(1, 'At least one expected status code required').default([200]),
    requestHeaders: z.record(z.string()).optional().nullable(),
    requestBody: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
  }),
});

export const updateMonitorSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    url: z.string().url().optional(),
    httpMethod: z.nativeEnum(HttpMethod).optional(),
    checkIntervalSeconds: z.number().refine((val) => validIntervals.includes(val)).optional(),
    timeoutSeconds: z.number().min(1).max(30).optional(),
    expectedStatusCodes: z.array(z.number().int()).min(1).optional(),
    requestHeaders: z.record(z.string()).optional().nullable(),
    requestBody: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
    isPaused: z.boolean().optional(),
  }),
});
