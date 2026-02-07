// "use client";

// import React, { useLayoutEffect, useRef } from "react";
// import gsap from "gsap";
// import { usePathname } from "next/navigation";

// export default function SmoothScroller({ children }: { children: React.ReactNode }) {
//   const wrapperRef = useRef<HTMLDivElement | null>(null);
//   const contentRef = useRef<HTMLDivElement | null>(null);
//   const smootherRef = useRef<any>(null);
//   const pathname = usePathname();

//   useLayoutEffect(() => {
//     if ("scrollRestoration" in history) {
//       history.scrollRestoration = "manual";
//     }
//     window.scrollTo(0, 0);

//     let mounted = true;
//     let created: any = null;

//     (async () => {
//       if (!mounted) return;

//       const { ScrollTrigger } = await import("gsap/ScrollTrigger");
//       const { ScrollSmoother } = await import("gsap/ScrollSmoother");
//       gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

//       if (!wrapperRef.current || !contentRef.current) return;

//       // 🚫 disable GSAP on mobile/touch devices
//       const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
//       if (isTouch) {
//         smootherRef.current = null;
//         return;
//       }

//       // kill previous smoother
//       const existing = (ScrollSmoother as any).get?.();
//       if (existing) existing.kill();

//       created = ScrollSmoother.create({
//         wrapper: wrapperRef.current,
//         content: contentRef.current,
//         smooth: 0.6,        // smooth scroll for desktop
//         smoothTouch: false, // disabled anyway
//         effects: true,
//         normalizeScroll: true,
//       });

//       smootherRef.current = created;
//       created.scrollTop(0);
//       ScrollTrigger.refresh();
//     })();

//     return () => {
//       mounted = false;
//       if (created) {
//         try {
//           created.kill();
//         } catch (e) {}
//         created = null;
//         smootherRef.current = null;
//       }
//     };
//   }, []);

//   // Reset to top on route change too
//   useLayoutEffect(() => {
//     if (smootherRef.current) {
//       smootherRef.current.scrollTop(0, true);
//     } else {
//       window.scrollTo(0, 0);
//     }
//   }, [pathname]);

//   return (
//     <div ref={wrapperRef} id="smooth-wrapper" style={{ overflow: "hidden" }}>
//       <div ref={contentRef} id="smooth-content">
//         {children}
//       </div>
//     </div>
//   );
// }


// backup as of 251212:

// "use client";

// import React, { useLayoutEffect, useRef } from "react";
// import gsap from "gsap";
// import { usePathname } from "next/navigation";

// export default function SmoothScroller({ children }: { children: React.ReactNode }) {
//   const wrapperRef = useRef<HTMLDivElement | null>(null);
//   const contentRef = useRef<HTMLDivElement | null>(null);
//   const smootherRef = useRef<any>(null);
//   const pathname = usePathname();

//   useLayoutEffect(() => {
//     if ("scrollRestoration" in history) {
//       history.scrollRestoration = "manual";
//     }
//     window.scrollTo(0, 0);

//     let mounted = true;

//     (async () => {
//       if (!mounted) return;

//       const { ScrollTrigger } = await import("gsap/ScrollTrigger");
//       const { ScrollSmoother } = await import("gsap/ScrollSmoother");
//       gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

//       const setupSmoother = () => {
//         if (!wrapperRef.current || !contentRef.current) return;

//         const isTouch =
//           "ontouchstart" in window || navigator.maxTouchPoints > 0;

//         // kill previous smoother if exists
//         const existing = (ScrollSmoother as any).get?.();
//         if (existing) existing.kill();

//         if (isTouch) {
//           // 🚫 disable GSAP on mobile
//           smootherRef.current = null;
//           return;
//         }

//         // ✅ enable GSAP on desktop
//         const created = ScrollSmoother.create({
//           wrapper: wrapperRef.current,
//           content: contentRef.current,
//           smooth: 0.6,
//           smoothTouch: false,
//           effects: true,
//           normalizeScroll: true,
//         });

//         smootherRef.current = created;
//         created.scrollTop(0);
//         ScrollTrigger.refresh();
//       };

//       setupSmoother();

//       // 🔄 re-run when resizing between mobile/desktop
//       window.addEventListener("resize", setupSmoother);

//       return () => {
//         window.removeEventListener("resize", setupSmoother);
//         const existing = (ScrollSmoother as any).get?.();
//         if (existing) existing.kill();
//         smootherRef.current = null;
//       };
//     })();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   // Reset to top on route change too
//   useLayoutEffect(() => {
//     if (smootherRef.current) {
//       smootherRef.current.scrollTop(0, true);
//     } else {
//       window.scrollTo(0, 0);
//     }
//   }, [pathname]);

//   return (
//     <div ref={wrapperRef} id="smooth-wrapper" style={{ overflow: "hidden" }}>
//       <div ref={contentRef} id="smooth-content">
//         {children}
//       </div>
//     </div>
//   );
// }







// 251212 latest



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
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Always start at top on mount
    window.scrollTo(0, 0);

    let mounted = true;

    async function initSmoother() {
      // guard
      if (!mounted) return;

      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { ScrollSmoother } = await import("gsap/ScrollSmoother");
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

      if (!wrapperRef.current || !contentRef.current) return;

      // kill any previous instance
      const existing = (ScrollSmoother as any).get?.();
      if (existing) existing.kill();

      // Create smoother for all devices (no isTouch gating)
      const created = ScrollSmoother.create({
        wrapper: wrapperRef.current,
        content: contentRef.current,
        smooth: 0.6,
        smoothTouch: 0.1,
        effects: true,
        normalizeScroll: true,
      });

      smootherRef.current = created;

      // ensure top position and refresh triggers
      created.scrollTop(0);
      ScrollTrigger.refresh();
    }

    initSmoother();

    // re-init on resize (keeps handler stable)
    const onResize = () => {
      // small debounce-like protection: kill and re-init
      const existing = (smootherRef.current as any) || (gsap && (gsap as any).ScrollSmoother?.get?.());
      if (existing) existing.kill();
      initSmoother();
    };

    window.addEventListener("resize", onResize);

    return () => {
      mounted = false;
      window.removeEventListener("resize", onResize);
      const existing = (smootherRef.current as any) || (gsap && (gsap as any).ScrollSmoother?.get?.());
      if (existing) existing.kill();
      smootherRef.current = null;
    };
  }, []);

  // Reset to top on route change
  useLayoutEffect(() => {
    const smoother = smootherRef.current;
    if (smoother && typeof smoother.scrollTop === "function") {
      // force immediate scroll-to-top
      smoother.scrollTop(0, true);
    } else if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  // The wrapper must fill the viewport and hide native overflow so the smoother controls scroll
  return (
    <div
      ref={wrapperRef}
      id="smooth-wrapper"
      style={{ position: "relative", height: "100vh", overflow: "hidden" }}
    >
      <div ref={contentRef} id="smooth-content" style={{ minHeight: "100%" }}>
        {children}
      </div>
    </div>
  );
}

























