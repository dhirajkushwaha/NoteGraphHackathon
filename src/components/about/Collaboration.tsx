"use client"

import React, { useEffect } from 'react';


import gsap from 'gsap';
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

import "./Collaboration.css"


const Collaboration = () => {

    useEffect(() => { 

        const tlx = gsap.timeline({
            scrollTrigger: {
                trigger: ".sec-card-splash",
                start: "top top",
                end: "+=1000",
                scrub: true,
                pin: true,

            }
        });


        tlx.fromTo(".hover-card", {
            scale: 0.7, opacity: 0.7, duration: 0.2,
        },
            {
                opacity: 1,
                scale: 1
            })


        tlx.fromTo(".collab-wrapper",
            {
                y: 50
            },
            {
                y: -35
            }
        )


        tlx.fromTo(".collab-wrapper",
            {
                y: -35
            },
            {
                y: -35
            }
        )

    })


    return (
        <div>

            <section className='relative bg-white sec-card-splash  h-[100vh] flex items-center justify-center    ' >

                <div className='absolute flex  mt-40  gap-20 collab-wrapper' >
                    <div className='hover-card  relative collab-card-01 mx-auto w-[300px] h-[400px] bg-[#02816B] absolute  '>
                        <img className='hidden absolute mix-blend-multiply' src="/img/about/card-img.png" alt="" />
                        <div className='mt-15 text-white  relative z-[1] px-7 py-5'>
                            <h2 className='fontA  font-bold text-2xl lg:text-3xl ' >High Achievement, Deeply Committed</h2>
                            <p className='text-sm font-light mt-2' >
                                Our senior architects and program leads stay embedded from scoping through steady-state, maintaining architectural integrity and ensuring nothing is lost between design, build, and operations.
                            </p>

                        </div>
                    </div>

                    <div className='hover-card relative collab-card-02 mx-auto w-[300px] h-[400px]  bg-[#134D7A] '>
                        <img className='hidden absolute mix-blend-multiply' src="/img/about/card-img-2.png" alt="" />
                        <div className='mt-15 text-white  relative z-[1] px-7 py-5'>
                            <h2 className='mt-5 fontA  font-bold text-2xl lg:text-3xl ' > Bold Thinking, Grounded Execution </h2>
                            <p className='text-sm font-light mt-2' >
                                We challenge legacy architectures and engineer for what’s next, then ship the leanest, SLA-backed solution that scales in production and integrates seamlessly with your existing tech stack.
                            </p>

                        </div>
                    </div>

                    <div className='hover-card   relative collab-card-03 mx-auto w-[300px] h-[400px]  bg-[#137a69] '>
                        <img className='hidden absolute mix-blend-multiply' src="/img/about/card-img-3.png" alt="" />
                        <div className='mt-15 text-white  relative z-[1] px-7 py-5'>
                            <h2 className='mt-15 fontA  font-bold text-2xl lg:text-3xl ' >Shared Success Philosophy </h2>
                            <p className='text-sm font-light mt-2' >
                                Our motivation is tied to live performance dashboards - tracking time-to-value, uptime, adoption, and ROI across channels so impact isn’t assumed, it’s visible.
                            </p>

                        </div>
                    </div>

                </div>


                <div className='h-[100%] overflow-hidden flex  '>
                    <div className='relative z-10 w-fit mx-auto reveal-text-wrapper '>
                        <h1 className="fontA font-medium text-center relative flex flex-col reveal-text    my-20 md:my-15 text-5xl sm:text-6xl"  >

                            <span className='text-[#3b3b3b]'>How We Engineer</span>
                            <span className='text-[#7FBB5C]' >Collaboration</span>

                        </h1>
                        <img className='absolute top-[-50px] left-0 w-[100%] opacity-40 ' src="/img/about/gradientoverlay.svg" alt="" />

                    </div>
                </div>



            </section>
        </div>
    )
}

export default Collaboration
