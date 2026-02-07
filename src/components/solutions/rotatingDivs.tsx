'use client'
import React, { useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePopup } from "@/context/PopupContext";
import "./rotatingDivs.css"

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

type RotatingCardsProps = {
  cardData: CardItem[];
  xlh?: string;
  xxlh?: string;
  heigth?: string;
  width?: string;
};

/* ---------------------------------------------------
   DESKTOP VERSION
--------------------------------------------------- */
const RotatingCardsDesk: React.FC<RotatingCardsProps> = ({ cardData, xlh, xxlh, width }) => {
  const { openPopup } = usePopup();
  const [rotate, setRotate] = useState(0);
  let offset = 210;

  useEffect(() => {
    if (!window.matchMedia("(min-width: 640px)").matches) return;

    const ctx = gsap.context(() => {
      
      const slideText = document.querySelectorAll('.reveal-text-wrapper-desk');

      slideText.forEach((card: any) => {
        gsap.to(card.querySelectorAll("span"), {
          y: "0%",
          opacity: 1,
          duration: 1,
          ease: "power4.out",
          stagger: 0.2,
          scrollTrigger: {
            trigger: card,
            start: "top 70%",
          }
        });
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".trigger-desk",
          start: "top top",
          end: "+=100%",
          pin: true,
          scrub: true,
          onUpdate: (self) => setRotate(self.progress * 14),
        }
      });

    });

    return () => ctx.revert();
  }, []);

  return (
    <div className='relative'>
      <div className='trigger trigger-desk bg-[#F0ECE2] h-[100vh] py-20'>

        <div data-speed="0.97" className='reveal-text-wrapper reveal-text-wrapper-desk'>
          <h1 className="fontA font-medium reveal-text text-[#3B3B3B] text-center flex flex-col !gap-3 lg:!flex-row lg:justify-center px-10 text-4xl sm:text-6xl">
            <span> Built For <span className='text-[#7CB054]'>Leaders</span> <span>Like You</span> </span>
          </h1>
        </div>

        <div className='scene flex flex-col'>
          <div className="relative mx-auto flex gap-20 items-center card-container card-container-desk" style={{ transform: `rotateY(0deg)` }}>
            
            {cardData.map((item, i) => (
              <div key={item.id}
                className={`card-3d-wrap absolute top-0 left-0 ${rotate * 10 + i * 47 + offset < 280 || rotate * 10 + i * 47 + offset > 460 ? "opacity-0" : "opacity-100"}`}
                style={{
                  transform: `rotateY(-${rotate * 10 + i * 47 + offset}deg) translateZ(500px)`
                }}
              >
                <div className={`p-6 sm:p-7 rounded-[30px] mx-auto w-[300px] ${width ? `sm:w-[${width}]` : "sm:w-[340px]"}`} style={{ backgroundColor: item.bgColor }}>
                  <div className="flex flex-col-reverse gap-10 lg:flex-row justify-center lg:justify-between items-center text-[#F1ECE2]">

                    <div className={`px-3 flex flex-col justify-between lg:h-[50vh] ${xlh || "xl:h-[50vh]"} ${xxlh || "2xl:h-[50vh]"}`}>
                      <div>
                        <h2 className="fontA font-medium text-2xl lg:text-[5vh] 2xl:text-5xl">{item.title}</h2>
                        <p className="poppins font-light text-xl lg:text-[3vh] 2xl:text-2xl py-5">{item.description}</p>
                      </div>
                      <div className="relative">
                        <div
                          onClick={() => openPopup("meeting")}
                          className="fontA glass-card CTABUTTON cursor-pointer mt-2 flex items-center justify-center !rounded-[16px] w-[160px] h-[53.6px]"
                          style={{
                            backgroundColor: item.ctaBg || "rgb(3 , 255, 64 , 32%)",
                            border: item.ctaBorder || "1px solid rgb(82 255 89)",
                          }}
                        >
                          <span>Book A Meeting</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-[100%] hidden lg:w-[50%] xl:w-[35%] flex justify-center lg:justify-end">
                      <img className="rounded-[30px]" src={item.imgUrl} alt={item.title} />
                    </div>

                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
};

/* ---------------------------------------------------
   MOBILE VERSION
--------------------------------------------------- */
const RotatingCardsMob: React.FC<RotatingCardsProps> = ({ cardData, xlh, xxlh, width, heigth }) => {
  const { openPopup } = usePopup();

  useEffect(() => {
    if (!window.matchMedia("(max-width: 639px)").matches) return;

    const ctx = gsap.context(() => {

      const slideText = document.querySelectorAll('.reveal-text-wrapper-mob');

      slideText.forEach((card: any) => {
        gsap.to(card.querySelectorAll("span"), {
          y: "0%",
          opacity: 1,
          duration: 1,
          ease: "power4.out",
          stagger: 0.2,
          scrollTrigger: {
            trigger: card,
            start: "top 70%",
          }
        });
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: ".trigger-mob",
          start: "top top",
          end: "+100%",
          pin: true,
          scrub: true,
        }
      })
      .fromTo(".card-container-mob", { x: 200 }, { x: -830 });

    });

    return () => ctx.revert();
  }, []);

  return (
    <div className='relative'>
      <div className='trigger trigger-mob bg-[#F0ECE2] h-[100vh] py-20'>

        <div data-speed="0.97" className='reveal-text-wrapper reveal-text-wrapper-mob'>
          <h1 className="fontA font-medium reveal-text text-[#3B3B3B] text-center flex flex-col !gap-3 lg:!flex-row lg:justify-center px-2 text-4xl sm:text-6xl">
            <span> Built For <span className='text-[#7CB054]'>Leaders</span> <span>Like You</span> </span>
          </h1>
        </div>

        <div className='scene flex flex-col'>
          <div className="relative mx-auto flex gap-10 items-center card-container card-container-mob">

            {cardData.map((item, i) => (
              <div key={item.id}>
                <div className={`p-6 sm:p-7 rounded-[30px] mx-auto w-[300px] ${width ? `sm:w-[${width}]` : "sm:w-[340px]"}`} style={{ backgroundColor: item.bgColor }}>
                  <div className="flex flex-col-reverse gap-10 lg:flex-row justify-center lg:justify-between items-center text-[#F1ECE2]">

                    <div className={`px-3 flex flex-col justify-between ${heigth || "h-[340px]"} ${xlh || "xl:h-[400px]"} ${xxlh || "2xl:h-[400px]"}`}>
                      <div>
                        <h2 className="fontA font-medium text-2xl lg:text-5xl">{item.title}</h2>
                        <p className="poppins font-light text-xl lg:text-2xl py-5">{item.description}</p>
                      </div>

                      <div className="relative">
                        <div
                          onClick={() => openPopup("meeting")}
                          className="fontA glass-card CTABUTTON cursor-pointer mt-2 flex items-center justify-center !rounded-[16px] w-[160px] h-[53.6px]"
                          style={{
                            backgroundColor: item.ctaBg || "rgb(3 , 255, 64 , 32%)",
                            border: item.ctaBorder || "1px solid rgb(82 255 89)",
                          }}
                        >
                          <span>Book A Meeting</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-[100%] hidden lg:w-[50%] xl:w-[35%] flex justify-center lg:justify-end">
                      <img className="rounded-[30px]" src={item.imgUrl} alt={item.title} />
                    </div>

                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
};

/* ---------------------------------------------------
   WRAPPER
--------------------------------------------------- */
function RotatingCards({ cardData, xlh, xxlh, width, heigth }: RotatingCardsProps) {

  return (
    <div>
      <div className='sm:hidden'>
        <RotatingCardsMob cardData={cardData} xlh={xlh} xxlh={xxlh} width={width} heigth={heigth} />
      </div>

      <div className='hidden sm:block'>
        <RotatingCardsDesk cardData={cardData} xlh={xlh} xxlh={xxlh} width={width} heigth={heigth} />
      </div>
    </div>
  );
}

export default RotatingCards;
