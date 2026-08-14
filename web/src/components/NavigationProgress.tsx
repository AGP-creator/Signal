"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Top progress bar while client navigations fetch force-dynamic pages. */
export function NavigationProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPending(false);
    if (safetyTimer.current) {
      clearTimeout(safetyTimer.current);
      safetyTimer.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    function clearSafety() {
      if (safetyTimer.current) {
        clearTimeout(safetyTimer.current);
        safetyTimer.current = null;
      }
    }

    function armSafety() {
      clearSafety();
      safetyTimer.current = setTimeout(() => setPending(false), 10000);
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }
      if (/^(https?:)?\/\//i.test(href) && !href.startsWith(window.location.origin)) {
        return;
      }

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }

      setPending(true);
      armSafety();
    }

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearSafety();
    };
  }, []);

  if (!pending) return null;

  return (
    <div className="nav-progress" role="progressbar" aria-label="Loading page" aria-busy="true">
      <div className="nav-progress-bar" />
    </div>
  );
}
