import { isSignedIn } from "@/lib/auth";
import { runAssistant, type ChatMessage } from "@/lib/ai/assistant";

/**
 * Deliberately outside /user: proxy.ts redirects an unauthenticated request
 * under /user to /login with a 30x, which would break a fetch() call
 * expecting JSON back. Gated by hand instead, same as a Server Action.
 */
export async function POST(request: Request) {
  if (!(await isSignedIn())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = (await request.json()) as { messages: ChatMessage[] };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of runAssistant(messages)) {
          controller.enqueue(encoder.encode(delta));
        }
      } catch (error) {
        controller.error(error);
        return;
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
