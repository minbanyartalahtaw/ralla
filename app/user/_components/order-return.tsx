"use client";

import { useEffect } from "react";

const KEY = "ralla.order-return";
const MAX_AGE = 60 * 60 * 1000;
const WAIT = 3000;
const HEADER = 72;

function remembered(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code?: unknown; at?: unknown };
    if (typeof code !== "string" || typeof at !== "number") return null;
    return Date.now() - at > MAX_AGE ? null : code;
  } catch {
    return null;
  }
}

function forget() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

function find(code: string) {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-order-code]"),
  ).find((el) => el.dataset.orderCode === code && el.getClientRects().length > 0);
}

export function OrderReturn() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let poll = 0;
    let flash = 0;

    function reveal(el: HTMLElement) {
      const rect = el.getBoundingClientRect();
      const inView =
        rect.top >= HEADER && rect.bottom <= window.innerHeight - 16;
      let delay = 0;
      if (!inView) {
        el.scrollIntoView({
          block: "center",
          behavior: reduced.matches ? "auto" : "smooth",
        });
        delay = reduced.matches ? 0 : 380;
      }
      window.clearTimeout(flash);
      flash = window.setTimeout(() => {
        el.removeAttribute("data-returned");
        void el.offsetWidth;
        el.setAttribute("data-returned", "");
        el.addEventListener(
          "animationend",
          () => el.removeAttribute("data-returned"),
          { once: true },
        );
      }, delay);
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest("a[href]");
      const owner = link?.closest<HTMLElement>("[data-order-code]");
      const code = owner?.dataset.orderCode;
      if (!code) return;
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ code, at: Date.now() }));
      } catch {}
    }

    function onPop() {
      const code = remembered();
      if (!code) return;
      window.clearInterval(poll);
      const started = Date.now();
      const tick = () => {
        const el = find(code);
        if (el) {
          window.clearInterval(poll);
          forget();
          reveal(el);
        } else if (Date.now() - started > WAIT) {
          window.clearInterval(poll);
        }
      };
      poll = window.setInterval(tick, 60);
      tick();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
      window.clearInterval(poll);
      window.clearTimeout(flash);
    };
  }, []);

  return null;
}
