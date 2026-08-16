import fs from "node:fs";
import OpenAI from "openai";
import type { FixRequest } from "./fixer";

const client = new OpenAI();

export async function generateFix(
  fixRequest: FixRequest
): Promise<string> {
  const fileContent = fs.readFileSync(fixRequest.file, "utf8");

  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    instructions: [
      "You are a code migration assistant.",
      "Return only the complete updated source file.",
      "Do not use Markdown code fences.",
      "Do not explain the change.",
      "Do not modify unrelated code."
    ].join("\n"),
    input: [
      fixRequest.instruction,
      "",
      `Target line: ${fixRequest.line}`,
      `Detected code: ${fixRequest.originalCode}`,
      "",
      "Complete current file:",
      fileContent
    ].join("\n")
  });

  return response.output_text.trim();
}