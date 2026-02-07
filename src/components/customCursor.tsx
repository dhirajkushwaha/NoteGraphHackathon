"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export default function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      // Move the cursor
      gsap.to(outerRef.current, {
        x: e.clientX - 10,
        y: e.clientY - 10,
        duration: 0.2,
        ease: "power2.out",
      });

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;

      // Check if hovered element is a CTABUTTON
      const isCTA =
        el?.classList.contains("CTABUTTON") ||
        el?.closest(".CTABUTTON") !== null;

      // Change cursor color
      gsap.to(outerRef.current, {
        backgroundColor: isCTA ? "#FFFFFF" : "#3AFF16",
        duration: 0.3,
        ease: "power2.out",
      });
    };

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div
      ref={outerRef}
      className="pointer-events-none hidden lg:block fixed z-[9999] w-[20px] h-[20px] bg-[#2b7578]  "
      style={{ left: 0, top: 0 }}
    ></div>
  );
}
