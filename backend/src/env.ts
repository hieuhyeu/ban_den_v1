import { z } from 'zod'

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().optional(),
})

export type Env = z.infer<typeof EnvSchema>

export function getEnv(): Env {
  return EnvSchema.parse(process.env)
}

