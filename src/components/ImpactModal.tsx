"use client";
import React from "react";

type ImpactModalProps = {
  isOpen: boolean;
  onClose: () => void;
  impact: [string, string, string]; // [title, description, image]
};

// Helper function to parse curly brackets and wrap content
function parseCurlyText(text: string) {
  const regex = /\{([^}]+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="font-semibold">
        {match[1].trim()}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function ImpactModal({ isOpen, onClose, impact }: ImpactModalProps) {
  if (!isOpen) return null;
  return null
  // return (
  //   <div
  //     className="fixed flex flex-col z-[20] bg-[#d9d9d6]/80 backdrop-blur-sm w-screen h-screen justify-center items-center"
  //     onClick={onClose} // closes modal if background clicked
  //   >
  //     <div
  //       className="relative flex flex-col justify-center items-center mx-auto group max-w-3xl lg:max-w-5xl xl:max-w-7xl w-full transition-all duration-400"
  //       onClick={(e) => e.stopPropagation()} // stops closing if inside modal
  //     >
  //       <div className="impact-card-wrapper glass-card rounded-[27px] p-1.5 w-full">
  //         <div className="text-[#272727] flex flex-col md:flex-row h-fit overflow-hidden justify-between items-center rounded-[24px]">
  //           {/* Left side */}
  //           <div className="px-6 lg:px-12 xl:px-20 py-6 w-full md:w-[45%]">
  //             <h2 className="mb-4 fontA font-bold text-2xl lg:text-4xl">
  //               {impact[0]}
  //             </h2>
  //             <p className="mt-5 opacity-70 text-base lg:text-xl poppins leading-relaxed">
  //               {parseCurlyText(impact[1])}
  //             </p>
  //           </div>

  //           {/* Right side */}
  //           <div className="w-full md:w-[55%] overflow-hidden">
  //             <img
  //               className="w-full h-auto object-contain opacity-80 fadeout-mask-left"
  //               src={impact[2]}
  //               alt="Impact card"
  //             />
  //           </div>
  //         </div>
  //       </div>

  //       {/* Glow circle */}
  //       <div className="glow-circle opacity-30 absolute top-0 left-0 w-[70%] h-[30%]" />

  //       {/* Close button */}
  //       <button onClick={onClose} className="mt-5 cursor-pointer">
  //         <img
  //           className="w-[30px]"
  //           src="https://img.icons8.com/ios-filled/50/multiply.png"
  //           alt="Close"
  //         />
  //       </button>
  //     </div>
  //   </div>
  // );
}
