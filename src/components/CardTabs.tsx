"use client";
import React, { useState, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePopup } from "@/context/PopupContext";

import "./CardTabs.css";

gsap.registerPlugin(ScrollTrigger);

type CardItem = {
  id: number;
  title: string;
  description: string;
  bgColor: string;
  ctaBg?: string;
  ctaBorder?: string;
  imgUrl: string;
};

type CardTabsSidebarProps = {
  cardData: CardItem[];
  activeCard: number;
  setCard: (id: number) => void;
};

const CardTabsSidebar: React.FC<CardTabsSidebarProps> = ({
  cardData,
  activeCard,
  setCard,
}) => {
  
  return (
    <div className="w-[100%] lg:w-fit mx-auto xl:w-[340px] !overflow-x-scroll xl:!overflow-x-hidden glass-card p-2">
      <div className="flex w-fit xl:w-fit flex-row xl:flex-col gap-2">
        {cardData.map((item) => (
          <div
            key={item.id}
            onClick={() => setCard(item.id)}
            className="relative overflow-hidden md:w-fit rounded-[20px] "
            style={{backgroundColor:  `${activeCard === item.id ? item.bgColor : "#08080805"}`}}
          >
            <div className="fontA glass-card cursor-pointer text-[#3b3b3b] text-center card-inactive z-2 text-sm md:text-lg h-[70px] relative justify-center flex w-[200px] xl:w-[240px] items-center py-2 px-6">
              <span style={{ color: `${activeCard === item.id ? "#f0ece2" : "#3b3b3b"}`  }} className="!leading-none">{item.title}</span>
            </div>
            <div
              className={`!absolute top-[12px] left-[4px] gradient-overlay opacity-80 z-1 !w-[200px] !h-[40px] ${activeCard === item.id ? "hidden" : "hidden"
                }`}
              style={{ backgroundColor: "rgba(3, 255, 178, 0.6)" }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

type CardTabContentProps = {
  item: CardItem;
  xlh?: string;
  xxlh?: string;
};

const CardTabContent: React.FC<CardTabContentProps> = ({ item, xlh, xxlh }) => {
  const { openPopup } = usePopup();

  return (
    <div
      className="w-fit p-6 sm:p-7 rounded-[30px]"
      style={{ backgroundColor: item.bgColor }}
    >
      <div className="flex flex-col-reverse gap-10 lg:flex-row justify-center lg:justify-between items-center text-[#F1ECE2]">
        {/* Text Section */}
        <div
          className={`lg:w-[50%] 2xl:w-[40%] px-3 flex flex-col justify-between ${  xlh || "xl:h-[400px]"
            } ${xxlh || "2xl:h-[400px]"}`}
        >
          <div>
            <h2 className="fontA font-medium text-2xl lg:text-5xl">
              {item.title}
            </h2>
            <p className="poppins font-light text-xl lg:text-2xl py-5">
              {item.description}
            </p>
          </div>

          <div className="relative">
            <a>
              <div className={`${item.id === 1 ? "slideup-fadein" : ""}`}>
                <div
                  onClick={() => openPopup("meeting")}
                  className="fontA glass-card cursor-pointer mt-2 z-2 flex  items-center justify-center !rounded-[16px] w-[160px] h-[53.6px]"
                  style={{
                    backgroundColor: item.ctaBg || "rgb(3 , 255, 64 , 32%)",
                    border: item.ctaBorder || "1px solid rgb(82 255 89)",
                  }}
                >
                  <span>Book A Meeting</span>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Image Section */}
        <div className="w-[100%] lg:w-[50%] xl:w-[35%] flex justify-center lg:justify-end">
          <div className="relative">
            <img
              className="rounded-[30px]"
              src={item.imgUrl}
              alt={item.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

type CardTabsProps = {
  cardData: CardItem[];
  xlh?: string;
  xxlh?: string;
};

const CardTabs: React.FC<CardTabsProps> = ({ cardData, xlh, xxlh }) => {
  const [activeCard, setActiveCard] = useState(cardData[0].id);

  useEffect(() => {
    gsap.utils.toArray<HTMLElement>(".slideup-fadein").forEach((el) => {
      gsap.to(el, {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: el,
          start: "top 90%",
          toggleActions: "play none play reset",
        },
      });
    });
  }, []);

  const activeItem = cardData.find((item) => item.id === activeCard);

  return (
    <div className="w-[90%] text-[#262626] mt-5 md:mt-15 mx-auto flex flex-col xl:flex-row items-start gap-10">
      {/* Sidebar */}
      <CardTabsSidebar
        cardData={cardData}
        activeCard={activeCard}
        setCard={setActiveCard}
      />

      {/* Active Card Content */}
      {activeItem && <CardTabContent item={activeItem} xlh={xlh} xxlh={xxlh} />}
    </div>
  );
};

export default CardTabs;
