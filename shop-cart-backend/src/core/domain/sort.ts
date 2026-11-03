import { z } from 'zod';

export const DireccionSchema = z.enum(['asc', 'desc']).default('desc');

export type Direccion = z.infer<typeof DireccionSchema>;
