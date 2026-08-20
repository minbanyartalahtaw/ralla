/**
 * The admin assistant: a manual tool-use loop over Gemini, scoped to the
 * two read-only lookups in lib/ai/tools.ts. Called from
 * app/api/assistant/route.ts, which owns the session check.
 */

import { GoogleGenAI, type Content, type Part } from "@google/genai";

import { ASSISTANT_TOOLS, runTool } from "@/lib/ai/tools";

// "-latest" alias so this always resolves to Google's current flash-tier
// model instead of a pinned id going stale.
const MODEL = "gemini-flash-latest";

// Confusing-loop safety valve, not an expected path — each tool call is one
// lookup, so a real question resolves in one or two iterations.
const MAX_ITERATIONS = 6;

const SYSTEM_PROMPT = `You are Haikuu, the admin assistant for RALLA, a cosmetics store. You're a girl — use she/her for yourself if asked. Staff use you to look up records they'd otherwise search for by hand.

Always respond in Burmese (မြန်မာဘာသာ) only, no matter what language the question is asked in.

You have exactly two tools:
- lookup_order: takes an RL- order/invoice code.
- list_products: returns a Name/SKU/Stock table. Call it with no input to browse the whole catalog, or with a product name or SKU to check one product's stock.

You do not look up customers. If asked to find or search for a customer, say you can't and suggest the Customer page instead.

Only use these tools for lookups; you cannot change any data. If a lookup finds nothing, say so plainly rather than guessing or making up details. Keep answers short and factual.`;

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Lazy so a missing API key only breaks the assistant, not the whole module
// graph, if this file is ever imported before the env is set.
let client: GoogleGenAI | undefined;
function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({});
  return client;
}

function toContent(message: ChatMessage): Content {
  return {
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  };
}

/**
 * Yields text deltas as they arrive so the sheet can render them live.
 * A tool-calling turn has no visible text of its own — the loop just
 * resolves it and moves on — so what actually streams to the client is
 * whichever turn ends up being the final, tool-free answer.
 */
export async function* runAssistant(history: ChatMessage[]): AsyncGenerator<string> {
  const contents: Content[] = history.map(toContent);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = await getClient().models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: ASSISTANT_TOOLS }],
        maxOutputTokens: 1024,
      },
    });

    // Collect the raw parts as they stream in, rather than re-deriving them
    // from the .text/.functionCalls getters — a functionCall part can carry
    // a thoughtSignature the model expects back verbatim next turn, and only
    // forwarding the parts as-is preserves that.
    const parts: Part[] = [];
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
      const chunkParts = chunk.candidates?.[0]?.content?.parts;
      if (chunkParts) parts.push(...chunkParts);
    }

    const functionCalls = parts.flatMap((part) => (part.functionCall ? [part.functionCall] : []));
    if (functionCalls.length === 0) return;

    contents.push({ role: "model", parts });

    const responseParts = await Promise.all(
      functionCalls.map(async (call) => ({
        functionResponse: {
          id: call.id,
          name: call.name,
          response: { result: await runTool(call.name ?? "", call.args ?? {}) },
        },
      })),
    );

    contents.push({ role: "user", parts: responseParts });
  }

  yield "ဒီရှာဖွေမှုကို မပြီးမြောက်နိုင်ခဲ့ပါ — မေးခွန်းကို ပြန်ပြောင်းပြီး မေးကြည့်ပါ။";
}
