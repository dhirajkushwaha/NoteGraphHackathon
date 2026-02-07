
"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { usePathname } from "next/navigation";

export default function SmoothScroller({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const smootherRef = useRef<any>(null);
  const pathname = usePathname();

  useLayoutEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    let mounted = true;

    (async () => {
      if (!mounted) return;

      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { ScrollSmoother } = await import("gsap/ScrollSmoother");
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

      const setupSmoother = () => {
        if (!wrapperRef.current || !contentRef.current) return;

        const isTouch =
          "ontouchstart" in window || navigator.maxTouchPoints > 0;

        // kill previous smoother if exists
        const existing = (ScrollSmoother as any).get?.();
        if (existing) existing.kill();

        if (isTouch) {
          // 🚫 disable GSAP on mobile
          smootherRef.current = null;
          return;
        }

        // ✅ enable GSAP on desktop
        const created = ScrollSmoother.create({
          wrapper: wrapperRef.current,
          content: contentRef.current,
          smooth: 0.6,
          smoothTouch: false,
          effects: true,
          normalizeScroll: true,
        });

        smootherRef.current = created;
        created.scrollTop(0);
        ScrollTrigger.refresh();
      };

      setupSmoother();

      // 🔄 re-run when resizing between mobile/desktop
      window.addEventListener("resize", setupSmoother);

      return () => {
        window.removeEventListener("resize", setupSmoother);
        const existing = (ScrollSmoother as any).get?.();
        if (existing) existing.kill();
        smootherRef.current = null;
      };
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Reset to top on route change too
  useLayoutEffect(() => {
    if (smootherRef.current) {
      smootherRef.current.scrollTop(0, true);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <div ref={wrapperRef} id="smooth-wrapper" style={{ overflow: "hidden" }}>
      <div ref={contentRef} id="smooth-content">
        {children}
      </div>
    </div>
  );
}
