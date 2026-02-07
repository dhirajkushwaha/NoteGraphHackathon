import React, { useEffect } from 'react'
import CTA from '../CTA'

import gsap from 'gsap';
import ScrollTrigger from 'gsap-trial/ScrollTrigger';

import "./TextSlide.css"

export default function TextSlide() {


    useEffect(() => {
        let textScrollOffset = 1500;


        let tlm = gsap.timeline({
            scrollTrigger: {
                trigger: ".textScroll-cont",
                start: "top 0%",
                end: "+300%",
                scrub: true,
                markers: true,
                pin: true
            }
        })

        tlm.fromTo(".textScroll-01",
            {
                x: -textScrollOffset
            },
            {
                x: 0
            }
        )

        tlm.fromTo(".textScroll-06",
            {
                x: textScrollOffset - 700
            },
            {
                x: 0
            }
        )


        tlm.fromTo(".textScroll-02",
            {
                x: textScrollOffset
            },
            {
                x: 0
            }
        )

        tlm.fromTo(".textScroll-03",
            {
                x: -800
            },
            {
                x: 0
            }
        )

        tlm.fromTo(".textScroll-04",
            {
                x: textScrollOffset
            },
            {
                x: 0
            }
        )


        tlm.fromTo(".textScroll-05",
            {
                x: -textScrollOffset - 200
            },
            {
                x: 0
            }
        )


    }, [])
    return (
        <div>
            <section className="bg-[#272727] h-[100vh] flex items-center justify-center textScroll-cont" >

                <div className="flex flex-col items-center" >
                    <div className="uppercase flex flex-col justify-center items-center text-[#CCCAC4] fontA  text-center font-medium  text-4xl sm:text-8xl" >
                        <div className="flex ">
                            <h1 className="textScroll-01 gradient-text" >
                                Let’s Build your
                            </h1>

                            <div className="flex textScroll-06">
                                <svg className="" width="71" height="71" viewBox="0 0 71 71" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16.0902 64H64M64 64V19.1955M64 64L5 5" stroke="#CCCAC4" strokeWidth="12.0408" />
                                </svg> Advantage

                            </div>


                        </div>

                        <div className="" >
                            <h1 className="textScroll-02 " >
                                Let’s explore how we can
                            </h1>
                        </div>

                        <div className="flex items-center gap-6" >
                            <svg className="" width="71" height="71" viewBox="0 0 71 71" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16.0902 64H64M64 64V19.1955M64 64L5 5" stroke="#CCCAC4" strokeWidth="12.0408" />
                            </svg>
                            <h1 className="textScroll-04 " >
                                turn your challenges
                            </h1>
                        </div>

                        <div className="" >
                            <h1 className="textScroll-05 " >
                                into opportunities; so
                            </h1>
                        </div>

                        <div className="" >
                            <h1 className="textScroll-07 " >
                                into opportunities; so
                            </h1>
                        </div>




                    </div>


                    <CTA className="w-[160px] mt-20" text="Book A Meeting" />


                </div>




            </section>
        </div>
    )
}

 
