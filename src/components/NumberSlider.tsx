'use client'

import React, { useState } from 'react'
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";

import Counter from '@/components/Counter';
import "./NumberSlider.css"

type SlideData = [string, number, number, string, string, string];
// [prefix, value, duration, suffix, title, description]

interface SliderProps {
  data: SlideData[];
  textColor?: string; // new prop for text color
}

const NumberSlider: React.FC<SliderProps> = ({ data, textColor = "#3b3b3b" }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div data-speed="1.1" className='w-full flex items-center justify-center'>
      <div className="w-full flex items-center py-20" style={{ color: textColor }}>
        <Swiper
          modules={[Autoplay]}
          autoplay={{ delay: 1800, disableOnInteraction: false }}
          loop={true}
          speed={1200}
          spaceBetween={0}
          slidesPerView={1}
          centeredSlides={true}
          grabCursor={true}
          onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
          onInit={(swiper) => setActiveIndex(swiper.activeIndex)}
        >
          {data.map(([prefix, value, duration, suffix, title, description], idx) => (
            <SwiperSlide key={idx}>
              <div
                className={`transition-all duration-500 flex justify-center ${activeIndex === idx ? "opacity-100 scale-100" : "opacity-100  "
                  }`}
              >
                <div>
                  <h1 className='fontA flex flex-col text-center font-semibold'>
                    <span className='relative text-8xl sm:text-9xl'>
                      <div className='w-full z-0 flex items-center justify-center left-0 top-0 absolute'>
                        <img className='w-[150px] lg:w-[200px]' src="/img/greenArrow.svg" alt="" />
                      </div>

                      <span className='relative z-[1]'>
                        {prefix}
                        <Counter target={value} duration={duration} />
                        <span>{suffix}</span>
                      </span>
                    </span>
                    <span className='z-[1] text-6xl sm:text-9xl'>{title}</span>
                  </h1>

                  <p className='mt-2 text-xl px-2 !font-light text-center'>{description}</p>
                </div>
              </div>
            </SwiperSlide>  
          ))}
        </Swiper>
      </div>
    </div>
  )
}

export default NumberSlider;
