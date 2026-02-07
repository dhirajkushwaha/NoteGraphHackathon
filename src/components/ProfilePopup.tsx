"use client";
import React from "react";

type Profile = {
    url: string;
    name: string;
    position: string;
    description: string;
};

type ProfilePopupProps = {
    isOpen: boolean;
    onClose: () => void;
    popup: Profile;
};

export default function ProfilePopup({ isOpen, onClose, popup }: ProfilePopupProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed z-[20] inset-0 bg-[#020202ad] flex items-center justify-center p-4">

            <div className="relative mt-20 2xl:mt-20 mt-[1vh] mx-auto w-full !bg-[#d9d9d9] md:[#00000000]  max-w-[1000px] max-h-[90vh] overflow-y-auto p-4 md:p-10 bg-white rounded-[20px] shadow-lg" style={{ background: "transparent" }} >

                <div className=" md:absolute md:right-10 flex justify-end" >
                    {/* Close button */}
                    <div
                        onClick={onClose}
                        className=" cursor-pointer right-0 text-white z-30" >
                        <img width="30" height="30" src="/img/cancel.svg" alt="cancel" />
                    </div>




                </div>

                {/* Background */}
                <div className="top-0 left-0 absolute w-full bg-transparent">
                    <img className="w-full" src="/img/about/popup.svg" alt="" />
                </div>

                <div className="relative w-full flex flex-col lg:flex-row items-center lg:items-start gap-6">



                    {/* Left side */}
                    <div className="w-full lg:w-[40%] flex flex-col items-center text-center lg:text-left lg:items-start">
                        <img
                            className="rounded-[20px] mt-2 w-full max-w-[250px] lg:w-[55vh] max-w-[350px]  2xl:max-w-none"
                            src={popup.url}
                            alt={popup.name}
                        />
                        <h2 className="text-xl md:text-2xl text-[#272727] mt-2 font-semibold">{popup.name}</h2>
                        <h2 className="text-[#272727] text-base md:text-lg">{popup.position}</h2>
                    </div>

                    {/* Right side */}
                    <div className="w-full lg:w-[60%] relative">

                        <img
                            className="absolute opacity-20 top-7 left-0 lg:top-2 lg:left-7 w-8 h-8 md:w-16 md:h-16"
                            src="/img/about/quote.svg"
                            alt="quote"
                        />
                        <div
                            className="z-[15] text-[#272727] relative pl-10 md:pl-8 mt-10"
                            style={{ lineHeight: "normal", fontSize: "16px" }}
                        >
                            {popup.description.split("\n").map((line, i) => (
                                <p className="mt-2 md:mt-3" key={i}>
                                    {line}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}