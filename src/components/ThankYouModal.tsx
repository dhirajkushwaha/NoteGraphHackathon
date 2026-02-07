"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

type ThankYouModalProps = {
  onClose: () => void;
};

export default function ThankYouModal({ onClose }: ThankYouModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLHeadingElement | HTMLParagraphElement | null)[]>(
    []
  );

  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }

    if (lineRefs.current.length) {
      gsap.fromTo(
        lineRefs.current.filter(Boolean),
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          stagger: 0.4,
        }
      );
    }

    const timer = setTimeout(() => {
      if (modalRef.current) {
        gsap.to(modalRef.current, {
          opacity: 0,
          duration: 0.6,
          ease: "power2.inOut",
          onComplete: onClose,
        });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed z-[20]">
      <div className="absolute inset-0 px-3 w-screen h-screen flex items-center justify-center z-[50] bg-black/40">
        <div
          ref={modalRef}
          className="backdrop-blur-[70px] text-white p-12 rounded-[20px] shadow-lg relative w-[400px] text-center"
          style={{
            background:
              "linear-gradient(135deg, rgb(80 80 80 / 27%) 0%, rgb(177 0 175 / 61%) 100%)",
          }}
        >
          <h2
            ref={(el) => {
              lineRefs.current[0] = el;
            }}
            className="text-2xl fontA font-medium mb-4 opacity-0"
          >
            Thank you!
          </h2>
          <p
            ref={(el) => {
              lineRefs.current[1] = el;
            }}
            className="mb-6 opacity-0"
          >
            Someone from our team will connect with&nbsp;you&nbsp;shortly.
          </p>

          <button
            onClick={() => {
              if (modalRef.current) {
                gsap.to(modalRef.current, {
                  opacity: 0,
                  duration: 0.5,
                  ease: "power2.inOut",
                  onComplete: onClose,
                });
              }
            }}
            className="bg-[#4c2560] cursor-pointer text-white px-6 py-3 rounded-lg hover:opacity-70 transition duration-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
