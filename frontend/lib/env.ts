import { z } from "zod";

const serverEnvSchema = z.object({
  FASTAPI_URL: z.string().url().default("http://localhost:8000"),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8000"),
});

export const serverEnv = serverEnvSchema.parse(process.env);
export const publicEnv = publicEnvSchema.parse(process.env);
