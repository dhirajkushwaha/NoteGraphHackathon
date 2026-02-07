
// 'use client'
// import React from "react";
// import GlassEffect from "./DEM";
// type NavbarProps = {
//     menu: boolean;
//     setMenu: any;
// };
// export default function Navbar({ menu, setMenu }: NavbarProps) {
//     return (
//         <div className="  navbar sticky z-[3] top-5    w-[100vw]">
//             <div className="w-[92vw] lg:hidden  mx-auto text-white fontA items-center flex justify-between glass-card !rounded-[15px]  py-2 px-1">
//                 <div className=" px-2   ">
//                     <img src="/img/logo-mobile.png" alt="" width={200} />
//                 </div>

//                 <div className="flex gap-1">
//                     <div className="glass-card text-sm !rounded-[15px] cursor-pointer z-1 flex items-center py-3 px-3  ">
//                         <span>BOOK A DEMO </span>
//                     </div>

//                     <div className="glass-card text-sm !rounded-[15px] cursor-pointer z-1 flex items-center py-3 px-3  ">
//                         <span>
//                             <svg
//                                 width="22"
//                                 height="5"
//                                 viewBox="0 0 22 5"
//                                 fill="none"
//                                 xmlns="http://www.w3.org/2000/svg"
//                             >
//                                 <circle cx="2.75" cy="2.5" r="2.12109" fill="#D9D9D9" />
//                                 <circle cx="11.2344" cy="2.5" r="2.12109" fill="#D9D9D9" />
//                                 <circle cx="19.7188" cy="2.5" r="2.12109" fill="#D9D9D9" />
//                             </svg>
//                         </span>
//                     </div>
//                 </div>
//             </div>

//             <div className="relative hidden lg:flex   justify-center w-screen mx-auto">
//                 <div className="absolute top-0  h-[62px] navMidComp lg:block mx-auto lg:w-6xl text-white fontA text-light flex">
//                     <div className="flex  gap-3 w-[100%] justify-between">
//                         {/* <div className="glass-card w-sm lg:w-[320px] py-3 px-6 pr-15" >
//                 <img src="/img/logo.png" alt="" />
//               </div> */}
//                         <div className="w-[320px]">
//                             <GlassEffect width={320}>
//                                 <img src="/img/logo.png" alt="" width={200} />
//                             </GlassEffect>
//                         </div>

//                         <div className="flex gap-5">
//                             <div>
//                                 <GlassEffect width={320}>
//                                     <div className="flex w-full justify-end gap-5 opacity-70 menu">
//                                         <a href="">Solutions</a>
//                                         <a href="">Company</a>
//                                         <a href="">Contact</a>
//                                     </div>
//                                 </GlassEffect>
//                             </div>

//                             <div className="h-[100%] flex relative  overflow-hidden rounded-[20px]">
//                                 <div>
//                                     <GlassEffect width={180}>
//                                         <span className="opacity-70 text-sm text-white">
//                                             BOOK A DEMO{" "}
//                                         </span>
//                                     </GlassEffect>
//                                 </div>

//                                 {/* <div className="glass-card  cursor-pointer z-1 flex items-center py-3 px-6  " >
//                     <span className="opacity-70 ">BOOK A DEMO </span>
//                   </div> */}

//                                 <div
//                                     className=" hidden !absolute top-[-15px]  gradient-overlay  z-0 !w-[150px] !h-[80px]"
//                                     style={{ borderRadius: "0px" }}
//                                 ></div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="absolute top-0  h-[62px] navMidCompRev lg:block mx-auto lg:w-6xl text-white fontA text-light flex">
//                     <div className="flex  gap-3 w-[100%] justify-between">
//                         {/* <div className="glass-card w-sm lg:w-[320px] py-3 px-6 pr-15" style={{ background: "linear-gradient(rgb(255 255 255 / 50%), rgb(108 108 108 / 20%))" }} >
//                 <img src="/img/logoblack.png" alt="" />
//               </div> */}

//                         <div className="w-[320px]">
//                             <GlassEffect width={320}>
//                                 <img src="/img/logo.png" alt="" />
//                             </GlassEffect>
//                         </div>

//                         <div
//                             className={`hidden md:flex  ${menu == true ? " " : "md:hidden"}`}
//                         >
//                             <GlassEffect width={320}>
//                                 <div className="flex w-full justify-end gap-5 opacity-70 menu">
//                                     <a href="">Solutions</a>
//                                     <a href="">Company</a>
//                                     <a href="">Contact</a>
//                                 </div>
//                             </GlassEffect>
//                         </div>

//                         {/* <div className={`hidden md:flex  ${menu == true ? " " : "md:hidden"}  glass-card lg:w-[53%] py-3 px-6 flex items-center justify-end !backdrop-blur-[20px]`} >


//                 <div className="flex gap-5 opacity-70" >
//                   <a href="">Solutions</a>
//                   <a href="">Company</a>
//                   <a href="">Contact</a>

//                 </div>

//               </div> */}

//                         <div className="flex gap-2">
//                             <div className="h-[100%] flex relative   overflow-hidden rounded-[20px]">
//                                 {/* <div className=" bg-white text-black py-3  cursor-pointer z-1 flex items-center   px-15 hover:opacity-70 transition duration-300 ease-in-out " onClick={() => setMenu(prev => !prev)} >
//                     <span className="opacity-70 ">  {menu ? "close" : "menu"}  </span>
//                     </div> */}

//                                 <div onClick={() => setMenu(!menu)}>
//                                     <GlassEffect width={150}>
//                                         <span className="opacity-70 text-sm text-white">
//                                             {" "}
//                                             {menu ? "close" : "menu"}{" "}
//                                         </span>
//                                     </GlassEffect>
//                                 </div>

//                                 <div
//                                     className="hidden !absolute top-[-15px]  gradient-overlay  z-0 !w-[150px] !h-[80px]"
//                                     style={{ borderRadius: "0px" }}
//                                 ></div>
//                             </div>

//                             <div className="h-[100%] flex relative  overflow-hidden rounded-[20px]">
//                                 <div>
//                                     <GlassEffect width={180}>
//                                         <span className="opacity-70 ">BOOK A DEMO </span>
//                                     </GlassEffect>
//                                 </div>

//                                 {/* <div className="glass-card  cursor-pointer z-1 flex items-center py-3 px-6  " >
//                     <span className="opacity-70 ">BOOK A DEMO </span>
//                   </div> */}

//                                 <div
//                                     className=" hidden !absolute top-[-15px]  gradient-overlay  z-0 !w-[150px] !h-[80px]"
//                                     style={{ borderRadius: "0px" }}
//                                 ></div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }
