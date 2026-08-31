/**
 * The admin assistant: a manual tool-use loop over Gemini, scoped to the
 * read-only tools in lib/ai/tools.ts. Called from
 * app/api/assistant/route.ts, which owns the session check.
 */

import { GoogleGenAI, ThinkingLevel, type Content, type Part } from "@google/genai";

import { ASSISTANT_TOOLS, runTool } from "@/lib/ai/tools";

// Pinned, not the "-latest" alias: that alias hot-swaps onto whatever
// flash-tier model Google ships next — including preview releases — and
// carries its price with it.
//
// Flash rather than the lite tier it started on: lite picked the wrong one of
// the four tools often enough that staff got a confident answer about the
// wrong record, which is worse than a slow one.
const MODEL = "gemini-3.7-flash";

// Confusing-loop safety valve, not an expected path — each tool call is one
// lookup, so a real question resolves in one or two iterations. Kept tight
// because every extra pass re-sends the whole conversation.
const MAX_ITERATIONS = 3;

// Older turns are dropped before the request. A lookup is self-contained —
// where RL-260804TXI has got to doesn't depend on what was asked twenty
// questions ago — so carrying the whole transcript would grow the input on
// every turn and buy nothing. Even, so a trimmed history still starts on a
// user turn rather than a dangling model reply.
const MAX_HISTORY = 8;

// Tools that answer in finished markdown (see lib/ai/tools.ts). A lone call
// to one of these is already the reply, so the loop yields it straight to the
// client: sending it back for the model to retype would charge output rates
// for text that is done — and, for an order, would put the fields back in
// whatever order that turn felt like.
//
// All three lookups are in it, which makes a one-tool turn the normal path and
// a model-written answer the exception. current_time is deliberately out: it is
// as often a step towards an answer as the answer itself, so it goes back for
// the model to use — which is exactly the turn daily_sales needs before it can
// name a date. Two calls in one turn also fall through, because two results
// have to be reconciled below.
const DISPLAY_READY_TOOLS = new Set(["lookup_order", "list_products", "daily_sales"]);

const SYSTEM_PROMPT = `You are Haikuu, the admin assistant for RALLA, a cosmetics store. You're a girl — use she/her for yourself if asked. Staff use you to look up records they'd otherwise search for by hand.

Always respond in Burmese (မြန်မာဘာသာ) only, no matter what language the question is asked in.

You have four tools, all read-only:
- lookup_order: one order by its RL- code.
- list_products: price and stock. No input browses the catalog; a name or SKU checks one product; stockBelow lists what is running out, emptiest first — pass the number staff name, or 10 if they don't name one.
- current_time: the date and time right now in Myanmar. Call it for anything resting on today's date — "today", "yesterday", "how many days ago" — instead of guessing the date, which you have no way to know on your own.
- daily_sales: order count and takings for ONE day, given as YYYY-MM-DD. For "yesterday" or "last Monday", call current_time first, work out that date, then pass it. It totals one day only — if staff ask about a week, a month or "so far", say you can only do a single day and ask which one.

That is everything you can do. You cannot change any data, and beyond a single day's takings you have no way to answer questions about revenue, status counts, money still owed or which orders have gone quiet — say plainly that you can't look that up rather than working it out from an order or a product list. If a lookup finds nothing, say so plainly rather than guessing or making up details.

When a tool result does come back to you, quote its figures exactly as they arrived. No padding: don't restate the question, don't offer advice, don't add anything the tools didn't say.`;

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
  const contents: Content[] = history.slice(-MAX_HISTORY).map(toContent);

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stream = await getClient().models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: ASSISTANT_TOOLS }],
        // Enough thinking to read four tool descriptions and choose between
        // them — picking the tool is the step lite got wrong — and not enough
        // to pay for a deliberation on "how is the shop doing".
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        // Thinking tokens count against this cap too, and Burmese runs several
        // tokens a syllable, so 1024 cut answers off mid-sentence.
        maxOutputTokens: 2048,
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

    // One call to a display-ready tool is the whole answer: skip the second
    // model turn and yield it. A turn calling two tools still goes through the
    // normal functionResponse flow below, because two results have to be
    // reconciled into one reply and only the model can do that.
    const [only] = functionCalls;
    if (functionCalls.length === 1 && only.name && DISPLAY_READY_TOOLS.has(only.name)) {
      yield await runTool(only.name, only.args ?? {});
      return;
    }

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
