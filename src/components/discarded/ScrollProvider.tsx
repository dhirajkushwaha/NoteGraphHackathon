// "use client";
// import { useEffect, useRef } from "react";
// import LocomotiveScroll from "locomotive-scroll";
// import gsap from "gsap";
// import { ScrollTrigger } from "gsap/ScrollTrigger";
// import "locomotive-scroll/dist/locomotive-scroll.css";



// interface ScrollProviderProps {
//   children: React.ReactNode;
// }

// interface ExtendedDeviceOptions {
//   smooth?: boolean;
//   breakpoint: number;
//   lerp?: number;
//   multiplier?: number;
// }

// export default function ScrollProvider({ children }: ScrollProviderProps) {
//   const scrollRef = useRef<HTMLDivElement >(null);



//   useEffect(() => {

//     if (typeof window === "undefined") return;
//     if (!scrollRef.current) return;


 


//     gsap.registerPlugin(ScrollTrigger)

//     let locoScroll: any;
//     locoScroll = new LocomotiveScroll({
//       el: scrollRef.current,
//       smooth: true,
//       lerp: 0.15,
//       multiplier: 1.2,
//       getSpeed: true,
//       getDirection: true,


//       smartphone: {
//         smooth: true,
//         breakpoint: 0,   // applies to all smartphones
//         lerp: 0.15,      // higher lerp = smoother, less "heavy"
//         multiplier: 0.5, // lower = lighter scroll
//       } as ExtendedDeviceOptions,

 
//       tablet: {
//         smooth: true,
//         breakpoint: 1024,
//         lerp: 0.1,       // in between desktop & phone
//         multiplier: 0.7,
//       } as ExtendedDeviceOptions,
//     });
 




//     locoScroll.on("scroll", ScrollTrigger.update);


//     if(scrollRef.current && locoScroll){

//       ScrollTrigger.scrollerProxy(scrollRef.current, {
//         scrollTop(value) {
//           return arguments.length
//             ? locoScroll.scrollTo(value!, { duration: 0, disableLerp: true }) // ✅ non-null
//             : (locoScroll as any).scroll.instance.scroll.y;
//         },
//         getBoundingClientRect() {
//           return {
//             top: 0,
//             left: 0,
//             width: window.innerWidth,
//             height: window.innerHeight,
//           };
//         },
//         pinType: (scrollRef.current as HTMLElement).style.transform
//           ? "transform"
//           : "fixed",
//       });
  
//       const handleRefresh = () => {
//         locoScroll.update();
//       };
  
//       ScrollTrigger.addEventListener("refresh", handleRefresh);
//       ScrollTrigger.refresh();
//     }

//     return () => {
//       locoScroll.destroy();
//       ScrollTrigger.removeEventListener("refresh", handleRefresh);
//     };












//   }, []);

//   return (
//     <div ref={scrollRef} data-scroll-container>
//       {children}
//     </div>
//   );
// }