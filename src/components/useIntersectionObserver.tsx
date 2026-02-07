"use client";
import { useEffect } from "react";

export function useIntersectionObserver(
  className: string,
  options: IntersectionObserverInit = { threshold: 0.2 }
) {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(`.${className}`);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("ins-fade-in-visible");
        } else {
          entry.target.classList.remove("ins-fade-in-visible");
        }
      });
    }, options);

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [className, options]);
}
