// src/lib/ai/groq.ts
import Groq from "groq-sdk";

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const GROQ_MENU_VISION_MODEL =
  process.env.GROQ_MENU_VISION_MODEL ||
  "meta-llama/llama-4-scout-17b-16e-instruct";

export const GROQ_MENU_TEXT_MODEL =
  process.env.GROQ_MENU_TEXT_MODEL || "llama-3.3-70b-versatile";