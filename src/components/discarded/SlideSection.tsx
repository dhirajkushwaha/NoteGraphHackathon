"use client";
import React, { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MeetingButton from "@/components/MeetingButton";

gsap.registerPlugin(ScrollTrigger);

interface SlideSectionProps {
  paragraph: string; // text for the <p>
  children: React.ReactNode; // content inside <h1>
}

const SlideSection: React.FC<SlideSectionProps> = ({ paragraph, children }) => {
  useEffect(() => {
    // Desktop GSAP animation
    const tlx = gsap.timeline({
      scrollTrigger: {
        trigger: ".sec-card-slide-y-cont",
        start: "top top",
        end: "+=1020",
        scrub: true,
        pin: true,
      },
    });

    tlx.fromTo(
      ".sec-card-slide-y",
      { y: -400 },
      { y: -2000, ease: "power4.out" }
    );

    // Mobile GSAP animation
    gsap.fromTo(
      ".sec-card-slide-y-mob",
      { y: 0 },
      {
        y: -300,
        duration: 1,
        ease: "power4.out",
        stagger: 0.2,
        scrollTrigger: {
          trigger: ".sec-card-slide-y-wrapper",
          start: "top 20%",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  }, []);

  return (
    <section className="bg-[#272727] sec-card-slide-y-cont relative flex flex-col items-center overflow-hidden justify-center sm:h-[100vh] text-[#F1ECE2] sol-sec3">
      <div className="container">
        <div className="w-[87%] xl:w-[60%] relative mx-auto reveal-text-wrapper">
          <h1 className="fontA font-bold mt-20 sm:mt-0 reveal-text text-4xl sm:text-5xl lg:text-6xl">
            {children}
          </h1>

          <p className="poppins mt-6 opacity-70 text-xl sm:text-2xl lg:text-3xl w-sm lg:w-xl">
            {paragraph}
          </p>

          <MeetingButton />

          {/* Desktop Image */}
          <div className="relative hidden md:block">
            <div className="absolute sec-card-slide-y right-0">
              <img
                className="md:w-[250px] lg:w-[300px]"
                src="/img/solutions/slide-bg.png"
                alt=""
              />
            </div>
          </div>

          {/* Mobile Image */}
          <div className="h-[80vh] overflow-hidden relative my-10 block sm:hidden sec-card-slide-y-wrapper">
            <div className="absolute right-0 sec-card-slide-y-mob">
              <img
                className="w-[80%]"
                src="/img/solutions/slide-bg.png"
                alt=""
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SlideSection;
