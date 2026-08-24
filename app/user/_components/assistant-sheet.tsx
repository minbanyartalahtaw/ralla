"use client";

import * as React from "react";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { MultiplicationSignCircleIcon, SentIcon, SparklesIcon } from "@hugeicons/core-free-icons";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Tight, bubble-sized overrides — the default browser spacing (block margins,
// bullet indents) is tuned for a full page, not a 3xl-wide chat message.
const MARKDOWN_COMPONENTS: Components = {
  p: ({ ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ ...props }) => <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0" {...props} />,
  ol: ({ ...props }) => <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0" {...props} />,
  a: ({ ...props }) => (
    <a className="underline underline-offset-2" target="_blank" rel="noreferrer" {...props} />
  ),
  code: ({ ...props }) => (
    <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/10" {...props} />
  ),
  pre: ({ ...props }) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-black/10 p-2 last:mb-0 dark:bg-white/10" {...props} />
  ),
  // Tool results (list_products) come back as a GFM table — remarkGfm below
  // is what turns the `|` syntax into actual <table> markup in the first
  // place, this just keeps it readable at bubble width.
  table: ({ ...props }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-left" {...props} />
    </div>
  ),
  thead: ({ ...props }) => <thead className="border-b border-black/10 dark:border-white/10" {...props} />,
  th: ({ ...props }) => <th className="px-2 py-1 font-semibold" {...props} />,
  td: ({ ...props }) => <td className="px-2 py-1" {...props} />,
  tr: ({ ...props }) => <tr className="border-b border-black/5 last:border-0 dark:border-white/5" {...props} />,
};

const PLACEHOLDER = "Ask anything ...";

// Fixed wording, not AI-generated — quick-send shortcuts for the questions
// staff ask most, shown above the input.
const SUGGESTIONS = ["ပစ္စည်း Stock တွေပြပေး","Order ရှာပေးပါ","ဘာတွေကူညီပေးနိုင်လည်း"];

export function AssistantSheet() {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // `open` is a dependency too, not just new messages, so reopening a past
  // conversation lands on the latest message instead of wherever it was
  // last scrolled. The rAF defers past the Popup's entrance transition
  // (Base UI stays mounted the whole time — it toggles the `hidden`
  // attribute rather than unmounting — but the reopen still repaints the
  // popup, and scrolling in the same tick as that measures a stale layout).
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
    return () => cancelAnimationFrame(raf);
  }, [messages, pending, open]);

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || pending) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        setError(
          res.status === 401
            ? "Your session expired — sign in again to keep using the assistant."
            : "Something went wrong. Try again.",
        );
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const delta = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [...prev.slice(0, -1), { ...last, content: last.content + delta }];
        });
      }
    } catch {
      setError("Couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" />}>
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
        <span className="sr-only">Open assistant</span>
      </SheetTrigger>
      {/* Full screen below sm: only this sheet, not the base component —
          components/ui/sheet.tsx also backs the mobile sidebar drawer, which
          should stay a 3/4-width panel. sm:max-w-sm from the base classes
          still caps this at larger viewports since it's a max-width, not a
          width override, so it keeps winning over w-full there. */}
      <SheetContent className="p-0 data-[side=right]:w-full">
        <div ref={listRef} className="thin-scrollbar flex flex-1 flex-col overflow-y-auto">
          {/* p-4 instead of the default p-6: the close button is absolutely
              positioned at top-4/right-4 off SheetContent's edge, not this
              header's padding box, so matching its 16px offset — plus a
              size-6 badge, the same box size as the icon-sm close button —
              is what makes the two rows land on the same vertical center.
              sticky keeps it pinned above the scrolling messages; the fill
              is the opaque popover bg so the rows underneath don't show
              through as they scroll past. No explicit z-index: sticky alone
              already outranks the non-positioned message content it scrolls
              under, and adding one would outrank SheetContent's close
              button too, since the scroll wrapper here isn't itself a
              stacking context. */}
          <SheetHeader className="sticky top-0 border-b border-border/50 bg-popover p-4">
            <div className="flex items-center gap-2">
              <span className="relative flex size-9 shrink-0">
                <Image src="/ai-logo.webp" alt="" width={36} height={36} className="rounded-sm" />
                <span className="absolute right-0 bottom-0 size-1.5 rounded-full bg-delivered ring-2 ring-popover" />
              </span>
              <SheetTitle>Haikuu</SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex flex-1 flex-col p-4">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
                </span>
                <p className="max-w-[220px] text-muted-foreground">{PLACEHOLDER}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages
                  // An assistant message starts empty and fills in as the
                  // stream arrives — nothing to render yet, the typing dots
                  // below stand in for it until the first chunk lands.
                  .filter((message) => message.content !== "")
                  .map((message, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-2xl px-3 py-2",
                        message.role === "user"
                          ? "ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-br-sm bg-primary text-primary-foreground"
                          : "w-full rounded-bl-sm bg-muted text-foreground",
                      )}
                    >
                      {message.role === "user" ? (
                        message.content
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  ))}
                {pending &&
                  (() => {
                    const last = messages[messages.length - 1];
                    return last.role === "user" || last.content === "";
                  })() && (
                    <div className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2.5">
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                    </div>
                  )}
              </div>
            )}
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-pending-soft px-3 py-2 text-pending">
                <HugeiconsIcon icon={MultiplicationSignCircleIcon} strokeWidth={2} className="mt-0.5 size-3.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          {/* sticky bottom-0, same glass treatment (and same no-z-index
              reasoning) as the header above. */}
          <div className="sticky bottom-0 bg-popover/40 p-3 shadow-[0_-8px_16px_-12px_rgba(0,0,0,0.35)] supports-backdrop-filter:backdrop-blur-xl">
            <div className="no-scrollbar mb-2 flex flex-nowrap gap-1.5 overflow-x-auto">
              {SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto shrink-0 rounded-full px-3 py-1"
                  onClick={() => void send(suggestion)}
                  disabled={pending}
                >
                  {suggestion}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-input bg-input/20 p-1.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-input/30">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDER}
                className="min-h-8 flex-1 resize-none rounded-none border-0 bg-transparent px-1.5 py-1 shadow-none focus-visible:ring-0 dark:bg-transparent"
                disabled={pending}
              />
              <Button
                size="icon-sm"
                onClick={() => void send()}
                disabled={pending || !input.trim()}
                aria-label="Send"
              >
                <HugeiconsIcon icon={SentIcon} strokeWidth={2} />
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
