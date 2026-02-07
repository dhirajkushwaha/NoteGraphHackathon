"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

  type FooterProps = {
    bgColor?: string; // any CSS color
  };
  
export default function Footer({ bgColor }: FooterProps) {

  useEffect(() => {
    gsap.fromTo(
      ".fadein-scroll-gsap-z",
      { opacity: 0 },
      {
        opacity: 1,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".fadein-scroll-gsap-z",
          start: "top 70%", // when element enters viewport
          toggleActions: "play none none reverse",
          scrub: true,
        },
      }
    );
  }, []);

  return (
    <section className={`${bgColor ? bgColor : "bg-[#272727]"} top-[-20px]`}>
      {/* Glow circle */}
      {/* <div className="hidden lg:block fadein-scroll-gsap-z bottom-100 left-40 glow-circle [clip-path:inset(-50%_-50%_50%_-50%)] opacity-30 mx-auto z-0 !w-7xl !h-[200px]" /> */}

      {/* Footer content */}
      <div className="fontA capitalize text-[#171717] z-10  bg-white text-black  mx-5 md:mx-10 p-6 md:p-10 lg:px-15   rounded-tl-4xl rounded-tr-4xl">
        {/* Desktop */}
        <div className="hidden text-[#171717]  lg:flex justify-between items-end  ">
          <div className="  xl:w-[33%]">
            <div className="flex  flex-wrap gap-2">
              <a href="./about">Company |</a>
              <a href="./solutions-rightsu">RightsU |</a>
              <a href="./solutions-planitu">Plan-itU |</a>
              <a href="./solutions-broadview">BroadView |</a>

              <a href="./contact">Contact</a>  
            </div>
            <p className="capitalize">
              © 2000-2025, "UTO Solutions." All rights reserved
            </p>
          </div>

          <div className=" w-[20%] 2xl:w-[240px]">
            <img className="w-full" src="/img/elements/element (13).png" alt="footer-element" />
          </div>

          <div className="w-[33%] relative flex flex-col items-end">
            <img className="absolute -bottom-1 right-25 w-[210px] " src="./img/isocertification.png" alt="" />
            <p className="text-right lowercase">
              <a target="_blank" href="mailto:info@uto.in">info@uto.in</a>
            </p>
            <div className="flex mr-0 gap-2">
                <a target="_blank" className="flex items-center gap-2 " href="https://www.linkedin.com/company/u-tosolutions/"> <img className="h-[19px]" src="/img/elements/linkedin.svg" alt="" /> <span>LinkedIn</span> </a>


            </div>
          </div>
        </div>


        {/* Mobile */}
        <div className="lg:hidden text-[#171717]">
          <div className="mt-2 flex flex-row justify-between">
            <div className="w-[50%] flex flex-col justify-center items-start gap-2">
              <a href="./about">Company</a>
              <a href="./solutions-rightsu">RightsU</a>
              <a href="./solutions-planitu">Plan-itU</a>
              <a href="./solutions-broadview">BroadView</a>

              <a href="./contact">Contact</a> 
            </div>

            <div className=" w-[50%] flex flex-col justify-start items-center gap-2 ">
              <div className="lowercase flex flex-col gap-2">
                <a target="_blank" href="mailto:info@uto.in">info@uto.in</a>
                <a  target="_blank" className="flex gap-1" href="https://www.linkedin.com/company/u-tosolutions/"> <img src="/img/elements/linkedin.svg" alt="" /> <span>LinkedIn</span> </a>

              </div>
            </div>
          </div>

        

          <div className="w-[200px] mx-auto" >
            <img src="/img/elements/element (13).png" alt="footer-element" />
            <p className="capitalize text-center mt-2">
              © 2000-2025, "UTO Solutions." <br /> All rights reserved
            </p>
          </div>

            <div>
                <img className="  mx-auto w-[220px] mt-2" src="./img/isocertification.png" alt="" />
            
          </div>
        </div>
      </div>
    </section>
  );
}
