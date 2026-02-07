"use client";

import { useEffect } from "react"; 

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Modal({ isOpen, onClose }: ModalProps) {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null; // don’t render modal if closed

  return (

    
    <div className="relative">
        <div className="fixed flex flex-col z-[4] bg-[#d9d9d6] w-[90vw] justify-center h-[100vh] items-center">
      <div className="relative mx-auto group w-7xl cursor-pointer transition-all duration-400 pointer-events-none">
        {/* Card */}
        <div className="impact-card-wrapper glass-card rounded-[27px] p-1.5">
          <div className="!w-[100%] text-[#272727] !h-fit impact-card-modal overflow-hidden flex justify-between items-center">
            {/* Left side */}
            <div className="px-20 py-4 w-[40%]">
              <h2 className="z-10 mb-4 fontA font-bold text-4xl transition-all duration-700">
                BroadcastPro Manufacturer Awards 2025
              </h2>
              <p className="z-10 mt-5 opacity-70 text-2xl poppins">
                Best in AI Winner — Sub-text: Plan-itU recognized for transformative
                AI-driven automation in linear broadcast content planning and operations.
              </p>
            </div>

            {/* Right side */}
            <div className="w-[50%] overflow-hidden">
              <img
                className="z-[-1] !w-full fadeout-mask-left transition-opacity opacity-70 duration-700"
                src="/img/elements/cardimg.png"
                alt="Award Card"
              />
            </div>
          </div>
        </div>

        {/* Glow circle */}
        <div className="glow-circle transition-opacity opacity-30 duration-700 absolute top-0 left-0 !w-[70%] !h-[30%]" />
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="mt-10 cursor-pointer poppins border-b border-dash flex items-center gap-2"
      >
        <img
          className="w-[30px]"
          src="https://img.icons8.com/ios-filled/50/multiply.png"
          alt="Close"
        />
        <span className="text-lg">Close</span>
      </button>
    </div>
    </div>
  );
}
