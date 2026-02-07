'use client'

import React, { useEffect } from 'react'

import gsap from 'gsap';
import { TextPlugin } from "gsap/TextPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, TextPlugin);

function CardDeck() {

    useEffect(() => {
        gsap.fromTo(".section-featureDeck",
            { opacity: 0.2 },

            {
                opacity: 1,
                scrollTrigger: {
                    trigger: ".section-featureDeck",
                    start: "top 50%",
                    end: "top 5%",          // pin for 500px of scroll
                    pin: false,             // element sticks
                    scrub: true,
                    // markers: true,     

                    // scroller: "[data-scroll-container]",
                }
            })



        let tl = gsap.timeline({
            scrollTrigger: {
                trigger: ".section-featureDeck",
                start: "top bottom",
                end: "top 30%",
                scrub: true,
            }
        });


        gsap.to(".reveal-text-2 span", {
            y: "0%",
            opacity: 1,
            duration: 1,
            ease: "power4.out",
            stagger: 0.2,   // animate each line one after another
            scrollTrigger: {
                trigger: ".section-featureDeck",
                start: "top 70%",   // start when text enters viewport
                // toggleActions: "play none none reverse",
                // scrub: true,
                toggleActions: "play reset play reset",
                // scroller: "[data-scroll-container]",

            }
        });
    }, [])


    return (
        <div>


            <section className=" section-featureDeck opacity-0 relative bg-black text-[#F1ECE2] py-0  " >

                <div className="relative h-[100vh] w-full" style={{
                    maskImage: "url('/img/shapes/triangle-mask.svg')",

                    WebkitMaskImage: "url('/img/shapes/triangle.svg')",
                    maskSize: "150% 150%",
                    WebkitMaskSize: "150% 150%",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center center",
                    WebkitMaskPosition: "center center",

                }} >
                    <div className="bg-[#282828]" >
                        <h1 className="fontA font-medium text-center text-4xl sm:text-6xl"  >

                            <div className=" reveal-text  reveal-text-2 mt-10 !hidden lg:!flex lg:flex-col">
                                <span>Adapting Tech To</span>
                                <span> <span className="text-[#8DC55D]" >Optimize</span>  Media</span>

                            </div>

                            <div className=" reveal-text sm:w-[600px] mx-auto px-2 reveal-text-2 lg:!hidden">
                                <span>Adapting Tech to   <span className="text-[#8DC55D]" >Optimize</span>   Media</span>

                            </div>

                        </h1>

                        <p className="scroll-fade-s3 poppins font-light hidden  text-center text-xl mt-4 md:mt-10">
                            Complete media value chain enablement   <span className="font-light"> <br />UTO does it all   </span>

                        </p>

                        <div className=" mt-20  " >
                            <div className="max-w-7xl  mt-5 flex flec-col justify-center  slide-card-wrapper relative  px-4 mx-auto" >


                                <div className="slide-huhh xl:w-[1080px] absolute slide-card flex flex-col lg:flex-row lg:justify-between lg:items-center  mx-auto text-white px-5 " style={{ backgroundColor: "rgb(124 172 83)" }}  >
                                    <div className=" lg:w-[60%] p-2 py-5 lg:p-5  " >
                                        <div className="flex items-center gap-5   fontA">
                                            <img src="./img/elements/deck-02.png" alt="" />
                                            {/* slide-card-h2 */}
                                            <h2 className="    font-light  text-2xl   " style={{ lineHeight: "normal" }}> Revenue <br className="sm:hidden" /> Maximisation</h2>
                                        </div>
                                        <h2 className="fontA hidden font-regular mt-3 lg:mt-6 text-[#2a6442] text-3xl sm:text-4xl"   >
                                            Revenue Maximisation
                                        </h2>
                                        <p className="poppins font-light mt-3 lg:w-[90%] text-lg sm:text-lg">
                                            Transform data into dollars. Smart analytics, dynamic pricing, and automated compliance ensure you leverage every revenue opportunity.
                                        </p>

                                        <div className="poppins font-light flex gap-6 flex lg:flex-row mt-4 lg:mt-4 lg:w-[90%] ">
                                            <div className="" >
                                                <h4 className="text-[#2a6442] font-light text-lg lg:text-xl " >Advanced audience <br /> segmentation </h4>
                                                <p className="mt-3 font-light text-white " >
                                                    Precision targeting for maximum <br className="sm:hidden" />  advertiser value.
                                                </p>
                                            </div>

                                            <div className=" " >
                                                <h4 className="text-[#2a6442] text-lg lg:text-xl">Cross-platform <br /> monetization </h4>
                                                <p className="mt-3   text-white " >
                                                    Unified revenue strategies across digital <br className="sm:hidden" />  and linear channels.
                                                </p>
                                            </div>
                                        </div>

                                        <a href="./solutions-planitu">
                                            <div className="fontA mt-5 glass-card cursor-pointer  z-2  flex  items-center justify-center !rounded-[16px] w-[160px] h-[53.6px]  " style={{ backgroundColor: "rgb(3 , 255, 64 , 32%)", border: "1px solid rgb(82 255 89)" }}>
                                                <span>Explore More </span>
                                            </div>


                                        </a>
                                    </div>

                                    <div className="hidden px-3     w-[26%]  lg:block" >
                                        <img className=" rounded-[30px] overflow-hidden" src="./img/elements/Revenue Maximisation.png" alt="" />
                                    </div>

                                </div>


                                <div className="slide-huhh   xl:w-[1080px]   absolute slide-card flex flex-col lg:flex-row  lg:justify-between lg:items-center   mx-auto text-white px-5" style={{ backgroundColor: "#02816B7D" }}  >
                                    <div className=" lg:w-[60%] py-5 p-2 lg:p-5" >
                                        <div className="flex items-center gap-5   fontA">
                                            <img src="./img/elements/deck-04.png" alt="" />
                                            {/* slide-card-h2 */}
                                            <h2 className="  font-light text-2xl  " style={{ lineHeight: "normal" }}>Content & Rights Management</h2>
                                        </div>
                                        <h2 className="hidden fontA font-regular mt-3 lg:mt-6 text-[#03FFB2] text-3xl sm:text-4xl"   >
                                            Content & Rights <br className="hidden xl:block" />  Management
                                        </h2>
                                        <p className="font-light poppins mt-3 lg:w-[90%] text-lg sm:text-lg">
                                            Unlock the full potential of your content library.  From acquisition to distribution, we ensure every asset delivers maximum value across every platform.

                                        </p>

                                        <div className="font-light poppins flex  gap-6 mt-4 lg:mt-4">
                                            <div  >
                                                <h4 className="text-[#03FFB2] text-lg lg:text-xl" >Predictive Risk  <br /> Management</h4>
                                                <p className="mt-3 text-white " >
                                                    Advanced analytics prevents violations  before  they happen, protecting revenue and partnerships.
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="text-[#03FFB2] text-lg lg:text-xl">Contract <br /> Intelligence </h4>
                                                <p className="mt-3 text-white lg:w-[90%] " >
                                                    AI based contract processing to reduce manual data entry and ensure maximum accuracy.
                                                </p>
                                            </div>
                                        </div>


                                        <a href="./solutions-rightsu">
                                            <div className="fontA mt-5 glass-card cursor-pointer  z-2  flex  items-center justify-center !rounded-[16px] w-[160px] h-[53.6px]  " style={{ backgroundColor: "rgb(3 , 255, 64 , 32%)", border: "1px solid rgb(82 255 89)" }}>
                                                <span>Explore More</span>
                                            </div>

                                        </a>
                                    </div>

                                    <div className="hidden px-3      w-[26%]  lg:block" >
                                        <img className=" rounded-[30px] overflow-hidden" src="./img/elements/Content & Rights Management.png" alt="" />
                                    </div>




                                </div>


                                <div className="slide-huhh   xl:w-[1080px]  md:h-fit    absolute slide-card flex flex-col lg:flex-row lg:justify-between lg:items-center  mx-auto text-white px-5  " style={{ backgroundColor: "#134D7ABD" }}  >

                                    <div className=" lg:w-[70%] py-5  p-2 lg:p-5" >
                                        <div className="overflow-scroll h-[500px] sm:h-fit lg:overflow-hidden" >
                                            <div className="flex items-center gap-5   fontA">
                                                <img src="./img/elements/deck-03.png" alt="" />
                                                {/* slide-card-h2 */}
                                                <h2 className="   font-light text-2xl   " style={{ lineHeight: "normal" }}>Broadcast Management & Planning Automation  </h2>
                                            </div>
                                            <h2 className="fontA hidden font-regular mt-3 lg:mt-6 text-[#03FFB2] text-3xl sm:text-4xl"   >
                                                Broadcast Management & <br /> Planning Automation
                                            </h2>
                                            <p className="font-light poppins mt-2 lg:w-[90%] text-lg sm:text-lg">
                                                Streamline every step from planning to playout across digital & linear workflows. Our AI-powered solutions reduce manual errors, accelerate operations, and keep you ahead of schedule.
                                            </p>

                                            <div className="poppins font-light flex gap-3   lg:mt-4">
                                                <div className="lg:w-[500px]" >
                                                    <h4 className="text-[#03FFB2]  text-lg lg:text-xl" >Multi-Platform Content Orchestration</h4>
                                                    <p className="  text-white " >
                                                        Streamline linear and <br className="hidden lg:block" /> non-linear content with consistency
                                                    </p>


                                                </div>

                                                <div className="">
                                                    <h4 className="text-[#03FFB2]  text-lg lg:text-xl">Predictive Performance Planning </h4>
                                                    <p className="  text-white " >
                                                        Fuse consumer research, planning rules, rights, and compliance into optimized schedules that predict audience performance.
                                                    </p>

                                                    <h4 className="text-[#03FFB2]  text-lg lg:text-xl mt-2" >Real-time workflow orchestration </h4>
                                                    <p className="  text-white " >
                                                        Seamless integration across all broadcast touchpoints
                                                    </p>
                                                </div>
                                            </div>

                                        </div>

                                        <div className="lg:mt-[-10px]" >

                                            <a href="./solutions-broadview">

                                                <div className="fontA  glass-card cursor-pointer  z-2  flex   items-center justify-center !rounded-[16px] w-[160px] h-[53.6px]  " style={{ backgroundColor: "rgb(3 , 255, 64 , 32%)", border: "1px solid rgb(82 255 89)" }}>
                                                    <span>Explore More </span>
                                                </div>

                                            </a>
                                        </div>


                                    </div>

                                    <div className="hidden    px-3  mt-12   w-[26%]  lg:block" >
                                        <img className=" rounded-[30px] overflow-hidden" src="./img/elements/Broadcast Management.png" alt="" />
                                    </div>
                                </div>

                                <div className="slide-huhh   xl:w-[1080px]   absolute slide-card flex flex-col lg:flex-row lg:justify-between lg:items-center  mx-auto text-white px-5  " style={{ backgroundColor: "#0E4D47BD" }}  >
                                    <div className=" py-5 lg:w-[50%]  p-2 lg:p-5" >
                                        <div className="flex items-center gap-5   fontA">
                                            <img className="" src="./img/elements/deck-01.png" alt="" />
                                            {/* slide-card-h2 */}
                                            <h2 className="  font-light text-2xl  " style={{ lineHeight: "normal" }}>AI-Powered Dubbing </h2>
                                        </div>
                                        <h2 className="hidden mt-14 sm:mt-0 fontA font-regular mt-3 lg:mt-6 text-[#03FFB2] text-3xl sm:text-4xl"   >
                                            AI-Powered Dubbing

                                        </h2>
                                        <p className="poppins  font-light mt-3 md:mt-3 lg:w-[500px] text-lg sm:text-lg">
                                            Break language barriers. Automate voiceovers and localization at scale with intelligent tools that deliver speed, accuracy, and global reach.

                                        </p>

                                        <div className="poppins font-light  flex mt-4 lg:mt-4">
                                            <div  >
                                                <h4 className="text-[#03FFB2] lg:w-[220px] text-lg lg:text-xl" >Voice cloning technology </h4>
                                                <p className="mt-3 text-white lg:w-[260px]  " >
                                                    Consistent character voices  across multiple languages.
                                                </p>
                                            </div>

                                            <div>
                                                <h4 className="text-[#03FFB2] lg:w-[260px] text-lg lg:text-xl">Cultural adaptation engine</h4>
                                                <p className="mt-3 text-white " >
                                                    Context-aware localization that preserves original intent.
                                                </p>
                                            </div>
                                        </div>
                                        <a className="" href="./contact">

                                            <div className="fontA  mt-30 mb-10 sm:mt-10    glass-card cursor-pointer  z-2  flex   items-center justify-center !rounded-[16px] w-[160px] h-[53.6px]  " style={{ backgroundColor: "rgb(3 , 255, 64 , 32%)", border: "1px solid rgb(82 255 89)" }}>
                                                <span>Explore More</span>
                                            </div>

                                        </a>
                                    </div>

                                    <div className="hidden px-3    w-[26%]  lg:block" >
                                        <img className=" rounded-[30px] overflow-hidden" src="./img/elements/AI Powered Dubbing.png" alt="" />
                                    </div>
                                </div>















                            </div>
                        </div>

                        <div className="mt-220" >

                        </div>


                        <div className="t-element hidden lg:hidden   md:h-[200px] md:scale-1">
                            <div className="bg-[#282828] ml-[-64px] h-[40px] w-[200px]">

                            </div>

                        </div>

                    </div>

                </div>



            </section>

        </div>
    )
}

export default CardDeck
