"use client";

import React, { useEffect, useRef, useState } from "react";

interface CounterProps {
  target: number;     // final number
  duration?: number;  // total time in ms (default 2000)
  step?: number;      // increment step (default 1)
  threshold?: number; // intersection threshold (default 0.5)
}

export default function Counter({
  target,
  duration = 2000,
  step = 1,
  threshold = 0.5,
}: CounterProps) {
  const [count, setCount] = useState(0);
  const elRef = useRef<HTMLSpanElement | null>(null);

  // refs to manage animation and last value without triggering re-renders
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!elRef.current) return;
    const node = elRef.current;

    const startAnimation = () => {
      // cancel any running animation first
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastRef.current = 0;
      setCount(0);

      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Compute stepped value (monotonic): floor so value increases in steps
        let val = Math.floor((progress * target) / step) * step;
        if (progress === 1) val = target; // ensure we end exactly at target
        val = Math.min(val, target);

        if (val !== lastRef.current) {
          lastRef.current = val;
          setCount(val);
        }

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    const stopAnimation = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastRef.current = 0;
      setCount(0); // reset when out of view — change this if you want pause/resume
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startAnimation();
          } else {
            stopAnimation();
          }
        });
      },
      { threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, step, threshold]);

  return <span ref={elRef}>{count}</span>;
}
