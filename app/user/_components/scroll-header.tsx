"use client";

import { useEffect, useRef, useState } from "react";

/** Movement a single gesture needs before the header flips, so that a trackpad
    nudge — or the browser's own scroll-anchoring after a status change — can't
    make it flicker. Small moves accumulate rather than being discarded. */
const DELTA = 6;

/** The header's own height. Above it there is nothing to uncover. */
const HEADER = 56;

export function ScrollHeader({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    let frame = 0;

    const onScroll = () => {
      // The listener fires far more often than the screen repaints; one read of
      // scrollY per frame is enough and keeps the layout out of the handler.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const dy = y - lastY.current;
        // Deliberately leaves lastY alone, so a slow drag past the threshold
        // still counts instead of being thrown away a pixel at a time.
        if (Math.abs(dy) < DELTA) return;
        // iOS reports negative offsets while overscrolling at the top, which
        // reads as scrolling up and would be right by accident — the clamp is
        // what makes the top of the page always show the header.
        setHidden(y > HEADER && dy > 0);
        lastY.current = y;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      data-hidden={hidden || undefined}
      // A hidden header is still in the tab order — it is translated, not
      // removed — so tabbing into the sidebar trigger or the assistant button
      // has to bring it back rather than move focus somewhere invisible.
      onFocusCapture={() => setHidden(false)}
      className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4 transition-transform duration-200 ease-out data-hidden:-translate-y-full motion-reduce:transition-none"
    >
      {children}
    </header>
  );
}
