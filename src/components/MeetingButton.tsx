"use client";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface MeetingButtonProps {
  width?: string;
  height?: string;
  borderColor?: string;
  backgroundColor?: string;
  overlayBg?: string;
}

const MeetingButton: React.FC<MeetingButtonProps> = ({
  width = "fit-content",
  height = "auto",
  borderColor = "rgb(82 255 89)",
  backgroundColor = "rgb(3 , 255, 64 , 32%)",
  overlayBg = "linear-gradient(to right, rgba(3,255,64,0.3), rgba(3,255,64,0))",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        y: 0,
        opacity: 1,
        duration: 1, 
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom"  ,
          toggleActions: "play none none none",
        },
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="    slideup-fadein  mt-6 relative md:mt-10 opacity-0 translate-y-10"
    >
      {/* Main Glass Card */}
      <div
        className="fontA glass-card cursor-pointer z-2 flex items-center py-4 px-6"
        style={{
          width,
          height,
          backgroundColor,
          border: `1px solid ${borderColor}`,
        }}
      >
        <span>BOOK A MEETING</span>
      </div>

      {/* Overlay */}
      <div
        className="!absolute top-[-10px] gradient-overlay opacity-60 z-1 !w-[200px] !h-[100px]"
        style={{
          background: overlayBg,
        }}
      />
    </div>
  );
};

export default MeetingButton;
