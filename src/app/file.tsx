import React from 'react'

const file = () => {
  return (
    <div>
        {/* This aint working */}
              {/* <section className="hidden h-[100vh] sm:h-fit pt-30 sm:pt-10 bg-[#E0DFDC] text-black relative py-10 pb-20 sec-awards overflow-hidden">
                <h1 className="fontA font-medium text-center reveal-text text-[#3b3b3b]  reveal-text-4  my-10 md:my-15 text-5xl sm:text-6xl">
                  <span>Recognition</span>
                  <span>& Impact</span>
                </h1>

                <div className="  pt-5 pb-7 lg:py-0 overflow-x-scroll lg:overflow-visible   customScrollbar-z hidden   px-8 lg:flex-wrap justify-start lg:justify-center items-center mt-6 flex gap-5   md:flex ">
                  <div
                    className="  flex-shrink-0 relative group scroll-fade-card  cursor-pointer transtion-all duration-400  lg:hover:-translate-y-[40px] "
                    onClick={() =>
                      openPopup("impact", [
                        "BroadcastPro Manufacturer Awards 2025 - Best in AI Winner",
                        "Plan-itU recognized for transformative {AI-driven automation} in linear broadcast content planning and operations.",
                        "/img/elements/cardimg.png",
                      ])
                    }
                  >
                    <div className="impact-card-wrapper  overflow-hidden   glass-card  !rounded-[27px] p-1.5">
                      <div className="impact-card overflow-hidden p-6  flex flex-col justify-between items-start">
                        <img
                          className="child w-[100%] z-[-1] h-[60%] fadeout-mask absolute left-0 top-0 transition-opacity opacity-0 duration-700 group-hover:opacity-70"
                          src="/img/elements/cardimg.png"
                          alt=""
                        />

                        <img
                          className="child transition-opacity duration-400 group-hover:opacity-0 "
                          src="/img/elements/element (11).svg"
                          alt=""
                        />
                        <div>
                          <h2 className=" text-[#3b3b3b] z-1 mt-4 mb-4 fontA font-regular text-2xl transition-all duration-700 group-hover:text-[#F6F1E6]">
                            BroadcastPro Manufacturer Awards 2025 - Best in AI
                            Winner
                          </h2>
                          <p className="z-1 font-light text-lg poppins">
                            Plan-itU recognized for transformative AI-driven
                            automation in linear broadcast content planning and
                            operations.{" "}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glow-circle transition-opacity opacity-0 duration-700 group-hover:opacity-70  absolute top-[-10px] left-[-24%] !w-[130%] !h-[30%] "></div>
                  </div>

                  <div
                    className="  flex-shrink-0 relative group scroll-fade-card  cursor-pointer transtion-all duration-400  lg:hover:-translate-y-[40px] "
                    onClick={() =>
                      openPopup("impact", [
                        "Powering Sony Pictures Networks India Cloud Journey",
                        "Successfully implemented BroadView in {AWS cloud for SPNI}, setting new standards for enterprise-scale migrations.",
                        "/img/elements/cardimg-sony.png",
                      ])
                    }
                  >
                    <div className="impact-card-wrapper  overflow-hidden   glass-card  !rounded-[27px] p-1.5">
                      <div className="impact-card overflow-hidden p-6  flex flex-col justify-between items-start">
                        <img
                          className="child w-[100%] z-[-1] h-[70%] fadeout-mask absolute left-0 top-0 transition-opacity opacity-0 duration-700 group-hover:opacity-70"
                          src="/img/elements/cardimg-sony.png"
                          alt=""
                        />

                        <img
                          className="child transition-opacity duration-400 group-hover:opacity-0 "
                          src="/img/elements/purple.svg"
                          alt=""
                        />
                        <div>
                          <h2 className=" text-[#3b3b3b] z-1 mt-8 mb-4 fontA font-regular text-2xl transition-all duration-700 group-hover:text-[#F6F1E6]">
                            Powering Sony Pictures Networks India Cloud Journey
                          </h2>
                          <p className="z-1 font-light text-lg poppins">
                            Successfully implemented BroadView in AWS cloud for
                            SPNI , setting new standards for enterprise-scale
                            migrations.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glow-circle transition-opacity opacity-0 duration-700 group-hover:opacity-70  absolute top-[-10px] left-[-24%] !w-[130%] !h-[30%] "></div>
                  </div>

                  <div
                    className="  flex-shrink-0 relative group  scroll-fade-card cursor-pointer transtion-all duration-400  lg:hover:-translate-y-[40px] "
                    onClick={() =>
                      openPopup(
                        "impact",

                        [
                          "Industry Leadership",
                          "Featured at NAB 2023, The {Broadcast Bridge}, and {Broadcast & CableSat} for pioneering solutions that redefine media operations.",
                          "/img/elements/cardimg-industry.png",
                        ]
                      )
                    }
                  >
                    <div className="impact-card-wrapper  overflow-hidden   glass-card  !rounded-[27px] p-1">
                      <div className="impact-card overflow-hidden p-6   flex flex-col justify-between items-start">
                        <img
                          className="child w-[100%] z-[-1] h-[70%] fadeout-mask absolute left-0 top-0 transition-opacity opacity-0 duration-700 group-hover:opacity-70"
                          src="/img/elements/cardimg-industry.png"
                          alt=""
                        />

                        <img
                          className="child transition-opacity duration-400 group-hover:opacity-0 "
                          src="/img/elements/pink.svg"
                          alt=""
                        />
                        <div>
                          <h2 className=" text-[#3b3b3b] z-1 mt-8 mb-4 fontA font-regular text-2xl transition-all duration-700 group-hover:text-[#F6F1E6]">
                            Industry <br /> Leadership{" "}
                          </h2>
                          <p className="z-1 font-light text-lg poppins">
                            Featured at NAB 2023, The Broadcast Bridge, and
                            Broadcast & CableSat for pioneering solutions that
                            redefine media operations.{" "}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glow-circle transition-opacity opacity-0 duration-700 group-hover:opacity-70  absolute top-[-10px] left-[-24%] !w-[130%] !h-[30%] "></div>
                  </div>
                </div>

                <div className=" h-[400px]  pt-5 pb-7 px-8  justify-center  items-center mt-6 flex flex-wrap relative gap-5   md:hidden">
                  <div
                    className="sec-awards-card-mob flex-shrink-0 z-[1]  absolute group   cursor-pointer   lg:hover:-translate-y-[40px] "
                    onClick={() =>
                      openPopup("impact", [
                        "BroadcastPro Manufacturer Awards 2025 - Best in AI Winner",
                        "Plan-itU recognized for transformative {AI-driven automation} in linear broadcast content planning and operations.",
                        "/img/elements/cardimg.png",
                      ])
                    }
                  >
                    <div className="impact-card-wrapper  overflow-hidden   glass-card  !rounded-[27px] p-1.5">
                      <div className="impact-card !bg-[rgb(224,223,220)] overflow-hidden p-6  flex flex-col justify-between items-start">
                        <img
                          className="child w-[100%] z-[-1] h-[60%] fadeout-mask absolute left-0 top-0 transition-opacity opacity-0 duration-700 group-hover:opacity-70"
                          src="/img/elements/cardimg.png"
                          alt=""
                        />

                        <img
                          className="child transition-opacity duration-400 group-hover:opacity-0 "
                          src="/img/elements/element (11).svg"
                          alt=""
                        />
                        <div>
                          <h2 className="text-[#3b3b3b] z-1 mt-4 mb-4 fontA font-regular text-2xl transition-all duration-700 group-hover:text-[#F6F1E6]">
                            BroadcastPro Manufacturer Awards 2025 - Best in AI
                            Winner
                          </h2>
                          <p className="z-1 text-lg font-light poppins">
                            Plan-itU recognized for transformative AI-driven
                            automation in linear broadcast content planning and
                            operations.{" "}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glow-circle transition-opacity opacity-0 duration-700 group-hover:opacity-70  absolute top-[-10px] left-[-24%] !w-[130%] !h-[30%] "></div>
                  </div>

                  <div
                    className="sec-awards-card-mob flex-shrink-0  z-[2] absolute group   cursor-pointer   lg:hover:-translate-y-[40px] "
                    onClick={() =>
                      openPopup("impact", [
                        "Powering Sony Pictures Networks India Cloud Journey",
                        "Successfully implemented BroadView in {AWS cloud for SPNI}, setting new standards for enterprise-scale migrations.",
                        "/img/elements/cardimg-sony.png",
                      ])
                    }
                  >
                    <div className="impact-card-wrapper  overflow-hidden   glass-card  !rounded-[27px] p-1.5">
                      <div className="impact-card !bg-[rgb(224,223,220)] overflow-hidden p-6  flex flex-col justify-between items-start">
                        <img
                          className="child w-[100%] z-[-1] h-[70%] fadeout-mask absolute left-0 top-0 transition-opacity opacity-0 duration-700 group-hover:opacity-70"
                          src="/img/elements/cardimg-sony.png"
                          alt=""
                        />

                        <img
                          className="child transition-opacity duration-400 group-hover:opacity-0 "
                          src="/img/elements/purple.svg"
                          alt=""
                        />
                        <div>
                          <h2 className="text-[#3b3b3b] z-1 mt-4 mb-4 fontA font-regular text-2xl transition-all duration-700 group-hover:text-[#F6F1E6]">
                            Powering Sony Pictures Networks India Cloud Journey
                          </h2>
                          <p className="z-1 text-lg font-light poppins">
                            Successfully implemented BroadView in AWS cloud for
                            SPNI , setting new standards for enterprise-scale
                            migrations.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glow-circle transition-opacity opacity-0 duration-700 group-hover:opacity-70  absolute top-[-10px] left-[-24%] !w-[130%] !h-[30%] "></div>
                  </div>

                  <div
                    className="sec-awards-card-mob flex-shrink-0 z-[3] absolute group   cursor-pointer   lg:hover:-translate-y-[40px] "
                    onClick={() =>
                      openPopup(
                        "impact",

                        [
                          "Industry Leadership",
                          "Featured at NAB 2023, The {Broadcast Bridge}, and {Broadcast & CableSat} for pioneering solutions that redefine media operations.",
                          "/img/elements/cardimg-industry.png",
                        ]
                      )
                    }
                  >
                    <div className="impact-card-wrapper  overflow-hidden   glass-card  !rounded-[27px] p-1">
                      <div className="impact-card !bg-[rgb(224,223,220)] overflow-hidden p-6  flex flex-col justify-between items-start">
                        <img
                          className="child w-[100%] z-[-1] h-[70%] fadeout-mask absolute left-0 top-0 transition-opacity opacity-0 duration-700 group-hover:opacity-70"
                          src="/img/elements/cardimg-industry.png"
                          alt=""
                        />

                        <img
                          className="child transition-opacity duration-400 group-hover:opacity-0 "
                          src="/img/elements/pink.svg"
                          alt=""
                        />
                        <div>
                          <h2 className="text-[#3b3b3b] z-1 mt-4 mb-4 fontA font-regular text-2xl transition-all duration-700 group-hover:text-[#F6F1E6]">
                            Industry <br /> Leadership{" "}
                          </h2>
                          <p className="z-1 text-lg font-light poppins">
                            Featured at NAB 2023, The Broadcast Bridge, and
                            Broadcast & CableSat for pioneering solutions that
                            redefine media operations.{" "}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="glow-circle transition-opacity opacity-0 duration-700 group-hover:opacity-70  absolute top-[-10px] left-[-24%] !w-[130%] !h-[30%] "></div>
                  </div>
                </div>

                <div className="o-element hidden lg:hidden h-[50px] md:h-[50px] md:scale-1"></div>
              </section> */}
    </div>
  )
}

export default file
