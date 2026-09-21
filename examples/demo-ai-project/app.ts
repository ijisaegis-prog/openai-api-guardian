import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createXai } from "@ai-sdk/xai";
import { Mistral } from "@mistralai/mistralai";

const openai = new OpenAI();
const anthropic = new Anthropic();
const xai = createXai({ apiKey: process.env.XAI_API_KEY });
const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

async function demo() {
  await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    messages: [{ role: "user", content: "Hello" }],
  });

  await anthropic.messages.create({
    model: "claude-opus-4-1-20250805",
    max_tokens: 64,
    messages: [{ role: "user", content: "Hello" }],
  });

  void xai;
  void mistral;
}

void demo;
