import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/config/env";

export interface LlmCompletionOptions {
  systemInstruction?: string;
  temperature?: number;
  jsonMode?: boolean;
}

export class LlmProvider {
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor() {
    const env = getEnv();
    if (env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  /**
   * Generates completion using Gemini 2.0 Flash (or returns simulated intelligence in dev/offline mode).
   */
  async generate(prompt: string, options: LlmCompletionOptions = {}): Promise<string> {
    const env = getEnv();

    if (this.geminiClient && env.GEMINI_API_KEY) {
      try {
        const model = this.geminiClient.getGenerativeModel({
          model: "gemini-2.0-flash",
          systemInstruction: options.systemInstruction,
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            responseMimeType: options.jsonMode ? "application/json" : "text/plain",
          },
        });

        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (err) {
        console.warn("[LlmProvider] Gemini call failed, falling back:", err);
      }
    }

    // Fallback: If no API key or API call failed, provide deterministic structured reasoning
    if (options.jsonMode) {
      return JSON.stringify({
        status: "simulated_intelligence",
        note: "Configured without GEMINI_API_KEY. Set GEMINI_API_KEY in .env.local for live neural inference.",
      });
    }

    return "System running in local offline deterministic mode. Set GEMINI_API_KEY for live neural intelligence synthesis.";
  }
}

export const llmProvider = new LlmProvider();
