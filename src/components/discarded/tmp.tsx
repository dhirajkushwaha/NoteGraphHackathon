"use client";
import { useEffect, useRef, useState } from "react";
// import LocomotiveScroll from "locomotive-scroll";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger"; 
import "locomotive-scroll/dist/locomotive-scroll.css";
 
interface ScrollProviderProps {
  children: React.ReactNode;
}
 

interface ExtendedDeviceOptions {
  smooth?: boolean;
  breakpoint: number;
  lerp?: number;
  multiplier?: number;
}



export default function ScrollProvider({ children }: ScrollProviderProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(false)



  useEffect(() => { 

    if (typeof window === "undefined") return;
    if (!scrollRef.current) return;

    let locoScroll: any;
    const handleRefresh = () => {
      locoScroll.update();
    };

   

    if (window.innerWidth >= 1024) {
      (
        async () => {
          const LocomotiveScroll = (await import('locomotive-scroll')).default;

          locoScroll = new LocomotiveScroll({
            el: scrollRef.current!,
            smooth: true,
            lerp: 0.15,
            multiplier: 1.3,
            getSpeed: true,
            getDirection: true,


            smartphone: {
              smooth: false,
              breakpoint: 0,   // applies to all smartphones
              lerp: 0.15,      // higher lerp = smoother, less "heavy"
              multiplier: 0.5, // lower = lighter scroll
            } as ExtendedDeviceOptions,

            // 📲 Tablet settings
            tablet: {
              smooth: false,
              breakpoint: 1024,
              lerp: 0.1,       // in between desktop & phone
              multiplier: 0.7,
            } as ExtendedDeviceOptions,
          });




          // update GSAP on scroll

          locoScroll.on("scroll", ScrollTrigger.update);

          ScrollTrigger.scrollerProxy(scrollRef.current, {
            scrollTop(value) {
              return arguments.length
                ? locoScroll.scrollTo(value!, { duration: 0, disableLerp: true }) // ✅ non-null
                : (locoScroll as any).scroll.instance.scroll.y;
            },
            getBoundingClientRect() {
              return {
                top: 0,
                left: 0,
                width: window.innerWidth,
                height: window.innerHeight,
              };
            },
            pinType: (scrollRef.current as HTMLElement).style.transform
              ? "transform"
              : "fixed",
          });

          ScrollTrigger.addEventListener("refresh", handleRefresh);
          ScrollTrigger.refresh();
          

          setLoading(true);
        }
      )()

      return () => {
        if(locoScroll){ 
            locoScroll.destroy();
            ScrollTrigger.removeEventListener("refresh", handleRefresh);
        }
      };
    }


  }, []);



 


  return (
    <div ref={scrollRef}  data-scroll-container>
        {children}
    </div>
  )

}
