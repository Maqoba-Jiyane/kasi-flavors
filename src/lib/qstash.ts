// src/lib/qstash.ts
import { Client } from "@upstash/qstash";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const qstash = new Client({
  token: getRequiredEnv("QSTASH_TOKEN"),
  baseUrl: process.env.QSTASH_URL || undefined,
});