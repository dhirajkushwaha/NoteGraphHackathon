'use client'
import React, { useEffect, useRef } from 'react'
import { usePopup } from '@/context/PopupContext';

import gsap from 'gsap';

import { ScrollTrigger } from "gsap/ScrollTrigger";



gsap.registerPlugin(ScrollTrigger)

function Transform({ bgImg }: { bgImg: number }) {


  const sectionRef = useRef<HTMLDivElement | null>(null);

  const { openPopup } = usePopup();
  let headingCSS = "    fontA reveal-text font-medium text-[#FAFAFA]  text-center px-4 lg:px-10 text-4xl sm:text-6xl"

  let Heading = [
    <div>
      <div className='hidden sm:block ' >
        <h1 className={headingCSS}  >
          <span> Transform Content </span>
          <span> Planning Into Competitive </span>
          <span className='pb-2' >Advantage  </span>
        </h1>

      </div>

      <div className='block sm:hidden' >
        <h1 className={headingCSS}  >
          <span> Transform Content </span>
          <span> Planning Into  </span>
          <span className='pb-2' >Competitive Advantage  </span>
        </h1>

      </div>
    </div>,

    <div>
      Hello
    </div>


  ]


  let content = [
    "The future of broadcasting belongs to those who can unify linear and digital workflows without sacrificing agility. BroadView ensures your operations scale as fast as your ambitions."

  ]

  useEffect(() => {


    const ctx = gsap.context(() => {
      ScrollTrigger.refresh();

   

      gsap.fromTo(".fadeIN", { opacity: 0, y: 10 }, {
        opacity: 1,
        y: 0,  delay:1.4, 
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 75%",
          end: "bottom 25%",  
          
        } 
      });

    })


    return () => ctx.revert();




  }, [])

  return (
    <div>
      <section className='overflow-hidden section-reveal reveal-text-wrapper  sec-carousal pt-15 sm:pt-20' style={{ backgroundImage: `url("/img/solutions/transform(${bgImg}).png")`, backgroundSize: "cover", backgroundPosition: "center" }} >



        <div data-speed="0.9" >



          <div  className='h-fit' >

            <div >
              {Heading[0]}

            </div>

            <p ref={sectionRef} className='poppins font-light px-2  lg:px-0  fadeIN  mx-auto mt-6 text-[#f6f6f68a] text-center text-xl sm:text-2xl sm:w-[90vw]  md:w-2xl lg:w-xl'>
              {content[0]}
            </p>


          </div> 

          <div className="mt-20 flex justify-center   pb-15" style={{ background: "linear-gradient(360deg, black, transparent)" }} >
            <div className=" mb-10 relative  ">

              <div onClick={() => openPopup("meeting")} className="mx-auto CTABUTTON w-fit text-white scroll-fade mt-6 relative md:mt-10">

                <div className="fontA glass-card cursor-pointer  z-2  flex  items-center justify-center !rounded-[16px] w-[160px] h-[53.6px] " style={{ backgroundColor: "rgb(0 217 52 / 89%)", border: "1px solid rgb(82 255 89)", boxShadow: "0 6px 18px rgb(0 0 0 / 49%)" }}>
                  <span>Schedule A  Demo</span>
                </div>

                <div className="!absolute hidden top-[-10px] gradient-overlay opacity-60  z-1 !w-[200px] !h-[100px]" >

                </div>

              </div>



            </div>

          </div>

        </div>

      </section>
    </div>
  )
}

export default Transform
